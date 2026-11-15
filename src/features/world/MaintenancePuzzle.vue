<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { EXPOSED_PANELS, placeShield } from './maintenance';
const props=defineProps<{kind:'shield';stage:number;paused:boolean}>();
const emit=defineEmits<{complete:[stage:number]}>();
const covered=ref<readonly number[]>([]),dragging=ref(false),sent=ref(false),testing=ref(false),pressure=ref(0),notice=ref('');
const scene=ref<HTMLElement>(),plate=ref({x:0,y:0});
const ready=computed(()=>covered.value.length===3);
const gap=(n:number)=>(EXPOSED_PANELS[props.stage] as readonly number[]|undefined)?.includes(n);
watch(()=>props.stage,()=>{covered.value=[];dragging.value=false;sent.value=false;testing.value=false;pressure.value=0;notice.value='';});
watch(()=>props.paused,()=>dragging.value=false);
function place(n:number){if(props.paused||sent.value||testing.value)return;const next=placeShield(props.stage,covered.value,n);notice.value=next===covered.value?'That section is already sealed.':'Panel locked. Seal seated.';covered.value=next;}
function move(event:PointerEvent){if(!dragging.value||!scene.value)return;const r=scene.value.getBoundingClientRect();plate.value={x:event.clientX-r.left,y:event.clientY-r.top};}
function grab(event:PointerEvent){if(props.paused||ready.value)return;dragging.value=true;(event.currentTarget as Element).setPointerCapture(event.pointerId);move(event);}
function drop(event:PointerEvent){if(!dragging.value)return;dragging.value=false;const panel=Array.from(scene.value?.querySelectorAll<HTMLElement>('[data-panel]')??[]).find(node=>{const r=node.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;});if(panel)place(Number(panel.dataset.panel));}
let last=performance.now();
const timer=setInterval(()=>{const now=performance.now(),d=Math.min(.1,(now-last)/1000);last=now;if(!testing.value||props.paused||document.hidden||sent.value)return;pressure.value=Math.min(1,pressure.value+d/1.1);if(pressure.value===1){sent.value=true;emit('complete',props.stage);}},33);
onBeforeUnmount(()=>clearInterval(timer));
</script>
<template>
 <section class="maintenance" :class="{paused}" aria-label="Repair the shelter wall">
  <header><span>SHELTER / HULL REPAIR</span><span>{{ stage+1 }} OF 3</span></header>
  <h3>Make the shelter solid.</h3>
  <p>Drag a spare plate over each cracked section. Lock all three, then test the seal.</p>
  <div ref="scene" class="shield-scene" @pointermove="move" @pointerup="drop" @pointercancel="dragging=false" @lostpointercapture="dragging=false">
   <div class="shield-grid">
    <button v-for="n in 9" :key="n" :data-panel="n-1" :class="{gap:gap(n-1),covered:covered.includes(n-1)}" :disabled="paused||sent||testing||covered.includes(n-1)" :aria-label="`Panel ${n}: ${covered.includes(n-1)?'covered':gap(n-1)?'gap':'solid'}`" @click="place(n-1)">
     <svg viewBox="0 0 100 72" aria-hidden="true"><path d="M4 4h92v64H4Z" fill="none" stroke="currentColor" opacity=".3"/>
      <path v-if="gap(n-1)&&!covered.includes(n-1)" d="m49 4-8 19 17 10-19 12 8 23m11-35 18 8m-35-18-15 5" stroke="#d7a476" stroke-width="3" fill="none"/>
      <path v-else d="M14 27h72M14 35h72M14 43h72" stroke="currentColor" opacity=".3"/>
      <circle v-for="(point,i) in [[12,12],[88,12],[12,60],[88,60]]" :key="i" :cx="point[0]" :cy="point[1]" r="3" fill="currentColor"/>
      <path v-if="covered.includes(n-1)" d="m36 37 10 9 20-22" stroke="#deefbc" stroke-width="4" fill="none"/>
     </svg><span>{{ String(n).padStart(2,'0') }}</span>
    </button>
   </div>
   <div class="stock"><button :disabled="paused||ready||testing" aria-label="Drag a spare shield plate" @pointerdown="grab"><svg viewBox="0 0 70 44" aria-hidden="true"><path d="M4 4h62v36H4Z" fill="#8ca49c" stroke="#c8d9c3"/><path d="M15 17h40M15 25h40" stroke="#3e625e"/></svg><span>SPARE PLATES</span></button><span>{{ 3-covered.length }} to fit</span></div>
   <div v-if="dragging" class="drag-plate" :style="{left:plate.x+'px',top:plate.y+'px'}">▤</div>
  </div>
  <div class="pressure"><span>{{ testing?'PRESSURE TEST':'HULL COVERAGE' }}</span><strong>{{ testing?Math.round(pressure*100)+'%':covered.length+' / 3 SEALED' }}</strong></div>
  <progress :value="testing?pressure:covered.length/3" max="1" aria-label="Shield repair progress"/>
  <p class="status" role="status">{{ paused?'Repair paused.':testing?'Checking the seals…':notice||'The amber cracks need a plate.' }}</p>
  <button class="confirm" :disabled="paused||sent||!ready||testing" @click="testing=true">{{ testing?'Testing seal…':'Test the repaired wall' }}</button>
  <small>Keyboard / tap: select a cracked section to fit a plate.</small>
 </section>
</template>
<style scoped>
.maintenance{padding:20px;color:#e7edde;background:linear-gradient(145deg,#263f41,#122b32);border:1px solid #688b83;border-radius:16px}.maintenance header{display:flex;justify-content:space-between;margin-right:32px;font:10px ui-monospace,monospace;color:#b4c9b2;letter-spacing:.08em}.maintenance h3{font-size:24px;letter-spacing:-.035em;margin:16px 0 8px;font-weight:600}.maintenance p{font-size:12px;line-height:1.6;color:#b9c9bf}.shield-scene{position:relative;background:#0b2129;border:1px solid #486a68;border-radius:10px;padding:16px;touch-action:none;overflow:hidden}.shield-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.shield-grid button{position:relative;padding:0;min-height:62px;background:linear-gradient(140deg,#42595c,#293f46);color:#74908c;border:1px solid #5e7876;border-radius:4px;cursor:pointer}.shield-grid svg{display:block;width:100%}.shield-grid button span{position:absolute;bottom:7px;right:7px;font:8px monospace}.shield-grid .gap{background:#292d2c;border:1px dashed #bd976a;color:#bd976a}.shield-grid .covered{background:linear-gradient(145deg,#7e9c8c,#46685d);border-color:#bfd4b3;color:#d2e2c3;animation:plate-seat .35s ease-out}.stock{display:flex;align-items:center;justify-content:space-between;margin-top:14px;font:10px monospace;color:#c6d4bb}.stock button{display:flex;align-items:center;gap:10px;padding:0;background:transparent;border:0;color:#d1dfc3;cursor:grab;font:9px monospace;touch-action:none}.stock svg{width:65px}.drag-plate{position:absolute;transform:translate(-50%,-50%) rotate(-5deg);width:88px;height:65px;border:2px solid #d1e3bf;box-shadow:0 8px 18px #0006;background:#708d7d;color:#d3e5c3;display:grid;place-items:center;font-size:36px;pointer-events:none}.pressure{display:flex;justify-content:space-between;margin:15px 0 8px;font:10px monospace;color:#c1d5c2}.maintenance progress{width:100%;height:7px;accent-color:#bdd79b}.maintenance .status{min-height:20px;color:#e1cea8}.maintenance button:focus-visible{outline:3px solid #ffdc98;outline-offset:3px}.maintenance button:disabled{cursor:default}.confirm{width:100%;min-height:44px;margin:0 0 12px;border:1px solid #c0d8a4;border-radius:8px;background:#c0d8a4;color:#233e36;font:600 13px system-ui;cursor:pointer}.confirm:disabled{opacity:.45}.maintenance small{display:block;font-size:10px;color:#9fb9a9}.paused *{animation-play-state:paused!important}@keyframes plate-seat{from{transform:scale(1.08);filter:brightness(1.6)}to{transform:scale(1);filter:brightness(1)}}@media(prefers-reduced-motion:reduce){.maintenance *{animation:none!important}}
</style>
