<script setup lang="ts">
// Integration shell: Rohit owns this file. Himamshu's layout handoff is recorded in world/NOTES.md.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { SPACECRAFT_SEAT, STATIONS } from './contracts';
import type { LandingFlightSnapshot, LaunchFlightSnapshot, FlightStage, GravityBody, GameAction, PhysicsAdapter, Vec3, WorldAdapter, StationId, MissionData } from './contracts';
import { createInitialState, getCurrentEvent, reduceGame, STATION_TASKS, taskCompletionId } from './features/game';
import { soundFX } from './features/game/audio';
import { loadMission } from './features/missions';
import HudOverlay from './features/hud/HudOverlay.vue';
import MissionPanels from './features/ui/MissionPanels.vue';
import { usableMachines, WORK_MACHINES, type WorkWorldAdapter } from './features/world/interactables';
import SpaceflightPanel from './features/ui/SpaceflightPanel.vue';
import CabinSeatPanel from './features/ui/CabinSeatPanel.vue';
import LaunchControls from './features/ui/LaunchControls.vue';
import LandingControls from './features/ui/LandingControls.vue';
import {createLandingFlight,createFinalApproach,stepLandingFlight,landingGuidance,LANDING_ALTITUDE} from './features/physics/landing-flight';
import {createLaunchFlight,stepLaunchFlight,SPACE_ALTITUDE} from './features/physics/launch-flight';
import SplashScreen from './features/ui/SplashScreen.vue';
import LoginScreen from './features/ui/LoginScreen.vue';
import ActivityPanel from './features/world/ActivityPanel.vue';
import { advanceActivity, type Activity } from './features/game/activities';
import VisualPreflightMinigame from './features/game/VisualPreflightMinigame.vue';
import AssetCredits from './features/world/AssetCredits.vue';
import DoorPanel from './features/world/DoorPanel.vue';
import { doorApproach, doorwayOccupied, insideStation, nearbyDoor } from './features/world/doors';
import { advancePreparation, PREPARATION, type PreparationLevel } from './features/world/preflight';
import { createMusic } from './features/world/music';
import { createSpacecraftSim, type SpacecraftSim } from './features/physics/spacecraft';
import { advanceFlightControls, flightCommandForControl, FLIGHT_CONTROL_STEPS, type FlightControlKey } from './features/game/spaceflight';

const mission:MissionData = {...loadMission(),gameplayMode:'station-tasks',hazardSeed:crypto.getRandomValues(new Uint32Array(1))[0]};
const state = shallowRef(createInitialState(mission));
const host = ref<HTMLElement>();
const commandPanel = ref<HTMLElement>();
const graphicsError = ref('');
const stationMessage = ref('Click a base module to inspect systems, or use WASD / Arrow keys to walk.');
const soundEnabled = ref(true);
const directDecisionMode = ref(false);
const accessibleMachineIndex=ref(0);
const accessibleMachine=computed(()=>WORK_MACHINES[accessibleMachineIndex.value%WORK_MACHINES.length]);
const deckVisible = ref(true);
const activeActivity = shallowRef<(Activity & { taskId: string; completionId: string; impact: string }) | null>(null);
const activityProgress = ref(0);
const activityFeedback = ref('');
const interior = ref<StationId | null>(null);
const nearby = ref<StationId | null>(null);
const doorsOpen = ref<Record<StationId, boolean>>({ habitat: false, solar: false, greenhouse: false });
const doorReady = ref(false);
const flightProgress = ref<number | null>(null);
const flightStage = ref<FlightStage | null>(null);
const flightControlProgress = ref(0);
const flightFeedback = ref('');
const launchFlight=shallowRef<LaunchFlightSnapshot|null>(null);
const launchHeld=new Set<FlightControlKey>();
function clearLaunchInput(){launchHeld.clear();}
function holdLaunch(key:FlightControlKey,down:boolean){if(down&&flightStage.value==='launch'&&!preparationPaused.value)launchHeld.add(key);else launchHeld.delete(key);}
function igniteLaunch(){if(launchFlight.value&&!preparationPaused.value)launchFlight.value={...launchFlight.value,ignited:true};}
function setLaunchThrottle(value:number){if(launchFlight.value&&!preparationPaused.value&&!launchFlight.value.spaceReached)launchFlight.value={...launchFlight.value,throttle:Math.max(0,Math.min(1,value))};}
function nudgeLaunch(key:FlightControlKey){
 const s=launchFlight.value;if(!s||preparationPaused.value||s.spaceReached)return;
 if(key==='KeyW'||key==='KeyS')setLaunchThrottle(s.throttle+(key==='KeyW'?.06:-.06));
 else if(key==='KeyA'||key==='KeyD')launchFlight.value={...s,pitch:Math.max(-25,Math.min(25,s.pitch+(key==='KeyA'?-3:3)))};
}
function releaseLaunchKey(event:KeyboardEvent){launchHeld.delete(event.code as FlightControlKey);}
function clearLaunchFlight(){clearLaunchInput();launchFlight.value=null;world?.setLaunchFlight?.(null);}
const landingFlight=shallowRef<LandingFlightSnapshot|null>(null);
function clearLandingFlight(){clearLaunchInput();landingFlight.value=null;world?.setLandingFlight?.(null);}
function holdLanding(key:FlightControlKey,down:boolean){if(down&&flightStage.value==='landing'&&landingFlight.value?.status==='flying'&&!preparationPaused.value)launchHeld.add(key);else launchHeld.delete(key);}
function setLandingThrottle(value:number){const s=landingFlight.value;if(s&&s.status==='flying'&&!preparationPaused.value)landingFlight.value={...s,throttle:Math.max(0,Math.min(1,value)),assist:false};}
function nudgeLanding(key:FlightControlKey){
 const s=landingFlight.value;if(!s||s.status!=='flying'||preparationPaused.value)return;
 if(key==='KeyQ'||key==='KeyE')setLandingThrottle(s.throttle+(key==='KeyE'?.05:-.05));
 else if(key==='KeyW'||key==='KeyS')landingFlight.value={...s,pitch:Math.max(-25,Math.min(25,s.pitch+(key==='KeyW'?-3:3))),assist:false};
 else if(key==='KeyA'||key==='KeyD')landingFlight.value={...s,bank:Math.max(-25,Math.min(25,s.bank+(key==='KeyA'?-3:3))),assist:false};
}
function retryMarsLanding(){
 const final=landingFlight.value?.phase==='approach'||landingFlight.value?.status==='retry';beginMarsLanding();
 if(final){landingFlight.value=createFinalApproach();world?.setLandingFlight?.(landingFlight.value);}
}
function deployLandingLegs(){if(landingFlight.value?.status==='flying'&&landingFlight.value.phase==='approach'&&!preparationPaused.value)landingFlight.value={...landingFlight.value,legs:true};}
function toggleLandingAssist(){if(landingFlight.value?.status==='flying'&&!preparationPaused.value){clearLaunchInput();landingFlight.value={...landingFlight.value,assist:!landingFlight.value.assist};}}
let flightStageElapsed = 0;
// The bundled flight sim supplies telemetry and responds to simple throttle/attitude commands; stage timing remains authored for a short, child-friendly mission.
let flightSim: SpacecraftSim | undefined;
const flightTelemetry = ref('');
const gravityLabel = ref('');
function setGravity(body: GravityBody) {
  physics?.setGravityBody?.(body);
  const info = physics?.getGravityInfo?.();
  gravityLabel.value = !info ? '' : info.canJump
    ? `Gravity: ${info.gravityMS2.toFixed(2)} m/s² (${Math.round(info.relativeToEarth * 100)}% of Earth) · press Space to jump — about ${info.jumpHeightM.toFixed(2)} m high here`
    : 'Orbit cabin: free fall feels weightless. Gravity still acts on the spacecraft; the simplified cabin controller does not jump.';
}
function startFlightSim(preset: string, timeScale = 1, paused = false) {
  stopFlightSim();
  try {
    flightSim = createSpacecraftSim(preset);
    flightSim.setTimeScale(timeScale);
    if (paused) flightSim.pause();
  } catch (error) { console.warn('Flight sim unavailable', error); flightSim = undefined; }
}
function stopFlightSim() { flightSim?.dispose(); flightSim = undefined; flightTelemetry.value = ''; }
function mayResumeFlightSim() {
  if (flightStage.value === 'launch') return flightControlProgress.value >= 2;
  if (flightStage.value === 'landing') return flightControlProgress.value >= 3;
  return flightStage.value !== null;
}
function stepFlightSim(seconds: number) {
  if (!flightSim) return;
  try {
    flightSim.step(seconds);
    const s = flightSim.getSnapshot().spacecraft;
    flightTelemetry.value = `Flight computer · altitude ${(s.altitude_m / 1000).toFixed(1)} km · speed ${(s.speed_m_s / 1000).toFixed(2)} km/s · propellant ${Math.round(s.propellant_mass_kg).toLocaleString()} kg · Δv ${Math.round(s.delta_v_remaining_m_s).toLocaleString()} m/s`;
  } catch (error) { console.warn('Flight sim failed', error); stopFlightSim(); }
}
let arrivalComplete = false;
let music: ReturnType<typeof createMusic> | undefined;
const preparation = ref<PreparationLevel | null>(null);
const earthOutside = ref(false);
const preparationProgress = ref(0);
const preparationFeedback = ref('');
const preparationPaused = ref(false);
const nearConsole = ref(false);
const nearCabinSeat = ref(false);
const cabinSeated = ref(false);
// Arrival guidance is optional. Start survival time only when the player takes control.
const missionTimerActive=ref(false);
const arrivalGuide=ref(false);
function startMissionAfterGuide(){
 if(state.value.phase!=='running'||missionTimerActive.value)return;
 missionTimerActive.value=true;arrivalGuide.value=false;
 physics?.resumeInput?.();
}
let remoteConsole = false;

function updateFlightStage(stage: FlightStage | null, progress = 0) {
  if(stage)deckVisible.value=true;
  flightStage.value = stage;
  flightProgress.value = stage === null ? null : Math.max(0, Math.min(1, progress));
  flightStageElapsed = 0;
  world?.setJourney?.(null);
  world?.setFlightStage?.(stage, progress);
}

function beginPreparation(level: PreparationLevel) {
  clearLandingFlight();clearLaunchFlight();
  deckVisible.value=true;
  updateFlightStage(null);
  world?.setJourney?.(null);
  stopFlightSim();
  preparation.value = level; preparationProgress.value = 0; preparationFeedback.value = ''; preparationPaused.value = false; nearConsole.value = false; nearCabinSeat.value = false; cabinSeated.value = false; remoteConsole = false;
  earthOutside.value = level === 'earth';
  world?.setLevel?.(level); world?.setEarthOutside?.(earthOutside.value); world?.setActivityProgress?.(0);
  if (earthOutside.value) { const spawn=doorApproach('habitat');physics?.reset?.({...spawn,z:spawn.z+1});setDoor('habitat',true); }
  else physics?.enterInterior?.();
  setGravity(level === 'earth' ? 'earth' : 'orbit');
  physics?.resumeInput?.();
  stationMessage.value = level === 'earth' ? 'Earth departure checks: fuel, crew air, food and water cargo, guidance batteries and the launch window.' : 'Ares rocket cabin: drift between the navigation, trajectory and communications tasks. Cabin gravity is near zero.';
  world?.setCabinSeatState?.('hidden');
  music?.setPaused(false); music?.select(level); music?.unlock();
}

function beginLaunchSequence() {
  earthOutside.value = false;
  world?.setEarthOutside?.(false);
  preparation.value = null;
  physics?.exitInterior?.();
  physics?.pauseInput?.();
  world?.setLevel?.(null);
  world?.setActivityProgress?.(0);
  preparationPaused.value = false;
  flightControlProgress.value = 0;
  nearCabinSeat.value = false; cabinSeated.value = false; world?.setCabinSeatState?.('hidden');
  flightFeedback.value = 'Boarded and strapped in. Press Space to begin the countdown.';
  stopFlightSim();clearLaunchInput();launchFlight.value=createLaunchFlight();
  world?.setLaunchFlight?.(launchFlight.value);
  updateFlightStage('launch', 0);
  music?.setPaused(false); music?.select('space');
}

function beginMarsTransfer() {
  preparationPaused.value = false;
  flightControlProgress.value = 0;
  flightFeedback.value = 'Course checked. Autopilot has the Mars transfer.';
  startFlightSim('EARTH_MARS_TRANSFER', 20);
  updateFlightStage('transfer', 0);
  physics?.pauseInput?.();
  world?.setLevel?.(null);
  music?.select('space');
}

function sitInFlightSeat() {
  if (preparation.value !== 'space' || preparationProgress.value < PREPARATION.space.steps.length || preparationPaused.value || cabinSeated.value) return;
  if (!nearCabinSeat.value) {
    preparationFeedback.value = 'Float beside the glowing flight seat first, then press E or the seat button.';
    deckVisible.value = true;
    return;
  }
  cabinSeated.value = true;
  preparationFeedback.value = 'You are strapped in. Watch Earth, the Moon, the Sun, Mars, and distant planets drift past the front window. Start the transfer when you are ready.';
  stationMessage.value = 'Flight seat secured. Enjoy the window view; the rocket can wait here until you begin the Mars transfer.';
  physics?.pauseInput?.();
  world?.setCabinSeatState?.('occupied');
}

function beginTransferFromFlightSeat() {
  if (!cabinSeated.value || preparation.value !== 'space') return;
  cabinSeated.value = false;
  nearCabinSeat.value = false;
  world?.setCabinSeatState?.('hidden');
  preparation.value = null;
  preparationProgress.value = 0;
  preparationFeedback.value = '';
  physics?.exitInterior?.();
  world?.setLevel?.(null);
  beginMarsTransfer();
}

function beginMarsLanding() {
  preparationPaused.value = false;
  flightControlProgress.value = 0;
  flightFeedback.value = 'Mars approach confirmed. Use small steering and thrust corrections.';
  stopFlightSim();clearLaunchInput();landingFlight.value=createLandingFlight();
  world?.setLandingFlight?.(landingFlight.value);
  updateFlightStage('landing', 0);
  physics?.pauseInput?.();
  world?.setLevel?.(null);
}

function operateFlightControl(key: FlightControlKey) {
  if(flightStage.value==='landing'&&landingFlight.value){if(key==='Space')deployLandingLegs();else nudgeLanding(key);return;}
  if(flightStage.value==='launch'&&launchFlight.value){if(key==='Space')igniteLaunch();else nudgeLaunch(key);return;}
  const stage = flightStage.value;
  if ((stage !== 'launch' && stage !== 'landing') || preparationPaused.value) return;
  const completedAction = FLIGHT_CONTROL_STEPS[stage][flightControlProgress.value]?.action ?? 'Flight control';
  const result = advanceFlightControls(stage, flightControlProgress.value, key);
  if (!result.accepted) {
    flightFeedback.value = result.expected ? `Use ${result.expected.key === 'Space' ? 'Space' : result.expected.key.replace('Key', '')}: ${result.expected.action}.` : 'The flight sequence is complete.';
    return;
  }
  const command = flightCommandForControl(stage, key, flightControlProgress.value);
  if (command) flightSim?.command(command);
  if (key === 'KeyW') flightSim?.resume();
  if (stage === 'landing' && key === 'Space' && flightControlProgress.value === FLIGHT_CONTROL_STEPS.landing.length - 1) {
    flightSim?.command({ action: 'set_throttle', throttle: 0.2 });
    flightSim?.setTimeScale(10);
  }
  flightControlProgress.value = result.progress;
  flightProgress.value = stage === 'launch'
    ? Math.max(0, (result.progress - 1) / (FLIGHT_CONTROL_STEPS.launch.length - 1))
    : result.progress / FLIGHT_CONTROL_STEPS.landing.length;
  const nextStep = FLIGHT_CONTROL_STEPS[stage][result.progress]?.action;
  flightFeedback.value = result.complete ? (stage === 'launch' ? 'Guidance is taking over for orbital insertion.' : 'Landing controls are set. Autopilot is completing touchdown.') : `${completedAction} complete. Next: ${nextStep}.`;
  world?.setFlightStage?.(stage, flightProgress.value);
  if (result.complete && stage === 'launch') updateFlightStage('orbit-autopilot', 0);
  if (result.complete && stage === 'landing') updateFlightStage('touchdown', 0);
}

function togglePreparationPause() {
  clearLaunchInput();
  preparationPaused.value = !preparationPaused.value;
  music?.setPaused(preparationPaused.value);
  if (preparationPaused.value) { physics?.pauseInput?.(); flightSim?.pause(); }
  else { if (!flightStage.value && !cabinSeated.value) physics?.resumeInput?.(); if (mayResumeFlightSim()) flightSim?.resume(); }
  world?.setMotionPaused?.(preparationPaused.value || state.value.phase === 'paused');
}
function enterEarthLab(accessible = true) {
  if (preparation.value !== 'earth' || preparationPaused.value || !earthOutside.value) return;
  if (accessible) {setDoor('habitat',true);physics?.resumeInput?.();const station=STATIONS.find(station=>station.id==='habitat')!;physics?.walkPath?.([doorApproach('habitat'),{x:station.position.x,y:.8,z:station.position.z}]);}
  preparationFeedback.value = 'Walking into the training lab. Manual movement cancels guided walking.';
}
function leaveEarthLab() {
  if (preparation.value !== 'earth' || preparationPaused.value || earthOutside.value) return;
  setDoor('habitat',true);physics?.resumeInput?.();const station=STATIONS.find(station=>station.id==='habitat')!;physics?.walkPath?.([{x:station.position.x,y:.8,z:station.position.z+2},doorApproach('habitat')]);
  preparationFeedback.value = 'Walking back outdoors through the same doorway.';
}
function operatePreparation(control: string) {
  const level = preparation.value;
  if (!level || preparationPaused.value) return;
  if (!nearConsole.value && !remoteConsole) { preparationFeedback.value = 'Walk to the console or enable the accessible remote console.'; return; }
  const next = advancePreparation(level, preparationProgress.value, control);
  if (next === preparationProgress.value) { preparationFeedback.value = 'Follow the procedure in order.'; return; }
  preparationProgress.value = next; world?.setActivityProgress?.(next); preparationFeedback.value = `Check ${next} complete.`;
  if (next === PREPARATION[level].steps.length) {
    if (level === 'space') {
      world?.setCabinSeatState?.('available');
      preparationFeedback.value = 'All three cabin tasks are complete. Float to the marked flight seat and buckle in before Mars approach.';
      stationMessage.value = 'Flight tasks complete. The glowing seat marker shows where to buckle in.';
      physics?.resumeInput?.();
      deckVisible.value = true;
    } else {
      earthOutside.value = false; world?.setEarthOutside?.(false);
      preparation.value = null; physics?.exitInterior?.(); world?.setLevel?.(null); world?.setActivityProgress?.(0);
      beginLaunchSequence();
    }
  }
}

function handleVisualMinigameControl(control: string) {
  remoteConsole = true;
  operatePreparation(control);
}

function skipPreparation() {
  if (!preparation.value || preparation.value === 'space') return;
  const level = preparation.value;
  remoteConsole = true;
  for (let i = preparationProgress.value; i < PREPARATION[level].steps.length; i++) {
    operatePreparation(PREPARATION[level].steps[i]);
  }
}

function finishArrival() {
  if (flightStage.value === 'orbit-autopilot') {
    flightSim?.pause();
    beginPreparation('space');
    return;
  }
  if (flightStage.value === 'transfer') { beginMarsLanding(); return; }
  if (flightStage.value === 'touchdown') {
    clearLandingFlight();stopFlightSim();
    updateFlightStage(null);
    arrivalComplete = true;deckVisible.value=false;physics?.reset?.({x:0,y:.8,z:6});setGravity('mars');music?.select('mars'); stationMessage.value = 'Touchdown complete. Mars gravity is 3.72 m/s², about 38% of Earth gravity. Walk inside a station and use a glowing machine to work.'; dispatch({ type: 'START' });
  }
}
function setDoor(id: StationId, open: boolean) { doorsOpen.value = { ...doorsOpen.value, [id]: open }; doorReady.value = false; world?.setDoorState?.(id, open); }
function toggleDoor() {
  if (state.value.phase !== 'running') return;
  startMissionAfterGuide();
  const id = interior.value ?? nearby.value;
  if (!id) return;
  if(doorsOpen.value[id] && doorwayOccupied(physics!.getPlayerPose(),id)) {stationMessage.value='Step clear of the doorway before closing it.';return;}
  setDoor(id, !doorsOpen.value[id]);
  stationMessage.value = `${id} door ${doorsOpen.value[id] ? 'opening — walk through when ready' : 'closed'}.`;
}
function leaveModule() {
  const id = interior.value;
  if(!id || state.value.phase!=='running')return;
  setDoor(id,true);physics?.resumeInput?.();const station=STATIONS.find(station=>station.id===id)!;
  physics?.walkPath?.([{x:station.position.x,y:.8,z:station.position.z+2},doorApproach(id)]);
  stationMessage.value='Walking out through the door. Use WASD to take control.';
}
function travelToDoor(id: StationId) {
  if (state.value.phase !== 'running') return;
  startMissionAfterGuide();
  leaveModule(); physics?.reset?.(doorApproach(id)); nearby.value = id;
  doorReady.value = false;
  stationMessage.value = `At the ${id} entrance. Open the door with E or the button.`;
}
function cancelActivity(cancelSimulation=true) {
  if(cancelSimulation)state.value=reduceGame(state.value,{type:'CANCEL_TASK'},mission);
  if(cancelSimulation)soundFX.playRestart();
  activeActivity.value = null;deckVisible.value=false;
  if(state.value.phase==='running')physics?.resumeInput?.();
  activityProgress.value = 0;
  world?.setActivityProgress?.(0);
  world?.setObjective?.(null);
}
function enterModule(id: StationId | null = nearby.value) {
  if (state.value.phase !== 'running' || interior.value) return;
  if (!id || nearby.value !== id) { activityFeedback.value = 'Walk closer to the door first, or use accessible travel.'; return; }
  if (!doorsOpen.value[id] || !(world?.isDoorOpen?.(id) ?? true)) { stationMessage.value = 'Open the door and let it finish sliding first.'; return; }
  physics?.resumeInput?.();const station=STATIONS.find(station=>station.id===id)!;
  physics?.walkPath?.([doorApproach(id),{x:station.position.x,y:.8,z:station.position.z}]);
  stationMessage.value=`Walking through the ${id} doorway.`;
}
function travelToTask() {
  if (!activeActivity.value || state.value.phase !== 'running') return;
  travelToDoor(activeActivity.value.station);
  setDoor(activeActivity.value.station, true);
  activityFeedback.value = 'Door opening. Walk through or choose Enter room once open.';
}
function operateControl(control: string) {
  const task = activeActivity.value;
  if (!task || (!directDecisionMode.value && !graphicsError.value && interior.value !== task.station) || state.value.phase !== 'running') return;
  const next = advanceActivity(task, activityProgress.value, control);
  if (next === activityProgress.value) {
    soundFX.playWarning();
    activityFeedback.value = 'That control comes later. Follow the numbered procedure.';
    return;
  }
  activityProgress.value = next;
  world?.setActivityProgress?.(next);
  activityFeedback.value = `Step ${next} complete.`;
  if (next === task.steps.length) {
    cancelActivity(false);
    dispatch({type:'COMPLETE_TASK',completionId:task.completionId});
    stationMessage.value = `Completed ${task.title}. ${state.value.lastHazardNotice ?? 'Reserves and mission history now show the result.'}`;
  } else {
    soundFX.playDecision();
  }
}

const stationDescriptions: Record<string, string> = {
  habitat: 'Habitat Module: Life support, crew quarters, and radiation storm shelter. Reinforcing shielding protects vital systems.',
  solar: 'Solar Array Station: Photovoltaic panels harvest sunlight. Battery reserves buffer nocturnal life support.',
  greenhouse: 'Hydroponic Greenhouse: Recycles air, grows food supplies, and reduces consumable replenishment stress.',
};

let world: (WorldAdapter & Partial<WorkWorldAdapter>) | undefined;
let physics: PhysicsAdapter | undefined;
let frame = 0;
let disposed = false;
let accumulator = 0;
let missionSeconds=0;
const showSplash = ref(true);
const showLogin = ref(true);

function onSplashDone() {
  showSplash.value = false;
}

function onLoginStart() {
  showLogin.value = false;
  dispatch({ type: 'START' });
}

let lastNearStation: string | null = null;
let currentSelectedStation: string | null = null;
const availableTaskStations = computed<StationId[]>(() => {
  if (activeActivity.value) return [activeActivity.value.station];
  return [...new Set(STATION_TASKS.map(task=>task.station))];
});

function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  soundFX.enabled = soundEnabled.value;
  music?.setEnabled(soundEnabled.value); music?.unlock();
}

function dispatch(action: GameAction) {
  if (action.type === 'START' && !directDecisionMode.value && !arrivalComplete && world && !graphicsError.value) {
    if (!preparation.value && flightProgress.value === null) beginPreparation('earth');
    return;
  }
  if(action.type==='START'&&state.value.phase==='ready'&&(directDecisionMode.value||graphicsError.value)){arrivalComplete=true;setGravity('mars');world?.setLevel?.(null);world?.setJourney?.(null);music?.select('mars');}
  if(action.type==='CHOOSE')return;
  if(action.type==='START_TASK') {
    if(state.value.phase==='running')startMissionAfterGuide();
    const previous=state.value;state.value=reduceGame(state.value,action,mission);
    if(state.value===previous)return;
    const task=STATION_TASKS.find(task=>task.id===action.taskId)!;
    activeActivity.value={...task,taskId:task.id,completionId:taskCompletionId(state.value,task.id),impact:task.benefit+' · '+task.prevention};
    activityProgress.value=0;activityFeedback.value='Finish the station minigame to earn this reward.';
    world?.setObjective?.(task.station);physics?.pauseInput?.();deckVisible.value=false;return;
  }
  if (action.type === 'RESTART') { missionTimerActive.value=false;arrivalGuide.value=false;clearLandingFlight();clearLaunchFlight();missionSeconds=0;cancelActivity();interior.value=null;world?.setInterior?.(null);for (const station of STATIONS) setDoor(station.id, false); nearby.value = null; deckVisible.value = true; preparation.value = null; preparationProgress.value=0;nearCabinSeat.value=false;cabinSeated.value=false;world?.setCabinSeatState?.('hidden');arrivalComplete = false; preparationPaused.value=false;flightControlProgress.value=0;flightFeedback.value='';stopFlightSim();updateFlightStage(null);world?.setJourney?.(null);world?.setLevel?.(null); music?.select('earth'); music?.setPaused(false); }
  if (action.type === 'PAUSE' && state.value.phase === 'running') music?.setPaused(true);
  if (action.type === 'RESUME' && state.value.phase === 'paused') music?.setPaused(false);
  const previousState = state.value;
  state.value = reduceGame(state.value, action, mission);
  if (state.value !== previousState && action.type!=='TICK') {
    void nextTick(() => { if (commandPanel.value) commandPanel.value.scrollTop = 0; });
  }

  if (action.type === 'START') {
    if(previousState.phase==='ready'&&state.value.phase==='running'){missionTimerActive.value=false;arrivalGuide.value=true;}
    if(state.value.phase==='running')physics?.resumeInput?.();
    soundFX.playStart();
  } else if(action.type==='COMPLETE_TASK'||action.type==='TICK') {
    if(state.value.phase==='won'&&previousState.phase!=='won')soundFX.playVictory();
    else if(state.value.phase==='lost'&&previousState.phase!=='lost')soundFX.playDepleted();
    else if(state.value.lastHazardNotice!==previousState.lastHazardNotice)soundFX.playHazard();
    else if(action.type==='COMPLETE_TASK'&&state.value!==previousState)soundFX.playDecision();
    if(state.value.phase==='won'||state.value.phase==='lost'){cancelActivity(false);deckVisible.value=true;physics?.pauseInput?.();music?.setPaused(true);}
  } else if (action.type === 'RESTART') {
    soundFX.playRestart();
    if (physics?.reset) {
      physics.reset();
      stationMessage.value = 'Outpost and astronaut reset to spawn. Plan your shifts carefully.';
    } else {
      stationMessage.value = 'New resource plan. Astronaut position stays where you left it until full physics reset is integrated.';
    }
    currentSelectedStation = null;
    lastNearStation = null;
  } else if (action.type === 'PAUSE') {
    physics?.pauseInput?.();
  } else if (action.type === 'RESUME') {
    if(!activeActivity.value)physics?.resumeInput?.();
  }
}

function advanceMissionTime(elapsed:number) {
  if(state.value.phase==='running'&&missionTimerActive.value&&!document.hidden&&!preparation.value&&flightProgress.value===null){
    missionSeconds+=elapsed;
    if(missionSeconds>=1){missionSeconds-=1;dispatch({type:'TICK',seconds:1});}
  }else missionSeconds=0;
}

function pauseWhenHidden() {
  if(document.hidden)clearLaunchInput();
  if (document.hidden && (preparation.value || flightStage.value)) { preparationPaused.value = true; physics?.pauseInput?.(); flightSim?.pause(); music?.setPaused(true); }
  if (document.hidden) dispatch({ type: 'PAUSE' });
}

let lastCheckedPose = { x: 999, y: 999, z: 999 };
function checkStationProximity(pose: Vec3) {
  if (preparation.value || flightProgress.value !== null || state.value.phase !== 'running') return;
  const inside=insideStation(pose);
  if(inside!==interior.value) {
    interior.value=inside;world?.setInterior?.(inside);
    if(inside && !activeActivity.value)deckVisible.value=false;
    stationMessage.value=inside?`Inside the ${inside}. Walk back through the same door to leave.`:'Outside on Mars. Your position stays in the same world.';
  }
  if(inside){nearby.value=null;return;}
  nearby.value = nearbyDoor(pose);
  if (currentSelectedStation) return;
  const dx = pose.x - lastCheckedPose.x;
  const dz = pose.z - lastCheckedPose.z;
  if (dx * dx + dz * dz < 0.0025) return;
  lastCheckedPose = { x: pose.x, y: pose.y, z: pose.z };

  for (const station of STATIONS) {
    const dist = Math.hypot(pose.x - station.position.x, pose.z - station.position.z);
    if (dist < 4.0) {
      if (lastNearStation !== station.id) {
        lastNearStation = station.id;
        stationMessage.value = `Proximity: Near ${stationDescriptions[station.id] || station.id}`;
      }
      return;
    }
  }
  if (lastNearStation !== null) {
    lastNearStation = null;
    stationMessage.value = 'Astronaut walking on Mars. Visit a station computer to work.';
  }
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if(landingFlight.value&&flightStage.value==='landing'&&!(event.target as HTMLElement|null)?.closest('input,textarea,select,[contenteditable]')){
    if(event.code==='KeyP'){event.preventDefault();if(!event.repeat)togglePreparationPause();return;}
    if(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE'].includes(event.code)){event.preventDefault();holdLanding(event.code as FlightControlKey,true);return;}
    if(event.code==='Space'&&!(event.target as HTMLElement|null)?.closest('button')){event.preventDefault();if(!event.repeat)deployLandingLegs();return;}
  }
  if(state.value.phase==='running'&&!activeActivity.value&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)&&!(event.target as HTMLElement|null)?.closest('input,textarea,select,[contenteditable]'))startMissionAfterGuide();
  if(launchFlight.value&&flightStage.value==='launch'&&!(event.target as HTMLElement|null)?.closest('input,textarea,select,[contenteditable]')){
    if(event.code==='KeyP'){event.preventDefault();if(!event.repeat)togglePreparationPause();return;}
    if(['KeyW','KeyS','KeyA','KeyD'].includes(event.code)){event.preventDefault();holdLaunch(event.code as FlightControlKey,true);return;}
    if(event.code==='Space'&&!(event.target as HTMLElement|null)?.closest('button')){event.preventDefault();if(!event.repeat)igniteLaunch();return;}
  }
  if ((event.target as HTMLElement | null)?.closest('button, input, textarea, select, [contenteditable]')) return;
  if ((preparation.value || flightStage.value) && event.code === 'KeyP') { event.preventDefault(); togglePreparationPause(); return; }
  if (flightStage.value) {
    if (event.code === 'Space' || event.code === 'Enter') {
      if (flightStage.value === 'orbit-autopilot' || flightStage.value === 'transfer' || flightStage.value === 'touchdown') {
        event.preventDefault(); if (!preparationPaused.value) finishArrival();
      } else if (!event.repeat) {
        event.preventDefault(); operateFlightControl('Space');
      }
      return;
    }
    const flightKey = event.code === 'KeyW' || event.code === 'KeyA' || event.code === 'KeyS' || event.code === 'KeyD' ? event.code : undefined;
    if (flightKey && !event.repeat && (flightStage.value === 'launch' || flightStage.value === 'landing')) {
      event.preventDefault(); operateFlightControl(flightKey as FlightControlKey); return;
    }
    return;
  }
  if (preparation.value === 'earth' && event.code === 'KeyE') {
    event.preventDefault();
    if (!event.repeat && !preparationPaused.value && (!earthOutside.value || nearbyDoor(physics!.getPlayerPose()) === 'habitat')) {
      if(doorsOpen.value.habitat && doorwayOccupied(physics!.getPlayerPose(),'habitat'))preparationFeedback.value='Step clear of the doorway before closing it.';
      else setDoor('habitat',!doorsOpen.value.habitat);
    }
    return;
  }
  if (preparation.value === 'space' && preparationProgress.value >= PREPARATION.space.steps.length && event.code === 'KeyE') {
    event.preventDefault();
    if (!event.repeat) sitInFlightSeat();
    return;
  }
  if(event.code==='KeyE'&&state.value.phase==='running'&&!activeActivity.value&&interior.value&&physics&&usableMachines(physics.getPlayerPose(),interior.value).length)return;
  if (event.code === 'KeyE') { event.preventDefault(); if (!event.repeat) toggleDoor(); return; }
  if (event.code === 'KeyM') {
    toggleSound();
    return;
  }
  if (event.code === 'KeyC') {
    deckVisible.value = !deckVisible.value;
    return;
  }
  if (activeActivity.value) {
    if (event.code === 'KeyT') {
      event.preventDefault();
      travelToTask();
      return;
    }
    if (event.code === 'Escape') {
      event.preventDefault();
      cancelActivity();
      return;
    }
  }
  if (state.value.phase === 'ready') {
    if (['Space', 'Enter', 'KeyS'].includes(event.code)) {
      event.preventDefault();
      dispatch({ type: 'START' });
    }
    return;
  }
  if (state.value.phase === 'running') {
    if (event.code === 'KeyP') { // Space is reserved for jumping.
      event.preventDefault();
      dispatch({ type: 'PAUSE' });
    }
  } else if (state.value.phase === 'paused') {
    if (['KeyP', 'Space', 'Enter'].includes(event.code)) {
      event.preventDefault();
      dispatch({ type: 'RESUME' });
    }
  } else if (['won', 'lost'].includes(state.value.phase)) {
    if (['KeyR', 'Space', 'Enter'].includes(event.code)) {
      event.preventDefault();
      dispatch({ type: 'RESTART' });
    }
  }
}

onMounted(async () => {
  music = createMusic();
  document.addEventListener('visibilitychange', pauseWhenHidden);
  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('keyup',releaseLaunchKey);window.addEventListener('blur',clearLaunchInput);
  try {
    const [{ createWorld }, { createPhysics }] = await Promise.all([
      import('./features/world'),
      import('./features/physics'),
    ]);
    if (disposed) return;
    world = createWorld(host.value!, station => {
      if (nearby.value === station && state.value.phase === 'running') { toggleDoor(); return; }
      currentSelectedStation = station;
      stationMessage.value = stationDescriptions[station] || `Selected: ${station}. Use its computer to work.`;
    });
    world.onInteract?.(id=>dispatch({type:'START_TASK',taskId:id}));
    physics = await createPhysics();
    setGravity(preparation.value==='earth'?'earth':preparation.value==='space'?'orbit':'mars');
    world.setConsoleHandler?.(index => {
      if (preparation.value === 'space') {
        if (preparationProgress.value >= PREPARATION.space.steps.length) {
          preparationFeedback.value = 'Cabin checks are done. Use the glowing seat marker, then press E to buckle in.';
        } else {
          remoteConsole = true;
          deckVisible.value = true;
          preparationFeedback.value = `${PREPARATION.space.steps[preparationProgress.value]} is ready. Complete its interactive task in the flight deck.`;
        }
      } else if (preparation.value) {const steps=PREPARATION[preparation.value].steps;const progress=preparationProgress.value;operatePreparation(steps[index===progress%3?progress:index]);}

      else if(interior.value) {stationMessage.value='Approach a glowing machine and press E.';}
    });
    if (disposed) {
      physics.dispose();
      return;
    }
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      if (flightStage.value && !document.hidden && !preparationPaused.value) {
        const stage = flightStage.value;
        if(launchFlight.value&&(stage==='launch'||stage==='orbit-autopilot')){
          launchFlight.value=stepLaunchFlight(launchFlight.value,elapsed,{throttle:Number(launchHeld.has('KeyW'))-Number(launchHeld.has('KeyS')),steer:Number(launchHeld.has('KeyD'))-Number(launchHeld.has('KeyA'))});
          flightProgress.value=Math.min(1,launchFlight.value.altitude/SPACE_ALTITUDE);
          world!.setLaunchFlight?.(launchFlight.value);
          if(stage==='launch'&&launchFlight.value.spaceReached){clearLaunchInput();updateFlightStage('orbit-autopilot',0);}
        }else if(landingFlight.value&&(stage==='landing'||stage==='touchdown')){
          landingFlight.value=stepLandingFlight(landingFlight.value,elapsed,{throttle:Number(launchHeld.has('KeyE'))-Number(launchHeld.has('KeyQ')),pitch:Number(launchHeld.has('KeyS'))-Number(launchHeld.has('KeyW')),steer:Number(launchHeld.has('KeyD'))-Number(launchHeld.has('KeyA'))});
          flightProgress.value=Math.max(0,Math.min(1,1-landingFlight.value.altitude/LANDING_ALTITUDE));
          world!.setLandingFlight?.(landingFlight.value);
          if(stage==='landing'&&landingFlight.value.status==='landed'){clearLaunchInput();updateFlightStage('touchdown',1);}
          else if(landingFlight.value.status==='retry')clearLaunchInput();
        }else stepFlightSim(elapsed);
        if (stage === 'orbit-autopilot' || stage === 'transfer' || stage === 'touchdown') {
          const duration = stage === 'orbit-autopilot' ? 4 : stage === 'transfer' ? 8 : 3;
          flightStageElapsed += elapsed;
          flightProgress.value = Math.min(1, flightStageElapsed / duration);
          if (flightProgress.value >= 1) finishArrival();
        }
        if (flightStage.value === stage) world!.setFlightStage?.(stage, flightProgress.value ?? 0);
      }
      if (state.value.phase === 'running' || (preparation.value && !preparationPaused.value)) {
        physics!.setCameraYaw?.(world!.getCameraYaw?.() ?? 0);
        accumulator = Math.min(accumulator + elapsed, 0.1);
        while (accumulator >= 1 / 60) {
          physics!.step(1 / 60);
          accumulator -= 1 / 60;
        }
      } else {
        accumulator = 0;
      }
      advanceMissionTime(elapsed);
      let pose = physics!.getPlayerPose();
      if (preparation.value === 'earth') {
        const outside=insideStation(pose)!=='habitat';
        if(outside!==earthOutside.value){earthOutside.value=outside;world!.setEarthOutside?.(outside);}
        const lab=STATIONS.find(station=>station.id==='habitat')!;
        nearConsole.value=!outside && Math.abs(pose.x-lab.position.x)<2.6 && pose.z<lab.position.z-1;
        nearCabinSeat.value=false;
      } else if (preparation.value === 'space') {
        nearConsole.value=pose.z<-.4;
        nearCabinSeat.value=preparationProgress.value>=PREPARATION.space.steps.length && Math.hypot(pose.x-SPACECRAFT_SEAT.x,pose.z-SPACECRAFT_SEAT.z)<.95;
      } else { nearConsole.value=false; nearCabinSeat.value=false; }
      checkStationProximity(pose);
      pose = physics!.getPlayerPose();
      const usable=state.value.phase==='running'&&!activeActivity.value&&!preparation.value&&flightProgress.value===null?usableMachines(pose,interior.value):[];
      world!.setInteractables?.(usable);world!.setPrompt?.(usable[0]?'E · '+usable[0].label:'');
      world!.setPlayerPose(pose);
      world!.setState(state.value);
      if (state.value.phase === 'running') {
        const offerId=`${mission.id}:station-work`;
        world!.setAvailableTasks?.(availableTaskStations.value,offerId);

      } else if (state.value.phase !== 'paused') {world!.setAvailableTasks?.([], '');}
      world!.setMotionPaused?.(preparationPaused.value || state.value.phase === 'paused');
      world!.render();
      for(const station of STATIONS)physics!.setDoorOpen?.(station.id,doorsOpen.value[station.id] && (world!.isDoorOpen?.(station.id) ?? true));
      const doorId = interior.value ?? nearby.value;
      doorReady.value = !!doorId && (world!.isDoorOpen?.(doorId) ?? doorsOpen.value[doorId]);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  } catch (error) {
    world?.dispose();
    world = undefined;
    physics?.dispose();
    physics = undefined;
    graphicsError.value = '3D engine could not start. You can still play the complete mission using the accessible station consoles below.';
    console.error('3D startup failed', error);
    // Engine startup failed before its loop began. Run the same mission clock alone.
    let previous=performance.now();
    const fallbackTick=(now:number)=>{
      if(disposed)return;
      advanceMissionTime(Math.min((now-previous)/1000,.1));previous=now;
      frame=requestAnimationFrame(fallbackTick);
    };
    if(!disposed)frame=requestAnimationFrame(fallbackTick);
  }
});

onBeforeUnmount(() => {
  music?.dispose();
  stopFlightSim();
  disposed = true;
  cancelAnimationFrame(frame);
  document.removeEventListener('visibilitychange', pauseWhenHidden);
  window.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('keyup',releaseLaunchKey);window.removeEventListener('blur',clearLaunchInput);clearLaunchInput();
  world?.dispose();
  world = undefined;
  physics?.dispose();
  physics = undefined;
});
</script>

<template>
  <SplashScreen v-if="showSplash" @finished="onSplashDone" />
  <LoginScreen v-if="showLogin" @start="onLoginStart" />
  <main class="ares-app" :class="{'launch-active':!!launchFlight}">

    <div class="mission-layout">

      <section class="world-panel" aria-label="Mars surface exploration">
    <header class="app-header">
      <div class="brand">
        <span class="brand-planet" aria-hidden="true" />
        <div>
          <p class="brand-kicker">MISSION CONTROL / MARS</p>
          <h1>The Ares Protocol</h1>
        </div>
      </div>
      <div class="header-controls">
        <span class="prototype-label">Junior explorer program</span>
        <button
          type="button"
          v-if="!launchFlight && !landingFlight" class="mode-btn"
          @click="directDecisionMode = !directDecisionMode"
          :title="directDecisionMode ? 'Use walking and station computers' : 'Use accessible station consoles'"
          :aria-label="directDecisionMode ? 'Accessible consoles active. Switch to walking.' : 'Walking mode active. Enable accessible consoles.'"
        >
          {{ directDecisionMode ? 'Accessible consoles' : 'Walk & work' }}
        </button>
        <button v-if="state.phase === 'ready' && !preparation && flightProgress === null" class="launch-btn" @click="dispatch({ type: 'START' })">Begin expedition <span aria-hidden="true">↗</span></button>
        <button
          type="button"
          class="sound-btn"
          @click="toggleSound"
          :aria-label="soundEnabled ? 'Mute audio' : 'Enable audio'"
          :title="soundEnabled ? 'Press M to mute sound' : 'Press M to enable sound'"
        >
          {{ soundEnabled ? '🔊 Sound On' : '🔇 Muted' }}
        </button>
      </div>
    </header>
      <div class="hud-container">
        <HudOverlay v-if="!launchFlight && !landingFlight" :key="state.taskRun?.session ?? 0" :state="state" :mission="mission" />
      </div>
        <div class="surface-header">
          <span><span class="live-dot" aria-hidden="true" /> {{ preparation === 'earth' ? 'EARTH / PREPARATION LAB' : preparation === 'space' ? 'ARES / ROCKET FLIGHT CABIN' : flightStage === 'launch' || flightStage === 'orbit-autopilot' ? 'EARTH / LAUNCH VEHICLE' : flightStage === 'transfer' ? 'EXPEDITION / AUTOPILOT TRANSFER' : flightStage === 'landing' || flightStage === 'touchdown' ? 'MARS / LANDING APPROACH' : 'OUTPOST ARES / SURFACE VIEW' }}</span>
          <div class="surface-actions">
            <button
              type="button"
              v-if="!launchFlight && !landingFlight && (preparation || flightStage || state.phase !== 'running' || directDecisionMode || graphicsError)" class="deck-toggle-btn info-btn"
              :aria-label="deckVisible ? 'Hide Mission Deck' : 'Show Mission Deck / Info'"
              :title="deckVisible ? 'Hide Mission Deck (Press C)' : 'Show Mission Deck (Press C)'"
              @click="deckVisible = !deckVisible"
            >
              {{ deckVisible ? '✕ Close Deck' : 'ℹ Mission Info' }}
            </button>
            <span>SECTOR 01</span>
          </div>
        </div>
        <div
          ref="host"
          class="viewport"
          role="region"
          :aria-label="flightStage ? 'Rocket ascent, transfer or Mars landing view' : preparation === 'earth' ? 'Interactive Earth launch site' : preparation === 'space' ? 'Interactive zero-gravity rocket cabin' : 'Interactive 3D Mars Outpost Viewport'"
        />
        <div v-if="arrivalGuide && state.phase==='running' && !activeActivity" class="arrival-guide" role="status">
          <span><strong>Touchdown</strong> · E near any machine</span>
          <button @click="startMissionAfterGuide">Explore</button>
          <details><summary aria-label="Show movement help">?</summary><p>WASD · move<br>Drag · look<br>E · use<br>P · pause</p></details>
        </div>
        <div v-if="state.taskRun && (state.phase==='running'||state.phase==='paused')" class="task-warning">

          <button @click="dispatch({type:state.phase==='paused'?'RESUME':'PAUSE'})">{{ state.phase==='paused'?'▶ Resume':'Ⅱ Pause' }}</button>
        </div>
        <DoorPanel v-if="!activeActivity && arrivalComplete && state.phase === 'running' && !preparation && flightProgress === null"
          :station="interior ?? nearby" :inside="!!interior" :open="!!doorsOpen[interior ?? nearby ?? 'habitat']"
          :ready="doorReady" :paused="false" @toggle="toggleDoor" @enter="enterModule()" @exit="leaveModule" @travel="travelToDoor" />
        <LaunchControls v-if="launchFlight" :flight="launchFlight" :paused="preparationPaused" @ignite="igniteLaunch" @hold="holdLaunch" @nudge="nudgeLaunch" @throttle="setLaunchThrottle" @pause="togglePreparationPause" @reset="beginLaunchSequence" />
        <LandingControls v-if="landingFlight" :flight="landingFlight" :guidance="landingGuidance(landingFlight)" :paused="preparationPaused" @hold="holdLanding" @nudge="nudgeLanding" @throttle="setLandingThrottle" @legs="deployLandingLegs" @assist="toggleLandingAssist" @pause="togglePreparationPause" @retry="retryMarsLanding" @continue="finishArrival" />
        <div v-if="flightStage && !launchFlight && !landingFlight" class="arrival-overlay" role="status">
          <h2>{{ flightStage === 'launch' ? 'Launch control' : flightStage === 'orbit-autopilot' ? 'Autopilot to orbit' : flightStage === 'transfer' ? 'Earth → Mars' : flightStage === 'landing' ? 'Mars descent' : 'Touchdown' }}</h2>
          <p>{{ flightFeedback }}</p>
          <p v-if="flightStage === 'transfer'">A compressed autopilot journey · not real travel time or scale</p>
          <p v-if="flightStage === 'landing' || flightStage === 'touchdown'">Mars gravity: 3.72 m/s² — about 38% of Earth’s 9.81 m/s².</p>
        </div>
        <p class="scene-status" :class="{ 'graphics-error': !!graphicsError }" role="status">
          <span v-if="currentSelectedStation" class="selected-badge">
            MODULE: {{ currentSelectedStation.toUpperCase() }}
            <button
              type="button"
              class="clear-station-btn"
              title="Clear station inspection"
              aria-label="Clear station inspection"
              @click="currentSelectedStation = null; stationMessage = 'Outpost view. Click modules or walk near them.'"
            >×</button>
          </span>
          {{ graphicsError || stationMessage }}
        </p>
        <p v-if="gravityLabel && flightProgress === null" class="scene-status" role="status">{{ gravityLabel }}</p>
        <div class="surface-footer"><span>{{ flightStage ? 'COMPRESSED SPACEFLIGHT SEQUENCE' : preparation === 'space' ? 'ARES ROCKET CABIN TASKS' : preparation ? 'EARTH LAUNCH PREPARATION' : 'STYLIZED MARS OUTPOST' }}</span><span>{{ flightStage ? 'W / S THRUST · A / D STEER · SPACE CONFIRM' : preparation === 'space' ? cabinSeated ? 'SEATED · WINDOW VIEW · START TRANSFER WHEN READY' : 'WASD / ARROWS · GLIDE · E · SIT' : 'WASD / ARROWS · SELECT A MODULE' }}</span></div>

        <div v-if="activeActivity" class="work-modal" role="dialog" aria-modal="true" aria-label="Station work" @keydown.esc.stop="cancelActivity()">
          <ActivityPanel v-if="activeActivity" :station="activeActivity.station" :title="activeActivity.title" :steps="activeActivity.steps" :impact="activeActivity.impact" :progress="activityProgress" :inside="directDecisionMode || !!graphicsError || interior === activeActivity.station" :feedback="activityFeedback" :paused="state.phase === 'paused'" @control="operateControl" @travel="travelToTask" @enter="enterModule()" @exit="leaveModule" @cancel="cancelActivity" @pause="dispatch({ type: state.phase === 'paused' ? 'RESUME' : 'PAUSE' })" />
        </div>

        <!-- Coherent In-Viewport Overlay Host for Shell UI Panels -->
        <section
          v-show="deckVisible && !activeActivity && !launchFlight && !landingFlight && (!!preparation || !!flightStage || state.phase !== 'running' || directDecisionMode || !!graphicsError)"
          ref="commandPanel"
          class="command-panel in-viewport-deck"
          role="dialog" aria-label="Mission controls"
          tabindex="0"
          @keydown.stop
          @focusin="physics?.pauseInput?.()"
          @focusout="!cabinSeated && !activeActivity && (state.phase === 'running' || (preparation && !preparationPaused)) && physics?.resumeInput?.()"
        >
          <div v-if="!activeActivity" class="command-heading">
            <span>ARES</span>
            <div class="heading-controls">
              <span>{{ flightStage ? 'FLIGHT DECK' : state.phase === 'ready' ? 'BRIEFING' : state.phase === 'running' ? 'STATION JOBS' : 'MISSION DESK' }}</span>
              <button
                type="button"
                class="deck-close-corner-btn"
                title="Hide window (Press C or click to close)"
                aria-label="Close window"
                @click="deckVisible = false"
              >✕</button>
            </div>
          </div>
          <p v-if="state.upcomingHazardNotice && state.phase === 'running'" class="hazard-advisory" role="alert">
            {{ state.upcomingHazardNotice }}
          </p>
          <VisualPreflightMinigame
            v-if="preparation && !(preparation === 'space' && preparationProgress >= PREPARATION.space.steps.length)"
            :level="preparation"
            :progress="preparationProgress"
            :paused="preparationPaused"
            @control="handleVisualMinigameControl"
            @pause="togglePreparationPause"
            @skip="skipPreparation"
          />
          <CabinSeatPanel
            v-else-if="preparation === 'space' && preparationProgress >= PREPARATION.space.steps.length"
            :near-seat="nearCabinSeat"
            :seated="cabinSeated"
            :paused="preparationPaused"
            :feedback="preparationFeedback"
            @sit="sitInFlightSeat"
            @transfer="beginTransferFromFlightSeat"
            @pause="togglePreparationPause"
          />
          <SpaceflightPanel v-else-if="flightStage" :stage="flightStage" :progress="flightProgress ?? 0" :step="flightControlProgress" :feedback="flightFeedback" :telemetry="flightTelemetry" :paused="preparationPaused" :controls="flightStage === 'landing' ? FLIGHT_CONTROL_STEPS.landing : FLIGHT_CONTROL_STEPS.launch" @control="operateFlightControl" @pause="togglePreparationPause" @continue="finishArrival" />
          <section v-else-if="state.phase==='running'" class="exploration-info" aria-label="Exploration information">
            <h2>Find a glowing machine</h2><p>Walk inside a station. Press E near a machine or click it to work.</p><p>{{ state.turn }} / {{ mission.maxTurns }} jobs finished. Watch the hazard forecast.</p>
            <div v-if="directDecisionMode || graphicsError" aria-label="Accessible machine focus"><h3>{{ accessibleMachine.label }}</h3><button @click="dispatch({type:'START_TASK',taskId:accessibleMachine.id})">Use focused machine</button><button @click="accessibleMachineIndex++">Focus next machine</button></div>
          </section>
          <MissionPanels v-else
            :state="state"
            :mission="mission"
            :event="getCurrentEvent(mission, state)"
            @action="dispatch"
          />
          <AssetCredits />
        </section>
      </section>
    </div>
  </main>
</template>

<style scoped>
.world-panel { position: relative; }
.task-warning{padding:8px 14px;background:#173d49;border-top:1px solid #e7c680;color:#fff3c8;font-size:12px;line-height:1.5}.task-warning p{margin:4px 0}.task-warning button{padding:7px 12px;}
.arrival-overlay { position: absolute; inset: 50px 0 auto; padding: 20px; text-align: center; color: #e9e8d6; pointer-events: none; text-shadow: 0 2px 6px #000; }
.arrival-overlay button { pointer-events: auto; }
.ares-app { max-width: 1800px; margin: auto; padding: 0 22px 20px; }
.app-header { height: 88px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.brand { display: flex; align-items: center; gap: 13px; }
.brand-planet { width: 38px; height: 38px; flex-shrink: 0; border-radius: 50%; background: radial-gradient(circle at 32% 28%, #ffc28c, #cb684a 55%, #733e3e); box-shadow: inset -8px -5px 0 #37252f50, 0 0 30px #ec9c6330; }
.brand-kicker { margin: 0 0 4px; font-size: 9px; font-weight: 750; letter-spacing: .2em; color: #b2bfc6; }
h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -.045em; }
.header-controls { display: flex; align-items: center; gap: 16px; }
.prototype-label { color: #a0b3bd; font-size: 11px; }
.mode-btn { font-size: 11px; padding: 9px 12px; background: #182833; border: 1px solid #3f5564; border-radius: 7px; color: #bed2de; cursor: pointer; }
.mode-btn:hover { background: #253946; color: #ffffff; }
.sound-btn { font-size: 11px; padding: 9px 12px; background: #15232c; border-color: #34434d; border-radius: 7px; }
.launch-btn { display: flex; gap: 18px; align-items: center; background: #e9b97d; color: #1d2830; border-color: #f2c796; border-radius: 7px; font-size: 12px; font-weight: 750; padding: 11px 15px; }
.launch-btn:hover { background: #f5ce9e; }
.mission-layout { display: flex; flex-direction: column; height: calc(100dvh - 108px); min-height: 620px; gap: 12px; }
.hud-container { width: 100%; min-width: 0; }
.world-panel { position: relative; flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; margin: 0; overflow: hidden; border: 1px solid #3e4c50; border-radius: 14px; background: #142028; box-shadow: 0 16px 55px #0003; }
.surface-header, .surface-footer, .command-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; color: #a6bbc2; font-size: 9px; font-weight: 650; letter-spacing: .1em; }
.surface-header { border-bottom: 1px solid #34434a; color: #e2e6d9; z-index: 4; }
.surface-actions { display: flex; align-items: center; gap: 8px; }
.deck-toggle-btn { font-size: 10px; font-weight: 700; padding: 4px 10px; background: #1c303c; border: 1px solid #4a6677; border-radius: 6px; color: #d0e4ee; cursor: pointer; transition: all 0.2s ease; }
.deck-toggle-btn:hover { background: #284455; color: #ffffff; border-color: #61b3dc; }
.deck-toggle-btn.info-btn { display: inline-flex; align-items: center; gap: 4px; }
.heading-controls { display: flex; align-items: center; gap: 8px; }
.deck-close-corner-btn { background: none; border: none; color: #8fa6b2; font-size: 13px; font-weight: bold; cursor: pointer; padding: 2px 6px; border-radius: 4px; line-height: 1; }
.deck-close-corner-btn:hover { color: #ffffff; background: rgba(255, 255, 255, 0.12); }
.surface-footer { border-top: 1px solid #34434a; font-size: 8px; z-index: 4; }
.live-dot { display: inline-block; width: 5px; height: 5px; margin-right: 7px; border-radius: 50%; background: #9ac5b5; box-shadow: 0 0 0 3px #9ac5b514; }
.viewport { position: relative; flex: 1; min-height: 380px; overflow: hidden; background: #765040; }
.scene-status { margin: 0; padding: 10px 16px; color: #becbd0; font-size: 11px; line-height: 1.5; z-index: 4; background: rgba(20, 32, 40, 0.7); }
.selected-badge { display: inline-flex; align-items: center; gap: 6px; margin-right: 8px; padding: 2px 7px; background: #263e48; border: 1px solid #486877; border-radius: 4px; font-size: 10px; font-weight: 700; color: #bde0ea; }
.clear-station-btn { font-size: 11px; padding: 0 4px; background: transparent; border: none; color: #a4c4cf; cursor: pointer; line-height: 1; }
.clear-station-btn:hover { color: #ffffff; }
.in-viewport-deck { min-width: 0; min-height: 0; overflow: auto; scrollbar-width: thin; scrollbar-color: #49606a transparent; border: 1px solid #3c5462; border-radius: 12px; background: linear-gradient(150deg, rgba(23, 37, 47, 0.93), rgba(16, 27, 36, 0.95)); backdrop-filter: blur(14px); }
.command-heading { position: sticky; top: 0; z-index: 3; background: #1b2c35; border-bottom: 1px solid #34434c; font-size: 8px; }
.command-panel :deep(.mission-panels-root) { padding: 16px; gap: 18px; }
.command-panel :deep(.choices-container), .command-panel :deep(.briefing-grid) { grid-template-columns: minmax(0, 1fr); gap: 12px; }
.command-panel :deep(.choice-card) {
  position: relative;
  min-height: 0;
  padding: 14px 16px;
  background: linear-gradient(150deg, #1d313d, #14222c);
  border: 1px solid #3c5462;
  border-radius: 10px;
  text-align: left;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
.command-panel :deep(.choice-card:hover) {
  transform: translateY(-3px);
  background: linear-gradient(150deg, #253e4d, #192a37);
  border-color: #e2ba7e;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
}
.command-panel :deep(.choice-card:active) {
  transform: translateY(0);
}
.command-panel :deep(.choice-card:focus-visible) {
  outline: 3px solid #f6c768;
  outline-offset: 2px;
}
.command-panel :deep(.choice-label), .command-panel :deep(h2) { font-size: 17px; font-weight: 700; color: #edf5f8; letter-spacing: -0.01em; margin: 0; }
.command-panel :deep(.choice-explanation), .command-panel :deep(.event-desc) { font-size: 12px; line-height: 1.55; color: #b8c9d1; }
.command-panel :deep(.tagline) { font-size: 13px; }
.command-panel :deep(.impacts) { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.command-panel :deep(.impact-pill) { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 5px; letter-spacing: 0.02em; }
.command-panel :deep(.impact-pill.gain) { background: rgba(26, 68, 52, 0.7); color: #86efac; border: 1px solid rgba(74, 222, 128, 0.35); }
.command-panel :deep(.impact-pill.cost) { background: rgba(70, 28, 28, 0.7); color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.35); }
.command-panel :deep(.impact-pill.science-pill) { background: rgba(24, 52, 85, 0.7); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.4); }
.command-panel :deep(.impact-pill.shelter-pill) { background: rgba(74, 48, 20, 0.7); color: #fde047; border: 1px solid rgba(250, 204, 21, 0.4); }
.command-panel :deep(.delayed-preview) { margin-top: 8px; padding: 6px 9px; background: rgba(45, 27, 71, 0.65); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 6px; color: #e9d5ff; font-size: 11px; line-height: 1.4; }
.command-panel :deep(.role-badge), .command-panel :deep(.shift-badge) { font-size: 9px; background: #264149; border-color: #527580; color: #b4d4d7; }
.command-panel :deep(.card) { padding: 13px; background: #172a34; }
.command-panel :deep(.card h3) { font-size: 13px; }
.command-panel :deep(.card li) { font-size: 12px; line-height: 1.65; }
.command-panel :deep(.hazard-banner), .command-panel :deep(.feedback-box) { font-size: 11px; }
.hazard-advisory { margin: 12px 16px 0; padding: 11px; border-radius: 8px; background: #3b291d; border-left: 3px solid #eab575; color: #f8d5a6; font-size: 12px; line-height: 1.6; }
@media (min-width: 1000px) {
  .hud-container :deep(.hud) { width: 100%; display: grid; grid-template-columns: 155px minmax(0, 1fr) 250px; gap: 8px 18px; padding: 12px 16px; background: #15242d; border: 1px solid #364851; border-radius: 12px; }
  .hud-container :deep(.hud-header) { grid-column: 1; grid-row: 1; flex-wrap: wrap; gap: 6px; margin: 0; }
  .hud-container :deep(.shift-track) { grid-column: 1; grid-row: 2; align-self: end; margin: 0; }
  .hud-container :deep(.reserve-grid) { grid-column: 2; grid-row: 1 / 3; margin: 0; }
  .hud-container :deep(.secondary-grid) { grid-column: 3; grid-row: 1 / 3; margin: 0; }
  .hud-container :deep(.secondary-card), .hud-container :deep(.reserve-card) { padding: 9px; background: #1c303a; }
  .hud-container :deep(.reserve-name), .hud-container :deep(.secondary-label) { font-size: 10px; }
  .hud-container :deep(.secondary-heading) { gap: 4px; flex-wrap: wrap; }
  .hud-container :deep(.units-note) { grid-column: 1 / -1; margin: 0; font-size: 9px; }
  .hud-container :deep(.hazard-notice), .hud-container :deep(.feedback), .hud-container :deep(.delayed-effects) { grid-column: 2 / -1; margin: 0; padding: 8px 12px; font-size: 10px; }
  .in-viewport-deck {
    position: absolute;
    top: 50px;
    right: 14px;
    bottom: 38px;
    width: 410px;
    max-width: calc(100% - 28px);
    z-index: 10;
    box-shadow: -8px 0 35px rgba(0, 0, 0, 0.55);
  }
}
@media (max-width: 999px) {
  .ares-app { padding: 0 12px 16px; }
  .app-header { height: auto; min-height: 80px; flex-wrap: wrap; padding: 14px 0; }
  .prototype-label { display: none; }
  .mission-layout { height: auto; min-height: 0; display: flex; flex-direction: column; }
  .hud-container :deep(.hud) { width: 100%; }
  .world-panel { height: auto; }
  .viewport { min-height: 380px; }
  .in-viewport-deck { position: relative; width: 100%; max-height: 540px; margin-top: 10px; }
}
@media (max-width: 480px) {
  .brand-planet { width: 28px; height: 28px; }
  h1 { font-size: 19px; }
  .brand-kicker { font-size: 7px; }
  .header-controls { width: 100%; justify-content: space-between; }
  .surface-header, .surface-footer { font-size: 7px; padding: 12px; }
  .surface-footer span:last-child { max-width: 130px; text-align: right; }
}
</style>

<style scoped src="./features/world/shell.css">.arrival-guide{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);z-index:14;display:flex;align-items:center;gap:10px;max-width:calc(100% - 24px);box-sizing:border-box;padding:10px 12px;border:1px solid #98cbc677;border-radius:12px;background:#102c38e8;color:#dff9ee;backdrop-filter:blur(12px);font-size:12px}.arrival-guide strong{color:#ffe0a0}.arrival-guide button,.arrival-guide summary{min-height:40px;min-width:36px;display:grid;place-items:center;padding:0 10px;border:1px solid #97cfc5;border-radius:8px;background:#234751;color:#ecfff6;cursor:pointer}.arrival-guide details{position:relative}.arrival-guide details p{position:absolute;bottom:44px;right:0;min-width:110px;padding:12px;margin:0;border:1px solid #8fbdbd;border-radius:10px;background:#12313d;line-height:1.8}.arrival-guide button:focus-visible,.arrival-guide summary:focus-visible{outline:3px solid #ffe0a0;outline-offset:2px}@media(max-width:600px){.arrival-guide{bottom:230px;width:max-content;font-size:10px;gap:7px}}</style>
