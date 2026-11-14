import { Vector3 } from '../math/Vector3.js';
import { Quaternion } from '../math/Quaternion.js';
import { CELESTIAL_BODIES } from './constants.js';

/**
 * Standard NASA mission presets.
 *
 * Body frame reminder: +X is the thrust/nose axis, the engine and heat shield are aft (-X).
 * `facing(dir)` returns the orientation (in the XY plane) that points body +X along `dir`.
 * `spacecraft.propulsion` is a FACTORY so every load gets fresh tank/engine objects.
 */

function facing(dir) {
  const ang = Math.atan2(dir.y, dir.x);
  return new Quaternion(Math.cos(ang / 2), 0, 0, Math.sin(ang / 2));
}

/** Build a bipropellant loadout (oxidizer:fuel by mass = mixtureRatio) with a default RCS system */
function loadout({ oxKg, fuelKg, monoKg = 600, thrustN = 45000, minThrottle = 0.3, mixtureRatio = 5.0 }) {
  return () => ({
    tanks: [
      {
        id: 'main_lox_tank', name: 'Oxidizer Tank', propellant: 'LOX', role: 'oxidizer',
        capacityKg: oxKg * 1.1, currentMassKg: oxKg, usableMassKg: oxKg * 0.99, residualMassKg: oxKg * 0.01,
        temperatureK: 90, pressurePa: 250000, boilOffRateKgS: 0.00002, leakRateKgS: 0, health: 1
      },
      {
        id: 'main_fuel_tank', name: 'Fuel Tank', propellant: 'LH2', role: 'fuel',
        capacityKg: fuelKg * 1.1, currentMassKg: fuelKg, usableMassKg: fuelKg * 0.99, residualMassKg: fuelKg * 0.01,
        temperatureK: 20, pressurePa: 220000, boilOffRateKgS: 0.00004, leakRateKgS: 0, health: 1
      },
      {
        id: 'rcs_hydrazine_tank', name: 'RCS Monopropellant Tank', propellant: 'Hydrazine', role: 'monoprop',
        capacityKg: monoKg * 1.1, currentMassKg: monoKg, usableMassKg: monoKg * 0.99, residualMassKg: monoKg * 0.01,
        temperatureK: 290, pressurePa: 1800000, boilOffRateKgS: 0, leakRateKgS: 0, health: 1
      }
    ],
    engines: [
      {
        id: 'main_engine_1', name: 'Main Engine', type: 'bipropellant',
        maxThrustN: thrustN, minThrottle, throttle: 0, ignited: false,
        ispVacuumS: 348, ispSeaLevelS: 312, mixtureRatio,
        gimbalRangeDeg: 6, gimbalPitchDeg: 0, gimbalYawDeg: 0,
        powerDrawW: 1200, heatGenW: 25000, health: 1
      }
    ]
  });
}

const marsEntryVel = new Vector3(-800, 5200, 0);

export const MISSION_PRESETS = {
  EARTH_LAUNCH_ASCENT: {
    id: 'earth_launch_ascent',
    name: 'Earth Launch Ascent - surface',
    description: 'Simplified powered ascent from the launch pad. The game compresses the burn and does not model a real launch vehicle.',
    primaryBodyId: 'earth',
    spacecraft: {
      dryMassKg: 55000,
      pos: new Vector3(CELESTIAL_BODIES.EARTH.radius, 0, 0),
      vel: new Vector3(0, 0, 0),
      quat: new Quaternion(1, 0, 0, 0),
      omega: new Vector3(0, 0, 0),
      propulsion: loadout({ oxKg: 180000, fuelKg: 36000, monoKg: 1200, thrustN: 3200000, minThrottle: 0.25, mixtureRatio: 5.0 })
    }
  },

  LEO_CIRCULAR: {
    id: 'leo_circular',
    name: 'Low Earth Orbit (LEO) - 400 km',
    description: 'Circular orbital flight at 400 km altitude above Earth. Test reaction wheels, orbital maneuvers, and line-of-sight communications.',
    primaryBodyId: 'earth',
    spacecraft: {
      dryMassKg: 12500,
      pos: new Vector3(CELESTIAL_BODIES.EARTH.radius + 400000, 0, 0),
      // Circular speed = sqrt(mu / r) along +Y
      vel: new Vector3(0, Math.sqrt(CELESTIAL_BODIES.EARTH.mu / (CELESTIAL_BODIES.EARTH.radius + 400000)), 0),
      quat: new Quaternion(1, 0, 0, 0),
      omega: new Vector3(0, 0, 0),
      // LOX 12 t + LH2 2.4 t main stage: ~2.5 km/s of delta-v for orbit manoeuvres
      propulsion: loadout({ oxKg: 12000, fuelKg: 2400, monoKg: 750, thrustN: 45000, minThrottle: 0.3 })
    }
  },

  LUNAR_LANDING_DESCENT: {
    id: 'lunar_landing_descent',
    name: 'Apollo Lunar Landing Descent - 15 km',
    description: 'Final powered descent phase above the Moon. Modulate engine throttle and RCS to achieve safe touchdown (vertical speed < 2 m/s, tilt < 10 deg).',
    primaryBodyId: 'moon',
    spacecraft: {
      dryMassKg: 5000,
      // 15 km above the lunar surface, engine pointing up (+X = local vertical)
      pos: new Vector3(0, CELESTIAL_BODIES.MOON.radius + 15000, 0),
      vel: new Vector3(150, -40, 0), // horizontal approach and moderate descent
      quat: facing(new Vector3(0, 1, 0)),
      omega: new Vector3(0, 0, 0),
      // ~3.4 t of propellant gives ~1 km/s: enough to kill ~150 m/s and land with margin; TWR ~2.4 at full load
      propulsion: loadout({ oxKg: 2850, fuelKg: 570, monoKg: 400, thrustN: 45000, minThrottle: 0.15 })
    }
  },

  MARS_ATMOSPHERIC_ENTRY: {
    id: 'mars_atmospheric_entry',
    name: 'Mars Entry, Descent & Landing (EDL)',
    description: 'Atmospheric entry at 5.3 km/s through the Martian atmosphere. Manage aerodynamic heating, deceleration loads, and deploy supersonic parachutes.',
    primaryBodyId: 'mars',
    spacecraft: {
      dryMassKg: 2200,
      payloadMassKg: 800,
      // 90 km entry interface altitude above Mars
      pos: new Vector3(CELESTIAL_BODIES.MARS.radius + 90000, 0, 0),
      vel: marsEntryVel,
      // Heat shield (aft, -X) leading: nose points opposite to the velocity
      quat: facing(marsEntryVel.clone().multiplyScalar(-1).normalize()),
      omega: new Vector3(0, 0, 0),
      // Large aeroshell (4.5 m) keeps the ballistic coefficient survivable at ~6 t
      aero: { frontalAreaM2: Math.PI * 2.25 * 2.25, noseRadiusM: 2.0 },
      // Landing burn needs deep throttle: ~80 kN class engine, 15% minimum
      propulsion: loadout({ oxKg: 1500, fuelKg: 300, monoKg: 300, thrustN: 80000, minThrottle: 0.15 })
    }
  },

  MARS_POWERED_DESCENT: {
    id: 'mars_powered_descent',
    name: 'Mars Powered Descent - 5 km',
    description: 'A compressed final descent with a simple landing-control sequence. It is an authored game scenario, not a real flight plan.',
    primaryBodyId: 'mars',
    spacecraft: {
      dryMassKg: 2200,
      payloadMassKg: 800,
      pos: new Vector3(CELESTIAL_BODIES.MARS.radius + 5000, 0, 0),
      vel: new Vector3(-110, 35, 0),
      quat: new Quaternion(1, 0, 0, 0),
      omega: new Vector3(0, 0, 0),
      aero: { frontalAreaM2: 28, noseRadiusM: 2.0 },
      propulsion: loadout({ oxKg: 1500, fuelKg: 300, monoKg: 300, thrustN: 80000, minThrottle: 0.15 })
    }
  },

  EARTH_MARS_TRANSFER: {
    id: 'earth_mars_transfer',
    name: 'Interplanetary Heliocentric Cruise',
    description: 'Deep-space cruise along an Earth-to-Mars Hohmann transfer. Manage speed-of-light comms delay, solar storms, and thermal radiation balance.',
    primaryBodyId: 'sun',
    spacecraft: {
      dryMassKg: 18000,
      // Mid-transfer position at ~1.25 AU
      pos: new Vector3(1.25 * 1.49598e11, 0.3 * 1.49598e11, 0),
      vel: new Vector3(-6000, 26000, 0),
      quat: new Quaternion(1, 0, 0, 0),
      omega: new Vector3(0, 0, 0),
      propulsion: loadout({ oxKg: 12000, fuelKg: 2400, monoKg: 750 })
    }
  }
};
