import { CONSTANTS } from '../config/constants.js';

/**
 * Multi-Node Spacecraft Thermal Network:
 * - Conductive and radiative heat transfer between nodes
 * - Solar irradiance absorption (inverse square law from Sun)
 * - Stefan-Boltzmann deep space radiation: Q_rad = epsilon * sigma * A * (T^4 - T_space^4)
 * - Deployable thermal radiators
 * - Component temperature operating & survival limits
 */
export class ThermalSystem {
  constructor(config = {}) {
    // Thermal Nodes
    this.nodes = config.nodes || [
      {
        id: 'avionics',
        name: 'Flight Computer & Avionics',
        temperatureK: 295.0, // 22 deg C
        heatCapacityJ_K: 8000,
        internalHeatGenW: 120, // Baseline avionics dissipation
        absorptivity: 0.05,    // MLI insulated
        emissivity: 0.05,
        radiatingAreaM2: 0.05, // Inside bus chassis
        minOperatingK: 233, // -40 C
        maxOperatingK: 333, // +60 C
        minSurvivalK: 213,
        maxSurvivalK: 358,
        health: 1.0
      },
      {
        id: 'cabin',
        name: 'Crew Pressurized Cabin',
        temperatureK: 294.0, // 21 deg C
        heatCapacityJ_K: 45000,
        internalHeatGenW: 350, // Human metabolic heat + electronics
        absorptivity: 0.08,    // Insulated hull
        emissivity: 0.10,
        radiatingAreaM2: 1.0,  // Minor hull loss
        minOperatingK: 288, // 15 C
        maxOperatingK: 301, // 28 C
        minSurvivalK: 273,
        maxSurvivalK: 315,
        health: 1.0
      },
      {
        id: 'propellant_tanks',
        name: 'Propellant Cryo & Storage Tanks',
        temperatureK: 85.0,
        heatCapacityJ_K: 60000,
        internalHeatGenW: 15, // Tank heaters
        absorptivity: 0.10, // Multi-layer insulation (MLI)
        emissivity: 0.05,
        radiatingAreaM2: 8.0,
        minOperatingK: 60,
        maxOperatingK: 120,
        minSurvivalK: 40,
        maxSurvivalK: 150,
        health: 1.0
      },
      {
        id: 'batteries',
        name: 'Main Battery Compartment',
        temperatureK: 293.0,
        heatCapacityJ_K: 12000,
        internalHeatGenW: 30,
        absorptivity: 0.3,
        emissivity: 0.8,
        radiatingAreaM2: 2.5,
        minOperatingK: 263, // -10 C
        maxOperatingK: 318, // +45 C
        minSurvivalK: 253,
        maxSurvivalK: 333,
        health: 1.0
      },
      {
        id: 'radiator',
        name: 'Active Deployable Radiator Loop',
        temperatureK: 280.0,
        heatCapacityJ_K: 10000,
        internalHeatGenW: 0,
        absorptivity: 0.08,
        emissivity: 0.92,
        radiatingAreaM2: 8.0,
        deployed: true,
        mode: 'auto', // 'auto', 'deployed', 'stowed'
        minOperatingK: 180,
        maxOperatingK: 360,
        health: 1.0
      }
    ];

    // Ablative heat shield (faces the wind during entry). Heat above the ablation temperature is
    // carried away by pyrolysis: it consumes ablator mass instead of raising the temperature.
    this.heatShield = config.heatShield || {
      id: 'heatshield',
      name: 'Ablative Heat Shield',
      areaM2: 7.07,
      ablatorMassKg: 400,
      ablatorMassInitialKg: 400,
      heatOfAblationJ_kg: 2.5e6,
      ablationTempK: 2000,
      heatCapacityJ_K: 4.0e5,
      temperatureK: 250,
      absorptivity: 0.5,
      emissivity: 0.85,
      health: 1.0
    };
    this.lastAeroHeatW = 0;

    // Thermal conductance matrix [K/W] between connected nodes
    // Connections: avionics <-> cabin, cabin <-> radiator, cabin <-> batteries
    this.couplings = [
      { from: 'avionics', to: 'radiator', resistanceK_W: 0.1 },
      { from: 'avionics', to: 'cabin', resistanceK_W: 0.3 },
      { from: 'cabin', to: 'radiator', resistanceK_W: 0.08 },
      { from: 'cabin', to: 'batteries', resistanceK_W: 0.35 }
    ];

    this.warnings = [];
  }

  setRadiatorMode(radiatorId, mode) {
    const rad = this.nodes.find(n => n.id === radiatorId);
    if (rad) {
      rad.mode = mode;
      rad.deployed = mode !== 'stowed';
    }
  }

  /**
   * Update thermal network for timestep dt
   * @param {number} dt - Timestep [s]
   * @param {Object} env - { sunDistanceM, inEclipse, engineHeatW }
   */
  update(dt, env = {}) {
    const sunDist = env.sunDistanceM || CONSTANTS.AU;
    const inEclipse = env.inEclipse || false;
    const engineHeatW = env.engineHeatW || 0;
    const aeroFluxWm2 = env.aeroHeatFluxWm2 || 0; // stagnation heat flux on the shield

    // Solar flux scaling with distance: S = S0 * (1 AU / r)^2
    const distRatio = CONSTANTS.AU / sunDist;
    const solarFlux = inEclipse ? 0 : CONSTANTS.SOLAR_IRRADIANCE_1AU * distRatio * distRatio;

    this.warnings = [];

    // Calculate heat transfers
    const heatRatesW = new Map();
    for (const node of this.nodes) {
      heatRatesW.set(node.id, 0);
    }

    // 1. External Solar & Deep Space Radiative Cooling
    for (const node of this.nodes) {
      let qNet = node.internalHeatGenW;

      // Extra engine heat injected into tanks/avionics if firing
      if (node.id === 'avionics') {
        qNet += engineHeatW * 0.02; // 2% engine waste heat into avionics structure
      }

      // Solar absorption: Q_solar = alpha * A * S
      if (solarFlux > 0 && node.radiatingAreaM2 > 0) {
        // Average illumination factor ~0.25 for projected sphere/box in 3D rotation
        const qSolar = node.absorptivity * (node.radiatingAreaM2 * 0.25) * solarFlux;
        qNet += qSolar;
      }

      // Radiative cooling: Q_rad = epsilon * sigma * A * (T^4 - T_space^4)
      if (node.radiatingAreaM2 > 0) {
        let effArea = node.radiatingAreaM2;
        if (node.id === 'radiator' && !node.deployed) {
          effArea = 0.5; // Stowed radiator has minimal exposed surface
        }
        const t4 = Math.pow(node.temperatureK, 4);
        const tSpace4 = Math.pow(CONSTANTS.SPACE_TEMP_K, 4);
        const qRad = node.emissivity * CONSTANTS.SIGMA * effArea * (t4 - tSpace4);
        qNet -= qRad;
      }

      heatRatesW.set(node.id, heatRatesW.get(node.id) + qNet);
    }

    // 2. Conduction between coupled nodes: Q = (T_from - T_to) / R
    for (const coup of this.couplings) {
      const nFrom = this.nodes.find(n => n.id === coup.from);
      const nTo = this.nodes.find(n => n.id === coup.to);
      if (nFrom && nTo) {
        const deltaT = nFrom.temperatureK - nTo.temperatureK;
        const qCond = deltaT / coup.resistanceK_W;

        heatRatesW.set(nFrom.id, heatRatesW.get(nFrom.id) - qCond);
        heatRatesW.set(nTo.id, heatRatesW.get(nTo.id) + qCond);
      }
    }

    // 2b. Aerodynamic heating through the heat shield
    const hs = this.heatShield;
    this.lastAeroHeatW = 0;
    if (hs) {
      const qIn = aeroFluxWm2 * hs.areaM2 * 0.5; // ~50% of stagnation flux averaged over the shield
      this.lastAeroHeatW = qIn;
      const qRadHs = hs.emissivity * CONSTANTS.SIGMA * hs.areaM2 * (Math.pow(hs.temperatureK, 4) - Math.pow(CONSTANTS.SPACE_TEMP_K, 4));
      hs.temperatureK += ((qIn - qRadHs) / hs.heatCapacityJ_K) * dt;
      if (hs.temperatureK > hs.ablationTempK) {
        const excessJ = (hs.temperatureK - hs.ablationTempK) * hs.heatCapacityJ_K;
        hs.temperatureK = hs.ablationTempK;
        if (hs.ablatorMassKg > 0) {
          const burn = Math.min(hs.ablatorMassKg, excessJ / hs.heatOfAblationJ_kg);
          hs.ablatorMassKg -= burn;
          hs.health = hs.ablatorMassKg / hs.ablatorMassInitialKg;
          if (hs.health < 0.25) {
            this.warnings.push({ level: 'CRITICAL', nodeId: hs.id, message: `HEAT SHIELD ABLATOR ${(hs.health * 100).toFixed(0)}% REMAINING` });
          }
        } else {
          // Shield burned through: heat soaks into the crew cabin
          const cabin = this.nodes.find(n => n.id === 'cabin');
          if (cabin) heatRatesW.set(cabin.id, heatRatesW.get(cabin.id) + qIn * 0.6);
          this.warnings.push({ level: 'CRITICAL', nodeId: hs.id, message: 'HEAT SHIELD BURNED THROUGH! Cabin heating!' });
        }
      }
    }

    // 3. Integrate temperature: dT = (Q / C) * dt
    for (const node of this.nodes) {
      const q = heatRatesW.get(node.id);
      const deltaT = (q / node.heatCapacityJ_K) * dt;
      node.temperatureK += deltaT;

      // Operating limit checks
      if (node.temperatureK > node.maxOperatingK) {
        this.warnings.push({
          level: 'WARNING',
          nodeId: node.id,
          message: `${node.name} overheating: ${node.temperatureK.toFixed(1)} K (Max Op: ${node.maxOperatingK} K)`
        });
      } else if (node.temperatureK < node.minOperatingK) {
        this.warnings.push({
          level: 'WARNING',
          nodeId: node.id,
          message: `${node.name} freezing: ${node.temperatureK.toFixed(1)} K (Min Op: ${node.minOperatingK} K)`
        });
      }

      // Survival limit violation damages component health
      if (node.temperatureK > node.maxSurvivalK || node.temperatureK < node.minSurvivalK) {
        node.health = Math.max(0, node.health - 0.01 * dt);
        this.warnings.push({
          level: 'CRITICAL',
          nodeId: node.id,
          message: `${node.name} EXCEEDED SURVIVAL TEMPERATURE! Sustaining structural damage!`
        });
      }
    }

    return {
      nodes: this.nodes.map(n => ({
        id: n.id,
        name: n.name,
        temperatureK: n.temperatureK,
        temperatureC: n.temperatureK - 273.15,
        health: n.health
      })),
      solarFluxW_m2: solarFlux,
      heatShield: hs ? { temperatureK: hs.temperatureK, ablatorMassKg: hs.ablatorMassKg, health: hs.health, aeroHeatW: this.lastAeroHeatW } : null,
      warnings: this.warnings
    };
  }
}
