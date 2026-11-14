<script setup lang="ts">
import { PREPARATION, type PreparationLevel } from './preflight';
defineProps<{ level: PreparationLevel; progress: number; feedback: string; nearConsole: boolean; paused: boolean }>();
defineEmits<{ control: [step: string]; remote: []; pause: [] }>();
</script>
<template>
  <section class="preparation" aria-label="Expedition preparation level">
    <p class="eyebrow">{{ level === 'earth' ? '01 / EARTH' : '02 / ORBIT' }} · PLAYABLE PREPARATION</p>
    <h2>{{ PREPARATION[level].title }}</h2><p>{{ PREPARATION[level].description }}</p>
    <p>WASD / arrows to move. Return focus to the 3D view to walk. Click the numbered 3D console screens in order, or use the buttons below.</p>
    <ol><li v-for="(step, i) in PREPARATION[level].steps" :key="step">{{ i < progress ? '✓ ' : '' }}{{ step }}</li></ol>
    <p role="status">{{ feedback || (nearConsole ? 'Console within reach.' : 'Move closer to the back-wall console.') }}</p>
    <div class="controls"><button v-for="step in [...PREPARATION[level].steps].reverse()" :key="step" :disabled="paused" @click="$emit('control', step)">{{ step }}</button></div>
    <button @click="$emit('remote')">Use accessible remote console</button>
    <button @click="$emit('pause')">{{ paused ? 'Resume preparation' : 'Pause preparation' }}</button>
    <p class="note">A condensed fictional training sequence. Room movement is simplified, not a zero-gravity simulation. EO-1 is displayed as a navigation reference, not a claim that this Earth satellite travels to Mars.</p>
  </section>
</template>
<style scoped>.preparation { padding: 18px; color: #e6efed; font-size: 12px; line-height: 1.6; }.eyebrow { color:#efc895;font-size:9px;letter-spacing:.1em; } h2 { font-size:20px; }.controls { display:grid;gap:6px; } button { font-size:12px;padding:10px;margin:4px 0; }.note { color:#a7bec9;font-size:10px; }</style>
