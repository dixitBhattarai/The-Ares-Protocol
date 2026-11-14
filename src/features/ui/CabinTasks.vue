<script setup lang="ts">
import {ref,computed} from 'vue';
import {newCabinCheck,adjustCabinCheck,cabinCheckReady,type CabinInput} from '../game/cabin-checks';
import {PREPARATION} from '../world/preflight';
const props=defineProps<{progress:number;paused:boolean}>();
const emit=defineEmits<{control:[step:string];pause:[]}>();
const state=ref(newCabinCheck());
const ready=computed(()=>cabinCheckReady(state.value,props.progress));
function act(input:CabinInput){state.value=adjustCabinCheck(state.value,input,!props.paused);}
function confirm(){if(!props.paused&&ready.value)emit('control',PREPARATION.space.steps[props.progress]);}
</script>
<template>
 <section class="cabin-task" aria-label="Flight cabin task">
  <header><span>FLIGHT CONSOLE</span><span>{{ progress+1 }} / 3</span></header>
  <h2>{{ ['Find the beacon','Set the Mars course','Pack the flight plan'][progress] }}</h2>
  <template v-if="progress===0">
   <p>Turn the dish toward the star.</p>
   <svg viewBox="0 0 300 145" role="img" aria-label="Dish bearing"><path d="M40 126A110 110 0 0 1 260 126" fill="none" stroke="#557a84" stroke-width="3"/><path d="M150 126V20" stroke="#ffe09b" stroke-dasharray="4 6"/><text x="150" y="19" text-anchor="middle" fill="#ffe09b" font-size="23">✦</text><g :transform="`rotate(${state.bearing-90} 150 126)`"><path d="M150 126V45" stroke="#9be5d2" stroke-width="5"/><path d="M120 60Q150 95 180 60" fill="#92d2d5" stroke="#ecfff3" stroke-width="3"/></g></svg>
   <div class="adjust"><button :disabled="paused" aria-label="Turn dish left" @click="act({type:'bearing',value:-15})">←</button><output>{{ state.bearing }}°</output><button :disabled="paused" aria-label="Turn dish right" @click="act({type:'bearing',value:15})">→</button></div>
  </template>
  <template v-else-if="progress===1">
   <p>Set the burn to meet the dotted path.</p>
   <svg viewBox="0 0 300 145" role="img" aria-label="Course preview"><circle cx="45" cy="100" r="23" fill="#7bc0e2"/><circle cx="255" cy="38" r="18" fill="#e69c73"/><path d="M70 100Q160 15 236 38" fill="none" stroke="#ffe09b" stroke-dasharray="5 7" stroke-width="3"/><path :d="`M70 100Q160 ${110-state.burn*32} 236 ${110-state.burn*24}`" fill="none" stroke="#9be5d2" stroke-width="4"/><text x="22" y="140" fill="#e7f6f3" font-size="12">EARTH</text><text x="237" y="13" fill="#e7f6f3" font-size="12">MARS</text></svg>
   <div class="adjust"><button :disabled="paused" aria-label="Less burn" @click="act({type:'burn',value:-1})">−</button><output>{{ state.burn }} / 6</output><button :disabled="paused" aria-label="More burn" @click="act({type:'burn',value:1})">+</button></div>
  </template>
  <template v-else>
   <p>Send the plan in order: 1 → 2 → 3.</p>
   <div class="packets"><button v-for="n in [3,1,2]" :key="n" :disabled="paused||state.packets.includes(n)" :aria-label="`Flight plan packet ${n}`" @click="act({type:'packet',value:n})">{{ state.packets.includes(n)?'✓':n }}</button></div>
   <p class="note">Radio takes time. Earth replies later.</p>
  </template>
  <p class="check" role="status">{{ ready?'✓ Ready to confirm':'Match the target' }}</p>
  <footer><button class="confirm" :disabled="paused||!ready" @click="confirm">{{ progress===2?'Queue message':'Confirm' }}</button><button @click="emit('pause')">{{ paused?'Resume':'Pause' }}</button></footer>
  <small>Game model · travel and checks are simplified</small>
 </section>
</template>
<style scoped>
.cabin-task{padding:20px;color:#e4f5ee;background:#102a32}.cabin-task header{display:flex;justify-content:space-between;color:#93bfb7;font:700 11px ui-monospace,monospace;letter-spacing:.1em}.cabin-task h2{font-size:24px;margin:14px 0 6px}.cabin-task p{font-size:14px;margin:8px 0}.cabin-task svg{width:100%;height:170px;background:#081b24;border:1px solid #456671;border-radius:10px;margin-top:8px}.adjust,.packets{display:flex;align-items:center;justify-content:center;gap:22px;margin:12px 0}.adjust output{min-width:64px;text-align:center;font:700 20px ui-monospace,monospace}.cabin-task button{min-width:48px;min-height:44px;padding:10px 16px;border:1px solid #83b4b1;border-radius:9px;background:#23444b;color:#f1fff5;font:700 16px inherit;cursor:pointer}.cabin-task button:disabled{opacity:.45;cursor:default}.cabin-task button:focus-visible{outline:3px solid #ffe09b;outline-offset:3px}.packets button{font-size:30px;min-height:90px;flex:1}.check{color:#ffe09b}.cabin-task footer{display:flex;gap:10px;margin:12px 0}.confirm{flex:1;background:#b3e6cc!important;color:#15362f!important}.cabin-task small,.cabin-task .note{font-size:11px;color:#a6c3be}
</style>
