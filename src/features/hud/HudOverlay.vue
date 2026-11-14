<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref,watch} from 'vue';
import type {GameState,MissionData,FlightStage} from '../../contracts';
const props=defineProps<{state:Readonly<GameState>;mission:MissionData;stage?:FlightStage|'earth'|'space'|'transit'|null;stageProgress?:{value:number;max:number}}>();
const target=ref<string|HTMLElement>('body');
onMounted(()=>{target.value=document.querySelector<HTMLElement>('.world-panel .viewport')??'body';});
const resources=computed(()=>(['power','oxygen','supplies'] as const).map((id,i)=>({id,label:['Power','Air','Food & kit'][i],icon:['ϟ','◉','▣'][i],value:Math.max(0,Math.min(100,props.state.resources[id]))})));
const feedback=ref('');let timer:ReturnType<typeof setTimeout>|undefined;
watch(()=>props.state.turn,(next,prev)=>{if(next<=prev){feedback.value='';return;}feedback.value='✓ Job complete';clearTimeout(timer);timer=setTimeout(()=>feedback.value='',2600);});
watch(()=>props.state.lastHazardNotice,(notice,previous)=>{if(!notice||notice===previous)return;feedback.value=notice;clearTimeout(timer);timer=setTimeout(()=>feedback.value='',5000);});
onBeforeUnmount(()=>clearTimeout(timer));
const stageTitle=computed(()=>props.stage?({'earth':'Launch prep','space':'Cabin checks','launch':'Launch','orbit-autopilot':'Orbit guidance','transfer':'Mars transfer','landing':'Mars approach','touchdown':'Touchdown','transit':'In transit'} as const)[props.stage]:'');
const warning=computed(()=>props.state.upcomingHazardNotice??'');
</script>
<template>
 <Teleport :to="target">
  <section v-if="stage || state.phase==='running'||state.phase==='paused'" class="instruments" :class="{journey:!!stage}" aria-label="Mission instruments">
   <div v-if="stage" class="journey-readout"><strong>{{ stageTitle }}</strong><span v-if="stageProgress">{{ stageProgress.value }} / {{ stageProgress.max }}</span></div>
   <template v-else>
    <div class="instrument-title"><strong>ARES</strong><span>{{ state.turn }} / {{ mission.maxTurns }} jobs</span></div>
    <div class="reserve-grid" aria-label="Outpost reserves">
     <div v-for="resource in resources" :key="resource.id" class="reserve" :class="[resource.id,{low:resource.value<=20}]">
      <span class="resource-icon" aria-hidden="true">{{ resource.icon }}</span><label :for="`meter-${resource.id}`">{{ resource.label }}</label><strong>{{ resource.value }}</strong>
      <meter :id="`meter-${resource.id}`" min="0" max="100" low="20" optimum="80" :value="resource.value" :aria-label="`${resource.label} reserve: ${resource.value} of 100 game units`"/>
      <span v-if="resource.value<=20" class="low-word">LOW</span>
     </div>
    </div>
    <div class="secondary"><span aria-label="Science goal">⚗ {{ state.science }}/{{ mission.scienceTarget }}</span><span aria-label="Shelter score">⬡ {{ state.shielding }}</span><small>GAME UNITS</small></div>
   </template>
  </section>
  <div v-if="!stage && warning && state.phase==='running'" class="hazard-strip" role="alert"><span aria-hidden="true">⚠</span>{{ warning }}</div>
  <div v-else-if="!stage && feedback && state.phase==='running'" class="job-feedback" role="status">{{ feedback }}</div>
 </Teleport>
</template>
<style scoped>
.instruments{position:absolute;z-index:6;left:16px;right:16px;bottom:14px;display:flex;align-items:center;gap:22px;padding:12px 18px;box-sizing:border-box;border:1px solid #8ba8a56b;border-top:3px solid #a7bfb5;border-radius:10px 10px 18px 18px;background:linear-gradient(180deg,#27444bee,#122b33f5);box-shadow:0 6px 0 #091b22,0 12px 24px #0005,inset 0 1px #d6ebd229;color:#f4fff1;pointer-events:none;font-family:ui-monospace,monospace}.instrument-title{display:grid;gap:5px;min-width:90px;font-size:12px}.instrument-title strong{color:#ffe0a0;letter-spacing:.16em}.reserve-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;flex:1}.reserve{position:relative;display:grid;grid-template-columns:20px 1fr auto;gap:3px 6px;align-items:center;--accent:#f3cc7e;font-size:13px}.reserve.oxygen{--accent:#a1dbeb}.reserve.supplies{--accent:#b2dbaa}.resource-icon{grid-row:1/3;color:var(--accent);font-size:24px}.reserve label{font-size:12px;color:#d6e6de}.reserve strong{font-variant-numeric:tabular-nums}.reserve meter{grid-column:2/4;width:100%;height:9px;accent-color:var(--accent)}meter::-webkit-meter-bar{background:#091c24;border:0;border-radius:2px}meter::-webkit-meter-optimum-value{background:var(--accent)}.secondary{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;font-size:14px}.secondary small{grid-column:1/3;font-size:8px;color:#b1c5bd;letter-spacing:.07em}.low{color:#ffd19e}.low-word{position:absolute;top:-14px;right:0;font:700 9px system-ui;color:#ffca94}.hazard-strip,.job-feedback{position:absolute;left:50%;transform:translateX(-50%);top:76px;bottom:auto;z-index:8;box-sizing:border-box;max-width:calc(100% - 32px);padding:9px 14px;border:1px solid #efce8c;border-radius:7px;background:#29332bef;color:#ffedb3;font-size:13px;line-height:1.4;pointer-events:none}.job-feedback{border-color:#96cbae;color:#caf4d4;background:#173a35ee}.journey{left:16px;right:auto;bottom:auto;top:16px;padding:10px 15px;min-width:180px;border-radius:8px;border-top-width:1px}.journey-readout{display:flex;gap:18px;align-items:center;font-size:13px}.journey-readout span{color:#f7d78d}
@media(max-width:640px){.instruments{left:8px;right:8px;bottom:8px;gap:8px;padding:10px;flex-wrap:wrap}.instrument-title{display:flex;align-items:center;justify-content:space-between;min-width:0;width:100%;font-size:10px}.reserve-grid{order:2;width:100%;flex-basis:100%;gap:10px}.reserve{grid-template-columns:14px 1fr auto;gap:3px;font-size:12px}.reserve label{font-size:10px}.resource-icon{font-size:18px}.secondary{position:absolute;top:8px;left:50%;transform:translateX(-50%);display:flex;gap:8px;font-size:10px}.secondary small{display:none}.hazard-strip,.job-feedback{top:72px;bottom:auto;font-size:12px;width:calc(100% - 24px)}.journey{right:auto;width:auto;top:10px;bottom:auto;left:10px;min-width:0;max-width:43%;padding:9px;font-size:11px}.journey-readout{flex-wrap:wrap;font-size:11px;gap:6px}}
@media(max-height:480px){.instruments{padding:6px 12px;bottom:6px}.hazard-strip,.job-feedback{top:66px;bottom:auto}}
</style>
