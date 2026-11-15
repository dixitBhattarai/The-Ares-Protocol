<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import type { StationId } from '../../contracts';
import PlantWatering from './PlantWatering.vue';
import MaintenancePuzzle from './MaintenancePuzzle.vue';
import StationMinigame from './StationMinigame.vue';
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
  <PlantWatering v-if="inside && station==='greenhouse'" :stage="progress" :paused="paused" @complete="stage=>stage===progress&&$emit('control',steps[stage])" />
  <MaintenancePuzzle v-else-if="inside && /shelter|reinforc/i.test(title)" kind="shield" :stage="progress" :paused="paused" @complete="stage=>stage===progress&&$emit('control',steps[stage])" />
  <StationMinigame v-else-if="inside" :station="station" :title="title" :progress="progress" :paused="paused" @complete="stage=>stage===progress&&$emit('control',steps[stage])"/>
  <div v-else class="approach"><h2>{{ title }}</h2><p>Enter the module to work.</p><button @click="$emit('enter')">Enter</button><button @click="$emit('travel')">Go to door</button></div>
  <footer><span class="reward">{{ impact.split(' · Prevents')[0].split(' · Shelter')[0].split(' · Builds')[0] }}</span><button @click="$emit('pause')">{{ paused?'▶ Resume':'Ⅱ Pause' }}</button></footer>
 </section>
</template>
<style scoped>
.activity{position:relative;width:100%;outline:none;color:#ecfff6}.close{position:absolute;right:10px;top:6px;z-index:2;width:38px;height:38px;border:0;border-radius:50%;background:#16323d;color:#e2f7ef;font-size:17px;cursor:pointer}.activity :deep(.steps){margin-right:38px}.activity footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 4px;font-size:11px}.reward{color:#a8eccc;font-weight:700}.activity footer button,.approach button{min-height:40px;padding:7px 12px;border:1px solid #719d9d;border-radius:9px;background:#1e424c;color:#eafff3;cursor:pointer}.activity button:focus-visible{outline:3px solid #ffdf92;outline-offset:2px}.approach{padding:20px;background:#15323d;border-radius:16px}.approach h2{font-size:20px}
</style>
