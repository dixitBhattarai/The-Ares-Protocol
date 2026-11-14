<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import type { GameState, MissionData, ResourceId } from '../../contracts';

const props = defineProps<{ state: Readonly<GameState>; mission: MissionData }>();

const resourceInfo: Record<ResourceId, { label: string; icon: string }> = {
  power: { label: 'Power', icon: '⚡' },
  oxygen: { label: 'Air', icon: '◉' },
  supplies: { label: 'Supplies & food', icon: '▣' },
};

const resources = computed(() => (Object.keys(resourceInfo) as ResourceId[]).map(id => {
  const value = Math.max(0, Math.min(100, props.state.resources[id]));
  const level = value <= 0 ? 'Empty' : value <= 20 ? 'Low' : value <= 45 ? 'Watch' : 'Ready';
  return { id, ...resourceInfo[id], value, level };
}));

const shift = computed(() => Math.min(props.state.turn + 1, props.mission.maxTurns));
const feedback = ref('');
const changeClass = ref('');
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => [props.state.phase, props.state.turn, props.state.resources.power, props.state.resources.oxygen, props.state.resources.supplies, props.state.log.length] as const,
  (next, previous) => {
    if (!previous) return;
    const [phase, turn, power, oxygen, supplies, logLength] = next;
    if (phase === 'ready' && turn === 0 && logLength === 0) {
      feedback.value = 'Mission reset. Your reserves are ready for a new plan.';
      changeClass.value = '';
    } else if (logLength > previous[5]) {
      const changed: string[] = [];
      for (const [id, now, before] of [
        ['power', power, previous[2]], ['oxygen', oxygen, previous[3]], ['supplies', supplies, previous[4]],
      ] as const) {
        if (now !== before) {
          const difference = now - before;
          changed.push(`${resourceInfo[id].label} ${difference > 0 ? 'up' : 'down'} ${Math.abs(difference)}`);
        }
      }
      feedback.value = changed.length ? `${changed.join(' · ')} game units. ${props.state.log[logLength - 1]}` : props.state.log[logLength - 1] ?? '';
      changeClass.value = changed.some(item => item.includes('down')) ? 'cost' : 'gain';
    }
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { changeClass.value = ''; }, 1200);
  },
);
onUnmounted(() => { if (feedbackTimer) clearTimeout(feedbackTimer); });

const phaseLabel = computed(() => ({ ready: 'Ready', running: 'In progress', paused: 'Paused', won: 'Mission complete', lost: 'Mission ended' }[props.state.phase]));

function meterText(value: number, level: string): string {
  return `${value} of 100 simplified game units. ${level}.`;
}
</script>

<template>
  <section class="hud" aria-label="Outpost status">
    <header class="hud-header">
      <div class="mission-progress">
        <span class="eyebrow">MISSION STATUS</span>
        <strong>Shift {{ shift }} <span class="muted">/ {{ mission.maxTurns }}</span></strong>
      </div>
      <span class="phase" :class="`phase-${state.phase}`">{{ phaseLabel }}</span>
    </header>

    <div class="reserve-grid" aria-label="Outpost reserves">
      <article v-for="resource in resources" :key="resource.id" class="reserve-card" :class="`level-${resource.level.toLowerCase()}`">
        <div class="reserve-heading">
          <span class="reserve-icon" aria-hidden="true">{{ resource.icon }}</span>
          <span class="reserve-name">{{ resource.label }}</span>
          <strong class="reserve-value">{{ resource.value }}<span>/100</span></strong>
        </div>
        <div
          class="reserve-meter"
          role="meter"
          :aria-label="`${resource.label} reserve`"
          :aria-valuemin="0"
          :aria-valuemax="100"
          :aria-valuenow="resource.value"
          :aria-valuetext="meterText(resource.value, resource.level)"
        >
          <span class="reserve-fill" :style="{ width: `${resource.value}%` }" />
        </div>
        <span class="reserve-level"><span class="level-dot" aria-hidden="true" />{{ resource.level }} reserve</span>
      </article>
    </div>

    <div class="secondary-grid">
      <div class="secondary-card science-card">
        <span class="secondary-label">Science goal</span>
        <strong>{{ state.science }} <span>/ {{ mission.scienceTarget }}</span></strong>
        <div class="science-track" role="progressbar" aria-label="Science goal progress" :aria-valuemin="0" :aria-valuemax="mission.scienceTarget" :aria-valuenow="Math.min(state.science, mission.scienceTarget)">
          <span :style="{ width: `${mission.scienceTarget > 0 ? Math.min(100, Math.max(0, state.science / mission.scienceTarget * 100)) : 0}%` }" />
        </div>
      </div>
      <div class="secondary-card shelter-card">
        <span class="secondary-label">Shelter plan</span>
        <strong>{{ state.shielding }} <span>/ 100 game units</span></strong>
        <span class="shelter-note">{{ state.shielding >= 60 ? 'Strong preparation' : state.shielding >= 25 ? 'Some preparation' : 'Needs preparation' }}</span>
      </div>
    </div>

    <p v-if="feedback" class="feedback" :class="changeClass" aria-live="polite" aria-atomic="true">
      <span class="feedback-mark" aria-hidden="true">{{ changeClass === 'cost' ? '−' : changeClass === 'gain' ? '+' : '↻' }}</span>
      {{ feedback }}
    </p>
  </section>
</template>

<style scoped>
.hud {
  --hud-ink: #f4f7fb;
  --hud-muted: #aebdca;
  --hud-panel: #142231;
  --hud-line: #344b5d;
  box-sizing: border-box;
  width: min(100%, 760px);
  padding: clamp(.75rem, 2.5vw, 1.1rem);
  color: var(--hud-ink);
  background: var(--hud-panel);
  border: 1px solid var(--hud-line);
  border-radius: 14px;
  font: 500 .9rem/1.35 system-ui, sans-serif;
}
.hud-header, .reserve-heading { display: flex; align-items: center; }
.hud-header { justify-content: space-between; gap: .75rem; margin-bottom: .8rem; }
.mission-progress { display: grid; gap: .12rem; }
.eyebrow { color: var(--hud-muted); font-size: .68rem; font-weight: 750; letter-spacing: .12em; }
.mission-progress strong { font-size: 1.15rem; }
.muted, .reserve-value span, .secondary-card strong span { color: var(--hud-muted); font-size: .78em; font-weight: 500; }
.phase { padding: .28rem .55rem; border: 1px solid var(--hud-line); border-radius: 999px; font-size: .75rem; }
.phase-running { border-color: #75cda9; }
.phase-paused { border-color: #f1c66d; }
.phase-won { border-color: #75cda9; background: #183b32; }
.phase-lost { border-color: #e1a076; }
.reserve-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
.reserve-card, .secondary-card { min-width: 0; padding: .65rem; background: #1b2d3d; border: 1px solid #2d4355; border-radius: 10px; }
.reserve-heading { min-height: 1.5rem; gap: .35rem; }
.reserve-icon { flex: 0 0 auto; color: #dce8ef; font-size: .9rem; }
.reserve-name { flex: 1 1 auto; overflow-wrap: anywhere; font-size: .82rem; font-weight: 700; }
.reserve-value { flex: 0 0 auto; font-variant-numeric: tabular-nums; font-size: .92rem; }
.reserve-meter, .science-track { display: block; overflow: hidden; height: .55rem; margin-top: .55rem; background: #314658; border-radius: 999px; }
.reserve-fill, .science-track span { display: block; height: 100%; background: #72cdaa; border-radius: inherit; transition: width 240ms ease; }
.level-watch .reserve-fill { background: #f0c76d; }
.level-low .reserve-fill, .level-empty .reserve-fill { background: #ed9b73; }
.reserve-level { display: flex; align-items: center; gap: .35rem; margin-top: .4rem; color: #bfe7d7; font-size: .75rem; }
.level-watch .reserve-level { color: #f4d891; }
.level-low .reserve-level, .level-empty .reserve-level { color: #ffc09f; }
.level-dot { width: .45rem; height: .45rem; flex: 0 0 auto; background: currentColor; border-radius: 50%; }
.secondary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; margin-top: .55rem; }
.secondary-card { display: grid; gap: .25rem; }
.secondary-label { color: var(--hud-muted); font-size: .73rem; }
.secondary-card strong { font-size: 1rem; font-variant-numeric: tabular-nums; }
.science-track { height: .35rem; margin-top: .1rem; }
.science-track span { background: #8db5ed; }
.shelter-note { color: #d6e0e8; font-size: .75rem; }
.feedback { display: flex; align-items: flex-start; gap: .5rem; margin: .65rem 0 0; padding: .55rem .65rem; background: #21394a; border-left: 3px solid #8db5ed; border-radius: 5px; color: #e8f0f6; font-size: .8rem; }
.feedback.cost { border-left-color: #f0c76d; }
.feedback.gain { border-left-color: #72cdaa; }
.feedback-mark { flex: 0 0 auto; font-weight: 800; }
@media (max-width: 420px) {
  .hud { padding: .7rem; border-radius: 10px; }
  .reserve-grid { gap: .35rem; }
  .reserve-card { padding: .5rem .4rem; }
  .reserve-heading { flex-wrap: wrap; gap: .2rem .3rem; }
  .reserve-name { flex-basis: calc(100% - 1.2rem); font-size: .76rem; }
  .reserve-value { margin-left: 1.2rem; font-size: .85rem; }
  .reserve-level { font-size: .69rem; }
  .secondary-card { padding: .5rem; }
}
@media (prefers-reduced-motion: reduce) {
  .reserve-fill, .science-track span { transition: none; }
}
</style>
