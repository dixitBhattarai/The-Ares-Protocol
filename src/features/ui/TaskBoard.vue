<script setup lang="ts">
import type { GameAction, GameState, MissionData, StationTask } from '../../contracts';

defineProps<{
  state: Readonly<GameState>;
  mission: MissionData;
  tasks: readonly StationTask[];
  accessible: boolean;
}>();

defineEmits<{
  action: [action: GameAction];
}>();

function stationIcon(station: string): string {
  switch (station) {
    case 'solar': return '⚡';
    case 'greenhouse': return '🌱';
    case 'habitat': return '🛡️';
    default: return '🛰️';
  }
}
</script>

<template>
  <section class="task-board" aria-label="Station work orders">
    <div class="board-header">
      <span class="eyebrow">EXPLORE · WORK · PROTECT</span>
      <h2>Outpost Work Orders</h2>
      <p class="mission-sub">
        Finish {{ mission.maxTurns }} station jobs to complete the expedition. Work restores essential reserves.
      </p>
    </div>

    <!-- Progress tracker badge card -->
    <div class="progress-card">
      <div class="progress-col">
        <span class="progress-label">MISSION PROGRESS</span>
        <span class="progress-value">{{ state.turn }} / {{ mission.maxTurns }} Jobs</span>
      </div>
      <div class="progress-col">
        <span class="progress-label">ACTIVE TIME</span>
        <span class="progress-value">{{ Math.floor(state.taskRun?.elapsed ?? 0) }}s</span>
      </div>
      <div class="progress-col">
        <span class="progress-label">SCIENCE</span>
        <span class="progress-value">{{ state.science }} / {{ mission.scienceTarget }}</span>
      </div>
    </div>

    <div class="alert-info-box">
      <p class="rates">
        ⚙️ <strong>Consumption:</strong> -4 Power, -4 Air, -3 Supplies every 20s. 
        <br />
        ⚠️ <strong>Hazards:</strong> Arrive every 30s. Service the matching module to protect the base.
      </p>
      <p v-if="accessible" class="accessible-pill">
        ♿ Accessible Console Mode: Complete minigames directly from here.
      </p>
    </div>

    <ul class="task-cards-list">
      <li v-for="task in tasks" :key="task.id" :class="['task-card', `task-${task.station}`]">
        <div class="card-top">
          <span :class="['station-badge', `badge-${task.station}`]">
            {{ stationIcon(task.station) }} {{ task.station.toUpperCase() }}
          </span>
          <span class="task-reward-pill">{{ task.benefit }}</span>
        </div>

        <h3 class="task-title">{{ task.title }}</h3>
        
        <p class="prevention-note">
          <span class="shield-icon">🛡️</span> {{ task.prevention }}
        </p>

        <button
          type="button"
          class="start-job-btn"
          @click="$emit('action', { type: 'START_TASK', taskId: task.id })"
        >
          <span>Start Work Order</span>
          <span class="btn-arrow" aria-hidden="true">→</span>
        </button>
      </li>
    </ul>

    <div v-if="state.log.length" class="log-banner" role="status">
      <span class="log-icon">📡</span>
      <span class="log-text">{{ state.log[state.log.length - 1] }}</span>
    </div>

    <div class="board-footer">
      <button
        type="button"
        class="pause-task-btn"
        @click="$emit('action', { type: 'PAUSE' })"
      >
        ⏸️ Pause Mission
      </button>
    </div>
  </section>
</template>

<style scoped>
.task-board {
  padding: 18px;
  color: #e6f3ec;
  font-size: 13px;
  line-height: 1.5;
}

.board-header {
  margin-bottom: 12px;
}

.eyebrow {
  color: #edc68e;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  margin: 0 0 4px 0;
}

h2 {
  font-size: 21px;
  font-weight: 700;
  margin: 0 0 6px 0;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.mission-sub {
  font-size: 12px;
  color: #a9bec7;
  margin: 0;
}

.progress-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: rgba(14, 27, 35, 0.7);
  border: 1px solid #284453;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 12px 0;
  text-align: center;
}

.progress-col {
  display: flex;
  flex-direction: column;
}

.progress-label {
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #7d9ba6;
  font-weight: 700;
}

.progress-value {
  font-size: 14px;
  font-weight: 800;
  color: #8be4cb;
  margin-top: 2px;
}

.alert-info-box {
  background: rgba(22, 40, 50, 0.6);
  border-left: 3px solid #ffbe5e;
  border-radius: 0 6px 6px 0;
  padding: 8px 10px;
  margin-bottom: 14px;
  font-size: 11px;
  color: #cbdbe1;
}

.rates {
  margin: 0;
  line-height: 1.45;
}

.accessible-pill {
  margin: 6px 0 0 0;
  color: #92e29b;
  font-weight: 600;
}

.task-cards-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-card {
  background: linear-gradient(135deg, #1b2f3a 0%, #13222a 100%);
  border: 1px solid #2d4c5c;
  border-radius: 10px;
  padding: 12px;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.task-card:hover {
  transform: translateY(-2px);
  border-color: #5ea8c9;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
}

.task-card.task-solar {
  border-left: 4px solid #ffba42;
}

.task-card.task-greenhouse {
  border-left: 4px solid #48cf7a;
}

.task-card.task-habitat {
  border-left: 4px solid #41b9e6;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.station-badge {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 4px;
}

.badge-solar {
  background: rgba(255, 186, 66, 0.18);
  color: #ffca64;
  border: 1px solid rgba(255, 186, 66, 0.35);
}

.badge-greenhouse {
  background: rgba(72, 207, 122, 0.18);
  color: #72f49f;
  border: 1px solid rgba(72, 207, 122, 0.35);
}

.badge-habitat {
  background: rgba(65, 185, 230, 0.18);
  color: #7de0ff;
  border: 1px solid rgba(65, 185, 230, 0.35);
}

.task-reward-pill {
  font-size: 10px;
  font-weight: 700;
  color: #a7f3d0;
  background: rgba(16, 185, 129, 0.15);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.task-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #ffffff;
}

.prevention-note {
  font-size: 11px;
  color: #a0b6c0;
  margin: 0 0 10px 0;
  line-height: 1.35;
}

.shield-icon {
  font-size: 10px;
}

.start-job-btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  background: #234351;
  color: #e5f6f4;
  border: 1px solid #436d81;
  font-weight: 700;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.start-job-btn:hover {
  background: #315c70;
  border-color: #65b1d4;
  color: #ffffff;
}

.start-job-btn:focus-visible {
  outline: 3px solid #ffbe5e;
  outline-offset: 2px;
}

.btn-arrow {
  font-size: 13px;
  transition: transform 0.15s ease;
}

.start-job-btn:hover .btn-arrow {
  transform: translateX(3px);
}

.log-banner {
  margin-top: 12px;
  padding: 8px 10px;
  background: rgba(10, 20, 26, 0.8);
  border: 1px solid #233e4b;
  border-radius: 6px;
  font-size: 11px;
  color: #8be4cb;
  display: flex;
  gap: 6px;
  align-items: center;
}

.board-footer {
  margin-top: 14px;
}

.pause-task-btn {
  width: 100%;
  padding: 8px;
  background: #192a33;
  color: #9cb5be;
  border: 1px solid #36505e;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pause-task-btn:hover {
  background: #263e4c;
  color: #ffffff;
}
</style>
