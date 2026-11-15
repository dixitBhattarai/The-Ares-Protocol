<script setup lang="ts">
import {computed,ref} from 'vue';
import {DISCOVERY_SITES,DISCOVERY_TRAILS,type DiscoveryId} from '../../contracts/open-world';
import type {Vec3} from '../../contracts';
const props=defineProps<{pose:Vec3;found:readonly DiscoveryId[];target:DiscoveryId|null;nearby?:string;busy:boolean}>();
const emit=defineEmits<{select:[id:DiscoveryId];study:[];home:[]}>();
const expanded=ref(false);
const destination=computed(()=>DISCOVERY_SITES.find(s=>s.id===props.target));
const distance=computed(()=>destination.value?Math.round(Math.hypot(props.pose.x-destination.value.x,props.pose.z-destination.value.z)):0);
</script>
<template>
 <aside class="explorer-map" :class="{expanded}">
  <button class="map-toggle" :aria-expanded="expanded" @click="expanded=!expanded">{{ expanded?'Hide map':'Map & discoveries' }} <span>{{ found.length }}/4</span></button>
  <div v-show="expanded" class="map-body">
   <header><strong>ARES EXPANSE</strong><span>N ↑</span></header>
   <svg viewBox="-80 -80 160 160" role="group" aria-label="Mars exploration map. Select a landmark to track it.">
    <rect x="-80" y="-80" width="160" height="160" rx="5" fill="#233a3b"/><path v-for="i in 6" :key="i" :d="`M-80 ${-65+i*22}q50-30 90 0t80-20`" stroke="#46605a" fill="none" opacity=".4"/>
    <path v-for="(segment,i) in DISCOVERY_TRAILS" :key="'trail'+i" :d="`M${segment[0][0]} ${segment[0][1]}L${segment[1][0]} ${segment[1][1]}`" fill="none" stroke="#a4b4a0" stroke-width=".6" stroke-dasharray="2 2"/>
    <circle cy="-2" r="14" fill="#72988c" fill-opacity=".3" stroke="#a5c6af" stroke-width=".7"/><text x="0" y="0" text-anchor="middle" font-size="4" fill="#d0e2c7">BASE</text>
    <path v-if="destination" :d="`M${pose.x} ${pose.z}L${destination.x} ${destination.z}`" stroke="#ffdd9e" stroke-width=".6" stroke-dasharray="1 2"/>
    <g v-for="site in DISCOVERY_SITES" :key="site.id" tabindex="0" role="button" :aria-label="`Track ${site.name}${found.includes(site.id)?', discovered':''}`" :transform="`translate(${site.x} ${site.z})`" @click="emit('select',site.id)" @keydown.enter.stop.prevent="emit('select',site.id)" @keydown.space.stop.prevent="emit('select',site.id)">
     <circle r="7" fill="transparent"/><circle r="3.8" :fill="target===site.id?'#ffdda1':site.color"/><text y="1.8" text-anchor="middle" font-size="5" fill="#17302e">{{ found.includes(site.id)?'✓':'◇' }}</text><text y="9" text-anchor="middle" font-size="3.6" fill="#d2dfc9">{{ site.name }}</text>
    </g>
    <circle :cx="pose.x" :cy="pose.z" r="2.4" fill="#fff9dc" stroke="#233e3b" stroke-width=".7"/>
   </svg>
   <p>{{ destination?destination.name+' · '+distance+' m':'Choose a landmark. Follow the marked trails.' }}</p>
   <button class="return" :disabled="busy" @click="emit('home')">Return to base</button>
   <small>Shift to sprint · E to investigate</small>
  </div>
  <button v-if="nearby" class="study" :disabled="busy" @click="emit('study')">E · Investigate {{ nearby }}</button>
 </aside>
</template>
<style scoped>
.explorer-map{position:absolute;top:88px;right:16px;z-index:16;width:230px;color:#e6eddb;font-family:system-ui}.map-toggle,.return,.study{width:100%;min-height:40px;padding:10px 12px;border:1px solid #799b8e;border-radius:9px;color:#e4f0d8;background:#17363deb;cursor:pointer;font-size:11px}.map-toggle{display:flex;justify-content:space-between}.map-toggle span{color:#ffdda1}.map-body{padding:12px;margin-top:5px;border:1px solid #78958b;border-radius:12px;background:#10282ff2}.map-body header{display:flex;justify-content:space-between;font-size:9px;letter-spacing:.06em;margin-bottom:8px}.map-body svg{display:block;width:100%}.map-body p{font-size:10px;line-height:1.5;min-height:28px}.map-body small{display:block;font-size:9px;color:#aac5b0;margin-top:10px}.study{margin-top:7px;background:#ccdfa8;color:#203c30;font-weight:700}.explorer-map button:focus-visible,.explorer-map g:focus-visible{outline:2px solid #ffdda1;outline-offset:3px}.explorer-map button:disabled{opacity:.5}@media(max-width:600px){.explorer-map{right:10px;top:90px;width:190px}.map-body{padding:9px}}
</style>
