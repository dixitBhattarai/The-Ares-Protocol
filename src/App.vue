<script setup lang="ts">
// Integration shell: Rohit owns this file. Feature agents edit their own folders.
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import type { GameAction, PhysicsAdapter, WorldAdapter } from './contracts';
import { createInitialState, getCurrentEvent, reduceGame } from './features/game';
import { loadMission } from './features/missions';
import HudOverlay from './features/hud/HudOverlay.vue';
import MissionPanels from './features/ui/MissionPanels.vue';
import SplashScreen from './features/ui/SplashScreen.vue';
import LoginScreen from './features/ui/LoginScreen.vue';

const mission = loadMission();
const state = shallowRef(createInitialState(mission));
const host = ref<HTMLElement>();
const graphicsError = ref('');
const stationMessage = ref('Click a base module to identify it.');
let world: WorldAdapter | undefined;
let physics: PhysicsAdapter | undefined;
let frame = 0;
let disposed = false;
let accumulator = 0;
const showSplash = ref(true);
function onSplashDone() {
  showSplash.value = false;
}
function onLoginStart() {
  dispatch({ type: 'START' });
}
function dispatch(action: GameAction) {
  state.value = reduceGame(state.value, action, mission);
  if (action.type === 'RESTART') {
    // PhysicsAdapter v1 has no reset API. Rohit and Anshu should add it together.
    stationMessage.value = 'New resource plan. Astronaut position stays where you left it in this starter.';
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
    world = createWorld(host.value!, station => { stationMessage.value = `Selected: ${station}. Use the decision buttons below.`; });
    physics = await createPhysics();
    if (disposed) { physics.dispose(); return; }
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, .1);
      previous = now;
      if (state.value.phase === 'running') {
        accumulator = Math.min(accumulator + elapsed, .1);
        while (accumulator >= 1 / 60) { physics!.step(1 / 60); accumulator -= 1 / 60; }
      } else accumulator = 0;
      world!.setPlayerPose(physics!.getPlayerPose());
      world!.setState(state.value);
      world!.render();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  } catch (error) {
    world?.dispose();
    world = undefined;
    graphicsError.value = '3D could not start. You can still play the mission using the buttons below.';
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
});
</script>

<template>
  <main>
    <!-- Both components mounted simultaneously: SplashScreen overlays with smooth crossfade into LoginScreen -->
    <SplashScreen v-if="showSplash" @finished="onSplashDone" />
    <LoginScreen v-if="state.phase === 'ready'" @start="onLoginStart" />
    <div v-show="state.phase !== 'ready'">
      <header><h1>The Ares Protocol</h1><p>Junior astronaut outpost lab · starter prototype</p></header>
      <HudOverlay :state="state" :mission="mission" />
      <div ref="host" class="viewport" role="img" aria-label="Mars outpost with a habitat, solar station, greenhouse and astronaut" />
      <p class="scene-status" role="status">{{ graphicsError || stationMessage }}</p>
      <MissionPanels :state="state" :mission="mission" :event="getCurrentEvent(mission, state)" @action="dispatch" />
    </div>
  </main>
</template>

<style scoped>
header { padding: 1rem; }
h1 { margin: 0; font-size: 1.7rem; }
header p { margin-bottom: 0; color: #bdcad9; }
.viewport { height: min(42vh, 440px); min-height: 210px; overflow: hidden; }
.scene-status { margin: .5rem 1rem; font-size: .9rem; color: #cad4df; }
</style>
