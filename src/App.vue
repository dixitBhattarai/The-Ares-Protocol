<script setup lang="ts">
// Integration shell: Rohit owns this file. Feature agents edit their own folders.
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import type { GameAction, PhysicsAdapter, WorldAdapter } from './contracts';
import { createInitialState, getCurrentEvent, reduceGame } from './features/game';
import { loadMission } from './features/missions';
import HudOverlay from './features/hud/HudOverlay.vue';
import MissionPanels from './features/ui/MissionPanels.vue';

const mission = loadMission();
const state = shallowRef(createInitialState(mission));
const host = ref<HTMLElement>();
const graphicsError = ref('');
const stationMessage = ref('Click a base module to inspect systems, or use WASD / Arrow keys to walk.');

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

function dispatch(action: GameAction) {
  state.value = reduceGame(state.value, action, mission);
  if (action.type === 'RESTART') {
    physics?.reset?.();
    stationMessage.value = 'Outpost and astronaut reset. Plan your shifts carefully.';
  } else if (action.type === 'PAUSE') {
    physics?.pauseInput?.();
  } else if (action.type === 'RESUME') {
    physics?.resumeInput?.();
  }
}

function pauseWhenHidden() {
  if (document.hidden) dispatch({ type: 'PAUSE' });
}

onMounted(async () => {
  document.addEventListener('visibilitychange', pauseWhenHidden);
  try {
    const [{ createWorld }, { createPhysics }] = await Promise.all([
      import('./features/world'),
      import('./features/physics'),
    ]);
    if (disposed) return;
    world = createWorld(host.value!, station => {
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
      world!.setPlayerPose(physics!.getPlayerPose());
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
  world?.dispose();
  world = undefined;
  physics?.dispose();
  physics = undefined;
});
</script>

<template>
  <main>
    <header>
      <h1>The Ares Protocol</h1>
      <p>Junior Astronaut Outpost Lab · Mars Decision Simulation</p>
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
header { padding: 1rem 1.25rem 0.5rem; }
h1 { margin: 0; font-size: 1.8rem; letter-spacing: -0.02em; }
header p { margin: 0.25rem 0 0; color: #a3b8cc; font-size: 0.95rem; }
.viewport { height: min(42vh, 440px); min-height: 220px; overflow: hidden; background: #160f16; }
.scene-status { margin: 0.5rem 1.25rem; font-size: 0.88rem; color: #cad4df; line-height: 1.4; }
</style>
