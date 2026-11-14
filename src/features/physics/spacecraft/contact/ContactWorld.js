import { v3, quat, toVec, toQuat, isFiniteArray } from './mathutil.js';
import { LocalFrame } from './LocalFrame.js';
import { Terrain } from './Terrain.js';
import { resolveLanderConfig, DEFAULT_LANDING_LIMITS } from './landerConfig.js';
import { AnalyticBackend } from './AnalyticBackend.js';
import { RapierBackend, loadRapier } from './RapierBackend.js';

/** Damage model per spec 7.2:  damage = kv*vv^2 + kh*vh^2 + k_theta*theta^2 (+ load and hull terms). */
export const DAMAGE_COEFFS = Object.freeze({ kv: 0.12, kh: 0.25, kTheta: 0.005, kG: 0.02, hullStrike: 0.35 });

const REST_SPEED_MS = 0.05;
const REST_RATE_RADS = 0.02;
const LOAD_TOLERANCE = 1.15;

/**
 * Decide the outcome of a touchdown. Pure function (easy to unit test).
 *
 * Tilt is measured against the local terrain normal (a vehicle standing level on a
 * 12 degree slope is not "tilted"); ground slope is checked separately against
 * limits.maxSlopeDeg. Outcomes:
 *   LANDED / SAFE          every limit met
 *   LANDED / HARD_LANDING  a limit was exceeded but the vehicle survived (damage < 1)
 *   CRASHED                structural failure, tipped over, or not resting on its legs
 */
export function classifyLanding({ impact, rest, summary, limits }) {
  const flags = {
    vertical: impact.vVertMS <= limits.maxVerticalSpeedMS,
    horizontal: impact.vHorizMS <= limits.maxHorizontalSpeedMS,
    tilt: impact.tiltDeg <= limits.maxTiltDeg,
    slope: impact.slopeDeg <= limits.maxSlopeDeg,
    load: !summary.bottomedOut && summary.peakContactG <= limits.maxImpactG * LOAD_TOLERANCE,
    hull: !summary.hullStrike,
    restTilt: rest.tiltFromNormalDeg <= limits.maxTiltDeg
  };
  const safe = Object.values(flags).every(Boolean);

  const tilt = Math.max(impact.tiltDeg, rest.tiltFromNormalDeg);
  let damage = 0;
  if (!safe) {
    damage =
      DAMAGE_COEFFS.kv * impact.vVertMS * impact.vVertMS +
      DAMAGE_COEFFS.kh * impact.vHorizMS * impact.vHorizMS +
      DAMAGE_COEFFS.kTheta * tilt * tilt +
      DAMAGE_COEFFS.kG * Math.max(0, summary.peakContactG - limits.maxImpactG) +
      (summary.hullStrike ? DAMAGE_COEFFS.hullStrike : 0);
    damage = Math.min(1, damage);
  }

  if (rest.tiltFromNormalDeg > 45) return { state: 'CRASHED', outcome: 'CRASHED', reason: 'TIPPED_OVER', flags, damage: Math.max(damage, 1) };
  if (rest.legsInContact < 3) return { state: 'CRASHED', outcome: 'CRASHED', reason: 'NOT_ON_LEGS', flags, damage: Math.max(damage, 1) };
  if (damage >= 1) return { state: 'CRASHED', outcome: 'CRASHED', reason: 'STRUCTURAL_FAILURE', flags, damage: 1 };
  if (safe) return { state: 'LANDED', outcome: 'SAFE', reason: null, flags, damage: 0 };
  return { state: 'LANDED', outcome: 'HARD_LANDING', reason: 'LIMITS_EXCEEDED', flags, damage };
}

/**
 * Local-frame contact world for terminal descent, touchdown and liftoff.
 *
 * Lifecycle (driven by the simulation engine, see CONTACT_INTEGRATION.md):
 *   shouldEngage(altitude) -> engage(state) -> step(dt, forces) ... -> shouldDisengage() -> disengage()
 *
 * While engaged, this object owns the vehicle's translation/rotation (the engine
 * should skip its own integrator for those four quantities and copy the result of
 * step() back), but all subsystems (power, thermal, ...) keep running as usual.
 *
 * States: IN_FLIGHT -> CONTACT -> LANDED | CRASHED;  LANDED -> CONTACT -> IN_FLIGHT on liftoff.
 */
export class ContactWorld {
  /**
   * @param {object} o
   * @param {{radius:number, mu:number, rotationPeriod?:number}} o.body  planet data (CELESTIAL_BODIES entry works)
   * @param {object} [o.limits]    landing limits (defaults = LandingDockingSystem limits)
   * @param {object|Terrain} [o.terrain]  Terrain instance or Terrain options
   * @param {object} [o.lander]    overrides for defaultLanderConfig()
   * @param {'auto'|'analytic'|'rapier'} [o.backend='auto']  'auto' currently means analytic
   * @param {{RAPIER:object, packageName:string}|null} [o.rapier]  result of loadRapier()
   */
  constructor(o = {}) {
    const b = o.body;
    if (!b || !(b.radius > 0) || !(b.mu > 0)) throw new Error('ContactWorld: body {radius, mu} is required');
    this.body = { radius: b.radius, mu: b.mu, rotationPeriod: b.rotationPeriod ?? 0 };
    this.limits = { ...DEFAULT_LANDING_LIMITS, ...(o.limits || {}) };
    this.terrain = o.terrain instanceof Terrain ? o.terrain : new Terrain(o.terrain || {});
    this.lander = resolveLanderConfig(o.lander);
    this.backendPref = o.backend ?? 'auto';
    this.rapier = o.rapier ?? null;
    if (this.backendPref === 'rapier' && !this.rapier) {
      throw new Error("ContactWorld: backend 'rapier' needs o.rapier (use ContactWorld.create())");
    }

    this.engageAltitudeM = o.engageAltitudeM ?? 60;
    this.disengageAltitudeM = o.disengageAltitudeM ?? 150;
    this.settleTimeS = o.settleTimeS ?? 1.0;
    this.maxContactTimeS = o.maxContactTimeS ?? 30;
    this.substepS = o.substepS ?? 1 / 240;
    this.liftoffMargin = o.liftoffMargin ?? 1.02;

    this.engaged = false;
    this.state = 'IDLE';
    this.warnings = 0;
    this.backendNote = null;
  }

  /** Async factory: loads Rapier when it was explicitly requested. */
  static async create(o = {}) {
    if (o.backend === 'rapier' && !o.rapier) {
      const loaded = await loadRapier();
      if (!loaded) throw new Error('Rapier is not installed. Run: npm install @dimforge/rapier3d-deterministic-compat');
      o = { ...o, rapier: loaded };
    }
    return new ContactWorld(o);
  }

  /** Cheap altitude gate for the engine's step loop. */
  shouldEngage(altitudeM) {
    return !this.engaged && altitudeM <= this.engageAltitudeM;
  }

  /**
   * Hand the vehicle to the contact world.
   * @param {object} s
   * @param {number} s.timeS         simulation time [s]
   * @param {object|number[]} s.pos  planet-centred inertial position [m]
   * @param {object|number[]} s.vel  planet-centred inertial velocity [m/s]
   * @param {object|number[]} s.quat body->inertial orientation
   * @param {object|number[]} s.omegaBody  angular velocity in body axes [rad/s]
   * @param {number} s.massKg
   * @param {number[]} s.inertiaDiag  principal moments [kg m^2] (Spacecraft: elements[0], [4], [8])
   * @param {number[]} [s.comBody]   centre of mass in body frame [m]
   */
  engage(s) {
    const pos = toVec(s.pos);
    const vel = toVec(s.vel);
    const q = quat.normalize(toQuat(s.quat));
    const omegaBody = toVec(s.omegaBody ?? [0, 0, 0]);
    const inertia = toVec(s.inertiaDiag);
    const com = toVec(s.comBody ?? [0, 0, 0]);
    for (const [name, arr] of [['pos', pos], ['vel', vel], ['quat', q], ['omegaBody', omegaBody], ['inertiaDiag', inertia], ['comBody', com]]) {
      if (!isFiniteArray(arr)) throw new Error(`ContactWorld.engage: ${name} contains non-finite values`);
    }
    if (!(s.massKg > 0)) throw new Error('ContactWorld.engage: massKg must be > 0');
    if (inertia.some((x) => !(x > 0))) throw new Error('ContactWorld.engage: inertiaDiag must be > 0');

    this.timeS = Number(s.timeS ?? 0);
    this.massKg = s.massKg;
    this.inertiaDiag = inertia;
    this.comBody = com;
    this.frame = new LocalFrame({
      posInertial: pos,
      bodyRadiusM: this.body.radius,
      bodyRotationPeriodS: this.body.rotationPeriod,
      timeS: this.timeS
    });

    const local = this.frame.toLocal({ pos, vel, quat: q, omegaBody }, this.timeS);
    const args = {
      terrain: this.terrain,
      lander: this.lander,
      massKg: this.massKg,
      inertiaDiag: inertia,
      comBody: com,
      state: local,
      gravityLocal: this._gravityLocal(this.timeS, null),
      limits: this.limits,
      maxSubstepS: this.substepS
    };
    this.backend = this._makeBackend(args);

    this.engaged = true;
    this.state = 'IN_FLIGHT';
    this.outcome = null;
    this.impact = null;
    this.damage = 0;
    this.restTimer = 0;
    this.contactTimeS = 0;
    this.noContactTimer = 0;
    this.liftoff = false;
    return this.getInertialState();
  }

  _makeBackend(args) {
    if (this.backendPref === 'rapier') {
      try {
        return new RapierBackend({ ...args, rapier: this.rapier, maxSubstepS: Math.max(args.maxSubstepS, 1 / 120) });
      } catch (err) {
        this.backendNote = `rapier init failed (${err.message}); using analytic backend`;
      }
    }
    return new AnalyticBackend(args);
  }

  /** Keep contact stiffness and inertia in sync with propellant burn (analytic backend; Rapier keeps engage-time mass). */
  setMassProperties(massKg, inertiaDiag) {
    if (!this.engaged || !(massKg > 0)) return;
    const I = toVec(inertiaDiag);
    if (!isFiniteArray(I) || I.some((x) => !(x > 0))) return;
    this.massKg = massKg;
    this.inertiaDiag = I;
    if (typeof this.backend.setMassProperties === 'function') this.backend.setMassProperties(massKg, I);
  }

  _gravityLocal(t, gravInertialOpt) {
    const origin = this.frame.originAt(t);
    const r = v3.len(origin);
    const grav = gravInertialOpt ? toVec(gravInertialOpt) : v3.scale(origin, -this.body.mu / (r * r * r));
    const W = this.frame.omegaVector();
    const centrifugal = v3.cross(W, v3.cross(W, origin)); // surface frame rotates: g_eff = g - W x (W x r)
    return this.frame.vecToLocal(v3.sub(grav, centrifugal), t);
  }

  _clean(v) {
    const a = v ? toVec(v) : [0, 0, 0];
    if (!isFiniteArray(a)) {
      this.warnings++;
      return [0, 0, 0];
    }
    return a;
  }

  /**
   * Advance the contact world by dt.
   * @param {number} dt  seconds
   * @param {object} [ext]
   * @param {object|number[]} [ext.forceInertial]  non-gravitational force: thrust + aero [N], inertial axes
   * @param {object|number[]} [ext.torqueBody]     net torque from thrusters/wheels [N m], body axes
   * @param {object|number[]} [ext.gravityInertial] gravity acceleration from the engine (includes J2); optional
   * @returns inertial state {pos, vel, quat, omegaBody}
   */
  step(dt, ext = {}) {
    if (!this.engaged) throw new Error('ContactWorld.step called before engage()');
    if (!(dt > 0) || !Number.isFinite(dt)) throw new Error('ContactWorld.step: dt must be a positive finite number');

    const t = this.timeS;
    const forceLocal = this.frame.vecToLocal(this._clean(ext.forceInertial), t);
    const torqueBody = this._clean(ext.torqueBody);
    const gLocal = this._gravityLocal(t, ext.gravityInertial);

    if (this.state === 'CRASHED') {
      this.timeS += dt;
      return this.getInertialState();
    }

    if (this.state === 'LANDED') {
      const weightN = this.massKg * Math.max(0, -gLocal[1]);
      if (forceLocal[1] > weightN * this.liftoffMargin) {
        this.state = 'CONTACT';
        this.liftoff = true;
        this.restTimer = 0;
        this.noContactTimer = 0;
        this.contactTimeS = 0;
      } else {
        this.timeS += dt;
        return this.getInertialState();
      }
    }

    try {
      this.backend.step(dt, { forceLocal, torqueBody, gravityLocal: gLocal });
    } catch (err) {
      if (this.backend.name !== 'rapier') throw err;
      // Rapier misbehaved: carry on with the analytic backend from the last good state
      const last = this.backend.getStateLocal();
      this.backendNote = `rapier step failed (${err.message}); switched to analytic backend`;
      this.backend = new AnalyticBackend({
        terrain: this.terrain, lander: this.lander, massKg: this.massKg, inertiaDiag: this.inertiaDiag,
        comBody: this.comBody, state: last, gravityLocal: gLocal, limits: this.limits, maxSubstepS: this.substepS
      });
      this.backend.step(dt, { forceLocal, torqueBody, gravityLocal: gLocal });
    }
    this.timeS += dt;
    this._updateState(dt);
    return this.getInertialState();
  }

  _updateState(dt) {
    const sum = this.backend.contactSummary();
    const st = this.backend.getStateLocal();

    if (this.state === 'IN_FLIGHT') {
      const imp = this.backend.getImpact();
      if (imp) {
        this.state = 'CONTACT';
        this.impact = { ...imp };
        this.contactTimeS = 0;
        this.restTimer = 0;
        this.noContactTimer = 0;
        this.liftoff = false;
      }
      return;
    }

    if (this.state !== 'CONTACT') return;
    this.contactTimeS += dt;
    const touching = sum.legsInContact + sum.hullInContact > 0;

    if (this.liftoff) {
      this.noContactTimer = touching ? 0 : this.noContactTimer + dt;
      if (this.noContactTimer >= 0.5) {
        this.state = 'IN_FLIGHT';
        this.backend.resetStats();
        this.impact = null;
        this.outcome = null;
        this.damage = 0;
        this.liftoff = false;
        this.noContactTimer = 0;
      }
      return;
    }

    const speed = v3.len(st.vel);
    const rate = v3.len(st.omegaBody);
    this.restTimer = speed < REST_SPEED_MS && rate < REST_RATE_RADS && touching ? this.restTimer + dt : 0;

    const settled = this.restTimer >= this.settleTimeS;
    const timedOut = this.contactTimeS >= this.maxContactTimeS;
    if (settled || timedOut) this._finalize(st, sum, timedOut && !settled);
  }

  _finalize(st, sum, timedOut) {
    const nrm = this.terrain.normal;
    const up = quat.rotate(st.quat, this.lander.upAxisBody);
    const rest = {
      legsInContact: sum.legsInContact,
      tiltFromNormalDeg: (v3.angleBetween(up, nrm) * 180) / Math.PI,
      tiltFromVerticalDeg: (v3.angleBetween(up, [0, 1, 0]) * 180) / Math.PI,
      speedMS: v3.len(st.vel),
      timedOut
    };

    let result;
    if (timedOut && rest.speedMS > 0.5) {
      result = { state: 'CRASHED', outcome: 'CRASHED', reason: 'NO_SETTLE', flags: null, damage: 1 };
    } else {
      result = classifyLanding({ impact: this.impact, rest, summary: sum, limits: this.limits });
    }
    this.state = result.state;
    this.outcome = { ...result, rest };
    this.damage = result.damage;

    // latch the pose: no creep while parked, and no drift once crashed
    this.backend.setStateLocal({ ...st, vel: [0, 0, 0], omegaBody: [0, 0, 0] });
  }

  /** Current vehicle state in planet-centred inertial coordinates (plain arrays). */
  getInertialState() {
    return this.frame.toInertial(this.backend.getStateLocal(), this.timeS);
  }

  /** True once the vehicle has climbed clear of the ground (hysteresis vs engageAltitudeM). */
  shouldDisengage() {
    if (!this.engaged || this.state !== 'IN_FLIGHT') return false;
    return this.backend.getStateLocal().pos[1] > this.disengageAltitudeM;
  }

  /** Release the vehicle back to the inertial integrator. Returns its inertial state. */
  disengage() {
    const s = this.getInertialState();
    this.engaged = false;
    this.state = 'IDLE';
    return s;
  }

  /** Diagnostics / telemetry. Safe to JSON.stringify. */
  report() {
    const st = this.engaged ? this.backend.getStateLocal() : null;
    return {
      engaged: this.engaged,
      backend: this.engaged ? this.backend.name : null,
      backendNote: this.backendNote,
      state: this.state,
      outcome: this.outcome,
      damage: this.damage ?? 0,
      impact: this.impact ?? null,
      contact: this.engaged ? this.backend.contactSummary() : null,
      localAltitudeM: st ? st.pos[1] : null,
      localSpeedMS: st ? v3.len(st.vel) : null,
      terrain: this.terrain.describe(),
      rejectedInputs: this.warnings
    };
  }
}
