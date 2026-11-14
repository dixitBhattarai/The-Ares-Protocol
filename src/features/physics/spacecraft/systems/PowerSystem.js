import { CONSTANTS } from '../config/constants.js';

/**
 * Electrical Power System (EPS):
 * - Solar panel array with pointing angle, solar distance attenuation, and eclipse detection
 * - Lithium-ion main battery storage with State of Charge (SoC) and internal resistance
 * - Auxiliary Radioisotope Thermoelectric Generator (RTG)
 * - Power bus with multi-tier priority load shedding
 */
export class PowerSystem {
  constructor(config = {}) {
    this.solarPanels = config.solarPanels || {
      id: 'solar_arrays',
      areaM2: 25.0,
      efficiency: 0.28, // High-efficiency triple-junction GaAs space cells
      health: 1.0,
      dustFactor: 1.0,
      degradation: 0.98,
      deployed: true
    };

    this.battery = config.battery || {
      capacityWh: 15000.0, // 15 kWh
      energyStoredWh: 13500.0,
      nominalVoltage: 28.0, // 28V DC standard space bus
      internalResistanceOhm: 0.04,
      chargeEfficiency: 0.92,
      dischargeEfficiency: 0.96,
      maxChargeRateW: 4000.0,
      maxDischargeRateW: 8000.0,
      health: 1.0
    };

    this.rtg = config.rtg || {
      enabled: true,
      powerOutputW: 450.0 // Continuous decay-based RTG power
    };

    // Priority Loads: lower priority number = higher importance
    this.loads = [
      { id: 'life_support', name: 'Life Support & O2 Generation', powerW: 650, priority: 1, enabled: true },
      { id: 'avionics', name: 'Flight Computer & GNC', powerW: 220, priority: 2, enabled: true },
      { id: 'thermal_heaters', name: 'Thermal Survival Heaters', powerW: 300, priority: 3, enabled: true },
      { id: 'comms', name: 'Deep Space Telecommunications', powerW: 180, priority: 4, enabled: true },
      { id: 'attitude_actuators', name: 'Reaction Wheels & Actuators', powerW: 150, priority: 5, enabled: true },
      { id: 'science_instruments', name: 'Science Payloads & Radar', powerW: 400, priority: 6, enabled: true },
      { id: 'cabin_comfort', name: 'Cabin Lighting & Displays', powerW: 120, priority: 7, enabled: true }
    ];

    this.powerBalanceW = 0;
    this.warnings = [];
  }

  setLoadEnabled(loadId, enabled) {
    const load = this.loads.find(l => l.id === loadId);
    if (load) {
      load.enabled = enabled;
    }
  }

  /**
   * Evaluates solar power generated based on solar flux and panel orientation
   */
  computeSolarGeneration(sunDistanceM, inEclipse, pointingCos = 0.95) {
    if (!this.solarPanels.deployed || inEclipse) return 0;

    const distRatio = CONSTANTS.AU / sunDistanceM;
    const solarFlux = CONSTANTS.SOLAR_IRRADIANCE_1AU * distRatio * distRatio;

    const cosTheta = Math.max(0, Math.min(1.0, pointingCos));
    const power = this.solarPanels.efficiency *
                  this.solarPanels.areaM2 *
                  solarFlux *
                  cosTheta *
                  this.solarPanels.health *
                  this.solarPanels.dustFactor *
                  this.solarPanels.degradation;

    return power;
  }

  /**
   * Update Power System over timestep dt
   * @param {number} dt - Timestep [s]
   * @param {Object} env - { sunDistanceM, inEclipse, pointingCos, dynamicLoadsW }
   */
  /** Runs one step and keeps the result so REST/telemetry report real computed values. */
  update(dt, env = {}) {
    this.lastStatus = this._step(dt, env);
    return this.lastStatus;
  }

  _step(dt, env = {}) {
    const sunDist = env.sunDistanceM || CONSTANTS.AU;
    const inEclipse = env.inEclipse || false;
    const pointingCos = env.pointingCos ?? 0.95;
    const dynamicLoadsW = env.dynamicLoadsW || 0; // External dynamic draws (e.g. engine ignition)

    this.warnings = [];

    // 1. Total Generation
    const solarGenW = this.computeSolarGeneration(sunDist, inEclipse, pointingCos);
    const rtgGenW = this.rtg.enabled ? this.rtg.powerOutputW : 0;
    const totalGenW = solarGenW + rtgGenW;

    // 2. Base Load Consumption
    let baseConsumptionW = this.loads
      .filter(l => l.enabled)
      .reduce((sum, l) => sum + l.powerW, 0);

    let totalConsumptionW = baseConsumptionW + dynamicLoadsW;

    // 3. Power Balance & Battery Charging / Discharging
    let netPowerW = totalGenW - totalConsumptionW;
    const dtHours = dt / 3600.0;

    const soc = this.battery.energyStoredWh / this.battery.capacityWh;

    // Load Shedding check if battery critically low and in deficit
    if (netPowerW < 0 && soc < 0.20) {
      // Shed lowest priority loads (priority 7 down to 4)
      for (const load of this.loads.slice().sort((a, b) => b.priority - a.priority)) {
        if (load.priority >= 4 && load.enabled) {
          load.enabled = false;
          this.warnings.push({
            level: 'WARNING',
            message: `EPS Load Shedding: Disabled ${load.name} to preserve battery!`
          });
          totalConsumptionW -= load.powerW;
          netPowerW = totalGenW - totalConsumptionW;
          if (netPowerW >= 0) break;
        }
      }
    }

    if (netPowerW > 0) {
      // Charge battery
      const chargeRateW = Math.min(netPowerW, this.battery.maxChargeRateW);
      const energyToAddWh = chargeRateW * dtHours * this.battery.chargeEfficiency;
      this.battery.energyStoredWh = Math.min(this.battery.capacityWh, this.battery.energyStoredWh + energyToAddWh);
    } else if (netPowerW < 0) {
      // Discharge battery
      const dischargeRateW = Math.min(Math.abs(netPowerW), this.battery.maxDischargeRateW);
      const energyToDrainWh = (dischargeRateW * dtHours) / this.battery.dischargeEfficiency;
      this.battery.energyStoredWh = Math.max(0, this.battery.energyStoredWh - energyToDrainWh);

      if (this.battery.energyStoredWh <= 0) {
        this.warnings.push({
          level: 'CRITICAL',
          message: 'BATTERY FULLY DEPLETED! Critical Spacecraft Blackout imminent!'
        });
      }
    }

    this.powerBalanceW = netPowerW;

    const finalSoC = this.battery.energyStoredWh / this.battery.capacityWh;

    // Terminal bus voltage estimation
    const currentA = Math.abs(netPowerW) / this.battery.nominalVoltage;
    const vDrop = currentA * this.battery.internalResistanceOhm;
    const busVoltage = netPowerW >= 0 ?
      this.battery.nominalVoltage + vDrop :
      this.battery.nominalVoltage - vDrop;

    return {
      generationW: totalGenW,
      solarW: solarGenW,
      rtgW: rtgGenW,
      consumptionW: totalConsumptionW,
      netPowerW,
      batterySoC: finalSoC,
      batteryEnergyStoredWh: this.battery.energyStoredWh,
      busVoltageV: busVoltage,
      loads: this.loads,
      warnings: this.warnings
    };
  }
}
