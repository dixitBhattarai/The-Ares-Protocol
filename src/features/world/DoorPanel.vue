<script setup lang="ts">
import type { StationId } from '../../contracts';
defineProps<{ station: StationId | null; inside: boolean; open: boolean; ready: boolean; paused: boolean }>();
defineEmits<{ toggle: []; enter: []; exit: []; travel: [station: StationId] }>();
const names = { habitat: 'Habitat', solar: 'Solar lab', greenhouse: 'Greenhouse' };
</script>
<template>
  <section class="door-panel" aria-label="Building exploration controls">
    <template v-if="station">
      <strong>{{ names[station] }}</strong>
      <p role="status">Door {{ open ? ready ? 'open — walk through!' : 'opening…' : 'closed' }} · E opens / closes</p>
      <div class="actions">
        <button :disabled="paused" @click="$emit('toggle')">{{ open ? 'Close door (E)' : 'Open door (E)' }}</button>
        <button v-if="inside" :disabled="paused" @click="$emit('exit')">Exit room</button>
        <button v-else :disabled="paused || !open || !ready" @click="$emit('enter')">Enter room</button>
      </div>
      <p v-if="inside" class="tip">Explore freely. The exit is at the front of the room.</p>
    </template>

    <details v-if="!inside"><summary>Travel</summary><div class="actions"><button v-for="(name, id) in names" :key="id" :disabled="paused" @click="$emit('travel', id)">{{ name }}</button></div></details>
  </section>
</template>
<style scoped>
.door-panel { flex-shrink:0; display:flex; align-items:center; flex-wrap:wrap; gap:7px 14px; padding:10px 14px; border-top:2px solid #6edcc7; border-bottom:1px solid #446875; background:#102f3b; color:#f0fff9; font-size:12px; }
p { margin:7px 0; line-height:1.4; } strong { color:#ffe190; font-size:14px; } .actions { display:flex; flex-wrap:wrap; gap:6px; } button { border:1px solid #a2e9df; border-radius:9px; padding:9px 10px; color:#102a35; background:#a5efdf; font-weight:700; cursor:pointer; } button:disabled { opacity:.5; cursor:default; } button:focus-visible,summary:focus-visible { outline:3px solid #ffdc7b; outline-offset:3px; } summary { cursor:pointer; padding:5px 0; } .tip { color:#c7dce4; font-size:11px; }
@media(max-width:600px) { .door-panel { padding:8px 10px; gap:4px 8px; font-size:11px; } .tip { display:none; } p { margin:3px 0; } button { padding:8px; } }
</style>
