import { Vector3 } from '../math/Vector3.js';
import { Integrator } from '../physics/Integrator.js';

/**
 * Forward numerical trajectory predictor (orbit path polyline for the Three.js client).
 * Each output sample is advanced with enough velocity-Verlet substeps to keep the step small relative to
 * the local dynamical time sqrt(r^3/mu), so low or eccentric orbits stay accurate. Propagation stops at
 * the surface when `bodyRadius` is given (the path ends where the craft would hit the ground).
 */
export class TrajectoryPredictor {
  /**
   * @param {Vector3} r0 - position [m]
   * @param {Vector3} v0 - velocity [m/s]
   * @param {number} mu - gravitational parameter [m^3/s^2]
   * @param {Vector3} primaryBodyPos - primary body position [m]
   * @param {number} numPoints - samples to emit
   * @param {number} totalDurationSeconds - time span (non-finite / non-positive values fall back to 5400 s; capped at 24 h)
   * @param {{bodyRadius?: number, maxSubstepFraction?: number}} opts
   * @returns {Array<[number, number, number]>}
   */
  static predictTrajectory(r0, v0, mu, primaryBodyPos = new Vector3(0, 0, 0), numPoints = 120, totalDurationSeconds = 5400, opts = {}) {
    let duration = Number.isFinite(totalDurationSeconds) && totalDurationSeconds > 0 ? totalDurationSeconds : 5400;
    duration = Math.min(duration, 86400);
    const n = Math.max(2, Math.min(2000, Math.floor(numPoints) || 120));
    const bodyRadius = opts.bodyRadius ?? 0;
    const fraction = opts.maxSubstepFraction ?? 0.02;

    const computeAcc = (pos) => {
      const rRel = Vector3.subtract(pos, primaryBodyPos);
      const rSq = rRel.lengthSq();
      const r = Math.sqrt(rSq);
      if (r < 1e3) return new Vector3(0, 0, 0);
      return rRel.multiplyScalar(-mu / (rSq * r));
    };

    let pos = r0.clone();
    let vel = v0.clone();
    const points = [pos.toArray()];
    const dtSample = duration / n;

    for (let i = 0; i < n; i++) {
      const r = Vector3.subtract(pos, primaryBodyPos).length();
      const tDyn = Math.sqrt(Math.max(1, r * r * r / mu));
      const maxSub = Math.max(0.05, tDyn * fraction);
      const subs = Math.min(500, Math.max(1, Math.ceil(dtSample / maxSub)));
      const h = dtSample / subs;
      for (let k = 0; k < subs; k++) {
        const s = Integrator.stepVelocityVerlet(pos, vel, h, computeAcc);
        pos = s.pos;
        vel = s.vel;
      }
      if (!Number.isFinite(pos.x + pos.y + pos.z)) break;
      if (bodyRadius > 0 && Vector3.subtract(pos, primaryBodyPos).length() <= bodyRadius) {
        // clamp the final point onto the surface and stop
        const rel = Vector3.subtract(pos, primaryBodyPos).normalize().multiplyScalar(bodyRadius);
        points.push(Vector3.add(rel, primaryBodyPos).toArray());
        break;
      }
      points.push(pos.toArray());
    }
    return points;
  }
}
