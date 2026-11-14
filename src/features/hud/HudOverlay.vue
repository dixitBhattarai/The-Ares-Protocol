<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import type { GameState, MissionData, ResourceId } from '../../contracts';

const props = defineProps<{ state: Readonly<GameState>; mission: MissionData }>();

const resourceInfo: Record<ResourceId, { label: string; icon: string }> = {
  power: { label: 'Power', icon: '⚡' },
  oxygen: { label: 'Breathable air', icon: '◉' },
  supplies: { label: 'Supplies & food', icon: '▣' },
};

const resources = computed(() => (Object.keys(resourceInfo) as ResourceId[]).map(id => {
  const value = Math.max(0, Math.min(100, props.state.resources[id]));
  const level = value <= 0 ? 'Empty' : value <= 20 ? 'Low' : value <= 40 ? 'Watch' : 'Ready';
  return { id, ...resourceInfo[id], value, level };
}));

const shift = computed(() => Math.min(props.state.turn + 1, props.mission.maxTurns));
const shiftPercent = computed(() => props.mission.maxTurns > 0
  ? Math.min(100, Math.max(0, props.state.turn / props.mission.maxTurns * 100))
  : 0);
const sciencePercent = computed(() => props.mission.scienceTarget > 0
  ? Math.min(100, Math.max(0, props.state.science / props.mission.scienceTarget * 100))
  : 0);
const delayedEffects = computed(() => [...(props.state.pendingDelayedEffects ?? [])]
  .sort((a, b) => a.dueTurn - b.dueTurn)
  .map((effect, index) => {
    const shiftsUntil = Math.max(0, effect.dueTurn - props.state.turn);
    return {
      key: `${effect.dueTurn}-${index}`,
      description: effect.description,
      timing: shiftsUntil <= 1 ? 'Next shift' : `In ${shiftsUntil} shifts`,
    };
  }));

const phaseLabels = {
  ready: 'Ready to start',
  running: 'Outpost active',
  paused: 'Mission paused',
  won: 'Mission complete',
  lost: 'Mission ended',
} as const;
const phaseLabel = computed(() => phaseLabels[props.state.phase]);

const feedback = ref('');
const feedbackTone = ref('');
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => [
    props.state.phase,
    props.state.turn,
    props.state.resources.power,
    props.state.resources.oxygen,
    props.state.resources.supplies,
    props.state.shielding,
    props.state.science,
    props.state.log.length,
  ] as const,
  (next, previous) => {
    const [phase, turn, power, oxygen, supplies, shielding, science, logLength] = next;
    if (phase === 'ready' && turn === 0 && logLength === 0) {
      feedback.value = 'Mission reset. Your reserves are ready for a new plan.';
      feedbackTone.value = '';
    } else if (logLength > previous[7]) {
      const changes: string[] = [];
      const resourcesChanged: number[] = [];
      for (const [id, now, before] of [
        ['power', power, previous[2]],
        ['oxygen', oxygen, previous[3]],
        ['supplies', supplies, previous[4]],
      ] as const) {
        const difference = now - before;
        if (difference !== 0) {
          resourcesChanged.push(difference);
          changes.push(`${resourceInfo[id].label} ${difference > 0 ? '+' : '−'}${Math.abs(difference)} game units`);
        }
      }
      if (shielding !== previous[5]) {
        changes.push(`Shelter ${shielding > previous[5] ? '+' : '−'}${Math.abs(shielding - previous[5])} game units`);
      }
      if (science !== previous[6]) {
        changes.push(`Science ${science > previous[6] ? '+' : '−'}${Math.abs(science - previous[6])} points`);
      }
      const explanation = props.state.history?.at(-1)?.explanation;
      feedback.value = changes.length
        ? `${changes.join(' · ')}.${explanation ? ` ${explanation}` : ''}`
        : explanation ?? props.state.log.at(-1) ?? '';
      feedbackTone.value = resourcesChanged.some(value => value < 0) ? 'cost' : resourcesChanged.length ? 'gain' : '';
    }
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { feedbackTone.value = ''; }, 1400);
  },
);
onUnmounted(() => { if (feedbackTimer) clearTimeout(feedbackTimer); });

function meterText(value: number, level: string): string {
  return `${value} of 100 simplified game units. ${level} reserve.`;
}
</script>

<template>
  <section class="hud" aria-label="Outpost status">
    <header class="hud-header">
      <div class="mission-heading">
        <span class="eyebrow"><span class="heading-mark" aria-hidden="true" /> OUTPOST SYSTEMS</span>
        <strong>Shift {{ shift }} <span class="muted">of {{ mission.maxTurns }}</span></strong>
      </div>
      <span class="phase" :class="`phase-${state.phase}`">{{ phaseLabel }}</span>
    </header>

    <div
      class="shift-track"
      role="progressbar"
      aria-label="Mission shifts completed"
      :aria-valuemin="0"
      :aria-valuemax="mission.maxTurns"
      :aria-valuenow="Math.min(state.turn, mission.maxTurns)"
      :aria-valuetext="`${Math.min(state.turn, mission.maxTurns)} of ${mission.maxTurns} shifts completed`"
    >
      <span :style="{ width: `${shiftPercent}%` }" />
    </div>

    <div class="reserve-grid" aria-label="Outpost reserves">
      <article
        v-for="resource in resources"
        :key="resource.id"
        class="reserve-card"
        :class="`level-${resource.level.toLowerCase()}`"
      >
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
        <div class="secondary-heading">
          <span class="secondary-label">Science goal</span>
          <strong>{{ state.science }} <span>/ {{ mission.scienceTarget }}</span></strong>
        </div>
        <div
          class="science-track"
          role="progressbar"
          aria-label="Science goal progress"
          :aria-valuemin="0"
          :aria-valuemax="mission.scienceTarget"
          :aria-valuenow="Math.min(state.science, mission.scienceTarget)"
          :aria-valuetext="`${state.science} of ${mission.scienceTarget} science points`"
        >
          <span :style="{ width: `${sciencePercent}%` }" />
        </div>
      </div>
      <div class="secondary-card shelter-card">
        <div class="secondary-heading">
          <span class="secondary-label">Shelter preparation</span>
          <strong>{{ state.shielding }} <span>/100</span></strong>
        </div>
        <span class="shelter-note">{{ state.shielding >= 60 ? 'Strong preparation' : state.shielding >= 25 ? 'Some preparation' : 'Needs preparation' }}</span>
      </div>
    </div>

    <p v-if="state.lastHazardNotice" class="hazard-notice" role="status" aria-live="polite">
      <span class="notice-icon" aria-hidden="true">!</span>
      <span><strong>Hazard update</strong>{{ state.lastHazardNotice }}</span>
    </p>

    <div v-if="delayedEffects.length" class="delayed-effects" aria-label="Upcoming delayed effects">
      <span class="delayed-heading">Coming up</span>
      <p v-for="effect in delayedEffects" :key="effect.key" class="delayed-item">
        <span class="delayed-timing">{{ effect.timing }}</span>
        <span>{{ effect.description }}</span>
      </p>
    </div>

    <p v-if="feedback" class="feedback" :class="feedbackTone" aria-live="polite" aria-atomic="true">
      <span class="feedback-mark" aria-hidden="true">{{ feedbackTone === 'cost' ? '−' : feedbackTone === 'gain' ? '+' : '↻' }}</span>
      <span><strong>Shift update</strong>{{ feedback }}</span>
    </p>

    <p class="units-note">These are simplified game units, not real spacecraft readings.</p>
  </section>
</template>

<style scoped>
.hud {
  --hud-ink: #f1f5f9;
  --hud-muted: #aebdca;
  --hud-panel: #151f2b;
  --hud-card: #1c2b39;
  --hud-line: #364553;
  --hud-warm: #f0c875;
  box-sizing: border-box;
  width: min(100%, 760px);
  margin: 0 auto;
  padding: clamp(.75rem, 2.5vw, 1rem);
  color: var(--hud-ink);
  background: var(--hud-panel);
  border: 1px solid var(--hud-line);
  border-top: 2px solid #9c7252;
  border-radius: 12px;
  font: 500 .9rem/1.4 system-ui, sans-serif;
}
.hud-header, .reserve-heading, .secondary-heading { display: flex; align-items: center; }
.hud-header { justify-content: space-between; gap: .75rem; margin-bottom: .45rem; }
.mission-heading { display: grid; gap: .08rem; }
.eyebrow { display: flex; align-items: center; gap: .4rem; color: #d4b385; font-size: .66rem; font-weight: 750; letter-spacing: .13em; }
.heading-mark { width: .42rem; height: .42rem; background: var(--hud-warm); border-radius: 50%; box-shadow: 0 0 0 3px #f0c87524; }
.mission-heading strong { font-size: 1.1rem; }
.muted, .reserve-value span, .secondary-heading strong span { color: var(--hud-muted); font-size: .78em; font-weight: 500; }
.phase { padding: .27rem .55rem; border: 1px solid #52616e; border-radius: 999px; color: #e1e8ee; font-size: .73rem; white-space: nowrap; }
.phase-running { border-color: #6aab8f; }
.phase-paused { border-color: #c09d55; color: #ffe4a6; }
.phase-won { border-color: #6aab8f; background: #20392f; }
.phase-lost { border-color: #c88768; color: #ffd2ba; }
.shift-track, .reserve-meter, .science-track { display: block; overflow: hidden; height: .42rem; background: #354451; border-radius: 999px; }
.shift-track { height: .22rem; margin-bottom: .7rem; }
.shift-track > span, .reserve-fill, .science-track > span { display: block; height: 100%; border-radius: inherit; transition: width 240ms ease; }
.shift-track > span { background: #c69c68; }
.reserve-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; }
.reserve-card, .secondary-card { min-width: 0; padding: .6rem; background: var(--hud-card); border: 1px solid #354451; border-radius: 9px; }
.reserve-heading { min-height: 1.45rem; gap: .3rem; }
.reserve-icon { flex: 0 0 auto; color: #e8d2ac; font-size: .86rem; }
.reserve-name { flex: 1 1 auto; overflow-wrap: anywhere; color: #e5ebf0; font-size: .78rem; font-weight: 700; }
.reserve-value { flex: 0 0 auto; font-size: .9rem; font-variant-numeric: tabular-nums; }
.reserve-meter { margin-top: .5rem; }
.reserve-fill { background: #78b899; }
.level-watch .reserve-fill { background: #d5b365; }
.level-low .reserve-fill, .level-empty .reserve-fill { background: #d98e6c; }
.reserve-level { display: flex; align-items: center; gap: .35rem; margin-top: .38rem; color: #b8dfcb; font-size: .72rem; }
.level-watch .reserve-level { color: #f0d797; }
.level-low .reserve-level, .level-empty .reserve-level { color: #f3b79a; }
.level-dot { width: .43rem; height: .43rem; flex: 0 0 auto; background: currentColor; border-radius: 50%; }
.secondary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; margin-top: .5rem; }
.secondary-card { display: grid; gap: .3rem; }
.secondary-heading { justify-content: space-between; gap: .35rem; }
.secondary-label { color: var(--hud-muted); font-size: .72rem; }
.secondary-heading strong { flex: 0 0 auto; font-size: .9rem; font-variant-numeric: tabular-nums; }
.science-track { height: .32rem; }
.science-track > span { background: #9bbbe2; }
.shelter-note { color: #d6e0e8; font-size: .73rem; }
.hazard-notice, .feedback { display: flex; align-items: flex-start; gap: .55rem; margin: .55rem 0 0; padding: .55rem .65rem; border-radius: 7px; color: #f1f4f6; font-size: .78rem; }
.hazard-notice { background: #453429; border: 1px solid #896749; }
.hazard-notice > span:last-child, .feedback > span:last-child { display: grid; gap: .1rem; }
.hazard-notice strong, .feedback strong { color: #f4d49e; font-size: .7rem; letter-spacing: .05em; text-transform: uppercase; }
.notice-icon, .feedback-mark { flex: 0 0 auto; width: 1.2rem; height: 1.2rem; display: grid; place-items: center; border: 1px solid currentColor; border-radius: 50%; color: #ffd28c; font-weight: 800; }
.delayed-effects { margin-top: .55rem; padding: .55rem .65rem; background: #26313a; border-left: 2px solid #c69c68; border-radius: 4px; }
.delayed-heading { color: #e8c58d; font-size: .7rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.delayed-item { display: grid; grid-template-columns: auto 1fr; gap: .45rem; margin: .28rem 0 0; color: #e1e7eb; font-size: .77rem; }
.delayed-timing { color: #f0d49f; font-weight: 700; white-space: nowrap; }
.feedback { background: #243745; border: 1px solid #3d586a; }
.feedback.cost { border-color: #967c48; background: #37352e; }
.feedback.gain { border-color: #4d8167; background: #23372f; }
.feedback.cost strong { color: #f1d18a; }
.feedback.gain strong { color: #a8dec1; }
.units-note { margin: .5rem 0 0; color: #9eacb8; font-size: .68rem; }
@media (max-width: 420px) {
  .hud { padding: .65rem; border-radius: 9px; }
  .reserve-grid { gap: .32rem; }
  .reserve-card { padding: .47rem .38rem; }
  .reserve-heading { flex-wrap: wrap; gap: .18rem .28rem; }
  .reserve-name { flex-basis: calc(100% - 1.1rem); font-size: .73rem; }
  .reserve-value { margin-left: 1.1rem; font-size: .82rem; }
  .reserve-level { font-size: .67rem; }
  .secondary-card { padding: .48rem; }
  .secondary-label { font-size: .68rem; }
  .secondary-heading strong { font-size: .82rem; }
}
@media (prefers-reduced-motion: reduce) {
  .shift-track > span, .reserve-fill, .science-track > span { transition: none; }
}
</style>
