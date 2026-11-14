<script setup lang="ts">
import type { GameAction, GameState, MissionData, MissionEvent } from '../../contracts';
import OnboardingPanel from './OnboardingPanel.vue';
import DecisionPanel from './DecisionPanel.vue';
import PausePanel from './PausePanel.vue';
import DebriefPanel from './DebriefPanel.vue';
import SourceCredits from './SourceCredits.vue';

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
    <p v-else-if="state.phase === 'running' && mission.gameplayMode === 'station-tasks'">Visit a station computer or use the work orders to start a job. Completed work earns the reward; there are no decision cards.</p>
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

    <!-- Terminal Won / Lost Phase (Rich Debrief & History) -->
    <DebriefPanel
      v-else
      :state="state"
      :mission="mission"
      @action="onAction"
    />

    <!-- Science Sources, Telemetry Evidence & NASA Attributions -->
    <SourceCredits :mission="mission" />
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

@media (max-width: 480px) {
  .mission-panels-root {
    padding: 0.5rem;
    gap: 1rem;
  }
}
</style>
