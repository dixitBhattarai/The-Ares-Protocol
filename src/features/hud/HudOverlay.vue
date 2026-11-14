<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { GameState, MissionData, ResourceId } from '../../contracts';

const props = defineProps<{ state: Readonly<GameState>; mission: MissionData }>();
const hudTarget = ref<string | HTMLElement>('body');

onMounted(() => {
  const gameScreen = document.querySelector<HTMLElement>('.world-panel .viewport');
  if (gameScreen) hudTarget.value = gameScreen;
});

const resourceInfo: Record<ResourceId, { label: string }> = {
  power: { label: 'Power' },
  oxygen: { label: 'Air' },
  supplies: { label: 'Supplies' },
};

type ReserveMotion = { direction: 'up' | 'down' | ''; key: number; fullKey: number; reachedFull: boolean };
type ProgressStat = 'science' | 'shelter';
type StatPop = { key: number; from: number; to: number; max: number };
const reserveMotion = ref<Record<ResourceId, ReserveMotion>>({
  power: { direction: '', key: 0, fullKey: 0, reachedFull: false },
  oxygen: { direction: '', key: 0, fullKey: 0, reachedFull: false },
  supplies: { direction: '', key: 0, fullKey: 0, reachedFull: false },
});
const reserveTimers: Partial<Record<ResourceId, ReturnType<typeof setTimeout>>> = {};
const statPops = ref<Record<ProgressStat, StatPop | null>>({ science: null, shelter: null });
const statPopTimers: Partial<Record<ProgressStat, ReturnType<typeof setTimeout>>> = {};
const expandedStat = ref<ProgressStat | null>(null);
const pinnedStat = ref<ProgressStat | null>(null);
const focusedStat = ref<ProgressStat | null>(null);
let statPopKey = 0;

const resources = computed(() => (Object.keys(resourceInfo) as ResourceId[]).map(id => {
  const value = Math.max(0, Math.min(100, props.state.resources[id]));
  const level = value <= 0 ? 'Empty' : value <= 20 ? 'Low' : value <= 40 ? 'Watch' : 'Ready';
  return { id, ...resourceInfo[id], value, level, motion: reserveMotion.value[id] };
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
const hazardToast = ref<{ key: number; text: string } | null>(null);
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
let reserveTimer: ReturnType<typeof setTimeout> | undefined;
let hazardTimer: ReturnType<typeof setTimeout> | undefined;
let hazardKey = 0;

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
    const reserveChanges: Array<[ResourceId, number, number]> = [
      ['power', power, previous[2]],
      ['oxygen', oxygen, previous[3]],
      ['supplies', supplies, previous[4]],
    ];
    const motion = { ...reserveMotion.value };
    for (const [id, now, before] of reserveChanges) {
      if (now === before) continue;
      const reachedFull = before < 100 && now >= 100;
      motion[id] = {
        direction: now > before ? 'up' : 'down',
        key: motion[id].key + 1,
        fullKey: motion[id].fullKey + Number(reachedFull),
        reachedFull,
      };
      if (reserveTimers[id]) clearTimeout(reserveTimers[id]);
      reserveTimers[id] = setTimeout(() => {
        reserveMotion.value = {
          ...reserveMotion.value,
          [id]: { ...reserveMotion.value[id], direction: '', reachedFull: false },
        };
        delete reserveTimers[id];
      }, reachedFull ? 900 : 620);
    }
    reserveMotion.value = motion;

    const showProgressPop = (id: ProgressStat, before: number, now: number, max: number) => {
      if (now <= before) return;
      statPops.value = {
        ...statPops.value,
        [id]: { key: ++statPopKey, from: before, to: now, max },
      };
      if (statPopTimers[id]) clearTimeout(statPopTimers[id]);
      statPopTimers[id] = setTimeout(() => {
        statPops.value = { ...statPops.value, [id]: null };
        delete statPopTimers[id];
      }, 1450);
    };
    showProgressPop('science', previous[6], science, props.mission.scienceTarget);
    showProgressPop('shelter', previous[5], shielding, 100);

    if (phase === 'ready' && turn === 0 && logLength === 0) {
      feedback.value = 'Mission reset. Your reserves are ready for a new plan.';
      feedbackTone.value = '';
    } else if (logLength > previous[7]) {
      const changes: string[] = [];
      const resourcesChanged: number[] = [];
      for (const [id, now, before] of reserveChanges) {
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

watch(
  () => [props.state.lastHazardNotice, props.state.turn] as const,
  ([notice], [previousNotice, previousTurn]) => {
    if (!notice || (notice === previousNotice && props.state.turn === previousTurn)) return;
    hazardToast.value = { key: ++hazardKey, text: notice };
    if (hazardTimer) clearTimeout(hazardTimer);
    hazardTimer = setTimeout(() => { hazardToast.value = null; }, 5200);
  },
);

onUnmounted(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  for (const timer of Object.values(reserveTimers)) if (timer) clearTimeout(timer);
  for (const timer of Object.values(statPopTimers)) if (timer) clearTimeout(timer);
  if (hazardTimer) clearTimeout(hazardTimer);
});

function meterText(value: number, level: string): string {
  return `${value} of 100 simplified game units. ${level} reserve.`;
}

function openStat(id: ProgressStat): void {
  expandedStat.value = id;
}

function closeStat(id: ProgressStat): void {
  if (focusedStat.value === id) return;
  expandedStat.value = pinnedStat.value ?? null;
}

function focusStat(id: ProgressStat): void {
  focusedStat.value = id;
  expandedStat.value = id;
}

function blurStat(id: ProgressStat): void {
  if (focusedStat.value !== id) return;
  focusedStat.value = null;
  if (expandedStat.value === id) expandedStat.value = pinnedStat.value ?? null;
}

function toggleStat(id: ProgressStat): void {
  pinnedStat.value = pinnedStat.value === id ? null : id;
  expandedStat.value = id;
}
</script>

<template>
  <Teleport :to="hudTarget">
  <section v-if="state.phase === 'running'" class="hud" aria-label="Outpost status">
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
        :class="[`resource-${resource.id}`, `level-${resource.level.toLowerCase()}`, `motion-${resource.motion.direction}`, { 'low-pulse': resource.value <= 20 }]"
      >
        <div class="reserve-icon-wrap">
          <span class="reserve-icon" tabindex="0" role="img" :aria-label="resource.label">
            <svg v-if="resource.id === 'power'" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.4 2.8 5.8 13h5.1l-.5 8.2L18.2 10h-5.1l.3-7.2Z" /></svg>
            <svg v-else-if="resource.id === 'oxygen'" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 17h8" /></svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.2-7-10.1A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.9C19 16.8 12 21 12 21Z" /><path d="M12 8c-2.5 2-2.5 4.5 0 7m0-4c2 0 3.2-1 4-2" /></svg>
          </span>
          <span class="icon-tooltip" role="tooltip">{{ resource.label }}</span>
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
          <span
            :key="`${resource.id}-${resource.motion.key}-${resource.motion.fullKey}`"
            class="reserve-fill"
            :class="[`fill-${resource.motion.direction}`, { 'fill-full': resource.motion.reachedFull }]"
            :style="{ width: `${resource.value}%` }"
          />
        </div>
        <strong class="reserve-value" :aria-label="`${resource.value} out of 100 game units`">{{ resource.value }}</strong>
      </article>
    </div>

    <div class="secondary-grid">
      <div class="stat-widget science-widget" :class="{ 'is-expanded': expandedStat === 'science' }" @mouseenter="openStat('science')" @mouseleave="closeStat('science')">
        <span v-if="statPops.science" :key="statPops.science.key" class="progress-pop science-pop" aria-hidden="true"><span class="progress-numerator"><span class="count-old">{{ statPops.science.from }}</span><span class="count-new">{{ statPops.science.to }}</span></span><span class="progress-denominator">/{{ statPops.science.max }}</span></span>
        <div class="stat-detail" :aria-hidden="expandedStat !== 'science'">
          <span class="secondary-label">SCIENCE GOAL</span>
          <strong class="stat-value">{{ state.science }} <span>/ {{ mission.scienceTarget }}</span></strong>
          <div
            id="science-progress-detail"
            class="science-track"
            role="progressbar"
            aria-label="Science goal progress"
            :aria-valuemin="0"
            :aria-valuemax="mission.scienceTarget"
            :aria-valuenow="Math.min(state.science, mission.scienceTarget)"
            :aria-valuetext="`${state.science} of ${mission.scienceTarget} science points`"
          ><span :style="{ width: `${sciencePercent}%` }" /></div>
        </div>
        <button class="stat-icon-button science-icon" type="button" :aria-label="`Science goal, ${state.science} of ${mission.scienceTarget}`" :aria-expanded="expandedStat === 'science'" aria-controls="science-progress-detail" @click="toggleStat('science')" @focus="focusStat('science')" @blur="blurStat('science')">
          <span aria-hidden="true">✦</span>
        </button>
      </div>
      <div class="stat-widget shelter-widget" :class="{ 'is-expanded': expandedStat === 'shelter' }" @mouseenter="openStat('shelter')" @mouseleave="closeStat('shelter')">
        <span v-if="statPops.shelter" :key="statPops.shelter.key" class="progress-pop shelter-pop" aria-hidden="true"><span class="progress-numerator"><span class="count-old">{{ statPops.shelter.from }}</span><span class="count-new">{{ statPops.shelter.to }}</span></span><span class="progress-denominator">/100</span></span>
        <div class="stat-detail" :aria-hidden="expandedStat !== 'shelter'">
          <span class="secondary-label">SHELTER</span>
          <strong class="stat-value">{{ state.shielding }}<span> / 100</span></strong>
          <div
            id="shelter-progress-detail"
            class="shelter-track"
            role="meter"
            aria-label="Shelter protection"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="state.shielding"
            :aria-valuetext="`${state.shielding} of 100 protection. ${state.shielding >= 60 ? 'Ready for a storm' : state.shielding >= 25 ? 'Some protection' : 'Needs protection'}`"
          ><span :style="{ width: `${state.shielding}%` }" /></div>
          <span class="shelter-note">{{ state.shielding >= 60 ? 'Storm ready' : state.shielding >= 25 ? 'Some protection' : 'Needs protection' }}</span>
        </div>
        <button class="stat-icon-button shelter-icon" type="button" :aria-label="`Shelter protection, ${state.shielding} of 100`" :aria-expanded="expandedStat === 'shelter'" aria-controls="shelter-progress-detail" @click="toggleStat('shelter')" @focus="focusStat('shelter')" @blur="blurStat('shelter')">
          <span aria-hidden="true">⬟</span>
        </button>
      </div>
    </div>

    <div v-if="delayedEffects.length" class="delayed-effects" aria-label="Upcoming delayed effects">
      <span class="delayed-heading"><span aria-hidden="true">◷</span> COMING UP</span>
      <p v-for="effect in delayedEffects" :key="effect.key" class="delayed-item">
        <span class="delayed-timing">{{ effect.timing }}</span>
        <span>{{ effect.description }}</span>
      </p>
    </div>

        <p v-if="feedback" class="feedback" :class="feedbackTone" aria-live="polite" aria-atomic="true">
      <span class="feedback-mark" aria-hidden="true">{{ feedbackTone === 'cost' ? '−' : feedbackTone === 'gain' ? '+' : '↻' }}</span>
          <span class="feedback-copy"><strong>SHIFT UPDATE</strong><span>{{ feedback }}</span></span>
    </p>

    <p class="units-note">Simplified game units · not real spacecraft readings</p>
  </section>
  </Teleport>
  <Teleport to="body">
    <div v-if="hazardToast && state.phase === 'running'" :key="hazardToast.key" class="achievement-toast" role="status" aria-live="polite" aria-atomic="true">
      <span class="toast-medal" aria-hidden="true"><span>!</span></span>
      <span class="toast-copy">
        <strong>✦ MISSION UPDATE ✦</strong>
        <span>{{ hazardToast.text }}</span>
      </span>
      <span class="toast-spark" aria-hidden="true">✦</span>
    </div>
  </Teleport>
</template>

<style scoped>
:global(.world-panel .viewport) { position: relative; }
.hud {
  --hud-ink: #fff8e9;
  box-sizing: border-box;
  position: absolute;
  z-index: 5;
  inset: 0;
  width: auto;
  height: auto;
  padding: 0;
  color: var(--hud-ink);
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;
  font: 600 .78rem/1.3 system-ui, sans-serif;
  pointer-events: none;
}
.hud-header, .brand, .secondary-heading { display: flex; align-items: center; }
.brand, .secondary-heading { display: flex; align-items: center; }
.hud-header { position: absolute; top: 56px; left: 14px; justify-content: space-between; gap: .35rem; margin: 0; }
.brand { min-width: 0; gap: .35rem; }
.brand-mark { display: none; }
.mission-heading { display: grid; gap: .02rem; }
.eyebrow { display: none; }
.mission-heading strong { color: #fff8e9; font-size: .72rem; letter-spacing: .05em; text-shadow: 0 1px 5px #21191c; }
.mission-heading strong span { color: #e8ddca; font-size: .72em; }
.unit-tag { display: none; }
.shift-track { position: absolute; top: 78px; left: 14px; display: block; width: min(135px, calc(100% - 28px)); height: .18rem; overflow: hidden; margin: 0; border: 1px solid rgb(255 245 220 / 45%); border-radius: 999px; background: rgb(10 19 24 / 22%); }
.shift-track > span { display: block; height: 100%; border-radius: inherit; background: #f4c86d; box-shadow: 0 0 7px #efb4539c; transition: width 260ms ease; }
.reserve-grid { position: absolute; left: 14px; bottom: 42px; display: grid; grid-template-columns: minmax(0, 1fr); gap: .34rem; width: min(230px, calc(100% - 28px)); }
.reserve-card { --reserve-color: #ffd36f; display: grid; grid-template-columns: 22px minmax(0, 1fr) 27px; align-items: center; gap: .48rem; min-width: 0; min-height: 21px; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
.resource-power { --reserve-color: #ffd36f; }
.resource-oxygen { --reserve-color: #8ce8ff; }
.resource-supplies { --reserve-color: #b8ec91; }
.reserve-icon-wrap { position: relative; display: grid; place-items: center; width: 22px; height: 22px; background: transparent; border: 0; border-radius: 0; pointer-events: auto; transform-origin: center; }
.reserve-icon { display: grid; place-items: center; width: 100%; height: 100%; color: var(--reserve-color); cursor: help; filter: drop-shadow(0 1px 3px rgb(0 0 0 / 65%)); }
.reserve-icon-wrap:hover, .reserve-icon:focus-visible { animation: reserve-hover-bop .38s cubic-bezier(.2,.8,.2,1); }
.reserve-icon svg { display: block; width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.65; }
.reserve-icon:focus-visible { outline: 2px solid #fff1ba; outline-offset: 2px; }
.icon-tooltip { position: absolute; z-index: 12; left: 50%; bottom: calc(100% + .35rem); padding: .2rem .42rem; border: 1px solid color-mix(in srgb, var(--reserve-color), transparent 35%); border-radius: 5px; background: rgb(22 31 37 / 92%); color: #fff8e9; box-shadow: 0 3px 10px rgb(0 0 0 / 28%); font-size: .66rem; font-weight: 800; white-space: nowrap; opacity: 0; transform: translate(-50%, .2rem) scale(.94); pointer-events: none; transition: opacity 120ms ease, transform 120ms ease; }
.reserve-icon-wrap:hover .icon-tooltip, .reserve-icon:focus-visible + .icon-tooltip { opacity: 1; transform: translate(-50%, 0) scale(1); }
.reserve-meter { grid-column: 2; grid-row: 1; height: 8px; overflow: hidden; border: 1px solid rgb(255 255 255 / 34%); border-radius: 999px; background: rgb(6 14 18 / 22%); box-shadow: inset 0 1px 2px rgb(0 0 0 / 20%); pointer-events: auto; transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
.reserve-card:has(.reserve-meter:hover) .reserve-meter { transform: scaleY(1.35); border-color: color-mix(in srgb, var(--reserve-color), white 30%); box-shadow: 0 0 10px color-mix(in srgb, var(--reserve-color), transparent 55%), inset 0 1px 2px rgb(0 0 0 / 20%); }
.reserve-card:has(.reserve-meter:hover) .reserve-icon-wrap { animation: reserve-hover-bop .38s cubic-bezier(.2,.8,.2,1); }
.reserve-fill { position: relative; display: block; height: 100%; min-width: 0; border-radius: inherit; background: color-mix(in srgb, var(--reserve-color), transparent 12%); box-shadow: 0 0 8px color-mix(in srgb, var(--reserve-color), transparent 35%); transition: width 440ms cubic-bezier(.2,.8,.2,1); }
.reserve-fill::after { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(110deg, transparent 20%, rgb(255 255 255 / 75%) 50%, transparent 80%); content: ''; opacity: 0; }
.reserve-value { grid-column: 3; grid-row: 1; color: #fff8e9; font-size: .66rem; font-variant-numeric: tabular-nums; text-align: right; text-shadow: 0 1px 4px #171317; }
.motion-up { animation: reserve-pop .45s cubic-bezier(.2,.8,.2,1); }
.motion-down { animation: reserve-shimmy .38s ease-in-out; }
.fill-up::after { animation: reserve-shine .55s ease-out; }
.fill-full::after { animation: reserve-shine .72s cubic-bezier(.2,.8,.2,1); }
.fill-down { filter: saturate(1.3) brightness(1.18); }
.low-pulse .reserve-meter { animation: reserve-critical-pulse 1.1s ease-in-out infinite; }
.level-watch .reserve-fill { background: color-mix(in srgb, #ffe18a, transparent 12%); }
.level-low .reserve-fill, .level-empty .reserve-fill { background: color-mix(in srgb, #ff9d7e, transparent 12%); }
.secondary-grid { position: absolute; right: 18px; bottom: 42px; display: grid; justify-items: end; gap: .34rem; width: auto; margin: 0; }
.stat-widget { position: relative; box-sizing: border-box; display: flex; align-items: center; justify-content: flex-end; gap: .28rem; width: 2.4rem; min-height: 2.4rem; overflow: visible; color: #f1eee5; transition: width 420ms cubic-bezier(.2,.85,.25,1); }
.stat-widget.is-expanded { width: min(190px, calc(100vw - 34px)); }
.stat-detail { box-sizing: border-box; display: grid; justify-items: end; align-content: center; gap: .12rem; width: 0; overflow: hidden; opacity: 0; text-align: right; transform: translateX(8px); transition: width 380ms cubic-bezier(.2,.85,.25,1), opacity 180ms ease, transform 380ms cubic-bezier(.2,.85,.25,1); pointer-events: none; }
.stat-widget.is-expanded .stat-detail { width: calc(100% - 2.4rem); overflow: visible; opacity: 1; transform: translateX(0); }
.secondary-label { color: #e1ddcf; font-size: .5rem; font-weight: 800; letter-spacing: .08em; text-shadow: 0 1px 3px #171317; white-space: nowrap; }
.stat-value { color: #f1eee5; font-size: .82rem; line-height: 1.05; font-variant-numeric: tabular-nums; text-shadow: 0 1px 3px #171317; white-space: nowrap; }
.stat-value span { color: #d5d0c5; font-size: .72em; }
.science-track, .shelter-track { display: block; box-sizing: border-box; width: 100%; height: 4px; overflow: hidden; margin: .1rem 0 0 auto; border: 1px solid rgb(255 255 255 / 27%); border-radius: 999px; background: transparent; }
.science-track > span, .shelter-track > span { display: block; height: 100%; border-radius: inherit; transition: width 360ms cubic-bezier(.2,.8,.2,1); }
.science-track > span { background: #a8c9e6; }
.shelter-track > span { background: #d5bd96; }
.shelter-note { display: block; margin: .04rem 0 0; color: #e2d7c5; font-size: .52rem; font-weight: 650; letter-spacing: .01em; text-shadow: 0 1px 3px #171317; white-space: nowrap; }
.stat-icon-button { position: relative; z-index: 1; display: grid; place-items: center; flex: 0 0 2.4rem; width: 2.4rem; height: 2.4rem; padding: 0; border: 1px solid color-mix(in srgb, currentColor, transparent 52%); border-radius: 50%; background: transparent; color: #d6d1c6; font: inherit; cursor: pointer; pointer-events: auto; transition: color 180ms ease, transform 240ms cubic-bezier(.2,.85,.25,1), border-color 180ms ease; }
.stat-icon-button > span { display: grid; place-items: center; width: 100%; height: 100%; font-size: 1.08rem; filter: drop-shadow(0 1px 2px rgb(0 0 0 / 45%)); }
.stat-icon-button:hover, .stat-widget.is-expanded .stat-icon-button { color: #fff3d4; transform: scale(1.08); }
.stat-icon-button:hover > span, .stat-icon-button:focus-visible > span { animation: stat-icon-spin .5s cubic-bezier(.2,.8,.2,1) both; }
.stat-icon-button:focus-visible { outline: 2px solid #fff1ba; outline-offset: 2px; }
.science-icon { color: #bfd5e8; }
.shelter-icon { color: #dfcba9; }
.progress-pop { position: absolute; z-index: 3; top: -.92rem; right: .28rem; display: flex; align-items: center; gap: .02rem; color: #f4f0e7; font-size: .76rem; font-weight: 800; line-height: 1; white-space: nowrap; text-shadow: 0 1px 4px rgb(0 0 0 / 85%); transform-origin: 85% 100%; animation: progress-pop-in .32s cubic-bezier(.18,1.4,.42,1) both, progress-pop-away .24s 1.22s ease-in forwards; pointer-events: none; }
.progress-numerator { position: relative; display: grid; min-width: .62em; height: 1em; overflow: hidden; place-items: center; font-variant-numeric: tabular-nums; }
.count-old, .count-new { grid-area: 1 / 1; }
.count-old { animation: count-roll-away .3s .22s cubic-bezier(.4,0,.7,.2) both; }
.count-new { color: #fff8e8; animation: count-roll-in .34s .22s cubic-bezier(.2,.9,.25,1.2) both; }
.progress-denominator { display: inline-block; color: #e1ddd4; font-size: .72em; font-weight: 650; animation: denominator-nudge .28s .2s ease-out both; }
.science-pop { color: #d9ebfa; }
.shelter-pop { color: #eee1c9; }
.feedback { position: absolute; top: 88px; left: 14px; display: flex; align-items: flex-start; gap: .32rem; width: min(240px, calc(100% - 28px)); margin: 0; padding: 0; border: 0; background: transparent; color: #fff0db; font-size: .58rem; line-height: 1.3; text-shadow: 0 1px 4px #171317; }
.feedback-copy { display: grid; gap: .08rem; min-width: 0; }
.feedback-copy > span { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.feedback strong { color: #ffcf91; font-size: .49rem; letter-spacing: .06em; }
.feedback-mark { width: .75rem; height: .75rem; display: grid; place-items: center; flex: 0 0 auto; color: #ffd28c; font-weight: 900; }
.delayed-effects { position: absolute; top: 132px; left: 14px; width: min(240px, calc(100% - 28px)); margin: 0; color: #fff1cf; text-shadow: 0 1px 4px #171317; }
.delayed-heading { color: #f4d28f; font-size: .49rem; font-weight: 850; letter-spacing: .08em; }
.delayed-item { display: grid; grid-template-columns: auto 1fr; gap: .3rem; margin: .12rem 0 0; color: #fff8e9; font-size: .56rem; }
.delayed-timing { color: #f4d28f; font-weight: 800; white-space: nowrap; }
.units-note { display: none; }
.achievement-toast { --toast-gold: #f3c76f; box-sizing: border-box; position: fixed; z-index: 1000; top: 48%; left: 50%; display: grid; grid-template-columns: 3.1rem minmax(0, 1fr) 1rem; align-items: center; gap: .85rem; width: min(440px, calc(100vw - 2rem)); min-height: 104px; padding: .8rem 1rem; border: 2px solid #f4d48e; border-radius: 12px; background: linear-gradient(110deg, rgb(60 48 34 / 98%), rgb(35 43 42 / 98%) 45%, rgb(30 37 40 / 98%)); color: #fff8e8; box-shadow: 0 18px 70px rgb(0 0 0 / 52%), 0 0 24px rgb(244 196 104 / 25%), inset 0 1px 0 rgb(255 248 220 / 22%); font: 650 .9rem/1.4 system-ui, sans-serif; animation: toast-in .52s cubic-bezier(.16,1.35,.4,1) both, toast-pulse .95s .55s 3 ease-in-out, toast-out .42s 4.75s ease-in forwards; }
.achievement-toast::before, .achievement-toast::after { position: absolute; width: 9px; height: 9px; border: 1px solid var(--toast-gold); background: #624b31; content: ''; transform: rotate(45deg); }
.achievement-toast::before { top: -6px; left: 18%; }
.achievement-toast::after { right: 18%; bottom: -6px; }
.toast-medal { width: 3rem; height: 3rem; display: grid; place-items: center; border: 2px solid #ffe6a8; border-radius: 50%; background: radial-gradient(circle at 35% 28%, #fff0b0, #e5a847 55%, #a65d2d); box-shadow: 0 0 18px rgb(248 197 103 / 45%), inset 0 1px 4px #fff7d9; }
.toast-medal span { width: 1.55rem; height: 1.55rem; display: grid; place-items: center; border: 2px solid #835026; border-radius: 50%; color: #573b20; font-size: 1rem; font-weight: 950; }
.toast-copy { display: grid; gap: .3rem; }
.toast-copy > strong { color: #ffdc96; font-size: .68rem; font-weight: 950; letter-spacing: .1em; text-shadow: 0 1px #50391f; }
.toast-spark { align-self: start; color: #ffe6a8; font-size: 1rem; text-shadow: 0 0 10px #ffd779; animation: spark-spin 1.6s ease-in-out infinite; }
@keyframes reserve-hover-bop { 0%, 100% { transform: scale(1) rotate(0); } 35% { transform: scale(1.16) rotate(-7deg); } 70% { transform: scale(1.12) rotate(6deg); } }
@keyframes stat-icon-spin { 0% { transform: rotate(-24deg) scale(.88); } 55% { transform: rotate(205deg) scale(1.12); } 100% { transform: rotate(360deg) scale(1); } }
@keyframes progress-pop-in { 0% { opacity: 0; transform: translateY(.8rem) scale(.62); } 62% { opacity: 1; transform: translateY(-.06rem) scale(1.12); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes count-roll-away { to { opacity: 0; transform: translateY(-110%) scale(.78); } }
@keyframes count-roll-in { from { opacity: 0; transform: translateY(105%) scale(.78); } 72% { opacity: 1; transform: translateY(-8%) scale(1.08); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes denominator-nudge { 35% { transform: translateX(-1px) rotate(-2deg); } 70% { transform: translateX(1px) rotate(2deg); } to { transform: translateX(0) rotate(0); } }
@keyframes progress-pop-away { to { opacity: 0; transform: translateY(-.55rem) scale(.88); } }
@keyframes reserve-pop { 0% { transform: scaleY(.8); } 45% { transform: scaleY(1.28); filter: brightness(1.45); } 100% { transform: scaleY(1); } }
@keyframes reserve-shimmy { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
@keyframes reserve-shine { 0% { opacity: .9; transform: translateX(-120%); } 100% { opacity: 0; transform: translateX(150%); } }
@keyframes reserve-critical-pulse { 0%, 100% { box-shadow: inset 0 1px 2px rgb(0 0 0 / 20%); } 50% { box-shadow: 0 0 12px color-mix(in srgb, var(--reserve-color), transparent 35%), inset 0 1px 2px rgb(0 0 0 / 20%); } }
@keyframes toast-in { 0% { opacity: 0; transform: translate(-50%, -45%) scale(.68); } 68% { opacity: 1; transform: translate(-50%, -51%) scale(1.045); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes toast-pulse { 0%, 100% { box-shadow: 0 18px 70px rgb(0 0 0 / 52%), 0 0 24px rgb(244 196 104 / 25%), inset 0 1px 0 rgb(255 248 220 / 22%); } 50% { box-shadow: 0 18px 70px rgb(0 0 0 / 52%), 0 0 35px rgb(255 215 133 / 58%), inset 0 1px 0 rgb(255 248 220 / 35%); } }
@keyframes toast-out { to { opacity: 0; transform: translate(-50%, -46%) scale(.92); } }
@keyframes spark-spin { 50% { transform: rotate(40deg) scale(1.25); } }
@media (max-width: 420px) {
  .hud-header { top: 50px; left: 10px; }
  .shift-track { top: 72px; left: 10px; width: 120px; }
  .reserve-grid { left: 10px; bottom: 38px; width: min(215px, calc(100% - 20px)); }
  .secondary-grid { top: 32px; right: 10px; bottom: auto; gap: .26rem; }
  .feedback, .delayed-effects { left: 10px; width: min(215px, calc(100% - 20px)); }
  .feedback { top: 90px; }
  .delayed-effects { top: 128px; }
  .reserve-grid { gap: .3rem; }
  .reserve-card { min-height: 20px; padding: 0; }
  .reserve-meter { height: 7px; }
  .stat-widget.is-expanded { width: min(168px, calc(100vw - 20px)); }
  .stat-icon-button { flex-basis: 2.2rem; width: 2.2rem; height: 2.2rem; }
  .stat-widget.is-expanded .stat-detail { width: calc(100% - 2.2rem); }
  .achievement-toast { grid-template-columns: 2.5rem minmax(0, 1fr) .7rem; gap: .55rem; min-height: 90px; padding: .68rem .72rem; font-size: .82rem; }
  .toast-medal { width: 2.45rem; height: 2.45rem; }
  .toast-medal span { width: 1.3rem; height: 1.3rem; }
  .toast-copy > strong { font-size: .58rem; }
}
@media (prefers-reduced-motion: reduce) {
  .shift-track > span, .reserve-fill, .science-track > span, .icon-tooltip, .stat-widget, .stat-detail, .stat-icon-button { transition: none; }
  .motion-up, .motion-down, .reserve-icon-wrap:hover, .reserve-icon:focus-visible, .reserve-card:has(.reserve-meter:hover) .reserve-icon-wrap, .stat-icon-button:hover > span, .stat-icon-button:focus-visible > span, .progress-pop, .count-old, .count-new, .progress-denominator, .fill-up::after, .fill-full::after, .low-pulse .reserve-meter, .achievement-toast, .toast-spark { animation: none; }
}
</style>
