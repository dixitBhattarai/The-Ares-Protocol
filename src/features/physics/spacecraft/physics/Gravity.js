import { CONSTANTS, CELESTIAL_BODIES } from '../config/constants.js';
import { Vector3 } from '../math/Vector3.js';

/**
 * Astrodynamics Gravity Engine:
 * - Multi-body Newtonian gravitation
 * - Earth J2 oblateness harmonic perturbation
 * - Sphere of Influence (SOI) evaluation
 * - Lagrange Points (L1 - L5)
 */
export class Gravity {
  /**
   * Computes gravitational acceleration on a spacecraft from all active celestial bodies
   * @param {Vector3} spacecraftPos - Position in simulation coordinate frame
   * @param {Array<{body: Object, position: Vector3}>} bodiesWithPositions - Array of active celestial bodies and their coordinates
   * @param {boolean} includeJ2 - Whether to compute Earth J2 oblateness perturbation
   * @returns {Vector3} Total gravitational acceleration [m/s^2]
   */
  static computeAcceleration(spacecraftPos, bodiesWithPositions, includeJ2 = true) {
    const totalAcc = new Vector3(0, 0, 0);

    for (const item of bodiesWithPositions) {
      const body = item.body;
      const bodyPos = item.position;

      // Vector from body to spacecraft: r_rel = r_sc - r_body
      const rRel = Vector3.subtract(spacecraftPos, bodyPos);
      const distSq = rRel.lengthSq();
      const dist = Math.sqrt(distSq);

      if (dist < body.radius * 0.1) {
        // Deep collision/singularity protection
        continue;
      }

      // a = - (G * M / r^3) * r_rel
      const mu = body.mu || (CONSTANTS.G * body.mass);
      const accMagnitude = -mu / (distSq * dist);
      totalAcc.add(rRel.clone().multiplyScalar(accMagnitude));

      // Optional J2 perturbation for Earth
      if (includeJ2 && body.j2) {
        const j2Acc = this.computeJ2Perturbation(rRel, body.mu, body.radius, body.j2);
        totalAcc.add(j2Acc);
      }
    }

    return totalAcc;
  }

  /**
   * Fast path used by the integrator: acceleration of a craft at `pos` (relative to the body centre)
   * from a single central body, optionally with J2. Evaluated at every RK4 stage.
   */
  static centralAcceleration(pos, body, includeJ2 = true) {
    const rSq = pos.lengthSq();
    const r = Math.sqrt(rSq);
    if (r < body.radius * 0.1) return new Vector3(0, 0, 0);
    const k = -body.mu / (rSq * r);
    const acc = new Vector3(pos.x * k, pos.y * k, pos.z * k);
    if (includeJ2 && body.j2) {
      acc.add(this.computeJ2Perturbation(pos, body.mu, body.radius, body.j2));
    }
    return acc;
  }

  /**
   * Computes J2 oblateness acceleration vector (spin axis = +Z of the body-centred inertial frame)
   * a_J2 = (3/2 * J2 * mu * R_E^2 / r^5) * [ x(5z^2/r^2 - 1), y(5z^2/r^2 - 1), z(5z^2/r^2 - 3) ]
   */
  static computeJ2Perturbation(rRel, mu, radius, j2) {
    const rSq = rRel.lengthSq();
    const r = Math.sqrt(rSq);
    const r5 = rSq * rSq * r;

    const factor = (1.5 * j2 * mu * radius * radius) / r5;
    const z2_r2 = (rRel.z * rRel.z) / rSq;

    const ax = factor * rRel.x * (5 * z2_r2 - 1);
    const ay = factor * rRel.y * (5 * z2_r2 - 1);
    const az = factor * rRel.z * (5 * z2_r2 - 3);

    return new Vector3(ax, ay, az);
  }

  /**
   * Calculates Sphere of Influence (SOI) radius: r_soi = a * (m / M)^(2/5)
   */
  static computeSOI(semiMajorAxis, secondaryMass, primaryMass) {
    return semiMajorAxis * Math.pow(secondaryMass / primaryMass, 0.4);
  }

  /**
   * Calculates Circular Restricted Three-Body Problem (CR3BP) Lagrange points L1 - L5
   * @param {number} R - Distance between primary and secondary bodies [m]
   * @param {number} M1 - Mass of primary body [kg]
   * @param {number} M2 - Mass of secondary body [kg]
   */
  static computeLagrangePoints(R, M1, M2) {
    const mu = M2 / (M1 + M2);
    // Hill radius / L1/L2 distance from secondary
    const rL = R * Math.pow(mu / 3, 1 / 3);

    // Positions relative to barycenter along X-axis
    const x1 = -mu * R;
    const x2 = (1 - mu) * R;

    return {
      L1: { x: x2 - rL, y: 0, z: 0, description: 'Between Primary and Secondary' },
      L2: { x: x2 + rL, y: 0, z: 0, description: 'Beyond Secondary' },
      L3: { x: x1 - R, y: 0, z: 0, description: 'Opposite side of Primary' },
      L4: { x: (0.5 - mu) * R, y: R * Math.sqrt(3) / 2, z: 0, description: '60 deg leading' },
      L5: { x: (0.5 - mu) * R, y: -R * Math.sqrt(3) / 2, z: 0, description: '60 deg trailing' }
    };
  }
}
