<script setup lang="ts">
import {ref,watch} from 'vue';
const props=defineProps<{stage:number;paused:boolean}>();
const emit=defineEmits<{complete:[stage:number]}>();
const isolated=ref(false),unplugged=ref<number[]>([]),selected=ref(false),linked=ref<number[]>([]),placed=ref(false);
watch(()=>props.stage,()=>{isolated.value=false;unplugged.value=[];selected.value=false;linked.value=[];placed.value=false;});
function unplug(i:number){if(!props.paused&&isolated.value&&!unplugged.value.includes(i))unplugged.value.push(i);}
function remove(){if(!props.paused&&unplugged.value.length===2)emit('complete',0);}
function fit(){if(!props.paused&&selected.value&&!placed.value){placed.value=true;emit('complete',1);}}
function connect(i:number){if(!props.paused&&!linked.value.includes(i))linked.value.push(i);}
function drop(e:PointerEvent){if(!selected.value||props.paused||props.stage!==1)return;const slot=(e.currentTarget as Element).querySelector('[data-battery-slot]')!.getBoundingClientRect();if(e.clientX>=slot.left&&e.clientX<=slot.right&&e.clientY>=slot.top&&e.clientY<=slot.bottom)fit();}
</script>
<template>
 <section class="battery-job" :class="{paused}" aria-label="Battery repair">
  <header><span>POWER / {{ stage+1 }} OF 3</span><span>● TRAINING RACK</span></header>
  <h3>{{ ['Disconnect the worn battery','Fit a fresh battery','Bring the lights back'][stage] }}</h3>
  <p>{{ stage===0?'Switch off. Unplug both leads. Remove the battery.':stage===1?'Drag the spare into the rack, or select it and tap the slot.':'Connect both leads, then test the feed.' }}</p>
  <div class="rack" :class="{isolated,selected}" @pointerup="drop">
   <svg viewBox="0 0 400 240" aria-hidden="true">
    <defs><linearGradient id="battery-case" x2="1" y2="1"><stop stop-color="#6a8f9b"/><stop offset="1" stop-color="#233f50"/></linearGradient></defs>
    <rect x="135" y="24" width="180" height="198" rx="16" fill="#13252e" stroke="#89b5bf" stroke-width="5"/>
    <path d="M153 45h144M153 196h144" stroke="#688c98" stroke-width="8"/>
    <g v-if="stage!==1" class="cell"><rect x="166" y="59" width="118" height="127" rx="12" fill="url(#battery-case)" stroke="#c5e0df" stroke-width="2"/><rect x="201" y="43" width="48" height="16" rx="3" fill="#d0d9c8"/><path d="M230 80l-29 44h24l-7 40 35-53h-26z" :fill="stage===0?'#f3ac82':'#9be8c4'"/><path v-if="stage===0" d="M184 168l18-17 14 7" stroke="#f0b188" stroke-width="4" fill="none"/></g>
    <g v-if="stage===1" class="spare" :class="{lifted:selected}"><rect x="24" y="103" width="72" height="97" rx="9" fill="url(#battery-case)" stroke="#b9eed5" stroke-width="3"/><rect x="45" y="91" width="30" height="13" rx="3" fill="#d0d9c8"/><path d="M65 120l-22 32h18l-7 29 26-39H61z" fill="#9be8c4"/></g>
    <path v-for="i in [0,1]" :key="i" :d="`M360 ${84+i*70}Q330 ${70+i*70} ${stage===0&&unplugged.includes(i)?330:300} ${stage===0&&unplugged.includes(i)?112+i*70:84+i*70}`" :stroke="i?'#8ad6f2':'#f1b17f'" fill="none" stroke-width="9" stroke-linecap="round" :class="{live:stage===2&&linked.includes(i)}"/>
    <g v-if="stage===2&&linked.length===2" class="power-flow"><path d="M170 203h109" stroke="#a4f5c4" stroke-width="5" stroke-dasharray="8 8"/></g>
   </svg>
   <template v-if="stage===0"><button class="isolate" :aria-pressed="isolated" :disabled="paused||isolated" @click="isolated=true">{{ isolated?'OFF ✓':'Switch OFF' }}</button><button v-for="i in [0,1]" :key="i" class="lead" :style="{top:(27+i*29)+'%'}" :disabled="paused||!isolated||unplugged.includes(i)" @click="unplug(i)">{{ unplugged.includes(i)?'✓':'Unplug '+(i===0?'+':'−') }}</button></template>
   <template v-else-if="stage===1"><button class="spare-hit" :aria-pressed="selected" aria-label="Pick up replacement battery" :disabled="paused" @pointerdown="selected=true" @click="selected=true">{{ selected?'SELECTED':'SPARE' }}</button><button data-battery-slot class="slot" :disabled="paused||!selected" @click="fit">{{ selected?'Fit battery ↓':'EMPTY SLOT' }}</button></template>
   <template v-else><button v-for="i in [0,1]" :key="i" class="lead" :style="{top:(27+i*29)+'%'}" :disabled="paused||linked.includes(i)" @click="connect(i)">{{ linked.includes(i)?'✓':'Connect '+(i===0?'+':'−') }}</button></template>
  </div>
  <button v-if="stage===0" class="primary" :disabled="paused||unplugged.length!==2" @click="remove">Remove worn battery</button>
  <button v-else-if="stage===2" class="primary" :disabled="paused||linked.length!==2" @click="emit('complete',2)">Test power feed ϟ</button>
  <p class="status" role="status">{{ paused?'Paused':stage===0?(isolated?'Power isolated · safe to unplug':'Isolate power first'):stage===1?(selected?'Place the spare in the slot.':'Choose the fresh battery.'):linked.length===2?'Both leads connected · ready to test':`${linked.length}/2 connected` }}</p>
 </section>
</template>
<style scoped>
.battery-job{padding:18px;border:1px solid #70b6c8;border-radius:18px;background:linear-gradient(145deg,#1b424e,#102738);color:#edfff7}header{display:flex;justify-content:space-between;gap:12px;color:#a5dddf;font-size:9px;letter-spacing:.08em}h3{font-size:23px;color:#ffe0a1;margin:15px 0 8px}p{font-size:12px;line-height:1.6}.rack{position:relative;aspect-ratio:5/3;border:1px solid #547b88;border-radius:12px;background:radial-gradient(at top,#284e5f,#0b202b);touch-action:none;overflow:hidden}.rack svg{display:block;width:100%;height:100%;pointer-events:none}button{min-height:44px;border:1px solid #8abdc7;border-radius:9px;background:#285466;color:#f4fff7;font:700 12px var(--font-body,system-ui);cursor:pointer}button:disabled{opacity:.5}button:focus-visible{outline:3px solid #ffda8c;outline-offset:2px}.isolate{position:absolute;left:3%;top:8%;width:27%;font-size:10px}.lead{position:absolute;right:1%;width:26%;font-size:10px}.primary{width:100%;margin-top:13px;background:#9be9c5;color:#163c3f}.slot{position:absolute;left:41%;top:25%;width:30%;height:53%;background:#15363f77;border:2px dashed #9cdbd9}.spare-hit{position:absolute;left:4%;top:38%;width:23%;height:48%;background:transparent;display:flex;align-items:flex-end;justify-content:center;padding-bottom:5px;font-size:9px}.spare{transform-origin:60px 145px;transition:transform .25s}.lifted{transform:translateY(-10px) rotate(-6deg)}.live{filter:drop-shadow(0 0 5px #94f3c3)}.power-flow{animation:feed .8s linear infinite}.status{min-height:20px;color:#b9d8db;margin:12px 0 0}.paused *{animation-play-state:paused!important}@keyframes feed{to{stroke-dashoffset:-32}}@media(max-width:400px){.battery-job{padding:12px}h3{font-size:20px}.lead{font-size:9px}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
