<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import type { StationId } from '../../contracts';
import ScienceWorkbench from './ScienceWorkbench.vue';
import PlantWatering from './PlantWatering.vue';
import MaintenancePuzzle from './MaintenancePuzzle.vue';
import StationMinigame from './StationMinigame.vue';
import BatteryRepair from './BatteryRepair.vue';
defineProps<{station:StationId;title:string;steps:readonly string[];impact:string;progress:number;inside:boolean;feedback:string;paused:boolean}>();
const emit=defineEmits<{control:[value:string];travel:[];enter:[];exit:[];cancel:[];pause:[]}>();
const root=ref<HTMLElement>();
let previous:HTMLElement|null=null;
onMounted(()=>{previous=document.activeElement as HTMLElement;root.value?.focus();});
onBeforeUnmount(()=>previous?.isConnected&&previous.focus());
function trap(event:KeyboardEvent){
 if(event.code==='KeyP'){event.preventDefault();if(!event.repeat)emit('pause');return;}
 if(event.key==='Escape'){event.preventDefault();emit('cancel');return;}
 if(event.key!=='Tab')return;
 const buttons=Array.from(root.value?.querySelectorAll<HTMLElement>('button:not(:disabled),summary,[tabindex="0"]')??[]).filter(node=>node.getClientRects().length);
 const first=buttons[0],last=buttons[buttons.length-1];if(!first)return;
 if(event.shiftKey&&(document.activeElement===first||document.activeElement===root.value)){event.preventDefault();last?.focus();}
 else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===root.value)){event.preventDefault();first.focus();}
}
</script>
<template>
 <section ref="root" class="activity" aria-label="Station activity" tabindex="-1" @keydown.stop="trap">
  <button class="close" aria-label="Close task" @click="$emit('cancel')">✕</button>
  <ScienceWorkbench v-if="inside && station==='solar' && /science|survey|research/i.test(title)" :stage="progress" :paused="paused" @complete="stage=>stage===progress&&$emit('control',steps[stage])" />
  <PlantWatering v-else-if="inside && station==='greenhouse'" :stage="progress" :paused="paused" @complete="stage=>stage===progress&&$emit('control',steps[stage])" />
  <MaintenancePuzzle v-else-if="inside && /shelter|reinforc/i.test(title)" kind="shield" :stage="progress" :paused="paused" @complete="stage=>stage===progress&&$emit('control',steps[stage])" />
  <BatteryRepair v-else-if="inside && station==='solar'" :stage="progress" :paused="paused" @complete="stage=>stage===progress&&$emit('control',steps[stage])"/>
  <StationMinigame v-else-if="inside" :station="station" :title="title" :progress="progress" :paused="paused" @complete="stage=>stage===progress&&$emit('control',steps[stage])"/>
  <div v-else class="approach"><h2>{{ title }}</h2><p>Enter the module to work.</p><button @click="$emit('enter')">Enter</button><button @click="$emit('travel')">Go to door</button></div>
  <footer><span class="reward">{{ impact.split(' · Prevents')[0].split(' · Shelter')[0].split(' · Builds')[0] }}</span><button @click="$emit('pause')">{{ paused?'▶ Resume':'Ⅱ Pause' }}</button></footer>
 </section>
</template>
<style scoped>
.activity{position:relative;width:100%;outline:none;color:#ecfff6;font-family:var(--font-body, system-ui, sans-serif)}
.close{position:absolute;right:10px;top:6px;z-index:2;width:38px;height:38px;border:1px solid rgb(0 229 255 / 35%);border-radius:50%;background:#16323d;color:#e2f7ef;font-size:16px;font-weight:700;cursor:pointer;transition:all .14s ease}
.close:hover{background:#234e5e;border-color:#00e5ff;transform:scale(1.1);box-shadow:0 0 10px rgb(0 229 255 / 40%)}
.activity :deep(.steps){margin-right:38px}
.activity footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 4px;font-size:11px}
.reward{color:#4cef50;font-family:var(--font-display, 'Orbitron', sans-serif);font-size:10px;font-weight:800;letter-spacing:.04em;text-shadow:0 0 8px rgb(76 239 80 / 30%)}
.activity footer button,.approach button{min-height:42px;padding:8px 14px;border:1px solid rgb(0 229 255 / 35%);border-radius:9px;background:linear-gradient(135deg, #1a3f4a, #235564);color:#eafff3;font-family:var(--font-display, 'Orbitron', sans-serif);font-size:11px;font-weight:700;letter-spacing:.04em;cursor:pointer;box-shadow:0 2px 8px rgb(0 0 0 / 25%);transition:all .14s cubic-bezier(.2,.8,.25,1.15)}
.activity footer button:hover,.approach button:hover{background:linear-gradient(135deg, #235462, #2d6c7e);border-color:#00e5ff;box-shadow:0 0 14px rgb(0 229 255 / 35%);transform:translateY(-1px) scale(1.02)}
.activity footer button:active,.approach button:active{transform:scale(.97)}
.activity button:focus-visible{outline:3px solid #ffdf92;outline-offset:2px}
.approach{padding:20px;background:linear-gradient(135deg, #132b35f2, #183742f2);border:1px solid rgb(0 229 255 / 35%);border-radius:14px;box-shadow:0 8px 24px #0008, 0 0 16px rgb(0 229 255 / 15%)}
.approach h2{font-family:var(--font-display, 'Orbitron', sans-serif);font-size:20px;letter-spacing:.04em;color:#00e5ff;text-shadow:0 0 12px rgb(0 229 255 / 40%)}
</style>
