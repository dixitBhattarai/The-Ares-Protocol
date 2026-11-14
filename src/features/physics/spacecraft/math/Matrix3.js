import { Vector3 } from './Vector3.js';

/**
 * 3x3 Matrix for Inertia Tensors and Coordinate Transformations
 * Row-major storage:
 * [ m00, m01, m02 ]
 * [ m10, m11, m12 ]
 * [ m20, m21, m22 ]
 */
export class Matrix3 {
  constructor(
    m00 = 1, m01 = 0, m02 = 0,
    m10 = 0, m11 = 1, m12 = 0,
    m20 = 0, m21 = 0, m22 = 1
  ) {
    this.elements = [
      m00, m01, m02,
      m10, m11, m12,
      m20, m21, m22
    ];
  }

  setDiagonal(ixx, iyy, izz) {
    this.elements[0] = ixx; this.elements[1] = 0;   this.elements[2] = 0;
    this.elements[3] = 0;   this.elements[4] = iyy; this.elements[5] = 0;
    this.elements[6] = 0;   this.elements[7] = 0;   this.elements[8] = izz;
    return this;
  }

  clone() {
    const m = new Matrix3();
    m.elements = [...this.elements];
    return m;
  }

  multiplyVector(v) {
    const e = this.elements;
    return new Vector3(
      e[0] * v.x + e[1] * v.y + e[2] * v.z,
      e[3] * v.x + e[4] * v.y + e[5] * v.z,
      e[6] * v.x + e[7] * v.y + e[8] * v.z
    );
  }

  determinant() {
    const e = this.elements;
    const a = e[0], b = e[1], c = e[2];
    const d = e[3], f = e[4], g = e[5];
    const h = e[6], i = e[7], j = e[8];

    return a * (f * j - g * i) - b * (d * j - g * h) + c * (d * i - f * h);
  }

  invert() {
    const e = this.elements;
    const a = e[0], b = e[1], c = e[2];
    const d = e[3], f = e[4], g = e[5];
    const h = e[6], i = e[7], j = e[8];

    const det = this.determinant();
    if (Math.abs(det) < 1e-15) {
      throw new Error("Matrix3 is singular and cannot be inverted");
    }

    const invDet = 1.0 / det;

    this.elements[0] =  (f * j - g * i) * invDet;
    this.elements[1] = -(b * j - c * i) * invDet;
    this.elements[2] =  (b * g - c * f) * invDet;

    this.elements[3] = -(d * j - g * h) * invDet;
    this.elements[4] =  (a * j - c * h) * invDet;
    this.elements[5] = -(a * g - c * d) * invDet;

    this.elements[6] =  (d * i - f * h) * invDet;
    this.elements[7] = -(a * i - b * h) * invDet;
    this.elements[8] =  (a * f - b * d) * invDet;

    return this;
  }

  inverse() {
    return this.clone().invert();
  }

  transpose() {
    const e = this.elements;
    const m01 = e[1], m02 = e[2], m12 = e[5];
    e[1] = e[3]; e[2] = e[6];
    e[3] = m01; e[5] = e[7];
    e[6] = m02; e[7] = m12;
    return this;
  }

  toArray() {
    return [
      [this.elements[0], this.elements[1], this.elements[2]],
      [this.elements[3], this.elements[4], this.elements[5]],
      [this.elements[6], this.elements[7], this.elements[8]]
    ];
  }

  static fromArray(arr) {
    if (Array.isArray(arr[0])) {
      return new Matrix3(
        arr[0][0], arr[0][1], arr[0][2],
        arr[1][0], arr[1][1], arr[1][2],
        arr[2][0], arr[2][1], arr[2][2]
      );
    }
    return new Matrix3(...arr);
  }
}
