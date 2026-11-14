import { Vector3 } from './Vector3.js';
import { Quaternion } from './Quaternion.js';

/**
 * Rotation helpers that build on the project's Vector3 / Quaternion classes.
 *
 * Conventions (identical to Quaternion.js and the rest of the engine):
 *  - Quaternion components are [w, x, y, z], Hamilton product.
 *  - A spacecraft quaternion q maps BODY axes -> INERTIAL axes:
 *        v_inertial = q.rotateVector(v_body)
 *  - Angular velocity omega is expressed in the BODY frame and
 *        dq/dt = 0.5 * q (x) [0, omega_body]
 *
 * This file is deliberately separate from Quaternion.js so the class stays small
 * and so attitude-control work can evolve independently of these utilities.
 * Every function is pure: inputs are never mutated.
 */

const EPS = 1e-12;

/** Returns a copy of q whose scalar part is >= 0 (q and -q are the same rotation). */
export function canonicalize(q) {
  return q.w < 0 ? new Quaternion(-q.w, -q.x, -q.y, -q.z) : q.clone();
}

/** Shortest-arc rotation that takes direction a onto direction b. Inputs need not be unit length. */
export function quatFromTo(a, b) {
  const ua = a.clone().normalize();
  const ub = b.clone().normalize();
  const d = ua.dot(ub);

  if (d > 1 - EPS) return new Quaternion(1, 0, 0, 0);

  if (d < -1 + EPS) {
    // 180 degrees: any axis perpendicular to a works
    let axis = Vector3.cross(new Vector3(1, 0, 0), ua);
    if (axis.lengthSq() < 1e-12) axis = Vector3.cross(new Vector3(0, 1, 0), ua);
    return new Quaternion().setFromAxisAngle(axis, Math.PI);
  }

  const c = Vector3.cross(ua, ub);
  return new Quaternion(1 + d, c.x, c.y, c.z).normalize();
}

/**
 * Quaternion for the rotation whose columns are ex, ey, ez, i.e. the images of the
 * body X, Y, Z axes. The three vectors must be (nearly) orthonormal and right-handed.
 */
export function quatFromBasis(ex, ey, ez) {
  const m00 = ex.x, m10 = ex.y, m20 = ex.z;
  const m01 = ey.x, m11 = ey.y, m21 = ey.z;
  const m02 = ez.x, m12 = ez.y, m22 = ez.z;
  const trace = m00 + m11 + m22;
  let w, x, y, z;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (m21 - m12) * s;
    y = (m02 - m20) * s;
    z = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }
  return new Quaternion(w, x, y, z).normalize();
}

/**
 * Advance an orientation by a constant body-frame angular velocity over dt using the
 * exact incremental rotation. Unlike q + dq*dt, there is no linearisation error and the
 * result is unit length to machine precision, so no drift correction is needed.
 */
export function integrateBody(q, omegaBody, dt) {
  const mag = omegaBody.length();
  const angle = mag * dt;
  if (angle < 1e-14) return q.clone();
  const s = Math.sin(angle / 2) / mag;
  const dq = new Quaternion(Math.cos(angle / 2), omegaBody.x * s, omegaBody.y * s, omegaBody.z * s);
  return Quaternion.multiply(q, dq).normalize();
}

/**
 * Attitude error as a BODY-frame rotation: the rotation that takes the current body
 * axes onto the target axes, so  current (x) error = target.  Sign-canonicalised so the
 * scalar part is >= 0, which guarantees control acts along the shortest path.
 */
export function errorQuaternion(current, target) {
  const conj = new Quaternion(current.w, -current.x, -current.y, -current.z);
  return canonicalize(Quaternion.multiply(conj, target).normalize());
}

/**
 * Rotation vector (axis * angle, radians) of a unit quaternion. Uses atan2 on the vector
 * part so it stays accurate for tiny angles where acos(w) would lose all precision.
 */
export function rotationVector(q) {
  const c = canonicalize(q);
  const vMag = Math.sqrt(c.x * c.x + c.y * c.y + c.z * c.z);
  if (vMag < 1e-15) return new Vector3(0, 0, 0);
  const angle = 2 * Math.atan2(vMag, c.w);
  const k = angle / vMag;
  return new Vector3(c.x * k, c.y * k, c.z * k);
}

/** Smallest rotation angle [rad] between two orientations. */
export function angleBetween(q1, q2) {
  return rotationVector(errorQuaternion(q1, q2)).length();
}

/**
 * Build a quaternion from roll/pitch/yaw in degrees. Exact inverse of
 * Quaternion#toEulerDegrees (roll about X, pitch about Y, yaw about Z, applied Z-Y-X).
 */
export function fromEulerDegrees(rollDeg, pitchDeg, yawDeg) {
  const d2r = Math.PI / 180;
  const cr = Math.cos(rollDeg * d2r * 0.5), sr = Math.sin(rollDeg * d2r * 0.5);
  const cp = Math.cos(pitchDeg * d2r * 0.5), sp = Math.sin(pitchDeg * d2r * 0.5);
  const cy = Math.cos(yawDeg * d2r * 0.5), sy = Math.sin(yawDeg * d2r * 0.5);
  return new Quaternion(
    cr * cp * cy + sr * sp * sy,
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy
  ).normalize();
}

/**
 * Orientation that points a chosen BODY axis along a world direction, using a world-space
 * reference vector to fix the remaining roll about that axis.
 *
 * This is what "hold prograde / retrograde / nadir" autopilot targets are made of.
 *
 * @param {Vector3} bodyAxis      the body-frame axis to point (e.g. the +X engine axis)
 * @param {Vector3} dirWorld      desired world direction for that axis
 * @param {Vector3} [rollRef]     world vector the body's secondary axis should lean toward
 *                                (default: world +Z, falling back to +Y if parallel)
 * @returns {Quaternion} body->world quaternion
 */
export function quatPointingAxis(bodyAxis, dirWorld, rollRef = new Vector3(0, 0, 1)) {
  const f = dirWorld.clone().normalize();
  const bodyF = bodyAxis.clone().normalize();
  if (f.lengthSq() === 0 || bodyF.lengthSq() === 0) return new Quaternion(1, 0, 0, 0);

  // Pick the secondary body axis: the body axis least aligned with bodyF
  const candidates = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
  let bodyU = candidates[0];
  let best = Infinity;
  for (const c of candidates) {
    const a = Math.abs(c.dot(bodyF));
    if (a < best) { best = a; bodyU = c; }
  }
  // Orthonormal body frame (bodyF, bodyU', bodyS) with bodyU' perpendicular to bodyF
  const bodyUp = Vector3.subtract(bodyU, bodyF.clone().multiplyScalar(bodyU.dot(bodyF))).normalize();
  const bodyS = Vector3.cross(bodyF, bodyUp).normalize();

  // Matching world frame
  let ref = rollRef.clone();
  if (Math.abs(ref.clone().normalize().dot(f)) > 1 - 1e-9) {
    ref = Math.abs(f.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  }
  const worldUp = Vector3.subtract(ref, f.clone().multiplyScalar(ref.dot(f))).normalize();
  const worldS = Vector3.cross(f, worldUp).normalize();

  // R maps body (bodyF, bodyUp, bodyS) -> world (f, worldUp, worldS):
  // R = [f upW sW] * [bF bU bS]^T. Columns of R are R * e_i.
  const rotateBodyBasis = (e) => {
    const cf = e.dot(bodyF), cu = e.dot(bodyUp), cs = e.dot(bodyS);
    return new Vector3(
      f.x * cf + worldUp.x * cu + worldS.x * cs,
      f.y * cf + worldUp.y * cu + worldS.y * cs,
      f.z * cf + worldUp.z * cu + worldS.z * cs
    );
  };

  return quatFromBasis(
    rotateBodyBasis(new Vector3(1, 0, 0)),
    rotateBodyBasis(new Vector3(0, 1, 0)),
    rotateBodyBasis(new Vector3(0, 0, 1))
  );
}
