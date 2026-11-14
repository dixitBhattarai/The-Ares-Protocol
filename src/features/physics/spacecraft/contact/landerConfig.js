/**
 * Default lander geometry for the contact world (body frame, metres).
 *
 * Convention matches the rest of the engine: the main engine thrusts along +X
 * and sits aft at x = -2.5, so +X is "up" for a vehicle standing on its legs and
 * the landing legs extend below the aft face (negative X).
 */
export const DEFAULT_LANDING_LIMITS = Object.freeze({
  maxVerticalSpeedMS: 2.0,
  maxHorizontalSpeedMS: 0.5,
  maxTiltDeg: 10.0,
  maxSlopeDeg: 15.0,
  maxImpactG: 4.0
});

export function defaultLanderConfig() {
  const x = -3.4;      // foot height below hull centre along body X
  const s = 2.2;       // lateral foot offset
  const stroke = 0.45; // crush stroke per leg [m]
  return {
    upAxisBody: [1, 0, 0],
    hullHalfExtents: [2.5, 1.5, 1.5],
    padRadiusM: 0.35,
    legs: [
      { id: 'leg_1', footBody: [x, s, s], strokeM: stroke },
      { id: 'leg_2', footBody: [x, s, -s], strokeM: stroke },
      { id: 'leg_3', footBody: [x, -s, s], strokeM: stroke },
      { id: 'leg_4', footBody: [x, -s, -s], strokeM: stroke }
    ],
    // Leg tuning. Crush plateau force is derived from the allowed impact load
    // (limits.maxImpactG) so the leg absorbs energy at that deceleration.
    crushAccelG: null,      // null => use limits.maxImpactG
    kneeDeflectionM: 0.03,  // elastic deflection at which the crush plateau starts
    dampingRatio: 0.35,
    hullOmegaRadS: 50,      // stiffness of hull-corner contacts expressed as a natural frequency
    frictionRate: 40        // viscous friction gain [1/s]; friction force saturates at mu * Fn
  };
}

/** Merge user overrides onto the defaults (shallow for scalars, replace for arrays). */
export function resolveLanderConfig(overrides = {}) {
  return { ...defaultLanderConfig(), ...overrides };
}
