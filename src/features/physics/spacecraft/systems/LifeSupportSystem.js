import { CONSTANTS } from '../config/constants.js';

/**
 * Environmental Control and Life Support System (ECLSS):
 * - Human metabolic consumption and waste generation
 * - Carbon dioxide scrubbing (LiOH / Regenerative Amine)
 * - Cabin atmospheric pressure and Dalton partial pressures (O2, CO2, N2)
 * - Cabin puncture and decompression leak physics
 * - Water recycling and food stores
 * - Crew health & hypoxia/hypercapnia monitoring
 */
export class LifeSupportSystem {
  constructor(config = {}) {
    this.crewCount = config.crewCount ?? 3;
    this.cabinVolumeM3 = config.cabinVolumeM3 ?? 55.0; // Typical crew module volume

    // Consumables storage [kg]
    this.oxygenStoreKg = config.oxygenStoreKg ?? 180.0;
    this.nitrogenStoreKg = config.nitrogenStoreKg ?? 250.0;
    this.waterStoreKg = config.waterStoreKg ?? 400.0;
    this.foodStoreKg = config.foodStoreKg ?? 150.0;

    // Cabin Gas Contents [moles]
    // Target 101.3 kPa at 294 K (21% O2, 78% N2, 0.05% CO2)
    const initialTempK = 294.0;
    const totalMoles = (CONSTANTS.STD_ATM_PRESSURE * this.cabinVolumeM3) / (CONSTANTS.GAS_CONSTANT_R * initialTempK);

    this.gasMoles = {
      O2: totalMoles * 0.21,
      N2: totalMoles * 0.785,
      CO2: totalMoles * 0.005,
      H2O: totalMoles * 0.005
    };

    // Scrubbers & Systems
    this.scrubberMode = 'active'; // 'active', 'low', 'off'
    this.scrubberEfficiency = 0.95;
    this.waterRecyclerEfficiency = 0.92;
    this.cabinLeakHoleAreaM2 = 0.0; // Hole area in case of micrometeoroid breach

    // Metabolic rates per person per day [kg/day]
    this.rates = {
      O2_per_person_day: 0.84,
      CO2_per_person_day: 1.04,
      water_per_person_day: 2.5,
      food_per_person_day: 1.2
    };

    this.crewHealth = 1.0;
    this.warnings = [];
  }

  setScrubberMode(mode) {
    this.scrubberMode = mode;
  }

  simulateHullBreach(holeAreaM2) {
    this.cabinLeakHoleAreaM2 = holeAreaM2;
  }

  /**
   * Update life support dynamics over timestep dt
   * @param {number} dt - Timestep [s]
   * @param {number} cabinTemperatureK - Current cabin thermal temperature [K]
   * @param {number} outsidePressurePa - Outside ambient pressure [Pa]
   */
  /** Runs one step and keeps the result so REST/telemetry report real computed values. */
  update(dt, cabinTemperatureK = 294.0, outsidePressurePa = 0.0) {
    this.lastStatus = this._step(dt, cabinTemperatureK, outsidePressurePa);
    return this.lastStatus;
  }

  _step(dt, cabinTemperatureK = 294.0, outsidePressurePa = 0.0) {
    this.warnings = [];
    const dtDays = dt / 86400.0;

    // 1. Crew Respiration & Metabolism
    const o2ConsumedKg = this.rates.O2_per_person_day * this.crewCount * dtDays;
    const co2ProducedKg = this.rates.CO2_per_person_day * this.crewCount * dtDays;
    const waterConsumedKg = this.rates.water_per_person_day * this.crewCount * dtDays;
    const foodConsumedKg = this.rates.food_per_person_day * this.crewCount * dtDays;

    // Convert kg to moles: n = m / M
    const o2MolesConsumed = o2ConsumedKg / CONSTANTS.MOLAR_MASS_O2;
    const co2MolesProduced = co2ProducedKg / CONSTANTS.MOLAR_MASS_CO2;

    this.gasMoles.O2 = Math.max(0, this.gasMoles.O2 - o2MolesConsumed);
    this.gasMoles.CO2 += co2MolesProduced;

    // Automatic O2 replenishment from high-pressure tanks
    const totalMolesNow = this.gasMoles.O2 + this.gasMoles.N2 + this.gasMoles.CO2;
    const o2Fraction = this.gasMoles.O2 / totalMolesNow;
    if (o2Fraction < 0.21 && this.oxygenStoreKg > 0.01) {
      const neededO2Moles = (0.21 * totalMolesNow) - this.gasMoles.O2;
      const neededO2Kg = neededO2Moles * CONSTANTS.MOLAR_MASS_O2;
      const injectedKg = Math.min(this.oxygenStoreKg, neededO2Kg);
      this.oxygenStoreKg -= injectedKg;
      this.gasMoles.O2 += injectedKg / CONSTANTS.MOLAR_MASS_O2;
    }

    // Nitrogen make-up: after a leak is sealed, restore total pressure from the nitrogen store
    {
      const molesNow = this.gasMoles.O2 + this.gasMoles.N2 + this.gasMoles.CO2;
      const pNowPa = (molesNow * CONSTANTS.GAS_CONSTANT_R * cabinTemperatureK) / this.cabinVolumeM3;
      if (this.cabinLeakHoleAreaM2 === 0 && pNowPa < 95000 && this.nitrogenStoreKg > 0.01) {
        const targetMoles = (CONSTANTS.STD_ATM_PRESSURE * this.cabinVolumeM3) / (CONSTANTS.GAS_CONSTANT_R * cabinTemperatureK);
        const wantKg = Math.max(0, targetMoles - molesNow) * CONSTANTS.MOLAR_MASS_N2;
        const injectKg = Math.min(this.nitrogenStoreKg, wantKg, 0.05 * dt); // valve-limited to 0.05 kg/s
        this.nitrogenStoreKg -= injectKg;
        this.gasMoles.N2 += injectKg / CONSTANTS.MOLAR_MASS_N2;
      }
    }

    // 2. CO2 Scrubbing
    if (this.scrubberMode !== 'off') {
      const scrubRateCoeff = this.scrubberMode === 'active' ? 1.5 : 0.8;
      const co2ScrubbedMoles = co2MolesProduced * this.scrubberEfficiency * scrubRateCoeff;
      this.gasMoles.CO2 = Math.max(0, this.gasMoles.CO2 - co2ScrubbedMoles);
    }

    // 3. Water & Food Depletion
    this.foodStoreKg = Math.max(0, this.foodStoreKg - foodConsumedKg);
    const unrecoveredWaterKg = waterConsumedKg * (1 - this.waterRecyclerEfficiency);
    this.waterStoreKg = Math.max(0, this.waterStoreKg - unrecoveredWaterKg);

    // Starvation and dehydration hurt the crew (they previously had no effect at all)
    if (this.foodStoreKg <= 0) {
      this.crewHealth = Math.max(0, this.crewHealth - 1.5e-6 * dt); // ~1 week to incapacitation
      this.warnings.push({ level: 'WARNING', message: 'FOOD STORES EXHAUSTED: crew is starving' });
    }
    if (this.waterStoreKg <= 0) {
      this.crewHealth = Math.max(0, this.crewHealth - 1e-5 * dt); // ~1 day
      this.warnings.push({ level: 'CRITICAL', message: 'WATER STORES EXHAUSTED: crew is dehydrating' });
    }

    // 4. Cabin Decompression Leak (if breach exists)
    const totalMoles = this.gasMoles.O2 + this.gasMoles.N2 + this.gasMoles.CO2;
    // Ideal gas law: P = n * R * T / V
    let cabinPressurePa = (totalMoles * CONSTANTS.GAS_CONSTANT_R * cabinTemperatureK) / this.cabinVolumeM3;

    if (this.cabinLeakHoleAreaM2 > 0 && cabinPressurePa > outsidePressurePa) {
      // Sonic orifice outflow approximation: dP/dt = - k * A * (P - P_ext)
      const kOrifice = 45.0; // Empirical decompression factor
      const dPressure = kOrifice * this.cabinLeakHoleAreaM2 * (cabinPressurePa - outsidePressurePa) * dt;
      cabinPressurePa = Math.max(outsidePressurePa, cabinPressurePa - dPressure);

      // Scale moles down proportionally
      const molesRemaining = (cabinPressurePa * this.cabinVolumeM3) / (CONSTANTS.GAS_CONSTANT_R * cabinTemperatureK);
      const ratio = molesRemaining / totalMoles;
      this.gasMoles.O2 *= ratio;
      this.gasMoles.N2 *= ratio;
      this.gasMoles.CO2 *= ratio;

      this.warnings.push({
        level: 'CRITICAL',
        message: `CABIN DECOMPRESSION LEAK DETECTED! Hole area: ${(this.cabinLeakHoleAreaM2 * 1e4).toFixed(1)} cm^2`
      });
    }

    // 5. Partial Pressures [Pa]
    const currentTotalMoles = Math.max(0.1, this.gasMoles.O2 + this.gasMoles.N2 + this.gasMoles.CO2);
    const pO2 = (this.gasMoles.O2 / currentTotalMoles) * cabinPressurePa;
    const pCO2 = (this.gasMoles.CO2 / currentTotalMoles) * cabinPressurePa;

    // 6. Medical / Physiological Evaluations
    // Hypoxia check: Normal pO2 ~ 21.0 kPa; Hypoxia below 16 kPa
    if (pO2 < 16000) {
      this.crewHealth = Math.max(0, this.crewHealth - 0.005 * dt);
      this.warnings.push({
        level: 'CRITICAL',
        message: `HYPOXIA WARNING: Cabin Oxygen Partial Pressure critically low: ${(pO2 / 1000).toFixed(1)} kPa`
      });
    }

    // Hypercapnia check: CO2 poisoning if pCO2 > 1.0 kPa
    if (pCO2 > 1000) {
      this.crewHealth = Math.max(0, this.crewHealth - 0.003 * dt);
      this.warnings.push({
        level: 'WARNING',
        message: `HYPERCAPNIA WARNING: Cabin CO2 concentration elevated: ${(pCO2 / 1000).toFixed(2)} kPa`
      });
    }

    // Cabin pressure limits
    if (cabinPressurePa < 70000) {
      this.warnings.push({
        level: 'CRITICAL',
        message: `CABIN DEPRESSURIZATION: Pressure at ${(cabinPressurePa / 1000).toFixed(1)} kPa (Nominal: 101.3 kPa)`
      });
    }

    return {
      cabinPressureKPa: cabinPressurePa / 1000.0,
      pO2_KPa: pO2 / 1000.0,
      pCO2_KPa: pCO2 / 1000.0,
      oxygenStoreKg: this.oxygenStoreKg,
      waterStoreKg: this.waterStoreKg,
      foodStoreKg: this.foodStoreKg,
      crewHealth: this.crewHealth,
      warnings: this.warnings
    };
  }
}
