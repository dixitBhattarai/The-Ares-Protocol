import { Vector3 } from '../math/Vector3.js';
import { Quaternion } from '../math/Quaternion.js';

/**
 * Numerical State Integrator:
 * - RK4 (Runge-Kutta 4th Order) for coupled translation, rotation, and mass flow
 * - Velocity Verlet for long orbital propagation
 * - Substepping for deterministic time-warp acceleration
 */
export class Integrator {
  /**
   * RK4 Step for full 6-DOF spacecraft physical state:
   * state: { pos: Vector3, vel: Vector3, quat: Quaternion, omega: Vector3, mass: number }
   * computeDerivatives: fn(state, t) => { dPos: vel, dVel: acc, dQuat: dq, dOmega: alpha, dMass: dm }
   */
  static stepRK4(state, dt, t, computeDerivatives) {
    // k1 = f(x, t)
    const k1 = computeDerivatives(state, t);

    // State for k2: x + 0.5 * dt * k1
    const s2 = this.advanceState(state, k1, 0.5 * dt);
    const k2 = computeDerivatives(s2, t + 0.5 * dt);

    // State for k3: x + 0.5 * dt * k2
    const s3 = this.advanceState(state, k2, 0.5 * dt);
    const k3 = computeDerivatives(s3, t + 0.5 * dt);

    // State for k4: x + dt * k3
    const s4 = this.advanceState(state, k3, dt);
    const k4 = computeDerivatives(s4, t + dt);

    // Blend: x_next = x + (dt / 6) * (k1 + 2*k2 + 2*k3 + k4)
    const dt6 = dt / 6.0;

    const nextPos = new Vector3(
      state.pos.x + dt6 * (k1.dPos.x + 2 * k2.dPos.x + 2 * k3.dPos.x + k4.dPos.x),
      state.pos.y + dt6 * (k1.dPos.y + 2 * k2.dPos.y + 2 * k3.dPos.y + k4.dPos.y),
      state.pos.z + dt6 * (k1.dPos.z + 2 * k2.dPos.z + 2 * k3.dPos.z + k4.dPos.z)
    );

    const nextVel = new Vector3(
      state.vel.x + dt6 * (k1.dVel.x + 2 * k2.dVel.x + 2 * k3.dVel.x + k4.dVel.x),
      state.vel.y + dt6 * (k1.dVel.y + 2 * k2.dVel.y + 2 * k3.dVel.y + k4.dVel.y),
      state.vel.z + dt6 * (k1.dVel.z + 2 * k2.dVel.z + 2 * k3.dVel.z + k4.dVel.z)
    );

    const nextQuat = new Quaternion(
      state.quat.w + dt6 * (k1.dQuat.w + 2 * k2.dQuat.w + 2 * k3.dQuat.w + k4.dQuat.w),
      state.quat.x + dt6 * (k1.dQuat.x + 2 * k2.dQuat.x + 2 * k3.dQuat.x + k4.dQuat.x),
      state.quat.y + dt6 * (k1.dQuat.y + 2 * k2.dQuat.y + 2 * k3.dQuat.y + k4.dQuat.y),
      state.quat.z + dt6 * (k1.dQuat.z + 2 * k2.dQuat.z + 2 * k3.dQuat.z + k4.dQuat.z)
    ).normalize(); // Strict normalization per specification!

    const nextOmega = new Vector3(
      state.omega.x + dt6 * (k1.dOmega.x + 2 * k2.dOmega.x + 2 * k3.dOmega.x + k4.dOmega.x),
      state.omega.y + dt6 * (k1.dOmega.y + 2 * k2.dOmega.y + 2 * k3.dOmega.y + k4.dOmega.y),
      state.omega.z + dt6 * (k1.dOmega.z + 2 * k2.dOmega.z + 2 * k3.dOmega.z + k4.dOmega.z)
    );

    const nextMass = Math.max(0.1, state.mass + dt6 * (k1.dMass + 2 * k2.dMass + 2 * k3.dMass + k4.dMass));

    return {
      pos: nextPos,
      vel: nextVel,
      quat: nextQuat,
      omega: nextOmega,
      mass: nextMass
    };
  }

  /**
   * Helper to compute state + scale * derivative
   */
  static advanceState(state, deriv, scale) {
    return {
      pos: new Vector3(
        state.pos.x + deriv.dPos.x * scale,
        state.pos.y + deriv.dPos.y * scale,
        state.pos.z + deriv.dPos.z * scale
      ),
      vel: new Vector3(
        state.vel.x + deriv.dVel.x * scale,
        state.vel.y + deriv.dVel.y * scale,
        state.vel.z + deriv.dVel.z * scale
      ),
      quat: new Quaternion(
        state.quat.w + deriv.dQuat.w * scale,
        state.quat.x + deriv.dQuat.x * scale,
        state.quat.y + deriv.dQuat.y * scale,
        state.quat.z + deriv.dQuat.z * scale
      ).normalize(),
      omega: new Vector3(
        state.omega.x + deriv.dOmega.x * scale,
        state.omega.y + deriv.dOmega.y * scale,
        state.omega.z + deriv.dOmega.z * scale
      ),
      mass: Math.max(0.1, state.mass + deriv.dMass * scale)
    };
  }

  /**
   * Velocity Verlet step for conservative gravitational motion:
   * v(t + dt/2) = v(t) + 0.5 * a(t) * dt
   * r(t + dt)   = r(t) + v(t + dt/2) * dt
   * a(t + dt)   = a(r(t + dt))
   * v(t + dt)   = v(t + dt/2) + 0.5 * a(t + dt) * dt
   */
  static stepVelocityVerlet(pos, vel, dt, computeAcc) {
    const a0 = computeAcc(pos);
    const halfDt = 0.5 * dt;

    const vHalf = new Vector3(
      vel.x + a0.x * halfDt,
      vel.y + a0.y * halfDt,
      vel.z + a0.z * halfDt
    );

    const nextPos = new Vector3(
      pos.x + vHalf.x * dt,
      pos.y + vHalf.y * dt,
      pos.z + vHalf.z * dt
    );

    const a1 = computeAcc(nextPos);

    const nextVel = new Vector3(
      vHalf.x + a1.x * halfDt,
      vHalf.y + a1.y * halfDt,
      vHalf.z + a1.z * halfDt
    );

    return { pos: nextPos, vel: nextVel, acc: a1 };
  }
}
