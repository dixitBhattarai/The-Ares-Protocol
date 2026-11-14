import { Vector3 } from '../math/Vector3.js';
import { CONSTANTS, CELESTIAL_BODIES } from '../config/constants.js';

/**
 * Deep Space Telecommunications System:
 * - Speed of light signal propagation delay: t_delay = d / c
 * - Line-of-sight ray-sphere geometric occultation against planets/moons
 * - High-Gain Antenna (HGA) pointing gain: G(theta) = G_max * exp(-k * theta^2)
 * - Free-space path loss and RF link budget
 * - Dynamic data rate computation
 * - Communication blackout triggers: planetary blockage, solar conjunction, re-entry plasma
 */
export class CommsSystem {
  constructor(config = {}) {
    this.highGainAntenna = {
      maxGainDbi: 38.0,
      pointingBeamwidthDeg: 4.5,
      currentAzimuthDeg: 0.0,
      currentElevationDeg: 0.0,
      targetVectorBody: new Vector3(1, 0, 0),
      autoTrackEarth: true
    };

    this.lowGainAntenna = {
      gainDbi: 6.0,
      omniDirectional: true
    };

    // Deep Space Network (DSN) ground station parameters
    this.rfFrequencyHz = 8.4e9; // 8.4 GHz (X-band deep space link)
    this.txPowerW = 50.0;       // 50W TWT transmitter
    this.maxDataRateBps = 4.0e6;// 4 Mbps nominal close to Earth

    this.warnings = [];
  }

  // Read-only views onto the latest computed link state. Older callers read these names straight off
  // the system; they now return real values (undefined until the first physics step) instead of
  // properties that were never set.
  get oneWayDelaySeconds() { return this.lastStatus?.oneWayDelaySeconds; }
  get roundTripDelaySeconds() { return this.lastStatus?.roundTripDelaySeconds; }
  get linkStatus() { return this.lastStatus?.linkStatus; }
  get dataRateKbps() { return this.lastStatus?.dataRateKbps; }
  get distanceToEarthKm() { return this.lastStatus?.distanceToEarthKm; }

  setAntennaPointing(azimuthDeg, elevationDeg) {
    this.highGainAntenna.currentAzimuthDeg = azimuthDeg;
    this.highGainAntenna.currentElevationDeg = elevationDeg;
    this.highGainAntenna.autoTrackEarth = false;
  }

  setAutoTrack(autoTrack = true) {
    this.highGainAntenna.autoTrackEarth = autoTrack;
  }

  /**
   * Ray-Sphere intersection to test if line between spacecraft and ground station is occulted
   * Ray: p(t) = P1 + t * (P2 - P1) with t in [0, 1]
   */
  checkOccultation(posSpacecraft, posEarth, occludingBodyPos, bodyRadiusM) {
    const dRay = Vector3.subtract(posEarth, posSpacecraft);
    const rayLength = dRay.length();
    if (rayLength < 1e-3) return false;

    const dRayNorm = dRay.clone().multiplyScalar(1 / rayLength);
    const scToBody = Vector3.subtract(occludingBodyPos, posSpacecraft);

    // Projection along ray
    const tProj = scToBody.dot(dRayNorm);
    if (tProj < 0 || tProj > rayLength) {
      // Body center is behind spacecraft or beyond Earth
      return false;
    }

    // Closest approach distance to body center
    const projPoint = Vector3.add(posSpacecraft, dRayNorm.clone().multiplyScalar(tProj));
    const distToCenter = Vector3.subtract(occludingBodyPos, projPoint).length();

    return distToCenter < bodyRadiusM;
  }

  /**
   * Evaluates Deep Space communications link
   * @param {Vector3} posSpacecraftInertial - Spacecraft heliocentric position [m]
   * @param {Vector3} posEarthInertial - Earth heliocentric position [m]
   * @param {Quaternion} orientationQuat - Spacecraft orientation
   * @param {Array<{pos: Vector3, radius: number, name: string}>} occludingBodies - Other celestial bodies
   * @param {number} dynamicPressurePa - Aerodynamic pressure (for re-entry plasma blackout)
   */
  /** Runs one step and keeps the result so REST/telemetry report real computed values. */
  update(posSpacecraftInertial, posEarthInertial, orientationQuat, occludingBodies = [], dynamicPressurePa = 0) {
    this.lastStatus = this._step(posSpacecraftInertial, posEarthInertial, orientationQuat, occludingBodies, dynamicPressurePa);
    return this.lastStatus;
  }

  _step(posSpacecraftInertial, posEarthInertial, orientationQuat, occludingBodies = [], dynamicPressurePa = 0) {
    this.warnings = [];

    // Vector from Spacecraft to Earth
    const scToEarth = Vector3.subtract(posEarthInertial, posSpacecraftInertial);
    const distanceToEarthM = scToEarth.length();

    // 1. Speed of light propagation delay: t = d / c
    const oneWayDelaySeconds = distanceToEarthM / CONSTANTS.C;

    // 2. Line of Sight Check (Occultation)
    let isBlocked = false;
    let blockingBodyName = null;

    for (const body of occludingBodies) {
      if (this.checkOccultation(posSpacecraftInertial, posEarthInertial, body.pos, body.radius)) {
        isBlocked = true;
        blockingBodyName = body.name;
        break;
      }
    }

    // 3. Solar Conjunction Blackout: Sun is between Earth and Spacecraft (< 2 degrees angle)
    const sunPos = new Vector3(0, 0, 0); // Sun origin
    const earthToSun = sunPos.clone().subtract(posEarthInertial);
    const earthToSc = Vector3.subtract(posSpacecraftInertial, posEarthInertial);
    // Sun-Earth-Spacecraft angle measured AT EARTH (the DSN antenna looking past the Sun)
    const angleScSunEarth = earthToSun.angleTo(earthToSc) * (180 / Math.PI);
    // Blackout only if the spacecraft is BEYOND the Sun along that line (superior conjunction)
    const isSolarConjunction = angleScSunEarth < 2.0 && earthToSc.length() > earthToSun.length();

    // 4. Re-entry Plasma Blackout (ionization layer blocks RF during atmospheric plunge)
    const isPlasmaBlackout = dynamicPressurePa > 15000;

    // 5. Antenna Pointing & Gain
    let pointingAngleDeg = 0;
    let pointingGainDbi = this.highGainAntenna.maxGainDbi;

    if (this.highGainAntenna.autoTrackEarth) {
      // Auto-tracking perfectly aligns dish with Earth
      pointingAngleDeg = 0.1;
    } else {
      // Antenna bore-sight vector in body frame: +X
      const antennaBodyDir = new Vector3(1, 0, 0);
      const antennaInertialDir = orientationQuat.rotateVector(antennaBodyDir).normalize();
      const trueEarthDir = scToEarth.clone().normalize();
      pointingAngleDeg = antennaInertialDir.angleTo(trueEarthDir) * (180 / Math.PI);

      // Gaussian beam roll-off
      const k = 2.77 / Math.pow(this.highGainAntenna.pointingBeamwidthDeg, 2);
      const gainReduction = 10 * Math.log10(Math.exp(-k * Math.pow(pointingAngleDeg, 2)) + 1e-6);
      pointingGainDbi = Math.max(-10, this.highGainAntenna.maxGainDbi + gainReduction);
    }

    // 6. Free-Space Path Loss & Link Budget
    // FSPL [dB] = 20 * log10(4 * pi * d / lambda)
    const wavelengthM = CONSTANTS.C / this.rfFrequencyHz;
    const pathLossDb = 20 * Math.log10((4 * Math.PI * Math.max(1000, distanceToEarthM)) / wavelengthM);

    // Effective Received Signal Margin & Data Rate
    const refDistance = 1.0e8; // 100,000 km reference for max data rate
    const distRatio = refDistance / Math.max(refDistance, distanceToEarthM);
    let dataRateBps = this.maxDataRateBps * (distRatio * distRatio);

    if (pointingGainDbi < 10) {
      dataRateBps *= 0.1; // Significant degradation from antenna misalignment
    }

    // Blackout resolution
    let linkStatus = 'NOMINAL';
    if (isBlocked) {
      linkStatus = `OCCULTED_BY_${blockingBodyName.toUpperCase()}`;
      dataRateBps = 0;
      this.warnings.push({
        level: 'WARNING',
        message: `COMMUNICATION BLACKOUT: Line of sight blocked by ${blockingBodyName}`
      });
    } else if (isSolarConjunction) {
      linkStatus = 'SOLAR_CONJUNCTION_BLACKOUT';
      dataRateBps = 0;
      this.warnings.push({
        level: 'WARNING',
        message: `COMMUNICATION BLACKOUT: Solar Conjunction (Sun between Earth and Spacecraft)`
      });
    } else if (isPlasmaBlackout) {
      linkStatus = 'PLASMA_REENTRY_BLACKOUT';
      dataRateBps = 0;
      this.warnings.push({
        level: 'WARNING',
        message: `COMMUNICATION BLACKOUT: Atmospheric re-entry plasma sheath blocking RF signals`
      });
    }

    return {
      linkStatus,
      isBlocked,
      oneWayDelaySeconds,
      roundTripDelaySeconds: oneWayDelaySeconds * 2.0,
      distanceToEarthKm: distanceToEarthM / 1000.0,
      pathLossDb,
      pointingAngleDeg,
      effectiveGainDbi: pointingGainDbi,
      dataRateBps,
      dataRateKbps: dataRateBps / 1000.0,
      warnings: this.warnings
    };
  }
}
