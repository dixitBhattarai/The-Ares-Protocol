<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
defineProps<{context:string}>();
const emit=defineEmits<{resume:[]}>();
const dialog=ref<HTMLElement>();
let previous:HTMLElement|null=null;
onMounted(()=>{previous=document.activeElement as HTMLElement;dialog.value?.querySelector<HTMLButtonElement>('button')?.focus();});
onBeforeUnmount(()=>{if(previous?.isConnected)previous.focus();});
function keys(event:KeyboardEvent){
 if(['Escape','KeyP'].includes(event.code)){event.preventDefault();if(!event.repeat)emit('resume');}
 if(event.key==='Tab'){event.preventDefault();dialog.value?.querySelector<HTMLButtonElement>('button')?.focus();}
}
</script>
<template>
 <div class="pause-backdrop" @keydown.stop="keys" @keyup.stop>
  <section ref="dialog" class="pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-title" aria-describedby="pause-detail">
   <span class="pause-icon" aria-hidden="true"><i/><i/></span><p class="eyebrow">ARES / {{ context }}</p>
   <h2 id="pause-title">Take a breather.</h2>
   <p id="pause-detail">Game paused. Your mission will wait.</p>
   <button autofocus @click="emit('resume')">Resume game <span class="play" aria-hidden="true"/></button>
   <p class="keys">P or Esc to resume · WASD to move · drag to look</p>
   <small>Your mouse is released. Right-click the scene to lock the camera again.</small>
  </section>
 </div>
</template>
<style scoped>
.pause-backdrop{position:fixed;inset:0;z-index:5000;background:#07141ed9;backdrop-filter:blur(9px);display:grid;place-items:center;padding:20px;color:#eaf2e8}.pause-card{width:min(100%,430px);box-sizing:border-box;border:1px solid #718f87;border-radius:22px;padding:34px;background:linear-gradient(145deg,#284342,#112832);box-shadow:0 30px 120px #0007}.pause-icon{display:grid;place-items:center;width:48px;height:48px;border:1px solid #9abdac;border-radius:50%;font:24px system-ui;color:#d9e7b8}.pause-icon{display:flex;justify-content:center;gap:5px}.pause-icon i{display:block;width:4px;height:17px;background:currentColor}.play{width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid currentColor}.eyebrow{font:10px ui-monospace,monospace;letter-spacing:.14em;color:#b6cdbd;margin-top:24px}.pause-card h2{font:600 36px/1.1 system-ui;letter-spacing:-.04em;margin:14px 0}.pause-card p{font-size:14px;line-height:1.6;color:#c0d0c6}.pause-card button{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:50px;margin:26px 0 18px;padding:12px 18px;border:1px solid #d4e8b4;border-radius:10px;background:#c4dda5;color:#17372e;font:700 15px system-ui;cursor:pointer}.pause-card button:focus-visible{outline:3px solid #ffe1a0;outline-offset:4px}.pause-card .keys{font-size:11px}.pause-card small{font-size:11px;line-height:1.6;color:#9cb6ae;display:block}@media(prefers-reduced-motion:reduce){.pause-backdrop{backdrop-filter:none}}
</style>
