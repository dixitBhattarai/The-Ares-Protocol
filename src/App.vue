<script setup lang="ts">
// Integration shell: Rohit owns this file. Himamshu's layout handoff is recorded in world/NOTES.md.
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { STATIONS } from './contracts';
import type { GameAction, PhysicsAdapter, Vec3, WorldAdapter, StationId } from './contracts';
import { createInitialState, getCurrentEvent, reduceGame } from './features/game';
import { soundFX } from './features/game/audio';
import { loadMission } from './features/missions';
import HudOverlay from './features/hud/HudOverlay.vue';
import MissionPanels from './features/ui/MissionPanels.vue';
import ActivityPanel from './features/world/ActivityPanel.vue';
import { getActivity, advanceActivity, type Activity } from './features/game/activities';

const mission = loadMission();
const state = shallowRef(createInitialState(mission));
const host = ref<HTMLElement>();
const commandPanel = ref<HTMLElement>();
const graphicsError = ref('');
const stationMessage = ref('Click a base module to inspect systems, or use WASD / Arrow keys to walk.');
const soundEnabled = ref(true);
const activeActivity = shallowRef<(Activity & { choiceId: string; impact: string }) | null>(null);
const activityProgress = ref(0);
const activityFeedback = ref('');
const interior = ref<StationId | null>(null);
const nearby = ref<StationId | null>(null);
const flightProgress = ref<number | null>(null);
let arrivalComplete = false;

function finishArrival() { flightProgress.value = null; arrivalComplete = true; world?.setJourney?.(null); dispatch({ type: 'START' }); }
function leaveModule() { physics?.exitInterior?.(); world?.setInterior?.(null); interior.value = null; physics?.resumeInput?.(); }
function cancelActivity() { leaveModule(); activeActivity.value = null; activityProgress.value = 0; world?.setActivityProgress?.(0); world?.setObjective?.(null); }
function enterModule(id: StationId | null = nearby.value) {
  if (state.value.phase !== 'running' || interior.value) return;
  if (!id || nearby.value !== id) { activityFeedback.value = 'Walk closer to the door first, or use accessible travel.'; return; }
  if (activeActivity.value && activeActivity.value.station !== id) { activityFeedback.value = `Your task is at the ${activeActivity.value.station}.`; return; }
  if (!activeActivity.value) { stationMessage.value = 'Choose a shift task first, then enter its module.'; return; }
  interior.value = id; physics?.enterInterior?.(); world?.setInterior?.(id); activityFeedback.value = 'Read the procedure, then use the console controls in order.';
}
function travelToTask() {
  if (!activeActivity.value || state.value.phase !== 'running') return;
  leaveModule();
  const station = STATIONS.find(s => s.id === activeActivity.value!.station)!;
  physics?.reset?.({ x: station.position.x, y: .8, z: station.position.z + 2.6 });
  nearby.value = station.id;
  activityFeedback.value = 'At the task door. Enter the module to work.';
}
function operateControl(control: string) {
  const task = activeActivity.value;
  if (!task || interior.value !== task.station || state.value.phase !== 'running') return;
  const next = advanceActivity(task, activityProgress.value, control);
  if (next === activityProgress.value) { activityFeedback.value = 'That control comes later. Follow the numbered procedure.'; return; }
  activityProgress.value = next;
  world?.setActivityProgress?.(next);
  activityFeedback.value = `Step ${next} complete.`;
  if (next === task.steps.length) {
    cancelActivity();
    dispatch({ type: 'CHOOSE', choiceId: task.choiceId }, true);
    stationMessage.value = `Completed ${task.title}. ${state.value.lastHazardNotice ?? 'Reserves and mission history now show the result.'}`;
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

function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  soundFX.enabled = soundEnabled.value;
}

function dispatch(action: GameAction, procedureComplete = false) {
  if (action.type === 'START' && !arrivalComplete && world && !graphicsError.value) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) arrivalComplete = true;
    else { if (flightProgress.value === null) flightProgress.value = 0; return; }
  }
  if (action.type === 'CHOOSE' && !procedureComplete && state.value.phase === 'running' && physics && !graphicsError.value) {
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
  if (action.type === 'RESTART') { cancelActivity(); arrivalComplete = false; flightProgress.value = null; world?.setJourney?.(null); }
  const previousState = state.value;
  state.value = reduceGame(state.value, action, mission);
  if (state.value !== previousState) {
    void nextTick(() => { if (commandPanel.value) commandPanel.value.scrollTop = 0; });
  }

  if (action.type === 'START') {
    soundFX.playStart();
  } else if (action.type === 'CHOOSE') {
    if (state.value.phase === 'won') {
      soundFX.playVictory();
    } else if (state.value.phase === 'lost') {
      soundFX.playDepleted();
    } else if (state.value.lastHazardNotice) {
      soundFX.playHazard();
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
  if (document.hidden) dispatch({ type: 'PAUSE' });
}

let lastCheckedPose = { x: 999, y: 999, z: 999 };
function checkStationProximity(pose: Vec3) {
  if (interior.value) { nearby.value = null; return; }
  nearby.value = STATIONS.find(s => Math.hypot(pose.x - s.position.x, pose.z - s.position.z) < 3.8)?.id ?? null;
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
  if (event.code === 'KeyE') { if (interior.value) leaveModule(); else enterModule(); return; }
  if (event.code === 'KeyM') {
    toggleSound();
    return;
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
  document.addEventListener('visibilitychange', pauseWhenHidden);
  window.addEventListener('keydown', handleGlobalKeydown);
  try {
    const [{ createWorld }, { createPhysics }] = await Promise.all([
      import('./features/world'),
      import('./features/physics'),
    ]);
    if (disposed) return;
    world = createWorld(host.value!, station => {
      if (activeActivity.value && nearby.value === station) { enterModule(station); return; }
      currentSelectedStation = station;
      stationMessage.value = stationDescriptions[station] || `Selected: ${station}. Use decision cards below to manage operations.`;
    });
    physics = await createPhysics();
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
        world!.setJourney?.(flightProgress.value);
        if (flightProgress.value >= 1) finishArrival();
      }
      if (state.value.phase === 'running') {
        accumulator = Math.min(accumulator + elapsed, 0.1);
        while (accumulator >= 1 / 60) {
          physics!.step(1 / 60);
          accumulator -= 1 / 60;
        }
      } else {
        accumulator = 0;
      }
      const pose = physics!.getPlayerPose();
      checkStationProximity(pose);
      world!.setPlayerPose(pose);
      world!.setState(state.value);
      world!.render();
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
        <button v-if="state.phase === 'ready'" class="launch-btn" @click="dispatch({ type: 'START' })">Begin expedition <span aria-hidden="true">↗</span></button>
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
        <div class="surface-header"><span><span class="live-dot" aria-hidden="true" /> OUTPOST ARES / SURFACE VIEW</span><span>SECTOR 01</span></div>
        <div
          ref="host"
          class="viewport"
          role="region"
          aria-label="Interactive 3D Mars Outpost Viewport"
        />
        <div v-if="flightProgress !== null" class="arrival-overlay" role="status">
          <h2>Earth → Mars</h2><p>{{ flightProgress < .3 ? 'Leaving home' : flightProgress < .85 ? 'Cruising to the Red Planet' : 'Approaching Ares Outpost' }}</p>
          <progress :value="flightProgress" max="1" aria-label="Journey to Mars" />
          <p>Condensed journey · not real travel time or scale</p><button @click="finishArrival">Skip flight / land on Mars</button>
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
      </section>
      <aside ref="commandPanel" class="command-panel" aria-label="Mission command panel" tabindex="0" @keydown.stop @focusin="physics?.pauseInput?.()" @focusout="state.phase === 'running' && physics?.resumeInput?.()">
        <div class="command-heading"><span>YOUR NEXT MOVE</span><span>{{ state.phase === 'ready' ? 'BRIEFING' : state.phase === 'running' ? 'DECISION DESK' : 'MISSION DESK' }}</span></div>
        <p v-if="state.upcomingHazardNotice && state.phase === 'running'" class="hazard-advisory" role="alert">
          {{ state.upcomingHazardNotice }}
        </p>
        <ActivityPanel v-if="activeActivity" :station="activeActivity.station" :title="activeActivity.title" :steps="activeActivity.steps" :impact="activeActivity.impact" :progress="activityProgress" :inside="interior === activeActivity.station" :feedback="activityFeedback" :paused="state.phase === 'paused'" @control="operateControl" @travel="travelToTask" @enter="enterModule()" @exit="leaveModule" @cancel="cancelActivity" @pause="dispatch({ type: state.phase === 'paused' ? 'RESUME' : 'PAUSE' })" />
        <MissionPanels v-else
          :state="state"
          :mission="mission"
          :event="getCurrentEvent(mission, state)"
          @action="dispatch"
        />
      </aside>
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
.sound-btn { font-size: 11px; padding: 9px 12px; background: #15232c; border-color: #34434d; border-radius: 7px; }
.launch-btn { display: flex; gap: 18px; align-items: center; background: #e9b97d; color: #1d2830; border-color: #f2c796; border-radius: 7px; font-size: 12px; font-weight: 750; padding: 11px 15px; }
.launch-btn:hover { background: #f5ce9e; }
.mission-layout { display: grid; grid-template-columns: minmax(0, 1fr) 370px; grid-template-rows: auto minmax(0, 1fr); gap: 14px; height: calc(100dvh - 108px); min-height: 620px; }
.hud-container { grid-column: 1 / -1; min-width: 0; }
.world-panel { display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; min-width: 0; min-height: 0; margin: 0; overflow: hidden; border: 1px solid #3e4c50; border-radius: 14px; background: #142028; box-shadow: 0 16px 55px #0003; }
.surface-header, .surface-footer, .command-heading { display: flex; justify-content: space-between; gap: 12px; padding: 14px 16px; color: #a6bbc2; font-size: 9px; font-weight: 650; letter-spacing: .1em; }
.surface-header { border-bottom: 1px solid #34434a; color: #e2e6d9; }
.surface-footer { border-top: 1px solid #34434a; font-size: 8px; }
.live-dot { display: inline-block; width: 5px; height: 5px; margin-right: 7px; border-radius: 50%; background: #9ac5b5; box-shadow: 0 0 0 3px #9ac5b514; }
.viewport { min-height: 0; overflow: hidden; background: #765040; }
.scene-status { margin: 0; padding: 11px 16px; color: #becbd0; font-size: 11px; line-height: 1.5; }
.selected-badge { display: inline-flex; align-items: center; gap: 6px; margin-right: 8px; padding: 2px 7px; background: #263e48; border: 1px solid #486877; border-radius: 4px; font-size: 10px; font-weight: 700; color: #bde0ea; }
.clear-station-btn { font-size: 11px; padding: 0 4px; background: transparent; border: none; color: #a4c4cf; cursor: pointer; line-height: 1; }
.clear-station-btn:hover { color: #ffffff; }
.command-panel { min-width: 0; min-height: 0; overflow: auto; scrollbar-width: thin; scrollbar-color: #49606a transparent; border: 1px solid #34434c; border-radius: 14px; background: linear-gradient(145deg, #182731, #111d26); }
.command-heading { position: sticky; top: 0; z-index: 3; background: #1b2c35; border-bottom: 1px solid #34434c; font-size: 8px; }
.command-panel :deep(.mission-panels-root) { padding: 16px; gap: 18px; }
.command-panel :deep(.choices-container), .command-panel :deep(.briefing-grid) { grid-template-columns: minmax(0, 1fr); }
.command-panel :deep(.choice-card) { min-height: 0; padding: 13px; background: #1c303a; border-color: #3a505a; border-radius: 9px; }
.command-panel :deep(.choice-card:hover) { background: #29434d; border-color: #d7b481; }
.command-panel :deep(.choice-label), .command-panel :deep(h2) { font-size: 18px; }
.command-panel :deep(.choice-explanation), .command-panel :deep(.event-desc) { font-size: 12px; line-height: 1.6; }
.command-panel :deep(.tagline) { font-size: 13px; }
.command-panel :deep(.impacts) { margin-top: 12px; }
.command-panel :deep(.impact-pill) { font-size: 10px; }
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
}
@media (max-width: 999px) {
  .ares-app { padding: 0 12px 16px; }
  .app-header { height: auto; min-height: 80px; flex-wrap: wrap; padding: 14px 0; }
  .prototype-label { display: none; }
  .mission-layout { height: auto; min-height: 0; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto auto; }
  .hud-container :deep(.hud) { width: 100%; }
  .world-panel { height: 560px; }
  .command-panel { overflow: visible; }
  .command-heading { position: static; }
}
@media (max-width: 480px) {
  .brand-planet { width: 28px; height: 28px; }
  h1 { font-size: 19px; }
  .brand-kicker { font-size: 7px; }
  .header-controls { width: 100%; justify-content: space-between; }
  .world-panel { height: 440px; }
  .surface-header, .surface-footer { font-size: 7px; padding: 12px; }
  .surface-footer span:last-child { max-width: 130px; text-align: right; }
}
</style>
