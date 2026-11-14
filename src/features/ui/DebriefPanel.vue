<script setup lang="ts">
import { computed } from 'vue';
import type { GameAction, GameState, MissionData, TurnRecord } from '../../contracts';
import { emitRestart } from './actions';

const props = defineProps<{
  state: Readonly<GameState>;
  mission: MissionData;
}>();

const emit = defineEmits<{
  action: [action: GameAction];
}>();

const isWon = computed(() => props.state.phase === 'won');
const isStationWork = computed(() => props.mission.gameplayMode === 'station-tasks');
const debrief = computed(() => props.state.debrief);

const displayTitle = computed(() => {
  if (debrief.value?.title) return debrief.value.title;
  return isWon.value ? 'Outpost Mission Accomplished!' : 'Mission Concluded — Time to Debrief';
});

const displaySummary = computed(() => {
  if (debrief.value?.summary) return debrief.value.summary;
  return isWon.value
    ? `Your crew maintained life-support reserves across all ${props.mission.maxTurns} shifts and collected ${props.state.science} / ${props.mission.scienceTarget} science points!`
    : 'A critical reserve was depleted or mission parameters were not met. Every spaceflight pioneer learns from challenges!';
});

const turnRecords = computed<readonly TurnRecord[]>(() => {
  return props.state.history && props.state.history.length > 0 ? props.state.history : [];
});

const fallbackLogs = computed<readonly string[]>(() => {
  if (turnRecords.value.length > 0) return [];
  return props.state.log;
});

function onRestart() {
  emitRestart(emit);
}
</script>

<template>
  <div
    class="debrief-panel"
    role="region"
    :aria-label="isWon ? 'Mission Victory Debrief' : 'Mission Review and Debrief'"
  >
    <!-- Header / Outcome -->
    <header class="debrief-header" :class="isWon ? 'header-won' : 'header-lost'">
      <!-- Animated badge banner -->
      <div v-if="isWon" class="celebration-badge-container">
        <div class="medal-glow" aria-hidden="true"></div>
        <div class="medal-ring">
          <span class="medal-icon">🎖️</span>
        </div>
        <span class="medal-title">ARES OUTPOST COMMANDER HONOR</span>
        <div class="stars-row" v-if="debrief?.stars">
          <span v-for="s in debrief.stars" :key="s" class="star-icon">⭐</span>
        </div>
      </div>

      <div class="status-pill">
        {{ isWon ? '🏆 Mission Success' : '📡 Mission Review' }}
      </div>
      <h2 class="debrief-title">{{ displayTitle }}</h2>
      <p class="debrief-summary">{{ displaySummary }}</p>
    </header>

    <!-- Depletion / Primary Cause Warning (Non-shaming) -->
    <div
      v-if="debrief?.primaryCause"
      class="cause-card"
      role="alert"
    >
      <span class="cause-icon">🔍</span>
      <div class="cause-content">
        <strong>Root Cause Analysis:</strong>
        <p>{{ debrief.primaryCause }}</p>
      </div>
    </div>

    <!-- Final Telemetry Stats -->
    <section class="final-stats" aria-label="Final Outpost Telemetry">
      <h3>📊 Final Mission Telemetry</h3>
      <div class="stats-grid">
        <div class="stat-box" :class="{ 'stat-danger': state.resources.power <= 0 }">
          <span class="stat-icon">⚡</span>
          <span class="stat-name">Power</span>
          <strong class="stat-val">{{ state.resources.power }}%</strong>
        </div>
        <div class="stat-box" :class="{ 'stat-danger': state.resources.oxygen <= 0 }">
          <span class="stat-icon">💨</span>
          <span class="stat-name">Oxygen</span>
          <strong class="stat-val">{{ state.resources.oxygen }}%</strong>
        </div>
        <div class="stat-box" :class="{ 'stat-danger': state.resources.supplies <= 0 }">
          <span class="stat-icon">📦</span>
          <span class="stat-name">Supplies</span>
          <strong class="stat-val">{{ state.resources.supplies }}%</strong>
        </div>
        <div class="stat-box">
          <span class="stat-icon">🔬</span>
          <span class="stat-name">Science</span>
          <strong class="stat-val">{{ state.science }} / {{ mission.scienceTarget }}</strong>
        </div>
        <div class="stat-box">
          <span class="stat-icon">🛡️</span>
          <span class="stat-name">Shelter</span>
          <strong class="stat-val">{{ state.shielding }}</strong>
        </div>
      </div>
    </section>

    <!-- Flight Director Recommendations & Spaceflight Lessons -->
    <div class="coaching-grid">
      <!-- Recommendations -->
      <section
        v-if="debrief?.recommendations && debrief.recommendations.length > 0"
        class="card coaching-card"
        aria-label="Flight Director Recommendations"
      >
        <h3>📋 Flight Director Recommendations</h3>
        <ul>
          <li v-for="(rec, idx) in debrief.recommendations" :key="idx">
            {{ rec }}
          </li>
        </ul>
      </section>

      <!-- Spaceflight Lessons -->
      <section
        v-if="debrief?.lessons && debrief.lessons.length > 0"
        class="card lessons-card"
        aria-label="Spaceflight Lessons"
      >
        <h3>🚀 Real-World Spaceflight Lessons</h3>
        <ul>
          <li v-for="(lesson, idx) in debrief.lessons" :key="idx">
            {{ lesson }}
          </li>
        </ul>
      </section>
    </div>

    <!-- Turn-by-Turn Mission History -->
    <section class="history-section" aria-label="Shift by Shift History">
      <h3>📜 {{ isStationWork ? 'Job-by-Job Mission Timeline' : 'Turn-by-Turn Mission Timeline' }}</h3>

      <!-- Render structured TurnRecords if available -->
      <ol v-if="turnRecords.length > 0" class="timeline-list">
        <li
          v-for="record in turnRecords"
          :key="record.turn"
          class="timeline-item"
        >
          <div class="timeline-header">
            <span class="shift-tag">{{ isStationWork ? 'Job' : 'Shift' }} {{ record.shift }}</span>
            <span class="event-tag">{{ record.eventTitle }}</span>
          </div>

          <div class="choice-made">
            <strong>{{ isStationWork ? 'Work completed:' : 'Decision:' }}</strong> {{ record.choiceLabel }}
          </div>
          <p class="explanation-text">{{ record.explanation }}</p>

          <div v-if="record.hazardNotice" class="hazard-note">
            ⚠️ {{ record.hazardNotice }}
          </div>

          <div class="telemetry-snapshot">
            <span>⚡ {{ record.resources.power }}%</span>
            <span>💨 {{ record.resources.oxygen }}%</span>
            <span>📦 {{ record.resources.supplies }}%</span>
            <span>🔬 {{ record.science }} pts</span>
            <span>🛡️ {{ record.shielding }} shelter</span>
          </div>
        </li>
      </ol>

      <!-- Fallback to plain logs if history is not available -->
      <ul v-else-if="fallbackLogs.length > 0" class="fallback-logs">
        <li v-for="(logMsg, idx) in fallbackLogs" :key="idx">
          {{ logMsg }}
        </li>
      </ul>

      <p v-else class="no-history">{{ isStationWork ? 'No job records logged.' : 'No shift records logged.' }}</p>
    </section>

    <!-- Action: Play Again -->
    <div class="restart-action">
      <button
        type="button"
        class="restart-button"
        @click="onRestart"
      >
        🔄 Play Again (New Mission)
      </button>
    </div>
  </div>
</template>

<style scoped>
.debrief-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.debrief-header {
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  border: 1px solid;
  text-align: center;
}

.header-won {
  background: linear-gradient(180deg, #134233 0%, #0b221a 100%);
  border-color: #22c55e;
  box-shadow: 0 0 25px rgba(34, 197, 94, 0.25);
  position: relative;
  overflow: hidden;
}

.celebration-badge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.medal-ring {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle, #fde047 30%, #ca8a04 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(250, 204, 21, 0.6);
  border: 2px solid #fef08a;
  animation: pulseGlow 2s infinite ease-in-out;
}

.medal-icon {
  font-size: 32px;
}

.medal-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #fde047;
  text-shadow: 0 0 10px rgba(250, 204, 21, 0.4);
}

.stars-row {
  display: flex;
  gap: 4px;
}

.star-icon {
  font-size: 16px;
  animation: starTwinkle 1.5s infinite alternate ease-in-out;
}

@keyframes popIn {
  from {
    transform: scale(0.7);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulseGlow {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 15px rgba(250, 204, 21, 0.5);
  }
  50% {
    transform: scale(1.06);
    box-shadow: 0 0 26px rgba(250, 204, 21, 0.85);
  }
}

@keyframes starTwinkle {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-3px) scale(1.1);
  }
}

.header-lost {
  background: linear-gradient(180deg, #2a1f33 0%, #151624 100%);
  border-color: #818cf8;
}

.status-pill {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  margin-bottom: 0.5rem;
  background: rgba(0, 0, 0, 0.4);
  color: #f8fafc;
}

.debrief-title {
  margin: 0.25rem 0 0.5rem 0;
  font-size: 1.6rem;
  color: #f8fafc;
}

.debrief-summary {
  margin: 0 auto;
  max-width: 650px;
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.5;
}

.cause-card {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  background: #371a1a;
  border: 1px solid #f43f5e;
  border-radius: 10px;
  padding: 0.85rem 1.1rem;
}

.cause-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.cause-content strong {
  display: block;
  color: #fecdd3;
  font-size: 0.92rem;
  margin-bottom: 0.2rem;
}

.cause-content p {
  margin: 0;
  color: #ffe4e6;
  font-size: 0.95rem;
  line-height: 1.4;
}

.final-stats {
  background: #16202c;
  border: 1px solid #334b63;
  border-radius: 10px;
  padding: 1rem 1.25rem;
}

.final-stats h3 {
  margin: 0 0 0.85rem 0;
  font-size: 1.1rem;
  color: #f1f5f9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.65rem;
}

.stat-box {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 0.6rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.stat-box.stat-danger {
  border-color: #ef4444;
  background: #2b1318;
}

.stat-icon {
  font-size: 1.2rem;
}

.stat-name {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
}

.stat-val {
  font-size: 1.05rem;
  color: #f8fafc;
}

.coaching-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.card {
  background: #16202c;
  border: 1px solid #334b63;
  border-radius: 10px;
  padding: 1.1rem;
}

.card h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.05rem;
  color: #f1f5f9;
}

ul {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.45;
}

.history-section {
  background: #141d27;
  border: 1px solid #283749;
  border-radius: 10px;
  padding: 1.1rem;
}

.history-section h3 {
  margin: 0 0 0.85rem 0;
  font-size: 1.1rem;
  color: #f1f5f9;
}

.timeline-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.timeline-item {
  background: #0d1520;
  border: 1px solid #1e2b3b;
  border-left: 4px solid #38bdf8;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
}

.shift-tag {
  background: #1e3a5f;
  color: #7dd3fc;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.event-tag {
  color: #94a3b8;
}

.choice-made {
  color: #f8fafc;
  font-size: 0.95rem;
}

.explanation-text {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.88rem;
  line-height: 1.4;
}

.hazard-note {
  font-size: 0.82rem;
  color: #fcd34d;
  background: #2b1f0c;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #f59e0b;
}

.telemetry-snapshot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: #94a3b8;
  background: #090e17;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.fallback-logs {
  list-style: disc;
  padding-left: 1.25rem;
  color: #cbd5e1;
  font-size: 0.9rem;
}

.no-history {
  margin: 0;
  color: #94a3b8;
  font-size: 0.88rem;
}

.restart-action {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.restart-button {
  background: #0284c7;
  color: #ffffff;
  border: 2px solid #38bdf8;
  font-size: 1.15rem;
  font-weight: 700;
  padding: 0.85rem 2.2rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.restart-button:hover {
  background: #0369a1;
  transform: translateY(-1px);
}

.restart-button:active {
  transform: translateY(1px);
}

.restart-button:focus-visible {
  outline: 3px solid #f6c768;
  outline-offset: 4px;
}

@media (max-width: 480px) {
  .debrief-title {
    font-size: 1.3rem;
  }
  .restart-button {
    width: 100%;
    font-size: 1.05rem;
  }
}
</style>
