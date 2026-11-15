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
   <span class="pause-icon" aria-hidden="true"><i/><i/></span><p class="eyebrow">ARES TACTICAL / {{ context }}</p>
   <h2 id="pause-title">MISSION PAUSED</h2>
   <p id="pause-detail">Outpost telemetry on standby. Take a breather, Commander.</p>
   <button autofocus @click="emit('resume')">RESUME MISSION <span class="play" aria-hidden="true"/></button>
   <p class="keys">P or Esc to resume · WASD to move · drag to look</p>
   <small>Mouse cursor released. Right-click the viewport to lock camera.</small>
  </section>
 </div>
</template>
<style scoped>
.pause-backdrop{position:fixed;inset:0;z-index:5000;background:#051018ee;backdrop-filter:blur(14px);display:grid;place-items:center;padding:20px;color:#eaf2e8;font-family:var(--font-body, system-ui, sans-serif)}.pause-card{width:min(100%,460px);box-sizing:border-box;border:2px solid rgb(0 229 255 / 45%);border-top:6px solid #00e5ff;border-radius:20px;padding:36px;background:linear-gradient(155deg,#122834f8,#0a1922fa);box-shadow:0 30px 100px #000c, 0 0 40px rgb(0 229 255 / 25%)}.pause-icon{display:flex;justify-content:center;align-items:center;gap:6px;width:52px;height:52px;border:2px solid #00e5ff;border-radius:50%;color:#00e5ff;box-shadow:0 0 18px rgb(0 229 255 / 45%)}.pause-icon i{display:block;width:5px;height:20px;background:currentColor;border-radius:2px}.play{width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:10px solid currentColor}.eyebrow{font:700 11px var(--font-display, 'Orbitron', monospace);letter-spacing:.2em;color:#00e5ff;margin-top:24px;text-shadow:0 0 10px rgb(0 229 255 / 40%)}.pause-card h2{font:800 32px/1.1 var(--font-display, 'Orbitron', sans-serif);letter-spacing:.02em;margin:12px 0;color:#fff8e8;text-shadow:0 0 18px rgb(0 229 255 / 35%)}.pause-card p{font-size:14px;line-height:1.6;color:#c0e0ec}.pause-card button{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:54px;margin:26px 0 18px;padding:14px 22px;border:2px solid #00e5ff;border-radius:12px;background:linear-gradient(135deg, #00e5ff, #0099ff);color:#06141c;font:800 16px var(--font-display, 'Orbitron', sans-serif);letter-spacing:.06em;cursor:pointer;box-shadow:0 0 24px rgb(0 229 255 / 50%);transition:all .18s cubic-bezier(.2,.8,.25,1.2)}.pause-card button:hover{background:linear-gradient(135deg, #33ebff, #22abff);transform:scale(1.03) translateY(-2px);box-shadow:0 0 35px rgb(0 229 255 / 75%)}.pause-card button:active{transform:scale(.98)}.pause-card button:focus-visible{outline:3px solid #ffe1a0;outline-offset:4px}.pause-card .keys{font-family:var(--font-display, 'Orbitron', monospace);font-size:10px;color:#8be4ff;letter-spacing:.06em}.pause-card small{font-size:11px;line-height:1.6;color:#8ba8b4;display:block}@media(prefers-reduced-motion:reduce){.pause-backdrop{backdrop-filter:none}}
</style>
