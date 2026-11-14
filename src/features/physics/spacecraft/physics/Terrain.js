import { Vector3 } from '../math/Vector3.js';
import { Rng, hashNoise } from '../math/Rng.js';

/**
 * Local site frame for surface operations (body-fixed, right-handed, Y-up, Three.js friendly):
 *   +X = east, +Y = up (local vertical), +Z = south.
 * Axes are given in the BODY-FIXED frame of the planet (which co-rotates with it).
 */
export class SiteFrame {
  constructor(upBF, spinAxis = new Vector3(0, 0, 1)) {
    this.up = upBF.clone().normalize();
    let east = Vector3.cross(spinAxis, this.up);
    if (east.lengthSq() < 1e-12) east = new Vector3(1, 0, 0); // at a pole
    this.east = east.normalize();
    const north = Vector3.cross(this.up, this.east).normalize();
    this.south = north.clone().multiplyScalar(-1);
    // right-handed check: east x up = south
  }

  /** local (x,y,z) -> body-fixed vector */
  toBF(v) {
    return new Vector3(
      this.east.x * v.x + this.up.x * v.y + this.south.x * v.z,
      this.east.y * v.x + this.up.y * v.y + this.south.y * v.z,
      this.east.z * v.x + this.up.z * v.y + this.south.z * v.z
    );
  }

  /** body-fixed vector -> local (x,y,z) */
  toLocal(v) {
    return new Vector3(v.dot(this.east), v.dot(this.up), v.dot(this.south));
  }
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise3(seed, x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = smoothstep(x - xi), fy = smoothstep(y - yi), fz = smoothstep(z - zi);
  const n = (a, b, c) => hashNoise(seed, xi + a, yi + b, zi + c);
  const x00 = n(0, 0, 0) * (1 - fx) + n(1, 0, 0) * fx;
  const x10 = n(0, 1, 0) * (1 - fx) + n(1, 1, 0) * fx;
  const x01 = n(0, 0, 1) * (1 - fx) + n(1, 0, 1) * fx;
  const x11 = n(0, 1, 1) * (1 - fx) + n(1, 1, 1) * fx;
  const y0 = x00 * (1 - fy) + x10 * fy;
  const y1 = x01 * (1 - fy) + x11 * fy;
  return y0 * (1 - fz) + y1 * fz;
}

/**
 * Deterministic procedural planetary terrain: height offset [m] above the reference sphere as a pure
 * function of the body-fixed surface point. Built from fractal value-noise plus bowl craters.
 * Because it is a pure function of absolute position, terrain stays identical when the local Rapier
 * patch is re-anchored elsewhere.
 */
export class Terrain {
  constructor(config = {}, bodyRadiusM = 1e6) {
    this.radiusM = bodyRadiusM;
    this.seed = Rng.hashString(config.seed || 'body');
    this.roughnessM = config.roughnessM ?? 3.0;
    this.wavelengthM = config.wavelengthM ?? 80;
    this.craterDensity = config.craterDensity ?? 0.5;
    this.craterCellM = 150;
  }

  /** Height offset [m] at a body-fixed point (projected onto the reference sphere) */
  heightAtBodyFixed(pBF) {
    const len = pBF.length() || 1;
    const k = this.radiusM / len;
    const x = pBF.x * k, y = pBF.y * k, z = pBF.z * k;

    // Fractal noise, 4 octaves, zero-mean
    let h = 0;
    let amp = this.roughnessM;
    let wl = this.wavelengthM;
    for (let o = 0; o < 4; o++) {
      h += amp * (valueNoise3(this.seed + o * 101, x / wl, y / wl, z / wl) - 0.5) * 2;
      amp *= 0.5;
      wl *= 0.5;
    }

    // Craters: one candidate per 3D cell, bowl with raised rim
    const C = this.craterCellM;
    const cx = Math.floor(x / C), cy = Math.floor(y / C), cz = Math.floor(z / C);
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        for (let c = -1; c <= 1; c++) {
          const ix = cx + a, iy = cy + b, iz = cz + c;
          if (hashNoise(this.seed, ix, iy, iz) > 0.35 * this.craterDensity) continue;
          const ox = (ix + hashNoise(this.seed + 1, ix, iy, iz)) * C;
          const oy = (iy + hashNoise(this.seed + 2, ix, iy, iz)) * C;
          const oz = (iz + hashNoise(this.seed + 3, ix, iy, iz)) * C;
          const radius = 15 + 45 * hashNoise(this.seed + 4, ix, iy, iz);
          const dx = x - ox, dy = y - oy, dz = z - oz;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d >= radius * 1.3) continue;
          const t = d / radius;
          const depth = 0.12 * radius;
          if (t < 1) h -= depth * (1 - t * t);
          else h += 0.25 * depth * (1 - (t - 1) / 0.3) * ((t - 1) / 0.3 < 1 ? 1 : 0);
        }
      }
    }
    return h;
  }

  /**
   * Sample a square patch in the local site frame. Heights are relative to the tangent plane at the
   * site origin (reference-sphere curvature drop included), row-major: heights[iz * n + ix] at
   * x = -half + ix*step, z = -half + iz*step.
   */
  samplePatch(frame, sizeM, n) {
    const half = sizeM / 2;
    const step = sizeM / (n - 1);
    const R = this.radiusM;
    const heights = new Float32Array(n * n);
    const p = new Vector3();
    for (let iz = 0; iz < n; iz++) {
      const z = -half + iz * step;
      for (let ix = 0; ix < n; ix++) {
        const x = -half + ix * step;
        p.copy(frame.up).multiplyScalar(R)
          .add(frame.east.clone().multiplyScalar(x))
          .add(frame.south.clone().multiplyScalar(z));
        const curvatureDrop = (x * x + z * z) / (2 * R);
        heights[iz * n + ix] = this.heightAtBodyFixed(p) - curvatureDrop;
      }
    }
    return { heights, n, sizeM, step, half };
  }
}

/** Bilinear height / slope queries on a sampled patch (same data the physics mesh is built from) */
export class PatchSampler {
  constructor(patch) {
    this.heights = patch.heights;
    this.n = patch.n;
    this.half = patch.half;
    this.step = patch.step;
  }

  heightAt(x, z) {
    const n = this.n;
    let u = (x + this.half) / this.step;
    let v = (z + this.half) / this.step;
    u = Math.max(0, Math.min(n - 1.000001, u));
    v = Math.max(0, Math.min(n - 1.000001, v));
    const i = Math.floor(u), j = Math.floor(v);
    const fu = u - i, fv = v - j;
    const h = this.heights;
    const h00 = h[j * n + i], h10 = h[j * n + i + 1];
    const h01 = h[(j + 1) * n + i], h11 = h[(j + 1) * n + i + 1];
    return (h00 * (1 - fu) + h10 * fu) * (1 - fv) + (h01 * (1 - fu) + h11 * fu) * fv;
  }

  /** Terrain slope angle [deg] at (x, z) from central differences over ~2 m */
  slopeDegAt(x, z, d = 1.5) {
    const dhdx = (this.heightAt(x + d, z) - this.heightAt(x - d, z)) / (2 * d);
    const dhdz = (this.heightAt(x, z + d) - this.heightAt(x, z - d)) / (2 * d);
    return Math.atan(Math.sqrt(dhdx * dhdx + dhdz * dhdz)) * 180 / Math.PI;
  }
}
