import { CONSTANTS, CELESTIAL_BODIES } from '../config/constants.js';
import { Rng } from '../math/Rng.js';

/**
 * Space Radiation & Avionics Reliability System:
 * - Galactic Cosmic Rays (GCR)
 * - Trapped Radiation Belts (Earth Van Allen Inner and Outer Belts)
 * - Solar Particle Events (SPE - Coronal Mass Ejections and Solar Flares)
 * - Radiation Shielding Attenuation: D_shielded = D_unshielded * exp(-mu * x)
 * - Crew Cumulative Dose tracking (Sv) with NASA flight surgeon health limits
 * - Single-Event Upsets (SEU) and Electronics Bit-Flip Poisson Fault Generator
 */
export class RadiationSystem {
  constructor(config = {}) {
    this.rng = config.rng || new Rng(config.seed ?? 2);
    // Shielding configuration (Al-equivalent thickness)
    this.hullThicknessG_cm2 = config.hullThicknessG_cm2 ?? 10.0; // ~10 g/cm^2 standard spacecraft hull
    this.stormShelterActive = false;
    this.stormShelterThicknessG_cm2 = 30.0; // Water/polyethylene storm shelter

    // Cumulative dose counters [Sieverts (Sv)]
    this.crewCumulativeDoseSv = config.initialDoseSv ?? 0.002;
    this.electronicsCumulativeRad = config.initialRad ?? 150.0;

    // Avionics single event upsets
    this.electronicsHealthy = true;
    this.seuCount = 0;

    // Thresholds per spec
    this.limits = {
      safeMissionDoseSv: 0.5,
      elevatedRiskDoseSv: 1.0,
      missionLimitDoseSv: 1.5,
      acuteRateWarningSv_h: 0.05
    };

    this.warnings = [];
  }

  setStormShelter(active) {
    this.stormShelterActive = active;
  }

  /**
   * Evaluates environmental unshielded dose rate [Sv/s] based on spacecraft location and solar activity
   * @param {Vector3} rEarthRel - Position relative to Earth center [m]
   * @param {number} solarMultiplier - Multiplier from solar flares / CMEs (1.0 = quiet, up to 40.0)
   */
  computeEnvironmentalDoseRateSv_s(rEarthRel, solarMultiplier = 1.0) {
    // 1. Background Galactic Cosmic Rays (GCR): ~1.8e-8 Sv/s (~1.5 mSv/day)
    let envRate = 1.8e-8;

    // 2. Earth Van Allen Trapped Radiation Belts
    if (rEarthRel) {
      const dist = rEarthRel.length();
      const altitudeKm = (dist - CELESTIAL_BODIES.EARTH.radius) / 1000.0;

      if (altitudeKm > 800 && altitudeKm < 30000) {
        // Inner proton belt peak ~ 3000 km
        if (altitudeKm >= 1000 && altitudeKm <= 6000) {
          const innerPeak = Math.exp(-Math.pow((altitudeKm - 3000) / 1500, 2));
          envRate += innerPeak * 2.8e-5; // Up to ~0.1 Sv/hr in heart of proton belt
        }
        // Outer electron belt peak ~ 18000 km
        if (altitudeKm >= 12000 && altitudeKm <= 26000) {
          const outerPeak = Math.exp(-Math.pow((altitudeKm - 18000) / 4000, 2));
          envRate += outerPeak * 1.4e-5; // Up to ~0.05 Sv/hr
        }
      }
    }

    // 3. Solar Particle Event (SPE) flare multiplier
    if (solarMultiplier > 1.0) {
      envRate += 1.2e-6 * (solarMultiplier - 1.0); // Intense SPE proton storm
    }

    return envRate;
  }

  /**
   * Applies shielding attenuation: D_shielded = D_unshielded * exp(-mu * x)
   */
  applyShielding(unshieldedRateSv_s) {
    const mu = 0.05; // Mass attenuation coefficient for space radiation [cm^2/g]
    let thickness = this.hullThicknessG_cm2;
    if (this.stormShelterActive) {
      thickness += this.stormShelterThicknessG_cm2;
    }

    const shieldingFactor = Math.exp(-mu * thickness);
    return unshieldedRateSv_s * shieldingFactor;
  }

  /**
   * Update radiation dose and check for electronics Single Event Upsets
   * @param {number} dt - Timestep [s]
   * @param {Vector3} rEarthRel - Position relative to Earth [m]
   * @param {number} solarMultiplier - Solar storm multiplier
   */
  update(dt, rEarthRel, solarMultiplier = 1.0) {
    this.warnings = [];

    const unshieldedRateSv_s = this.computeEnvironmentalDoseRateSv_s(rEarthRel, solarMultiplier);
    const shieldedRateSv_s = this.applyShielding(unshieldedRateSv_s);

    // Dose accumulation
    const doseAccumulatedSv = shieldedRateSv_s * dt;
    this.crewCumulativeDoseSv += doseAccumulatedSv;
    this.electronicsCumulativeRad += doseAccumulatedSv * 100.0; // 1 Sv ~ 100 Rad

    // Rate warning (acute exposure)
    const rateSv_h = shieldedRateSv_s * 3600.0;
    if (rateSv_h > this.limits.acuteRateWarningSv_h) {
      this.warnings.push({
        level: 'WARNING',
        message: `HIGH RADIATION DOSE RATE: ${rateSv_h.toFixed(3)} Sv/h! Consider deploying storm shelter!`
      });
    }

    // Cumulative thresholds
    if (this.crewCumulativeDoseSv > this.limits.missionLimitDoseSv) {
      this.warnings.push({
        level: 'CRITICAL',
        message: `CREW RADIATION LIMIT EXCEEDED: ${this.crewCumulativeDoseSv.toFixed(3)} Sv cumulative! Radiation sickness imminent.`
      });
    } else if (this.crewCumulativeDoseSv > this.limits.elevatedRiskDoseSv) {
      this.warnings.push({
        level: 'WARNING',
        message: `CREW RADIATION RISK ELEVATED: ${this.crewCumulativeDoseSv.toFixed(3)} Sv cumulative.`
      });
    }

    // Single-Event Upsets (SEU) in Flight Avionics
    // Poisson rate: lambda = lambda0 * (rate / referenceRate)
    const refRate = 1.8e-8;
    const lambda0 = 1e-5; // Base probability per second
    const lambda = lambda0 * (shieldedRateSv_s / refRate);
    const probFault = 1 - Math.exp(-lambda * dt);

    let seuEvent = null;
    if (this.rng.next() < probFault) {
      this.seuCount++;
      seuEvent = 'SEU_BIT_FLIP';
      this.warnings.push({
        level: 'WARNING',
        message: `SINGLE-EVENT UPSET (SEU) DETECTED: Bit-flip in guidance computer memory parity bank!`
      });
    }

    return {
      unshieldedRateSv_s,
      shieldedRateSv_s,
      rateSv_h,
      crewCumulativeDoseSv: this.crewCumulativeDoseSv,
      stormShelterActive: this.stormShelterActive,
      seuCount: this.seuCount,
      lastSEU: seuEvent,
      warnings: this.warnings
    };
  }
}
