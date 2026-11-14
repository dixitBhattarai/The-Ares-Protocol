<script setup lang="ts">
defineProps<{
  nearSeat: boolean;
  seated: boolean;
  paused: boolean;
  feedback: string;
}>();

const emit = defineEmits<{
  sit: [];
  transfer: [];
  pause: [];
}>();
</script>

<template>
  <section class="seat-panel" aria-labelledby="seat-title">
    <p class="eyebrow">ARES · ZERO-G FLIGHT CABIN</p>
    <h2 id="seat-title">Cabin tasks complete</h2>
    <p v-if="!seated" class="instruction">Glide to the glowing orange flight seat. Press <kbd>E</kbd> or use the button when you are beside it.</p>
    <p v-else class="instruction">You can relax here and watch the planets drift across the forward window while the engines are idle. Start the Mars transfer whenever you are ready.</p>
    <p class="seat-status" role="status" aria-live="polite">
      <span class="status-light" :class="{ ready: nearSeat || seated }" aria-hidden="true" />
      {{ feedback || (seated ? 'Harness secure. The window view is still active.' : nearSeat ? 'Flight seat is within reach.' : 'Move toward the orange marker beside the pilot seat.') }}
    </p>
    <div class="seat-actions">
      <button v-if="!seated" class="sit-button" type="button" :disabled="paused || !nearSeat" @click="emit('sit')">Sit and buckle in</button>
      <button v-else class="sit-button" type="button" :disabled="paused" @click="emit('transfer')">Begin Mars transfer</button>
      <button class="pause-button" type="button" @click="emit('pause')">{{ paused ? '▶ Resume' : 'Ⅱ Pause' }}</button>
    </div>
  </section>
</template>

<style scoped>
.seat-panel { display: grid; gap: 12px; padding: 18px; border: 1px solid #4d7880; border-radius: 15px; color: #edf9f4; background: radial-gradient(circle at 90% 0, #25494d 0, transparent 42%), linear-gradient(145deg, #1b333e, #12242e); box-shadow: 0 12px 32px #05172280; }
.eyebrow { margin: 0; color: #9fe3cf; font-size: 10px; font-weight: 800; letter-spacing: .16em; }
h2 { margin: 0; font-size: 19px; line-height: 1.2; }
.instruction { margin: 0; color: #d2e5e1; font-size: 12px; line-height: 1.6; }
kbd { padding: 2px 6px; border: 1px solid #87aaa6; border-radius: 5px; color: #fff1c3; background: #1d353d; font: 700 11px ui-monospace, monospace; }
.seat-status { display: flex; align-items: flex-start; gap: 8px; min-height: 42px; margin: 0; padding: 10px; border: 1px solid #769e9438; border-radius: 9px; color: #c8e5dd; background: #0d202bb5; font-size: 11px; line-height: 1.5; }
.status-light { flex: 0 0 9px; height: 9px; margin-top: 3px; border: 1px solid #f1b86c; border-radius: 50%; background: #80563d; }
.status-light.ready { border-color: #b0efd0; background: #82d8ad; box-shadow: 0 0 12px #7ee4b2a0; }
.seat-actions { display: flex; flex-wrap: wrap; gap: 8px; }
button { min-height: 48px; padding: 10px 14px; border: 1px solid #80b7a6; border-radius: 9px; color: #eafff5; background: #244b49; font: inherit; font-size: 12px; font-weight: 750; line-height: 1.2; cursor: pointer; }
.sit-button { flex: 1 1 190px; color: #233831; border-color: #f5ce8b; background: linear-gradient(135deg, #ffe4a8, #f4b86f); }
button:hover:not(:disabled) { filter: brightness(1.08); }
button:disabled { opacity: .55; cursor: not-allowed; }
button:focus-visible { outline: 3px solid #fff0ae; outline-offset: 3px; }
.pause-button { flex: 0 0 auto; }
@media (max-width: 480px) { .seat-panel { padding: 14px; gap: 10px; } h2 { font-size: 17px; } .instruction { font-size: 11px; } .pause-button { flex: 1 1 100%; } }
@media (prefers-reduced-motion: reduce) { button { transition: none; } }
</style>
