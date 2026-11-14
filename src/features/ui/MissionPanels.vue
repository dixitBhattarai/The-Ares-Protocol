<script setup lang="ts">
import type { GameAction, GameState, MissionData, MissionEvent } from '../../contracts';
defineProps<{ state: Readonly<GameState>; mission: MissionData; event: MissionEvent | undefined }>();
const emit = defineEmits<{ action: [action: GameAction] }>();
</script>

<template>
  <section class="panel" aria-label="Mission decisions">
    <template v-if="state.phase === 'ready'">
      <h2>Welcome, junior astronaut</h2>
      <p>Keep power, air and supplies above zero for {{ mission.maxTurns }} shifts. Earn {{ mission.scienceTarget }} science points.</p>
      <p>WASD or arrow keys move your astronaut. Use the buttons to make outpost decisions.</p>
      <button @click="emit('action', { type: 'START' })">Start mission</button>
    </template>
    <template v-else-if="state.phase === 'running'">
      <h2>{{ event?.title }}</h2>
      <p>{{ event?.description }}</p>
      <div class="choices">
        <button v-for="choice in event?.choices" :key="choice.id" @click="emit('action', { type: 'CHOOSE', choiceId: choice.id })">
          {{ choice.label }}
          <small>{{ choice.explanation }}</small>
          <small v-for="(change, resource) in choice.effect.resources" :key="resource">{{ resource }} {{ change! > 0 ? '+' : '' }}{{ change }}</small>
          <small v-if="choice.effect.science">Science +{{ choice.effect.science }}</small>
          <small v-if="choice.effect.shielding">Shelter +{{ choice.effect.shielding }}</small>
        </button>
      </div>
      <button @click="emit('action', { type: 'PAUSE' })">Pause</button>
    </template>
    <template v-else-if="state.phase === 'paused'">
      <h2>Mission paused</h2>
      <button @click="emit('action', { type: 'RESUME' })">Resume</button>
    </template>
    <template v-else>
      <h2>{{ state.phase === 'won' ? 'Outpost mission complete!' : 'Try a new mission plan' }}</h2>
      <p>{{ state.phase === 'won' ? 'Your crew kept its reserves and completed the science goal.' : 'Keep every reserve above zero and complete the science goal before the last shift.' }}</p>
      <button @click="emit('action', { type: 'RESTART' })">Play again</button>
    </template>
    <p class="feedback" role="status">{{ state.log.at(-1) }}</p>
    <details>
      <summary>Science sources and model notes</summary>
      <p v-if="mission.dataMode === 'authored-demo'">Starter demo: all resource values and events are authored game rules. No NASA dataset is loaded yet.</p>
      <p v-else>Data mode: {{ mission.dataMode }}. Reserve meters are simplified game units, not measured health or radiation risk.</p>
      <ul><li v-for="source in mission.sources" :key="source.id"><a :href="source.url" target="_blank" rel="noreferrer">{{ source.title }}</a> — {{ source.mode }}, retrieved {{ source.retrievedAt }}. {{ source.mapping }}</li></ul>
      <p>Educational prototype; not professional astronaut training.</p>
      <p>NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites.</p>
    </details>
  </section>
</template>

<style scoped>
.panel { padding: 1rem; max-width: 70rem; margin: auto; }
h2 { margin-top: 0; }
.choices { display: flex; flex-wrap: wrap; gap: .7rem; margin-bottom: 1rem; }
.choices button { flex: 1 1 15rem; text-align: left; }
small { display: block; margin-top: .35rem; }
.feedback { min-height: 1.5rem; color: #f6c768; }
details { font-size: .85rem; color: #cad4df; }
</style>
