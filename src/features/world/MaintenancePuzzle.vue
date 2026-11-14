<script setup lang="ts">
import {ref,computed,watch} from 'vue';
import {EXPOSED_PANELS,CROP_TARGETS,placeShield,cropBalanced} from './maintenance';
const props=defineProps<{kind:'shield'|'crops';stage:number;paused:boolean}>();
const emit=defineEmits<{complete:[stage:number]}>();
const covered=ref<readonly number[]>([]),water=ref(0),light=ref(0),sent=ref(false),notice=ref('');
const ready=computed(()=>props.kind==='shield'?covered.value.length===3:cropBalanced(props.stage,water.value,light.value));
const target=computed(()=>CROP_TARGETS[props.stage]??CROP_TARGETS[0]);
watch(()=>[props.stage,props.kind],()=>{covered.value=[];water.value=0;light.value=0;sent.value=false;notice.value='';});
function place(n:number){if(props.paused||sent.value)return;const next=placeShield(props.stage,covered.value,n);notice.value=next===covered.value?'Cover a marked gap.':'Shield panel fitted.';covered.value=next;}
function confirm(){if(props.paused||sent.value||!ready.value)return;sent.value=true;emit('complete',props.stage);}
</script>
<template>
 <section class="maintenance" aria-label="Maintenance puzzle">
  <header><span>{{ kind==='shield'?'SHELTER WALL':'CROP CONTROLS' }}</span><span>{{ stage+1 }} / 3</span></header>
  <h3>{{ kind==='shield'?'Close the shield gaps':'Balance water and light' }}</h3>
  <p>{{ kind==='shield'?'Fit solid panels over the three marked gaps.':'Match the plant’s water and light targets.' }}</p>
  <div v-if="kind==='shield'" class="shield-grid">
   <button v-for="n in 9" :key="n" :class="{gap:EXPOSED_PANELS[stage]?.includes(n-1 as never),covered:covered.includes(n-1)}" :disabled="paused||sent||covered.includes(n-1)" :aria-label="`Panel ${n}: ${covered.includes(n-1)?'covered':EXPOSED_PANELS[stage]?.includes(n-1 as never)?'gap':'solid'}`" @click="place(n-1)">{{ covered.includes(n-1)?'▰':EXPOSED_PANELS[stage]?.includes(n-1 as never)?'⊕':'▤' }}</button>
  </div>
  <div v-else class="crop-console">
   <div class="plant" aria-hidden="true">🌱</div>
   <label>💧 Water <output>{{ water }} / 4</output><input v-model.number="water" type="range" min="0" max="4" step="1" :disabled="paused||sent" aria-label="Water level"/></label>
   <p>Water target: {{ target.water }}</p>
   <label>☀ Light <output>{{ light }} / 4</output><input v-model.number="light" type="range" min="0" max="4" step="1" :disabled="paused||sent" aria-label="Light level"/></label>
   <p>Light target: {{ target.light }}</p>
  </div>
  <p class="puzzle-status" role="status">{{ ready?'✓ Ready':notice|| (kind==='shield'?'0 / 3 gaps covered':'Use the sliders or arrow keys') }}</p>
  <button class="confirm" :disabled="paused||sent||!ready" @click="confirm">{{ kind==='shield'?'Test shield':'Save settings' }}</button>
  <small>{{ kind==='shield'?'Solid shelter adds protection. A clear dome alone does not.':'Plants grow slowly. Food rewards come from stored supplies.' }}</small>
 </section>
</template>
<style scoped>
.maintenance{padding:18px;color:#ecfff4;background:#16343a;border:1px solid #658e8d;border-radius:14px}.maintenance header{display:flex;justify-content:space-between;font:700 11px ui-monospace,monospace;color:#a2c7bc;letter-spacing:.08em}.maintenance h3{font-size:23px;line-height:1.2;margin:14px 0 8px}.maintenance p{font-size:14px;line-height:1.4}.shield-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:15px;background:#0c222a;border-radius:10px}.shield-grid button{height:64px;font-size:28px;background:#35535b;color:#95b4b5;border:2px solid #6b8d8b;border-radius:8px;cursor:pointer}.shield-grid .gap{border:2px dashed #f9cd83;color:#f9cd83;background:#162a32}.shield-grid .covered{border-style:solid;background:#41776a;color:#e5ffe5}.maintenance button:focus-visible{outline:3px solid #ffe09b;outline-offset:3px}.maintenance button:disabled{cursor:default}.confirm{width:100%;min-height:44px;margin:8px 0 12px;border:1px solid #b3e2bf;border-radius:8px;background:#b3e2bf;color:#17372d;font:700 15px system-ui;cursor:pointer}.confirm:disabled{opacity:.45}.maintenance small{display:block;font-size:11px;line-height:1.5;color:#b5cbc0}.crop-console{background:#0c222a;border-radius:10px;padding:10px 16px}.plant{text-align:center;font-size:42px}.crop-console label{display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:14px}.crop-console output{margin-left:auto;font-variant-numeric:tabular-nums}.crop-console input{width:100%;min-height:30px;accent-color:#9bdbb8}.crop-console p{font-size:12px;color:#ffdc99;margin:0 0 10px}.puzzle-status{color:#ffdc99}
</style>
