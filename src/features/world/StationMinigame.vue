<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { StationId } from '../../contracts';
import { advanceMiniGame, createMiniState, MINI_TARGETS, CIRCUIT_SYMBOLS, type MiniInput } from './minigame';
const props=defineProps<{station:StationId;title?:string;progress:number;paused:boolean}>();
const emit=defineEmits<{complete:[stage:number]}>();
const state=ref(createMiniState(props.progress));
const target=computed(()=>MINI_TARGETS[props.progress] ?? 0);
const research=computed(()=>props.station==='solar' && /science|survey|research/i.test(props.title??''));
const reinforcing=computed(()=>/shelter|reinforc/i.test(props.title??''));
const colors=['#ffcf6b','#7bdbff','#ef9fda'];
const symbols=['✦','●','▲'];
const dust=Array.from({length:24},(_,i)=>({x:25+(i%6)*61+(i%2)*9,y:32+Math.floor(i/6)*42,r:22+(i%3)*3}));
const cleaned=ref<number[]>([]);
const dragging=ref(false);
const cursor=ref({x:180,y:105});
const wiring=ref(false);
const working=ref(false);
let timer:ReturnType<typeof setTimeout>|undefined;
function stopWork(){clearTimeout(timer);timer=undefined;working.value=false;dragging.value=false;wiring.value=false;}
watch(()=>[props.station,props.title,props.progress],()=>{stopWork();state.value=createMiniState(props.progress);cleaned.value=[];});
watch(()=>props.paused,paused=>{if(paused)stopWork();});
onBeforeUnmount(stopWork);
function act(input:MiniInput){
 const before=state.value;state.value=advanceMiniGame(props.station,before,input,!props.paused);
 if(!before.complete&&state.value.complete)emit('complete',props.progress);
}
function point(event:PointerEvent){const rect=event.currentTarget instanceof Element?event.currentTarget.getBoundingClientRect():null;if(rect)cursor.value={x:Math.max(0,Math.min(360,(event.clientX-rect.left)/rect.width*360)),y:Math.max(0,Math.min(210,(event.clientY-rect.top)/rect.height*210))};}
function clean(){
 if(props.paused||state.value.complete)return;
 for(const [i,d] of dust.entries())if(!cleaned.value.includes(i)&&Math.hypot(d.x-cursor.value.x,d.y-cursor.value.y)<38)cleaned.value.push(i);
 const passes=Math.min(3,Math.floor(cleaned.value.length/8));
 while(state.value.taps<passes&&!state.value.complete)act({type:'tap',index:target.value});
}
function scrub(event:PointerEvent){point(event);if(dragging.value)clean();}
function startScrub(event:PointerEvent){if(props.paused)return;dragging.value=true;(event.currentTarget as Element).setPointerCapture(event.pointerId);scrub(event);}
function cleanPass(){if(props.paused||state.value.complete)return;for(let i=0,n=0;i<dust.length&&n<8;i++)if(!cleaned.value.includes(i)){cleaned.value.push(i);n++;}act({type:'tap',index:target.value});}
function source(event:PointerEvent,index:number){if(props.paused)return;act({type:'source',index});wiring.value=true;(event.currentTarget as Element).setPointerCapture(event.pointerId);}
function wireMove(event:PointerEvent){if(wiring.value)point(event);}
function wireEnd(event:PointerEvent){
 if(!wiring.value)return;wiring.value=false;
 const socket=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-socket]');
 if(socket)act({type:'socket',index:Number(socket.getAttribute('data-socket'))});
}
function water(){
 if(props.paused||working.value||state.value.complete||state.value.inspected!==target.value)return;
 working.value=true;timer=setTimeout(()=>{working.value=false;act({type:'care',index:0});},1400);
}
function scan(){
 if(props.paused||working.value||state.value.complete||state.value.selected!==props.progress)return;
 working.value=true;timer=setTimeout(()=>{working.value=false;act({type:'socket',index:props.progress});},1400);
}
const heading=computed(()=>research.value?'Martian sample lab':props.station==='solar'?'Restore battery power':props.station==='greenhouse'?'Bring the garden to life':reinforcing.value?'Seal the shelter lining':'Clear the air vents');
const instruction=computed(()=>research.value?'Move the lens over the sand. Pick the sparkling mineral, then scan it.':props.station==='solar'?`Drag the ${CIRCUIT_SYMBOLS[props.progress]} cable into its matching battery socket.`:props.station==='greenhouse'?'Select the thirsty plant, then pour water into its roots.':reinforcing.value?'Brush sealant across the damaged lining until every gap is covered.':'Drag your brush across the dusty vent. Clear the whole grille to restore airflow.');
const feedback=computed(()=>{
 if(research.value&&state.value.selected!==null)return state.value.selected===props.progress?'Crystal located. Ready for a mineral scan.':'That is a plain rock. Look for the sparkling crystal.';
 if(props.station==='habitat'&&cleaned.value.length)return reinforcing.value?'Keep covering the damaged lining.':'Fresh air is flowing. Brush away the remaining dust.';
 return state.value.feedback || 'Mouse, touch and keyboard supported.';
});
</script>
<template>
 <section class="mini" :class="{paused,working}" aria-label="Station minigame" :aria-busy="working">
  <header><span class="step">FIELDWORK / {{ String(progress+1).padStart(2,'0') }}</span><span class="steps" aria-label="Three work stages"><i v-for="i in 3" :key="i" :class="{done:i<=progress,active:i===progress+1}" /></span></header>
  <h3>{{ heading }}</h3><p class="instruction">{{ instruction }}</p>
  <template v-if="station==='habitat'">
   <div class="workbench scrub" :class="{sealing:reinforcing}" @pointerdown="startScrub" @pointermove="scrub" @pointerup="dragging=false" @pointercancel="dragging=false" @lostpointercapture="dragging=false">
    <svg viewBox="0 0 360 210" aria-hidden="true">
     <rect x="7" y="7" width="346" height="196" rx="20" fill="#132b38" stroke="#7293a0" stroke-width="5"/>
     <rect x="23" y="23" width="314" height="164" rx="9" fill="#081d29"/>
     <path v-for="i in 8" :key="i" :d="`M32 ${22+i*19}h296`" stroke="#698b97" stroke-width="8" stroke-linecap="round"/>
     <path v-for="i in 5" :key="'air'+i" class="air" :style="{'--delay':i*-.4+'s',opacity:cleaned.length/48}" :d="`M${40+i*48} 180q-20-40 0-75t0-70`" stroke="#a2f2e4" fill="none" stroke-width="3"/>
     <g v-for="(d,i) in dust" :key="i" class="dust" :class="{cleared:cleaned.includes(i)}"><circle :cx="d.x" :cy="d.y" :r="d.r" :fill="reinforcing?'#6b333d':'#b17c53'" opacity=".88"/><circle :cx="d.x+7" :cy="d.y-4" r="6" fill="#e6bb81" opacity=".7"/></g>
     <g :transform="`translate(${cursor.x},${cursor.y}) rotate(-25)`"><rect x="-8" y="-13" width="16" height="55" rx="6" fill="#ffd57f"/><rect x="-25" y="-23" width="50" height="23" rx="6" :fill="reinforcing?'#a5f0d4':'#7fd7f1'"/><path d="M-21-5v11m8-11v11m8-11v11m8-11v11m8-11v11m8-11v11" stroke="#e6fbf3" stroke-width="4"/></g>
    </svg><span class="bench-label">{{ reinforcing?'PRESSURE LINING':'LIFE SUPPORT · FILTER '+(progress+1) }}</span>
   </div>
   <div class="readout"><span>{{ reinforcing?'Coverage':'Dust removed' }}</span><strong>{{ Math.round(cleaned.length/24*100) }}%</strong></div><progress :value="cleaned.length" max="24" :aria-label="reinforcing?'Lining covered':'Vent cleaned'"/>
   <button class="assist" :disabled="paused||state.complete" @click="cleanPass">{{ reinforcing?'Apply a strip of sealant':'Brush one section' }} <span>↵ keyboard / tap</span></button>
  </template>
  <template v-else-if="research">
   <div class="workbench samples" @pointermove="point">
    <svg viewBox="0 0 360 210" aria-hidden="true"><defs><pattern id="sample-grains" width="19" height="17" patternUnits="userSpaceOnUse"><circle cx="4" cy="7" r="2" fill="#f4bc89"/><circle cx="14" cy="14" r="1.5" fill="#6e453c"/></pattern></defs><rect width="360" height="210" fill="#a76a4b"/><rect width="360" height="210" fill="url(#sample-grains)"/><g :transform="`translate(${cursor.x},${cursor.y})`"><circle r="45" fill="#b0edff" fill-opacity=".16" stroke="#c2f5ff" stroke-width="5"/><path d="m32 32 32 32" stroke="#ffd28c" stroke-width="13" stroke-linecap="round"/><path d="M-15 0h30M0-15v30" stroke="#e4fdff"/></g></svg>
    <button v-for="i in [0,1,2]" :key="i" class="mineral" :class="{sparkle:i===progress,chosen:state.selected===i}" :style="{left:(15+i*29)+'%',top:(i===1?58:26)+'%'}" :disabled="paused||working" :aria-label="`Inspect ${i===progress?'sparkling mineral':'plain rock'} ${i+1}`" @click="act({type:'source',index:i})">{{ i===progress?'✧':'⬡' }}</button>
    <div v-if="working" class="scan-line"/><span class="bench-label">SAMPLE {{ progress+1 }} · {{ ['BASALT','OLIVINE','IRON OXIDE'][progress] }}</span>
   </div>
   <button class="primary" :disabled="paused||working||state.selected!==progress" @click="scan">{{ working?'Scanning mineral…':'Scan selected mineral' }}</button>
   <div class="instrument"><span :class="{lit:working}">●</span> {{ working?'SPECTROMETER ACTIVE':'Find the crystal with a sparkling edge' }}</div>
  </template>
  <template v-else-if="station==='solar'">
   <div class="workbench wiring" @pointermove="wireMove" @pointerup="wireEnd" @pointercancel="wiring=false">
    <svg viewBox="0 0 360 210" aria-hidden="true"><rect x="207" y="16" width="139" height="178" rx="16" fill="#142d3e" stroke="#7795a5" stroke-width="3"/><rect x="251" y="7" width="48" height="12" rx="3" fill="#b7c9ce"/><text x="276" y="39" text-anchor="middle" fill="#b7dae6" font-size="10">ARES BATTERY</text><path v-for="i in [0,1,2]" :key="i" :d="`M48 ${55+i*55} C 105 ${55+i*55}, 110 ${55+i*55+27}, 151 ${55+i*55+20}`" :stroke="colors[i]" stroke-width="9" fill="none" stroke-linecap="round"/><path v-if="state.selected!==null" :d="`M48 ${55+state.selected*55} Q170 ${cursor.y+40} ${wiring?cursor.x:176} ${wiring?cursor.y:110}`" :stroke="colors[state.selected]" stroke-width="8" fill="none" stroke-linecap="round"/></svg>
    <button v-for="(symbol,i) in CIRCUIT_SYMBOLS" :key="symbol" class="plug" :class="{chosen:state.selected===i}" :style="{top:(16+i*26)+'%',borderColor:colors[i],color:colors[i]}" :aria-label="`${symbol} cable`" :disabled="paused||state.complete" @pointerdown="source($event,i)" @click="act({type:'source',index:i})">{{ symbols[i] }}</button>
    <button v-for="(symbol,i) in CIRCUIT_SYMBOLS" :key="'socket'+i" class="socket" :style="{top:(16+([1,2,0].indexOf(i))*26)+'%',color:colors[i]}" :data-socket="i" :disabled="paused||state.complete" :aria-label="`${symbol} battery socket`" @click="act({type:'socket',index:i})">{{ symbols[i] }}</button>
   </div><div class="instrument"><span class="lit">ϟ</span> CONNECT {{ CIRCUIT_SYMBOLS[progress]?.toUpperCase() }} → {{ CIRCUIT_SYMBOLS[progress]?.toUpperCase() }}</div>
   <p class="hint">Keyboard: choose a cable, then its matching socket.</p>
  </template>
  <template v-else>
   <div class="workbench garden" :class="{pouring:working}">
    <svg viewBox="0 0 360 210" aria-hidden="true"><path d="M0 191h360" stroke="#78adac" stroke-width="10"/><g v-for="i in [0,1,2]" :key="i" :transform="`translate(${64+i*116},0)`" :class="{thirsty:i===target,selected:state.inspected===i}"><path d="M0 160V85" stroke="#93d6a0" stroke-width="5"/><ellipse cx="-15" cy="107" rx="23" ry="11" :fill="i===target?'#c6bb6c':'#6be5a0'" :transform="i===target?'rotate(30 -15 107)':'rotate(-30 -15 107)'"/><ellipse cx="17" cy="126" rx="24" ry="10" :fill="i===target?'#c6bb6c':'#6be5a0'" transform="rotate(-20 17 126)"/><path d="M-34 154H34L25 189H-25Z" fill="#de906c"/><ellipse cy="156" rx="33" ry="8" fill="#51372c"/><text y="174" text-anchor="middle" fill="#fff3d3" font-size="12">{{ i+1 }}</text></g>
     <g v-if="working" :transform="`translate(${64+target*116},0)`"><g class="can"><path d="M-29 25h42v31h-42zM13 44l29 17 6-12-35-19M-29 27q-26-13-25 10t25 10" fill="#90dcf2" stroke="#d2f6ff" stroke-width="4"/></g><path class="water" d="M44 61q-11 28-28 45t-12 47M48 64q-3 29-17 51t-18 36" fill="none" stroke="#8ee7ff" stroke-width="5" stroke-dasharray="5 10"/><ellipse class="soak" cy="157" rx="30" ry="7" fill="#5aacc2"/></g>
    </svg>
    <button v-for="i in [0,1,2]" :key="i" class="plant-hit" :class="{chosen:state.inspected===i}" :style="{left:(3+i*32)+'%'}" :aria-label="`Inspect plant ${i+1}${i===target?' thirsty':''}`" :disabled="paused||working" @click="act({type:'leaf',index:i})"><span>{{ i===target?'◌ THIRSTY':'✓ HEALTHY' }}</span></button>
   </div>
   <button class="primary" :disabled="paused||working||state.inspected!==target" @click="water">{{ working?'Watering the roots…':'Pour water at the roots' }} <span>♧</span></button>
   <div class="instrument"><span class="lit">●</span> {{ working?'MOISTURE RISING':'Inspect the pale, drooping leaves' }}</div>
  </template>
  <p role="status" class="feedback">{{ paused?'Activity paused.':working?'Keep watching your work…':feedback }}</p>
 </section>
</template>
<style scoped>
.mini{padding:16px;border:1px solid #71999c;border-radius:18px;background:linear-gradient(145deg,#1b424c,#112b39);color:#f0fbf8;box-shadow:0 10px 30px #07172155;overflow:hidden}.mini header{display:flex;align-items:center;justify-content:space-between;gap:8px}.step{font-size:10px;letter-spacing:.13em;color:#94dfda;font-weight:800}.steps{display:flex;gap:5px}.steps i{height:5px;width:18px;border-radius:5px;background:#52717a}.steps .done{background:#91e6b8}.steps .active{background:#ffda8b;box-shadow:0 0 9px #ffda8b66}.mini h3{font-size:22px;line-height:1.15;margin:12px 0 8px;color:#ffe1a3;letter-spacing:-.02em}.instruction{font-size:12px;line-height:1.6;color:#d1e4e6;margin:0 0 14px}.workbench{position:relative;aspect-ratio:12/7;border:1px solid #6a8c99;border-radius:13px;overflow:hidden;background:#0a212e;isolation:isolate}.workbench svg{display:block;width:100%;height:100%}.scrub,.wiring{touch-action:none}.scrub{cursor:crosshair}.bench-label{position:absolute;bottom:8px;left:10px;padding:4px 7px;background:#0a1b28dd;border:1px solid #73949c66;border-radius:4px;font-size:8px;letter-spacing:.1em;color:#b9dde1;pointer-events:none}.dust{transition:opacity .25s,transform .3s;transform-box:fill-box;transform-origin:center}.dust.cleared{opacity:0;transform:scale(.35) translateY(-12px)}.air{stroke-dasharray:10 16;animation:air 2s linear infinite;animation-delay:var(--delay)}.readout{display:flex;justify-content:space-between;font-size:11px;color:#c5e7e2;margin:12px 0 6px}.readout strong{color:#ffde94}.mini progress{width:100%;height:8px;accent-color:#8be5ba;display:block;margin-bottom:10px}.mini button{font-family:inherit;cursor:pointer;color:#eafaf4;border:1px solid #7399a4;border-radius:9px;background:#284a59;min-height:42px;margin:0;font-size:12px;font-weight:700;transition:background .15s,box-shadow .15s,transform .15s}.mini button:hover:not(:disabled){background:#3a6570;box-shadow:0 0 12px #a2eddd33}.mini button:focus-visible{outline:3px solid #ffdd8e;outline-offset:2px}.mini button:disabled{opacity:.5;cursor:default}.mini .primary{display:flex;justify-content:space-between;align-items:center;width:100%;padding:12px 14px;margin-top:12px;background:#9ce5c8;color:#133b3d;border-color:#d4f9e8;box-shadow:0 3px 0 #4f9c90}.mini .primary:hover:not(:disabled){background:#b8f6db}.mini .assist{width:100%;padding:10px;display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:11px}.assist span{font-size:9px;color:#bed5d9}.feedback{font-size:11px;line-height:1.5;margin:12px 0 0;min-height:17px;color:#bddbdc}.instrument{margin-top:12px;padding:9px 10px;border-radius:7px;background:#081d29;color:#bad8df;font:9px/1.5 ui-monospace,monospace;letter-spacing:.04em}.instrument span{margin-right:5px}.lit{color:#9cedbc;text-shadow:0 0 8px #70f0b4}.hint{font-size:10px;color:#afcfd6;margin-bottom:0}.wiring{background:radial-gradient(ellipse at top,#254759,#091d29)}.mini .plug,.mini .socket{position:absolute;width:44px;height:44px;min-height:44px;padding:0;font-size:24px;border-width:3px;background:#142c39;touch-action:none}.mini .plug{left:7%;border-radius:12px 7px 7px 12px}.mini .socket{right:12%;border-radius:50%;border-style:dashed}.mini .chosen{box-shadow:0 0 0 3px #ffe3a7,0 0 18px #ffda7e44}.garden{background:radial-gradient(ellipse at top,#397064,#102e36)}.mini .plant-hit{position:absolute;top:33%;bottom:10%;width:29%;height:auto;background:transparent;border:2px solid transparent;border-radius:15px}.mini .plant-hit:hover:not(:disabled){background:#bdf4d311}.plant-hit span{position:absolute;top:-22px;left:0;right:0;font-size:8px;color:#f6e9ae;white-space:nowrap}.mini .plant-hit.chosen{border-color:#ffe3a7;box-shadow:none}.can{animation:pour 1.4s ease-in-out}.water{animation:flow .35s linear infinite}.soak{animation:soak 1.4s ease-out}.samples svg{pointer-events:none}.mini .mineral{position:absolute;min-height:44px;width:44px;border:0;color:#e4bea0;font-size:34px;padding:0;line-height:1;background:#664b3e;border-radius:35% 50% 30% 45%}.mini .mineral.sparkle{color:#fff3b5;background:#bd8160;text-shadow:0 0 12px #fff5a6;animation:sparkle 2s ease-in-out infinite}.scan-line{position:absolute;inset:0;background:linear-gradient(transparent 45%,#a2f6e133 49%,#caffeb 50%,transparent 53%);animation:scan 1.4s linear;pointer-events:none}.paused *{animation-play-state:paused!important}@keyframes air{to{stroke-dashoffset:52}}@keyframes flow{to{stroke-dashoffset:-30}}@keyframes pour{0%,100%{transform:rotate(-12deg)}20%,85%{transform:rotate(8deg)}}@keyframes soak{from{opacity:0;transform:scaleX(.1)}to{opacity:.8;transform:scaleX(1)}}@keyframes sparkle{50%{filter:brightness(1.25);box-shadow:0 0 18px #ffe6a366}}@keyframes scan{from{transform:translateY(-90%)}to{transform:translateY(90%)}}@media(max-width:400px){.mini{padding:12px}.mini h3{font-size:20px}.mini .plug,.mini .socket{width:42px;height:42px;min-height:42px;font-size:21px}.instruction{font-size:11px}.assist span{font-size:8px}}@media(prefers-reduced-motion:reduce){.mini *{animation:none!important;transition:none!important}}
</style>
