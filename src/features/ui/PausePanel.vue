<script setup lang="ts">
import type { GameAction } from '../../contracts';
import { emitResume } from './actions';

const emit = defineEmits<{
  action: [action: GameAction];
}>();

function onResume() {
  emitResume(emit);
}
</script>

<template>
  <div class="pause-panel" role="region" aria-label="Mission Paused">
    <div class="pause-card">
      <span class="pause-icon">⏸️</span>
      <h2>Mission Paused</h2>
      <p class="pause-message">
        Outpost simulation and astronaut motion are currently suspended.
        Take a moment to review your resource levels and plan your upcoming shifts!
      </p>
      <div class="pause-actions">
        <button
          type="button"
          class="resume-button"
          @click="onResume"
        >
          ▶️ Resume Mission
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pause-panel {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem 0.5rem;
}

.pause-card {
  background: #16202c;
  border: 1px solid #334b63;
  border-radius: 12px;
  padding: 2rem 1.5rem;
  max-width: 480px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.pause-icon {
  font-size: 2.2rem;
  line-height: 1;
}

h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #f8fafc;
}

.pause-message {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.95rem;
  line-height: 1.45;
}

.pause-actions {
  margin-top: 0.5rem;
  width: 100%;
}

.resume-button {
  background: #0284c7;
  color: #ffffff;
  border: 2px solid #38bdf8;
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.75rem 2rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: min(100%, 280px);
}

.resume-button:hover {
  background: #0369a1;
  transform: translateY(-1px);
}

.resume-button:active {
  transform: translateY(1px);
}

.resume-button:focus-visible {
  outline: 3px solid #f6c768;
  outline-offset: 4px;
}
</style>
