import { Vector3 } from '../math/Vector3.js';
import { CONSTANTS } from '../config/constants.js';

/**
 * Astrodynamics Keplerian Orbital Elements Calculator:
 * Computes all classical orbital parameters from state vector [r, v]
 */
export class OrbitalElements {
  /**
   * Calculates orbital elements given position and velocity relative to primary body center
   * @param {Vector3} rVec - Relative position vector [m]
   * @param {Vector3} vVec - Relative velocity vector [m/s]
   * @param {number} mu - Standard gravitational parameter of primary body [m^3/s^2]
   * @param {number} bodyRadiusM - Mean radius of primary body [m]
   */
  static calculate(rVec, vVec, mu, bodyRadiusM = 0) {
    const r = rVec.length();
    const v = vVec.length();

    if (r < 1e-3 || v < 1e-6 || !mu) {
      return null;
    }

    // 1. Specific orbital energy: epsilon = v^2/2 - mu/r
    const epsilon = (v * v) / 2.0 - mu / r;

    // 2. Specific angular momentum: h = r x v
    const hVec = Vector3.cross(rVec, vVec);
    const h = hVec.length();

    // 3. Eccentricity vector: e = (v x h)/mu - r/|r|
    const vxh = Vector3.cross(vVec, hVec);
    const eVec = new Vector3(
      vxh.x / mu - rVec.x / r,
      vxh.y / mu - rVec.y / r,
      vxh.z / mu - rVec.z / r
    );
    const eccentricity = eVec.length();

    // 4. Semi-major axis: a = -mu / (2 * epsilon)
    let semiMajorAxis = 0;
    let isBound = true;

    if (Math.abs(epsilon) > 1e-12) {
      semiMajorAxis = -mu / (2.0 * epsilon);
      isBound = epsilon < 0;
    } else {
      // Parabolic edge
      semiMajorAxis = Infinity;
      isBound = false;
    }

    // 5. Periapsis and Apoapsis
    let periapsisRadius = 0;
    let apoapsisRadius = 0;

    if (eccentricity < 1.0) {
      // Elliptical
      periapsisRadius = semiMajorAxis * (1.0 - eccentricity);
      apoapsisRadius = semiMajorAxis * (1.0 + eccentricity);
    } else {
      // Hyperbolic / Parabolic
      periapsisRadius = (h * h) / (mu * (1.0 + eccentricity));
      apoapsisRadius = Infinity;
    }

    const periapsisAltitude = periapsisRadius - bodyRadiusM;
    const apoapsisAltitude = apoapsisRadius === Infinity ? Infinity : (apoapsisRadius - bodyRadiusM);

    // 6. Orbital Period: T = 2 * pi * sqrt(a^3 / mu)
    let orbitalPeriodSeconds = null;
    if (isBound && semiMajorAxis > 0) {
      orbitalPeriodSeconds = 2.0 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
    }

    // 7. Inclination: i = acos(hz / |h|)
    const inclinationRad = Math.acos(Math.max(-1, Math.min(1, hVec.z / (h + 1e-15))));
    const inclinationDeg = inclinationRad * (180.0 / Math.PI);

    // 8. Longitude of Ascending Node (RAAN): Omega
    // Node vector: n = k x h = [-hy, hx, 0]
    const nVec = new Vector3(-hVec.y, hVec.x, 0);
    const n = nVec.length();
    let raanDeg = 0;
    if (n > 1e-9) {
      let raanRad = Math.acos(Math.max(-1, Math.min(1, nVec.x / n)));
      if (nVec.y < 0) raanRad = 2.0 * Math.PI - raanRad;
      raanDeg = raanRad * (180.0 / Math.PI);
    }

    // 9. Argument of Periapsis: omega
    let argPeriapsisDeg = 0;
    if (n > 1e-9 && eccentricity > 1e-6) {
      let argRad = Math.acos(Math.max(-1, Math.min(1, nVec.dot(eVec) / (n * eccentricity))));
      if (eVec.z < 0) argRad = 2.0 * Math.PI - argRad;
      argPeriapsisDeg = argRad * (180.0 / Math.PI);
    }

    // 10. True Anomaly: nu = acos( (e . r) / (e * r) )
    let trueAnomalyDeg = 0;
    if (eccentricity > 1e-6) {
      let nuRad = Math.acos(Math.max(-1, Math.min(1, eVec.dot(rVec) / (eccentricity * r))));
      if (rVec.dot(vVec) < 0) nuRad = 2.0 * Math.PI - nuRad;
      trueAnomalyDeg = nuRad * (180.0 / Math.PI);
    }

    // Circular and Escape Velocities at current radius
    const circularVelocity = Math.sqrt(mu / r);
    const escapeVelocity = Math.sqrt((2.0 * mu) / r);

    return {
      semiMajorAxis,
      eccentricity,
      inclinationDeg,
      raanDeg,
      argPeriapsisDeg,
      trueAnomalyDeg,
      periapsisRadius,
      apoapsisRadius,
      periapsisAltitude,
      apoapsisAltitude,
      orbitalPeriodSeconds,
      specificEnergy: epsilon,
      specificAngularMomentum: h,
      circularVelocity,
      escapeVelocity,
      currentAltitude: r - bodyRadiusM,
      currentSpeed: v,
      isBound
    };
  }
}
