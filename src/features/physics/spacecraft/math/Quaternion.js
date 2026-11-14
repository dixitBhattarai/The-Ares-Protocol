import { Vector3 } from './Vector3.js';

/**
 * Unit Quaternion [w, x, y, z] for 3D orientation without gimbal lock
 */
export class Quaternion {
  constructor(w = 1, x = 0, y = 0, z = 0) {
    this.w = Number(w);
    this.x = Number(x);
    this.y = Number(y);
    this.z = Number(z);
  }

  set(w, x, y, z) {
    this.w = Number(w);
    this.x = Number(x);
    this.y = Number(y);
    this.z = Number(z);
    return this;
  }

  identity() {
    this.w = 1;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
  }

  clone() {
    return new Quaternion(this.w, this.x, this.y, this.z);
  }

  copy(q) {
    this.w = q.w;
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    return this;
  }

  lengthSq() {
    return this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length() {
    return Math.sqrt(this.lengthSq());
  }

  normalize() {
    let l = this.length();
    if (l === 0) {
      this.w = 1;
      this.x = 0;
      this.y = 0;
      this.z = 0;
    } else {
      l = 1 / l;
      this.w *= l;
      this.x *= l;
      this.y *= l;
      this.z *= l;
    }
    return this;
  }

  conjugate() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  invert() {
    return this.conjugate().normalize();
  }

  /**
   * Hamilton product: this = this * q
   */
  multiply(q) {
    return this.multiplyQuaternions(this, q);
  }

  /**
   * Hamilton product: this = a * b
   */
  multiplyQuaternions(a, b) {
    const qaw = a.w, qax = a.x, qay = a.y, qaz = a.z;
    const qbw = b.w, qbx = b.x, qby = b.y, qbz = b.z;

    this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
    this.x = qaw * qbx + qax * qbw + qay * qbz - qaz * qby;
    this.y = qaw * qby - qax * qbz + qay * qbw + qaz * qbx;
    this.z = qaw * qbz + qax * qby - qay * qbx + qaz * qbw;

    return this;
  }

  static multiply(a, b) {
    return new Quaternion().multiplyQuaternions(a, b);
  }

  /**
   * Quaternion time derivative given angular velocity omega in body frame:
   * dq/dt = 0.5 * q * [0, omega]
   */
  derivative(omegaBody) {
    const qw = this.w, qx = this.x, qy = this.y, qz = this.z;
    const wx = omegaBody.x, wy = omegaBody.y, wz = omegaBody.z;

    return new Quaternion(
      0.5 * (-qx * wx - qy * wy - qz * wz),
      0.5 * ( qw * wx + qy * wz - qz * wy),
      0.5 * ( qw * wy - qx * wz + qz * wx),
      0.5 * ( qw * wz + qx * wy - qy * wx)
    );
  }

  /**
   * Rotates a vector from Body Frame to Inertial Frame: v_inertial = q * v_body * q^-1
   */
  rotateVector(v) {
    return v.clone().applyQuaternion(this);
  }

  /**
   * Rotates a vector from Inertial Frame to Body Frame: v_body = q^-1 * v_inertial * q
   */
  inverseRotateVector(v) {
    const inv = this.clone().conjugate();
    return v.clone().applyQuaternion(inv);
  }

  setFromAxisAngle(axis, angle) {
    const halfAngle = angle * 0.5;
    const s = Math.sin(halfAngle);
    const normAxis = axis.clone().normalize();

    this.w = Math.cos(halfAngle);
    this.x = normAxis.x * s;
    this.y = normAxis.y * s;
    this.z = normAxis.z * s;
    return this.normalize();
  }

  /**
   * Spherical Linear Interpolation (SLERP)
   */
  slerp(qb, t) {
    if (t === 0) return this;
    if (t === 1) return this.copy(qb);

    let cosHalfTheta = this.w * qb.w + this.x * qb.x + this.y * qb.y + this.z * qb.z;

    let targetW = qb.w, targetX = qb.x, targetY = qb.y, targetZ = qb.z;

    if (cosHalfTheta < 0) {
      targetW = -targetW;
      targetX = -targetX;
      targetY = -targetY;
      targetZ = -targetZ;
      cosHalfTheta = -cosHalfTheta;
    }

    if (cosHalfTheta >= 1.0) {
      return this;
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 0.001) {
      this.w = 0.5 * (this.w + targetW);
      this.x = 0.5 * (this.x + targetX);
      this.y = 0.5 * (this.y + targetY);
      this.z = 0.5 * (this.z + targetZ);
      return this.normalize();
    }

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    this.w = this.w * ratioA + targetW * ratioB;
    this.x = this.x * ratioA + targetX * ratioB;
    this.y = this.y * ratioA + targetY * ratioB;
    this.z = this.z * ratioA + targetZ * ratioB;

    return this.normalize();
  }

  /**
   * Convert to Euler angles [pitch, yaw, roll] in degrees for UI display
   */
  toEulerDegrees() {
    const qw = this.w, qx = this.x, qy = this.y, qz = this.z;

    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (qw * qx + qy * qz);
    const cosr_cosp = 1 - 2 * (qx * qx + qy * qy);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    // Pitch (y-axis rotation)
    const sinp = 2 * (qw * qy - qz * qx);
    let pitch;
    if (Math.abs(sinp) >= 1) {
      pitch = (Math.PI / 2) * Math.sign(sinp);
    } else {
      pitch = Math.asin(sinp);
    }

    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (qw * qz + qx * qy);
    const cosy_cosp = 1 - 2 * (qy * qy + qz * qz);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    const radToDeg = 180 / Math.PI;
    return {
      rollDeg: roll * radToDeg,
      pitchDeg: pitch * radToDeg,
      yawDeg: yaw * radToDeg
    };
  }


  /**
   * Builds a unit quaternion from an orthonormal right-handed basis given as the three COLUMNS of the
   * rotation matrix (i.e. where the local x, y, z axes point in the parent frame).
   */
  static fromBasis(ex, ey, ez) {
    const m00 = ex.x, m10 = ex.y, m20 = ex.z;
    const m01 = ey.x, m11 = ey.y, m21 = ey.z;
    const m02 = ez.x, m12 = ez.y, m22 = ez.z;
    const trace = m00 + m11 + m22;
    let w, x, y, z;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      w = 0.25 / s;
      x = (m21 - m12) * s;
      y = (m02 - m20) * s;
      z = (m10 - m01) * s;
    } else if (m00 > m11 && m00 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
      w = (m21 - m12) / s;
      x = 0.25 * s;
      y = (m01 + m10) / s;
      z = (m02 + m20) / s;
    } else if (m11 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
      w = (m02 - m20) / s;
      x = (m01 + m10) / s;
      y = 0.25 * s;
      z = (m12 + m21) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
      w = (m10 - m01) / s;
      x = (m02 + m20) / s;
      y = (m12 + m21) / s;
      z = 0.25 * s;
    }
    return new Quaternion(w, x, y, z).normalize();
  }

  /** Three.js ordering [x, y, z, w] (this class stores [w, x, y, z]) */
  toArrayXYZW() {
    return [this.x, this.y, this.z, this.w];
  }

  /** Angle [rad] of the shortest rotation taking this orientation to `q` */
  angleTo(q) {
    const d = Math.abs(this.w * q.w + this.x * q.x + this.y * q.y + this.z * q.z);
    return 2 * Math.acos(Math.min(1, d));
  }

  toArray() {
    return [this.w, this.x, this.y, this.z];
  }

  static fromArray(arr) {
    return new Quaternion(arr[0] ?? 1, arr[1] ?? 0, arr[2] ?? 0, arr[3] ?? 0);
  }
}
