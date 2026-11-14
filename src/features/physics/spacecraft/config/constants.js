/**
 * Physical and Astrodynamical Constants
 * Adheres to NASA / CODATA standards with 64-bit IEEE-754 precision.
 */

export const CONSTANTS = {
  // Fundamental Physical Constants
  G: 6.67430e-11,             // Gravitational constant [m^3 kg^-1 s^-2]
  G0: 9.80665,                // Standard Earth gravitational acceleration at sea level [m/s^2]
  C: 2.99792458e8,            // Speed of light in vacuum [m/s]
  SIGMA: 5.670374419e-8,      // Stefan-Boltzmann radiation constant [W m^-2 K^-4]
  AU: 1.495978707e11,         // Astronomical Unit [m]
  SOLAR_IRRADIANCE_1AU: 1361.0,// Solar irradiance at 1 AU [W/m^2]
  SPACE_TEMP_K: 2.725,        // Cosmic microwave background temperature [K]
  GAS_CONSTANT_R: 8.314462618,// Universal gas constant [J/(mol·K)]

  // Atmospheric reference
  STD_ATM_PRESSURE: 101325.0, // Standard atmospheric pressure [Pa]
  STD_ATM_TEMP: 288.15,       // Standard sea-level temperature [K]
  MOLAR_MASS_AIR: 0.0289647,  // Dry air molar mass [kg/mol]
  MOLAR_MASS_O2: 0.0319988,   // Oxygen molar mass [kg/mol]
  MOLAR_MASS_CO2: 0.04401,    // Carbon dioxide molar mass [kg/mol]
  MOLAR_MASS_N2: 0.0280134,   // Nitrogen molar mass [kg/mol]

  // Time standards
  SECONDS_PER_DAY: 86400,
  JULIAN_EPOCH_OFFSET: 2440587.5
};

export const CELESTIAL_BODIES = {
  SUN: {
    id: 'sun',
    name: 'Sun',
    mass: 1.9885e30,           // [kg]
    radius: 6.9634e8,          // [m]
    mu: 6.67430e-11 * 1.9885e30,// Standard gravitational parameter GM [m^3/s^2]
    rotationPeriod: 2192832,   // ~25.4 days [s]
    atmosphere: null
  },
  EARTH: {
    id: 'earth',
    name: 'Earth',
    mass: 5.9722e24,           // [kg]
    radius: 6.371e6,           // Mean radius [m]
    equatorialRadius: 6.378137e6,
    polarRadius: 6.356752e6,
    mu: 6.67430e-11 * 5.9722e24, // 3.986004418e14 m^3/s^2
    rotationPeriod: 86164.0905,// Sidereal rotation period [s]
    axialTiltRad: 23.44 * (Math.PI / 180),
    j2: 1.08263e-3,            // Oblateness harmonic coefficient
    speedOfSoundMS: 340,       // Near-surface speed of sound [m/s]
    terrain: { roughnessM: 4.0, wavelengthM: 90, craterDensity: 0.4, seed: 'earth' },
    orbitSemiMajorAxis: 1.49598e11, // Distance from Sun [m]
    orbitPeriod: 365.256 * 86400,
    orbitSpeed: 29780,         // Mean orbital velocity [m/s]
    atmosphere: {
      seaLevelDensity: 1.225,  // [kg/m^3]
      scaleHeight: 8500,       // [m]
      ceilingAltitude: 120000, // Top of sensible atmosphere [m]
      seaLevelPressure: 101325 // [Pa]
    }
  },
  MOON: {
    id: 'moon',
    name: 'Moon',
    parent: 'earth',
    mass: 7.342e22,            // [kg]
    radius: 1.7374e6,          // [m]
    mu: 6.67430e-11 * 7.342e22,// Standard gravitational parameter GM
    rotationPeriod: 2360584,   // Tidally locked ~27.32 days [s]
    orbitDistance: 3.844e8,    // Semi-major axis around Earth [m]
    orbitPeriod: 2360584,      // [s]
    orbitSpeed: 1022,          // Orbital velocity around Earth [m/s]
    j2: 2.033e-4,              // Oblateness harmonic coefficient
    terrain: { roughnessM: 2.5, wavelengthM: 70, craterDensity: 1.0, seed: 'moon' },
    atmosphere: null
  },
  MARS: {
    id: 'mars',
    name: 'Mars',
    mass: 6.4171e23,           // [kg]
    radius: 3.3895e6,          // [m]
    mu: 6.67430e-11 * 6.4171e23,
    rotationPeriod: 88642.663, // Martian sol [s]
    axialTiltRad: 25.19 * (Math.PI / 180),
    orbitSemiMajorAxis: 2.2792e11, // 1.524 AU [m]
    orbitPeriod: 686.98 * 86400,
    orbitSpeed: 24077,         // [m/s]
    j2: 1.96045e-3,            // Oblateness harmonic coefficient (large: Tharsis bulge)
    speedOfSoundMS: 240,       // CO2 atmosphere [m/s]
    terrain: { roughnessM: 3.0, wavelengthM: 80, craterDensity: 0.7, seed: 'mars' },
    atmosphere: {
      seaLevelDensity: 0.020,  // Thin CO2 atmosphere [kg/m^3]
      scaleHeight: 11100,      // [m]
      ceilingAltitude: 80000,  // [m]
      seaLevelPressure: 610    // [Pa]
    }
  }
};
