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

type ReserveMotion = { direction: 'up' | 'down' | ''; key: number };
const reserveMotion = ref<Record<ResourceId, ReserveMotion>>({
  power: { direction: '', key: 0 },
  oxygen: { direction: '', key: 0 },
  supplies: { direction: '', key: 0 },
});

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
    let hasReserveChange = false;
    for (const [id, now, before] of reserveChanges) {
      if (now === before) continue;
      hasReserveChange = true;
      motion[id] = { direction: now > before ? 'up' : 'down', key: motion[id].key + 1 };
    }
    if (hasReserveChange) {
      reserveMotion.value = motion;
      if (reserveTimer) clearTimeout(reserveTimer);
      reserveTimer = setTimeout(() => {
        reserveMotion.value = {
          power: { ...reserveMotion.value.power, direction: '' },
          oxygen: { ...reserveMotion.value.oxygen, direction: '' },
          supplies: { ...reserveMotion.value.supplies, direction: '' },
        };
      }, 820);
    }

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
  if (reserveTimer) clearTimeout(reserveTimer);
  if (hazardTimer) clearTimeout(hazardTimer);
});

function meterText(value: number, level: string): string {
  return `${value} of 100 simplified game units. ${level} reserve.`;
}
</script>

<template>
  <Teleport :to="hudTarget">
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
        :class="[`resource-${resource.id}`, `level-${resource.level.toLowerCase()}`, `motion-${resource.motion.direction}`]"
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
            :key="`${resource.id}-${resource.motion.key}`"
            class="reserve-fill"
            :class="`fill-${resource.motion.direction}`"
            :style="{ width: `${resource.value}%` }"
          />
        </div>
        <strong class="reserve-value" :aria-label="`${resource.value} out of 100 game units`">{{ resource.value }}</strong>
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
  </Teleport>
  <Teleport to="body">
    <div v-if="hazardToast" :key="hazardToast.key" class="achievement-toast" role="status" aria-live="polite" aria-atomic="true">
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
  left: 14px;
  bottom: 42px;
  display: grid;
  gap: .3rem;
  width: min(230px, calc(100% - 28px));
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
.hud-header, .shift-track, .secondary-grid, .delayed-effects, .feedback, .units-note { display: none; }
.brand, .secondary-heading { display: flex; align-items: center; }
.hud-header { justify-content: space-between; gap: .35rem; margin: 0 0 .1rem; }
.brand { min-width: 0; gap: .35rem; }
.brand-mark { display: none; }
.mission-heading { display: grid; gap: .02rem; }
.eyebrow { color: #fff1cf; font-size: .49rem; font-weight: 850; letter-spacing: .12em; text-shadow: 0 1px 5px #21191c; }
.mission-heading strong { color: #fff8e9; font-size: .72rem; letter-spacing: .05em; text-shadow: 0 1px 5px #21191c; }
.mission-heading strong span { color: #e8ddca; font-size: .72em; }
.unit-tag { display: none; }
.shift-track { display: block; height: .18rem; overflow: hidden; margin: 0 0 .12rem; border: 1px solid rgb(255 245 220 / 45%); border-radius: 999px; background: rgb(10 19 24 / 22%); }
.shift-track > span { display: block; height: 100%; border-radius: inherit; background: #f4c86d; box-shadow: 0 0 7px #efb4539c; transition: width 260ms ease; }
.reserve-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: .34rem; }
.reserve-card { --reserve-color: #ffd36f; display: grid; grid-template-columns: 22px minmax(0, 1fr) 27px; align-items: center; gap: .48rem; min-width: 0; min-height: 21px; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
.resource-power { --reserve-color: #ffd36f; }
.resource-oxygen { --reserve-color: #8ce8ff; }
.resource-supplies { --reserve-color: #b8ec91; }
.reserve-icon-wrap { position: relative; display: grid; place-items: center; width: 22px; height: 22px; background: transparent; border: 0; border-radius: 0; pointer-events: auto; }
.reserve-icon { display: grid; place-items: center; width: 100%; height: 100%; color: var(--reserve-color); cursor: help; filter: drop-shadow(0 1px 3px rgb(0 0 0 / 65%)); }
.reserve-icon svg { display: block; width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.65; }
.reserve-icon:focus-visible { outline: 2px solid #fff1ba; outline-offset: 2px; }
.icon-tooltip { position: absolute; z-index: 12; left: 50%; bottom: calc(100% + .35rem); padding: .2rem .42rem; border: 1px solid color-mix(in srgb, var(--reserve-color), transparent 35%); border-radius: 5px; background: rgb(22 31 37 / 92%); color: #fff8e9; box-shadow: 0 3px 10px rgb(0 0 0 / 28%); font-size: .66rem; font-weight: 800; white-space: nowrap; opacity: 0; transform: translate(-50%, .2rem) scale(.94); pointer-events: none; transition: opacity 120ms ease, transform 120ms ease; }
.reserve-icon-wrap:hover .icon-tooltip, .reserve-icon:focus-visible + .icon-tooltip { opacity: 1; transform: translate(-50%, 0) scale(1); }
.reserve-meter { grid-column: 2; grid-row: 1; height: 8px; overflow: hidden; border: 1px solid rgb(255 255 255 / 34%); border-radius: 999px; background: rgb(6 14 18 / 22%); box-shadow: inset 0 1px 2px rgb(0 0 0 / 20%); }
.reserve-fill { position: relative; display: block; height: 100%; min-width: 0; border-radius: inherit; background: color-mix(in srgb, var(--reserve-color), transparent 12%); box-shadow: 0 0 8px color-mix(in srgb, var(--reserve-color), transparent 35%); transition: width 440ms cubic-bezier(.2,.8,.2,1); }
.reserve-fill::after { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(110deg, transparent 20%, rgb(255 255 255 / 75%) 50%, transparent 80%); content: ''; opacity: 0; }
.reserve-value { grid-column: 3; grid-row: 1; color: #fff8e9; font-size: .66rem; font-variant-numeric: tabular-nums; text-align: right; text-shadow: 0 1px 4px #171317; }
.motion-up { animation: reserve-pop .45s cubic-bezier(.2,.8,.2,1); }
.motion-down { animation: reserve-shimmy .38s ease-in-out; }
.fill-up::after { animation: reserve-shine .55s ease-out; }
.fill-down { filter: saturate(1.3) brightness(1.18); }
.level-watch .reserve-fill { background: color-mix(in srgb, #ffe18a, transparent 12%); }
.level-low .reserve-fill, .level-empty .reserve-fill { background: color-mix(in srgb, #ff9d7e, transparent 12%); }
.secondary-grid { display: flex; justify-content: space-between; gap: .5rem; margin: .12rem 0 0; }
.secondary-card { min-width: 0; padding: 0; border: 0; border-radius: 0; background: transparent; }
.secondary-heading { gap: .23rem; }
.secondary-icon { width: .8rem; flex: 0 0 auto; text-align: center; font-size: .62rem; filter: drop-shadow(0 1px 3px rgb(0 0 0 / 65%)); }
.science-icon { color: #b7ddff; }
.shelter-icon { color: #f0cb8d; }
.secondary-label { color: #fff1cf; font-size: .46rem; font-weight: 850; letter-spacing: .06em; text-shadow: 0 1px 4px #171317; }
.secondary-heading strong { color: #fff8e9; font-size: .62rem; font-variant-numeric: tabular-nums; text-shadow: 0 1px 4px #171317; }
.secondary-heading strong span { color: #e4dac9; font-size: .72em; }
.science-track { display: none; }
.shelter-note { display: none; }
.feedback { display: flex; align-items: flex-start; gap: .32rem; margin: .1rem 0 0; color: #fff0db; font-size: .58rem; text-shadow: 0 1px 4px #171317; }
.feedback > span:last-child { display: grid; gap: .06rem; }
.feedback strong { color: #ffcf91; font-size: .49rem; letter-spacing: .06em; }
.feedback-mark { width: .75rem; height: .75rem; display: grid; place-items: center; flex: 0 0 auto; color: #ffd28c; font-weight: 900; }
.delayed-effects { margin-top: .1rem; color: #fff1cf; text-shadow: 0 1px 4px #171317; }
.delayed-heading { color: #f4d28f; font-size: .49rem; font-weight: 850; letter-spacing: .08em; }
.delayed-item { display: grid; grid-template-columns: auto 1fr; gap: .3rem; margin: .12rem 0 0; color: #fff8e9; font-size: .56rem; }
.delayed-timing { color: #f4d28f; font-weight: 800; white-space: nowrap; }
.units-note { display: none; }
.hud > .hud-header, .hud > .shift-track, .hud > .secondary-grid, .hud > .delayed-effects, .hud > .feedback, .hud > .units-note { display: none; }
.achievement-toast { --toast-gold: #f3c76f; box-sizing: border-box; position: fixed; z-index: 1000; top: 48%; left: 50%; display: grid; grid-template-columns: 3.1rem minmax(0, 1fr) 1rem; align-items: center; gap: .85rem; width: min(440px, calc(100vw - 2rem)); min-height: 104px; padding: .8rem 1rem; border: 2px solid #f4d48e; border-radius: 12px; background: linear-gradient(110deg, rgb(60 48 34 / 98%), rgb(35 43 42 / 98%) 45%, rgb(30 37 40 / 98%)); color: #fff8e8; box-shadow: 0 18px 70px rgb(0 0 0 / 52%), 0 0 24px rgb(244 196 104 / 25%), inset 0 1px 0 rgb(255 248 220 / 22%); font: 650 .9rem/1.4 system-ui, sans-serif; animation: toast-in .52s cubic-bezier(.16,1.35,.4,1) both, toast-pulse .95s .55s 3 ease-in-out, toast-out .42s 4.75s ease-in forwards; }
.achievement-toast::before, .achievement-toast::after { position: absolute; width: 9px; height: 9px; border: 1px solid var(--toast-gold); background: #624b31; content: ''; transform: rotate(45deg); }
.achievement-toast::before { top: -6px; left: 18%; }
.achievement-toast::after { right: 18%; bottom: -6px; }
.toast-medal { width: 3rem; height: 3rem; display: grid; place-items: center; border: 2px solid #ffe6a8; border-radius: 50%; background: radial-gradient(circle at 35% 28%, #fff0b0, #e5a847 55%, #a65d2d); box-shadow: 0 0 18px rgb(248 197 103 / 45%), inset 0 1px 4px #fff7d9; }
.toast-medal span { width: 1.55rem; height: 1.55rem; display: grid; place-items: center; border: 2px solid #835026; border-radius: 50%; color: #573b20; font-size: 1rem; font-weight: 950; }
.toast-copy { display: grid; gap: .3rem; }
.toast-copy > strong { color: #ffdc96; font-size: .68rem; font-weight: 950; letter-spacing: .1em; text-shadow: 0 1px #50391f; }
.toast-spark { align-self: start; color: #ffe6a8; font-size: 1rem; text-shadow: 0 0 10px #ffd779; animation: spark-spin 1.6s ease-in-out infinite; }
@keyframes reserve-pop { 0% { transform: scaleY(.8); } 45% { transform: scaleY(1.28); filter: brightness(1.45); } 100% { transform: scaleY(1); } }
@keyframes reserve-shimmy { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
@keyframes reserve-shine { 0% { opacity: .9; transform: translateX(-120%); } 100% { opacity: 0; transform: translateX(150%); } }
@keyframes toast-in { 0% { opacity: 0; transform: translate(-50%, -45%) scale(.68); } 68% { opacity: 1; transform: translate(-50%, -51%) scale(1.045); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes toast-pulse { 0%, 100% { box-shadow: 0 18px 70px rgb(0 0 0 / 52%), 0 0 24px rgb(244 196 104 / 25%), inset 0 1px 0 rgb(255 248 220 / 22%); } 50% { box-shadow: 0 18px 70px rgb(0 0 0 / 52%), 0 0 35px rgb(255 215 133 / 58%), inset 0 1px 0 rgb(255 248 220 / 35%); } }
@keyframes toast-out { to { opacity: 0; transform: translate(-50%, -46%) scale(.92); } }
@keyframes spark-spin { 50% { transform: rotate(40deg) scale(1.25); } }
@media (max-width: 420px) {
  .hud { left: 10px; bottom: 38px; width: min(215px, calc(100% - 20px)); }
  .reserve-grid { gap: .3rem; }
  .reserve-card { min-height: 20px; padding: 0; }
  .reserve-meter { height: 7px; }
  .achievement-toast { grid-template-columns: 2.5rem minmax(0, 1fr) .7rem; gap: .55rem; min-height: 90px; padding: .68rem .72rem; font-size: .82rem; }
  .toast-medal { width: 2.45rem; height: 2.45rem; }
  .toast-medal span { width: 1.3rem; height: 1.3rem; }
  .toast-copy > strong { font-size: .58rem; }
}
@media (prefers-reduced-motion: reduce) {
  .shift-track > span, .reserve-fill, .science-track > span, .icon-tooltip { transition: none; }
  .motion-up, .motion-down, .fill-up::after, .achievement-toast, .toast-spark { animation: none; }
}
</style>
