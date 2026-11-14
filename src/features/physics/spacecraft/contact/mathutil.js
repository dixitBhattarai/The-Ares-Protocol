/**
 * Plain-array float64 math helpers for the contact module.
 *
 * Vectors are [x, y, z]; quaternions are [w, x, y, z] (Hamilton, body -> parent).
 * The contact module deliberately does not depend on the project's Vector3 /
 * Quaternion classes so that it keeps working while the rest of the engine is
 * being refactored. Boundary code accepts either arrays or {x,y,z}/{w,x,y,z}
 * objects (see toVec / toQuat).
 */

export const G_REF = 9.80665; // standard gravity [m/s^2], used only to express loads in g

export function toVec(v) {
  if (Array.isArray(v)) return [Number(v[0]), Number(v[1]), Number(v[2])];
  return [Number(v.x), Number(v.y), Number(v.z)];
}

export function toQuat(q) {
  if (Array.isArray(q)) return [Number(q[0]), Number(q[1]), Number(q[2]), Number(q[3])];
  return [Number(q.w), Number(q.x), Number(q.y), Number(q.z)];
}

export function isFiniteArray(a) {
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i])) return false;
  }
  return true;
}

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ],
  len: (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]),
  norm: (a) => {
    const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    return l > 1e-15 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
  },
  angleBetween: (a, b) => {
    const la = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    const lb = Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]);
    if (la < 1e-15 || lb < 1e-15) return 0;
    const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
    return Math.acos(Math.max(-1, Math.min(1, c)));
  }
};

export const quat = {
  identity: () => [1, 0, 0, 0],

  /** Hamilton product a * b (apply b first, then a). */
  mul(a, b) {
    return [
      a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
      a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
      a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
      a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]
    ];
  },

  conj: (a) => [a[0], -a[1], -a[2], -a[3]],

  normalize(a) {
    const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
    if (l < 1e-15) return [1, 0, 0, 0];
    return [a[0] / l, a[1] / l, a[2] / l, a[3] / l];
  },

  /** Rotate a vector from the quaternion's body frame into its parent frame. */
  rotate(q, v) {
    const w = q[0];
    const ux = q[1], uy = q[2], uz = q[3];
    // t = 2 * (u x v)
    const tx = 2 * (uy * v[2] - uz * v[1]);
    const ty = 2 * (uz * v[0] - ux * v[2]);
    const tz = 2 * (ux * v[1] - uy * v[0]);
    // v' = v + w * t + u x t
    return [
      v[0] + w * tx + (uy * tz - uz * ty),
      v[1] + w * ty + (uz * tx - ux * tz),
      v[2] + w * tz + (ux * ty - uy * tx)
    ];
  },

  /** Rotate a vector from the parent frame into the quaternion's body frame. */
  rotateInv(q, v) {
    return quat.rotate([q[0], -q[1], -q[2], -q[3]], v);
  },

  fromAxisAngle(axis, angle) {
    const n = v3.norm(axis);
    const s = Math.sin(angle / 2);
    return [Math.cos(angle / 2), n[0] * s, n[1] * s, n[2] * s];
  },

  /** Shortest-arc rotation taking unit vector a onto unit vector b. */
  fromTo(a, b) {
    const d = v3.dot(a, b);
    if (d > 1 - 1e-12) return [1, 0, 0, 0];
    if (d < -1 + 1e-12) {
      // 180 degrees: pick any axis perpendicular to a
      let axis = v3.cross([1, 0, 0], a);
      if (v3.len(axis) < 1e-6) axis = v3.cross([0, 1, 0], a);
      return quat.fromAxisAngle(axis, Math.PI);
    }
    const c = v3.cross(a, b);
    return quat.normalize([1 + d, c[0], c[1], c[2]]);
  },

  /**
   * Rotation matrix with columns ex, ey, ez (images of the body axes) -> quaternion.
   */
  fromBasis(ex, ey, ez) {
    const m00 = ex[0], m10 = ex[1], m20 = ex[2];
    const m01 = ey[0], m11 = ey[1], m21 = ey[2];
    const m02 = ez[0], m12 = ez[1], m22 = ez[2];
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
    return quat.normalize([w, x, y, z]);
  },

  /**
   * Advance orientation by a body-frame angular velocity over dt using the exact
   * incremental rotation (no linearisation error, always unit length).
   */
  integrateBody(q, wBody, dt) {
    const mag = Math.sqrt(wBody[0] * wBody[0] + wBody[1] * wBody[1] + wBody[2] * wBody[2]);
    const angle = mag * dt;
    if (angle < 1e-14) return q;
    const s = Math.sin(angle / 2) / mag;
    const dq = [Math.cos(angle / 2), wBody[0] * s, wBody[1] * s, wBody[2] * s];
    return quat.normalize(quat.mul(q, dq));
  }
};

/** Small deterministic PRNG (mulberry32). Same seed -> same sequence on every machine. */
export function mulberry32(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
