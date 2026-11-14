import { Vector3 } from '../math/Vector3.js';

/**
 * Atmospheric physics
 *  - Exponential density / pressure model
 *  - Velocity relative to the co-rotating atmosphere
 *  - Attitude-aware aerodynamics: drag AND lift depend on the angle of attack between the vehicle's
 *    heat-shield axis and the relative wind (an aligned vehicle produces no lift; a tilted one produces
 *    lift and extra drag - a real gameplay lever for entry guidance)
 *  - Parachute drag with a finite opening transient and dynamic-pressure limit
 *  - Sutton-Graves stagnation-point heat flux
 *
 * Axis convention: the heat shield faces body -X (the engine is aft at -X, so a vehicle that enters
 * "engine/shield first" has its velocity along -X). `shieldAxisInertial` is the unit vector from the
 * vehicle centre out through the shield.
 */
export class Atmosphere {
  static getDensity(body, altitude) {
    if (!body || !body.atmosphere || altitude < 0) return 0;
    if (altitude >= body.atmosphere.ceilingAltitude) return 0;
    const { seaLevelDensity, scaleHeight } = body.atmosphere;
    return seaLevelDensity * Math.exp(-altitude / scaleHeight);
  }

  static getPressure(body, altitude) {
    if (!body || !body.atmosphere || altitude < 0) return 0;
    if (altitude >= body.atmosphere.ceilingAltitude) return 0;
    const { seaLevelPressure, scaleHeight } = body.atmosphere;
    return seaLevelPressure * Math.exp(-altitude / scaleHeight);
  }

  /** Velocity of the co-rotating atmosphere at position r (body spins about +Z): Omega x r */
  static windVelocity(body, rBodyRel) {
    const omega = (2 * Math.PI) / (body.rotationPeriod || 86164);
    return new Vector3(-omega * rBodyRel.y, omega * rBodyRel.x, 0);
  }

  static empty(altitude, density = 0, ambientPressurePa = 0) {
    return {
      dragForce: new Vector3(0, 0, 0),
      liftForce: new Vector3(0, 0, 0),
      parachuteForce: new Vector3(0, 0, 0),
      totalForce: new Vector3(0, 0, 0),
      dynamicPressurePa: 0,
      heatFluxW_m2: 0,
      machNumber: 0,
      angleOfAttackDeg: 0,
      density,
      ambientPressurePa,
      relativeSpeed: 0,
      altitude
    };
  }

  /**
   * @param {Vector3} rBodyRel - position relative to body centre [m]
   * @param {Vector3} vInertial - velocity in the body-centred inertial frame [m/s]
   * @param {Object} body - celestial body
   * @param {Object} aero - { frontalAreaM2, sideAreaM2, cdFront, cdSide, noseRadiusM, heatCoeff,
   *                          crossSectionArea, dragCoeff } (legacy isotropic params also accepted)
   * @param {Object|null} parachute - { areaM2, cd } effective (already ramped) canopy, or null
   * @param {Vector3|null} shieldAxisInertial - unit vector out through the heat shield
   */
  static computeAero(rBodyRel, vInertial, body, aero, parachute = null, shieldAxisInertial = null) {
    const rMag = rBodyRel.length();
    const altitude = rMag - body.radius;

    if (!body.atmosphere || altitude >= body.atmosphere.ceilingAltitude || altitude <= 0) {
      return this.empty(altitude);
    }

    const density = this.getDensity(body, altitude);
    const ambientPressurePa = this.getPressure(body, altitude);

    const vRel = Vector3.subtract(vInertial, this.windVelocity(body, rBodyRel));
    const speed = vRel.length();
    if (speed < 1e-3) return this.empty(altitude, density, ambientPressurePa);

    const vHat = vRel.clone().multiplyScalar(1 / speed);
    const q = 0.5 * density * speed * speed;

    // ---- Vehicle body forces
    const dragForce = new Vector3(0, 0, 0);
    const liftForce = new Vector3(0, 0, 0);
    let alphaDeg = 0;

    if (shieldAxisInertial && aero.frontalAreaM2) {
      const s = shieldAxisInertial;
      const cosA = Math.max(-1, Math.min(1, s.dot(vHat)));
      const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      alphaDeg = Math.acos(cosA) * 180 / Math.PI;

      // Newtonian-style normal force on the face that leads: N = q A_f Cd cos^2(alpha) along -s (shield)
      // or +s (nose). Resolves to drag N*cos(a) and lift N*sin(a); L/D = tan(alpha).
      const face = cosA >= 0 ? 1 : -1;
      const nMag = q * aero.frontalAreaM2 * (aero.cdFront ?? 1.3) * cosA * cosA;
      const fFront = s.clone().multiplyScalar(-face * nMag);

      // Cross-flow drag on the side area
      const fSide = vHat.clone().multiplyScalar(-q * (aero.sideAreaM2 || 0) * (aero.cdSide ?? 1.0) * sinA * sinA * sinA);

      // Split the front force into drag (along -vHat) and lift (perpendicular)
      const dMag = -fFront.dot(vHat);
      dragForce.copy(vHat).multiplyScalar(-dMag).add(fSide);
      liftForce.copy(fFront).add(vHat.clone().multiplyScalar(dMag));
      liftForce.multiplyScalar(aero.liftScale ?? 1.0);
    } else {
      // Legacy isotropic drag
      const area = aero.crossSectionArea || 10.0;
      const cd = aero.dragCoeff || 0.8;
      dragForce.copy(vHat).multiplyScalar(-q * cd * area);
    }

    // ---- Parachute
    const parachuteForce = new Vector3(0, 0, 0);
    if (parachute && parachute.areaM2 > 0) {
      parachuteForce.copy(vHat).multiplyScalar(-q * (parachute.cd ?? 1.4) * parachute.areaM2);
    }

    const totalForce = Vector3.add(Vector3.add(dragForce, liftForce), parachuteForce);

    // ---- Stagnation-point heating (Sutton-Graves): q_s = k * sqrt(rho / Rn) * v^3
    const k = aero.heatCoeff ?? 1.7415e-4;
    const rn = Math.max(0.05, aero.noseRadiusM ?? 1.0);
    let heatFlux = k * Math.sqrt(density / rn) * speed * speed * speed;
    if (shieldAxisInertial) {
      // shield leading => full stagnation heating; trailing shield => only wake heating
      const c = shieldAxisInertial.dot(vHat);
      heatFlux *= c > 0 ? Math.max(0.1, c) : 0.1;
    }

    const speedOfSound = body.speedOfSoundMS || 240; // CO2 ~240 m/s (Mars), air ~340 m/s
    return {
      dragForce,
      liftForce,
      parachuteForce,
      totalForce,
      dynamicPressurePa: q,
      heatFluxW_m2: heatFlux,
      machNumber: speed / speedOfSound,
      angleOfAttackDeg: alphaDeg,
      density,
      ambientPressurePa,
      relativeSpeed: speed,
      altitude
    };
  }
}
