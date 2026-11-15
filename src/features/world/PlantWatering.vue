<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { MINI_TARGETS } from './minigame';
import { PLANT_X, ROOT_Y, waterRoots } from './watering';
const props = defineProps<{stage:number;paused:boolean}>();
const emit = defineEmits<{complete:[stage:number]}>();
const moisture = ref(0), held = ref(false), sent = ref(false), selected = ref(0), successTime = ref(0);
const nozzle = ref({x:80,y:65});
const target = computed(()=>MINI_TARGETS[props.stage] ?? 0);
const pouring = computed(()=>held.value && !props.paused && moisture.value<1);
const aimed = computed(()=>Math.hypot((nozzle.value.x-PLANT_X[target.value])/1.25,nozzle.value.y-ROOT_Y)<27);
const message = computed(()=>props.paused?'Garden paused.':moisture.value>=1?'Roots watered. Watch the leaves lift!':pouring.value?aimed.value?'The soil is soaking up the water.':'Aim the spout at the ring around the thirsty roots.':'Drag and hold over the thirsty plant’s soil to pour.');
function isHealthy(i:number){return MINI_TARGETS.slice(0,props.stage).some(n=>n===i)||i===target.value&&moisture.value>=1;}
function growth(i:number){return isHealthy(i)||i!==target.value?1:moisture.value;}
function move(event:PointerEvent){const r=(event.currentTarget as Element).getBoundingClientRect();nozzle.value={x:Math.max(24,Math.min(336,(event.clientX-r.left)/r.width*360)),y:Math.max(40,Math.min(238,(event.clientY-r.top)/r.height*280))};}
function begin(event:PointerEvent){if(props.paused||sent.value||moisture.value>=1)return;(event.currentTarget as HTMLElement).focus();(event.currentTarget as Element).setPointerCapture(event.pointerId);held.value=true;move(event);}
function stop(){held.value=false;}
function key(event:KeyboardEvent){
 if(!['ArrowLeft','ArrowRight',' ','Enter'].includes(event.key))return;
 event.preventDefault();if(props.paused||moisture.value>=1)return;
 if(event.key==='ArrowLeft'||event.key==='ArrowRight'){selected.value=(selected.value+(event.key==='ArrowLeft'?2:1))%3;}
 else held.value=true;
 nozzle.value={x:PLANT_X[selected.value],y:ROOT_Y};
}
watch(()=>props.stage,()=>{moisture.value=0;held.value=false;sent.value=false;successTime.value=0;});
watch(()=>props.paused,stop);
let last=performance.now();
const timer=setInterval(()=>{
 const now=performance.now(),delta=Math.min(.1,(now-last)/1000);last=now;
 if(props.paused||document.hidden||sent.value){stop();return;}
 moisture.value=waterRoots(props.stage,moisture.value,nozzle.value.x,nozzle.value.y,delta,pouring.value);
 if(moisture.value>=1){stop();successTime.value+=delta;if(successTime.value>=.85){sent.value=true;emit('complete',props.stage);}}
},33);
onBeforeUnmount(()=>clearInterval(timer));
</script>
<template>
 <section class="garden-task" :class="{paused,flowing:pouring,recovered:moisture>=1}" aria-label="Water the greenhouse plants">
  <header><span>GREENHOUSE / HANDS ON</span><span>{{ stage+1 }} OF 3</span></header>
  <h3>A little water. New life.</h3>
  <p>Find the drooping leaves. Bring the watering can to the roots.</p>
  <div class="garden-scene" tabindex="0" role="group" aria-label="Watering workbench. Left and right select a plant. Hold Space or Enter to water its roots." @pointerdown="begin" @pointermove="move" @pointerup="stop" @pointercancel="stop" @lostpointercapture="stop" @keydown="key" @keyup.space.prevent="stop" @keyup.enter.prevent="stop" @blur="stop">
   <svg viewBox="0 0 360 280" aria-hidden="true">
    <defs>
     <linearGradient id="garden-wall" x2="0" y2="1"><stop stop-color="#244951"/><stop offset="1" stop-color="#0a2028"/></linearGradient>
     <linearGradient id="garden-pot" x2="1" y2="1"><stop stop-color="#d5a17a"/><stop offset="1" stop-color="#815b4b"/></linearGradient>
     <linearGradient id="garden-leaf"><stop stop-color="#4e9973"/><stop offset="1" stop-color="#acdc86"/></linearGradient>
    </defs>
    <rect width="360" height="280" fill="url(#garden-wall)"/>
    <path d="M0 80h360M40 0v244M180 0v244M320 0v244" stroke="#8fb9af" opacity=".1"/>
    <path d="M26 22h308" stroke="#c8e9bd" stroke-width="5" stroke-linecap="round"/>
    <path d="M26 27h308L325 200H35Z" fill="#d3f0ad" opacity=".025"/>
    <path d="M0 248h360" stroke="#769990" stroke-width="9"/><path d="M0 257h360" stroke="#0a1b22" stroke-width="13"/>
    <g v-for="(x,i) in PLANT_X" :key="i" :transform="`translate(${x} 0)`">
     <ellipse cy="245" rx="39" ry="6" fill="#061b21" opacity=".6"/>
     <path d="M-33 203H33L26 244H-26Z" fill="url(#garden-pot)"/>
     <ellipse cy="204" rx="33" ry="9" :fill="i===target&&moisture>0?'#302d25':'#69513b'"/>
     <g :class="{leaves:true,healthy:isHealthy(i)}" :style="{'--lift':growth(i)}">
      <path :d="`M0 204Q${-8+growth(i)*8} 165 ${-6+growth(i)*6} ${113-growth(i)*20}`" stroke="#6db479" stroke-width="4" fill="none"/>
      <g :transform="`rotate(${-70+growth(i)*70} 0 163)`"><path d="M0 164Q-48 132-38 120Q-5 117 0 164Z" :fill="i===target&&moisture<.4?'#b3af6d':'url(#garden-leaf)'"/><path d="M-34 124 0 164" stroke="#d3e5a1" stroke-width="1" opacity=".6"/></g>
      <g :transform="`rotate(${70-growth(i)*70} 0 145)`"><path d="M0 146Q41 113 37 105Q5 106 0 146Z" fill="url(#garden-leaf)"/><path d="m0 146 32-35" stroke="#d3e5a1" stroke-width="1" opacity=".6"/></g>
      <path :d="`M${-6+growth(i)*6} ${113-growth(i)*20}q-21-19-13-30q21 3 13 30`" fill="#9fc68a"/>
     </g>
     <ellipse v-if="i===target&&moisture<1" :cy="ROOT_Y" rx="37" ry="13" fill="none" stroke="#f1d29a" stroke-width="2" stroke-dasharray="4 5" class="root-ring"/>
     <ellipse v-if="i===target" cy="207" :rx="moisture*30" :ry="moisture*6" fill="#293f36" opacity=".6"/>
     <rect x="-18" y="221" width="36" height="15" rx="3" fill="#263e3c"/><text y="232" text-anchor="middle" font-size="9" fill="#ddedcd">{{ isHealthy(i)?'✓':`0${i+1}` }}</text>
    </g>
    <g v-if="pouring" class="water-stream" :transform="`translate(${nozzle.x} ${nozzle.y})`"><path d="M0-8q-5 10-3 18m8-16q2 14 6 23m-10-3v14" fill="none" stroke="#a2e7f4" stroke-width="2.5" stroke-dasharray="3 5"/><ellipse v-if="aimed" cy="10" rx="19" ry="4" fill="none" stroke="#c1f2e0" opacity=".65"/></g>
    <g class="watering-can" :transform="`translate(${nozzle.x-47} ${nozzle.y-48}) rotate(${pouring?18:0} 10 30)`">
     <path d="M-22 4h39v35q-20 10-39-2Z" fill="#87bac2" stroke="#d3e6df" stroke-width="2"/>
     <path d="M17 21 39 35 48 28l4 6-12 10-23-10" fill="#a6cbd0" stroke="#d3e6df" stroke-width="2"/>
     <path d="M-21 9q-25-9-24 10t24 8" stroke="#98c8ca" stroke-width="5" fill="none"/>
     <path d="M-14 2q10-13 24 0" stroke="#c2dfdb" stroke-width="3" fill="none"/><path d="M-16 29h26" stroke="#d7efdf" opacity=".6"/>
    </g>
    <text x="14" y="272" font-family="monospace" font-size="8" fill="#9abfb3">ARES BOTANY · ROOT ZONE IRRIGATION</text>
   </svg>
  </div>
  <div class="moisture"><span>ROOT MOISTURE</span><strong>{{ Math.round(moisture*100) }}%</strong></div>
  <progress :value="moisture" max="1" aria-label="Root moisture"/>
  <p class="feedback" role="status">{{ message }}</p>
  <p class="keyboard">Keyboard: focus the garden, use ← →, then hold Space.</p>
  <small>Leaves lifting is feedback. Real crops take time to grow.</small>
 </section>
</template>
<style scoped>
.garden-task{padding:20px;border:1px solid #6d9287;border-radius:16px;background:linear-gradient(145deg,#213e3f,#102a30);color:#eaf3dc}.garden-task header{display:flex;justify-content:space-between;margin-right:32px;font:10px ui-monospace,monospace;letter-spacing:.1em;color:#b3ccad}.garden-task h3{font-size:24px;letter-spacing:-.035em;margin:15px 0 8px;font-weight:600}.garden-task p{font-size:12px;line-height:1.6;color:#bcd1c3}.garden-scene{border:1px solid #61887b;border-radius:10px;overflow:hidden;touch-action:none;cursor:grab;user-select:none}.garden-scene:active{cursor:grabbing}.garden-scene:focus-visible{outline:3px solid #f1d29a;outline-offset:4px}.garden-scene svg{display:block;width:100%;height:auto}.moisture{display:flex;justify-content:space-between;margin:16px 0 7px;font:10px ui-monospace,monospace;letter-spacing:.08em}.moisture strong{color:#c9e9ad}.garden-task progress{width:100%;height:7px;accent-color:#b6db92;display:block}.garden-task .feedback{color:#e4d5b1;min-height:38px;margin-bottom:4px}.garden-task .keyboard{font-size:10px;margin:4px 0 12px;color:#a8c3b6}.garden-task small{font-size:10px;color:#8dada1}.leaves path{transition:fill .5s}.healthy{animation:plant-rise .85s ease-out}.water-stream path{animation:water-fall .3s linear infinite}.watering-can{transition:transform .12s}.root-ring{animation:root-pulse 2s ease-in-out infinite}.paused *{animation-play-state:paused!important}@keyframes water-fall{to{stroke-dashoffset:-16}}@keyframes plant-rise{from{opacity:.6}to{opacity:1}}@keyframes root-pulse{50%{opacity:.35}}@media(prefers-reduced-motion:reduce){.garden-task *{animation:none!important;transition:none!important}}@media(max-width:400px){.garden-task{padding:14px}.garden-task h3{font-size:21px}}
</style>
