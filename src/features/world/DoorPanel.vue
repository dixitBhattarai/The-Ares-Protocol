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
.door-panel { flex-shrink:0; display:flex; align-items:center; flex-wrap:wrap; gap:7px 14px; padding:12px 16px; border-top:3px solid #00e5ff; border-bottom:1px solid #446875; background:linear-gradient(135deg, #102f3be8, #163e4de8); color:#f0fff9; font-size:12px; font-family:var(--font-body, system-ui, sans-serif); }
p { margin:6px 0; line-height:1.4; }
strong { color:#00e5ff; font-family:var(--font-display, 'Orbitron', sans-serif); font-size:13px; letter-spacing:.05em; text-shadow:0 0 10px rgb(0 229 255 / 40%); }
.actions { display:flex; flex-wrap:wrap; gap:6px; }
button { border:1px solid rgb(0 229 255 / 40%); border-radius:8px; padding:8px 12px; color:#eafff5; background:linear-gradient(135deg, #194448, #23595e); font-family:var(--font-display, 'Orbitron', sans-serif); font-size:11px; font-weight:700; letter-spacing:.03em; cursor:pointer; box-shadow:0 2px 8px rgb(0 0 0 / 25%); transition:all .14s cubic-bezier(.2,.8,.25,1.15); }
button:hover { background:linear-gradient(135deg, #225b60, #2c7278); border-color:#00e5ff; box-shadow:0 0 12px rgb(0 229 255 / 40%); transform:translateY(-1px) scale(1.02); }
button:active { transform:scale(.97); }
button:disabled { opacity:.5; cursor:default; transform:none; box-shadow:none; }
button:focus-visible,summary:focus-visible { outline:3px solid #ffdc7b; outline-offset:3px; }
summary { cursor:pointer; padding:5px 0; font-family:var(--font-display, 'Orbitron', sans-serif); font-size:11px; color:#8be4ff; }
.tip { color:#c7dce4; font-size:11px; }
@media(max-width:600px) { .door-panel { padding:8px 10px; gap:4px 8px; font-size:11px; } .tip { display:none; } p { margin:3px 0; } button { padding:7px 10px; font-size:10px; } }
</style>
