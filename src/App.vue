<script setup lang="ts">
// Integration shell: Rohit owns this file. Himamshu's layout handoff is recorded in world/NOTES.md.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { STATIONS } from './contracts';
import type { GameAction, PhysicsAdapter, Vec3, WorldAdapter, StationId } from './contracts';
import { createInitialState, getCurrentEvent, reduceGame } from './features/game';
import { soundFX } from './features/game/audio';
import { loadMission } from './features/missions';
import HudOverlay from './features/hud/HudOverlay.vue';
import MissionPanels from './features/ui/MissionPanels.vue';
import ActivityPanel from './features/world/ActivityPanel.vue';
import { getActivity, advanceActivity, type Activity } from './features/game/activities';
import PreparationPanel from './features/world/PreparationPanel.vue';
import AssetCredits from './features/world/AssetCredits.vue';
import DoorPanel from './features/world/DoorPanel.vue';
import { doorApproach, doorwayOccupied, insideStation, nearbyDoor } from './features/world/doors';
import { advancePreparation, PREPARATION, type PreparationLevel } from './features/world/preflight';
import { createMusic } from './features/world/music';

const mission = loadMission();
const state = shallowRef(createInitialState(mission));
const host = ref<HTMLElement>();
const commandPanel = ref<HTMLElement>();
const graphicsError = ref('');
const stationMessage = ref('Click a base module to inspect systems, or use WASD / Arrow keys to walk.');
const soundEnabled = ref(true);
const directDecisionMode = ref(false);
const deckVisible = ref(true);
const activeActivity = shallowRef<(Activity & { choiceId: string; impact: string }) | null>(null);
const activityProgress = ref(0);
const activityFeedback = ref('');
const interior = ref<StationId | null>(null);
const nearby = ref<StationId | null>(null);
const doorsOpen = ref<Record<StationId, boolean>>({ habitat: false, solar: false, greenhouse: false });
const doorReady = ref(false);
const flightProgress = ref<number | null>(null);
let arrivalComplete = false;
let orbitComplete = false;
let music: ReturnType<typeof createMusic> | undefined;
const preparation = ref<PreparationLevel | null>(null);
const earthOutside = ref(false);
const preparationProgress = ref(0);
const preparationFeedback = ref('');
const preparationPaused = ref(false);
const nearConsole = ref(false);
let remoteConsole = false;

function beginPreparation(level: PreparationLevel) {
  flightProgress.value = null; world?.setJourney?.(null);
  preparation.value = level; preparationProgress.value = 0; preparationFeedback.value = ''; preparationPaused.value = false; nearConsole.value = false; remoteConsole = false;
  earthOutside.value = level === 'earth';
  world?.setLevel?.(level); world?.setEarthOutside?.(earthOutside.value); world?.setActivityProgress?.(0);
  if (earthOutside.value) { const spawn=doorApproach('habitat');physics?.reset?.({...spawn,z:spawn.z+1});setDoor('habitat',true); }
  else physics?.enterInterior?.();
  physics?.resumeInput?.();
  stationMessage.value = level === 'earth' ? 'Earth preparation lab: walk to the console and complete your departure checks.' : 'Orbital cabin: establish the navigation link before continuing to Mars.';
  music?.setPaused(false); music?.select(level); music?.unlock();
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
function togglePreparationPause() { preparationPaused.value = !preparationPaused.value; music?.setPaused(preparationPaused.value); if (preparationPaused.value) physics?.pauseInput?.(); else physics?.resumeInput?.(); }
function operatePreparation(control: string) {
  const level = preparation.value;
  if (!level || preparationPaused.value) return;
  if (!nearConsole.value && !remoteConsole) { preparationFeedback.value = 'Walk to the console or enable the accessible remote console.'; return; }
  const next = advancePreparation(level, preparationProgress.value, control);
  if (next === preparationProgress.value) { preparationFeedback.value = 'Follow the procedure in order.'; return; }
  preparationProgress.value = next; world?.setActivityProgress?.(next); preparationFeedback.value = `Check ${next} complete.`;
  if (next === PREPARATION[level].steps.length) {
    earthOutside.value = false; world?.setEarthOutside?.(false);
    preparation.value = null; physics?.exitInterior?.(); world?.setLevel?.(null); world?.setActivityProgress?.(0);
    if (level === 'space') orbitComplete = true;
    music?.select('space'); flightProgress.value = 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finishArrival();
  }
}

function finishArrival() {
  flightProgress.value = null; world?.setJourney?.(null);
  if (!orbitComplete) { beginPreparation('space'); return; }
  arrivalComplete = true;physics?.reset?.({x:0,y:.8,z:6});music?.select('mars'); stationMessage.value = 'Landed on Mars. Choose a shift job, then walk to its module.'; dispatch({ type: 'START' });
}
function setDoor(id: StationId, open: boolean) { doorsOpen.value = { ...doorsOpen.value, [id]: open }; doorReady.value = false; world?.setDoorState?.(id, open); }
function toggleDoor() {
  if (state.value.phase !== 'running') return;
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
  leaveModule(); physics?.reset?.(doorApproach(id)); nearby.value = id;
  doorReady.value = false;
  stationMessage.value = `At the ${id} entrance. Open the door with E or the button.`;
}
function cancelActivity() {
  soundFX.playRestart();
  activeActivity.value = null;
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
  if (!task || interior.value !== task.station || state.value.phase !== 'running') return;
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
    cancelActivity();
    dispatch({ type: 'CHOOSE', choiceId: task.choiceId }, true);
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

let world: WorldAdapter | undefined;
let physics: PhysicsAdapter | undefined;
let frame = 0;
let disposed = false;
let accumulator = 0;
let lastNearStation: string | null = null;
let currentSelectedStation: string | null = null;
let lastTaskNotice = '';
const availableTaskStations = computed<StationId[]>(() => {
  if (activeActivity.value) return [activeActivity.value.station];
  const event=getCurrentEvent(mission,state.value);
  return event ? [...new Set(event.choices.map(choice=>getActivity(event,choice).station))] : [];
});

function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  soundFX.enabled = soundEnabled.value;
  music?.setEnabled(soundEnabled.value); music?.unlock();
}

function dispatch(action: GameAction, procedureComplete = false) {
  if (action.type === 'START' && !arrivalComplete && world && !graphicsError.value) {
    if (!preparation.value && flightProgress.value === null) beginPreparation('earth');
    return;
  }
  if (action.type === 'CHOOSE' && !procedureComplete && state.value.phase === 'running' && physics && !graphicsError.value && !directDecisionMode.value) {
    if (activeActivity.value) return;
    const event = getCurrentEvent(mission, state.value);
    const choice = event?.choices.find(c => c.id === action.choiceId);
    if (!event || !choice) return;
    const impact = [...Object.entries(choice.effect.resources ?? {}).map(([name, value]) => `${name} ${value! > 0 ? '+' : ''}${value}`), ...(choice.effect.shielding ? [`shelter +${choice.effect.shielding}`] : []), ...(choice.effect.science ? [`science +${choice.effect.science}`] : []), ...(choice.delayedEffect ? [`Delayed: ${choice.delayedEffect.description}`] : [])].join(' · ');
    activeActivity.value = { ...getActivity(event, choice), choiceId: choice.id, impact };
    activityProgress.value = 0; activityFeedback.value = `Go to the ${activeActivity.value.station} to carry out your plan.`;
    world?.setObjective?.(activeActivity.value.station);
    return;
  }
  if (action.type === 'RESTART') { cancelActivity();interior.value=null;world?.setInterior?.(null);for (const station of STATIONS) setDoor(station.id, false); nearby.value = null; deckVisible.value = true; preparation.value = null; orbitComplete = false; arrivalComplete = false; flightProgress.value = null; world?.setJourney?.(null); world?.setLevel?.(null); music?.select('earth'); music?.setPaused(false); }
  if (action.type === 'PAUSE' && state.value.phase === 'running') music?.setPaused(true);
  if (action.type === 'RESUME' && state.value.phase === 'paused') music?.setPaused(false);
  const previousState = state.value;
  state.value = reduceGame(state.value, action, mission);
  if (state.value !== previousState) {
    void nextTick(() => { if (commandPanel.value) commandPanel.value.scrollTop = 0; });
  }

  if (action.type === 'START') {
    soundFX.playStart();
  } else if (action.type === 'CHOOSE') {
    const prevRes = previousState.resources;
    const nextRes = state.value.resources;
    const filledTo100 = (['power', 'oxygen', 'supplies'] as const).some(
      key => prevRes[key] < 100 && nextRes[key] === 100
    );

    if (state.value.phase === 'won') {
      soundFX.playVictory();
    } else if (state.value.phase === 'lost') {
      soundFX.playDepleted();
    } else if (state.value.lastHazardNotice) {
      soundFX.playHazard();
    } else if (filledTo100) {
      soundFX.playFullReserve();
    } else if (action.choiceId === 'comms') {
      soundFX.playTransmission();
    } else if (action.choiceId === 'oxygen') {
      soundFX.playOxygen();
    } else if (action.choiceId === 'shield') {
      soundFX.playShield();
    } else {
      soundFX.playDecision();
    }

    const { power, oxygen, supplies } = state.value.resources;
    if (state.value.phase === 'running' && (power <= 20 || oxygen <= 20 || supplies <= 20)) {
      setTimeout(() => soundFX.playWarning(), 180);
    }
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
    physics?.resumeInput?.();
  }
}

function pauseWhenHidden() {
  if (document.hidden && preparation.value) { preparationPaused.value = true; physics?.pauseInput?.(); music?.setPaused(true); }
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
    stationMessage.value = 'Astronaut walking on Mars. Click modules or use decision cards below.';
  }
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if ((event.target as HTMLElement | null)?.closest('button, input, textarea, select, [contenteditable]')) return;
  if (preparation.value && event.code === 'KeyP') { togglePreparationPause(); return; }
  if (preparation.value === 'earth' && event.code === 'KeyE') {
    event.preventDefault();
    if (!event.repeat && !preparationPaused.value && (!earthOutside.value || nearbyDoor(physics!.getPlayerPose()) === 'habitat')) {
      if(doorsOpen.value.habitat && doorwayOccupied(physics!.getPlayerPose(),'habitat'))preparationFeedback.value='Step clear of the doorway before closing it.';
      else setDoor('habitat',!doorsOpen.value.habitat);
    }
    return;
  }
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
    const currentEvent = getCurrentEvent(mission, state.value);
    if (!currentEvent) return;
    if (['Digit1', 'Numpad1'].includes(event.code) && currentEvent.choices[0]) {
      dispatch({ type: 'CHOOSE', choiceId: currentEvent.choices[0].id });
    } else if (['Digit2', 'Numpad2'].includes(event.code) && currentEvent.choices[1]) {
      dispatch({ type: 'CHOOSE', choiceId: currentEvent.choices[1].id });
    } else if (['Digit3', 'Numpad3'].includes(event.code) && currentEvent.choices[2]) {
      dispatch({ type: 'CHOOSE', choiceId: currentEvent.choices[2].id });
    } else if (['Digit4', 'Numpad4'].includes(event.code) && currentEvent.choices[3]) {
      dispatch({ type: 'CHOOSE', choiceId: currentEvent.choices[3].id });
    } else if (event.code === 'KeyP' || event.code === 'Space') {
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
  try {
    const [{ createWorld }, { createPhysics }] = await Promise.all([
      import('./features/world'),
      import('./features/physics'),
    ]);
    if (disposed) return;
    world = createWorld(host.value!, station => {
      if (nearby.value === station && state.value.phase === 'running') { toggleDoor(); return; }
      currentSelectedStation = station;
      stationMessage.value = stationDescriptions[station] || `Selected: ${station}. Use decision cards below to manage operations.`;
    });
    physics = await createPhysics();
    world.setConsoleHandler?.(index => {
      if (preparation.value) operatePreparation(PREPARATION[preparation.value].steps[index]);
      else if (activeActivity.value && interior.value === activeActivity.value.station) { deckVisible.value = true; activityFeedback.value = 'Station computer ready. Finish the minigame checks in the command deck.'; }
      else if (interior.value) { deckVisible.value = true; stationMessage.value = 'Station computer linked. Choose a job in the command deck to begin.'; }
    });
    if (disposed) {
      physics.dispose();
      return;
    }
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      if (flightProgress.value !== null && !document.hidden) {
        flightProgress.value = Math.min(1, flightProgress.value + elapsed / 8);
        world!.setJourney?.((orbitComplete ? .5 : 0) + flightProgress.value * .5);
        if (flightProgress.value >= 1) finishArrival();
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
      let pose = physics!.getPlayerPose();
      if (preparation.value === 'earth') {
        const outside=insideStation(pose)!=='habitat';
        if(outside!==earthOutside.value){earthOutside.value=outside;world!.setEarthOutside?.(outside);}
        const lab=STATIONS.find(station=>station.id==='habitat')!;
        nearConsole.value=!outside && Math.abs(pose.x-lab.position.x)<2.6 && pose.z<lab.position.z-1;
      } else nearConsole.value=pose.z<-.4;
      checkStationProximity(pose);
      pose = physics!.getPlayerPose();
      world!.setPlayerPose(pose);
      world!.setState(state.value);
      if (state.value.phase === 'running') {
        const offerId=`${mission.id}:${state.value.turn}`;
        world!.setAvailableTasks?.(availableTaskStations.value,offerId);
        if (lastTaskNotice!==offerId && availableTaskStations.value.length) {lastTaskNotice=offerId;soundFX.playDecision();}
      } else if (state.value.phase !== 'paused') {world!.setAvailableTasks?.([], '');lastTaskNotice='';}
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
    graphicsError.value = '3D engine could not start. You can still play the complete mission using the accessible decision panels below.';
    console.error('3D startup failed', error);
  }
});

onBeforeUnmount(() => {
  music?.dispose();
  disposed = true;
  cancelAnimationFrame(frame);
  document.removeEventListener('visibilitychange', pauseWhenHidden);
  window.removeEventListener('keydown', handleGlobalKeydown);
  world?.dispose();
  world = undefined;
  physics?.dispose();
  physics = undefined;
});
</script>

<template>
  <main class="ares-app">
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
          class="mode-btn"
          @click="directDecisionMode = !directDecisionMode"
          :title="directDecisionMode ? 'Switch to 3D Expedition Mode' : 'Switch to Direct Decisions Mode'"
          :aria-label="directDecisionMode ? 'Direct Decision Mode active. Click to switch to 3D Station Procedures.' : '3D Station Procedures active. Click to switch to Direct Decisions Mode.'"
        >
          {{ directDecisionMode ? '⚡ Direct Mode' : '🚀 3D Procedures' }}
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
    <div class="mission-layout">
      <div class="hud-container">
        <HudOverlay :state="state" :mission="mission" />
      </div>
      <section class="world-panel" aria-label="Mars surface exploration">
        <div class="surface-header">
          <span><span class="live-dot" aria-hidden="true" /> {{ preparation === 'earth' ? 'EARTH / PREPARATION LAB' : preparation === 'space' ? 'ORBIT / COMMUNICATIONS CABIN' : flightProgress !== null ? 'EXPEDITION / IN TRANSIT' : 'OUTPOST ARES / SURFACE VIEW' }}</span>
          <div class="surface-actions">
            <button
              v-if="state.phase === 'running'"
              type="button"
              class="deck-toggle-btn"
              :aria-label="deckVisible ? 'Hide Command Deck' : 'Show Command Deck'"
              @click="deckVisible = !deckVisible"
            >
              {{ deckVisible ? '◨ Hide Deck' : '📋 Command Deck' }}
            </button>
            <span>SECTOR 01</span>
          </div>
        </div>
        <div
          ref="host"
          class="viewport"
          role="region"
          aria-label="Interactive 3D Mars Outpost Viewport"
        />
        <DoorPanel v-if="arrivalComplete && state.phase === 'running' && !preparation && flightProgress === null"
          :station="interior ?? nearby" :inside="!!interior" :open="!!doorsOpen[interior ?? nearby ?? 'habitat']"
          :ready="doorReady" :paused="false" @toggle="toggleDoor" @enter="enterModule()" @exit="leaveModule" @travel="travelToDoor" />
        <div v-if="flightProgress !== null" class="arrival-overlay" role="status">
          <h2>{{ orbitComplete ? 'Orbit → Mars' : 'Earth → Orbit' }}</h2><p>{{ orbitComplete ? 'Transfer to Ares Outpost' : 'Ascending to the communications cabin' }}</p>
          <progress :value="flightProgress" max="1" aria-label="Journey to Mars" />
          <p>Condensed journey · not real travel time or scale</p><button @click="finishArrival">Skip transfer</button>
        </div>
        <p class="scene-status" role="status">
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
        <div class="surface-footer"><span>STYLIZED MARS OUTPOST</span><span>WASD / ARROWS <span aria-hidden="true">·</span> SELECT A MODULE</span></div>

        <!-- Coherent In-Viewport Overlay Host for Shell UI Panels -->
        <aside
          v-show="deckVisible"
          ref="commandPanel"
          class="command-panel in-viewport-deck"
          aria-label="Mission command panel"
          tabindex="0"
          @keydown.stop
          @focusin="physics?.pauseInput?.()"
          @focusout="(state.phase === 'running' || (preparation && !preparationPaused)) && physics?.resumeInput?.()"
        >
          <div class="command-heading">
            <span>YOUR NEXT MOVE</span>
            <span>{{ state.phase === 'ready' ? 'BRIEFING' : state.phase === 'running' ? 'DECISION DESK' : 'MISSION DESK' }}</span>
          </div>
          <p v-if="state.upcomingHazardNotice && state.phase === 'running'" class="hazard-advisory" role="alert">
            {{ state.upcomingHazardNotice }}
          </p>
          <PreparationPanel v-if="preparation" :level="preparation" :outdoors="earthOutside" :progress="preparationProgress" :feedback="preparationFeedback" :near-console="nearConsole" :paused="preparationPaused" @enter-lab="enterEarthLab()" @outside="leaveEarthLab" @control="operatePreparation" @remote="remoteConsole = true; preparationFeedback = 'Remote console enabled.'" @pause="togglePreparationPause" />
          <ActivityPanel v-else-if="activeActivity" :station="activeActivity.station" :title="activeActivity.title" :steps="activeActivity.steps" :impact="activeActivity.impact" :progress="activityProgress" :inside="interior === activeActivity.station" :feedback="activityFeedback" :paused="state.phase === 'paused'" @control="operateControl" @travel="travelToTask" @enter="enterModule()" @exit="leaveModule" @cancel="cancelActivity" @pause="dispatch({ type: state.phase === 'paused' ? 'RESUME' : 'PAUSE' })" />
          <section v-else-if="flightProgress !== null" style="padding:18px" aria-label="In transit"><h2>{{ orbitComplete ? 'Mars transfer' : 'Earth departure' }}</h2><p>Flight systems are carrying the expedition to the next playable stage.</p></section>
          <MissionPanels v-else
            :state="state"
            :mission="mission"
            :event="getCurrentEvent(mission, state)"
            @action="dispatch"
          />
          <AssetCredits />
        </aside>
      </section>
    </div>
  </main>
</template>

<style scoped>
.world-panel { position: relative; }
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
.deck-toggle-btn { font-size: 10px; font-weight: 700; padding: 4px 10px; background: #1c303c; border: 1px solid #4a6677; border-radius: 6px; color: #d0e4ee; cursor: pointer; }
.deck-toggle-btn:hover { background: #284455; color: #ffffff; }
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
