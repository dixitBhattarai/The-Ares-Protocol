<script setup lang="ts">
import { PREPARATION, type PreparationLevel } from './preflight';
defineProps<{ level: PreparationLevel; outdoors?: boolean; progress: number; feedback: string; nearConsole: boolean; paused: boolean }>();
defineEmits<{ control: [step: string]; remote: []; pause: []; enterLab: []; outside: [] }>();
</script>
<template>
  <section class="preparation" aria-label="Expedition preparation level">
    <p class="eyebrow">{{ level === 'earth' ? '01 / EARTH' : '02 / ORBIT' }} · PLAYABLE PREPARATION</p>
    <h2>{{ PREPARATION[level].title }}</h2><p>{{ PREPARATION[level].description }}</p>
    <p>Drag to look around; scroll or pinch to zoom. WASD / arrows move relative to the camera. Use Overview to see the whole area.</p>
    <template v-if="level === 'earth'">
      <p v-if="outdoors">Explore the Earth training campus. Walk through the striped lab door to do the launch checks. E opens or closes the lab door.</p>
      <button v-if="outdoors" :disabled="paused" @click="$emit('enterLab')">Accessible travel into training lab</button>
      <button v-else :disabled="paused" @click="$emit('outside')">Explore Earth outdoors</button>
      <dl class="manifest" aria-label="Launch manifest">
        <div><dt>Propellant</dt><dd>Liquid oxygen + liquid hydrogen · demo tanks staged</dd></div>
        <div><dt>Crew</dt><dd>Suit seals and cabin pressure ready to verify</dd></div>
        <div><dt>Supplies</dt><dd>Food, water and science cargo secured</dd></div>
        <div><dt>Flight systems</dt><dd>Battery, guidance and launch window ready to verify</dd></div>
      </dl>
    </template>
    <p>Click the numbered 3D console screens in order, or use the buttons below.</p>
    <ol><li v-for="(step, i) in PREPARATION[level].steps" :key="step">{{ i < progress ? '✓ ' : '' }}{{ step }}</li></ol>
    <p role="status">{{ feedback || (nearConsole ? 'Console within reach.' : 'Move closer to the back-wall console.') }}</p>
    <div class="controls"><button v-for="step in [...PREPARATION[level].steps].reverse()" :key="step" :disabled="paused" @click="$emit('control', step)">{{ step }}</button></div>
    <button :disabled="paused" @click="$emit('remote')">Use accessible remote console</button>
    <button @click="$emit('pause')">{{ paused ? 'Resume preparation' : 'Pause preparation' }}</button>
    <p class="note">The checks are simplified game prompts, not a real launch checklist. Orbital travel and Mars landing are compressed and not to scale. EO-1 is a navigation reference, not a claim that this Earth satellite travels to Mars.</p>
  </section>
</template>
<style scoped>.preparation { padding: 18px; color: #e6efed; font-size: 12px; line-height: 1.6; }.eyebrow { color:#efc895;font-size:9px;letter-spacing:.1em; } h2 { font-size:20px; }.controls { display:grid;gap:6px; } button { font-size:12px;padding:10px;margin:4px 0; }.note { color:#a7bec9;font-size:10px; }.manifest { display:grid;gap:6px;margin:12px 0;padding:10px;background:#17252d;border:1px solid #364b54;border-radius:8px; }.manifest div { display:grid;grid-template-columns:82px 1fr;gap:8px; }.manifest dt { color:#d9efdd;font-weight:750; }.manifest dd { margin:0;color:#bfd0d2; }</style>
