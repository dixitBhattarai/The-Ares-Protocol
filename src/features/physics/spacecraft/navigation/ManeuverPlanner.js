import { CONSTANTS } from '../config/constants.js';

/**
 * Astrodynamics Orbital Maneuver & Mission Planning Engine:
 * - Hohmann Orbital Transfers between co-planar circular/near-circular orbits
 * - Oberth effect energetic gain calculation
 * - Planetary flyby gravity-assist turn angle calculation
 * - Tsiolkovsky propellant requirement calculations
 */
export class ManeuverPlanner {
  /**
   * Plans a Hohmann Transfer between two circular orbits of radius r1 and r2 around a central body
   * @param {number} r1 - Initial orbit radius [m]
   * @param {number} r2 - Target orbit radius [m]
   * @param {number} mu - Standard gravitational parameter of central body [m^3/s^2]
   * @param {number} spacecraftMassKg - Current total mass of spacecraft [kg]
   * @param {number} engineIspS - Engine specific impulse [s]
   */
  static planHohmannTransfer(r1, r2, mu, spacecraftMassKg = 10000, engineIspS = 320) {
    if (r1 <= 0 || r2 <= 0 || mu <= 0) {
      throw new Error("Invalid orbital radii or gravitational parameter for Hohmann transfer");
    }

    // Semi-major axis of transfer ellipse: at = (r1 + r2) / 2
    const aTransfer = (r1 + r2) / 2.0;

    // Initial and final circular orbit speeds
    const v1 = Math.sqrt(mu / r1);
    const v2 = Math.sqrt(mu / r2);

    // Speed at periapsis and apoapsis of transfer ellipse
    const vTransfer1 = Math.sqrt(mu * (2.0 / r1 - 1.0 / aTransfer));
    const vTransfer2 = Math.sqrt(mu * (2.0 / r2 - 1.0 / aTransfer));

    // Burns
    const deltaV1 = vTransfer1 - v1; // Departure burn (positive for raising, negative for lowering)
    const deltaV2 = v2 - vTransfer2; // Arrival burn

    const totalDeltaV = Math.abs(deltaV1) + Math.abs(deltaV2);

    // Transfer time: half the transfer ellipse period: t_transfer = pi * sqrt(at^3 / mu)
    const transferTimeSeconds = Math.PI * Math.sqrt(Math.pow(aTransfer, 3) / mu);

    // Propellant mass required using Tsiolkovsky equation:
    // m_prop = m0 * (1 - exp(-deltaV / (Isp * g0)))
    const effectiveVe = engineIspS * CONSTANTS.G0;
    const propMassBurn1 = spacecraftMassKg * (1.0 - Math.exp(-Math.abs(deltaV1) / effectiveVe));
    const massAfterBurn1 = spacecraftMassKg - propMassBurn1;
    const propMassBurn2 = massAfterBurn1 * (1.0 - Math.exp(-Math.abs(deltaV2) / effectiveVe));
    const totalPropellantRequiredKg = propMassBurn1 + propMassBurn2;

    return {
      rInitialM: r1,
      rTargetM: r2,
      semiMajorAxisTransferM: aTransfer,
      burn1: {
        deltaV_ms: deltaV1,
        type: deltaV1 >= 0 ? 'PROGRADE' : 'RETROGRADE',
        propellantRequiredKg: propMassBurn1
      },
      burn2: {
        deltaV_ms: deltaV2,
        type: deltaV2 >= 0 ? 'PROGRADE' : 'RETROGRADE',
        propellantRequiredKg: propMassBurn2
      },
      totalDeltaV_ms: totalDeltaV,
      totalPropellantRequiredKg,
      transferDurationSeconds: transferTimeSeconds,
      transferDurationHours: transferTimeSeconds / 3600.0,
      transferDurationDays: transferTimeSeconds / 86400.0
    };
  }

  /**
   * Calculates specific orbital energy increase from Oberth effect:
   * delta_epsilon = v . delta_v + 0.5 * |delta_v|^2
   */
  static computeOberthEnergyGain(vOrbital, deltaV) {
    return vOrbital * deltaV + 0.5 * (deltaV * deltaV);
  }

  /**
   * Gravity-assist hyperbolic flyby turn angle:
   * delta = 2 * asin( 1 / (1 + (r_p * v_inf^2) / mu) )
   * @param {number} periapsisRadius - Distance of closest approach [m]
   * @param {number} vInfinity - Hyperbolic excess speed relative to planet [m/s]
   * @param {number} mu - Planet standard gravitational parameter [m^3/s^2]
   */
  static computeFlybyTurnAngle(periapsisRadius, vInfinity, mu) {
    const denom = 1.0 + (periapsisRadius * vInfinity * vInfinity) / mu;
    const halfAngle = Math.asin(Math.min(1.0, 1.0 / denom));
    const turnAngleRad = 2.0 * halfAngle;
    return {
      turnAngleRad,
      turnAngleDeg: turnAngleRad * (180.0 / Math.PI)
    };
  }
}
