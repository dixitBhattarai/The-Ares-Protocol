<script setup lang="ts">
import {SURVEY_CAPACITY,SURVEY_SITES,type SurveyState,type SurveySiteId} from '../../contracts/survey';
defineProps<{site:typeof SURVEY_SITES[number];survey:SurveyState;roverNear:boolean;nearRover:boolean;paused:boolean;suited:boolean}>();
defineEmits<{scan:[id:SurveySiteId];collect:[id:SurveySiteId];cancel:[];board:[]}>();
</script>
<template>
 <section class="survey-control" aria-label="Crater survey">
  <header><strong>{{ site.name }}</strong><span>{{ survey.scanned.length }}/3 scanned · {{ survey.cargo.length }}/{{ SURVEY_CAPACITY }} cargo</span></header>
  <template v-if="survey.scanning"><p>Scanning the surface…</p><progress :value="survey.scanning.elapsed" max="3" aria-label="Surface scan"/><button @click="$emit('cancel')">Cancel</button></template>
  <p v-else-if="!suited">Equip your suit before sampling.</p>
  <p v-else-if="!roverNear">Park the rover within 8 m to use its scanner.</p>
  <p v-else-if="survey.analyzed.includes(site.id)">✓ {{ site.sample }} examined</p>
  <p v-else-if="survey.cargo.includes(site.id)">▣ {{ site.sample }} sealed</p>
  <button v-else-if="!survey.scanned.includes(site.id)" :disabled="paused" @click="$emit('scan',site.id)">E · Scan this spot</button>
  <template v-else><p>{{ site.sample }} · illustrated practice specimen</p><button :disabled="paused||survey.cargo.length>=SURVEY_CAPACITY" @click="$emit('collect',site.id)">{{ survey.cargo.length>=SURVEY_CAPACITY?'Cargo full · return to the lab':'E · Seal specimen' }}</button></template>
  <button v-if="nearRover&&!survey.scanning" :disabled="paused" @click="$emit('board')">Drive rover</button>
 </section>
</template>
<style scoped>
.survey-control{position:absolute;z-index:22;bottom:105px;left:50%;transform:translateX(-50%);width:min(390px,calc(100% - 32px));box-sizing:border-box;padding:15px;border:1px solid #82c5c9;border-radius:16px;background:linear-gradient(135deg,#173c49f5,#102a38f5);color:#e7fff7;box-shadow:0 8px 35px #0006;font-family:var(--font-body,system-ui)}header{display:grid;gap:5px}strong{color:#ffe1a4;font-size:16px}span,p{font-size:12px}span{color:#a9c9ce}p{line-height:1.5;margin:10px 0}button{width:100%;margin-top:10px;min-height:44px;border:1px solid #9bdddc;border-radius:9px;background:#345e64;color:#edfff3;font:700 13px var(--font-body,system-ui);cursor:pointer}button:disabled{opacity:.5}button:focus-visible{outline:3px solid #ffdd8a;outline-offset:3px}progress{width:100%;accent-color:#9eeed0}@media(max-width:600px){.survey-control{bottom:170px}}
</style>
