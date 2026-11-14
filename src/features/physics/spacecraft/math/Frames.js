import { Vector3 } from './Vector3.js';
import { quatFromBasis, quatPointingAxis } from './Rotations.js';

/**
 * Coordinate Frame Transformations:
 * 1. Heliocentric Inertial -> Planet-Centered Inertial
 * 2. Inertial -> Body Frame (using spacecraft orientation Quaternion)
 * 3. Inertial -> LVLH (Local Vertical, Local Horizontal)
 * 4. Planet-fixed (rotating) <-> Inertial, surface-relative velocity
 * 5. Local East-Up-South surface basis (matches src/contact/LocalFrame.js)
 *
 * Planet spin convention: every body rotates about inertial +Z, the same axis
 * Atmosphere.js uses to build its co-rotating wind.
 */
export class Frames {
  /**
   * Converts heliocentric position/velocity to planet-centered position/velocity
   */
  static helioToPlanetCentered(posHelio, velHelio, planetPosHelio, planetVelHelio) {
    return {
      posPlanet: Vector3.subtract(posHelio, planetPosHelio),
      velPlanet: Vector3.subtract(velHelio, planetVelHelio)
    };
  }

  /**
   * Converts planet-centered position/velocity to heliocentric
   */
  static planetCenteredToHelio(posPlanet, velPlanet, planetPosHelio, planetVelHelio) {
    return {
      posHelio: Vector3.add(posPlanet, planetPosHelio),
      velHelio: Vector3.add(velPlanet, planetVelHelio)
    };
  }

  /**
   * Transform vector from Spacecraft Body Frame to Inertial Frame
   */
  static bodyToInertial(vecBody, orientationQuat) {
    return orientationQuat.rotateVector(vecBody);
  }

  /**
   * Transform vector from Inertial Frame to Spacecraft Body Frame
   */
  static inertialToBody(vecInertial, orientationQuat) {
    return orientationQuat.inverseRotateVector(vecInertial);
  }

  /**
   * Computes the LVLH (Local Vertical Local Horizontal) frame basis vectors in inertial frame:
   * - Z_lvlh: Nadir (towards planet center: -r / |r|)
   * - Y_lvlh: Orbit normal (-h / |h| where h = r x v)
   * - X_lvlh: Completes right-handed system (roughly velocity direction / prograde)
   */
  static computeLVLHBasis(rInertial, vInertial) {
    const rMag = rInertial.length();
    if (rMag < 1e-5) {
      return {
        x: new Vector3(1, 0, 0),
        y: new Vector3(0, 1, 0),
        z: new Vector3(0, 0, 1)
      };
    }

    // Z points to center of Earth (nadir)
    const zLVLH = rInertial.clone().multiplyScalar(-1 / rMag);

    // h = r x v (angular momentum vector)
    const h = Vector3.cross(rInertial, vInertial);
    const hMag = h.length();
    let yLVLH;
    if (hMag > 1e-5) {
      yLVLH = h.clone().multiplyScalar(-1 / hMag);
    } else {
      yLVLH = new Vector3(0, 1, 0);
    }

    // X = Y x Z completes right-handed system (velocity-aligned for circular orbit)
    const xLVLH = Vector3.cross(yLVLH, zLVLH).normalize();

    return { x: xLVLH, y: yLVLH, z: zLVLH };
  }

  /**
   * LVLH -> inertial orientation as a quaternion (columns are the LVLH axes).
   * A spacecraft whose quaternion equals this has its body axes aligned with LVLH.
   */
  static lvlhQuaternion(rInertial, vInertial) {
    const b = Frames.computeLVLHBasis(rInertial, vInertial);
    return quatFromBasis(b.x, b.y, b.z);
  }

  /**
   * Inertial attitude target that points a body axis along a standard orbital direction.
   * Feed the result to AttitudeSystem.setTargetAttitude for "hold prograde" style modes.
   *
   * @param {Vector3} rInertial planet-centred position [m]
   * @param {Vector3} vInertial planet-centred velocity [m/s]
   * @param {'prograde'|'retrograde'|'radial_out'|'nadir'|'normal'|'antinormal'} mode
   * @param {Vector3} [bodyAxis=+X] body axis to point (+X is the main engine axis in this project)
   */
  static attitudeTarget(rInertial, vInertial, mode, bodyAxis = new Vector3(1, 0, 0)) {
    const rHat = rInertial.clone().normalize();
    const h = Vector3.cross(rInertial, vInertial);
    const hHat = h.lengthSq() > 1e-12 ? h.clone().normalize() : new Vector3(0, 0, 1);
    const vHat = vInertial.lengthSq() > 1e-12 ? vInertial.clone().normalize() : Vector3.cross(hHat, rHat).normalize();

    switch (mode) {
      case 'prograde':
        return quatPointingAxis(bodyAxis, vHat, hHat);
      case 'retrograde':
        return quatPointingAxis(bodyAxis, vHat.clone().multiplyScalar(-1), hHat);
      case 'radial_out':
        return quatPointingAxis(bodyAxis, rHat, hHat);
      case 'nadir':
        return quatPointingAxis(bodyAxis, rHat.clone().multiplyScalar(-1), hHat);
      case 'normal':
        return quatPointingAxis(bodyAxis, hHat, vHat);
      case 'antinormal':
        return quatPointingAxis(bodyAxis, hHat.clone().multiplyScalar(-1), vHat);
      default:
        throw new Error(`Frames.attitudeTarget: unknown mode "${mode}"`);
    }
  }

  // ---------------------------------------------------------------------------
  // Planet-fixed (rotating) frame
  // ---------------------------------------------------------------------------

  /** Planet angular velocity vector in inertial coordinates [rad/s]; zero for a non-rotating body. */
  static planetOmegaVector(rotationPeriodS) {
    const omega = rotationPeriodS > 0 ? (2 * Math.PI) / rotationPeriodS : 0;
    return new Vector3(0, 0, omega);
  }

  /** Inertial velocity of the surface point directly under position r: omega x r. */
  static surfaceVelocityInertial(rInertial, omegaVec) {
    return Vector3.cross(omegaVec, rInertial);
  }

  /** Velocity relative to the rotating surface/atmosphere: v - omega x r. */
  static surfaceRelativeVelocity(rInertial, vInertial, omegaVec) {
    return Vector3.subtract(vInertial, Vector3.cross(omegaVec, rInertial));
  }

  /** Rotate an inertial vector into the planet-fixed frame at spin angle theta [rad]. */
  static inertialToPlanetFixed(vec, spinAngleRad) {
    const c = Math.cos(spinAngleRad), s = Math.sin(spinAngleRad);
    return new Vector3(c * vec.x + s * vec.y, -s * vec.x + c * vec.y, vec.z);
  }

  /** Rotate a planet-fixed vector into the inertial frame at spin angle theta [rad]. */
  static planetFixedToInertial(vec, spinAngleRad) {
    const c = Math.cos(spinAngleRad), s = Math.sin(spinAngleRad);
    return new Vector3(c * vec.x - s * vec.y, s * vec.x + c * vec.y, vec.z);
  }

  /**
   * Local East / Up / South unit vectors (inertial coordinates) at an inertial position.
   * Right-handed and identical to src/contact/LocalFrame.js (x = East, y = Up, z = South).
   * At a pole, East is arbitrarily +X.
   */
  static enuBasis(rInertial) {
    const up = rInertial.clone().normalize();
    let east = Vector3.cross(new Vector3(0, 0, 1), up);
    east = east.lengthSq() < 1e-18 ? new Vector3(1, 0, 0) : east.normalize();
    const north = Vector3.cross(up, east);
    return { east, up, south: north.clone().multiplyScalar(-1) };
  }
}
