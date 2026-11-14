<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { StationId } from '../../contracts';
import { advanceMiniGame, createMiniState, MINI_TARGETS, CIRCUIT_SYMBOLS, type MiniInput } from './minigame';
const props=defineProps<{station:StationId;progress:number;paused:boolean}>();
const emit=defineEmits<{complete:[stage:number]}>();
const state=ref(createMiniState(props.progress));
watch(()=>props.progress,stage=>{state.value=createMiniState(stage);});
const target=computed(()=>MINI_TARGETS[props.progress] ?? 0);
function act(input:MiniInput) {
  const before=state.value;state.value=advanceMiniGame(props.station,before,input,!props.paused);
  if(!before.complete && state.value.complete)emit('complete',props.progress);
}
</script>
<template>
  <section class="mini" aria-label="Station minigame">
    <p class="step">CHECK {{ progress+1 }} / 3 · {{ station.toUpperCase() }}</p>
    <template v-if="station==='habitat'">
      <h3>Seal the air panels</h3><p>Find the leaking panel. Press it three times to secure the patch. Take your time!</p>
      <div class="tiles"><button v-for="i in [0,1,2]" :key="i" :class="{target:i===target}" :disabled="paused||state.complete" :aria-label="`Air panel ${i+1}${i===target?' leaking':''}`" @click="act({type:'tap',index:i})"><span class="vent">{{ i===target?'≋':'▥' }}</span>Panel {{ i+1 }}<small>{{ i===target?'Air escaping':'Sealed' }}</small></button></div>
      <progress :value="state.taps" max="3" aria-label="Patch secured" />
    </template>
    <template v-else-if="station==='solar'">
      <h3>Connect the power</h3><p>Connect the <strong>{{ CIRCUIT_SYMBOLS[progress] }}</strong> cell to the matching socket. Match symbols, not just colors.</p>
      <div class="circuits"><div><span>POWER CELLS</span><button v-for="(symbol,i) in CIRCUIT_SYMBOLS" :key="symbol" :class="{chosen:state.selected===i}" :disabled="paused||state.complete" :aria-pressed="state.selected===i" @click="act({type:'source',index:i})">{{ symbol }} cell</button></div><div><span>SOCKETS</span><button v-for="i in [2,0,1]" :key="i" :disabled="paused||state.complete" @click="act({type:'socket',index:i})">{{ CIRCUIT_SYMBOLS[i] }} socket</button></div></div>
    </template>
    <template v-else>
      <h3>Plant detective</h3><p>Inspect the leaves. Find the drooping plant and choose how to help it.</p>
      <div class="tiles"><button v-for="i in [0,1,2]" :key="i" :class="{chosen:state.inspected===i}" :disabled="paused||state.complete" :aria-label="`Inspect plant ${i+1}`" @click="act({type:'leaf',index:i})"><svg viewBox="0 0 60 75" aria-hidden="true"><path d="M30 67V20" stroke="#c4e8af" stroke-width="4"/><ellipse cx="21" cy="32" rx="16" ry="8" :fill="i===target?'#dab768':'#92e29b'" :transform="i===target?'rotate(25 21 32)':'rotate(-25 21 32)'"/><ellipse cx="39" cy="45" rx="16" ry="8" :fill="i===target?'#dab768':'#92e29b'"/><path d="M12 65h36l-5 9H17z" fill="#f4aa70"/></svg>Plant {{ i+1 }}<small>{{ i===target?'Drooping leaf':'Healthy leaf' }}</small></button></div>
      <div v-if="state.inspected!==null" class="care"><button :disabled="paused||state.complete" @click="act({type:'care',index:0})">Water roots gently</button><button :disabled="paused||state.complete" @click="act({type:'care',index:1})">Pull the plant out</button></div>
    </template>
    <p role="status" class="feedback">{{ paused?'Activity paused.':state.feedback || 'Use mouse, touch, or Tab and Enter.' }}</p>
  </section>
</template>
<style scoped>
.mini{padding:14px;border:2px solid #7fdbc6;border-radius:16px;background:linear-gradient(145deg,#173e4a,#172c3b);color:#f3fff3}.mini h3{font-size:20px;margin:5px 0;color:#ffe297}.mini p{font-size:12px;line-height:1.5}.step{font-size:10px!important;letter-spacing:.08em;color:#a5f4df}.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.mini button{margin:0;padding:9px 5px;border:2px solid #638c9b;border-radius:11px;background:#244956;color:#effffa;font-size:11px;cursor:pointer;min-width:0}.mini button:focus-visible{outline:3px solid #ffe08e;outline-offset:3px}.mini button:hover{background:#356572}.mini button.target,.mini button.chosen{border-color:#ffe08e;background:#47605b}.mini button:disabled{opacity:.55;cursor:default}.tiles small{display:block;font-size:9px;margin-top:5px}.vent{display:block;font-size:32px}.tiles svg{display:block;width:100%;height:75px}.circuits{display:grid;grid-template-columns:1fr 1fr;gap:15px}.circuits div{display:grid;gap:8px}.circuits span{font-size:9px;color:#c5e7ef}.care{display:flex;gap:7px;margin-top:10px}.feedback{min-height:32px;color:#c8f9df}.mini progress{width:100%;margin-top:12px;accent-color:#91e1b6}
</style>
