import { v3, mulberry32 } from './mathutil.js';

/**
 * Local-frame terrain (frame axes: x East, y Up, z South; plane passes through the origin).
 *
 * Supports a uniform slope plus spherical boulders resting on it. This is the
 * authoritative, deterministic terrain description; the Rapier backend builds
 * colliders from the same data so both backends see identical geometry.
 */
export class Terrain {
  /**
   * @param {object} [o]
   * @param {number} [o.slopeDeg=0]          ground slope angle
   * @param {number} [o.slopeAzimuthDeg=0]   uphill direction, measured from +x (East) toward +z (South)
   * @param {number} [o.friction=0.7]        Coulomb friction coefficient (regolith on metal pads)
   * @param {Array<{x:number,z:number,r:number}>} [o.boulders]  explicit boulders
   * @param {{count:number, radiusMin?:number, radiusMax?:number, halfWidthM?:number, clearRadiusM?:number, seed?:number}} [o.boulderField]
   *        procedural boulder field (deterministic for a given seed)
   */
  constructor(o = {}) {
    this.slopeDeg = Number(o.slopeDeg ?? 0);
    this.slopeAzimuthDeg = Number(o.slopeAzimuthDeg ?? 0);
    this.friction = Number(o.friction ?? 0.7);

    const th = (this.slopeDeg * Math.PI) / 180;
    const az = (this.slopeAzimuthDeg * Math.PI) / 180;
    // Plane height h(x,z) = tan(th) * (x cos az + z sin az); unit normal below
    this.normal = [-Math.sin(th) * Math.cos(az), Math.cos(th), -Math.sin(th) * Math.sin(az)];
    this._tan = Math.tan(th);
    this._az = az;

    this.boulders = [];
    for (const b of o.boulders || []) this._addBoulder(b.x, b.z, b.r);

    if (o.boulderField && o.boulderField.count > 0) {
      const f = o.boulderField;
      const rnd = mulberry32(f.seed ?? 1);
      const rMin = f.radiusMin ?? 0.3;
      const rMax = f.radiusMax ?? 1.2;
      const half = f.halfWidthM ?? 40;
      const clear = f.clearRadiusM ?? 0;
      let placed = 0;
      let guard = 0;
      while (placed < f.count && guard++ < f.count * 50) {
        const x = (rnd() * 2 - 1) * half;
        const z = (rnd() * 2 - 1) * half;
        const r = rMin + rnd() * (rMax - rMin);
        if (Math.hypot(x, z) < clear) continue;
        this._addBoulder(x, z, r);
        placed++;
      }
    }
  }

  heightAt(x, z) {
    return this._tan * (x * Math.cos(this._az) + z * Math.sin(this._az));
  }

  _addBoulder(x, z, r) {
    const base = [x, this.heightAt(x, z), z];
    // centre sits one radius off the plane along the normal => sphere is tangent to the ground
    const c = v3.add(base, v3.scale(this.normal, r));
    this.boulders.push({ c, r });
  }

  /**
   * All surfaces a probe sphere (radius `probe`, centre `p`) is penetrating.
   * @returns {Array<{depth:number, normal:number[], kind:string}>}
   */
  contactsFor(p, probe = 0) {
    const out = [];
    const planeDepth = probe - v3.dot(p, this.normal);
    if (planeDepth > 0) out.push({ depth: planeDepth, normal: this.normal, kind: 'ground' });

    for (const b of this.boulders) {
      const d = v3.sub(p, b.c);
      const dist = v3.len(d);
      const depth = b.r + probe - dist;
      if (depth > 0) {
        const n = dist > 1e-9 ? v3.scale(d, 1 / dist) : this.normal;
        out.push({ depth, normal: n, kind: 'boulder' });
      }
    }
    return out;
  }

  describe() {
    return {
      slopeDeg: this.slopeDeg,
      slopeAzimuthDeg: this.slopeAzimuthDeg,
      friction: this.friction,
      boulders: this.boulders.map((b) => ({ centre: b.c.slice(), radius: b.r }))
    };
  }
}
