<script setup lang="ts">
// Integration shell: Rohit owns this file. Feature agents edit their own folders.
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { STATIONS } from './contracts';
import type { GameAction, PhysicsAdapter, Vec3, WorldAdapter } from './contracts';
import { createInitialState, getCurrentEvent, reduceGame } from './features/game';
import { soundFX } from './features/game/audio';
import { loadMission } from './features/missions';
import HudOverlay from './features/hud/HudOverlay.vue';
import MissionPanels from './features/ui/MissionPanels.vue';

const mission = loadMission();
const state = shallowRef(createInitialState(mission));
const host = ref<HTMLElement>();
const graphicsError = ref('');
const stationMessage = ref('Click a base module to inspect systems, or use WASD / Arrow keys to walk.');
const soundEnabled = ref(true);

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

function dispatch(action: GameAction) {
  state.value = reduceGame(state.value, action, mission);

  if (action.type === 'CHOOSE') {
    if (state.value.phase === 'won') {
      soundFX.playVictory();
    } else if (state.value.phase === 'lost') {
      soundFX.playDepleted();
    } else if (state.value.lastHazardNotice) {
      soundFX.playHazard();
    } else {
      soundFX.playDecision();
    }
  } else if (action.type === 'RESTART') {
    physics?.reset?.();
    stationMessage.value = 'Outpost and astronaut reset. Plan your shifts carefully.';
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

function checkStationProximity(pose: Vec3) {
  if (currentSelectedStation) return;
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
  if (event.code === 'KeyM') {
    toggleSound();
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
    } else if (event.code === 'KeyP') {
      dispatch({ type: 'PAUSE' });
    }
  } else if (state.value.phase === 'paused') {
    if (event.code === 'KeyP' || event.code === 'Space') {
      dispatch({ type: 'RESUME' });
    }
  } else if (['won', 'lost'].includes(state.value.phase)) {
    if (event.code === 'KeyR') {
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
  <main>
    <header class="app-header">
      <div>
        <h1>The Ares Protocol</h1>
        <p>Junior Astronaut Outpost Lab · Mars Decision Simulation</p>
      </div>
      <div class="header-controls">
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
    <HudOverlay :state="state" :mission="mission" />
    <div
      ref="host"
      class="viewport"
      role="img"
      aria-label="Interactive 3D Mars outpost showing habitat, solar array, hydroponic greenhouse, and explorer astronaut"
    />
    <p class="scene-status" role="status">{{ graphicsError || stationMessage }}</p>
    <MissionPanels
      :state="state"
      :mission="mission"
      :event="getCurrentEvent(mission, state)"
      @action="dispatch"
    />
  </main>
</template>

<style scoped>
.app-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem 0.5rem; flex-wrap: wrap; gap: 0.5rem; }
h1 { margin: 0; font-size: 1.8rem; letter-spacing: -0.02em; }
.app-header p { margin: 0.25rem 0 0; color: #a3b8cc; font-size: 0.95rem; }
.sound-btn { padding: 0.4rem 0.8rem; font-size: 0.85rem; border-radius: 6px; background: #1c2b3c; border: 1px solid #4a627d; }
.sound-btn:hover { background: #2b3e54; }
.viewport { height: min(42vh, 440px); min-height: 220px; overflow: hidden; background: #160f16; }
.scene-status { margin: 0.5rem 1.25rem; font-size: 0.88rem; color: #cad4df; line-height: 1.4; }
</style>
