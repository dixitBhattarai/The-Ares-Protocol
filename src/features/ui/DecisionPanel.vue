<script setup lang="ts">
import { computed } from 'vue';
import type { GameAction, GameState, MissionData, MissionEvent } from '../../contracts';
import { emitChoose, emitPause } from './actions';

const props = defineProps<{
  state: Readonly<GameState>;
  mission: MissionData;
  event: MissionEvent | undefined;
}>();

const emit = defineEmits<{
  action: [action: GameAction];
}>();

const currentShift = computed(() => props.state.turn + 1);
const latestLog = computed(() => props.state.log.at(-1));

function onChoose(choiceId: string) {
  emitChoose(emit, choiceId);
}

function onPause() {
  emitPause(emit);
}
</script>

<template>
  <div class="decision-panel" role="region" aria-label="Current Shift Decisions">
    <!-- Header / Progress -->
    <header class="panel-header">
      <div class="meta-row">
        <span class="shift-badge">
          Shift {{ currentShift }} of {{ mission.maxTurns }}
        </span>
        <button
          type="button"
          class="pause-button"
          aria-label="Pause Mission"
          @click="onPause"
        >
          ⏸️ Pause
        </button>
      </div>
      <h2 class="event-title">{{ event?.title || 'Next Assignment' }}</h2>
      <p class="event-desc">{{ event?.description || 'Review the telemetry and assign your crew duties for this shift.' }}</p>
    </header>

    <!-- Hazard Alert if detected -->
    <div
      v-if="state.lastHazardNotice"
      class="hazard-banner"
      role="alert"
      aria-live="polite"
    >
      <span class="hazard-icon">⚠️</span>
      <div class="hazard-text">
        <strong>Telemetry Alert:</strong> {{ state.lastHazardNotice }}
      </div>
    </div>

    <!-- Decision Cards -->
    <div class="choices-container" role="group" aria-label="Available Choices">
      <button
        v-for="choice in event?.choices"
        :key="choice.id"
        type="button"
        class="choice-card"
        @click="onChoose(choice.id)"
      >
        <div class="choice-header">
          <h3 class="choice-label">{{ choice.label }}</h3>
        </div>
        <p class="choice-explanation">{{ choice.explanation }}</p>

        <!-- Resource Impact Badges -->
        <div class="impacts" aria-label="Resource consequences">
          <!-- Power -->
          <span
            v-if="choice.effect.resources?.power !== undefined"
            class="impact-pill"
            :class="choice.effect.resources.power >= 0 ? 'gain' : 'cost'"
          >
            ⚡ Power {{ choice.effect.resources.power > 0 ? '+' : '' }}{{ choice.effect.resources.power }}
          </span>

          <!-- Oxygen -->
          <span
            v-if="choice.effect.resources?.oxygen !== undefined"
            class="impact-pill"
            :class="choice.effect.resources.oxygen >= 0 ? 'gain' : 'cost'"
          >
            💨 Oxygen {{ choice.effect.resources.oxygen > 0 ? '+' : '' }}{{ choice.effect.resources.oxygen }}
          </span>

          <!-- Supplies -->
          <span
            v-if="choice.effect.resources?.supplies !== undefined"
            class="impact-pill"
            :class="choice.effect.resources.supplies >= 0 ? 'gain' : 'cost'"
          >
            📦 Supplies {{ choice.effect.resources.supplies > 0 ? '+' : '' }}{{ choice.effect.resources.supplies }}
          </span>

          <!-- Science -->
          <span
            v-if="choice.effect.science"
            class="impact-pill gain science-pill"
          >
            🔬 Science +{{ choice.effect.science }}
          </span>

          <!-- Shelter / Shielding -->
          <span
            v-if="choice.effect.shielding"
            class="impact-pill gain shelter-pill"
          >
            🛡️ Shelter +{{ choice.effect.shielding }}
          </span>
        </div>

        <!-- Delayed Effect notice -->
        <div v-if="choice.delayedEffect" class="delayed-preview">
          ⏳ Arrives in {{ choice.delayedEffect.delayTurns }} shifts: {{ choice.delayedEffect.description }}
        </div>
      </button>
    </div>

    <!-- Recent Logs & Pending Effects -->
    <footer class="panel-footer">
      <div v-if="state.pendingDelayedEffects && state.pendingDelayedEffects.length > 0" class="pending-box">
        <strong>Active Pipeline:</strong>
        <span v-for="(p, idx) in state.pendingDelayedEffects" :key="idx" class="pending-item">
          ⏳ Due Shift {{ p.dueTurn }}: {{ p.description }}
        </span>
      </div>

      <div class="feedback-box" role="status" aria-live="polite">
        <span class="log-label">Latest Log:</span>
        <span class="log-text">{{ latestLog || 'Awaiting Shift 1 astronaut action.' }}</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.decision-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-header {
  border-bottom: 1px solid #283749;
  padding-bottom: 0.75rem;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.shift-badge {
  background: #1e3a5f;
  color: #7dd3fc;
  border: 1px solid #38bdf8;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
}

.pause-button {
  background: #1a2634;
  color: #cbd5e1;
  border: 1px solid #475569;
  font-size: 0.85rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  transition: background 0.15s, color 0.15s;
}

.pause-button:hover {
  background: #293b51;
  color: #f8fafc;
}

.pause-button:focus-visible {
  outline: 3px solid #f6c768;
  outline-offset: 2px;
}

.event-title {
  margin: 0 0 0.35rem 0;
  font-size: 1.4rem;
  color: #f8fafc;
}

.event-desc {
  margin: 0;
  font-size: 0.95rem;
  color: #cbd5e1;
  line-height: 1.45;
}

.hazard-banner {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: #3b2810;
  border: 1px solid #f59e0b;
  color: #fef3c7;
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.hazard-icon {
  font-size: 1.25rem;
}

.choices-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.85rem;
}

.choice-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  background: #16202c;
  border: 1px solid #334b63;
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
  min-height: 140px;
  outline: none;
}

.choice-card:hover {
  background: #1d2c3d;
  border-color: #60a5fa;
  transform: translateY(-2px);
}

.choice-card:active {
  transform: translateY(0);
}

.choice-card:focus-visible {
  outline: 3px solid #f6c768;
  outline-offset: 3px;
  border-color: #f6c768;
}

.choice-header {
  margin-bottom: 0.35rem;
}

.choice-label {
  margin: 0;
  font-size: 1.1rem;
  color: #f8fafc;
  font-weight: 700;
}

.choice-explanation {
  margin: 0 0 0.75rem 0;
  font-size: 0.88rem;
  color: #94a3b8;
  line-height: 1.4;
  flex-grow: 1;
}

.impacts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: auto;
}

.impact-pill {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  letter-spacing: 0.02em;
}

.impact-pill.cost {
  background: #391e24;
  border: 1px solid #f43f5e;
  color: #fecdd3;
}

.impact-pill.gain {
  background: #143527;
  border: 1px solid #22c55e;
  color: #bbf7d0;
}

.impact-pill.science-pill {
  background: #2b1f47;
  border: 1px solid #c084fc;
  color: #f3e8ff;
}

.impact-pill.shelter-pill {
  background: #1a3348;
  border: 1px solid #38bdf8;
  color: #e0f2fe;
}

.delayed-preview {
  margin-top: 0.5rem;
  font-size: 0.76rem;
  color: #e2e8f0;
  background: #1e293b;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #f59e0b;
}

.panel-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pending-box {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 0.45rem 0.75rem;
  font-size: 0.82rem;
  color: #cbd5e1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.pending-item {
  color: #fcd34d;
}

.feedback-box {
  background: #0f1722;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  min-height: 2.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
}

.log-label {
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.log-text {
  color: #fcd34d;
}

@media (max-width: 480px) {
  .choices-container {
    grid-template-columns: 1fr;
  }
  .event-title {
    font-size: 1.2rem;
  }
}
</style>
