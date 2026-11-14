/**
 * Deterministic pseudo-random number generation.
 *
 * The simulation must be reproducible: same seed + same command sequence => same result.
 * Math.random() is therefore banned inside the physics core. Two tools are provided:
 *
 *  - Rng:        a stateful stream (mulberry32). Use for events whose draw order is fixed by the
 *                physics step (storms, micrometeoroids, single-event upsets).
 *  - hashNoise:  a *stateless* function of (seed, index, channel). Use for anything that may be
 *                evaluated a variable number of times (sensor noise in telemetry snapshots), so that
 *                reading telemetry can never change the physics.
 */
export class Rng {
  constructor(seed = 1) {
    this.seed = Rng.normalizeSeed(seed);
    this.state = this.seed;
    this._spare = null;
  }

  static normalizeSeed(seed) {
    if (typeof seed === 'string') return Rng.hashString(seed) || 1;
    const n = Number(seed);
    if (!Number.isFinite(n)) return 1;
    return (Math.floor(n) >>> 0) || 1;
  }

  /** FNV-1a 32-bit string hash */
  static hashString(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  reseed(seed) {
    this.seed = Rng.normalizeSeed(seed);
    this.state = this.seed;
    this._spare = null;
    return this;
  }

  /** Uniform float in [0, 1) */
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  int(maxExclusive) {
    return Math.floor(this.next() * maxExclusive);
  }

  /** Standard normal via Box-Muller */
  normal() {
    if (this._spare !== null) {
      const s = this._spare;
      this._spare = null;
      return s;
    }
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    this._spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  }

  /** Independent child stream derived from this seed and a label */
  fork(label) {
    return new Rng((this.seed ^ Rng.hashString(String(label))) >>> 0);
  }

  getState() {
    return { seed: this.seed, state: this.state, spare: this._spare };
  }

  setState(s) {
    this.seed = s.seed;
    this.state = s.state;
    this._spare = s.spare ?? null;
    return this;
  }
}

/**
 * Stateless uniform noise in [0, 1) from (seed, a, b, c). Pure function => deterministic regardless of
 * how many times or in what order it is called.
 */
export function hashNoise(seed, a = 0, b = 0, c = 0) {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ (b | 0), 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16) ^ (c | 0), 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** Stateless noise in (-0.5, 0.5) */
export function hashNoiseCentered(seed, a = 0, b = 0, c = 0) {
  return hashNoise(seed, a, b, c) - 0.5;
}
