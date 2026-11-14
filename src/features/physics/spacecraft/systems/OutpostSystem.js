import { CONSTANTS } from '../config/constants.js';

/**
 * Mars Outpost Engineering & Life Support Simulation System:
 * Models surface base survival grounded in NASA Mars exploration science.
 *
 * Implements the 5 core whiteboard mechanics with dual-terminology:
 * 1. Sun Storm (Solar Flare / CME) -> Flash orange, bunker / shield requirement
 * 2. Mars Dirt (Regolith) -> Shoveled onto habitat dome for free radiation armor
 * 3. Poison Dust (Perchlorates) -> Washed with water before planting food in it
 * 4. Water Farm (Hydroponics) -> Produces food & scrubs CO2, dies quickly without power
 * 5. Warm Rock Battery (RTG) -> Guarantees continuous base power through night and dust storms
 */
export class OutpostSystem {
  constructor(config = {}) {
    this.crewCount = config.crewCount ?? 4;
    this.sol = 1;                    // Martian Sol (1 sol = 24h 39m 35s = 88775 seconds)
    this.solTimeOfDay = 0.35;        // 0.0 (midnight) to 1.0 (midnight next sol); 0.5 is solar noon
    this.solDurationSeconds = 88775;

    // Environmental state (Jezero Crater base)
    this.ambientTempK = 210;         // ~ -63 C
    this.ambientPressurePa = 610;    // Mars surface pressure
    this.dustOpticalDepthTau = 0.38; // 0.35 = clear, > 3.0 = global dust storm
    this.isDustStorm = false;
    this.sunStormActive = false;     // CME / Solar Flare
    this.sunStormIntensity = 0.0;    // Multiplier on radiation

    // Habitat Dome & Shielding
    this.roofArmorCm = config.roofArmorCm ?? 0.0; // Mars dirt regolith depth on roof
    this.bunkerActive = false;                    // Crew inside storm shelter
    this.activeShieldEngaged = false;             // Power-hungry magnetic/plasma shield

    // Power Grid
    this.solarPanelsKw = config.solarPanelsKw ?? 4.0;
    this.solarPanelDustFactor = 1.0;              // 1.0 = clean, drops as dust settles
    this.warmRockBatteries = config.warmRockBatteries ?? 1; // RTGs (1.2 kW continuous each)
    this.batteryCapacityKwh = config.batteryCapacityKwh ?? 30.0;
    this.batteryStoredKwh = config.batteryStoredKwh ?? 24.0;
    this.currentPowerGenerationKw = 0.0;
    this.currentPowerConsumptionKw = 0.0;

    // Life Support & Consumables
    this.oxygenStoreKg = config.oxygenStoreKg ?? 250.0;
    this.carbonDioxideKg = 0.0;
    this.waterStoreKg = config.waterStoreKg ?? 800.0;
    this.foodStoreKg = config.foodStoreKg ?? 300.0;

    // Soil & Agriculture
    this.marsDirtKg = config.marsDirtKg ?? 200.0;       // Raw regolith
    this.cleanedSoilKg = config.cleanedSoilKg ?? 0.0;   // Washed perchlorate-free arable soil
    this.waterFarms = config.waterFarms ?? 1;           // Hydroponics units
    this.farmHealth = 1.0;                              // 1.0 = flourishing, 0.0 = wilted/dead
    this.farmUnpoweredSeconds = 0.0;

    // Crew Vitals & Radiation
    this.crewHealthPercent = 100.0;
    this.crewCumulativeDoseSv = 0.0;
    this.dailyDoseRateSv = 0.001; // ~1 mSv/day baseline

    // Recent events log
    this.eventLog = [];
  }

  /**
   * Advances the Mars Outpost simulation by dt seconds
   */
  update(dt) {
    const dtSols = dt / this.solDurationSeconds;
    this.solTimeOfDay = (this.solTimeOfDay + dtSols) % 1.0;
    if (this.solTimeOfDay < dtSols) {
      this.sol += 1;
      this.logEvent('INFO', `Sol ${this.sol} dawn has arrived at Jezero Outpost.`);
    }

    // 1. Calculate Solar Insolation & Day/Night Cycle
    // Martian day: sun above horizon between 0.25 and 0.75
    let sunElevation = 0;
    if (this.solTimeOfDay >= 0.25 && this.solTimeOfDay <= 0.75) {
      sunElevation = Math.sin(((this.solTimeOfDay - 0.25) / 0.5) * Math.PI);
    }

    // Dust attenuation: Beer-Lambert law I = I0 * exp(-tau / sin(theta))
    const effectiveTau = this.isDustStorm ? Math.max(2.5, this.dustOpticalDepthTau) : this.dustOpticalDepthTau;
    const dustAtmosphereTransmission = Math.exp(-effectiveTau / Math.max(0.2, sunElevation));

    // Mars solar constant ~ 590 W/m2 at 1.52 AU
    const surfaceInsolationKwM2 = 0.590 * sunElevation * dustAtmosphereTransmission;

    // Solar generation
    const solarGenKw = this.solarPanelsKw * (surfaceInsolationKwM2 / 0.590) * this.solarPanelDustFactor;

    // Warm Rock Battery (RTG) produces guaranteed continuous power unaffected by night or dust!
    const rtgGenKw = this.warmRockBatteries * 1.2;

    this.currentPowerGenerationKw = Math.max(0, solarGenKw) + rtgGenKw;

    // Dust accumulation over time
    if (this.isDustStorm) {
      this.solarPanelDustFactor = Math.max(0.1, this.solarPanelDustFactor - 0.00005 * dt);
    } else {
      this.solarPanelDustFactor = Math.max(0.4, this.solarPanelDustFactor - 0.000005 * dt);
    }

    // 2. Base Power Consumption
    let powerDrawKw = 0.8; // Baseline habitat life support, computers, heating

    if (this.activeShieldEngaged) {
      powerDrawKw += 2.5; // High power draw for active electromagnetic radiation deflector
    }

    // Water farm power requirement (0.5 kW per farm)
    const farmPowerNeededKw = this.waterFarms * 0.5;
    let farmPowered = false;

    if (this.currentPowerGenerationKw + (this.batteryStoredKwh / (dt / 3600)) >= powerDrawKw + farmPowerNeededKw) {
      powerDrawKw += farmPowerNeededKw;
      farmPowered = true;
    }

    this.currentPowerConsumptionKw = powerDrawKw;

    // Power balance & battery charge/discharge
    const netPowerKw = this.currentPowerGenerationKw - this.currentPowerConsumptionKw;
    const netEnergyKwh = netPowerKw * (dt / 3600);
    this.batteryStoredKwh = Math.max(0, Math.min(this.batteryCapacityKwh, this.batteryStoredKwh + netEnergyKwh));

    // 3. Water Farm (Hydroponics) Dynamics
    if (farmPowered && this.waterFarms > 0) {
      this.farmUnpoweredSeconds = Math.max(0, this.farmUnpoweredSeconds - dt * 2);
      this.farmHealth = Math.min(1.0, this.farmHealth + 0.00001 * dt);

      // Produces food and recycles CO2 into O2
      const foodProducedKg = (0.8 / this.solDurationSeconds) * dt * this.waterFarms * this.farmHealth;
      const o2ProducedKg = (1.0 / this.solDurationSeconds) * dt * this.waterFarms * this.farmHealth;

      this.foodStoreKg += foodProducedKg;
      this.oxygenStoreKg += o2ProducedKg;
    } else if (this.waterFarms > 0) {
      this.farmUnpoweredSeconds += dt;
      // If unpowered for > 12 hours (43200s), crops begin dying
      if (this.farmUnpoweredSeconds > 43200) {
        this.farmHealth = Math.max(0, this.farmHealth - 0.00002 * dt);
      }
      if (this.farmHealth <= 0.05 && this.waterFarms > 0) {
        this.logEvent('CRITICAL', 'Water Farm crops have wilted completely due to power loss!');
      }
    }

    // 4. Crew Life Support Consumption
    // Per person per sol: O2 = 0.84 kg, Water = 2.5 kg, Food = 1.5 kg
    const o2PerSecond = (0.84 / this.solDurationSeconds) * this.crewCount;
    const waterPerSecond = (2.5 / this.solDurationSeconds) * this.crewCount;
    const foodPerSecond = (1.5 / this.solDurationSeconds) * this.crewCount;

    this.oxygenStoreKg = Math.max(0, this.oxygenStoreKg - o2PerSecond * dt);
    this.waterStoreKg = Math.max(0, this.waterStoreKg - waterPerSecond * dt);
    this.foodStoreKg = Math.max(0, this.foodStoreKg - foodPerSecond * dt);

    // 5. Radiation & Sun Storm Dynamics
    // Roof Armor attenuation: each 10 cm of Mars Dirt halves incoming radiation
    const roofAttenuationFactor = Math.pow(0.5, this.roofArmorCm / 10.0);
    let shieldFactor = roofAttenuationFactor;

    if (this.bunkerActive) {
      shieldFactor *= 0.15; // Bunker provides additional safety
    }
    if (this.activeShieldEngaged) {
      shieldFactor *= 0.25; // Electromagnetic shield deflection
    }

    let currentDoseRateSvPerSecond = (0.001 / this.solDurationSeconds) * shieldFactor;

    if (this.sunStormActive) {
      // Sun Storm multiplies radiation by 50x to 100x!
      const stormMultiplier = 50.0 * Math.max(1.0, this.sunStormIntensity);
      currentDoseRateSvPerSecond *= stormMultiplier;

      // Unshielded crew takes rapid damage
      if (shieldFactor > 0.3) {
        this.crewHealthPercent = Math.max(0, this.crewHealthPercent - 0.005 * dt);
      }
    }

    this.crewCumulativeDoseSv += currentDoseRateSvPerSecond * dt;

    // 6. Check Life Support Starvation Penalties
    if (this.oxygenStoreKg <= 0) {
      this.crewHealthPercent = Math.max(0, this.crewHealthPercent - 0.1 * dt); // Asphyxiation
    } else if (this.waterStoreKg <= 0) {
      this.crewHealthPercent = Math.max(0, this.crewHealthPercent - 0.02 * dt); // Dehydration
    } else if (this.foodStoreKg <= 0) {
      this.crewHealthPercent = Math.max(0, this.crewHealthPercent - 0.005 * dt); // Starvation
    } else if (this.crewHealthPercent < 100 && !this.sunStormActive) {
      // Natural recuperation
      this.crewHealthPercent = Math.min(100, this.crewHealthPercent + 0.001 * dt);
    }
  }

  /**
   * Action: Shovel Mars Dirt onto habitat roof for free radiation armor
   */
  shovelMarsDirt(batches = 1) {
    const dirtRequired = batches * 50; // kg of dirt
    if (this.marsDirtKg < dirtRequired) {
      return { success: false, message: `Need ${dirtRequired} kg of Mars Dirt, but only have ${this.marsDirtKg.toFixed(1)} kg.` };
    }

    this.marsDirtKg -= dirtRequired;
    this.roofArmorCm += batches * 10.0; // +10 cm per batch

    // Minor crew fatigue cost
    this.waterStoreKg = Math.max(0, this.waterStoreKg - 1.0 * batches);
    this.foodStoreKg = Math.max(0, this.foodStoreKg - 0.5 * batches);

    this.logEvent('SUCCESS', `Shoveled ${dirtRequired} kg of Mars Dirt onto habitat roof. Armor depth: ${this.roofArmorCm} cm! Radiation protection increased.`);
    return {
      success: true,
      roofArmorCm: this.roofArmorCm,
      protectionPercent: ((1 - Math.pow(0.5, this.roofArmorCm / 10.0)) * 100).toFixed(1)
    };
  }

  /**
   * Action: Wash Poison Dust (Perchlorates) with water to make Cleaned Soil
   */
  washPoisonDust(batches = 1) {
    const dirtNeeded = batches * 50;  // 50 kg raw dirt
    const waterNeeded = batches * 15; // 15 kg water to leach out toxic salts

    if (this.marsDirtKg < dirtNeeded) {
      return { success: false, message: `Need ${dirtNeeded} kg of Mars Dirt.` };
    }
    if (this.waterStoreKg < waterNeeded) {
      return { success: false, message: `Need ${waterNeeded} kg of Water to wash poison perchlorates.` };
    }

    this.marsDirtKg -= dirtNeeded;
    this.waterStoreKg -= waterNeeded;
    this.cleanedSoilKg += dirtNeeded;

    this.logEvent('SUCCESS', `Washed ${dirtNeeded} kg of Poison Dust with ${waterNeeded} kg water. Produced ${dirtNeeded} kg of arable Cleaned Soil!`);
    return {
      success: true,
      cleanedSoilKg: this.cleanedSoilKg,
      waterStoreKg: this.waterStoreKg
    };
  }

  /**
   * Action: Build or Expand a Water Farm (Hydroponics)
   */
  buildWaterFarm() {
    const soilNeeded = 50; // kg of cleaned soil
    const waterNeeded = 30; // kg initial reservoir
    if (this.cleanedSoilKg < soilNeeded) {
      return { success: false, message: `Cannot build Water Farm: requires ${soilNeeded} kg of Cleaned Soil (wash Poison Dust first!).` };
    }
    if (this.waterStoreKg < waterNeeded) {
      return { success: false, message: `Cannot build Water Farm: requires ${waterNeeded} kg of Water.` };
    }

    this.cleanedSoilKg -= soilNeeded;
    this.waterStoreKg -= waterNeeded;
    this.waterFarms += 1;

    this.logEvent('SUCCESS', `Built Water Farm #${this.waterFarms}! Producing fresh food and oxygen.`);
    return {
      success: true,
      waterFarms: this.waterFarms
    };
  }

  /**
   * Action: Deploy a Warm Rock Battery (RTG)
   */
  deployWarmRockBattery() {
    this.warmRockBatteries += 1;
    this.logEvent('SUCCESS', `Deployed Warm Rock Battery #${this.warmRockBatteries}! +1.2 kW continuous 24/7 power online.`);
    return {
      success: true,
      warmRockBatteries: this.warmRockBatteries
    };
  }

  /**
   * Action: Clean Solar Panels (brush off baby-powder dust)
   */
  cleanSolarPanels() {
    this.solarPanelDustFactor = 1.0;
    this.foodStoreKg = Math.max(0, this.foodStoreKg - 1.0);
    this.waterStoreKg = Math.max(0, this.waterStoreKg - 1.5);

    this.logEvent('SUCCESS', 'Astronauts did an EVA and brushed dust off solar panels. Solar efficiency restored to 100%!');
    return {
      success: true,
      solarEfficiencyPercent: 100
    };
  }

  /**
   * Action: Toggle Bunker Shelter / Active Shield
   */
  toggleBunker(active) {
    this.bunkerActive = active !== undefined ? active : !this.bunkerActive;
    return { bunkerActive: this.bunkerActive };
  }

  toggleActiveShield(active) {
    this.activeShieldEngaged = active !== undefined ? active : !this.activeShieldEngaged;
    return { activeShieldEngaged: this.activeShieldEngaged };
  }

  triggerSunStorm(intensity = 1.0) {
    this.sunStormActive = true;
    this.sunStormIntensity = intensity;
    this.logEvent('WARNING', 'SUN STORM ALERT! Coronal Mass Ejection detected. Screen flashing orange!');
  }

  endSunStorm() {
    this.sunStormActive = false;
    this.sunStormIntensity = 0.0;
    this.logEvent('INFO', 'Sun Storm has passed. Radiation flux returned to nominal.');
  }

  logEvent(type, message) {
    this.eventLog.unshift({
      time: new Date().toISOString(),
      sol: this.sol,
      type,
      message
    });
    if (this.eventLog.length > 20) {
      this.eventLog.pop();
    }
  }

  /**
   * Returns comprehensive outpost telemetry with dual kid-friendly terminology
   */
  getSnapshot(kidMode = false) {
    const protectionPercent = (1 - Math.pow(0.5, this.roofArmorCm / 10.0)) * 100;
    const isNight = this.solTimeOfDay < 0.25 || this.solTimeOfDay > 0.75;

    return {
      sol: this.sol,
      timeOfDay: this.solTimeOfDay,
      isNight,
      isDustStorm: this.isDustStorm,
      sunStorm: {
        active: this.sunStormActive,
        intensity: this.sunStormIntensity,
        flashOrange: this.sunStormActive,
        kidName: 'Sun Storm'
      },
      bunkerActive: this.bunkerActive,
      activeShieldEngaged: this.activeShieldEngaged,
      crew: {
        count: this.crewCount,
        healthPercent: Number(this.crewHealthPercent.toFixed(1)),
        cumulativeDoseSv: Number(this.crewCumulativeDoseSv.toFixed(4)),
        status: this.crewHealthPercent > 70 ? 'HEALTHY' : (this.crewHealthPercent > 30 ? 'INJURED' : 'CRITICAL')
      },
      resources: {
        oxygenKg: Number(this.oxygenStoreKg.toFixed(1)),
        waterKg: Number(this.waterStoreKg.toFixed(1)),
        foodKg: Number(this.foodStoreKg.toFixed(1)),
        marsDirtKg: Number(this.marsDirtKg.toFixed(1)),
        cleanedSoilKg: Number(this.cleanedSoilKg.toFixed(1))
      },
      power: {
        generationKw: Number(this.currentPowerGenerationKw.toFixed(2)),
        consumptionKw: Number(this.currentPowerConsumptionKw.toFixed(2)),
        batteryStoredKwh: Number(this.batteryStoredKwh.toFixed(1)),
        batteryCapacityKwh: this.batteryCapacityKwh,
        batteryPercent: Number(((this.batteryStoredKwh / this.batteryCapacityKwh) * 100).toFixed(1)),
        solarPanelsKw: this.solarPanelsKw,
        solarPanelDustPercent: Number(((1.0 - this.solarPanelDustFactor) * 100).toFixed(1)),
        warmRockBatteriesCount: this.warmRockBatteries
      },
      structures: {
        roofArmorCm: Number(this.roofArmorCm.toFixed(1)),
        radiationProtectionPercent: Number(protectionPercent.toFixed(1)),
        waterFarmsCount: this.waterFarms,
        waterFarmHealthPercent: Number((this.farmHealth * 100).toFixed(1))
      },
      dualTerminology: {
        sunStorm: {
          scientific: 'Solar Flare / Coronal Mass Ejection (CME)',
          kidFriendly: 'Sun Storm (flash orange, seek shelter!)'
        },
        marsDirt: {
          scientific: 'Regolith (In-Situ Resource Utilization)',
          kidFriendly: 'Mars Dirt (shovel on roof for free armor!)'
        },
        poisonDust: {
          scientific: 'Toxic Magnesium Perchlorates (ClO4-)',
          kidFriendly: 'Poison Dust (wash with water before farming)'
        },
        waterFarm: {
          scientific: 'Closed-Loop Hydroponic Bioregenerative Life Support',
          kidFriendly: 'Water Farm (makes food & air, dies without power)'
        },
        warmRockBattery: {
          scientific: 'Radioisotope Thermoelectric Generator (RTG)',
          kidFriendly: 'Warm Rock Battery (free night & storm power block)'
        }
      },
      recentEvents: this.eventLog.slice(0, 5)
    };
  }
}
