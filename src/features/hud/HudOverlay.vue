<script setup lang="ts">
import type { GameState, MissionData } from '../../contracts';
defineProps<{ state: Readonly<GameState>; mission: MissionData }>();
</script>

<template>
  <section class="hud" aria-label="Outpost status">
    <strong>Shift {{ Math.min(state.turn + 1, mission.maxTurns) }} / {{ mission.maxTurns }}</strong>
    <span v-for="(value, name) in state.resources" :key="name" class="resource">
      <label :for="`reserve-${name}`">{{ name }}: {{ value }} / 100 game units</label>
      <meter :id="`reserve-${name}`" :value="value" min="0" max="100">{{ value }}</meter>
    </span>
    <span>Science: {{ state.science }} / {{ mission.scienceTarget }}</span>
    <span>Shelter: {{ state.shielding }} / 100 game units</span>
  </section>
</template>

<style scoped>
.hud { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; padding: 1rem; background: #172331; }
.resource { display: grid; gap: .25rem; text-transform: capitalize; font-size: .9rem; }
meter { width: 100%; }
</style>
