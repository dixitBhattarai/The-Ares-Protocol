<script setup lang="ts">
import type { GameAction, GameState, MissionData, MissionEvent } from '../../contracts';
import OnboardingPanel from './OnboardingPanel.vue';
import DecisionPanel from './DecisionPanel.vue';
import PausePanel from './PausePanel.vue';

defineProps<{
  state: Readonly<GameState>;
  mission: MissionData;
  event: MissionEvent | undefined;
}>();

const emit = defineEmits<{
  action: [action: GameAction];
}>();

function onAction(action: GameAction) {
  emit('action', action);
}
</script>

<template>
  <section class="mission-panels-root" aria-label="Mission Interface">
    <!-- Ready / Tutorial Phase -->
    <OnboardingPanel
      v-if="state.phase === 'ready'"
      :mission="mission"
      @action="onAction"
    />

    <!-- Running / Decisions Phase -->
    <DecisionPanel
      v-else-if="state.phase === 'running'"
      :state="state"
      :mission="mission"
      :event="event"
      @action="onAction"
    />

    <!-- Paused Phase -->
    <PausePanel
      v-else-if="state.phase === 'paused'"
      @action="onAction"
    />

    <!-- Terminal Won / Lost Phase (Initial starter view for milestone 1) -->
    <div v-else class="terminal-placeholder">
      <h2>{{ state.phase === 'won' ? '🎉 Outpost Mission Complete!' : 'Mission Concluded — Try Again' }}</h2>
      <p>{{ state.phase === 'won' ? 'Your crew kept its reserves and achieved the science goal.' : 'A life support reserve depleted. Review your choices and try another mission.' }}</p>
      <button class="restart-btn" type="button" @click="onAction({ type: 'RESTART' })">Play Again</button>
    </div>

    <!-- Science Sources & Model Notes (Initial starter view for milestone 1) -->
    <details class="source-notes">
      <summary>Science sources and model notes</summary>
      <p v-if="mission.dataMode === 'authored-demo'">
        Starter demo: all resource values and events are authored game rules. No NASA dataset is loaded yet.
      </p>
      <p v-else>
        Data mode: {{ mission.dataMode }}. Reserve meters are simplified game units, not measured health or radiation risk.
      </p>
      <ul v-if="mission.sources.length > 0">
        <li v-for="source in mission.sources" :key="source.id">
          <a :href="source.url" target="_blank" rel="noreferrer">{{ source.title }}</a> — {{ source.mode }}, retrieved {{ source.retrievedAt }}. {{ source.mapping }}
        </li>
      </ul>
      <p>Educational prototype; not professional astronaut training.</p>
      <p>NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites.</p>
    </details>
  </section>
</template>

<style scoped>
.mission-panels-root {
  padding: 1rem;
  max-width: 72rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.terminal-placeholder {
  background: #16202c;
  border: 1px solid #334b63;
  border-radius: 10px;
  padding: 1.5rem;
  text-align: center;
}

.restart-btn {
  background: #0284c7;
  color: #fff;
  border: 1px solid #38bdf8;
  padding: 0.6rem 1.4rem;
  border-radius: 9999px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 0.75rem;
}

.source-notes {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #94a3b8;
  background: #0d1520;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.source-notes summary {
  cursor: pointer;
  color: #cbd5e1;
  font-weight: 600;
}

.source-notes summary:focus-visible {
  outline: 2px solid #f6c768;
}

.source-notes ul {
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}

.source-notes a {
  color: #38bdf8;
}
</style>
