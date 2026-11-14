import { v3, quat, G_REF } from './mathutil.js';

/**
 * Pure-JS float64 contact backend.
 *
 * A single rigid body in the local surface frame with:
 *  - crushable landing legs (spring-damper up to a force plateau, i.e. honeycomb
 *    crush, then a hard stop at the end of stroke),
 *  - hull-corner contacts (stiff spring-damper) so a vehicle that bottoms out or
 *    tips over lands on its hull instead of falling through the ground,
 *  - Coulomb friction (viscous-regularised and saturated at mu * Fn),
 *  - Euler rigid-body rotation, semi-implicit integration at a fixed sub-step.
 *
 * It is deterministic (no randomness, fixed step count for a given dt) and has
 * no dependencies, so it is the reference backend; the Rapier backend must
 * agree with it on simple scenarios.
 */
export class AnalyticBackend {
  constructor({ terrain, lander, massKg, inertiaDiag, comBody, state, gravityLocal, limits, maxSubstepS = 1 / 240 }) {
    this.name = 'analytic';
    this.terrain = terrain;
    this.lander = lander;
    this.mass = massKg;
    this.I = inertiaDiag.slice();
    this.com = comBody.slice();
    this.maxSub = maxSubstepS;
    this.gravityLocal = gravityLocal.slice();

    this.pos = state.pos.slice();
    this.vel = state.vel.slice();
    this.q = state.quat.slice();
    this.w = state.omegaBody.slice(); // body-axes angular rate relative to the surface frame

    this.limits = limits;
    this._derive();

    this.points = [];
    for (const leg of lander.legs) {
      this.points.push({ kind: 'leg', id: leg.id, body: leg.footBody, probe: lander.padRadiusM, stroke: leg.strokeM });
    }
    const [hx, hy, hz] = lander.hullHalfExtents;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      this.points.push({ kind: 'hull', id: 'hull', body: [sx * hx, sy * hy, sz * hz], probe: 0, stroke: 0 });
    }

    this.timeS = 0;
    this.resetStats();
  }

  /** Contact stiffness / damping scale with vehicle mass, so recompute them whenever it changes. */
  _derive() {
    const { lander, mass: massKg, limits } = this;
    const nLegs = lander.legs.length;
    const crushG = lander.crushAccelG ?? limits.maxImpactG;
    this.crushForcePerLegN = (crushG * massKg * G_REF) / nLegs;
    this.kLeg = this.crushForcePerLegN / lander.kneeDeflectionM;
    this.cLeg = 2 * lander.dampingRatio * Math.sqrt((this.kLeg * massKg) / nLegs);
    this.kHard = this.kLeg * 10;
    this.kHull = (massKg * lander.hullOmegaRadS * lander.hullOmegaRadS) / 4;
    this.cHull = 2 * 0.5 * Math.sqrt((this.kHull * massKg) / 4);
    this.kFric = massKg * lander.frictionRate;
  }

  /** Update mass properties (propellant burn during descent). */
  setMassProperties(massKg, inertiaDiag) {
    this.mass = massKg;
    this.I = inertiaDiag.slice();
    this._derive();
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
      hullInContact: 0
    };
  }

  getStateLocal() {
    return { pos: this.pos.slice(), vel: this.vel.slice(), quat: this.q.slice(), omegaBody: this.w.slice() };
  }

  setStateLocal(s) {
    this.pos = s.pos.slice();
    this.vel = s.vel.slice();
    this.q = s.quat.slice();
    this.w = s.omegaBody.slice();
  }

  getImpact() { return this.impact; }

  contactSummary() { return { ...this.stats }; }

  /**
   * Advance by dt seconds.
   * @param {number} dt
   * @param {{forceLocal:number[], torqueBody:number[], gravityLocal?:number[]}} ext
   *        non-gravitational force in local axes [N] and torque in body axes [N m]
   */
  step(dt, ext) {
    if (ext.gravityLocal) this.gravityLocal = ext.gravityLocal.slice();
    const n = Math.max(1, Math.ceil(dt / this.maxSub - 1e-9));
    const h = dt / n;
    for (let i = 0; i < n; i++) this._substep(h, ext);
  }

  _captureImpact(kind) {
    const nrm = this.terrain.normal;
    const up = quat.rotate(this.q, this.lander.upAxisBody);
    const vn = v3.dot(this.vel, nrm);
    const vh = v3.sub(this.vel, v3.scale(nrm, vn));
    this.impact = {
      timeS: this.timeS,
      firstContactKind: kind,
      vVertMS: Math.max(0, -vn),
      vHorizMS: v3.len(vh),
      tiltDeg: (v3.angleBetween(up, nrm) * 180) / Math.PI,
      slopeDeg: this.terrain.slopeDeg
    };
  }

  _substep(h, ext) {
    const m = this.mass;
    const g = this.gravityLocal;
    const wWorld = quat.rotate(this.q, this.w);

    let F = [
      ext.forceLocal[0] + m * g[0],
      ext.forceLocal[1] + m * g[1],
      ext.forceLocal[2] + m * g[2]
    ];
    let Tw = [0, 0, 0];
    let fContact = [0, 0, 0];
    let legs = 0;
    let hull = 0;

    for (const p of this.points) {
      const rW = quat.rotate(this.q, v3.sub(p.body, this.com));
      const pW = v3.add(this.pos, rW);
      const cs = this.terrain.contactsFor(pW, p.probe);
      if (cs.length === 0) continue;

      if (!this.impact) this._captureImpact(p.kind);

      const vP = v3.add(this.vel, v3.cross(wWorld, rW));
      if (p.kind === 'leg') legs++; else hull++;

      for (const c of cs) {
        const vn = v3.dot(vP, c.normal);
        let Fn;
        if (p.kind === 'leg') {
          if (c.depth <= p.stroke) {
            const elastic = this.kLeg * c.depth - this.cLeg * vn;
            Fn = Math.min(Math.max(0, elastic), this.crushForcePerLegN);
          } else {
            Fn = Math.max(0, this.crushForcePerLegN + this.kHard * (c.depth - p.stroke) - this.cLeg * vn);
            this.stats.bottomedOut = true;
          }
          if (c.depth > this.stats.maxLegCompressionM) this.stats.maxLegCompressionM = c.depth;
        } else {
          Fn = Math.max(0, this.kHull * c.depth - this.cHull * vn);
          if (c.depth > 0.01) {
            this.stats.hullStrike = true;
            this.stats.hullStrikeSpeedMS = Math.max(this.stats.hullStrikeSpeedMS, Math.max(0, -vn));
          }
        }

        // Coulomb friction, regularised so a resting vehicle does not jitter
        const vt = v3.sub(vP, v3.scale(c.normal, vn));
        const vtm = v3.len(vt);
        let f = v3.scale(c.normal, Fn);
        if (vtm > 1e-9 && Fn > 0) {
          const mag = Math.min(this.terrain.friction * Fn, this.kFric * vtm);
          f = v3.add(f, v3.scale(vt, -mag / vtm));
        }

        F = v3.add(F, f);
        Tw = v3.add(Tw, v3.cross(rW, f));
        fContact = v3.add(fContact, f);
      }
    }

    // Euler rigid-body equation in body axes: I dw/dt = tau - w x (I w)
    const tauB = v3.add(quat.rotateInv(this.q, Tw), ext.torqueBody);
    const Iw = [this.I[0] * this.w[0], this.I[1] * this.w[1], this.I[2] * this.w[2]];
    const gyro = v3.cross(this.w, Iw);
    const alpha = [
      (tauB[0] - gyro[0]) / this.I[0],
      (tauB[1] - gyro[1]) / this.I[1],
      (tauB[2] - gyro[2]) / this.I[2]
    ];

    // semi-implicit Euler
    this.w = v3.add(this.w, v3.scale(alpha, h));
    this.vel = v3.add(this.vel, v3.scale(F, h / m));
    this.pos = v3.add(this.pos, v3.scale(this.vel, h));
    this.q = quat.integrateBody(this.q, this.w, h);
    this.timeS += h;

    this.stats.legsInContact = legs;
    this.stats.hullInContact = hull;
    const gLoad = v3.len(fContact) / (m * G_REF);
    if (gLoad > this.stats.peakContactG) this.stats.peakContactG = gLoad;
  }
}
