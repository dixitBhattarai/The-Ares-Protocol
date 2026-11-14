import { CONSTANTS, CELESTIAL_BODIES } from '../config/constants.js';
import { Vector3 } from '../math/Vector3.js';
import { Quaternion } from '../math/Quaternion.js';
import { Integrator } from '../physics/Integrator.js';
import { Gravity } from '../physics/Gravity.js';
import { OrbitalElements } from '../navigation/OrbitalElements.js';
import { TrajectoryPredictor } from '../navigation/TrajectoryPredictor.js';
import { Spacecraft } from './Spacecraft.js';
import { EventBus } from './EventBus.js';
import { EnvironmentSystem } from '../systems/EnvironmentSystem.js';
import { OutpostSystem } from '../systems/OutpostSystem.js';
import { RoguelikeDirector } from './RoguelikeDirector.js';
import { MISSION_PRESETS } from '../config/presets.js';
import { ContactWorld } from '../contact/index.js';

// Monotonic clock in nanoseconds (bigint). Works in browsers and Node (no process.* dependency).
const nowNs = () => BigInt(Math.round(performance.now() * 1e6));

/**
 * Authoritative Master Simulation Engine:
 * - Completely decoupled from Express HTTP request cycles
 * - Deterministic, fixed-timestep physics loop using the canonical accumulator pattern
 * - Nanosecond high-resolution timer (process.hrtime.bigint) preventing wall-clock drift
 * - Asynchronous thread-safe command queue for flight controls
 * - Cached snapshots for O(1) instantaneous read-only API queries
 */
export class SimulationEngine {
  constructor(config = {}) {
    this.dtPhysics = config.dtPhysics ?? 0.1; // Exactly 0.1s fixed physics timestep
    this.timeScale = 1.0;                    // 1x, 10x, 100x, 1000x
    this.isRunning = false;
    this.simulationTimeSeconds = 0.0;
    this.missionElapsedTimeSeconds = 0.0;

    // High-resolution accumulator timing
    this.accumulator = 0.0;
    this.lastTimeNs = null;
    this.maxAccumulator = 0.5; // Prevents "spiral of death" during server stalls

    // Command Queue to avoid race conditions or request-coupled physics
    this.commandQueue = [];
    // Commands scheduled in SIMULATION time (e.g. timed RCS pulses); unaffected by time scale or pauses
    this.scheduledCommands = [];
    this.maxStepsPerTick = config.maxStepsPerTick ?? 200;
    // Browser game: the app owns the single animation loop and calls advance(dtWall) itself.
    this.externalLoop = config.externalLoop ?? false;
    this.contactEnabled = config.contactEnabled ?? true;
    this.contact = null;
    this._preContactLandingState = null;
    this._lastContactState = 'IDLE';

    this.eventBus = new EventBus(() => this.simulationTimeSeconds);
    this.environment = new EnvironmentSystem();

    // Default primary body: Earth
    this.primaryBody = CELESTIAL_BODIES.EARTH;

    // Spacecraft
    this.spacecraft = new Spacecraft();

    // Mars Outpost System (Whiteboard Chapter 5 mechanics)
    this.outpost = new OutpostSystem();

    // The Ares Protocol / Roguelike Director (5-Chapter Encounter Progression)
    this.roguelike = new RoguelikeDirector(this);
    this.roguelike.outpost = this.outpost;

    // Cached telemetry snapshot
    this.cachedSnapshot = null;

    // Load initial default preset (LEO)
    this.loadPreset('LEO_CIRCULAR');

    // Autonomous background loop interval
    this.intervalId = null;
    this.loopIntervalMs = 15; // Run background check loop every 15ms (~66 Hz)
  }

  loadPreset(presetKey) {
    const preset = MISSION_PRESETS[presetKey] || MISSION_PRESETS.LEO_CIRCULAR;
    this.currentPresetId = preset.id;

    if (preset.primaryBodyId === 'earth') this.primaryBody = CELESTIAL_BODIES.EARTH;
    else if (preset.primaryBodyId === 'moon') this.primaryBody = CELESTIAL_BODIES.MOON;
    else if (preset.primaryBodyId === 'mars') this.primaryBody = CELESTIAL_BODIES.MARS;
    else this.primaryBody = CELESTIAL_BODIES.SUN;

    this.spacecraft = new Spacecraft({
      dryMassKg: preset.spacecraft.dryMassKg,
      pos: preset.spacecraft.pos.clone(),
      vel: preset.spacecraft.vel.clone(),
      quat: preset.spacecraft.quat.clone(),
      omega: preset.spacecraft.omega.clone(),
      payloadMassKg: preset.spacecraft.payloadMassKg,
      crewMassKg: preset.spacecraft.crewMassKg,
      otherConsumablesMassKg: preset.spacecraft.consumablesMassKg,
      propulsion: preset.spacecraft.propulsion?.()
    });

    this.simulationTimeSeconds = 0.0;
    this.missionElapsedTimeSeconds = 0.0;
    this.accumulator = 0.0;
    this.lastTimeNs = null;
    this.commandQueue = [];
    this.scheduledCommands = [];
    this._preContactLandingState = null;
    this._lastContactState = 'IDLE';
    this.contact = this._createContactWorld();
    this.eventBus.clear();
    this.eventBus.emit('INFO', 'simulation', `Loaded mission preset: ${preset.name}`);

    this.cachedSnapshot = this.buildSnapshot();
  }

  /** Landing / touchdown physics for the current primary body (none for the Sun). */
  _createContactWorld() {
    const b = this.primaryBody;
    if (!this.contactEnabled || !b || b.id === 'sun' || !(b.radius > 0) || !(b.mu > 0)) return null;
    return new ContactWorld({
      body: { radius: b.radius, mu: b.mu, rotationPeriod: b.rotationPeriod ?? b.rotationPeriodS ?? 0 }
    });
  }

  /** Principal moments [kg m^2] of the current vehicle (same box model as AttitudeSystem). */
  _inertiaDiag() {
    const d = this.spacecraft.attitude.dimensions;
    const m = this.spacecraft.getTotalMass();
    return [
      (m / 12) * (d.width * d.width + d.height * d.height),
      (m / 12) * (d.length * d.length + d.height * d.height),
      (m / 12) * (d.length * d.length + d.width * d.width)
    ];
  }

  /**
   * Starts the autonomous background physics loop
   * Runs independently of any client connections or HTTP requests
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimeNs = nowNs();

    if (!this.externalLoop) {
      this.intervalId = setInterval(() => {
        this.tick();
      }, this.loopIntervalMs);
    }

    this.eventBus.emit('INFO', 'simulation', 'Autonomous physics loop running');
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.lastTimeNs = null;
    this.eventBus.emit('INFO', 'simulation', 'Physics loop paused');
  }

  resume() {
    this.start();
  }

  reset() {
    this.pause();
    this.loadPreset(this.currentPresetId || 'LEO_CIRCULAR');
    this.eventBus.emit('INFO', 'simulation', 'Simulation reset to epoch');
  }

  setTimeScale(scale) {
    this.timeScale = Math.max(1, Math.min(1000, Number(scale) || 1));
    this.eventBus.emit('INFO', 'simulation', `Time acceleration set to ${this.timeScale}x`);
  }

  /**
   * Enqueue a flight command to be executed deterministically on the next physics step
   */
  queueCommand(cmd) {
    this.commandQueue.push(cmd);
  }

  scheduleCommand(atSimTimeS, cmd) {
    this.scheduledCommands.push({ atS: Number(atSimTimeS), cmd });
    this.scheduledCommands.sort((a, b) => a.atS - b.atS);
  }

  _runScheduledCommands(t) {
    while (this.scheduledCommands.length > 0 && this.scheduledCommands[0].atS <= t + 1e-9) {
      this.executeCommand(this.scheduledCommands.shift().cmd);
    }
  }

  processCommands() {
    while (this.commandQueue.length > 0) {
      const cmd = this.commandQueue.shift();
      this.executeCommand(cmd);
    }
  }

  executeCommand(cmd) {
    const propulsion = this.spacecraft.propulsion;
    const attitude = this.spacecraft.attitude;

    switch (cmd.action) {
      case 'set_throttle': {
        const engineId = cmd.engine_id || propulsion.engines[0]?.id;
        propulsion.setEngineThrottle(engineId, Number(cmd.throttle));
        break;
      }
      case 'fire_rcs': {
        const thrusterIds = cmd.thruster_ids || [cmd.thruster_id];
        const isActive = cmd.active !== false;
        propulsion.fireRcs(thrusterIds, isActive);
        if (isActive) {
          attitude.disableAutopilot(); // Manual RCS control overrides autopilot hold
        }
        if (isActive && cmd.duration_s > 0) {
          // Sim-time shutoff: wall-clock timers would break replays, time warp and pause
          this.scheduleCommand(this.simulationTimeSeconds + Number(cmd.duration_s), {
            action: 'fire_rcs', thruster_ids: thrusterIds, active: false
          });
        }
        break;
      }
      case 'reset_rcs': {
        propulsion.resetRcs();
        break;
      }
      case 'kill_rotation': {
        attitude.disableAutopilot();
        this.spacecraft.omega.set(0, 0, 0);
        propulsion.resetRcs();
        break;
      }
      case 'set_attitude_target': {
        if (cmd.quaternion) {
          attitude.setTargetAttitude(Quaternion.fromArray(cmd.quaternion));
        }
        break;
      }
      case 'disable_autopilot': {
        attitude.disableAutopilot();
        break;
      }
      case 'choose_encounter': {
        this.roguelike.processChoice(cmd.choice_id);
        break;
      }
      case 'shovel_mars_dirt': {
        this.outpost.shovelMarsDirt(cmd.batches || 1);
        break;
      }
      case 'wash_poison_dust': {
        this.outpost.washPoisonDust(cmd.batches || 1);
        break;
      }
      case 'build_water_farm': {
        this.outpost.buildWaterFarm();
        break;
      }
      case 'deploy_warm_rock_battery': {
        this.outpost.deployWarmRockBattery();
        break;
      }
      case 'clean_solar_panels': {
        this.outpost.cleanSolarPanels();
        break;
      }
      case 'toggle_bunker': {
        this.outpost.toggleBunker(cmd.active);
        break;
      }
      case 'toggle_shield': {
        this.outpost.toggleActiveShield(cmd.active);
        break;
      }
      default:
        break;
    }
  }

  /**
   * Autonomous, drift-free background physics tick:
   * Uses high-resolution wall-clock timer + accumulator pattern ("Fix Your Timestep")
   * Guarantees every single step receives exactly this.dtPhysics (0.1s)
   */
  tick() {
    if (!this.isRunning) return;

    const now = nowNs();
    if (this.lastTimeNs === null) {
      this.lastTimeNs = now;
      return;
    }

    const elapsedSeconds = Number(now - this.lastTimeNs) / 1e9;
    this.lastTimeNs = now;
    this.advance(elapsedSeconds);
  }

  /**
   * Advance by a caller-supplied wall-clock delta (seconds). The game's App loop calls this each frame
   * (e.g. 1/60 s); tick() calls it with measured time when the engine runs its own loop.
   */
  advance(elapsedSeconds) {
    if (!this.isRunning) return;
    // Clamp elapsed frame time to 0.25s to avoid spiral of death on lag spikes
    const dtWall = Math.min(0.25, Math.max(0, Number(elapsedSeconds) || 0));

    // Safety clamp: during burns or atmospheric entry, clamp time acceleration!
    let effectiveTimeScale = this.timeScale;
    const isBurning = this.spacecraft.propulsion.engines.some(e => e.ignited && e.throttle > 0);
    const altitude = this.spacecraft.pos.length() - this.primaryBody.radius;
    const inAtmosphere = this.primaryBody.atmosphere && altitude < this.primaryBody.atmosphere.ceilingAltitude;

    // Contact physics is tuned for real time; burns / atmosphere cap warp at 10x
    const nearSurface = this.contact && (this.contact.engaged || altitude <= this.contact.engageAltitudeM * 3);
    if (nearSurface) effectiveTimeScale = 1.0;
    else if ((isBurning || inAtmosphere) && effectiveTimeScale > 10) effectiveTimeScale = 10;

    // Accumulate scaled game time. The cap scales with the warp factor, otherwise
    // anything above ~33x was silently truncated to 0.5 s of sim time per tick.
    this.accumulator += dtWall * effectiveTimeScale;
    const accCap = Math.max(this.maxAccumulator, 0.25 * effectiveTimeScale);
    if (this.accumulator > accCap) this.accumulator = accCap;

    // Process incoming flight commands with low latency (~15ms)
    this.processCommands();

    let stepped = false;
    // Consume strictly fixed timesteps (e.g. 0.1s)
    let steps = 0;
    while (this.accumulator >= this.dtPhysics && steps < this.maxStepsPerTick) {
      this.step(this.dtPhysics);
      this.accumulator -= this.dtPhysics;
      stepped = true;
      steps++;
    }
    // CPU-bound: drop the backlog instead of spiralling; sim just runs slower than requested
    if (this.accumulator >= this.dtPhysics) this.accumulator = this.accumulator % this.dtPhysics;

    if (stepped) {
      this.cachedSnapshot = this.buildSnapshot();
    }
  }

  /**
   * Single fixed physics step:
   * Evaluates all coupled astrodynamics and spacecraft engineering models
   */
  step(dt) {
    const t = this.simulationTimeSeconds;
    this._runScheduledCommands(t);

    // 1. Evaluate Celestial Ephemerides
    const planets = this.environment.getPlanetaryStates(t);
    const primaryBodyPos = new Vector3(0, 0, 0);

    // Sun geometry. Spacecraft state is primary-body-centred; ephemerides are Sun-centred.
    const bodyHelio = this._primaryHeliocentric(planets);
    const sunVec = Vector3.add(bodyHelio, this.spacecraft.pos).multiplyScalar(-1); // spacecraft -> Sun
    const sunDist = Math.max(1, sunVec.length());
    const sunDir = sunVec.clone().multiplyScalar(1 / sunDist);

    // 2. Gravitational Acceleration (Newtonian + J2 oblateness)
    const gravityAcc = Gravity.computeAcceleration(
      this.spacecraft.pos,
      [{ body: this.primaryBody, position: primaryBodyPos }],
      true
    );

    // 3. Atmospheric Aerodynamics
    const aeroResult = this.spacecraft.computeAerodynamics(
      this.spacecraft.pos,
      this.spacecraft.vel,
      this.spacecraft.quat,
      this.primaryBody
    );

    // 4. Sample control and actuator outputs once per fixed step; RK4 holds them constant.
    const thrust = this.spacecraft.propulsion.computeThrustAndTorque(
      aeroResult.ambientPressurePa,
      this.spacecraft.centerOfMassBody,
      dt
    );
    const attitude = this.spacecraft.attitude;
    const wheelTorqueBody = attitude.applyWheelTorque(
      attitude.computeControlTorque(this.spacecraft.quat, this.spacecraft.omega),
      dt
    );
    const torqueBody = Vector3.add(thrust.torqueBody, wheelTorqueBody);
    const wheelMomentumBody = attitude.reactionWheels.reduce((momentum, wheel) => {
      return momentum.add(wheel.axis.clone().multiplyScalar(wheel.momentumNms));
    }, new Vector3());

    // 5. Assemble the derivative context expected by the spacecraft RK4 model.
    const envContext = {
      gravity: pos => Gravity.centralAcceleration(pos, this.primaryBody, true),
      aero: state => this.spacecraft.computeAerodynamics(state.pos, state.vel, state.quat, this.primaryBody),
      forceBody: thrust.forceBody,
      torqueBody,
      massFlowKgS: thrust.massFlowKgS,
      wheelMomentumBody,
      mu: this.primaryBody.mu,
      sunDir,
      solarFluxWm2: CONSTANTS.SOLAR_IRRADIANCE_1AU * Math.pow(CONSTANTS.AU / sunDist, 2)
    };

    // 6. Runge-Kutta 4th Order State Integration
    const currentState = {
      pos: this.spacecraft.pos,
      vel: this.spacecraft.vel,
      quat: this.spacecraft.quat,
      omega: this.spacecraft.omega,
      mass: this.spacecraft.getTotalMass()
    };

    // Hand over to the local-frame contact world close to the ground
    const altitudeM = this.spacecraft.pos.length() - this.primaryBody.radius;
    if (this.contact && this.contact.shouldEngage(altitudeM)) {
      this._engageContact(t);
    }

    if (this.contact && this.contact.engaged) {
      this._stepContact(dt, aeroResult, gravityAcc, thrust, torqueBody, sunDir, envContext.solarFluxWm2);
    } else {
      const nextState = Integrator.stepRK4(currentState, dt, t, (s, simT) => {
        return this.spacecraft.computeDerivatives(s, simT, envContext);
      });

      // Update physical state
      this.spacecraft.pos.copy(nextState.pos);
      this.spacecraft.vel.copy(nextState.vel);
      this.spacecraft.quat.copy(nextState.quat);
      this.spacecraft.omega.copy(nextState.omega);
    }

    // 6. Landing & Surface Touchdown Evaluation (legacy point check, only when there is no contact world)
    const landingEval = this.contact ? { inContact: false } : this.spacecraft.landingDocking.evaluateTouchdown(
      this.spacecraft.pos,
      this.spacecraft.vel,
      this.spacecraft.quat,
      this.primaryBody.radius
    );

    if (landingEval.inContact) {
      if (landingEval.state === 'LANDED') {
        this.spacecraft.vel.set(0, 0, 0);
        this.spacecraft.omega.set(0, 0, 0);
      } else if (landingEval.state === 'CRASHED') {
        this.eventBus.emit('CRITICAL', 'landing', `CRASH ON TOUCHDOWN! Structural integrity lost! Damage: ${(landingEval.damage * 100).toFixed(1)}%`);
        this.spacecraft.vel.set(0, 0, 0);
        this.spacecraft.omega.set(0, 0, 0);
      }
    }

    // 7. Structural G-Load Monitoring
    const properAcc = aeroResult.dragForce.clone().multiplyScalar(1.0 / this.spacecraft.getTotalMass());
    const stress = this.spacecraft.landingDocking.checkStructuralStress(properAcc);
    if (stress.overstressed) {
      this.eventBus.emit('WARNING', 'structure', `MAX-G EXCEEDED: ${stress.gLoad.toFixed(2)} Gs!`);
    }

    // Reaction wheels: advance momentum exactly once per step (the RK4 derivative is pure)
    const wheelPowerW = attitude.lastWheelPowerW;

    // 8. Update Propulsion Mass & Tank Levels
    const propUpdate = this.spacecraft.propulsion.update(
      dt,
      aeroResult.ambientPressurePa,
      this.spacecraft.centerOfMassBody
    );
    this.spacecraft.updateMassProperties();
    for (const w of propUpdate.warnings || []) {
      this.eventBus.emit(w.level, 'propulsion', w.message);
    }

    // 9. Space Weather & Eclipse Check
    // Shadow test runs in Sun-centred coordinates (the cylinder axis points away from the Sun through the body)
    const scHelioNow = Vector3.add(bodyHelio, this.spacecraft.pos);
    const inEclipse = this.primaryBody.id === 'sun'
      ? false
      : this.environment.checkEclipse(scHelioNow, bodyHelio, this.primaryBody.radius);
    const spaceWeather = this.environment.update(dt, t, this.spacecraft.pos, this.primaryBody);

    // 10. Update Thermal System
    const thermalUpdate = this.spacecraft.thermal.update(dt, {
      sunDistanceM: sunDist,
      inEclipse,
      engineHeatW: propUpdate.heatGenW
    });
    for (const w of thermalUpdate.warnings) {
      this.eventBus.emit(w.level, 'thermal', w.message);
    }

    // 11. Update Electrical Power System
    const powerUpdate = this.spacecraft.power.update(dt, {
      sunDistanceM: sunDist,
      inEclipse,
      pointingCos: 0.95,
      dynamicLoadsW: propUpdate.powerDrawW + wheelPowerW
    });
    for (const w of powerUpdate.warnings) {
      this.eventBus.emit(w.level, 'power', w.message);
    }

    // 12. Update Life Support System
    const cabinTempK = this.spacecraft.thermal.nodes.find(n => n.id === 'cabin')?.temperatureK || 294;
    const eclssUpdate = this.spacecraft.lifeSupport.update(dt, cabinTempK, aeroResult.ambientPressurePa);
    for (const w of eclssUpdate.warnings) {
      this.eventBus.emit(w.level, 'life_support', w.message);
    }

    // 13. Update Radiation System
    const rEarthRel = this.primaryBody.id === 'earth' ? this.spacecraft.pos : null;
    const radUpdate = this.spacecraft.radiation.update(dt, rEarthRel, spaceWeather.solarMultiplier);
    for (const w of radUpdate.warnings) {
      this.eventBus.emit(w.level, 'radiation', w.message);
    }

    // 14. Update Deep Space Telecommunications
    // Everything Sun-centred so the solar-conjunction test and Earth distance are consistent for any primary body.
    // Earth itself is not an occluder (the ground station is on its surface); other primaries can block the link.
    const occluders = (this.primaryBody.id === 'earth' || this.primaryBody.id === 'sun')
      ? []
      : [{ pos: bodyHelio, radius: this.primaryBody.radius, name: this.primaryBody.name }];
    const commsUpdate = this.spacecraft.comms.update(
      scHelioNow,
      planets.earth.position,
      this.spacecraft.quat,
      occluders,
      aeroResult.dynamicPressurePa
    );
    for (const w of commsUpdate.warnings) {
      this.eventBus.emit(w.level, 'comms', w.message);
    }

    // 15. Check Cascading Faults
    this.spacecraft.failure.evaluateCascades(this.spacecraft);

    // 16. Update Mars Outpost Operations (Surface Chapter 5)
    this.outpost.update(dt);

    // Advance Clocks
    this.simulationTimeSeconds += dt;
    this.missionElapsedTimeSeconds += dt;
  }

  /** Sun-centred position of the primary body (ephemeris keys match body ids: earth, moon, mars, sun). */
  _primaryHeliocentric(planets) {
    const p = planets[this.primaryBody.id];
    return p && p.position ? p.position.clone() : new Vector3(0, 0, 0);
  }

  _engageContact(t) {
    const sc = this.spacecraft;
    this._preContactLandingState = sc.landingDocking.state;
    this.contact.engage({
      timeS: t,
      pos: sc.pos,
      vel: sc.vel,
      quat: [sc.quat.w, sc.quat.x, sc.quat.y, sc.quat.z],
      omegaBody: sc.omega,
      massKg: sc.getTotalMass(),
      inertiaDiag: this._inertiaDiag(),
      comBody: [sc.centerOfMassBody.x, sc.centerOfMassBody.y, sc.centerOfMassBody.z]
    });
    this._lastContactState = 'IN_FLIGHT';
    this.eventBus.emit('INFO', 'landing', 'Terminal descent: contact physics engaged');
  }

  /**
   * One step of terminal descent / landing / liftoff in the local surface frame.
   * Reaction-wheel / autopilot torque is applied as an external torque while the contact world owns the vehicle.
   */
  _stepContact(dt, aeroResult, gravityAcc, thrust, torqueBody, sunDir, solarFluxWm2) {
    const sc = this.spacecraft;
    this.contact.setMassProperties(sc.getTotalMass(), this._inertiaDiag());
    const force = Vector3.add(
      sc.quat.rotateVector(thrust.forceBody),
      aeroResult.totalForce
    );

    const s = this.contact.step(dt, {
      forceInertial: force,
      torqueBody: Vector3.add(
        Vector3.add(torqueBody, sc.attitude.computeGravityGradientTorque(sc.pos, sc.quat, this.primaryBody.mu)),
        sc.attitude.computeSolarPressureTorque(sunDir, sc.quat, solarFluxWm2)
      ),
      gravityInertial: gravityAcc
    });

    sc.pos.set(s.pos[0], s.pos[1], s.pos[2]);
    sc.vel.set(s.vel[0], s.vel[1], s.vel[2]);
    sc.quat.copy(new Quaternion(s.quat[0], s.quat[1], s.quat[2], s.quat[3]));
    sc.omega.set(s.omegaBody[0], s.omegaBody[1], s.omegaBody[2]);

    const rep = this.contact.report();
    if (rep.state !== this._lastContactState) {
      const prev = this._lastContactState;
      this._lastContactState = rep.state;
      if (rep.state === 'CONTACT' && prev === 'IN_FLIGHT') {
        const i = rep.impact;
        this.eventBus.emit('INFO', 'landing',
          `Touchdown: ${i.vVertMS.toFixed(2)} m/s vertical, ${i.vHorizMS.toFixed(2)} m/s lateral, tilt ${i.tiltDeg.toFixed(1)} deg`);
      } else if (rep.state === 'LANDED') {
        sc.landingDocking.state = 'LANDED';
        if (rep.outcome.outcome === 'SAFE') {
          this.eventBus.emit('INFO', 'landing', 'Landed safely');
        } else {
          this.eventBus.emit('WARNING', 'landing', `Hard landing, damage ${(rep.damage * 100).toFixed(1)}%`);
        }
      } else if (rep.state === 'CRASHED') {
        sc.landingDocking.state = 'CRASHED';
        this.eventBus.emit('CRITICAL', 'landing',
          `CRASH ON TOUCHDOWN (${rep.outcome.reason}). Damage: ${(rep.damage * 100).toFixed(1)}%`);
      } else if (rep.state === 'IN_FLIGHT' && prev === 'CONTACT') {
        sc.landingDocking.state = this._preContactLandingState ?? sc.landingDocking.state;
        this.eventBus.emit('INFO', 'landing', 'Liftoff');
      }
    }

    if (this.contact.shouldDisengage()) {
      this.contact.disengage();
      this._lastContactState = 'IDLE';
      this.eventBus.emit('INFO', 'landing', 'Contact physics released');
    }
  }

  /**
   * Fast O(1) state snapshot query (cached from latest physics tick)
   * Completely safe to call from any number of concurrent Express HTTP requests
   */
  getStateSnapshot() {
    if (!this.cachedSnapshot) {
      this.cachedSnapshot = this.buildSnapshot();
    }
    return this.cachedSnapshot;
  }

  /**
   * Builds the comprehensive state snapshot JSON
   */
  buildSnapshot() {
    const elements = OrbitalElements.calculate(
      this.spacecraft.pos,
      this.spacecraft.vel,
      this.primaryBody.mu,
      this.primaryBody.radius
    );

    const deltaVRemaining = this.spacecraft.propulsion.computeRemainingDeltaV(
      this.spacecraft.getDryTotalMass()
    );

    const sensorReadout = this.spacecraft.attitude.getSensors(
      this.spacecraft.omega,
      this.spacecraft.quat
    );

    const predictedTrajectory = TrajectoryPredictor.predictTrajectory(
      this.spacecraft.pos,
      this.spacecraft.vel,
      this.primaryBody.mu,
      new Vector3(0, 0, 0),
      60,
      elements?.orbitalPeriodSeconds || 5400
    );

    return {
      time_s: this.simulationTimeSeconds,
      mission_elapsed_time_s: this.missionElapsedTimeSeconds,
      time_scale: this.timeScale,
      is_running: this.isRunning,
      primary_body: {
        id: this.primaryBody.id,
        name: this.primaryBody.name,
        radius_m: this.primaryBody.radius,
        mass_kg: this.primaryBody.mass
      },
      spacecraft: {
        id: this.spacecraft.id,
        name: this.spacecraft.name,
        position_m: this.spacecraft.pos.toArray(),
        velocity_m_s: this.spacecraft.vel.toArray(),
        orientation_quaternion: this.spacecraft.quat.toArray(),
        angular_velocity_rad_s: this.spacecraft.omega.toArray(),
        euler_angles_deg: sensorReadout.eulerDegrees,
        speed_m_s: this.spacecraft.vel.length(),
        altitude_m: this.spacecraft.pos.length() - this.primaryBody.radius,
        total_mass_kg: this.spacecraft.getTotalMass(),
        dry_mass_kg: this.spacecraft.getDryTotalMass(),
        propellant_mass_kg: this.spacecraft.propulsion.getTotalPropellantMass(),
        delta_v_remaining_m_s: deltaVRemaining,
        landing_state: this.spacecraft.landingDocking.state
      },
      orbital_elements: elements,
      predicted_trajectory: predictedTrajectory,
      propulsion: {
        engines: this.spacecraft.propulsion.engines,
        rcs_active: this.spacecraft.propulsion.rcsThrusters.filter(t => t.active).map(t => t.id),
        tanks: this.spacecraft.propulsion.tanks
      },
      attitude: {
        autopilot_active: this.spacecraft.attitude.autopilotActive,
        reaction_wheels: sensorReadout.wheels
      },
      power: (() => {
        const p = this.spacecraft.power;
        const s = p.lastStatus; // undefined until the first physics step has run
        return {
          generation_w: s ? s.generationW : null,
          solar_w: s ? s.solarW : null,
          rtg_w: s ? s.rtgW : null,
          consumption_w: s ? s.consumptionW : null,
          net_power_w: s ? s.netPowerW : null,
          battery_soc: p.battery.energyStoredWh / p.battery.capacityWh,
          battery_energy_wh: p.battery.energyStoredWh,
          bus_voltage_v: s ? s.busVoltageV : p.battery.nominalVoltage
        };
      })(),
      thermal: {
        nodes: this.spacecraft.thermal.nodes.map(n => ({
          id: n.id,
          name: n.name,
          temperature_K: n.temperatureK,
          temperature_C: n.temperatureK - 273.15
        }))
      },
      life_support: {
        cabin_pressure_kpa: (this.spacecraft.lifeSupport.gasMoles.O2 + this.spacecraft.lifeSupport.gasMoles.N2) * 8.314 * 294 / 55000,
        oxygen_store_kg: this.spacecraft.lifeSupport.oxygenStoreKg,
        water_store_kg: this.spacecraft.lifeSupport.waterStoreKg,
        crew_health: this.spacecraft.lifeSupport.crewHealth
      },
      radiation: {
        crew_cumulative_dose_sv: this.spacecraft.radiation.crewCumulativeDoseSv,
        storm_shelter_active: this.spacecraft.radiation.stormShelterActive,
        seu_count: this.spacecraft.radiation.seuCount
      },
      comms: (() => {
        const c = this.spacecraft.comms.lastStatus; // undefined until the first physics step has run
        return {
          delay_seconds: c ? c.oneWayDelaySeconds : null,
          round_trip_delay_seconds: c ? c.roundTripDelaySeconds : null,
          distance_to_earth_km: c ? c.distanceToEarthKm : null,
          link_status: c ? c.linkStatus : 'UNKNOWN',
          data_rate_kbps: c ? c.dataRateKbps : null,
          pointing_angle_deg: c ? c.pointingAngleDeg : null
        };
      })(),
      contact: this.contact ? this.contact.report() : null,
      events: this.eventBus.getActiveAlerts(),
      roguelike: this.roguelike.getRunStatus(),
      outpost: this.outpost.getSnapshot()
    };
  }
}
