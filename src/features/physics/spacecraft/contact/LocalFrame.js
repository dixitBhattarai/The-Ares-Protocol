import { v3, quat } from './mathutil.js';

/**
 * Surface-fixed landing-site frame.
 *
 * Why this exists: orbital state lives at 1e6..1e11 m magnitudes. Contact
 * physics (legs, boulders, friction) needs centimetre resolution, and Rapier's
 * JS build is 32-bit float. Re-expressing the vehicle in a frame whose origin is
 * the surface point below it keeps every number within a few hundred metres.
 *
 * Axes (right-handed):  x = East,  y = Up (radial),  z = South.
 *
 * The frame is anchored to the planet surface, so it rotates with the planet
 * about +Z (the same spin axis Atmosphere.js uses). Velocities in the local
 * frame are therefore *surface-relative* (v_inertial - omega x r), which is what
 * a touchdown evaluation actually needs.
 */
export class LocalFrame {
  /**
   * @param {object} p
   * @param {number[]} p.posInertial   planet-centred inertial position at engage time [m]
   * @param {number}   p.bodyRadiusM   surface radius [m]
   * @param {number}   p.bodyRotationPeriodS  sidereal rotation period [s] (0 = non-rotating)
   * @param {number}   p.timeS         simulation time at engage [s]
   */
  constructor({ posInertial, bodyRadiusM, bodyRotationPeriodS = 0, timeS = 0 }) {
    const up = v3.norm(posInertial);
    if (v3.len(up) === 0) throw new Error('LocalFrame: position must be non-zero');

    let east = v3.cross([0, 0, 1], up);
    if (v3.len(east) < 1e-9) {
      east = [1, 0, 0]; // at a pole any horizontal direction will do
    } else {
      east = v3.norm(east);
    }
    const north = v3.cross(up, east);

    this.east0 = east;
    this.up0 = up;
    this.south0 = v3.scale(north, -1);
    this.radius = Number(bodyRadiusM);
    this.omega = bodyRotationPeriodS > 0 ? (2 * Math.PI) / bodyRotationPeriodS : 0;
    this.t0 = Number(timeS);
  }

  /** Planet angular velocity vector in inertial coordinates [rad/s]. */
  omegaVector() {
    return [0, 0, this.omega];
  }

  _rotZ(v, phi) {
    const c = Math.cos(phi), s = Math.sin(phi);
    return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
  }

  /** Frame axes (inertial coordinates) at time t. */
  axesAt(t) {
    const phi = this.omega * (t - this.t0);
    if (phi === 0) return { e: this.east0, u: this.up0, s: this.south0 };
    return {
      e: this._rotZ(this.east0, phi),
      u: this._rotZ(this.up0, phi),
      s: this._rotZ(this.south0, phi)
    };
  }

  originAt(t) {
    return v3.scale(this.axesAt(t).u, this.radius);
  }

  /** Orientation of the local frame (local -> inertial) at time t. */
  quatAt(t) {
    const a = this.axesAt(t);
    return quat.fromBasis(a.e, a.u, a.s);
  }

  /** Rotate a free vector (force, gravity) from inertial to local axes. */
  vecToLocal(v, t) {
    const a = this.axesAt(t);
    return [v3.dot(v, a.e), v3.dot(v, a.u), v3.dot(v, a.s)];
  }

  /** Rotate a free vector from local axes to inertial. */
  vecToInertial(v, t) {
    const a = this.axesAt(t);
    return [
      a.e[0] * v[0] + a.u[0] * v[1] + a.s[0] * v[2],
      a.e[1] * v[0] + a.u[1] * v[1] + a.s[1] * v[2],
      a.e[2] * v[0] + a.u[2] * v[1] + a.s[2] * v[2]
    ];
  }

  /**
   * Inertial state -> local surface-fixed state.
   * @param {{pos:number[], vel:number[], quat:number[], omegaBody:number[]}} s
   *        pos/vel inertial planet-centred, quat body->inertial, omegaBody = inertial angular rate in body axes
   */
  toLocal(s, t) {
    const a = this.axesAt(t);
    const origin = v3.scale(a.u, this.radius);
    const rel = v3.sub(s.pos, origin);
    const pos = [v3.dot(rel, a.e), v3.dot(rel, a.u), v3.dot(rel, a.s)];

    const wp = this.omegaVector();
    const vRel = v3.sub(s.vel, v3.cross(wp, s.pos));
    const vel = [v3.dot(vRel, a.e), v3.dot(vRel, a.u), v3.dot(vRel, a.s)];

    const qFrame = quat.fromBasis(a.e, a.u, a.s);
    const q = quat.normalize(quat.mul(quat.conj(qFrame), s.quat));

    // angular velocity relative to the (rotating) surface frame, in body axes
    const wpBody = quat.rotateInv(s.quat, wp);
    const omegaBody = v3.sub(s.omegaBody, wpBody);

    return { pos, vel, quat: q, omegaBody };
  }

  /** Local surface-fixed state -> inertial state. Exact inverse of toLocal. */
  toInertial(l, t) {
    const a = this.axesAt(t);
    const origin = v3.scale(a.u, this.radius);
    const off = this.vecToInertial(l.pos, t);
    const pos = v3.add(origin, off);

    const wp = this.omegaVector();
    const vRel = this.vecToInertial(l.vel, t);
    const vel = v3.add(vRel, v3.cross(wp, pos));

    const qFrame = quat.fromBasis(a.e, a.u, a.s);
    const q = quat.normalize(quat.mul(qFrame, l.quat));

    const wpBody = quat.rotateInv(q, wp);
    const omegaBody = v3.add(l.omegaBody, wpBody);

    return { pos, vel, quat: q, omegaBody };
  }
}
