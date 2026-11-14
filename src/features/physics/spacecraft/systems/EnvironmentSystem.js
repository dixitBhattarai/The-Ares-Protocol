import { Vector3 } from '../math/Vector3.js';
import { CONSTANTS, CELESTIAL_BODIES } from '../config/constants.js';
import { Rng } from '../math/Rng.js';

/**
 * Solar System Environment & Space Weather Engine:
 * - Keplerian planetary ephemerides (Sun, Earth, Moon, Mars)
 * - Planetary axial rotation & day/night terminator angles
 * - Planetary cylindrical shadow (eclipse) detection
 * - Solar Activity Markov State Machine (Quiet, Elevated, Storm, Extreme Storm)
 * - Space debris and micrometeoroid stochastic impact generator
 */
export class EnvironmentSystem {
  constructor(config = {}) {
    this.rng = config.rng || new Rng(config.seed ?? 1);
    // Solar storm state machine per spec Section 14.6
    this.solarState = 'quiet'; // 'quiet', 'elevated', 'solar_storm', 'extreme_storm'
    this.solarStormRemainingSeconds = 0;

    this.solarMultipliers = {
      quiet: 1.0,
      elevated: 2.0,
      solar_storm: 10.0,
      extreme_storm: 40.0
    };

    // Probabilities per hour of entering storm
    this.stormTransitions = {
      quiet: { next: 'elevated', probPerHour: 0.015 },
      elevated: { next: 'solar_storm', probPerHour: 0.05 },
      solar_storm: { next: 'extreme_storm', probPerHour: 0.02 }
    };

    // Debris flux
    this.debrisFluxAreaFactor = config.debrisAreaM2 || 20.0;
    this.baseDebrisLambda = 1.0e-7; // Hits per second per m^2 in LEO
  }

  /**
   * Evaluates heliocentric positions and velocities for Sun, Earth, Moon, and Mars at simulation time t
   */
  getPlanetaryStates(simTimeSeconds) {
    // Sun at origin
    const sunPos = new Vector3(0, 0, 0);
    const sunVel = new Vector3(0, 0, 0);

    // Earth orbit around Sun
    const earthOmega = (2 * Math.PI) / CELESTIAL_BODIES.EARTH.orbitPeriod;
    const earthAngle = earthOmega * simTimeSeconds;
    const earthR = CELESTIAL_BODIES.EARTH.orbitSemiMajorAxis;
    const earthPos = new Vector3(
      earthR * Math.cos(earthAngle),
      earthR * Math.sin(earthAngle),
      0
    );
    const earthVel = new Vector3(
      -CELESTIAL_BODIES.EARTH.orbitSpeed * Math.sin(earthAngle),
      CELESTIAL_BODIES.EARTH.orbitSpeed * Math.cos(earthAngle),
      0
    );

    // Moon orbit around Earth
    const moonOmega = (2 * Math.PI) / CELESTIAL_BODIES.MOON.orbitPeriod;
    const moonAngle = moonOmega * simTimeSeconds;
    const moonR = CELESTIAL_BODIES.MOON.orbitDistance;
    const moonRelPos = new Vector3(
      moonR * Math.cos(moonAngle),
      moonR * Math.sin(moonAngle),
      0
    );
    const moonRelVel = new Vector3(
      -CELESTIAL_BODIES.MOON.orbitSpeed * Math.sin(moonAngle),
      CELESTIAL_BODIES.MOON.orbitSpeed * Math.cos(moonAngle),
      0
    );
    const moonPos = Vector3.add(earthPos, moonRelPos);
    const moonVel = Vector3.add(earthVel, moonRelVel);

    // Mars orbit around Sun
    const marsOmega = (2 * Math.PI) / CELESTIAL_BODIES.MARS.orbitPeriod;
    const marsAngle = marsOmega * simTimeSeconds + 0.5; // Phase offset
    const marsR = CELESTIAL_BODIES.MARS.orbitSemiMajorAxis;
    const marsPos = new Vector3(
      marsR * Math.cos(marsAngle),
      marsR * Math.sin(marsAngle),
      0
    );
    const marsVel = new Vector3(
      -CELESTIAL_BODIES.MARS.orbitSpeed * Math.sin(marsAngle),
      CELESTIAL_BODIES.MARS.orbitSpeed * Math.cos(marsAngle),
      0
    );

    // Rotational angles
    const earthSpin = (2 * Math.PI / CELESTIAL_BODIES.EARTH.rotationPeriod) * simTimeSeconds;
    const marsSpin = (2 * Math.PI / CELESTIAL_BODIES.MARS.rotationPeriod) * simTimeSeconds;

    return {
      sun: { body: CELESTIAL_BODIES.SUN, position: sunPos, velocity: sunVel },
      earth: { body: CELESTIAL_BODIES.EARTH, position: earthPos, velocity: earthVel, spinAngleRad: earthSpin },
      moon: { body: CELESTIAL_BODIES.MOON, position: moonPos, velocity: moonVel, relPosToEarth: moonRelPos },
      mars: { body: CELESTIAL_BODIES.MARS, position: marsPos, velocity: marsVel, spinAngleRad: marsSpin }
    };
  }


  /** Heliocentric position of a named body ('sun','earth','moon','mars') at simulation time t */
  getBodyHeliocentricPosition(bodyId, simTimeSeconds) {
    if (bodyId === 'sun') return new Vector3(0, 0, 0);
    const st = this.getPlanetaryStates(simTimeSeconds);
    return (st[bodyId] || st.sun).position.clone();
  }

  /**
   * Sun / Earth geometry as seen from a craft located at `posLocal` relative to the primary body.
   * All vectors are expressed in the body-centred inertial frame (same axes as heliocentric).
   */
  getSolarGeometry(primaryBodyId, posLocal, simTimeSeconds, states = null) {
    const st = states || this.getPlanetaryStates(simTimeSeconds);
    const primaryHelio = primaryBodyId === 'sun' ? new Vector3(0, 0, 0) : (st[primaryBodyId] || st.sun).position;
    const craftHelio = Vector3.add(primaryHelio, posLocal);
    const sunDist = Math.max(1, craftHelio.length());
    const sunDir = craftHelio.clone().multiplyScalar(-1 / sunDist); // craft -> sun
    const earthRel = Vector3.subtract(st.earth.position, primaryHelio); // Earth relative to primary
    return { primaryHelio, craftHelio, sunDist, sunDir, earthRel, states: st };
  }

  /**
   * Tests if spacecraft is in planetary shadow (eclipse)
   * Cylinder shadow model. `bodyPos` MUST be the body's HELIOCENTRIC position (Sun at origin) and
   * `posSpacecraft` the craft position relative to that body.
   */
  checkEclipse(posSpacecraft, bodyPos, bodyRadius) {
    const scRel = Vector3.subtract(posSpacecraft, bodyPos);
    // Sun is at (0,0,0), so sun direction from body is -bodyPos
    const sunDir = bodyPos.clone().multiplyScalar(-1).normalize();

    // Projection of spacecraft behind planet (along anti-sun direction)
    const antiSunDir = sunDir.clone().multiplyScalar(-1);
    const proj = scRel.dot(antiSunDir);

    if (proj <= 0) {
      // Craft is on sunward day side of planet
      return false;
    }

    // Perpendicular distance from shadow axis
    const projVec = antiSunDir.multiplyScalar(proj);
    const perpDist = Vector3.subtract(scRel, projVec).length();

    return perpDist < bodyRadius;
  }

  /**
   * Advances space weather state machine and checks for debris impacts
   */
  update(dt, simTimeSeconds, posSpacecraft, currentPrimaryBody) {
    // 1. Solar Storm State Machine
    if (this.solarStormRemainingSeconds > 0) {
      this.solarStormRemainingSeconds -= dt;
      if (this.solarStormRemainingSeconds <= 0) {
        this.solarState = 'quiet';
      }
    } else {
      const dtHours = dt / 3600.0;
      if (this.solarState === 'quiet') {
        if (this.rng.next() < this.stormTransitions.quiet.probPerHour * dtHours) {
          this.solarState = 'elevated';
          this.solarStormRemainingSeconds = 7200; // 2 hours
        }
      } else if (this.solarState === 'elevated') {
        if (this.rng.next() < this.stormTransitions.elevated.probPerHour * dtHours) {
          this.solarState = 'solar_storm';
          this.solarStormRemainingSeconds = 14400; // 4 hours
        }
      } else if (this.solarState === 'solar_storm') {
        if (this.rng.next() < this.stormTransitions.solar_storm.probPerHour * dtHours) {
          this.solarState = 'extreme_storm';
          this.solarStormRemainingSeconds = 21600; // 6 hours
        }
      }
    }

    // 2. Micrometeoroid / Space Debris Stochastic Impact
    // In LEO (altitude < 2000 km above Earth), debris flux is higher
    let fluxMultiplier = 1.0;
    if (currentPrimaryBody && currentPrimaryBody.id === 'earth') {
      const altKm = (posSpacecraft.length() - currentPrimaryBody.radius) / 1000.0;
      if (altKm > 200 && altKm < 1500) {
        fluxMultiplier = 10.0; // Higher debris density in LEO
      }
    }

    const probImpact = 1 - Math.exp(-this.baseDebrisLambda * fluxMultiplier * this.debrisFluxAreaFactor * dt);
    let micrometeoroidHit = null;
    if (this.rng.next() < probImpact) {
      // Hit occurred!
      const massGrams = 0.05 + this.rng.next() * 0.5; // 0.05g - 0.55g
      const speedKmS = 12.0 + this.rng.next() * 8.0;   // 12 - 20 km/s relative speed
      micrometeoroidHit = {
        massGrams,
        speedKmS,
        kineticEnergyJoules: 0.5 * (massGrams * 1e-3) * Math.pow(speedKmS * 1e3, 2)
      };
    }

    return {
      solarState: this.solarState,
      solarMultiplier: this.solarMultipliers[this.solarState],
      stormRemainingMinutes: Math.max(0, Math.round(this.solarStormRemainingSeconds / 60)),
      micrometeoroidHit
    };
  }
}
