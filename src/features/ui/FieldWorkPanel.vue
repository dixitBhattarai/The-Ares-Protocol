<script setup lang="ts">
import SampleLab from './SampleLab.vue';
import type { FieldSample } from '../../contracts/exploration';
defineProps<{sample?:FieldSample;nearSite:boolean;nearLab:boolean;suited:boolean;paused:boolean;notice:string}>();
const emit=defineEmits<{dig:[];research:[];check:[control:string];cancel:[];science:[];pause:[]}>();
</script>
<template>
 <section class="field-console" aria-label="Regolith fieldwork">
  <header><span>ARES / FIELD SCIENCE</span><button aria-label="Open NASA science" @click="emit('science')">NASA ↗</button></header>
  <template v-if="!sample && nearSite">
   <h2>A little Mars, in your hands.</h2><p>Collect a sand sample. Take it to the lab.</p>
   <button class="primary" :disabled="!suited||paused" @click="emit('dig')">{{ suited?'E · Collect sample':'Suit up at the airlock first' }}</button>
  </template>
  <template v-else-if="!sample"><h2>Science starts outside.</h2><p>Collect a sealed sample at the marked sand site beyond the airlock.</p><button @click="emit('science')">Explore NASA observations</button></template>
  <template v-else-if="sample.stage==='digging'">
   <h2>Scoop. Seal. Label.</h2><progress :value="sample.elapsed" max="6" aria-label="Digging progress"/><p role="status">{{ paused?'Paused':'Collecting a clean sample…' }}</p><button @click="emit('cancel')">Cancel</button>
  </template>
  <template v-else-if="sample.stage==='collected'">
   <h2>Sample sealed ✓</h2><p>{{ nearLab?'Place it under the lab camera.':'Return through the airlock. Find the blue science lab.' }}</p>
   <button v-if="nearLab" class="primary" :disabled="paused" @click="emit('research')">E · Examine sample</button>
  </template>
  <SampleLab v-else-if="sample.stage==='researching'" :sample="sample" :paused="paused" @check="emit('check',$event)" @close="emit('cancel')" @pause="emit('pause')"/>
  <template v-else><h2>Field note saved ✓</h2><p>Loose grains observed. Composition still unknown.</p><button @click="emit('science')">Compare with NASA imagery</button></template>
  <footer v-if="sample?.stage==='digging'||sample?.stage==='researching'"><button @click="emit('pause')">{{ paused?'Resume':'Pause' }}</button><span>Real work takes time.</span></footer>
 </section>
</template>
<style scoped>
.field-console{position:absolute;z-index:16;right:18px;bottom:108px;box-sizing:border-box;width:300px;max-width:calc(100% - 24px);padding:16px;border:1px solid #99b6a4;border-top:3px solid #f1cb8c;border-radius:9px;background:linear-gradient(145deg,#25464aee,#0e2831f5);color:#eaf5e7;box-shadow:0 6px 0 #091e25,0 12px 30px #0005}.field-console header{display:flex;justify-content:space-between;align-items:center;gap:8px;font:700 9px ui-monospace,monospace;letter-spacing:.1em;color:#a9cec3}.field-console header button{min-height:32px;padding:4px 8px;font-size:10px}.field-console h2{font-size:21px;line-height:1.2;letter-spacing:-.03em;margin:14px 0 8px;color:#ffe0ab}.field-console p{font-size:13px;line-height:1.55;margin:9px 0 12px}.field-console button{min-height:44px;padding:9px 14px;border:1px solid #729d91;border-radius:6px;background:#244b4b;color:#f1ffee;font:600 12px system-ui;cursor:pointer}.field-console button:disabled{opacity:.45;cursor:default}.field-console button:focus-visible{outline:3px solid #f8d897;outline-offset:3px}.field-console .primary{width:100%;background:#e6c493;color:#173a3a;border-color:#ffe0a5}.field-console progress{width:100%;height:8px;accent-color:#f1cb8c}.field-console .caption{font-size:10px;color:#9fbeb6;margin-bottom:0}.grain-view{height:68px;position:relative;background:#b67b53;border:3px solid #577a73;border-radius:7px;margin:10px 0;overflow:hidden}.grain-view i{position:absolute;width:4px;height:5px;border-radius:35%;background:#ffe0ac;box-shadow:2px 3px 0 #573d31}.grain-choices{display:flex;gap:8px}.grain-choices button{flex:1;padding:8px;font-size:12px}.field-console footer{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #62877b66;margin-top:12px;padding-top:8px;font-size:10px;color:#b4cbc0}
@media(max-width:640px){.field-console{top:78px;bottom:auto;left:10px;right:10px;width:auto;padding:10px 12px}.field-console h2{font-size:18px;margin:8px 0 5px}.field-console p{font-size:12px;line-height:1.4;margin:6px 0 9px}.field-console header button{min-height:30px}.field-console footer{margin-top:7px;padding-top:5px}.field-console footer button{min-height:34px}.field-console .caption{font-size:9px}.grain-view{height:48px}.field-console .primary{min-height:40px}}
</style>
