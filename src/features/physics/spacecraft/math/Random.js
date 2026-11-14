/**
 * Deterministic seeded random number generation.
 *
 * Why this exists: the simulation must be replayable. Anything that rolls dice
 * (solar storms, micrometeoroids, single-event upsets, sensor noise, encounter
 * draws) has to draw from a seeded stream instead of Math.random(), otherwise
 * the same seed + the same command log can produce a different mission.
 *
 * Algorithm: mulberry32. For numeric seeds the sequence is bit-for-bit
 * identical to `mulberry32` in src/contact/mathutil.js, so both modules can be
 * driven from one seed.
 *
 * Usage:
 *   const root = new SeededRandom(12345);
 *   const radiationRng = root.fork('radiation');   // independent child stream
 *   if (radiationRng.chance(p)) { ... }
 *
 * fork(label) depends only on (root seed, label), NOT on how many numbers the
 * parent has already produced. Adding a new consumer of randomness therefore
 * never shifts the sequence another subsystem sees.
 */

/** FNV-1a 32-bit hash of a string. */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Normalise any seed input to a non-zero uint32.
 * Finite numbers keep the contact module's mapping: (n >>> 0) || 1.
 */
export function hashSeed(input) {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return (input >>> 0) || 1;
  }
  if (typeof input === 'bigint') {
    return (Number(input & 0xffffffffn) >>> 0) || 1;
  }
  if (input === undefined || input === null) return 1;
  return fnv1a(String(input)) || 1;
}

export class SeededRandom {
  /** @param {number|string|bigint} [seed=1] */
  constructor(seed = 1) {
    this.seed = hashSeed(seed);
    this._s = this.seed;
    this._spare = null; // cached second Box-Muller sample
  }

  /** Uniform float in [0, 1). */
  next() {
    this._s = (this._s + 0x6d2b79f5) >>> 0;
    let t = this._s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max). */
  float(min = 0, max = 1) {
    return min + (max - min) * this.next();
  }

  /** Uniform integer in [min, max], both inclusive. */
  int(min, max) {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    if (hi < lo) throw new RangeError(`SeededRandom.int: max (${max}) < min (${min})`);
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  /** True with probability p (clamped to [0, 1]). Always consumes one draw. */
  chance(p) {
    const u = this.next();
    return u < p;
  }

  /**
   * Did a Poisson event with the given rate [1/s] occur during dt [s]?
   * Exact for any dt: P = 1 - exp(-rate * dt).
   */
  poissonEvent(ratePerSecond, dtSeconds) {
    const rate = Number(ratePerSecond);
    const dt = Number(dtSeconds);
    if (!(rate > 0) || !(dt > 0)) {
      this.next(); // keep the stream position independent of the inputs
      return false;
    }
    return this.next() < 1 - Math.exp(-rate * dt);
  }

  /** Gaussian sample (Box-Muller, caches the spare so the stream stays reproducible). */
  normal(mean = 0, stdDev = 1) {
    if (this._spare !== null) {
      const z = this._spare;
      this._spare = null;
      return mean + stdDev * z;
    }
    let u1 = this.next();
    const u2 = this.next();
    if (u1 < 1e-300) u1 = 1e-300; // avoid log(0)
    const mag = Math.sqrt(-2 * Math.log(u1));
    const angle = 2 * Math.PI * u2;
    this._spare = mag * Math.sin(angle);
    return mean + stdDev * mag * Math.cos(angle);
  }

  /** Pick one element of a non-empty array. */
  pick(array) {
    if (!array || array.length === 0) throw new RangeError('SeededRandom.pick: empty array');
    return array[Math.floor(this.next() * array.length)];
  }

  /** In-place Fisher-Yates shuffle; returns the same array. */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  /**
   * Independent child stream keyed by label. Depends only on this generator's
   * ORIGINAL seed and the label, never on its current position.
   */
  fork(label) {
    return new SeededRandom(fnv1a(`${this.seed}:${label}`));
  }

  /** Snapshot for replay / save games. */
  getState() {
    return { seed: this.seed, s: this._s, spare: this._spare };
  }

  setState(state) {
    if (!state || !Number.isFinite(state.s)) throw new TypeError('SeededRandom.setState: invalid state');
    this.seed = state.seed >>> 0;
    this._s = state.s >>> 0;
    this._spare = state.spare ?? null;
    return this;
  }
}

/**
 * Default root seed used when nothing injects one. Keeping a fixed default
 * (instead of Math.random) is what makes a bare `new SimulationEngine()`
 * reproducible out of the box.
 */
export const DEFAULT_SEED = 0x5eed1e55;
