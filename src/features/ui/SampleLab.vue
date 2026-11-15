<script setup lang="ts">
import {ref,onMounted} from 'vue';
import {SURVEY_SITES} from '../../contracts/survey';
import type {FieldSample} from '../../contracts/exploration';
const props=defineProps<{sample:FieldSample;paused:boolean}>();const emit=defineEmits<{check:[control:string];close:[];pause:[]}>();
let seed=7193+(SURVEY_SITES.findIndex(site=>site.id===props.sample.surveySite)+1)*893;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const grains=Array.from({length:70},(_,i)=>({i,x:15+random()*370,y:15+random()*210,rx:2+random()*5,ry:1.5+random()*3,angle:random()*180}));
const focus=ref(20),message=ref(''),panel=ref<HTMLElement>();
onMounted(()=>panel.value?.focus());
function key(e:KeyboardEvent){if(e.code==='KeyP'&&!e.repeat){e.preventDefault();emit('pause');return;}if(e.key==='Escape'){e.preventDefault();emit('close');}if(e.key==='Tab'){const list=[...panel.value!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')];const first=list[0],last=list.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.value)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}
function choose(fine:boolean){if(!fine){message.value='Look at the scale: these grains are small and loose. Try again.';return;}message.value='';emit('check','fine-grains');}
</script>
<template>
 <div class="lab-backdrop" @keydown.stop="key"><section ref="panel" class="sample-lab" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="sample-title">
  <header><span>ARES · SAMPLE LAB<span v-if="sample.surveySite"> · {{ SURVEY_SITES.find(s=>s.id===sample.surveySite)?.sample }}</span></span><button aria-label="Close microscope" @click="emit('close')">✕</button></header>
  <h2 id="sample-title">{{ ['Focus the microscope','Describe what you see','Save the observation'][sample.researchStep] }}</h2>
  <div class="instrument" :class="{captured:sample.researchStep>0}">
   <svg viewBox="0 0 400 240" role="img" aria-label="Practice microscope view of small loose grains">
    <defs><filter id="sample-focus"><feGaussianBlur :stdDeviation="sample.researchStep>0?0:Math.abs(focus-62)/8"/></filter><radialGradient id="sample-light"><stop stop-color="#e8c798"/><stop offset="1" stop-color="#6b452f"/></radialGradient></defs>
    <rect width="400" height="240" fill="url(#sample-light)"/>
    <g filter="url(#sample-focus)"><ellipse v-for="g in grains" :key="g.i" :cx="g.x" :cy="g.y" :rx="g.rx" :ry="g.ry" :fill="g.i%3?'#dfb16c':'#654a36'" stroke="#725134" stroke-width=".4" :transform="`rotate(${g.angle} ${g.x} ${g.y})`"/></g>
    <path d="M170 120h60m-30-30v60" stroke="#edf8e9" stroke-opacity=".55" fill="none"/><path d="M280 211h85m-85-5v10m85-10v10" stroke="#fff5d7" stroke-width="3"/>
   </svg>
   <span>{{ sample.researchStep?'IMAGE CAPTURED':'OPTICAL FOCUS' }}</span>
  </div>
  <template v-if="sample.researchStep===0"><label>Focus wheel<input v-model.number="focus" type="range" min="0" max="100" :disabled="paused" aria-label="Microscope focus"/></label><p>{{ Math.abs(focus-62)<8?'Sharp image ✓':'Turn the wheel until the grains look sharp.' }}</p><button class="primary" :disabled="paused||sample.elapsed<2||Math.abs(focus-62)>=8" @click="emit('check','image')">Capture image</button></template>
  <template v-else-if="sample.researchStep===1"><div class="choices"><button :disabled="paused||sample.elapsed<4" @click="choose(true)">Small, loose grains</button><button :disabled="paused||sample.elapsed<4" @click="choose(false)">Large, solid pebbles</button></div><p role="status">{{ message }}</p></template>
  <template v-else><p>Small, loose grains observed. An image alone cannot identify their chemical composition.</p><button class="primary" :disabled="paused||sample.elapsed<6" @click="emit('check','record')">Save field note · +2 science</button></template>
  <footer><small>Illustrated practice sample · not a NASA measurement</small><button @click="emit('pause')">{{ paused?'Resume':'Pause' }}</button></footer>
 </section></div>
</template>
<style scoped>
.lab-backdrop{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:#06141bbd;padding:16px}.sample-lab{width:min(560px,100%);box-sizing:border-box;max-height:calc(100dvh - 32px);overflow:auto;padding:24px;background:linear-gradient(140deg,#1e424c,#102530);border:1px solid #9bbfb4;border-radius:20px;color:#eaf8e9;box-shadow:0 24px 80px #0009;font-family:system-ui}.sample-lab h2{font-size:25px;margin:16px 0}.sample-lab header,.sample-lab footer{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;color:#b8d5cc}.instrument{border:8px solid #334e55;border-radius:50%;overflow:hidden;aspect-ratio:5/3;position:relative;box-shadow:inset 0 0 30px #0009,0 0 0 2px #799e9b}.instrument svg{width:100%;height:100%;display:block}.instrument span{position:absolute;top:12px;left:50%;transform:translateX(-50%);color:white;font:9px monospace;background:#152b2c9c;padding:4px 8px;white-space:nowrap}label{display:grid;gap:7px;margin-top:18px;font-size:12px}input{width:100%;accent-color:#eec185;min-height:36px}p{font-size:13px;line-height:1.6;min-height:20px}button{min-height:44px;padding:9px 16px;border:1px solid #8caeaa;border-radius:9px;background:#2c5157;color:#f6f9ec;cursor:pointer;font-weight:700}.primary{width:100%;background:#ebcd92;color:#183a41}.choices{display:flex;gap:10px;margin-top:18px}.choices button{flex:1}button:disabled{opacity:.45}button:focus-visible,input:focus-visible{outline:3px solid #ffe2a5;outline-offset:3px}footer{margin-top:18px}footer small{max-width:70%;font-size:10px}@media(max-width:500px){.sample-lab{padding:16px}.sample-lab h2{font-size:21px}}
</style>
