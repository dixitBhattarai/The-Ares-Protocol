/**
 * Fault Detection, Isolation & Cascading Failure Engine:
 * - Dynamic health tracking across all vehicle components
 * - Cascading failure propagation across interdependent subsystems
 * - Spares inventory and EVA repair mechanics
 */
export class FailureSystem {
  constructor(config = {}) {
    this.sparePartsCount = config.spares ?? 5;
    this.activeFailures = [];
    this.failureHistory = [];
    this.counter = 0;
  }

  recordFault(systemId, componentId, reason, severity = 'WARNING') {
    const fault = {
      id: `fault_${++this.counter}`,
      timestamp: Date.now(),
      systemId,
      componentId,
      reason,
      severity,
      acknowledged: false
    };

    this.activeFailures.push(fault);
    this.failureHistory.push(fault);
    return fault;
  }

  acknowledgeFault(faultId) {
    const fault = this.activeFailures.find(f => f.id === faultId);
    if (fault) {
      fault.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Evaluates cascading failure interactions across subsystems
   */
  evaluateCascades(spacecraft) {
    const newCascades = [];

    // 1. Radiator failure -> Electronics Overheat -> Computer reboot
    const radiator = spacecraft.thermal.nodes.find(n => n.id === 'radiator');
    const avionics = spacecraft.thermal.nodes.find(n => n.id === 'avionics');
    if (radiator && radiator.health < 0.2 && avionics && avionics.temperatureK > avionics.maxOperatingK) {
      if (avionics.health > 0.4) {
        avionics.health -= 0.05;
        newCascades.push(this.recordFault('thermal', 'avionics', 'Cascade: Radiator offline causing avionics thermal runaway!'));
      }
    }

    // 2. Battery failure -> Thermal heaters offline -> Cryo boil-off / freezing
    if (spacecraft.power.battery.energyStoredWh <= 10.0) {
      const heaters = spacecraft.power.loads.find(l => l.id === 'thermal_heaters');
      if (heaters && heaters.enabled) {
        heaters.enabled = false;
        newCascades.push(this.recordFault('power', 'thermal_heaters', 'Cascade: Complete battery depletion dropped survival heaters!'));
      }
    }

    // 3. RCS fuel line leak -> Unbalanced torque
    const rcsTank = spacecraft.propulsion.tanks.find(t => t.propellant === 'Hydrazine');
    if (rcsTank && rcsTank.leakRateKgS > 0) {
      newCascades.push(this.recordFault('propulsion', 'rcs_tank', `RCS Propellant Leak active: ${rcsTank.leakRateKgS} kg/s loss!`));
    }

    return newCascades;
  }

  /**
   * Attempt crew repair of a damaged component
   */
  repairComponent(targetComponent, repairAmount = 0.5, radiationRateSv_h = 0.0) {
    if (this.sparePartsCount <= 0) {
      return { success: false, reason: 'No spare parts remaining in mission inventory' };
    }

    // Safety checks: Cannot repair during acute radiation storm
    if (radiationRateSv_h > 0.05) {
      return { success: false, reason: 'Radiation dose rate too high for crew repair procedure' };
    }

    this.sparePartsCount--;
    targetComponent.health = Math.min(1.0, (targetComponent.health || 0) + repairAmount);

    // Clear active failures for this component
    this.activeFailures = this.activeFailures.filter(f => f.componentId !== targetComponent.id);

    return {
      success: true,
      newHealth: targetComponent.health,
      sparesRemaining: this.sparePartsCount
    };
  }
}
