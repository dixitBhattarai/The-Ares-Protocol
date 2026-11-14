import { Vector3 } from '../math/Vector3.js';
import { Quaternion } from '../math/Quaternion.js';
import { Terrain, SiteFrame, PatchSampler } from './Terrain.js';

/**
 * Rapier contact world - used ONLY where a rigid-body contact solver beats the custom core:
 * terminal descent, touchdown, sliding/tipping, resting on legs and lift-off.
 *
 * Why not use Rapier for everything: Rapier's JS build computes in 32-bit floats. At orbital distances
 * (|r| ~ 7e6 m) float32 resolution is ~0.5 m, which is useless for orbital mechanics. The double-
 * precision RK4 core therefore owns all free flight. When the craft descends below the handoff altitude
 * its state is converted into a small *local, body-fixed* frame (origin at the landing site, metres of
 * magnitude, so float32 is plenty) and integrated here; on lift-off the state is converted back.
 *
 * Local frame: +X east, +Y up, +Z south (right-handed, Y-up). It is fixed to the rotating planet, so a
 * landed vehicle correctly co-rotates with the ground. Coriolis acceleration is applied explicitly and
 * the (constant) centrifugal term is folded into the local gravity vector.
 *
 * Authoritative for the landing verdict is the pre-impact velocity at first leg contact (matches the
 * spec's touchdown envelope); Rapier provides the physical aftermath (friction, tipping, bouncing).
 */

let RAPIER = null;
try {
  const mod = await import('@dimforge/rapier3d-deterministic-compat');
  RAPIER = mod.default || mod;
  await RAPIER.init();
} catch (err) {
  console.warn(`[ContactWorld] Rapier unavailable (${err.message}); using analytic touchdown fallback.`);
  RAPIER = null;
}

export const isRapierAvailable = () => RAPIER !== null;

export const CONTACT_CONFIG = {
  patchSizeM: 256,
  patchResolution: 129,   // 2 m spacing
  substepS: 1 / 90,
  reanchorOffsetM: 90,    // re-centre the terrain patch when the craft strays this far from its centre
  contactClearanceM: 0.03,
  liftoffClearanceM: 0.25,
  liftoffHoldS: 0.4,
  settleSpeedMS: 0.05,
  settleRateRadS: 0.02,
  settleHoldS: 1.5
};

function rotZ(v, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return new Vector3(v.x * c - v.y * s, v.x * s + v.y * c, v.z);
}

export class ContactWorld {
  constructor(config = {}) {
    this.cfg = { ...CONTACT_CONFIG, ...config };
    this.active = false;
    this.world = null;
    this.body = null;
    this.events = [];
  }

  // ------------------------------------------------------------------ lifecycle

  /**
   * Convert the craft's current inertial state into the local frame and build the Rapier world.
   * @param {Object} planet - celestial body ({ radius, mu, rotationPeriod, terrain })
   * @param {Spacecraft} sc
   * @param {number} simTime
   */
  activate(planet, sc, simTime) {
    if (!RAPIER) throw new Error('Rapier not available');
    this.deactivate();

    this.planet = planet;
    this.spinRadS = (2 * Math.PI) / (planet.rotationPeriod || 86164);
    this.t0 = simTime;
    this.sc = sc;

    // --- site frame at the craft's sub-satellite point (inertial == body-fixed at t0)
    const upBF = sc.pos.clone().normalize();
    this.frame = new SiteFrame(upBF);
    this.qSite = Quaternion.fromBasis(
      this.frame.toBF(new Vector3(1, 0, 0)),
      this.frame.toBF(new Vector3(0, 1, 0)),
      this.frame.toBF(new Vector3(0, 0, 1))
    );
    this.qSiteInv = this.qSite.clone().conjugate();
    this.originBF = upBF.clone().multiplyScalar(planet.radius);

    // --- terrain patch
    this.terrain = new Terrain(planet.terrain || {}, planet.radius);
    this.patch = this.terrain.samplePatch(this.frame, this.cfg.patchSizeM, this.cfg.patchResolution);
    this.sampler = new PatchSampler(this.patch);

    // --- local gravity: central + folded centrifugal term, expressed in the local frame
    const Om = this.spinRadS;
    const gBF = upBF.clone().multiplyScalar(-planet.mu / (planet.radius * planet.radius));
    gBF.add(new Vector3(Om * Om * this.originBF.x, Om * Om * this.originBF.y, 0));
    this.gravityLocal = this.frame.toLocal(gBF);
    this.omegaLocal = this.frame.toLocal(new Vector3(0, 0, Om)); // planet spin vector in local axes

    // --- Rapier world
    this.world = new RAPIER.World({ x: this.gravityLocal.x, y: this.gravityLocal.y, z: this.gravityLocal.z });
    this._buildTerrainCollider();
    this._buildVehicle();

    // --- initial dynamic state (ground-relative)
    const posBF = Vector3.subtract(sc.pos, this.originBF);
    const pLocal = this.frame.toLocal(posBF);
    const velRelBF = Vector3.subtract(sc.vel, new Vector3(-Om * sc.pos.y, Om * sc.pos.x, 0));
    const vLocal = this.frame.toLocal(velRelBF);
    const qLocal = Quaternion.multiply(this.qSiteInv, sc.quat).normalize();
    // angular velocity relative to the ground, body axes
    const spinBody = sc.quat.inverseRotateVector(new Vector3(0, 0, Om));
    const wRelBody = Vector3.subtract(sc.omega, spinBody);
    const wLocal = qLocal.rotateVector(wRelBody);

    this.body.setTranslation({ x: pLocal.x, y: pLocal.y, z: pLocal.z }, true);
    this.body.setRotation({ x: qLocal.x, y: qLocal.y, z: qLocal.z, w: qLocal.w }, true);
    this.body.setLinvel({ x: vLocal.x, y: vLocal.y, z: vLocal.z }, true);
    this.body.setAngvel({ x: wLocal.x, y: wLocal.y, z: wLocal.z }, true);

    // --- contact bookkeeping
    this.inContact = false;
    this.airborneTimer = 0;
    this.settleTimer = 0;
    this.settled = false;
    this.elapsed = 0;
    this.events = [];
    this.lastMinClearance = Infinity;
    this.massKg = null;
    this.active = true;
    this._refreshInfo();
  }

  deactivate() {
    if (this.world) {
      try { this.world.free(); } catch (_) { /* already freed */ }
    }
    this.world = null;
    this.body = null;
    this.active = false;
  }

  _buildTerrainCollider() {
    const { n, step, half, heights } = this.patch;
    const vertices = new Float32Array(n * n * 3);
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const k = (iz * n + ix) * 3;
        vertices[k] = -half + ix * step;
        vertices[k + 1] = heights[iz * n + ix];
        vertices[k + 2] = -half + iz * step;
      }
    }
    const indices = new Uint32Array((n - 1) * (n - 1) * 6);
    let t = 0;
    for (let iz = 0; iz < n - 1; iz++) {
      for (let ix = 0; ix < n - 1; ix++) {
        const i00 = iz * n + ix, i10 = i00 + 1, i01 = i00 + n, i11 = i01 + 1;
        // counter-clockwise seen from +Y so normals point up
        indices[t++] = i00; indices[t++] = i01; indices[t++] = i10;
        indices[t++] = i10; indices[t++] = i01; indices[t++] = i11;
      }
    }
    const desc = RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setFriction(0.9)
      .setRestitution(0.0);
    this.world.createCollider(desc);
  }

  _buildVehicle() {
    const sc = this.sc;
    const gear = sc.landingGear;
    const dim = sc.attitude.dimensions;

    const rbDesc = RAPIER.RigidBodyDesc.dynamic()
      .setCcdEnabled(true)
      .setCanSleep(true)
      .setLinearDamping(0)
      .setAngularDamping(0);
    this.body = this.world.createRigidBody(rbDesc);

    // Mass properties come from the spacecraft model (colliders contribute zero mass)
    this._applyMassProperties();

    const hull = RAPIER.ColliderDesc
      .cuboid(dim.length / 2, dim.width / 2, dim.height / 2)
      .setDensity(0).setFriction(0.6).setRestitution(0.0);
    this.world.createCollider(hull, this.body);

    this.contactPoints = []; // [{ pos: Vector3 (body frame), radius }]
    for (const f of gear.feet) {
      const foot = RAPIER.ColliderDesc.ball(gear.footRadiusM)
        .setTranslation(f[0], f[1], f[2])
        .setDensity(0).setFriction(gear.friction).setRestitution(0.0);
      this.world.createCollider(foot, this.body);
      this.contactPoints.push({ pos: new Vector3(f[0], f[1], f[2]), radius: gear.footRadiusM });
    }
    // hull corners (for toppled / hull-first impacts)
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      this.contactPoints.push({
        pos: new Vector3(sx * dim.length / 2, sy * dim.width / 2, sz * dim.height / 2),
        radius: 0
      });
    }
  }

  _applyMassProperties() {
    const sc = this.sc;
    const mass = sc.getTotalMass();
    const I = sc.attitude.inertiaTensor.elements;
    this.massKg = mass;
    this.inertiaDiag = new Vector3(I[0], I[4], I[8]);
    this.body.setAdditionalMassProperties(
      mass,
      { x: 0, y: 0, z: 0 },
      { x: I[0], y: I[4], z: I[8] },
      { x: 0, y: 0, z: 0, w: 1 },
      false
    );
  }

  // ------------------------------------------------------------------ state conversion

  _theta(simTime) {
    return this.spinRadS * (simTime - this.t0);
  }

  /** Current local-frame rigid body state */
  getLocalState() {
    const t = this.body.translation(), r = this.body.rotation(), v = this.body.linvel(), w = this.body.angvel();
    return {
      pos: new Vector3(t.x, t.y, t.z),
      quat: new Quaternion(r.w, r.x, r.y, r.z).normalize(),
      vel: new Vector3(v.x, v.y, v.z),
      angvel: new Vector3(w.x, w.y, w.z)
    };
  }

  /**
   * Write the local state back into the spacecraft's double-precision inertial state.
   */
  writeBack(simTime) {
    const sc = this.sc;
    const th = this._theta(simTime);
    const Om = this.spinRadS;
    const s = this.getLocalState();

    const posBF = Vector3.add(this.originBF, this.frame.toBF(s.pos));
    const posI = rotZ(posBF, th);

    const velBF = this.frame.toBF(s.vel);
    const velI = rotZ(velBF, th).add(new Vector3(-Om * posI.y, Om * posI.x, 0));

    const qBF = Quaternion.multiply(this.qSite, s.quat);
    const qZ = new Quaternion(Math.cos(th / 2), 0, 0, Math.sin(th / 2));
    const qI = Quaternion.multiply(qZ, qBF).normalize();

    const wRelBody = s.quat.inverseRotateVector(s.angvel);
    const spinBody = qI.inverseRotateVector(new Vector3(0, 0, Om));
    const wBody = Vector3.add(wRelBody, spinBody);

    sc.pos.copy(posI);
    sc.vel.copy(velI);
    sc.quat.copy(qI);
    sc.omega.copy(wBody);
  }

  // ------------------------------------------------------------------ stepping

  /**
   * Advance the contact world by dt.
   *
   * @param {number} dt
   * @param {number} simTime - time at the START of the step
   * @param {Object} input - { forceBody: Vector3, torqueBody: Vector3 (thrust+RCS+wheel torque),
   *                           wheelMomentumBody: Vector3, aeroForceInertial: Vector3 }
   */
  step(dt, simTime, input) {
    const cfg = this.cfg;
    const n = Math.max(1, Math.ceil(dt / cfg.substepS));
    const h = dt / n;
    this.world.timestep = h;

    if (Math.abs(this.sc.getTotalMass() - this.massKg) > 1e-3 * this.massKg) this._applyMassProperties();

    const th = this._theta(simTime);
    const aeroLocal = this.frame.toLocal(rotZ(input.aeroForceInertial || new Vector3(), -th));
    const I = this.inertiaDiag;
    const mass = this.massKg;

    for (let k = 0; k < n; k++) {
      const s = this.getLocalState();

      // ---- contact detection (pre-step, so the verdict uses the pre-impact velocity)
      const clearance = this._minClearance(s);
      this._detectContactEvents(s, clearance, h, simTime + k * h);

      // ---- forces: thrust + aero + Coriolis (gravity is the world gravity vector)
      const F = s.quat.rotateVector(input.forceBody);
      F.add(aeroLocal);
      F.add(Vector3.cross(this.omegaLocal, s.vel).multiplyScalar(-2 * mass)); // Coriolis: -2 m Omega x v

      // ---- torques: actuator torque minus gyroscopic coupling (Rapier does not model it)
      const wBody = s.quat.inverseRotateVector(s.angvel);
      const iw = new Vector3(I.x * wBody.x, I.y * wBody.y, I.z * wBody.z);
      const hTot = input.wheelMomentumBody ? Vector3.add(iw, input.wheelMomentumBody) : iw;
      const tauBody = Vector3.subtract(input.torqueBody, Vector3.cross(wBody, hTot));
      const tau = s.quat.rotateVector(tauBody);

      this.body.resetForces(false);
      this.body.resetTorques(false);
      if (F.lengthSq() > 0) this.body.addForce({ x: F.x, y: F.y, z: F.z }, true);
      if (tau.lengthSq() > 0) this.body.addTorque({ x: tau.x, y: tau.y, z: tau.z }, true);

      this.world.step();

      this._updateRestState(h);
    }

    this.elapsed += dt;
    this._refreshInfo();
  }

  _minClearance(s) {
    let min = Infinity;
    for (const p of this.contactPoints) {
      const w = Vector3.add(s.pos, s.quat.rotateVector(p.pos));
      const c = w.y - p.radius - this.sampler.heightAt(w.x, w.z);
      if (c < min) min = c;
    }
    return min;
  }

  _detectContactEvents(s, clearance, h, tNow) {
    const cfg = this.cfg;

    // first contact -> touchdown event with pre-impact velocity
    if (!this.inContact) {
      const closing = Math.max(0, -s.vel.y) * h * 1.5;
      if (clearance <= Math.max(cfg.contactClearanceM, closing)) {
        this.inContact = true;
        this.airborneTimer = 0;
        this.settleTimer = 0;
        this.settled = false;

        const up = new Vector3(0, 1, 0);
        const bodyUp = s.quat.rotateVector(new Vector3(1, 0, 0));
        const tiltDeg = bodyUp.angleTo(up) * 180 / Math.PI;
        const descent = Math.max(0, -s.vel.y);
        const horiz = Math.hypot(s.vel.x, s.vel.z);
        const slopeDeg = this.sampler.slopeDegAt(s.pos.x, s.pos.z);
        const stroke = this.sc.landingGear.strokeM;
        const impactG = (descent * descent) / (2 * Math.max(0.05, stroke)) / 9.80665;

        this.events.push({
          type: 'touchdown', time: tNow,
          descentSpeedMS: descent, horizontalSpeedMS: horiz, tiltDeg, slopeDeg, impactG
        });
      }
    } else {
      // lift-off: clear of the ground for a sustained period
      if (clearance > cfg.liftoffClearanceM) {
        this.airborneTimer += h;
        if (this.airborneTimer >= cfg.liftoffHoldS) {
          this.inContact = false;
          this.settled = false;
          this.events.push({ type: 'liftoff', time: tNow });
        }
      } else {
        this.airborneTimer = 0;
      }
    }
  }

  _updateRestState(h) {
    if (!this.inContact) { this.settleTimer = 0; return; }
    const s = this.getLocalState();
    const slow = s.vel.length() < this.cfg.settleSpeedMS && s.angvel.length() < this.cfg.settleRateRadS;
    if (slow) {
      this.settleTimer += h;
      if (!this.settled && this.settleTimer >= this.cfg.settleHoldS) {
        this.settled = true;
        const bodyUp = s.quat.rotateVector(new Vector3(1, 0, 0));
        this.events.push({
          type: 'settled',
          tiltDeg: bodyUp.angleTo(new Vector3(0, 1, 0)) * 180 / Math.PI
        });
      }
    } else {
      this.settleTimer = 0;
      this.settled = false;
    }
  }

  consumeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ------------------------------------------------------------------ info / export

  _refreshInfo() {
    const s = this.getLocalState();
    const ground = this.sampler.heightAt(s.pos.x, s.pos.z);
    this.info = {
      active: true,
      inContact: this.inContact,
      settled: this.settled,
      aglM: s.pos.y - ground,
      horizontalOffsetM: Math.hypot(s.pos.x, s.pos.z),
      slopeDeg: this.sampler.slopeDegAt(s.pos.x, s.pos.z),
      groundSpeedMS: s.vel.length(),
      verticalSpeedMS: s.vel.y,
      horizontalSpeedMS: Math.hypot(s.vel.x, s.vel.z),
      minFootClearanceM: this._minClearance(s),
      local: {
        frame: 'ENU-Y-up (x=east, y=up, z=south), body-fixed',
        position_m: s.pos.toArray(),
        velocity_m_s: s.vel.toArray(),
        quaternion_xyzw: [s.quat.x, s.quat.y, s.quat.z, s.quat.w],
        angular_velocity_rad_s: s.angvel.toArray()
      }
    };
    return this.info;
  }

  /** Whether the patch should be re-centred (craft strayed from the terrain patch centre) */
  needsReanchor() {
    return this.active && this.info.horizontalOffsetM > this.cfg.reanchorOffsetM;
  }

  /** Terrain mesh data for the frontend (same grid the physics uses) */
  exportPatch() {
    return {
      frame: 'ENU-Y-up (x=east, y=up, z=south), body-fixed, origin at site on reference sphere',
      sizeM: this.patch.sizeM,
      resolution: this.patch.n,
      stepM: this.patch.step,
      layout: 'row-major: heights[iz*n+ix] at x=-size/2+ix*step, z=-size/2+iz*step',
      heights: Array.from(this.patch.heights)
    };
  }
}
