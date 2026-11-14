<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import type { GameState, MissionData, ResourceId } from '../../contracts';

const props = defineProps<{ state: Readonly<GameState>; mission: MissionData }>();

const resourceInfo: Record<ResourceId, { label: string; icon: string }> = {
  power: { label: 'Power', icon: '⚡' },
  oxygen: { label: 'Air', icon: 'O₂' },
  supplies: { label: 'Supplies', icon: '✿' },
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
          <span class="reserve-icon" tabindex="0" role="img" :aria-label="resource.label">{{ resource.icon }}</span>
          <span class="icon-tooltip" role="tooltip">{{ resource.label }}</span>
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
          <span
            :key="`${resource.id}-${resource.motion.key}`"
            class="reserve-fill"
            :class="`fill-${resource.motion.direction}`"
            :style="{ width: `${resource.value}%` }"
          />
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
.hud {
  --hud-ink: #fff8e9;
  box-sizing: border-box;
  position: absolute;
  z-index: 8;
  top: calc(4.5rem + min(42vh, 440px) - 138px);
  left: clamp(.55rem, 2vw, 1.25rem);
  width: min(260px, calc(100vw - 1.1rem));
  padding: .58rem;
  color: var(--hud-ink);
  background: linear-gradient(155deg, rgb(35 43 44 / 94%), rgb(26 32 36 / 94%));
  border: 1px solid #e7c995;
  border-radius: 15px 15px 12px 12px;
  box-shadow: 0 8px 24px rgb(42 27 19 / 35%), inset 0 1px 0 rgb(255 245 220 / 15%);
  backdrop-filter: blur(8px);
  font: 600 .82rem/1.3 system-ui, sans-serif;
  pointer-events: none;
}
.hud-header, .brand, .secondary-heading { display: flex; align-items: center; }
.hud-header { justify-content: space-between; gap: .4rem; margin-bottom: .35rem; }
.brand { min-width: 0; gap: .4rem; }
.brand-mark { width: 1.48rem; height: 1.48rem; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid #e3c68f; border-radius: 8px; background: #e8a94b; color: #533c25; font-size: .95rem; box-shadow: inset 0 1px 2px #fff7d9; }
.mission-heading { display: grid; gap: .04rem; }
.eyebrow { color: #e7c995; font-size: .52rem; font-weight: 850; letter-spacing: .12em; }
.mission-heading strong { color: #fff7e5; font-size: .8rem; letter-spacing: .05em; }
.mission-heading strong span { color: #c7beb0; font-size: .72em; }
.unit-tag { padding: .2rem .36rem; border: 1px solid #817865; border-radius: 999px; color: #ded4c2; font-size: .5rem; font-weight: 800; letter-spacing: .08em; white-space: nowrap; }
.shift-track { display: block; height: .24rem; overflow: hidden; margin-bottom: .42rem; border: 1px solid #625e54; border-radius: 999px; background: #353d3d; }
.shift-track > span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #e99a42, #ffd56d); box-shadow: 0 0 8px #efb4539c; transition: width 260ms ease; }
.reserve-grid { display: grid; gap: .28rem; }
.reserve-card { --reserve-color: #ffc85b; --reserve-back: #55432e; display: grid; grid-template-columns: 1.65rem minmax(0, 1fr) auto; align-items: center; gap: .3rem; min-width: 0; min-height: 31px; padding: .25rem .4rem; border: 1px solid color-mix(in srgb, var(--reserve-color), transparent 58%); border-radius: 9px; background: linear-gradient(105deg, color-mix(in srgb, var(--reserve-back), #fff 7%), var(--reserve-back)); box-shadow: inset 0 1px 0 rgb(255 255 255 / 8%); }
.resource-power { --reserve-color: #ffc85b; --reserve-back: #55432e; }
.resource-oxygen { --reserve-color: #6ed9f4; --reserve-back: #294854; }
.resource-supplies { --reserve-color: #a4df76; --reserve-back: #354a36; }
.reserve-icon-wrap { position: relative; display: grid; place-items: center; width: 1.45rem; height: 1.45rem; border: 1px solid color-mix(in srgb, var(--reserve-color), transparent 45%); border-radius: 7px; background: rgb(9 17 20 / 38%); pointer-events: auto; }
.reserve-icon { display: grid; place-items: center; width: 100%; height: 100%; border-radius: inherit; color: var(--reserve-color); text-align: center; font-size: .88rem; font-weight: 900; cursor: help; }
.resource-oxygen .reserve-icon { font-size: .7rem; }
.reserve-icon:focus-visible { outline: 2px solid #fff1ba; outline-offset: 2px; }
.icon-tooltip { position: absolute; z-index: 12; left: 50%; bottom: calc(100% + .42rem); padding: .22rem .45rem; border: 1px solid color-mix(in srgb, var(--reserve-color), transparent 25%); border-radius: 6px; background: #1c2529; color: #fff8e9; box-shadow: 0 4px 12px rgb(0 0 0 / 32%); font-size: .68rem; font-weight: 800; white-space: nowrap; opacity: 0; transform: translate(-50%, .2rem) scale(.94); pointer-events: none; transition: opacity 120ms ease, transform 120ms ease; }
.reserve-icon-wrap:hover .icon-tooltip, .reserve-icon:focus-visible + .icon-tooltip { opacity: 1; transform: translate(-50%, 0) scale(1); }
.reserve-value { grid-column: 3; grid-row: 1; min-width: 2.45rem; color: #fffaf0; font-size: .76rem; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.reserve-value span { color: #ded6c8; font-size: .65em; font-weight: 600; }
.reserve-meter { grid-column: 2; grid-row: 1; height: .68rem; overflow: hidden; border: 1px solid rgb(255 255 255 / 20%); border-radius: 999px; background: rgb(12 19 23 / 65%); box-shadow: inset 0 1px 3px rgb(0 0 0 / 40%); }
.reserve-fill { position: relative; display: block; height: 100%; min-width: 0; border-radius: inherit; background: linear-gradient(180deg, color-mix(in srgb, var(--reserve-color), white 22%), var(--reserve-color)); box-shadow: 0 0 9px color-mix(in srgb, var(--reserve-color), transparent 30%); transition: width 440ms cubic-bezier(.2,.8,.2,1); }
.reserve-fill::after { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(110deg, transparent 20%, rgb(255 255 255 / 70%) 50%, transparent 80%); content: ''; opacity: 0; }
.motion-up { animation: reserve-pop .45s cubic-bezier(.2,.8,.2,1); }
.motion-down { animation: reserve-shimmy .38s ease-in-out; }
.fill-up::after { animation: reserve-shine .55s ease-out; }
.fill-down { filter: saturate(1.3) brightness(1.18); }
.reserve-level { grid-column: 1 / -1; display: flex; align-items: center; gap: .24rem; margin-top: -.22rem; color: var(--reserve-color); font-size: .5rem; font-weight: 800; letter-spacing: .03em; }
.level-dot { width: .32rem; height: .32rem; flex: 0 0 auto; border-radius: 50%; background: currentColor; box-shadow: 0 0 5px currentColor; }
.level-watch .reserve-level { color: #ffe18a; }
.level-low .reserve-level, .level-empty .reserve-level { color: #ff9d7e; }
.level-watch .reserve-fill { background: linear-gradient(180deg, #fff0a3, #e7bb4d); }
.level-low .reserve-fill, .level-empty .reserve-fill { background: linear-gradient(180deg, #ffc0a0, #e87958); }
.secondary-grid { display: grid; grid-template-columns: 1fr 1.25fr; gap: .32rem; margin-top: .35rem; }
.secondary-card { min-width: 0; padding: .34rem .4rem; border: 1px solid #69716d; border-radius: 8px; background: rgb(39 49 50 / 88%); }
.secondary-heading { gap: .2rem; }
.secondary-icon { width: .8rem; flex: 0 0 auto; text-align: center; font-size: .68rem; }
.science-icon { color: #a9d4ff; }
.shelter-icon { color: #f0cb8d; }
.secondary-label { flex: 1 1 auto; color: #e2ddd2; font-size: .5rem; font-weight: 850; letter-spacing: .06em; }
.secondary-heading strong { flex: 0 0 auto; color: #fff8e9; font-size: .68rem; font-variant-numeric: tabular-nums; }
.secondary-heading strong span { color: #c7c8c2; font-size: .72em; font-weight: 600; }
.science-track { height: .22rem; margin-top: .24rem; overflow: hidden; border-radius: 999px; background: #444f55; }
.science-track > span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #79b8ef, #c0e1ff); transition: width 260ms ease; }
.shelter-note { display: block; margin-top: .14rem; color: #f0d8b2; font-size: .51rem; font-weight: 650; }
.feedback { display: flex; align-items: flex-start; gap: .38rem; margin: .36rem 0 0; padding: .36rem .42rem; border: 1px solid #657d81; border-radius: 8px; background: rgb(37 57 62 / 94%); color: #fff0db; font-size: .62rem; }
.feedback > span:last-child { display: grid; gap: .08rem; }
.feedback strong { color: #ffcf91; font-size: .54rem; letter-spacing: .07em; }
.feedback-mark { width: .9rem; height: .9rem; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid currentColor; border-radius: 50%; color: #ffd28c; font-weight: 900; }
.feedback.cost { border-color: #c09d57; background: rgb(63 54 39 / 95%); }
.feedback.gain { border-color: #709c68; background: rgb(41 62 43 / 95%); }
.feedback.cost strong { color: #f5d78d; }
.feedback.gain strong { color: #bde9aa; }
.delayed-effects { margin-top: .34rem; padding: .36rem .42rem; border-left: 2px solid #e4b55e; border-radius: 5px; background: rgb(58 58 45 / 92%); }
.delayed-heading { color: #f4d28f; font-size: .54rem; font-weight: 850; letter-spacing: .08em; }
.delayed-item { display: grid; grid-template-columns: auto 1fr; gap: .34rem; margin: .18rem 0 0; color: #f1eee4; font-size: .6rem; }
.delayed-timing { color: #f4d28f; font-weight: 800; white-space: nowrap; }
.units-note { margin: .3rem 0 0; color: #c7c5bd; font-size: .49rem; letter-spacing: .02em; text-align: right; }
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
  .hud { top: calc(5.2rem + min(42vh, 440px) - 128px); left: .45rem; width: min(245px, calc(100vw - .9rem)); padding: .48rem; border-radius: 13px 13px 10px 10px; }
  .reserve-grid { gap: .22rem; }
  .reserve-card { min-height: 28px; padding: .2rem .32rem; }
  .reserve-meter { height: .58rem; }
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
