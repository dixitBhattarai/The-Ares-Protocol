<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import type { GameState, MissionData, ResourceId } from '../../contracts';

const props = defineProps<{ state: Readonly<GameState>; mission: MissionData }>();

const resourceInfo: Record<ResourceId, { label: string; icon: string }> = {
  power: { label: 'Power', icon: '⚡' },
  oxygen: { label: 'Air', icon: 'O₂' },
  supplies: { label: 'Supplies', icon: '✿' },
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
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">✦</span>
        <div class="mission-heading">
          <span class="eyebrow">ARES · OUTPOST 01</span>
          <strong>SHIFT {{ shift }} <span>OF {{ mission.maxTurns }}</span></strong>
        </div>
      </div>
      <span class="unit-tag">GAME UNITS</span>
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
        :class="[`resource-${resource.id}`, `level-${resource.level.toLowerCase()}`]"
      >
        <div class="reserve-heading">
          <span class="reserve-icon" aria-hidden="true">{{ resource.icon }}</span>
          <span class="reserve-name">{{ resource.label }}</span>
        </div>
        <strong class="reserve-value">{{ resource.value }}<span>/100</span></strong>
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
        <span class="reserve-level"><span class="level-dot" aria-hidden="true" />{{ resource.level }}</span>
      </article>
    </div>

    <div class="secondary-grid">
      <div class="secondary-card science-card">
        <div class="secondary-heading">
          <span class="secondary-icon science-icon" aria-hidden="true">✦</span>
          <span class="secondary-label">SCIENCE</span>
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
          <span class="secondary-icon shelter-icon" aria-hidden="true">⬟</span>
          <span class="secondary-label">SHELTER</span>
          <strong>{{ state.shielding }}<span>/100</span></strong>
        </div>
        <span class="shelter-note">{{ state.shielding >= 60 ? 'Ready for a storm' : state.shielding >= 25 ? 'Some protection' : 'Needs protection' }}</span>
      </div>
    </div>

    <p v-if="state.lastHazardNotice" class="hazard-notice" role="status" aria-live="polite">
      <span class="notice-icon" aria-hidden="true">!</span>
      <span><strong>Hazard update</strong>{{ state.lastHazardNotice }}</span>
    </p>

    <div v-if="delayedEffects.length" class="delayed-effects" aria-label="Upcoming delayed effects">
      <span class="delayed-heading"><span aria-hidden="true">◷</span> COMING UP</span>
      <p v-for="effect in delayedEffects" :key="effect.key" class="delayed-item">
        <span class="delayed-timing">{{ effect.timing }}</span>
        <span>{{ effect.description }}</span>
      </p>
    </div>

    <p v-if="feedback" class="feedback" :class="feedbackTone" aria-live="polite" aria-atomic="true">
      <span class="feedback-mark" aria-hidden="true">{{ feedbackTone === 'cost' ? '−' : feedbackTone === 'gain' ? '+' : '↻' }}</span>
      <span><strong>SHIFT UPDATE</strong>{{ feedback }}</span>
    </p>

    <p class="units-note">Simplified game units · not real spacecraft readings</p>
  </section>
</template>

<style scoped>
.hud {
  --hud-ink: #fff8e9;
  --hud-muted: #c2c2bd;
  --hud-panel: rgb(30 39 44 / 94%);
  --hud-line: #766858;
  box-sizing: border-box;
  position: absolute;
  z-index: 8;
  top: clamp(7rem, 13vh, 8rem);
  right: clamp(.6rem, 2vw, 1.5rem);
  width: min(350px, calc(100vw - 1.2rem));
  padding: .8rem;
  color: var(--hud-ink);
  background: linear-gradient(155deg, rgb(43 52 55 / 97%), var(--hud-panel));
  border: 1px solid #e7c995;
  border-radius: 18px 18px 14px 14px;
  box-shadow: 0 8px 24px rgb(42 27 19 / 30%), inset 0 1px 0 rgb(255 245 220 / 15%);
  backdrop-filter: blur(8px);
  font: 600 .85rem/1.3 system-ui, sans-serif;
  pointer-events: none;
}
.hud-header, .brand, .reserve-heading, .secondary-heading { display: flex; align-items: center; }
.hud-header { justify-content: space-between; gap: .4rem; margin-bottom: .48rem; }
.brand { min-width: 0; gap: .45rem; }
.brand-mark { width: 1.75rem; height: 1.75rem; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid #e3c68f; border-radius: 10px; background: #e8a94b; color: #533c25; font-size: 1.1rem; box-shadow: inset 0 1px 2px #fff7d9; }
.mission-heading { display: grid; gap: .06rem; }
.eyebrow { color: #e7c995; font-size: .58rem; font-weight: 850; letter-spacing: .12em; }
.mission-heading strong { color: #fff7e5; font-size: .92rem; letter-spacing: .05em; }
.mission-heading strong span { color: #c7beb0; font-size: .72em; }
.unit-tag { padding: .24rem .42rem; border: 1px solid #817865; border-radius: 999px; color: #ded4c2; font-size: .55rem; font-weight: 800; letter-spacing: .08em; white-space: nowrap; }
.shift-track { display: block; height: .28rem; overflow: hidden; margin-bottom: .55rem; border: 1px solid #625e54; border-radius: 999px; background: #353d3d; }
.shift-track > span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #e99a42, #ffd56d); box-shadow: 0 0 8px #efb4539c; transition: width 260ms ease; }
.reserve-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .38rem; }
.reserve-card { --reserve-color: #ffc85b; --reserve-back: #55432e; min-width: 0; padding: .46rem; border: 1px solid color-mix(in srgb, var(--reserve-color), transparent 55%); border-radius: 11px; background: linear-gradient(155deg, color-mix(in srgb, var(--reserve-back), #fff 7%), var(--reserve-back)); box-shadow: inset 0 1px 0 rgb(255 255 255 / 8%); }
.resource-power { --reserve-color: #ffc85b; --reserve-back: #55432e; }
.resource-oxygen { --reserve-color: #6ed9f4; --reserve-back: #294854; }
.resource-supplies { --reserve-color: #a4df76; --reserve-back: #354a36; }
.reserve-heading { gap: .25rem; min-height: 1.15rem; }
.reserve-icon { width: 1.2rem; flex: 0 0 auto; color: var(--reserve-color); text-align: center; font-size: .78rem; font-weight: 900; }
.reserve-name { min-width: 0; color: #fff8e9; font-size: .65rem; font-weight: 800; letter-spacing: .025em; overflow-wrap: anywhere; }
.reserve-value { display: block; margin-top: .16rem; color: #fffaf0; font-size: 1.02rem; font-variant-numeric: tabular-nums; line-height: 1.1; }
.reserve-value span { margin-left: .08rem; color: #ded6c8; font-size: .6em; font-weight: 600; }
.reserve-meter { height: .58rem; margin-top: .38rem; overflow: hidden; border: 1px solid rgb(255 255 255 / 18%); border-radius: 999px; background: rgb(12 19 23 / 55%); box-shadow: inset 0 1px 3px rgb(0 0 0 / 35%); }
.reserve-fill { display: block; height: 100%; border-radius: inherit; background: linear-gradient(180deg, color-mix(in srgb, var(--reserve-color), white 22%), var(--reserve-color)); box-shadow: 0 0 9px color-mix(in srgb, var(--reserve-color), transparent 35%); transition: width 320ms cubic-bezier(.2,.8,.2,1); }
.reserve-level { display: flex; align-items: center; gap: .25rem; margin-top: .25rem; color: var(--reserve-color); font-size: .6rem; font-weight: 800; letter-spacing: .03em; }
.level-dot { width: .36rem; height: .36rem; flex: 0 0 auto; border-radius: 50%; background: currentColor; box-shadow: 0 0 5px currentColor; }
.level-watch .reserve-level { color: #ffe18a; }
.level-low .reserve-level, .level-empty .reserve-level { color: #ff9d7e; }
.level-watch .reserve-fill { background: linear-gradient(180deg, #fff0a3, #e7bb4d); }
.level-low .reserve-fill, .level-empty .reserve-fill { background: linear-gradient(180deg, #ffc0a0, #e87958); }
.secondary-grid { display: grid; grid-template-columns: 1fr 1.25fr; gap: .4rem; margin-top: .42rem; }
.secondary-card { min-width: 0; padding: .42rem .5rem; border: 1px solid #69716d; border-radius: 9px; background: rgb(39 49 50 / 88%); }
.secondary-heading { gap: .25rem; }
.secondary-icon { width: .9rem; flex: 0 0 auto; text-align: center; font-size: .75rem; }
.science-icon { color: #a9d4ff; }
.shelter-icon { color: #f0cb8d; }
.secondary-label { flex: 1 1 auto; color: #e2ddd2; font-size: .58rem; font-weight: 850; letter-spacing: .07em; }
.secondary-heading strong { flex: 0 0 auto; color: #fff8e9; font-size: .75rem; font-variant-numeric: tabular-nums; }
.secondary-heading strong span { color: #c7c8c2; font-size: .75em; font-weight: 600; }
.science-track { height: .25rem; margin-top: .28rem; overflow: hidden; border-radius: 999px; background: #444f55; }
.science-track > span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #79b8ef, #c0e1ff); transition: width 260ms ease; }
.shelter-note { display: block; margin-top: .2rem; color: #f0d8b2; font-size: .58rem; font-weight: 650; }
.hazard-notice, .feedback { display: flex; align-items: flex-start; gap: .42rem; margin: .42rem 0 0; padding: .4rem .48rem; border: 1px solid #ab7650; border-radius: 8px; background: rgb(75 49 37 / 92%); color: #fff0db; font-size: .67rem; }
.hazard-notice > span:last-child, .feedback > span:last-child { display: grid; gap: .08rem; }
.hazard-notice strong, .feedback strong { color: #ffcf91; font-size: .58rem; letter-spacing: .07em; }
.notice-icon, .feedback-mark { width: 1rem; height: 1rem; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid currentColor; border-radius: 50%; color: #ffd28c; font-weight: 900; }
.delayed-effects { margin-top: .4rem; padding: .42rem .48rem; border-left: 2px solid #e4b55e; border-radius: 5px; background: rgb(58 58 45 / 92%); }
.delayed-heading { color: #f4d28f; font-size: .58rem; font-weight: 850; letter-spacing: .08em; }
.delayed-item { display: grid; grid-template-columns: auto 1fr; gap: .38rem; margin: .2rem 0 0; color: #f1eee4; font-size: .65rem; }
.delayed-timing { color: #f4d28f; font-weight: 800; white-space: nowrap; }
.feedback { border-color: #657d81; background: rgb(37 57 62 / 94%); }
.feedback.cost { border-color: #c09d57; background: rgb(63 54 39 / 95%); }
.feedback.gain { border-color: #709c68; background: rgb(41 62 43 / 95%); }
.feedback.cost strong { color: #f5d78d; }
.feedback.gain strong { color: #bde9aa; }
.units-note { margin: .38rem 0 0; color: #c7c5bd; font-size: .55rem; letter-spacing: .025em; text-align: right; }
@media (max-width: 420px) {
  .hud { top: clamp(6rem, 14vh, 7rem); right: .45rem; width: min(330px, calc(100vw - .9rem)); padding: .58rem; border-radius: 15px 15px 11px 11px; }
  .reserve-grid { gap: .28rem; }
  .reserve-card { padding: .38rem .34rem; border-radius: 9px; }
  .reserve-heading { gap: .18rem; }
  .reserve-icon { width: .95rem; font-size: .7rem; }
  .reserve-name { font-size: .61rem; }
  .reserve-value { font-size: .92rem; }
  .reserve-meter { height: .5rem; }
  .reserve-level { font-size: .55rem; }
  .secondary-grid { gap: .28rem; }
  .secondary-card { padding: .36rem .4rem; }
  .units-note { font-size: .51rem; }
}
@media (prefers-reduced-motion: reduce) {
  .shift-track > span, .reserve-fill, .science-track > span { transition: none; }
}
</style>
