import { Vector3 } from '../math/Vector3.js';
import { Quaternion } from '../math/Quaternion.js';
import { Matrix3 } from '../math/Matrix3.js';
import { CONSTANTS } from '../config/constants.js';
import { hashNoiseCentered } from '../math/Rng.js';

/**
 * 6-DOF Attitude Dynamics & Control System (ADCS)
 *
 * Body frame convention (shared with PropulsionSystem / LandingDockingSystem):
 *   +X = thrust / "nose" axis (main engine is mounted aft and pushes toward +X; a landed vehicle stands
 *        on its aft legs with +X pointing up),
 *   +Y = starboard-ish lateral axis, +Z = lateral axis. Right-handed.
 *
 * Structure (important for numerical correctness):
 *   1. computeControlTorque()  - control law, evaluated ONCE per physics step (digital controller).
 *   2. applyWheelTorque()      - the ONLY place wheel momentum changes, ONCE per step.
 *   3. computeAngularAcceleration() - PURE function of (torque, omega, wheel momentum). Safe to call
 *                                    from every RK4 stage.
 *
 * Rigid body with internal momentum wheels (wheel momentum h in body frame):
 *     I * omega_dot + omega x (I*omega + h) = tau_external + tau_wheel_on_craft
 *     h_dot = - tau_wheel_on_craft
 * so total angular momentum  H = I*omega + h  changes only through external torques.
 */
export class AttitudeSystem {
  constructor(config = {}) {
    const d = config.dimensions || {};
    // length is along the thrust axis (X); width along Y; height along Z
    this.dimensions = {
      length: d.length ?? d.depth ?? 5.0,
      width: d.width ?? 3.0,
      height: d.height ?? 3.0
    };

    // Control-moment-gyro class actuators (ISS CMGs: ~250 N*m torque, ~4800 N*m*s momentum).
    // Small reaction wheels cannot slew a 20+ tonne crew vehicle in any playable time.
    this.reactionWheels = config.reactionWheels || [
      { id: 'rw_x', axis: new Vector3(1, 0, 0), maxTorqueNm: 250, maxMomentumNms: 5000, momentumNms: 0.0, commandedTorqueNm: 0, powerDrawW: 90, health: 1.0 },
      { id: 'rw_y', axis: new Vector3(0, 1, 0), maxTorqueNm: 250, maxMomentumNms: 5000, momentumNms: 0.0, commandedTorqueNm: 0, powerDrawW: 90, health: 1.0 },
      { id: 'rw_z', axis: new Vector3(0, 0, 1), maxTorqueNm: 250, maxMomentumNms: 5000, momentumNms: 0.0, commandedTorqueNm: 0, powerDrawW: 90, health: 1.0 }
    ];

    this.inertiaTensor = new Matrix3();
    this.inverseInertiaTensor = new Matrix3();

    // Autopilot: rate-limited quaternion feedback.
    //   rate_cmd = clamp(kp * theta_err, maxRate);   alpha_cmd = kd * (rate_cmd - omega)
    // Closed loop near the target:  theta'' + kd*theta' + kd*kp*theta = 0
    // kd = 1.2, kp = 0.3  ->  wn = 0.6 rad/s, zeta = 1 (critically damped, no overshoot).
    this.targetQuaternion = new Quaternion(1, 0, 0, 0);
    this.autopilotActive = false;
    this.pid = {
      kp: config.kp ?? 0.3,
      kd: config.kd ?? 1.2,
      maxRateRadS: config.maxRateRadS ?? 0.04 // ~2.3 deg/s: keeps wheel momentum I*w within capacity
    };

    this.enableGravityGradient = config.enableGravityGradient ?? true;
    this.enableSRP = config.enableSRP ?? true;
    this.srpAreaM2 = config.srpAreaM2 ?? 15.0;
    this.srpReflectivity = config.srpReflectivity ?? 1.5;
    this.srpCenterOfPressureOffsetM = config.srpCenterOfPressureOffsetM || new Vector3(0.05, 0.02, 0.0);

    // Momentum dumping with RCS (see planMomentumDump)
    this.momentumDump = {
      active: false,
      rateNmS: 60,            // |dh/dt| per axis while dumping [N*m]
      completeFraction: 0.02, // stop when every wheel is below this fraction of capacity
      rcsMomentArmM: 2.0,     // effective RCS couple arm [m]
      rcsIspS: 240
    };

    // Sensors (noise is a stateless hash of the step index => telemetry reads never perturb physics)
    this.sensors = {
      gyroBias: new Vector3(0.0001, -0.0001, 0.00005),
      gyroNoiseRadS: 0.0002,
      starTrackerHealthy: true,
      sunSensorVisible: true
    };
    this.noiseSeed = config.noiseSeed ?? 1;

    this.lastWheelPowerW = 0;
  }

  /**
   * Recompute the box-model inertia tensor from the current total mass (propellant burns off).
   *   Ixx = m/12 (w^2 + h^2)   (roll, about thrust axis: smallest for a prolate vehicle)
   *   Iyy = m/12 (L^2 + h^2)
   *   Izz = m/12 (L^2 + w^2)
   */
  updateInertiaTensor(totalMassKg) {
    const { length: L, width: w, height: h } = this.dimensions;
    const ixx = (totalMassKg / 12.0) * (w * w + h * h);
    const iyy = (totalMassKg / 12.0) * (L * L + h * h);
    const izz = (totalMassKg / 12.0) * (L * L + w * w);
    this.inertiaTensor.setDiagonal(ixx, iyy, izz);
    this.inverseInertiaTensor = this.inertiaTensor.inverse();
  }

  /** Total wheel angular momentum in the body frame [N*m*s] */
  getWheelMomentum() {
    const h = new Vector3(0, 0, 0);
    for (const w of this.reactionWheels) {
      h.add(w.axis.clone().multiplyScalar(w.momentumNms));
    }
    return h;
  }

  /** Total system angular momentum in the body frame: I*omega + h */
  getTotalAngularMomentumBody(omegaBody) {
    return Vector3.add(this.inertiaTensor.multiplyVector(omegaBody), this.getWheelMomentum());
  }

  setTargetAttitude(targetQuat) {
    this.targetQuaternion = targetQuat.clone().normalize();
    this.autopilotActive = true;
  }

  disableAutopilot() {
    this.autopilotActive = false;
  }

  /**
   * Manual wheel command: torque applied TO THE SPACECRAFT about the wheel axis [N*m].
   * (Positive = craft rotates toward +axis; the wheel spins up the opposite way.)
   */
  setReactionWheelTorque(wheelId, torqueNm) {
    const wheel = this.reactionWheels.find(w => w.id === wheelId);
    if (!wheel) throw new Error(`Reaction wheel ${wheelId} not found`);
    if (!Number.isFinite(torqueNm)) throw new Error('torque must be a finite number');
    wheel.commandedTorqueNm = Math.max(-wheel.maxTorqueNm, Math.min(wheel.maxTorqueNm, torqueNm));
    // A manual wheel command takes the craft out of autopilot hold.
    this.autopilotActive = false;
  }

  /**
   * Body-frame attitude error as a rotation vector (axis * angle) taking the craft toward the target.
   */
  computeAttitudeError(currentQuat) {
    // q_e = q_current^-1 (x) q_target : rotation, expressed in the BODY frame, that still has to be applied
    const qe = Quaternion.multiply(currentQuat.clone().conjugate(), this.targetQuaternion);
    const sign = qe.w < 0 ? -1 : 1; // shortest path
    const vx = qe.x * sign, vy = qe.y * sign, vz = qe.z * sign;
    const vNorm = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (vNorm < 1e-12) return new Vector3(0, 0, 0);
    const angle = 2 * Math.atan2(vNorm, qe.w * sign);
    return new Vector3(vx / vNorm * angle, vy / vNorm * angle, vz / vNorm * angle);
  }

  /**
   * Control law. Returns the torque the actuators should apply to the craft [body frame, N*m].
   * Evaluated once per physics step (zero-order hold across the integrator stages).
   */
  computeControlTorque(currentQuat, omegaBody) {
    if (this.autopilotActive) {
      const err = this.computeAttitudeError(currentQuat);
      const rateCmd = err.multiplyScalar(this.pid.kp);
      const rateMag = rateCmd.length();
      if (rateMag > this.pid.maxRateRadS) rateCmd.multiplyScalar(this.pid.maxRateRadS / rateMag);

      const alphaCmd = Vector3.subtract(rateCmd, omegaBody).multiplyScalar(this.pid.kd);
      const iAlpha = this.inertiaTensor.multiplyVector(alphaCmd);
      // Feed-forward cancellation of gyroscopic coupling (keeps response decoupled across axes)
      const hTot = this.getTotalAngularMomentumBody(omegaBody);
      const gyro = Vector3.cross(omegaBody, hTot);
      return Vector3.add(iAlpha, gyro);
    }

    const tau = new Vector3(0, 0, 0);
    for (const w of this.reactionWheels) {
      if (w.commandedTorqueNm) tau.add(w.axis.clone().multiplyScalar(w.commandedTorqueNm));
    }
    return tau;
  }

  /**
   * Plans an RCS-assisted momentum dump for this step.
   * While dumping, each wheel is driven toward zero momentum at `rateNmS` while an equal RCS torque
   * is applied to the craft in the opposite sense, so the craft's attitude is undisturbed but the
   * system's total angular momentum genuinely decreases (conservation requires an external torque).
   *
   * @returns {{wheelTorqueBody: Vector3, rcsTorqueBody: Vector3, hydrazineKg: number, active: boolean}}
   */
  planMomentumDump(dt, hydrazineAvailableKg) {
    const none = { wheelTorqueBody: new Vector3(), rcsTorqueBody: new Vector3(), hydrazineKg: 0, active: false };
    const md = this.momentumDump;
    if (!md.active) return none;

    if (hydrazineAvailableKg <= 0.001) {
      md.active = false;
      return { ...none, exhausted: true };
    }

    const wheelTorque = new Vector3();
    const rcsTorque = new Vector3();
    let anyAboveThreshold = false;
    let totalRcsTorqueMag = 0;

    for (const w of this.reactionWheels) {
      const threshold = md.completeFraction * w.maxMomentumNms;
      const h = w.momentumNms;
      if (Math.abs(h) <= threshold) continue;
      anyAboveThreshold = true;
      // do not overshoot through zero within this step
      const rate = Math.min(md.rateNmS, Math.abs(h) / dt);
      const dir = Math.sign(h);
      // wheel torque on craft = -dh/dt = +dir*rate ; RCS cancels it on the craft
      wheelTorque.add(w.axis.clone().multiplyScalar(dir * rate));
      rcsTorque.add(w.axis.clone().multiplyScalar(-dir * rate));
      totalRcsTorqueMag += rate;
    }

    if (!anyAboveThreshold) {
      md.active = false;
      return { ...none, complete: true };
    }

    // Hydrazine: F = tau / arm ; mdot = F / (Isp*g0)
    const forceN = totalRcsTorqueMag / md.rcsMomentArmM;
    let hydrazineKg = (forceN / (md.rcsIspS * CONSTANTS.G0)) * dt;
    if (hydrazineKg > hydrazineAvailableKg) {
      const scale = hydrazineAvailableKg / hydrazineKg;
      wheelTorque.multiplyScalar(scale);
      rcsTorque.multiplyScalar(scale);
      hydrazineKg = hydrazineAvailableKg;
    }
    return { wheelTorqueBody: wheelTorque, rcsTorqueBody: rcsTorque, hydrazineKg, active: true };
  }

  startMomentumDump() {
    this.momentumDump.active = true;
  }

  /**
   * Applies the requested actuator torque for one step: clamps by wheel torque capacity and health,
   * integrates wheel momentum (dh/dt = -tau), enforces momentum saturation.
   *
   * @param {Vector3} requestedTorqueBody - desired torque on the craft [N*m]
   * @returns {Vector3} torque actually delivered to the craft, held constant over the step
   */
  applyWheelTorque(requestedTorqueBody, dt) {
    const delivered = new Vector3(0, 0, 0);
    let powerW = 0;
    const req = requestedTorqueBody.toArray();

    for (let i = 0; i < this.reactionWheels.length; i++) {
      const wheel = this.reactionWheels[i];
      // wheels are body-axis aligned; project the request on this axis
      const axisComp = wheel.axis.x * req[0] + wheel.axis.y * req[1] + wheel.axis.z * req[2];
      const torqueLimit = wheel.maxTorqueNm * Math.max(0, Math.min(1, wheel.health));
      let tau = Math.max(-torqueLimit, Math.min(torqueLimit, axisComp));

      // dh/dt = -tau  (craft receives +tau)
      let hNew = wheel.momentumNms - tau * dt;
      if (Math.abs(hNew) > wheel.maxMomentumNms) {
        // Saturated: only the portion that brings h to the limit can be delivered
        hNew = Math.sign(hNew) * wheel.maxMomentumNms;
        tau = -(hNew - wheel.momentumNms) / dt;
      }
      wheel.momentumNms = hNew;
      wheel.saturated = Math.abs(hNew) >= wheel.maxMomentumNms * 0.999;

      delivered.add(wheel.axis.clone().multiplyScalar(tau));
      powerW += wheel.powerDrawW * Math.max(0, wheel.health) * (0.3 + 0.7 * Math.min(1, Math.abs(tau) / wheel.maxTorqueNm));
    }

    this.lastWheelPowerW = powerW;
    return delivered;
  }

  /** Gravity-gradient torque in the body frame: tau = 3*mu/r^5 * (r_b x (I r_b)) */
  computeGravityGradientTorque(rBodyRelInertial, currentQuat, mu) {
    if (!this.enableGravityGradient || !mu) return new Vector3(0, 0, 0);
    const rMag = rBodyRelInertial.length();
    if (rMag < 1000) return new Vector3(0, 0, 0);

    const rBody = currentQuat.inverseRotateVector(rBodyRelInertial);
    const factor = (3 * mu) / Math.pow(rMag, 5);
    const ir = this.inertiaTensor.multiplyVector(rBody);
    return Vector3.cross(rBody, ir).multiplyScalar(factor);
  }

  /** Solar radiation pressure torque: tau = r_cp x F_srp, F = (S/c) * Cr * A */
  computeSolarPressureTorque(sunDirInertial, currentQuat, solarFluxWm2) {
    if (!this.enableSRP || !sunDirInertial || !(solarFluxWm2 > 0)) return new Vector3(0, 0, 0);
    // Force pushes the craft AWAY from the sun
    const awayBody = currentQuat.inverseRotateVector(sunDirInertial).multiplyScalar(-1).normalize();
    const mag = (solarFluxWm2 / CONSTANTS.C) * this.srpReflectivity * this.srpAreaM2;
    return Vector3.cross(this.srpCenterOfPressureOffsetM, awayBody.multiplyScalar(mag));
  }

  /**
   * PURE Euler rigid-body equation with internal momentum wheels:
   *   alpha = I^-1 ( tau - omega x (I*omega + h) )
   * No state is modified. Safe for every RK4 stage.
   */
  computeAngularAcceleration(totalTorqueBody, omegaBody, wheelMomentumBody = null) {
    const iOmega = this.inertiaTensor.multiplyVector(omegaBody);
    const hTot = wheelMomentumBody ? Vector3.add(iOmega, wheelMomentumBody) : iOmega;
    const gyro = Vector3.cross(omegaBody, hTot);
    const net = Vector3.subtract(totalTorqueBody, gyro);
    return { alpha: this.inverseInertiaTensor.multiplyVector(net) };
  }

  /**
   * Sensor readout. Noise is a stateless function of the step index, so calling this any number of
   * times (telemetry polling) cannot change the simulation.
   */
  getSensors(trueOmega, trueQuat, stepIndex = 0) {
    const s = this.sensors;
    const n = (ch) => hashNoiseCentered(this.noiseSeed, stepIndex, ch) * 2 * s.gyroNoiseRadS;
    const measuredOmega = new Vector3(
      trueOmega.x + s.gyroBias.x + n(1),
      trueOmega.y + s.gyroBias.y + n(2),
      trueOmega.z + s.gyroBias.z + n(3)
    );

    return {
      measuredOmega,
      quaternion: trueQuat.clone(),
      eulerDegrees: trueQuat.toEulerDegrees(),
      wheels: this.reactionWheels.map(w => ({
        id: w.id,
        momentumNms: w.momentumNms,
        momentumRatio: Math.abs(w.momentumNms) / w.maxMomentumNms,
        isSaturated: Math.abs(w.momentumNms) >= w.maxMomentumNms * 0.98
      }))
    };
  }
}
