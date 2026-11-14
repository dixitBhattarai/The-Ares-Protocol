import { Vector3 } from '../math/Vector3.js';
import { CONSTANTS } from '../config/constants.js';

const DEG = Math.PI / 180;

/**
 * Propulsion System
 *  - Per-role propellant tanks (oxidizer / fuel / monopropellant) with usable vs residual mass,
 *    boil-off and leaks. The bipropellant main engine draws oxidizer and fuel at its mixture ratio;
 *    RCS draws hydrazine only. (A single shared pool would let the main engine burn RCS propellant.)
 *  - Thrust is scaled by propellant availability for the step, so finite propellant can never give
 *    infinite impulse.
 *  - Ambient-pressure Isp interpolation, throttle limits, gimbal.
 *  - 12-thruster RCS with true off-axis geometry (every thruster produces force AND torque).
 *  - RCS pulses are counted in simulation time (never wall-clock timers).
 */
export class PropulsionSystem {
  constructor(config = {}) {
    this.tanks = config.tanks || [
      {
        id: 'main_lox_tank', name: 'Liquid Oxygen Tank', propellant: 'LOX', role: 'oxidizer',
        capacityKg: 15000, currentMassKg: 12000, usableMassKg: 11850, residualMassKg: 150,
        temperatureK: 90, pressurePa: 250000, boilOffRateKgS: 0.00002, leakRateKgS: 0.0, health: 1.0
      },
      {
        id: 'main_lh2_tank', name: 'Liquid Hydrogen Tank', propellant: 'LH2', role: 'fuel',
        capacityKg: 3000, currentMassKg: 2400, usableMassKg: 2370, residualMassKg: 30,
        temperatureK: 20, pressurePa: 220000, boilOffRateKgS: 0.00004, leakRateKgS: 0.0, health: 1.0
      },
      {
        id: 'rcs_hydrazine_tank', name: 'RCS Monopropellant Tank', propellant: 'Hydrazine', role: 'monoprop',
        capacityKg: 800, currentMassKg: 750, usableMassKg: 745, residualMassKg: 5,
        temperatureK: 290, pressurePa: 1800000, boilOffRateKgS: 0.0, leakRateKgS: 0.0, health: 1.0
      }
    ];

    this.engines = config.engines || [
      {
        id: 'main_engine_1', name: 'Aerojet Main Engine', type: 'bipropellant',
        maxThrustN: 45000, minThrottle: 0.3, throttle: 0.0, ignited: false,
        ispVacuumS: 348, ispSeaLevelS: 312,
        mixtureRatio: 5.0, // oxidizer : fuel by mass (matches the 5:1 tank loading)
        gimbalRangeDeg: 6.0, gimbalPitchDeg: 0.0, gimbalYawDeg: 0.0,
        powerDrawW: 1200, heatGenW: 25000, health: 1.0
      }
    ];

    // 12-thruster RCS (~350 N class). Positions/directions in the body frame (+X = thrust axis).
    this.rcsThrusters = config.rcsThrusters || [
      { id: 'rcs_fwd_top', pos: [2.0, 1.0, 0.0], dir: [0.0, -1.0, 0.0], thrustN: 350, ispS: 240, active: false, health: 1.0 },
      { id: 'rcs_fwd_bottom', pos: [2.0, -1.0, 0.0], dir: [0.0, 1.0, 0.0], thrustN: 350, ispS: 240, active: false, health: 1.0 },
      { id: 'rcs_fwd_port', pos: [2.0, 0.0, -1.0], dir: [0.0, 0.0, 1.0], thrustN: 350, ispS: 240, active: false, health: 1.0 },
      { id: 'rcs_fwd_starboard', pos: [2.0, 0.0, 1.0], dir: [0.0, 0.0, -1.0], thrustN: 350, ispS: 240, active: false, health: 1.0 },

      { id: 'rcs_aft_top', pos: [-2.0, 1.0, 0.0], dir: [0.0, -1.0, 0.0], thrustN: 350, ispS: 240, active: false, health: 1.0 },
      { id: 'rcs_aft_bottom', pos: [-2.0, -1.0, 0.0], dir: [0.0, 1.0, 0.0], thrustN: 350, ispS: 240, active: false, health: 1.0 },
      { id: 'rcs_aft_port', pos: [-2.0, 0.0, -1.0], dir: [0.0, 0.0, 1.0], thrustN: 350, ispS: 240, active: false, health: 1.0 },
      { id: 'rcs_aft_starboard', pos: [-2.0, 0.0, 1.0], dir: [0.0, 0.0, -1.0], thrustN: 350, ispS: 240, active: false, health: 1.0 },

      { id: 'rcs_axial_fwd1', pos: [1.5, 0.8, 0.8], dir: [-1.0, 0.0, 0.0], thrustN: 400, ispS: 240, active: false, health: 1.0 },
      { id: 'rcs_axial_fwd2', pos: [1.5, -0.8, -0.8], dir: [-1.0, 0.0, 0.0], thrustN: 400, ispS: 240, active: false, health: 1.0 },
      { id: 'rcs_axial_aft1', pos: [-1.5, 0.8, -0.8], dir: [1.0, 0.0, 0.0], thrustN: 400, ispS: 240, active: false, health: 1.0 },
      { id: 'rcs_axial_aft2', pos: [-1.5, -0.8, 0.8], dir: [1.0, 0.0, 0.0], thrustN: 400, ispS: 240, active: false, health: 1.0 }
    ];

    this.engineMountBody = config.engineMountBody || [-2.5, 0, 0];
    this.starved = false;
  }

  // ---------------------------------------------------------------- tank helpers

  _tanksByRole(role) {
    return this.tanks.filter(t => t.role === role);
  }

  getUsableMass(role) {
    return this._tanksByRole(role).reduce((s, t) => s + Math.max(0, t.usableMassKg), 0);
  }

  /** Usable propellant across all tanks [kg] */
  getUsablePropellantMass() {
    return this.tanks.reduce((sum, t) => sum + Math.max(0, t.usableMassKg), 0);
  }

  /** Usable main-engine propellant (oxidizer + fuel) [kg] */
  getUsableMainPropellantMass() {
    return this.getUsableMass('oxidizer') + this.getUsableMass('fuel');
  }

  /** Total propellant mass (usable + residual) across all tanks [kg] */
  getTotalPropellantMass() {
    return this.tanks.reduce((sum, t) => sum + Math.max(0, t.currentMassKg), 0);
  }

  _drain(role, kg) {
    let remaining = kg;
    for (const tank of this._tanksByRole(role)) {
      if (remaining <= 0) break;
      const d = Math.min(Math.max(0, tank.usableMassKg), remaining);
      tank.usableMassKg -= d;
      tank.currentMassKg = Math.max(0, tank.currentMassKg - d);
      remaining -= d;
    }
    return kg - remaining; // actually drained
  }

  /** Remove main-engine propellant (oxidizer + fuel, split at the stoichiometric mixture ratio). Returns kg removed. */
  consumeMainPropellant(kg) {
    if (!(kg > 0)) return 0;
    const mr = this.engines[0]?.mixtureRatio || 5.0;
    const ox = kg * mr / (mr + 1);
    return this._drain('oxidizer', ox) + this._drain('fuel', kg - ox);
  }

  /** Add propellant of a role (capacity-limited). Returns kg actually added. */
  addPropellant(role, kg) {
    let remaining = Math.max(0, kg);
    for (const tank of this._tanksByRole(role)) {
      if (remaining <= 0) break;
      const room = Math.max(0, tank.capacityKg - tank.currentMassKg);
      const a = Math.min(room, remaining);
      tank.currentMassKg += a;
      tank.usableMassKg += a;
      remaining -= a;
    }
    return kg - remaining;
  }

  // ---------------------------------------------------------------- commands

  setEngineThrottle(engineId, throttle) {
    const engine = this.engines.find(e => e.id === engineId);
    if (!engine) throw new Error(`Engine ${engineId} not found`);
    if (!Number.isFinite(throttle)) throw new Error('throttle must be a finite number');

    if (throttle <= 0.001) {
      engine.throttle = 0;
      engine.ignited = false;
    } else {
      engine.throttle = Math.max(engine.minThrottle, Math.min(1.0, throttle));
      engine.ignited = true;
    }
  }

  setEngineGimbal(engineId, pitchDeg, yawDeg) {
    const engine = this.engines.find(e => e.id === engineId);
    if (!engine) throw new Error(`Engine ${engineId} not found`);
    const maxG = engine.gimbalRangeDeg || 6.0;
    engine.gimbalPitchDeg = Math.max(-maxG, Math.min(maxG, pitchDeg));
    engine.gimbalYawDeg = Math.max(-maxG, Math.min(maxG, yawDeg));
  }

  /** Latched RCS fire/stop (WASD style). */
  fireRcs(thrusterIds, active = true) {
    for (const id of thrusterIds) {
      const thruster = this.rcsThrusters.find(t => t.id === id);
      if (thruster) {
        thruster.active = active;
        thruster.pulseRemainingS = null;
      }
    }
  }

  /** Timed RCS pulse in SIMULATION time. Fires for exactly `durationS` of simulated time. */
  pulseRcs(thrusterIds, durationS) {
    for (const id of thrusterIds) {
      const thruster = this.rcsThrusters.find(t => t.id === id);
      if (thruster && durationS > 0) {
        thruster.active = true;
        thruster.pulseRemainingS = durationS;
      }
    }
  }

  resetRcs() {
    for (const t of this.rcsThrusters) {
      t.active = false;
      t.pulseRemainingS = null;
    }
  }

  // ---------------------------------------------------------------- force model

  /**
   * Instantaneous thrust, torque and propellant flow, in the body frame.
   * Pure: does not modify tank state.
   *
   * @param {number} ambientPressurePa
   * @param {Vector3} centerOfMassBody
   * @param {number} dt - when > 0, thrust is scaled so that the propellant needed during dt never exceeds
   *                      what is available (and RCS pulses shorter than dt deliver a partial impulse)
   */
  computeThrustAndTorque(ambientPressurePa = 0, centerOfMassBody = new Vector3(0, 0, 0), dt = 0) {
    const forceBody = new Vector3(0, 0, 0);
    const torqueBody = new Vector3(0, 0, 0);
    const flows = { oxidizer: 0, fuel: 0, monoprop: 0 };
    let heatGenW = 0;
    let powerDrawW = 0;

    // ---- Main engines: first total demanded flow per propellant, then a common availability fraction
    const active = this.engines.filter(e => e.ignited && e.throttle > 0 && e.health > 0);
    const demand = active.map(engine => {
      const pRatio = Math.min(1.0, Math.max(0.0, ambientPressurePa / CONSTANTS.STD_ATM_PRESSURE));
      const isp = engine.ispVacuumS - pRatio * (engine.ispVacuumS - engine.ispSeaLevelS);
      const thrustN = engine.maxThrustN * engine.throttle * engine.health;
      const mdot = thrustN / (isp * CONSTANTS.G0);
      const mr = engine.mixtureRatio ?? 5.0;
      return { engine, thrustN, mdot, ox: mdot * mr / (1 + mr), fu: mdot / (1 + mr) };
    });

    let engineFraction = 1;
    if (demand.length > 0 && dt > 0) {
      const needOx = demand.reduce((s, d) => s + d.ox, 0) * dt;
      const needFu = demand.reduce((s, d) => s + d.fu, 0) * dt;
      const fOx = needOx > 0 ? Math.min(1, this.getUsableMass('oxidizer') / needOx) : 1;
      const fFu = needFu > 0 ? Math.min(1, this.getUsableMass('fuel') / needFu) : 1;
      engineFraction = Math.max(0, Math.min(fOx, fFu));
    } else if (demand.length > 0 && this.getUsableMainPropellantMass() <= 1e-6) {
      engineFraction = 0;
    }

    const mount = Vector3.fromArray(this.engineMountBody);
    for (const d of demand) {
      const engine = d.engine;
      const f = engineFraction;
      const pitchRad = (engine.gimbalPitchDeg || 0) * DEG;
      const yawRad = (engine.gimbalYawDeg || 0) * DEG;
      const thrustDir = new Vector3(
        Math.cos(pitchRad) * Math.cos(yawRad),
        Math.sin(yawRad),
        Math.sin(pitchRad)
      ).normalize();
      const thrustVec = thrustDir.multiplyScalar(d.thrustN * f);
      forceBody.add(thrustVec);

      const rArm = Vector3.subtract(mount, centerOfMassBody);
      torqueBody.add(Vector3.cross(rArm, thrustVec));

      flows.oxidizer += d.ox * f;
      flows.fuel += d.fu * f;
      heatGenW += engine.heatGenW * engine.throttle * f;
      powerDrawW += engine.powerDrawW * (f > 0 ? 1 : 0);
    }

    // ---- RCS thrusters
    let rcsDemandKgS = 0;
    const rcsActive = [];
    for (const th of this.rcsThrusters) {
      if (!th.active || th.health <= 0) continue;
      let duty = 1;
      if (dt > 0 && th.pulseRemainingS != null) duty = Math.max(0, Math.min(1, th.pulseRemainingS / dt));
      if (duty <= 0) continue;
      const tN = th.thrustN * th.health * duty;
      const mdot = tN / ((th.ispS || 220) * CONSTANTS.G0);
      rcsDemandKgS += mdot;
      rcsActive.push({ th, tN, mdot });
    }

    let rcsFraction = 1;
    if (rcsActive.length > 0) {
      const avail = this.getUsableMass('monoprop');
      if (dt > 0) rcsFraction = rcsDemandKgS * dt > 0 ? Math.min(1, avail / (rcsDemandKgS * dt)) : 1;
      else rcsFraction = avail > 1e-6 ? 1 : 0;
    }

    for (const { th, tN, mdot } of rcsActive) {
      const dir = Vector3.fromArray(th.dir).normalize();
      const fVec = dir.multiplyScalar(tN * rcsFraction);
      forceBody.add(fVec);
      const rArm = Vector3.subtract(Vector3.fromArray(th.pos), centerOfMassBody);
      torqueBody.add(Vector3.cross(rArm, fVec));
      flows.monoprop += mdot * rcsFraction;
      powerDrawW += 40 * (rcsFraction > 0 ? 1 : 0); // solenoid valve
    }

    return {
      forceBody,
      torqueBody,
      massFlowKgS: flows.oxidizer + flows.fuel + flows.monoprop,
      flows,
      heatGenW,
      powerDrawW,
      engineFraction,
      rcsFraction
    };
  }

  /**
   * Consume propellant for one step, apply boil-off/leaks, advance RCS pulse timers.
   * Call with the SAME dt/pressure used to compute the step's thrust.
   *
   * @param {number} extraMonopropKg - hydrazine used by non-thruster consumers this step (momentum dump)
   */
  update(dt, ambientPressurePa = 0, centerOfMassBody = new Vector3(0, 0, 0), extraMonopropKg = 0) {
    const result = this.computeThrustAndTorque(ambientPressurePa, centerOfMassBody, dt);

    this._drain('oxidizer', result.flows.oxidizer * dt);
    this._drain('fuel', result.flows.fuel * dt);
    this._drain('monoprop', result.flows.monoprop * dt + extraMonopropKg);

    // Natural boil-off & leakage
    for (const tank of this.tanks) {
      const losses = ((tank.boilOffRateKgS || 0) + (tank.leakRateKgS || 0)) * dt;
      if (losses > 0) {
        tank.currentMassKg = Math.max(0, tank.currentMassKg - losses);
        tank.usableMassKg = Math.max(0, tank.usableMassKg - losses);
      }
    }

    // Starvation: an engine that could not be fed for the whole step shuts down
    let starvedNow = false;
    if (result.engineFraction < 1) {
      for (const e of this.engines) {
        if (e.ignited) {
          e.ignited = false;
          e.throttle = 0;
          starvedNow = true;
        }
      }
    }
    this.starved = starvedNow;

    // RCS pulse timers (simulation time)
    for (const th of this.rcsThrusters) {
      if (th.active && th.pulseRemainingS != null) {
        th.pulseRemainingS -= dt;
        if (th.pulseRemainingS <= 1e-9) {
          th.active = false;
          th.pulseRemainingS = null;
        }
      }
    }
    if (result.rcsFraction < 1) {
      // RCS ran dry: latch them off
      for (const th of this.rcsThrusters) {
        th.active = false;
        th.pulseRemainingS = null;
      }
    }

    return { ...result, starved: starvedNow };
  }

  /**
   * Tsiolkovsky delta-v remaining for the main engine:
   *   dv = Isp * g0 * ln(m0 / mf),  mf = m0 - usable main propellant (oxidizer + fuel).
   * RCS hydrazine is dead mass for the main engine.
   *
   * @param {number} dryMassKg - all non-propellant mass
   */
  computeRemainingDeltaV(dryMassKg) {
    const mainUsable = this.getUsableMainPropellantMass();
    if (mainUsable <= 0) return 0;
    const m0 = dryMassKg + this.getTotalPropellantMass();
    const mf = m0 - mainUsable;
    if (mf <= 0 || m0 <= mf) return 0;
    const isp = this.engines[0]?.ispVacuumS || 320;
    return isp * CONSTANTS.G0 * Math.log(m0 / mf);
  }
}
