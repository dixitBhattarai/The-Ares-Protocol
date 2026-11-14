import { Vector3 } from '../math/Vector3.js';
import { CONSTANTS } from '../config/constants.js';

/**
 * Landing, Docking & Structural Stress System:
 * - Planetary surface touchdown physics & safe landing envelope validation
 * - Spacecraft touchdown damage equations
 * - Orbital Docking approach corridor evaluation (ISS / Lunar Gateway target)
 * - Vehicle proper acceleration and g-load structural limits (Max-G)
 */
export class LandingDockingSystem {
  constructor(config = {}) {
    // Landing criteria per specification Section 7.2
    this.landingLimits = {
      maxVerticalSpeedMS: 2.0,
      maxHorizontalSpeedMS: 0.5,
      maxTiltDeg: 10.0,
      maxSlopeDeg: 15.0,
      maxImpactG: 4.0
    };

    // Docking corridor criteria per specification Section 7.3
    this.dockingLimits = {
      maxApproachSpeedMS: 0.20,
      maxLateralSpeedMS: 0.05,
      maxLateralOffsetM: 0.20,
      maxAngularErrorDeg: 5.0,
      maxAngularRateDegS: 1.0
    };

    // Structural limit
    this.maxStructuralG = config.maxG ?? 6.0;

    this.state = 'IN_FLIGHT'; // 'IN_FLIGHT', 'LANDED', 'CRASHED', 'DOCKED'
    this.dockedTarget = null;
    this.landingDamage = 0;
    this.structuralHealth = 1.0;
  }

  /**
   * Classify a touchdown from its impact conditions (all measured RELATIVE TO THE GROUND).
   * Pure: does not change state.
   */
  assessImpact({ descentSpeedMS, horizontalSpeedMS, tiltDeg, slopeDeg = 0 }) {
    const L = this.landingLimits;
    const safeVertical = descentSpeedMS <= L.maxVerticalSpeedMS;
    const safeHorizontal = horizontalSpeedMS <= L.maxHorizontalSpeedMS;
    const safeTilt = tiltDeg <= L.maxTiltDeg;
    const safeSlope = slopeDeg <= L.maxSlopeDeg;
    const isSafe = safeVertical && safeHorizontal && safeTilt && safeSlope;

    // damage = kv*vv^2 + kh*vh^2 + kt*theta^2 (+ slope term), spec section 7.2
    const kv = 0.12, kh = 0.25, kTheta = 0.005, kSlope = 0.002;
    const excessV = Math.max(0, descentSpeedMS - L.maxVerticalSpeedMS * 0.5);
    const damage = isSafe ? 0 : Math.min(1.0,
      kv * excessV * excessV +
      kh * horizontalSpeedMS * horizontalSpeedMS +
      kTheta * tiltDeg * tiltDeg +
      kSlope * slopeDeg * slopeDeg
    );
    return { isSafe, safeVertical, safeHorizontal, safeTilt, safeSlope, damage };
  }

  /** Commit a touchdown result to state. A crash is permanent until reset(). */
  commitTouchdown(assessment) {
    if (this.state === 'CRASHED') return this.state;
    if (assessment.isSafe) {
      this.state = 'LANDED';
    } else {
      this.state = 'CRASHED';
      this.landingDamage = assessment.damage;
      this.structuralHealth = Math.max(0, this.structuralHealth - assessment.damage);
    }
    return this.state;
  }

  setInFlight() {
    if (this.state === 'LANDED' || this.state === 'TOUCHDOWN') this.state = 'IN_FLIGHT';
  }

  reset() {
    this.state = 'IN_FLIGHT';
    this.dockedTarget = null;
    this.landingDamage = 0;
    this.structuralHealth = 1.0;
  }

  /**
   * Analytic touchdown evaluation (used when no contact simulation is active, and for hypervelocity
   * impacts that must not be handed to the rigid-body solver).
   *
   * @param {Vector3} rBodyRel - position relative to planet centre [m]
   * @param {Vector3} vBodyRel - velocity in the planet-centred inertial frame [m/s]
   * @param {Quaternion} quat - body -> inertial orientation
   * @param {number} planetRadiusM
   * @param {{spinRadS?: number, slopeDeg?: number}} options - planet spin about +Z (the ground moves
   *        beneath the craft at spin x r) and local terrain slope
   */
  evaluateTouchdown(rBodyRel, vBodyRel, quat, planetRadiusM, options = {}) {
    const distToCenter = rBodyRel.length();
    const altitudeM = distToCenter - planetRadiusM;

    if (altitudeM > 0.01) {
      return { inContact: false, altitudeM, state: this.state };
    }
    if (this.state === 'CRASHED') {
      return { inContact: true, altitudeM, state: this.state, damage: this.landingDamage, isSafe: false };
    }

    const upUnit = rBodyRel.clone().normalize();

    // Velocity relative to the (rotating) ground: v - Omega x r
    const spin = options.spinRadS || 0;
    const groundVel = new Vector3(-spin * rBodyRel.y, spin * rBodyRel.x, 0);
    const vRel = Vector3.subtract(vBodyRel, groundVel);

    const vVert = vRel.dot(upUnit);
    const vHoriz = Vector3.subtract(vRel, upUnit.clone().multiplyScalar(vVert)).length();

    const scUp = quat.rotateVector(new Vector3(1, 0, 0)).normalize();
    const tiltDeg = scUp.angleTo(upUnit) * (180 / Math.PI);
    const descentSpeedMS = Math.abs(Math.min(0, vVert));

    const assessment = this.assessImpact({
      descentSpeedMS, horizontalSpeedMS: vHoriz, tiltDeg, slopeDeg: options.slopeDeg || 0
    });
    this.commitTouchdown(assessment);

    return {
      inContact: true,
      altitudeM: 0,
      isSafe: assessment.isSafe,
      descentSpeedMS,
      horizontalSpeedMS: vHoriz,
      tiltDeg,
      damage: this.landingDamage,
      state: this.state
    };
  }

  /**
   * Evaluates orbital docking approach against a target spacecraft / station port
   * @param {Vector3} rRelToTarget - Relative displacement vector [m]
   * @param {Vector3} vRelToTarget - Relative velocity vector [m/s]
   * @param {Quaternion} quat - Spacecraft orientation
   * @param {Quaternion} targetQuat - Target port orientation
   */
  evaluateDocking(rRelToTarget, vRelToTarget, quat, targetQuat) {
    const distM = rRelToTarget.length();

    if (distM > 10.0) {
      return { canDock: false, distanceM: distM, state: this.state };
    }

    // Approach axis (target port forward vector)
    const portNormal = targetQuat.rotateVector(new Vector3(1, 0, 0)).normalize();
    const approachSpeedMS = -vRelToTarget.dot(portNormal);

    // Lateral components
    const axialDisplacement = rRelToTarget.dot(portNormal);
    const lateralOffsetVec = Vector3.subtract(rRelToTarget, portNormal.clone().multiplyScalar(axialDisplacement));
    const lateralOffsetM = lateralOffsetVec.length();

    const lateralSpeedVec = Vector3.subtract(vRelToTarget, portNormal.clone().multiplyScalar(-approachSpeedMS));
    const lateralSpeedMS = lateralSpeedVec.length();

    // Angular alignment between craft forward and port forward
    const scForward = quat.rotateVector(new Vector3(1, 0, 0)).normalize();
    const opposingPort = portNormal.clone().multiplyScalar(-1);
    const angularMisalignmentDeg = scForward.angleTo(opposingPort) * (180 / Math.PI);

    // Check thresholds
    const isCorridorMet =
      Math.abs(axialDisplacement) <= 0.3 &&
      approachSpeedMS <= this.dockingLimits.maxApproachSpeedMS &&
      approachSpeedMS >= 0.01 &&
      lateralOffsetM <= this.dockingLimits.maxLateralOffsetM &&
      lateralSpeedMS <= this.dockingLimits.maxLateralSpeedMS &&
      angularMisalignmentDeg <= this.dockingLimits.maxAngularErrorDeg;

    if (isCorridorMet) {
      this.state = 'DOCKED';
    }

    return {
      canDock: isCorridorMet,
      distanceM: distM,
      approachSpeedMS,
      lateralOffsetM,
      lateralSpeedMS,
      angularMisalignmentDeg,
      state: this.state
    };
  }

  /**
   * Structural stress and g-load monitoring: a_g = |a_proper| / g0
   */
  checkStructuralStress(properAcceleration) {
    const aMag = properAcceleration.length();
    const gLoad = aMag / CONSTANTS.G0;

    if (gLoad > this.maxStructuralG) {
      const overstress = gLoad - this.maxStructuralG;
      this.structuralHealth = Math.max(0, this.structuralHealth - overstress * 0.05);
      return {
        gLoad,
        overstressed: true,
        structuralHealth: this.structuralHealth
      };
    }

    return {
      gLoad,
      overstressed: false,
      structuralHealth: this.structuralHealth
    };
  }
}
