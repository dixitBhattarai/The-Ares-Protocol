import { v3, quat, G_REF } from './mathutil.js';

/**
 * Optional Rapier (WASM rigid-body engine) contact backend.
 *
 * STATUS: EXPERIMENTAL / OPT-IN. It was written against the public Rapier JS
 * API but could not be executed where it was authored (no package install
 * access). Run `node tests/contact_rapier_smoke.test.js` after
 * `npm install` to validate it on your machine. ContactWorld falls back to the
 * analytic backend automatically if this one throws.
 *
 * What Rapier is good for here: arbitrary collider geometry (boulder meshes,
 * heightfields from real terrain data), stacking/tumbling, joints (docking
 * latches, rover wheels). What it is NOT used for: orbital motion (32-bit
 * floats) - that stays in the float64 core. Everything handed to Rapier is in
 * the local surface frame, so magnitudes stay within a few hundred metres.
 *
 * Limitation: Rapier contacts are rigid (restitution 0), so the crushable-leg
 * energy absorption is NOT simulated; peak load is estimated from the energy
 * method instead (see `loadModel` in contactSummary()).
 */

/** Dynamically load a Rapier build. Prefers the deterministic build (replays must match). */
export async function loadRapier() {
  const names = ['@dimforge/rapier3d-deterministic-compat', '@dimforge/rapier3d-compat'];
  for (const packageName of names) {
    try {
      const mod = await import(packageName);
      const RAPIER = mod.default ?? mod;
      if (typeof RAPIER.init === 'function') await RAPIER.init();
      return { RAPIER, packageName };
    } catch {
      // not installed - try the next one
    }
  }
  return null;
}

export class RapierBackend {
  constructor({ rapier, terrain, lander, massKg, inertiaDiag, comBody, state, gravityLocal, limits, maxSubstepS = 1 / 120 }) {
    this.name = 'rapier';
    const RAPIER = rapier.RAPIER;
    this.packageName = rapier.packageName;
    this.RAPIER = RAPIER;
    this.terrain = terrain;
    this.lander = lander;
    this.mass = massKg;
    this.com = comBody.slice();
    this.maxSub = maxSubstepS;
    this.limits = limits;
    this.gravityLocal = gravityLocal.slice();
    this.timeS = 0;

    const world = new RAPIER.World({ x: gravityLocal[0], y: gravityLocal[1], z: gravityLocal[2] });
    world.timestep = this.maxSub;
    this.world = world;

    // --- terrain: a big thin cuboid whose top face is the (possibly sloped) ground plane through the origin
    const n = terrain.normal;
    const qT = quat.fromTo([0, 1, 0], n);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(500, 0.5, 500)
        .setTranslation(-0.5 * n[0], -0.5 * n[1], -0.5 * n[2])
        .setRotation({ w: qT[0], x: qT[1], y: qT[2], z: qT[3] })
        .setFriction(terrain.friction)
        .setRestitution(0)
    );
    for (const b of terrain.boulders) {
      world.createCollider(
        RAPIER.ColliderDesc.ball(b.r)
          .setTranslation(b.c[0], b.c[1], b.c[2])
          .setFriction(terrain.friction)
          .setRestitution(0)
      );
    }

    // --- lander body. Body origin == centre of mass; mass properties supplied explicitly
    const wWorld = quat.rotate(state.quat, state.omegaBody);
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(state.pos[0], state.pos[1], state.pos[2])
      .setRotation({ w: state.quat[0], x: state.quat[1], y: state.quat[2], z: state.quat[3] })
      .setLinvel(state.vel[0], state.vel[1], state.vel[2])
      .setAngvel({ x: wWorld[0], y: wWorld[1], z: wWorld[2] })
      .setCcdEnabled(true)
      .setCanSleep(false)
      .setAdditionalMassProperties(
        massKg,
        { x: 0, y: 0, z: 0 },
        { x: inertiaDiag[0], y: inertiaDiag[1], z: inertiaDiag[2] },
        { x: 0, y: 0, z: 0, w: 1 }
      );
    this.body = world.createRigidBody(bodyDesc);

    const [hx, hy, hz] = lander.hullHalfExtents;
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(hx, hy, hz)
        .setTranslation(-this.com[0], -this.com[1], -this.com[2])
        .setDensity(0)
        .setFriction(terrain.friction)
        .setRestitution(0),
      this.body
    );
    for (const leg of lander.legs) {
      const f = v3.sub(leg.footBody, this.com);
      world.createCollider(
        RAPIER.ColliderDesc.ball(lander.padRadiusM)
          .setTranslation(f[0], f[1], f[2])
          .setDensity(0)
          .setFriction(terrain.friction)
          .setRestitution(0),
        this.body
      );
    }

    this.points = [];
    for (const leg of lander.legs) this.points.push({ kind: 'leg', body: leg.footBody, probe: lander.padRadiusM });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      this.points.push({ kind: 'hull', body: [sx * hx, sy * hy, sz * hz], probe: 0 });
    }

    this.resetStats();
  }

  resetStats() {
    this.impact = null;
    this.stats = {
      peakContactG: 0,
      maxLegCompressionM: 0,
      bottomedOut: false,
      hullStrike: false,
      hullStrikeSpeedMS: 0,
      legsInContact: 0,
      hullInContact: 0,
      loadModel: 'energy-estimate'
    };
  }

  _read() {
    const t = this.body.translation();
    const r = this.body.rotation();
    const lv = this.body.linvel();
    const av = this.body.angvel();
    const q = [r.w, r.x, r.y, r.z];
    return {
      pos: [t.x, t.y, t.z],
      vel: [lv.x, lv.y, lv.z],
      quat: q,
      omegaBody: quat.rotateInv(q, [av.x, av.y, av.z])
    };
  }

  getStateLocal() { return this._read(); }

  setStateLocal(s) {
    const wWorld = quat.rotate(s.quat, s.omegaBody);
    this.body.setTranslation({ x: s.pos[0], y: s.pos[1], z: s.pos[2] }, true);
    this.body.setRotation({ w: s.quat[0], x: s.quat[1], y: s.quat[2], z: s.quat[3] }, true);
    this.body.setLinvel({ x: s.vel[0], y: s.vel[1], z: s.vel[2] }, true);
    this.body.setAngvel({ x: wWorld[0], y: wWorld[1], z: wWorld[2] }, true);
  }

  getImpact() { return this.impact; }

  contactSummary() { return { ...this.stats }; }

  _touching(state) {
    let legs = 0, hull = 0, hullDepth = 0;
    for (const p of this.points) {
      const rW = quat.rotate(state.quat, v3.sub(p.body, this.com));
      const pW = v3.add(state.pos, rW);
      const cs = this.terrain.contactsFor(pW, p.probe);
      let deepest = -Infinity;
      for (const c of cs) deepest = Math.max(deepest, c.depth);
      // Rapier leaves a small residual penetration/gap; treat |gap| < 5 mm as touching
      const gap = this.terrain.contactsFor(pW, p.probe + 0.005).length > 0;
      if (cs.length > 0 || gap) {
        if (p.kind === 'leg') legs++; else hull++;
        if (p.kind === 'hull' && cs.length > 0) hullDepth = Math.max(hullDepth, deepest);
      }
    }
    return { legs, hull, hullDepth };
  }

  step(dt, ext) {
    if (ext.gravityLocal) this.gravityLocal = ext.gravityLocal.slice();
    const n = Math.max(1, Math.ceil(dt / this.maxSub - 1e-9));
    const h = dt / n;
    for (let i = 0; i < n; i++) this._substep(h, ext);
  }

  _substep(h, ext) {
    const before = this._read();
    const g = this.gravityLocal;
    this.world.gravity = { x: g[0], y: g[1], z: g[2] };
    this.world.timestep = h;

    const tauW = quat.rotate(before.quat, ext.torqueBody);
    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.body.addForce({ x: ext.forceLocal[0], y: ext.forceLocal[1], z: ext.forceLocal[2] }, true);
    this.body.addTorque({ x: tauW[0], y: tauW[1], z: tauW[2] }, true);

    this.world.step();
    this.timeS += h;

    const after = this._read();
    const t = this._touching(after);
    this.stats.legsInContact = t.legs;
    this.stats.hullInContact = t.hull;

    if (!this.impact && (t.legs > 0 || t.hull > 0)) {
      const nrm = this.terrain.normal;
      const up = quat.rotate(before.quat, this.lander.upAxisBody);
      const vn = v3.dot(before.vel, nrm);
      const vh = v3.sub(before.vel, v3.scale(nrm, vn));
      this.impact = {
        timeS: this.timeS,
        firstContactKind: t.legs > 0 ? 'leg' : 'hull',
        vVertMS: Math.max(0, -vn),
        vHorizMS: v3.len(vh),
        tiltDeg: (v3.angleBetween(up, nrm) * 180) / Math.PI,
        slopeDeg: this.terrain.slopeDeg
      };
      // Energy-method estimate of what crushable legs would have done
      const stroke = this.lander.legs[0].strokeM;
      const crushG = this.lander.crushAccelG ?? this.limits.maxImpactG;
      const needG = (this.impact.vVertMS * this.impact.vVertMS) / (2 * stroke * G_REF);
      if (needG > crushG) {
        this.stats.bottomedOut = true;
        this.stats.peakContactG = needG;
      } else {
        this.stats.peakContactG = Math.max(needG, this.stats.peakContactG);
      }
    }

    if (t.hullDepth > 0.01) {
      this.stats.hullStrike = true;
      this.stats.hullStrikeSpeedMS = Math.max(this.stats.hullStrikeSpeedMS, v3.len(before.vel));
    }
  }
}
