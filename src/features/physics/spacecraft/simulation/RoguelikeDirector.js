/**
 * The Ares Protocol / Odyssey 01 - Roguelike Mission Director
 * Grounded in authentic NASA open data and real mission constraints:
 * "A choice that saves power today might cost oxygen tomorrow."
 *
 * 5-Chapter Progression:
 * Chapter 1: Earth (Encounters 1-3) -> Main challenge: Rocket preparation
 * Chapter 2: Launch (Encounters 4-5) -> Main challenge: Weight and fuel
 * Chapter 3: Deep space (Encounters 6-8) -> Main challenge: Life support and radiation
 * Chapter 4: Mars landing (Encounters 9-10) -> Main challenge: Landing and fuel
 * Chapter 5: Mars outpost (Encounters 11-12) -> Main challenge: Long-term survival
 */

export class RoguelikeDirector {
  constructor(engine) {
    this.engine = engine;
    this.outpost = null; // Attached by SimulationEngine
    this.activeRun = null;
  }

  /**
   * Starts a fresh roguelike run
   */
  startNewRun(seed = Date.now(), pilotName = 'Commander') {
    this.activeRun = {
      runId: `ares-run-${Date.now().toString(36)}`,
      pilotName,
      seed,
      chapter: 1,
      chapterName: 'Earth',
      chapterChallenge: 'Rocket preparation',
      encounterIndex: 1, // 1 to 12
      maxEncounters: 12,
      score: 1000,
      inventory: ['NASA Standard Flight Computer', 'Water Filtration Module'],
      history: [],
      state: 'IN_PROGRESS', // 'IN_PROGRESS', 'VICTORY', 'DEFEATED'
      defeatReason: null,
      currentEncounter: null
    };

    // Load initial Chapter 1 Encounter 1
    this.activeRun.currentEncounter = this.generateEncounter(1);
    return this.getRunStatus();
  }

  getRunStatus(kidMode = false) {
    if (!this.activeRun) {
      return { active: false, message: 'No active mission run. Call POST /api/game/new-run to start.' };
    }

    const enc = this.activeRun.currentEncounter;
    return {
      active: true,
      runId: this.activeRun.runId,
      pilotName: this.activeRun.pilotName,
      chapter: this.activeRun.chapter,
      chapterName: this.activeRun.chapterName,
      chapterChallenge: this.activeRun.chapterChallenge,
      encounterIndex: this.activeRun.encounterIndex,
      maxEncounters: this.activeRun.maxEncounters,
      progressPercent: Number(((this.activeRun.encounterIndex - 1) / this.activeRun.maxEncounters * 100).toFixed(1)),
      score: this.activeRun.score,
      state: this.activeRun.state,
      defeatReason: this.activeRun.defeatReason,
      inventory: this.activeRun.inventory,
      history: this.activeRun.history.slice(-5),
      currentEncounter: enc ? this.formatEncounter(enc, kidMode) : null
    };
  }

  /**
   * Generates the authentic encounter card for the specified index (1-12)
   */
  generateEncounter(index) {
    switch (index) {
      // ========================================================
      // CHAPTER 1: EARTH (Encounters 1-3) - Rocket Preparation
      // ========================================================
      case 1:
        return {
          id: 'enc-1-rocket-weight',
          chapter: 1,
          chapterName: 'Earth',
          title: 'Payload Mass Discrepancy: Rocket is Overweight',
          kidTitle: 'Your Rocket is Too Heavy!',
          description: 'NASA launch calculations show the spacecraft wet mass exceeds the payload adapter margin by 2,400 kg. Exceeding mass budget risks failing to reach Earth orbit velocity (7,800 m/s).',
          kidDescription: 'Your rocket is carrying too much equipment! It is too heavy to leave the ground. You need to make it lighter before launch.',
          nasaDatasetRef: 'NASA Launch Services Program (LSP) Mass Budget Specifications',
          choices: [
            {
              id: 'lightweight-cargo',
              label: 'Jettison Non-Essential Luxury Cargo (-2,400 kg)',
              kidLabel: 'Leave Toys & Fancy Furniture at Home!',
              tradeoff: 'Saves 2,400 kg instantly; crew morale may suffer slightly during the 7-month cruise.',
              effect: { dryMassDeltaKg: -2400, scoreDelta: 150 }
            },
            {
              id: 'upgrade-tanks',
              label: 'Upgrade to High-Density Carbon-Composite Propellant Tanks',
              kidLabel: 'Upgrade to Super-Strong Light Fuel Tanks!',
              tradeoff: 'Saves 2,000 kg dry mass, but costs electrical research budget (-300 Wh battery capacity).',
              effect: { dryMassDeltaKg: -2000, batteryDeltaWh: -300, scoreDelta: 200 }
            },
            {
              id: 'uprated-engines',
              label: 'Install Higher Thrust Methane Engine (+15% Thrust, Burns +10% Fuel)',
              kidLabel: 'Install a Super-Fire Engine (More Power, Burns More Gas)!',
              tradeoff: 'Lifts the heavy rocket easily, but burns fuel faster during ascent.',
              effect: { thrustMultiplier: 1.15, scoreDelta: 120 }
            }
          ]
        };

      case 2:
        return {
          id: 'enc-2-eclss-prep',
          chapter: 1,
          chapterName: 'Earth',
          title: 'Life Support Architecture Selection',
          kidTitle: 'Pack the Astronaut Life Support!',
          description: 'Choosing your Environmental Control & Life Support System (ECLSS). Grounded in ISS recycling data: every kilogram of water saved reduces launch propellant required by the Tsiolkovsky rocket equation.',
          kidDescription: 'Astronauts need clean air to breathe and fresh water to drink for almost a year! What recycling system do you bring?',
          nasaDatasetRef: 'NASA Marshall Space Flight Center ECLSS Water Recovery System Specs',
          choices: [
            {
              id: 'closed-loop-recycler',
              label: 'Closed-Loop Catalytic Water & Urine Recycler',
              kidLabel: 'Super High-Tech Water Recycler (Cleans Space Pee into Pure Water!)',
              tradeoff: 'Recycles 98% of water! Saves huge launch weight, but consumes 400W continuous electrical power.',
              effect: { waterAddedKg: 400, continuousPowerW: 400, inventoryAdd: 'Closed-Loop Recycler', scoreDelta: 250 }
            },
            {
              id: 'bulk-water-tanks',
              label: 'Store Bulk Water Tanks (Zero Power, Heavy Payload)',
              kidLabel: 'Bring Big Heavy Water Jugs (No Power Needed, Heavy Rocket)',
              tradeoff: '100% reliable and requires zero electricity, but adds +800 kg to spacecraft wet mass.',
              effect: { dryMassDeltaKg: 800, waterAddedKg: 800, scoreDelta: 150 }
            }
          ]
        };

      case 3:
        return {
          id: 'enc-3-trajectory-selection',
          chapter: 1,
          chapterName: 'Earth',
          title: 'Trans-Mars Injection Window & Trajectory Selection',
          kidTitle: 'Pick Your Space Highway to Mars!',
          description: 'Planetary orbital mechanics only open an Earth-Mars launch window every 26 months. Choose between a fuel-efficient minimum-energy Hohmann transfer or a high-thrust fast transit.',
          kidDescription: 'Earth and Mars are moving around the Sun like racers on a giant track. Pick how fast you want to fly across space!',
          nasaDatasetRef: 'NASA Trajectory Browser & JPL Horizons Ephemerides',
          choices: [
            {
              id: 'hohmann-transfer',
              label: 'Hohmann Minimum-Energy Transfer (260 Days, Minimum Delta-V)',
              kidLabel: 'Slow & Steady Space Cruise (Uses Little Fuel, Takes Longer)',
              tradeoff: 'Saves 1,100 m/s of propellant! However, crew spends more time exposed to deep-space galactic cosmic rays.',
              effect: { propellantSavedKg: 1200, radiationExposureMult: 1.3, scoreDelta: 200 }
            },
            {
              id: 'fast-transit',
              label: 'High-Energy Fast Transit (180 Days, Consumes Extra Propellant)',
              kidLabel: 'Super Fast Rocket Express (Burns Lots of Fuel, Gets There Fast!)',
              tradeoff: 'Cuts flight time by 80 days, protecting crew health and radiation dose, but burns 1,200 kg extra fuel.',
              effect: { propellantSpentKg: 1200, radiationExposureMult: 0.7, scoreDelta: 250 }
            }
          ]
        };

      // ========================================================
      // CHAPTER 2: LAUNCH (Encounters 4-5) - Weight and Fuel
      // ========================================================
      case 4:
        return {
          id: 'enc-4-max-q',
          chapter: 2,
          chapterName: 'Launch',
          title: 'Max-Q: Peak Aerodynamic Pressure & Structural Buffeting',
          kidTitle: 'The Rocket Shakes at Super Speed (Max-Q)!',
          description: 'At altitude 12,000 meters and Mach 1.6, dynamic pressure reaches 38 kPa. Structural sensors report aero buffeting near mechanical design limits.',
          kidDescription: 'The rocket is punching through the thickest air at super speed! The air is pushing back hard like a giant invisible wall.',
          nasaDatasetRef: 'NASA Apollo & SLS Dynamic Pressure Flight Profiles',
          choices: [
            {
              id: 'throttle-down',
              label: 'Throttle Engines to 65% Through Max-Q Corridor',
              kidLabel: 'Slow Down a Little to Protect the Rocket Wings',
              tradeoff: 'Relieves aerodynamic stress safely, but loses 80 m/s delta-v to gravitational drag.',
              effect: { structuralStressRelief: true, propellantSpentKg: 80, scoreDelta: 180 }
            },
            {
              id: 'punch-through',
              label: 'Maintain 100% Full Throttle (Punch Through Gravity Well)',
              kidLabel: 'Full Blast! Smash Straight Through the Air!',
              tradeoff: 'Saves propellant and maximizes velocity, but risks slight structural micro-fractures in outer heat tiles.',
              effect: { structuralDamagePercent: 6, scoreDelta: 140 }
            }
          ]
        };

      case 5:
        return {
          id: 'enc-5-staging-tmi',
          chapter: 2,
          chapterName: 'Launch',
          title: 'First Stage Jettison & Trans-Mars Injection Burn',
          kidTitle: 'Drop the Boosters & Fire into Deep Space!',
          description: 'Core stage burnout complete. Stage separation pyro-bolts fired cleanly. You must now commit fuel for the Trans-Mars Injection (TMI) burn to escape Earth gravity.',
          kidDescription: 'Empty rocket boosters fall away into the ocean. Now it is time for the giant rocket burn that throws you all the way to Mars!',
          nasaDatasetRef: 'NASA Orion Artemis TLI/TMI Propulsion Sequence',
          choices: [
            {
              id: 'precise-tmi-burn',
              label: 'Execute Nominal High-Precision TMI Burn (+3,600 m/s Delta-V)',
              kidLabel: 'Perfect Rocket Burn (Exact Speed to Mars)',
              tradeoff: 'Inserts cleanly onto Mars transfer orbit with 15% fuel reserves remaining.',
              effect: { propellantSpentKg: 3500, trajectoryNominal: true, scoreDelta: 300 }
            },
            {
              id: 'gravity-assist',
              label: 'Lunar Gravity Assist Flyby (Saves 350 kg Propellant, Adds 4 Days)',
              kidLabel: 'Moon Slingshot! (Uses Moon Gravity to Save Fuel)',
              tradeoff: 'Gravity slingshot saves valuable landing fuel, but trajectory navigation is tight.',
              effect: { propellantSavedKg: 350, flightDaysDelta: +4, scoreDelta: 320 }
            }
          ]
        };

      // ========================================================
      // CHAPTER 3: DEEP SPACE (Encounters 6-8) - Life Support & Radiation
      // ========================================================
      case 6:
        return {
          id: 'enc-6-donki-sun-storm',
          chapter: 3,
          chapterName: 'Deep Space',
          title: 'NASA DONKI Alert: Coronal Mass Ejection / Solar Storm',
          kidTitle: 'SUN STORM INCOMING! (Screen Flashes Orange!)',
          description: 'NASA Space Weather Database (DONKI) confirms an X5.8 solar flare and Coronal Mass Ejection (CME) traveling at 1,450 km/s. Radiation flux will spike by 100x within 45 minutes.',
          kidDescription: 'WARNING: The Sun just shot a giant blast of radioactive particles directly at your spaceship! Screen flashes orange! What is your shield plan?',
          nasaDatasetRef: 'NASA DONKI FLR Event 2024-05-10T06:54:00 (Class X5.8)',
          visualCue: 'SCREEN_FLASH_ORANGE',
          flashOrange: true,
          choices: [
            {
              id: 'active-shield',
              label: 'Activate Electromagnetic Particle Deflection Shield',
              kidLabel: 'Turn on the Sci-Fi Energy Shield!',
              tradeoff: '100% protects crew from cosmic rays, but drains 1,500 Wh of battery power.',
              effect: { batteryDeltaWh: -1500, crewDoseDeltaSv: 0.001, scoreDelta: 250 }
            },
            {
              id: 'retreat-bunker',
              label: 'Order Crew into Polyethylene-Shielded Storm Bunker',
              kidLabel: 'Astronauts Hide in the Armored Storm Room!',
              tradeoff: 'Saves electrical battery power completely, but crew must pause all science and maintenance for 24 hours.',
              effect: { crewDoseDeltaSv: 0.008, sciencePaused: true, scoreDelta: 220 }
            },
            {
              id: 'water-wall-shield',
              label: 'Pump Greywater Tanks into Surrounding Cabin Bulkheads',
              kidLabel: 'Build a Water Shield Wall (Water Catches Radiation Bullets!)',
              tradeoff: 'Hydrogen in water naturally stops solar protons, but risks pipe thermal freezing if heating fails.',
              effect: { crewDoseDeltaSv: 0.003, greywaterUsed: true, scoreDelta: 280 }
            }
          ]
        };

      case 7:
        return {
          id: 'enc-7-osdr-crew-health',
          chapter: 3,
          chapterName: 'Deep Space',
          title: 'NASA OSDR Biology Report: Microgravity Bone Loss & SANS',
          kidTitle: 'Astronaut Bones Getting Soft in Zero Gravity!',
          description: 'NASA Open Science Data Repository (OSDR Study OSD-379 & OSD-512) telemetry: Crew medical checkup indicates 2.4% bone mineral density decline and fluid shifts elevating eye pressure.',
          kidDescription: 'Floating in zero-G is fun, but without gravity pushing down on feet, astronaut bones get soft and faces get puffy!',
          nasaDatasetRef: 'NASA OSDR OSD-379 & OSD-512 Spaceflight Human Biology',
          choices: [
            {
              id: 'mandatory-exercise',
              label: 'Enforce Intensive 2.5-Hour Daily ARED Resistive Exercise',
              kidLabel: 'Mandatory 2.5 Hours Lifting Space-Weights Every Day!',
              tradeoff: 'Preserves 98% bone mass and cardiovascular health, but increases daily food & oxygen consumption by 20%.',
              effect: { foodCostKg: 15, oxygenCostKg: 8, crewHealthRestored: 15, scoreDelta: 220 }
            },
            {
              id: 'lbnp-chaps',
              label: 'Deploy Lower-Body Negative Pressure (LBNP) Vacuum Chaps',
              kidLabel: 'Wear Suction Pants (Pulls Blood Back Down to Feet!)',
              tradeoff: 'Restores intracranial pressure and visual sharpness, draws modest 120W electrical power.',
              effect: { batteryDeltaWh: -200, eyePressureNormalized: true, crewHealthRestored: 10, scoreDelta: 200 }
            }
          ]
        };

      case 8:
        return {
          id: 'enc-8-comms-delay-seu',
          chapter: 3,
          chapterName: 'Deep Space',
          title: 'Speed-of-Light Comms Latency & Heavy Ion SEU Bit-Flip',
          kidTitle: 'Space Radio Lag & Computer Glitch!',
          description: 'Distance to Earth is now 150 million km, creating a 8.3-minute one-way light delay (16.6-minute round trip). A cosmic ray bit-flip causes a memory parity fault in the flight computer.',
          kidDescription: 'You are so far from Earth that radio messages take 16 minutes to get an answer! Suddenly, a tiny space particle hits your computer and scrambles the memory!',
          nasaDatasetRef: 'NASA Deep Space Network (DSN) Speed-of-Light Delay & Single Event Upset Records',
          choices: [
            {
              id: 'onboard-reboot',
              label: 'Execute Autonomous Onboard Memory Scrubber & Safe Reboot',
              kidLabel: 'Press Emergency Reboot on the Spaceship Computer!',
              tradeoff: 'Spacecraft drifts unguided for 90 seconds while gyros spin down; saves communication waiting time.',
              effect: { attitudeDriftDeg: 2.1, computerRestored: true, scoreDelta: 240 }
            },
            {
              id: 'redundant-vote',
              label: 'Failover to Triple-Modular Redundancy Backup CPU',
              kidLabel: 'Switch to Backup Computer Brain #2!',
              tradeoff: 'Instant seamless failover with zero attitude drift, but draws +200W backup power.',
              effect: { batteryDeltaWh: -300, zeroDrift: true, scoreDelta: 270 }
            }
          ]
        };

      // ========================================================
      // CHAPTER 4: MARS LANDING (Encounters 9-10) - Landing & Fuel
      // ========================================================
      case 9:
        return {
          id: 'enc-9-edl-entry',
          chapter: 4,
          chapterName: 'Mars Landing',
          title: 'Atmospheric Entry, Descent, and Landing (EDL) - Jezero Corridor',
          kidTitle: 'Entering the Martian Atmosphere (Fire & Heat!)',
          description: 'Entering thin Martian carbon dioxide atmosphere at 5.9 km/s. Aerodynamic friction heats thermal tiles to 1,600 K. You must target the narrow 11-degree entry flight-path corridor.',
          kidDescription: 'You are diving into Mars atmosphere at 13,000 miles per hour! The air glows red-hot around the heat shield. Aim carefully!',
          nasaDatasetRef: 'NASA Mars 2020 Perseverance Entry, Descent, and Landing Profile',
          choices: [
            {
              id: 'steep-entry',
              label: 'Steep Entry Corridor (Burns off Velocity Fast, High G-Loads)',
              kidLabel: 'Steep Dive! (Fast Braking, Wild Rocket Shake)',
              tradeoff: 'Quickly scrubs speed without using fuel, but hull experiences 8.2 Gs and high heat shield ablation.',
              effect: { heatShieldDegradedPercent: 12, propellantSavedKg: 200, scoreDelta: 250 }
            },
            {
              id: 'shallow-retro',
              label: 'Shallow Entry Corridor + Supersonic Retropropulsion Pulse',
              kidLabel: 'Gentle Glide + Quick Engine Tap!',
              tradeoff: 'Smooth, safe ride with gentle 3.5 Gs, but consumes 180 kg of precious landing propellant.',
              effect: { propellantSpentKg: 180, safeDescent: true, scoreDelta: 280 }
            }
          ]
        };

      case 10:
        return {
          id: 'enc-10-touchdown-hazard',
          chapter: 4,
          chapterName: 'Mars Landing',
          title: 'Terminal Touchdown: Jezero Crater Hazard Detection',
          kidTitle: 'Final Landing: Watch Out for Big Rocks!',
          description: 'Descent radar and terrain camera detect a field of dangerous 2-meter regolith boulders directly inside the primary landing ellipse at Jezero Crater.',
          kidDescription: 'You are 500 meters above the red ground! Your camera spots huge sharp boulders right where you are trying to land! Move!',
          nasaDatasetRef: 'NASA Mars 2020 Lander Vision System (LVS) Terrain Relative Navigation',
          choices: [
            {
              id: 'divert-burn',
              label: 'Fire RCS & Descent Engine for 250m Lateral Terrain Divert',
              kidLabel: 'Steer Sideways into the Smooth Flat Sand!',
              tradeoff: 'Guarantees smooth touchdown with zero tilt, but leaves propellant tanks almost dry at touchdown.',
              effect: { propellantSpentKg: 150, landingSafetyScore: 100, scoreDelta: 350 }
            },
            {
              id: 'crushable-legs',
              label: 'Commit to Touchdown with Deployable Crushable Honeycomb Landing Legs',
              kidLabel: 'Land with Super-Shock Absorber Legs!',
              tradeoff: 'Saves 150 kg fuel for outpost generators, but 1 landing leg partially crumples, leaving ship at a 6-degree tilt.',
              effect: { landerTiltDeg: 6.2, propellantSavedKg: 150, scoreDelta: 260 }
            }
          ]
        };

      // ========================================================
      // CHAPTER 5: MARS OUTPOST (Encounters 11-12) - Long-Term Survival
      // ========================================================
      case 11:
        return {
          id: 'enc-11-establishing-outpost',
          chapter: 5,
          chapterName: 'Mars Outpost',
          title: 'Establishing Outpost: Regolith Radiation Shielding & Toxic Soil',
          kidTitle: 'Build the Base: Shovel Mars Dirt & Wash Poison Dust!',
          description: 'Surface base setup in Jezero Crater. Mars regolith contains 0.6% toxic perchlorates. Cosmic radiation on the surface is 250x Earth baseline.',
          kidDescription: 'You landed safely! Now you must shovel Mars Dirt onto the dome roof for free radiation armor, and wash the Poison Dust with water before planting crops!',
          nasaDatasetRef: 'NASA In-Situ Resource Utilization (ISRU) & Mars Regolith Simulant Studies',
          choices: [
            {
              id: 'shovel-mars-dirt',
              label: 'Shovel 100 kg Mars Dirt (Regolith) Onto Habitat Roof',
              kidLabel: 'Shovel Mars Dirt onto the Roof for Free Radiation Armor!',
              tradeoff: 'Adds 20 cm radiation armor, cutting background dose by 75%! Costs minor crew calories and water.',
              effect: { shovelDirt: 2, roofArmorCmAdded: 20, scoreDelta: 300 }
            },
            {
              id: 'wash-poison-dust',
              label: 'Wash Poison Dust (Perchlorates) with 30 kg Water to Create Arable Soil',
              kidLabel: 'Wash Poison Dust with Water to Make Super-Farm Dirt!',
              tradeoff: 'Produces 100 kg cleaned soil for your Water Farm (Hydroponics), but consumes valuable water.',
              effect: { washDust: 2, cleanedSoilKgAdded: 100, waterCostKg: 30, scoreDelta: 320 }
            },
            {
              id: 'deploy-warm-rock-battery',
              label: 'Deploy Warm Rock Battery (RTG) for Guaranteed 24/7 Power',
              kidLabel: 'Turn on the Warm Rock Battery (Free Power All Night Long!)',
              tradeoff: 'Provides +1.2 kW continuous power completely immune to night and dust storms!',
              effect: { deployRtg: 1, continuousPowerKwAdded: 1.2, scoreDelta: 350 }
            }
          ]
        };

      case 12:
        return {
          id: 'enc-12-global-dust-storm',
          chapter: 5,
          chapterName: 'Mars Outpost',
          title: 'NASA POWER Telemetry: Global Martian Dust Storm',
          kidTitle: 'GIANT MARS DUST STORM! (The Sky Turns Red-Black!)',
          description: 'Atmospheric optical depth tau rises to 3.5. Solar irradiance slashes from 590 W/m2 down to 40 W/m2 (93% drop). Solar panels alone cannot sustain the life support grid.',
          kidDescription: 'A monster dust storm covers the entire planet! Day looks like night and baby-powder dust covers everything. Solar panels are dead!',
          nasaDatasetRef: 'NASA POWER Surface Solar Irradiance & Curiosity Dust Storm Telemetry',
          choices: [
            {
              id: 'rely-on-warm-rock',
              label: 'Switch Outpost Power Grid to Warm Rock Battery (RTG) Baseline',
              kidLabel: 'Warm Rock Battery Saves the Day! (Nuclear Power Ignores Storms!)',
              tradeoff: 'Habitat stays warm and Water Farm stays alive. Outpost survives the storm with flying colors!',
              effect: { surviveStormWithRtg: true, scoreDelta: 500 }
            },
            {
              id: 'shed-loads-ration',
              label: 'Shed All Non-Essential Loads & Hibernate Crew in Sleeping Pods',
              kidLabel: 'Power Down Everything & Go to Sleep in Sleeping Bags!',
              tradeoff: 'Saves battery power, but Water Farm crops wilt slightly from reduced grow lamps.',
              effect: { farmHealthDropPercent: 25, batterySaved: true, scoreDelta: 350 }
            }
          ]
        };

      default:
        return null;
    }
  }

  /**
   * Applies the consequences of a selected choice to the simulation engine and active run
   */
  processChoice(choiceId) {
    if (!this.activeRun || this.activeRun.state !== 'IN_PROGRESS') {
      return { success: false, message: 'No active mission in progress.' };
    }

    const currentEnc = this.activeRun.currentEncounter;
    if (!currentEnc) {
      return { success: false, message: 'No pending encounter.' };
    }

    const choice = currentEnc.choices.find(c => c.id === choiceId);
    if (!choice) {
      return { success: false, message: `Invalid choice ID: ${choiceId}` };
    }

    const effects = choice.effect || {};
    const spacecraft = this.engine.spacecraft;

    // 1. Apply Physics Consequences to Spacecraft
    if (effects.dryMassDeltaKg) {
      spacecraft.dryMassKg = Math.max(5000, spacecraft.dryMassKg + effects.dryMassDeltaKg);
      spacecraft.updateMassProperties();
    }
    // Propellant lives in per-propellant tanks (LOX / LH2 / hydrazine), drained at the engine mixture ratio.
    // (The old code wrote to a non-existent tank id and field, which turned the tank mass into NaN.)
    const applied = {};
    if (effects.propellantSpentKg) {
      applied.propellantSpentKg = spacecraft.propulsion.removePropellant(effects.propellantSpentKg);
    }
    if (effects.propellantSavedKg) {
      // "Saved" propellant stays in the tanks: credit it back, limited by tank capacity
      applied.propellantSavedKg = spacecraft.propulsion.addPropellant(effects.propellantSavedKg);
    }
    if (effects.thrustMultiplier) {
      for (const e of spacecraft.propulsion.engines) e.maxThrustN *= effects.thrustMultiplier;
      applied.thrustMultiplier = effects.thrustMultiplier;
    }
    if (effects.propellantSpentKg || effects.propellantSavedKg) {
      spacecraft.updateMassProperties();
    }
    if (effects.batteryDeltaWh) {
      spacecraft.power.battery.energyStoredWh = Math.max(0, Math.min(
        spacecraft.power.battery.capacityWh,
        spacecraft.power.battery.energyStoredWh + effects.batteryDeltaWh
      ));
    }
    if (effects.waterAddedKg) {
      spacecraft.lifeSupport.waterStoreKg += effects.waterAddedKg;
    }
    if (effects.waterCostKg) {
      spacecraft.lifeSupport.waterStoreKg = Math.max(0, spacecraft.lifeSupport.waterStoreKg - effects.waterCostKg);
    }
    if (effects.foodCostKg) {
      spacecraft.lifeSupport.foodStoreKg = (spacecraft.lifeSupport.foodStoreKg || 200) - effects.foodCostKg;
    }
    if (effects.oxygenCostKg) {
      spacecraft.lifeSupport.oxygenStoreKg = Math.max(0, spacecraft.lifeSupport.oxygenStoreKg - effects.oxygenCostKg);
    }
    if (effects.crewDoseDeltaSv) {
      spacecraft.radiation.crewCumulativeDoseSv += effects.crewDoseDeltaSv;
    }
    if (effects.inventoryAdd) {
      this.activeRun.inventory.push(effects.inventoryAdd);
    }

    // 2. Apply Outpost Mechanics if Outpost System is present
    if (this.outpost) {
      if (effects.shovelDirt) {
        this.outpost.shovelMarsDirt(effects.shovelDirt);
      }
      if (effects.washDust) {
        this.outpost.washPoisonDust(effects.washDust);
      }
      if (effects.deployRtg) {
        this.outpost.deployWarmRockBattery();
      }
      if (effects.surviveStormWithRtg) {
        this.outpost.endSunStorm();
      }
    }

    // 3. Update Run State & Score
    const scoreGain = effects.scoreDelta || 100;
    this.activeRun.score += scoreGain;

    this.activeRun.history.push({
      encounterId: currentEnc.id,
      encounterTitle: currentEnc.title,
      kidTitle: currentEnc.kidTitle,
      choiceId: choice.id,
      choiceLabel: choice.label,
      kidLabel: choice.kidLabel,
      scoreGained: scoreGain,
      applied,
      simTimeS: this.engine.simulationTimeSeconds ?? 0,
      timestamp: new Date().toISOString()
    });

    // 4. Check Defeat or Victory
    if (spacecraft.lifeSupport.crewHealth <= 0 || (this.outpost && this.outpost.crewHealthPercent <= 0)) {
      this.activeRun.state = 'DEFEATED';
      this.activeRun.defeatReason = 'Crew life support compromised. Insufficient consumable margins.';
      this.activeRun.currentEncounter = null;
      return { success: true, run: this.getRunStatus(), message: 'Mission failed: crew incapacitated.' };
    }

    // 5. Advance to next encounter / chapter
    this.activeRun.encounterIndex += 1;

    if (this.activeRun.encounterIndex > this.activeRun.maxEncounters) {
      this.activeRun.state = 'VICTORY';
      this.activeRun.score += 1000; // Mission victory bonus!
      this.activeRun.currentEncounter = null;
      return {
        success: true,
        run: this.getRunStatus(),
        victory: true,
        message: 'CONGRATULATIONS! Odyssey 01 has established humanity’s first permanent self-sustaining Mars outpost!'
      };
    }

    // Determine Chapter
    if (this.activeRun.encounterIndex <= 3) {
      this.activeRun.chapter = 1;
      this.activeRun.chapterName = 'Earth';
      this.activeRun.chapterChallenge = 'Rocket preparation';
    } else if (this.activeRun.encounterIndex <= 5) {
      this.activeRun.chapter = 2;
      this.activeRun.chapterName = 'Launch';
      this.activeRun.chapterChallenge = 'Weight and fuel';
    } else if (this.activeRun.encounterIndex <= 8) {
      this.activeRun.chapter = 3;
      this.activeRun.chapterName = 'Deep Space';
      this.activeRun.chapterChallenge = 'Life support and radiation';
    } else if (this.activeRun.encounterIndex <= 10) {
      this.activeRun.chapter = 4;
      this.activeRun.chapterName = 'Mars Landing';
      this.activeRun.chapterChallenge = 'Landing and fuel';
    } else {
      this.activeRun.chapter = 5;
      this.activeRun.chapterName = 'Mars Outpost';
      this.activeRun.chapterChallenge = 'Long-term survival';
    }

    this.activeRun.currentEncounter = this.generateEncounter(this.activeRun.encounterIndex);

    // If entering Chapter 5, initialize outpost if not already active
    if (this.activeRun.chapter === 5 && this.outpost && this.outpost.sol === 1) {
      this.outpost.logEvent('INFO', 'Touchdown at Jezero Crater! Surface outpost module activated.');
    }

    return {
      success: true,
      choiceSelected: choice.label,
      scoreGained: scoreGain,
      run: this.getRunStatus()
    };
  }

  /**
   * Dual-mode formatter for encounter payloads
   */
  formatEncounter(enc, kidMode = false) {
    return {
      id: enc.id,
      chapter: enc.chapter,
      chapterName: enc.chapterName,
      title: kidMode ? enc.kidTitle : enc.title,
      description: kidMode ? enc.kidDescription : enc.description,
      scientificTitle: enc.title,
      kidTitle: enc.kidTitle,
      scientificDescription: enc.description,
      kidDescription: enc.kidDescription,
      nasaDatasetRef: enc.nasaDatasetRef,
      visualCue: enc.visualCue || null,
      flashOrange: Boolean(enc.flashOrange),
      choices: enc.choices.map(c => ({
        id: c.id,
        label: kidMode ? c.kidLabel : c.label,
        scientificLabel: c.label,
        kidLabel: c.kidLabel,
        tradeoff: c.tradeoff
      }))
    };
  }
}
