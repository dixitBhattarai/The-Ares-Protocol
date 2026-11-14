<script setup lang="ts">
import { ref, watch } from 'vue';
import type { GameAction } from '../../contracts';
import { emitResume, emitRestart } from './actions';
import { soundFX } from '../game/audio';

const emit = defineEmits<{
  action: [action: GameAction];
  menu?: [];
}>();

const soundVolume = ref(80);
const soundMuted = ref(!soundFX.enabled);
const showSettings = ref(false);

watch(soundVolume, (newVol) => {
  if (newVol === 0) {
    soundMuted.value = true;
    soundFX.enabled = false;
  } else {
    soundMuted.value = false;
    soundFX.enabled = true;
  }
});

watch(soundMuted, (muted) => {
  soundFX.enabled = !muted;
  if (!muted && soundVolume.value === 0) {
    soundVolume.value = 80;
  }
});

function onResume() {
  emitResume(emit);
}

function onRestart() {
  emitRestart(emit);
}

function testSound() {
  soundFX.playDecision();
}
</script>

<template>
  <div class="pause-panel" role="region" aria-label="Mission Paused">
    <div class="pause-card">
      <div class="pause-badge">
        <span class="pause-icon">⏸️</span>
        <h2>Mission Suspended</h2>
      </div>

      <p class="pause-message">
        Outpost simulation and astronaut motion are currently paused.
        Review telemetry, calibrate outpost sound systems, or restart your expedition.
      </p>

      <!-- In-Game Audio & Setting Controls -->
      <div class="audio-control-box">
        <div class="audio-header">
          <span class="audio-title">COMM & SYNTHESIZER AUDIO</span>
          <button
            type="button"
            class="mini-test-btn"
            title="Test audio synth beep"
            @click="testSound"
          >
            🔊 Beep
          </button>
        </div>

        <div class="slider-row">
          <label for="pauseVolume">Volume: {{ soundMuted ? 'Muted' : `${soundVolume}%` }}</label>
          <input
            id="pauseVolume"
            v-model.number="soundVolume"
            type="range"
            min="0"
            max="100"
            :disabled="soundMuted"
            class="pause-slider"
          />
        </div>

        <label class="mute-toggle">
          <input v-model="soundMuted" type="checkbox" />
          <span>Mute Outpost Audio</span>
        </label>
      </div>

      <div class="pause-actions">
        <button
          type="button"
          class="resume-button"
          @click="onResume"
        >
          ▶️ Resume Mission
        </button>

        <button
          type="button"
          class="restart-button"
          title="Restart expedition from shift 1"
          @click="onRestart"
        >
          🔄 Restart Mission
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
  background: linear-gradient(145deg, #182736 0%, #111b24 100%);
  border: 1px solid #3d5a75;
  border-radius: 14px;
  padding: 1.75rem 1.5rem;
  max-width: 480px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}

.pause-badge {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.pause-icon {
  font-size: 1.8rem;
}

h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.pause-message {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.5;
}

.audio-control-box {
  width: 100%;
  background: rgba(14, 25, 34, 0.7);
  border: 1px solid #294456;
  border-radius: 8px;
  padding: 12px 14px;
  text-align: left;
}

.audio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.audio-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #8be4cb;
}

.mini-test-btn {
  padding: 2px 8px;
  font-size: 10px;
  background: #233e4f;
  border: 1px solid #4a748c;
  color: #ffffff;
  border-radius: 4px;
  cursor: pointer;
}

.mini-test-btn:hover {
  background: #325870;
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  font-size: 11px;
  color: #e2e8f0;
}

.pause-slider {
  accent-color: #38bdf8;
  cursor: pointer;
}

.mute-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #cbd5e1;
  cursor: pointer;
}

.pause-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  align-items: center;
}

.resume-button {
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  color: #ffffff;
  border: 1px solid #38bdf8;
  font-size: 1rem;
  font-weight: 700;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.resume-button:hover {
  background: #0284c7;
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
  transform: translateY(-1px);
}

.restart-button {
  background: #1c2b36;
  color: #cbd5e1;
  border: 1px solid #3b5364;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
}

.restart-button:hover {
  background: #273d4d;
  color: #ffffff;
}

.resume-button:focus-visible,
.restart-button:focus-visible {
  outline: 3px solid #f6c768;
  outline-offset: 2px;
}
</style>
