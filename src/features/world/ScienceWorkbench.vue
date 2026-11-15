<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { AIR_SAMPLE, MOLECULES, TERRAIN_TARGETS, STAR_TARGETS, exposeTarget, sortMolecule } from './science-work';
const props=defineProps<{stage:number;paused:boolean}>();
const emit=defineEmits<{complete:[stage:number]}>();
const exposure=ref([0,0,0]),sorted=ref<readonly number[]>([]),selected=ref<number|null>(null),held=ref(false),sent=ref(false),celebration=ref(0),notice=ref('');
const cursor=ref({x:180,y:80}),focusIndex=ref(0),dragging=ref(false);
const targets=computed(()=>props.stage===2?STAR_TARGETS:TERRAIN_TARGETS);
const complete=computed(()=>props.stage===1?sorted.value.length===AIR_SAMPLE.length:exposure.value.every(n=>n>=1));
const amount=computed(()=>props.stage===1?sorted.value.length/6:exposure.value.reduce((a,b)=>a+b,0)/3);
const titles=['Read the landscape.','What’s in the air?','Find a path through the stars.'];
const tips=['Move the probe onto each marked site. Hold to scan its surface.','Drag each molecule into its matching detector. Or tap both ends.','Move the telescope reticle over each bright star. Hold still to expose.'];
const backgroundStars=Array.from({length:65},(_,i)=>({x:(i*137.51)%360,y:(i*53.3)%240,r:i%9===0?1.4:.6}));
watch(()=>props.stage,()=>{exposure.value=[0,0,0];sorted.value=[];selected.value=null;held.value=false;sent.value=false;celebration.value=0;notice.value='';});
watch(()=>props.paused,()=>{held.value=false;dragging.value=false;});
function point(e:PointerEvent){const r=(e.currentTarget as Element).getBoundingClientRect();cursor.value={x:(e.clientX-r.left)/r.width*360,y:(e.clientY-r.top)/r.height*260};}
function start(e:PointerEvent){if(props.paused||complete.value||props.stage===1)return;(e.currentTarget as HTMLElement).focus();(e.currentTarget as Element).setPointerCapture(e.pointerId);held.value=true;point(e);}
function keys(e:KeyboardEvent){if(!['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)||props.stage===1)return;e.preventDefault();if(props.paused||complete.value)return;if(e.key.startsWith('Arrow'))focusIndex.value=(focusIndex.value+(e.key==='ArrowLeft'?2:1))%3;else held.value=true;cursor.value={...targets.value[focusIndex.value]};}
function choose(i:number){if(props.paused||sent.value||sorted.value.includes(i))return;selected.value=i;notice.value='Match the molecule label and shape.';}
function grab(e:PointerEvent,i:number){if(props.paused||sorted.value.includes(i))return;choose(i);dragging.value=true;(e.currentTarget as Element).setPointerCapture(e.pointerId);}
function deposit(bin:number){if(props.paused||selected.value===null||sent.value)return;const next=sortMolecule(sorted.value,selected.value,bin);notice.value=next===sorted.value?'Different molecule. Try another detector.':'Sample captured.';if(next!==sorted.value){sorted.value=next;selected.value=null;}}
function drop(e:PointerEvent){held.value=false;if(!dragging.value)return;dragging.value=false;const bin=Array.from((e.currentTarget as Element).querySelectorAll<HTMLElement>('[data-bin]')).find(n=>{const r=n.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});if(bin)deposit(Number(bin.dataset.bin));}
let previous=performance.now();const timer=setInterval(()=>{
 const now=performance.now(),dt=Math.min(.1,(now-previous)/1000);previous=now;
 if(props.paused||document.hidden||sent.value){held.value=false;return;}
 if(props.stage!==1)exposure.value=exposeTarget(exposure.value,targets.value,cursor.value.x,cursor.value.y,dt,held.value);
 if(complete.value){celebration.value+=dt;if(celebration.value>.75){sent.value=true;emit('complete',props.stage);}}
},33);
onBeforeUnmount(()=>clearInterval(timer));
</script>
<template>
 <section class="science-work" :class="{paused}" aria-label="Visual science workbench">
  <header><span>ARES / SCIENCE FIELD LAB</span><span>{{ stage+1 }} OF 3</span></header>
  <h3>{{ titles[stage] }}</h3><p>{{ tips[stage] }}</p>
  <div class="science-scene" :class="{night:stage===2}" tabindex="0" role="group" :aria-label="stage===1?'Air sample sorting board':'Scanner. Left and right select a target. Hold Space to observe.'" @pointerdown="start" @pointermove="point" @pointerup="drop" @pointercancel="held=false;dragging=false" @lostpointercapture="held=false" @keydown="keys" @keyup.space.prevent="held=false" @keyup.enter.prevent="held=false" @blur="held=false">
   <svg viewBox="0 0 360 260" aria-hidden="true">
    <defs><radialGradient id="science-sky"><stop stop-color="#224558"/><stop offset="1" stop-color="#06121f"/></radialGradient></defs>
    <template v-if="stage===0">
     <rect width="360" height="260" fill="#ba896a"/><path d="M0 90 48 58 88 83 129 49 175 82 237 41 289 78 327 56 360 73V0H0Z" fill="#795e52"/>
     <path d="M0 159Q65 97 141 134T360 115V260H0Z" fill="#aa765a"/><path d="M0 225Q80 174 177 207T360 194V260H0Z" fill="#cc9d72"/>
     <path v-for="i in 14" :key="i" :d="`M${(i*71)%350} ${100+(i*31)%136}l${8+i%5} -4 8 6-13 3Z`" fill="#715a4b" opacity=".7"/>
     <g v-for="(p,i) in TERRAIN_TARGETS" :key="i"><circle :cx="p.x" :cy="p.y" r="23" fill="#172c35" fill-opacity=".12" :stroke="exposure[i]>=1?'#bce7ba':'#ffe2a2'" stroke-dasharray="4 5"/><circle :cx="p.x" :cy="p.y" r="16" fill="none" stroke="#c7efdf" stroke-width="4" :stroke-dasharray="`${exposure[i]*101} 101`" transform-origin="center"/><text :x="p.x" :y="p.y+4" text-anchor="middle" fill="#fff1cd" font-size="11">{{ exposure[i]>=1?'✓':i+1 }}</text></g>
     <g :transform="`translate(${cursor.x} ${cursor.y})`"><circle r="29" fill="#9ce0ed" fill-opacity=".15" stroke="#dcf4e7" stroke-width="2"/><path d="m20 20 20 20" stroke="#324d58" stroke-width="10"/><path d="M-9 0H9M0-9V9" stroke="#edf8d9"/></g>
    </template>
    <template v-else-if="stage===1">
     <rect width="360" height="260" fill="#0b2633"/><rect x="15" y="16" width="330" height="155" rx="24" fill="#294b58" stroke="#799c9d"/><path d="M20 94h320M180 20v146" stroke="#a3ccc1" opacity=".1"/><text x="180" y="38" text-anchor="middle" font-size="9" fill="#aac9c8">SEALED AIR SAMPLE · MOLECULE VIEW</text>
     <g v-for="i in 3" :key="i"><path :d="`M${60+(i-1)*120} 174v24`" stroke="#85b8c3" stroke-width="3"/><rect :x="20+(i-1)*120" y="194" width="80" height="52" rx="8" fill="#203d4a" stroke="#7ea69e"/></g>
    </template>
    <template v-else>
     <rect width="360" height="260" fill="url(#science-sky)"/><circle v-for="(p,i) in backgroundStars" :key="i" :cx="p.x" :cy="p.y" :r="p.r" fill="#c2d9e2" opacity=".55"/>
     <circle cx="180" cy="130" r="115" fill="none" stroke="#426675" stroke-width="2"/><path d="M180 5v250M56 130h248" stroke="#6c98a1" opacity=".15"/>
     <path v-if="exposure[0]>=1&&exposure[1]>=1" d="M65 74 184 143" class="constellation"/><path v-if="exposure[1]>=1&&exposure[2]>=1" d="m184 143 109-73" class="constellation"/>
     <g v-for="(p,i) in STAR_TARGETS" :key="i"><circle :cx="p.x" :cy="p.y" r="19" fill="#b9dded" :opacity=".04+exposure[i]*.2"/><path :d="`M${p.x-6} ${p.y}h12M${p.x} ${p.y-6}v12`" stroke="#eff5dc" stroke-width="2"/><circle :cx="p.x" :cy="p.y" r="22" fill="none" stroke="#c0d6c1" :stroke-dasharray="`${exposure[i]*139} 139`"/><text :x="p.x+12" :y="p.y-12" fill="#b0c7c5" font-size="9">{{ i+1 }}</text></g>
     <g :transform="`translate(${cursor.x} ${cursor.y})`"><circle r="31" fill="none" stroke="#f4cf88"/><path d="M-39 0h16m46 0h16M0-39v16m0 46v16" stroke="#f4cf88"/></g>
     <text x="180" y="245" text-anchor="middle" fill="#85aaa9" font-size="8">TELESCOPE · LONG EXPOSURE</text>
    </template>
    <path v-if="held&&stage!==1" class="scan-sweep" d="M0 0H360V8H0Z" fill="#d4f7df" opacity=".13"/>
   </svg>
   <template v-if="stage===1">
    <button v-for="(kind,i) in AIR_SAMPLE" :key="i" class="molecule" :class="{chosen:selected===i,captured:sorted.includes(i)}" :style="{left:(9+(i%3)*30)+'%',top:(20+Math.floor(i/3)*26)+'%'}" :aria-label="`${MOLECULES[kind]} molecule ${i+1}`" :disabled="paused||sorted.includes(i)" @pointerdown.stop="grab($event,i)" @click="choose(i)"><span class="atoms" :class="'atom-'+kind"><i/><i/><i v-if="kind===0"/></span>{{ MOLECULES[kind] }}</button>
    <button v-for="(name,i) in MOLECULES" :key="name" class="detector" :style="{left:(4+i*33.3)+'%'}" :data-bin="i" :disabled="paused" :aria-label="`${name} detector`" @click="deposit(i)">{{ name }}<small>{{ sorted.filter(n=>AIR_SAMPLE[n]===i).length }} captured</small></button>
    <div v-if="dragging&&selected!==null" class="drag-atom" :style="{left:cursor.x/3.6+'%',top:cursor.y/2.6+'%'}">{{ MOLECULES[AIR_SAMPLE[selected]] }}</div>
   </template>
  </div>
  <div class="readout"><span>{{ stage===0?'SURFACE SITES':stage===1?'MOLECULES SORTED':'EXPOSURES RECORDED' }}</span><strong>{{ Math.round(amount*100) }}%</strong></div><progress :value="amount" max="1" aria-label="Science observation progress"/>
  <p class="feedback" role="status">{{ paused?'Science paused.':complete?['Three sites sampled. Compare before drawing a conclusion.','Labels identify molecule types; this is not their atmospheric ratio.','Star pattern mapped. A longer exposure gathers more light.'][stage]:notice|| (stage===1?'Match the shape and label on each detector.':'Aim at a numbered target and hold to gather a reading.') }}</p>
  <small>{{ stage===1?'Tap a molecule, then its detector.':'Keyboard: focus the view, ← → selects targets; hold Space.' }}<br>Practice data & authored sky pattern · not live measurements.</small>
 </section>
</template>
<style scoped>
.science-work{padding:20px;background:linear-gradient(145deg,#203e48,#102631);border:1px solid #6d9593;border-radius:16px;color:#e6f0de}.science-work header{display:flex;justify-content:space-between;margin-right:30px;font:9px ui-monospace,monospace;letter-spacing:.09em;color:#9fc7bb}.science-work h3{font:600 23px/1.2 system-ui;letter-spacing:-.035em;margin:16px 0 8px}.science-work p{font-size:12px;line-height:1.6;color:#bad0c7}.science-scene{position:relative;touch-action:none;border:1px solid #6a9292;border-radius:10px;overflow:hidden;cursor:crosshair;user-select:none}.science-scene:focus-visible{outline:3px solid #ffdda1;outline-offset:3px}.science-scene svg{display:block;width:100%;height:auto}.science-work button{font-family:inherit;cursor:pointer;min-height:44px}.science-work button:focus-visible{outline:3px solid #ffdda1;outline-offset:2px}.molecule{position:absolute;width:24%;height:24%;padding:2px;border:1px solid transparent;border-radius:12px;background:transparent;color:#edf2e0;font:10px monospace;touch-action:none}.molecule.chosen{border-color:#ffdda1;background:#ffffff0a}.molecule.captured{opacity:.15;transform:scale(.7);transition:transform .3s,opacity .3s}.atoms{display:flex;justify-content:center;align-items:center;margin-bottom:4px}.atoms i{width:14px;height:14px;border-radius:50%;background:#9fd9d5;box-shadow:inset -3px -3px 0 #0003}.atom-0 i:first-child,.atom-0 i:last-child{background:#e99e7e}.atom-1 i{background:#e99e7e}.atom-2 i{background:#acb7e6}.science-work .detector{position:absolute;top:75%;width:25%;height:20%;background:transparent;border:0;color:#e4edce;font:700 13px monospace}.detector small{display:block;font-size:8px;color:#a8c9c4}.drag-atom{position:absolute;transform:translate(-50%,-50%);padding:9px;border:1px solid #f9d49e;background:#315966;border-radius:20px;color:#fff1d0;pointer-events:none;font-size:12px}.readout{display:flex;justify-content:space-between;margin:15px 0 8px;font:9px ui-monospace,monospace;letter-spacing:.08em}.readout strong{color:#d5e9ae}.science-work progress{width:100%;height:7px;accent-color:#badb9c}.science-work .feedback{min-height:38px;color:#e0d4ad}.science-work small{font-size:9px;line-height:1.7;color:#99b8ae}.constellation{stroke:#b9e7d7;stroke-width:2;fill:none;stroke-dasharray:6 3;animation:connect 3s linear infinite}.scan-sweep{animation:sweep 1.3s linear infinite}.paused *{animation-play-state:paused!important}@keyframes sweep{to{transform:translateY(260px)}}@keyframes connect{to{stroke-dashoffset:-27}}@media(prefers-reduced-motion:reduce){.science-work *{animation:none!important;transition:none!important}}@media(max-width:400px){.science-work{padding:14px}.science-work h3{font-size:21px}}
</style>
