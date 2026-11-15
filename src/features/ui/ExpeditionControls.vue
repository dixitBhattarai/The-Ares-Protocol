<script setup lang="ts">
import type {RoverState,StormControlId,StormPreparation} from '../../contracts/expedition';
defineProps<{rover:RoverState;power:number;nearRover:boolean;target:string;nearPrep?:{id:StormControlId;label:string};prep?:StormPreparation;preparing:number;paused:boolean;carrying:boolean}>();
const emit=defineEmits<{rover:[];recover:[];prepare:[id:StormControlId];cancel:[]}>();
</script>
<template>
 <aside class="expedition" aria-label="Surface expedition controls">
  <template v-if="rover.driving">
   <strong>ROVER · {{ Math.ceil(rover.battery) }}% <span v-if="carrying">▣ SAMPLE ON BOARD</span></strong>
   <meter min="0" max="100" low="20" :value="rover.battery" aria-label="Rover battery"/>
   <p>{{ target }}</p><small>W/S · drive　A/D · steer　Space · brake</small>
   <button :disabled="paused" @click="emit('rover')">E · Park & step out</button>
  </template>
  <button v-else-if="nearRover" :disabled="paused||rover.battery<=0" @click="emit('rover')">E · Drive rover · {{ Math.ceil(rover.battery) }}%</button>
  <p v-if="carrying&&!rover.driving">Sample sealed · take it to the solar lab.</p>
  <button v-if="rover.battery<=0" :disabled="paused||power<5" @click="emit('recover')">Recover rover · costs 5 power</button>
  <template v-if="nearPrep&&!rover.driving">
   <button v-if="preparing<=0" :disabled="paused||prep?.[nearPrep.id]" @click="emit('prepare',nearPrep.id)">E · {{ prep?.[nearPrep.id]?'Ready ✓':nearPrep.label }}</button>
   <template v-else><progress :value="preparing" max="2" aria-label="Securing equipment"/><button @click="emit('cancel')">Cancel</button></template>
  </template>
 </aside>
</template>
<style scoped>
.expedition{position:absolute;left:50%;bottom:105px;transform:translateX(-50%);z-index:18;display:grid;gap:8px;max-width:min(420px,calc(100% - 24px));padding:12px;border-radius:14px;background:#102b38ed;color:#eff9ed;border:1px solid #81abb2;font:13px system-ui;box-shadow:0 8px 24px #0005}.expedition:empty{display:none}strong{font-size:12px;color:#ffe2a3}span{margin-left:10px;font-size:10px}p{margin:0}small{color:#adcbd0;font-size:11px}meter,progress{width:100%;accent-color:#b7e1a1}button{min-height:44px;border:1px solid #8eb6af;border-radius:8px;background:#254951;color:#fff1ce;padding:9px 16px;cursor:pointer;font-weight:700}button:disabled{opacity:.5}button:focus-visible{outline:3px solid #ffdc89;outline-offset:2px}@media(max-width:600px){.expedition{bottom:170px;width:calc(100% - 44px);box-sizing:border-box}}
</style>
