<script setup lang="ts">
import type { StationId } from '../../contracts';
import StationMinigame from './StationMinigame.vue';
defineProps<{ station: StationId; title: string; steps: readonly string[]; impact: string; progress: number; inside: boolean; feedback: string; paused: boolean }>();
defineEmits<{ control: [value: string]; travel: []; enter: []; exit: []; cancel: []; pause: [] }>();
</script>
<template>
  <section class="activity" aria-label="Station activity">
    <span class="eyebrow">{{ inside ? 'INSIDE' : 'GO TO' }} / {{ station.toUpperCase() }}</span>
    <h2>{{ title }}</h2>
    <p class="impact">On completion: {{ impact }}</p>
    <template v-if="!inside">
      <p>Walk to the {{ station }} door. Press E to open it, then walk through or use Enter room. Finish the minigame inside to earn the job reward.</p>
      <button @click="$emit('enter')">Enter nearby module</button>
      <button @click="$emit('travel')">Accessible travel to task door</button>
    </template>
    <template v-else>
      <StationMinigame :station="station" :title="title" :progress="progress" :paused="paused" @complete="stage => stage === progress && $emit('control', steps[stage])" />
      <details><summary>Procedure notes</summary><ol><li v-for="(step, i) in steps" :key="step" :class="{ done: i < progress }">{{ i < progress ? '✓ ' : '' }}{{ step }}</li></ol></details>
      <button @click="$emit('exit')">Exit module</button>
    </template>
    <p role="status">{{ feedback }}</p>
    <p class="note">The reward is paid once when all checks are complete. Outpost systems and hazards continue while you work; use Pause for a break. These are authored game rules, not medical predictions.</p>
    <div class="actions"><button @click="$emit('pause')">{{ paused ? 'Resume activity' : 'Pause activity' }}</button><button @click="$emit('cancel')">Cancel task</button></div>
  </section>
</template>
<style scoped>
.activity { padding: 18px; color: #e5eee9; font-size: 13px; line-height: 1.6; }
.activity h2 { font-size: 20px; } .eyebrow { color: #edc68e; font-size: 10px; letter-spacing: .12em; }
.activity button { padding: 10px; font-size: 12px; margin: 4px 3px; } .controls { display: grid; gap: 4px; }
.done { color: #a9d6b4; } .note { font-size: 11px; color: #aabfc7; } .actions { display: flex; flex-wrap: wrap; }
</style>
