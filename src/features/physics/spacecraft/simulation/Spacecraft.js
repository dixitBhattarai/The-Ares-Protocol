import { Vector3 } from '../math/Vector3.js';
import { Quaternion } from '../math/Quaternion.js';
import { PropulsionSystem } from '../systems/PropulsionSystem.js';
import { AttitudeSystem } from '../systems/AttitudeSystem.js';
import { ThermalSystem } from '../systems/ThermalSystem.js';
import { PowerSystem } from '../systems/PowerSystem.js';
import { LifeSupportSystem } from '../systems/LifeSupportSystem.js';
import { RadiationSystem } from '../systems/RadiationSystem.js';
import { CommsSystem } from '../systems/CommsSystem.js';
import { LandingDockingSystem } from '../systems/LandingDockingSystem.js';
import { FailureSystem } from '../systems/FailureSystem.js';
import { Atmosphere } from '../physics/Atmosphere.js';

const SHIELD_AXIS_BODY = new Vector3(-1, 0, 0); // heat shield faces -X (engine end)

/**
 * Authoritative spacecraft model: 6-DOF state + all engineering subsystems.
 *
 * Body frame: +X thrust/nose axis, engine and heat shield aft (-X). Quaternion is body -> inertial.
 */
export class Spacecraft {
  constructor(config = {}) {
    this.id = config.id || 'orion_spacecraft_1';
    this.name = config.name || 'Orion Exploration Vehicle';

    // 6-DOF physical state
    this.pos = config.pos ? config.pos.clone() : new Vector3(0, 0, 0); // [m] body-centred inertial
    this.vel = config.vel ? config.vel.clone() : new Vector3(0, 0, 0); // [m/s]
    this.quat = config.quat ? config.quat.clone().normalize() : new Quaternion(1, 0, 0, 0);
    this.omega = config.omega ? config.omega.clone() : new Vector3(0, 0, 0); // body frame [rad/s]

    // Masses [kg]. Consumable mass is read live from life support so it changes as the crew uses it.
    this.dryMassKg = config.dryMassKg ?? 12500.0;
    this.payloadMassKg = config.payloadMassKg ?? 1500.0;
    this.crewMassKg = config.crewMassKg ?? 450.0;
    this.otherConsumablesMassKg = config.otherConsumablesMassKg ?? 0.0;

    this.centerOfMassBody = new Vector3(0, 0, 0);

    // Aerodynamic configuration
    this.aero = {
      frontalAreaM2: Math.PI * 1.5 * 1.5, // 3 m diameter heat shield
      sideAreaM2: 15.0,
      cdFront: 1.3,
      cdSide: 1.0,
      noseRadiusM: 1.5,
      liftScale: 0.8,
      heatCoeff: 1.7415e-4,
      ...(config.aero || {})
    };

    // Landing gear (body frame; four aft legs, vehicle stands on its tail)
    const g = config.landingGear || {};
    this.landingGear = {
      feet: g.feet || [
        [-3.1, 1.9, 1.9], [-3.1, 1.9, -1.9], [-3.1, -1.9, 1.9], [-3.1, -1.9, -1.9]
      ],
      footRadiusM: g.footRadiusM ?? 0.4,
      strokeM: g.strokeM ?? 0.5, // crush stroke used to estimate impact g-load
      friction: g.friction ?? 0.9
    };

    // Parachute (sim-time state machine)
    const p = config.parachute || {};
    this.parachute = {
      state: 'stowed', // stowed | deploying | deployed | cut | torn
      areaM2: p.areaM2 ?? 300,
      cd: p.cd ?? 1.4,
      openingTimeS: p.openingTimeS ?? 3.0,
      progress: 0,
      maxDeployQPa: p.maxDeployQPa ?? 1500,
      maxDeployMach: p.maxDeployMach ?? 2.5,
      maxOpenQPa: p.maxOpenQPa ?? 3000
    };

    // Subsystems
    this.propulsion = new PropulsionSystem(config.propulsion);
    this.attitude = new AttitudeSystem(config.attitude);
    this.thermal = new ThermalSystem(config.thermal);
    this.power = new PowerSystem(config.power);
    this.lifeSupport = new LifeSupportSystem(config.lifeSupport);
    this.radiation = new RadiationSystem(config.radiation);
    this.comms = new CommsSystem(config.comms);
    this.landingDocking = new LandingDockingSystem(config.landingDocking);
    this.failure = new FailureSystem(config.failure);

    this.updateMassProperties();
  }

  getConsumablesMassKg() {
    const ls = this.lifeSupport;
    return (ls.oxygenStoreKg || 0) + (ls.nitrogenStoreKg || 0) + (ls.waterStoreKg || 0) +
           (ls.foodStoreKg || 0) + this.otherConsumablesMassKg;
  }

  /** Non-propellant mass [kg] */
  getDryTotalMass() {
    return this.dryMassKg + this.payloadMassKg + this.crewMassKg + this.getConsumablesMassKg();
  }

  /** Total mass including all propellant [kg] */
  getTotalMass() {
    return this.getDryTotalMass() + this.propulsion.getTotalPropellantMass();
  }

  updateMassProperties() {
    this.attitude.updateInertiaTensor(this.getTotalMass());
  }

  /** Unit vector (inertial) from the vehicle centre out through the heat shield */
  getShieldAxisInertial(quat = this.quat) {
    return quat.rotateVector(SHIELD_AXIS_BODY);
  }

  /** Effective (opening-ramped) canopy for the aerodynamic model */
  getEffectiveParachute() {
    const p = this.parachute;
    if (p.state === 'deploying') {
      const x = Math.max(0, Math.min(1, p.progress));
      return { areaM2: p.areaM2 * x * x * (3 - 2 * x), cd: p.cd }; // smoothstep inflation
    }
    if (p.state === 'deployed') return { areaM2: p.areaM2, cd: p.cd };
    return null;
  }

  /** Aerodynamic evaluation at an arbitrary (pos, vel, quat) - used by every integrator stage */
  computeAerodynamics(pos, vel, quat, body) {
    return Atmosphere.computeAero(
      pos, vel, body, this.aero,
      this.getEffectiveParachute(),
      this.getShieldAxisInertial(quat)
    );
  }

  deployParachute(dynamicPressurePa, machNumber) {
    const p = this.parachute;
    if (p.state !== 'stowed') return { success: false, reason: `Parachute is ${p.state}` };
    if (dynamicPressurePa <= 0) return { success: false, reason: 'No atmosphere: parachute cannot inflate' };
    if (dynamicPressurePa > p.maxDeployQPa || machNumber > p.maxDeployMach) {
      p.state = 'torn';
      return {
        success: false, torn: true,
        reason: `Deployed outside envelope (q=${dynamicPressurePa.toFixed(0)} Pa, Mach ${machNumber.toFixed(2)}); canopy destroyed`
      };
    }
    p.state = 'deploying';
    p.progress = 0;
    return { success: true };
  }

  cutParachute() {
    const p = this.parachute;
    if (p.state === 'deploying' || p.state === 'deployed') {
      p.state = 'cut';
      return true;
    }
    return false;
  }

  /** Advance the canopy state machine in simulation time. Returns events for the log. */
  stepParachute(dt, dynamicPressurePa) {
    const p = this.parachute;
    const events = [];
    if (p.state === 'deploying') {
      p.progress += dt / p.openingTimeS;
      if (dynamicPressurePa > p.maxOpenQPa) {
        p.state = 'torn';
        events.push({ level: 'CRITICAL', message: `PARACHUTE TORN during inflation (q=${dynamicPressurePa.toFixed(0)} Pa)` });
      } else if (p.progress >= 1) {
        p.state = 'deployed';
        p.progress = 1;
        events.push({ level: 'INFO', message: 'Parachute fully inflated' });
      }
    } else if (p.state === 'deployed' && dynamicPressurePa > p.maxOpenQPa) {
      p.state = 'torn';
      events.push({ level: 'CRITICAL', message: `PARACHUTE TORN (q=${dynamicPressurePa.toFixed(0)} Pa exceeds ${p.maxOpenQPa} Pa)` });
    }
    return events;
  }

  /**
   * PURE state-derivative function for the RK4 integrator.
   *
   * Everything that depends on the integrator stage state (gravity, aerodynamics, gravity-gradient,
   * quaternion kinematics, rotational dynamics) is evaluated from `state`. Everything decided by the
   * control/propulsion logic is sampled ONCE per step and held constant (zero-order hold) in `ctx`:
   *   ctx.forceBody, ctx.torqueBody, ctx.massFlowKgS, ctx.wheelMomentumBody
   *   ctx.gravity(pos) -> Vector3,  ctx.aero(state) -> aero result | null
   *   ctx.mu, ctx.sunDirInertial, ctx.solarFluxWm2
   * No object in `ctx` or on `this` is mutated.
   */
  computeDerivatives(state, t, ctx) {
    const mass = Math.max(100.0, state.mass);

    const dPos = state.vel.clone();

    const accel = ctx.gravity(state.pos);
    accel.add(state.quat.rotateVector(ctx.forceBody).multiplyScalar(1.0 / mass));

    const aero = ctx.aero ? ctx.aero(state) : null;
    if (aero) accel.add(aero.totalForce.clone().multiplyScalar(1.0 / mass));

    const dQuat = state.quat.derivative(state.omega);

    const torque = ctx.torqueBody.clone();
    if (ctx.mu) {
      torque.add(this.attitude.computeGravityGradientTorque(state.pos, state.quat, ctx.mu));
    }
    if (ctx.sunDirInertial) {
      torque.add(this.attitude.computeSolarPressureTorque(ctx.sunDirInertial, state.quat, ctx.solarFluxWm2));
    }
    const { alpha } = this.attitude.computeAngularAcceleration(torque, state.omega, ctx.wheelMomentumBody);

    return {
      dPos,
      dVel: accel,
      dQuat,
      dOmega: alpha,
      dMass: -ctx.massFlowKgS
    };
  }
}
