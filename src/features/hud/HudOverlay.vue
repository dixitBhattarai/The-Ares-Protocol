<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { GameState, MissionData, ResourceId } from '../../contracts';

const props = defineProps<{ state: Readonly<GameState>; mission: MissionData }>();
const hudTarget = ref<string | HTMLElement>('body');
const hazardToastElement = ref<HTMLElement | null>(null);
let gameViewport: HTMLElement | null = null;
let driftFrame = 0;
let targetDriftX = 0;
let targetDriftY = 0;
let currentDriftX = 0;
let currentDriftY = 0;
let reduceMotionQuery: MediaQueryList | null = null;

const driftLayers = [
  { name: 'header', x: .08, y: .1 },
  { name: 'shift', x: .16, y: .13 },
  { name: 'reserves', x: -.12, y: .2 },
  { name: 'science', x: .08, y: -.1 },
  { name: 'shelter', x: .14, y: .07 },
  { name: 'feedback', x: -.11, y: .08 },
  { name: 'delayed', x: .06, y: -.12 },
];

onMounted(() => {
  gameViewport = document.querySelector<HTMLElement>('.world-panel .viewport');
  if (!gameViewport) return;
  hudTarget.value = gameViewport;
  if (typeof window.matchMedia === 'function') {
    reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotionQuery.addEventListener('change', onMotionPreferenceChange);
  }
  if (!reduceMotionQuery?.matches) {
    gameViewport.addEventListener('pointermove', onViewportPointerMove, { passive: true });
    gameViewport.addEventListener('pointerleave', resetViewportPointer, { passive: true });
  }
});

const resourceInfo: Record<ResourceId, { label: string }> = {
  power: { label: 'Power' },
  oxygen: { label: 'Air' },
  supplies: { label: 'Supplies' },
};

type ReserveMotion = { direction: 'up' | 'down' | ''; key: number; fullKey: number; reachedFull: boolean };
type ProgressStat = 'science' | 'shelter';
type StatPop = { key: number; from: number; to: number; max: number };
type EventIcon = 'solar' | 'storm' | 'air' | 'power' | 'supplies' | 'comms' | 'shelter' | 'alert';
type HazardToast = { key: number; name: string; body: string; icon: EventIcon };
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
const hazardToast = ref<HazardToast | null>(null);
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
    const record = props.state.history?.at(-1);
    const event = props.mission.events.find(item => item.id === record?.eventId);
    const colon = notice.indexOf(':');
    const hasNamedHazard = colon > 0 && colon < 56;
    hazardToast.value = {
      key: ++hazardKey,
      name: hasNamedHazard ? notice.slice(0, colon).trim() : event?.title ?? 'Outpost event',
      body: hasNamedHazard ? notice.slice(colon + 1).trim() : notice,
      icon: eventIcon(event?.title ?? record?.eventTitle ?? '', notice),
    };
    if (hazardTimer) clearTimeout(hazardTimer);
    hazardTimer = setTimeout(() => { hazardToast.value = null; }, 5200);
  },
);

onUnmounted(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  for (const timer of Object.values(reserveTimers)) if (timer) clearTimeout(timer);
  for (const timer of Object.values(statPopTimers)) if (timer) clearTimeout(timer);
  if (hazardTimer) clearTimeout(hazardTimer);
  if (gameViewport) {
    gameViewport.removeEventListener('pointermove', onViewportPointerMove);
    gameViewport.removeEventListener('pointerleave', resetViewportPointer);
    for (const layer of driftLayers) {
      gameViewport.style.removeProperty(`--hud-${layer.name}-x`);
      gameViewport.style.removeProperty(`--hud-${layer.name}-y`);
    }
  }
  reduceMotionQuery?.removeEventListener('change', onMotionPreferenceChange);
  if (driftFrame) window.cancelAnimationFrame(driftFrame);
  if (hazardToastElement.value) hazardToastElement.value.style.translate = '';
});

function meterText(value: number, level: string): string {
  return `${value} of 100 simplified game units. ${level} reserve.`;
}

function eventIcon(title: string, notice: string): EventIcon {
  const description = `${title} ${notice}`.toLowerCase();
  if (/radiation|solar|particle|space weather/.test(description)) return 'solar';
  if (/dust|storm|wind/.test(description)) return 'storm';
  if (/oxygen|air|pressure|scrubber/.test(description)) return 'air';
  if (/power|battery|electric|solar array/.test(description)) return 'power';
  if (/food|supply|greenhouse|plant/.test(description)) return 'supplies';
  if (/communication|radio|signal|comms/.test(description)) return 'comms';
  if (/shelter|habitat|shield/.test(description)) return 'shelter';
  return 'alert';
}

function onViewportPointerMove(event: PointerEvent): void {
  if (!gameViewport || reduceMotionQuery?.matches) return;
  const rect = gameViewport.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  targetDriftX = ((event.clientX - rect.left) / rect.width - .5) * 8;
  targetDriftY = ((event.clientY - rect.top) / rect.height - .5) * 6;
  startDriftFrame();
}

function resetViewportPointer(): void {
  targetDriftX = 0;
  targetDriftY = 0;
  startDriftFrame();
}

function startDriftFrame(): void {
  if (!driftFrame) driftFrame = window.requestAnimationFrame(updateHudDrift);
}

function updateHudDrift(): void {
  currentDriftX += (targetDriftX - currentDriftX) * .12;
  currentDriftY += (targetDriftY - currentDriftY) * .12;
  const style = gameViewport?.style;
  if (style) {
    for (const layer of driftLayers) {
      style.setProperty(`--hud-${layer.name}-x`, `${(currentDriftX * layer.x).toFixed(2)}px`);
      style.setProperty(`--hud-${layer.name}-y`, `${(currentDriftY * layer.y).toFixed(2)}px`);
    }
  }
  if (hazardToastElement.value) {
    hazardToastElement.value.style.translate = `${(currentDriftX * .06).toFixed(2)}px ${(currentDriftY * .06).toFixed(2)}px`;
  }

  if (Math.abs(targetDriftX - currentDriftX) > .015 || Math.abs(targetDriftY - currentDriftY) > .015) {
    driftFrame = window.requestAnimationFrame(updateHudDrift);
  } else {
    currentDriftX = targetDriftX;
    currentDriftY = targetDriftY;
    driftFrame = 0;
  }
}

function onMotionPreferenceChange(event: MediaQueryListEvent): void {
  if (!gameViewport) return;
  gameViewport.removeEventListener('pointermove', onViewportPointerMove);
  gameViewport.removeEventListener('pointerleave', resetViewportPointer);
  if (event.matches) {
    if (driftFrame) window.cancelAnimationFrame(driftFrame);
    driftFrame = 0;
    currentDriftX = 0;
    currentDriftY = 0;
    targetDriftX = 0;
    targetDriftY = 0;
    for (const layer of driftLayers) {
      gameViewport.style.removeProperty(`--hud-${layer.name}-x`);
      gameViewport.style.removeProperty(`--hud-${layer.name}-y`);
    }
    if (hazardToastElement.value) hazardToastElement.value.style.translate = '';
  } else {
    gameViewport.addEventListener('pointermove', onViewportPointerMove, { passive: true });
    gameViewport.addEventListener('pointerleave', resetViewportPointer, { passive: true });
  }
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
            <svg v-if="resource.id === 'power'" class="resource-glyph glyph-power" viewBox="0 0 32 32" aria-hidden="true">
              <path class="glyph-outline" d="M18.3 2.1 5.1 16.2c-.8.9-.2 2.3 1 2.3h8l-1.7 10.4c-.2 1.5 1.6 2.2 2.5 1L27 13.6c.7-.9 0-2.2-1.1-2.2h-7.1l2.1-7.6c.4-1.4-1.5-2.7-2.6-1.7Z" />
              <path class="glyph-highlight" d="m18.2 5.1-9.7 11h9.1l-2.1 10.1 8.3-12.3h-8.6l3-8.8Z" />
            </svg>
            <svg v-else-if="resource.id === 'oxygen'" class="resource-glyph glyph-air" viewBox="0 0 32 32" aria-hidden="true">
              <path class="glyph-outline" d="M8 25.5a6 6 0 0 1-.8-12 9 9 0 0 1 17.1 1.2 5.5 5.5 0 0 1-.8 10.8H8Z" />
              <path class="glyph-highlight" d="M10 22.5a3.4 3.4 0 0 1-.2-6.8 6.2 6.2 0 0 1 10.4-2.1 8 8 0 0 0-6.8 8.9H10Z" />
              <circle class="glyph-bubble" cx="24.5" cy="7" r="2.4" />
              <circle class="glyph-bubble" cx="27.3" cy="12" r="1.35" />
            </svg>
            <svg v-else class="resource-glyph glyph-supplies" viewBox="0 0 32 32" aria-hidden="true">
              <path class="glyph-outline" d="M15.6 27V15.8C8.8 16.2 5.5 12.1 6 6c6.5-.1 10.2 3 10.7 8.7C17.8 7.8 22 4.8 28 5.6c.2 6.7-3.5 10.6-10 10.5V27h-2.4Z" />
              <path class="glyph-highlight" d="M15.8 14.3c-.8-4-3.3-5.8-7.3-5.9.2 4.1 2.4 6.2 7.3 6.5v-.6Zm2 0c.8-3.9 3.4-6 7.5-6.1-.3 4.2-2.6 6.4-7.5 6.7v-.6Z" />
              <path class="glyph-stem" d="M15.9 17h2.2v10h-2.2z" />
            </svg>
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
  <Teleport :to="hudTarget">
    <div v-if="hazardToast && state.phase === 'running'" ref="hazardToastElement" :key="hazardToast.key" class="achievement-toast" role="status" aria-live="polite" aria-atomic="true">
      <span class="toast-medal" aria-hidden="true">
        <svg v-if="hazardToast.icon === 'solar'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1m0-14.2L17 7M7 17l-2.1 2.1" /></svg>
        <svg v-else-if="hazardToast.icon === 'storm'" viewBox="0 0 24 24"><path d="M4 14.5A4.5 4.5 0 0 1 5.7 6a6.5 6.5 0 0 1 12.4 1.1A3.8 3.8 0 0 1 19 14.5" /><path d="m13 11-3 5h3l-2 5 6-7h-3l2-3" /></svg>
        <svg v-else-if="hazardToast.icon === 'air'" viewBox="0 0 24 24"><path d="M3 7h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 17h8" /></svg>
        <svg v-else-if="hazardToast.icon === 'power'" viewBox="0 0 24 24"><path d="M13.4 2.8 5.8 13h5.1l-.5 8.2L18.2 10h-5.1l.3-7.2Z" /></svg>
        <svg v-else-if="hazardToast.icon === 'supplies'" viewBox="0 0 24 24"><path d="M12 21V9m0 4c-4 0-6-2-6-5 4 0 6 2 6 5Zm0-3c0-4 2-6 6-6 0 4-2 6-6 6Z" /></svg>
        <svg v-else-if="hazardToast.icon === 'comms'" viewBox="0 0 24 24"><path d="m12 21 4-12H8l4 12Zm0-15V3m-4 3a6 6 0 0 1 8 0M5 4a10 10 0 0 1 14 0" /></svg>
        <svg v-else-if="hazardToast.icon === 'shelter'" viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z" /><path d="M8 12h8m-4-4v8" /></svg>
        <svg v-else viewBox="0 0 24 24"><path d="M12 3 22 20H2L12 3Z" /><path d="M12 9v5m0 3h.01" /></svg>
      </span>
      <span class="toast-copy">
        <strong>✦ OUTPOST EVENT ✦</strong>
        <span class="toast-message"><b>{{ hazardToast.name }}</b><span>{{ hazardToast.body }}</span></span>
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
.hud-header { box-sizing: border-box; position: absolute; top: 56px; left: 14px; width: min(230px, calc(100% - 28px)); min-height: 42px; padding: .42rem .58rem; justify-content: space-between; gap: .5rem; margin: 0; border: 1px solid rgb(138 204 255 / 56%); border-radius: 11px; background: rgb(9 25 41 / 86%); box-shadow: 0 5px 20px rgb(0 0 0 / 24%), inset 0 1px 0 rgb(255 255 255 / 12%), 0 0 14px rgb(73 173 255 / 12%); backdrop-filter: blur(7px); }
.hud-header { translate: var(--hud-header-x, 0px) var(--hud-header-y, 0px); }
.brand { min-width: 0; gap: .35rem; }
.brand-mark { display: grid; place-items: center; width: 1.65rem; height: 1.65rem; flex: 0 0 auto; border: 1px solid rgb(255 234 166 / 70%); border-radius: 50%; background: radial-gradient(circle at 35% 28%, #fff3b2, #ffbd59 68%, #ea7d45); color: #713d31; font-size: .9rem; box-shadow: 0 0 11px rgb(255 196 92 / 42%), inset 0 1px 2px rgb(255 255 255 / 70%); }
.mission-heading { display: grid; gap: .04rem; }
.eyebrow { display: block; color: #8be4ff; font-size: .48rem; font-weight: 900; letter-spacing: .13em; text-shadow: 0 0 8px rgb(85 219 255 / 38%); }
.mission-heading strong { color: #fff8e9; font-size: .8rem; font-weight: 950; letter-spacing: .06em; text-shadow: 0 1px 5px #101a27; }
.mission-heading strong span { color: #cfdded; font-size: .72em; }
.unit-tag { display: block; flex: 0 0 auto; padding: .2rem .35rem; border: 1px solid rgb(165 211 239 / 36%); border-radius: 999px; background: rgb(108 168 210 / 13%); color: #d3e8f5; font-size: .42rem; font-weight: 900; letter-spacing: .07em; }
.shift-track { position: absolute; top: 105px; left: 14px; display: block; width: min(180px, calc(100% - 28px)); height: .42rem; overflow: hidden; margin: 0; border: 1px solid rgb(255 229 163 / 50%); border-radius: 999px; background: repeating-linear-gradient(90deg, rgb(12 28 38 / 88%) 0 8px, rgb(28 45 52 / 88%) 8px 10px); box-shadow: inset 0 1px 3px rgb(0 0 0 / 45%), 0 2px 8px rgb(0 0 0 / 25%); }
.shift-track { translate: var(--hud-shift-x, 0px) var(--hud-shift-y, 0px); }
.shift-track > span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #ffe184, #ffbb59 55%, #fff4bc); box-shadow: 0 0 9px rgb(255 199 88 / 80%); transition: width 260ms ease; }
.reserve-grid { box-sizing: border-box; position: absolute; left: 14px; bottom: 42px; display: grid; grid-template-columns: minmax(0, 1fr); gap: .42rem; width: min(248px, calc(100% - 28px)); padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; backdrop-filter: none; }
.reserve-grid { translate: var(--hud-reserves-x, 0px) var(--hud-reserves-y, 0px); }
.reserve-card { --reserve-color: #ffd36f; display: grid; grid-template-columns: 31px minmax(0, 1fr) 32px; align-items: center; gap: 0; min-width: 0; min-height: 34px; padding: .12rem .38rem; border: 1px solid color-mix(in srgb, var(--reserve-color), transparent 52%); border-radius: 10px; background: linear-gradient(180deg, color-mix(in srgb, var(--reserve-color), transparent 88%), color-mix(in srgb, var(--reserve-color), transparent 95%)); box-shadow: 0 3px 10px rgb(0 0 0 / 23%), inset 0 1px 0 rgb(255 255 255 / 12%); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease; }
.reserve-card:hover { border-color: color-mix(in srgb, var(--reserve-color), white 12%); box-shadow: 0 4px 13px rgb(0 0 0 / 28%), 0 0 12px color-mix(in srgb, var(--reserve-color), transparent 75%), inset 0 1px 0 rgb(255 255 255 / 16%); }
.resource-power { --reserve-color: #ffd36f; }
.resource-oxygen { --reserve-color: #71ddff; }
.resource-supplies { --reserve-color: #a6f079; }
.reserve-icon-wrap { position: relative; z-index: 2; display: grid; place-items: center; width: 34px; height: 34px; margin-left: -2px; margin-right: -8px; border: 0; border-radius: 50%; background: transparent; box-shadow: none; pointer-events: auto; transform-origin: center; }
.reserve-icon { display: grid; place-items: center; width: 100%; height: 100%; color: var(--reserve-color); cursor: help; filter: drop-shadow(0 2px 2px rgb(6 15 24 / 75%)); }
.reserve-icon-wrap:hover, .reserve-icon:focus-visible { animation: reserve-hover-bop .38s cubic-bezier(.2,.8,.2,1); }
.reserve-icon svg { display: block; width: 32px; height: 32px; overflow: visible; }
.glyph-outline { fill: #ff9354; stroke: #69364f; stroke-width: 1.8; stroke-linejoin: round; }
.glyph-highlight { fill: #ffe46f; stroke: #fff4b3; stroke-width: .75; stroke-linejoin: round; }
.glyph-air .glyph-outline { fill: #59c8f5; stroke: #155078; stroke-width: 1.8; }
.glyph-air .glyph-highlight { fill: #c9f5ff; stroke: #fff; stroke-width: .55; }
.glyph-air .glyph-bubble { fill: #9aeaff; stroke: #155078; stroke-width: 1.15; }
.glyph-supplies .glyph-outline { fill: #69c95d; stroke: #315b48; stroke-width: 1.8; stroke-linejoin: round; }
.glyph-supplies .glyph-highlight { fill: #b8f274; stroke: #edffba; stroke-width: .7; }
.glyph-supplies .glyph-stem { fill: #8a5838; stroke: #583d36; stroke-width: .6; }
.reserve-icon:focus-visible { outline: 2px solid #fff1ba; outline-offset: 2px; }
.icon-tooltip { position: absolute; z-index: 12; left: 50%; bottom: calc(100% + .35rem); padding: .2rem .42rem; border: 1px solid color-mix(in srgb, var(--reserve-color), transparent 35%); border-radius: 5px; background: rgb(22 31 37 / 92%); color: #fff8e9; box-shadow: 0 3px 10px rgb(0 0 0 / 28%); font-size: .66rem; font-weight: 800; white-space: nowrap; opacity: 0; transform: translate(-50%, .2rem) scale(.94); pointer-events: none; transition: opacity 120ms ease, transform 120ms ease; }
.reserve-icon-wrap:hover .icon-tooltip, .reserve-icon:focus-visible + .icon-tooltip { opacity: 1; transform: translate(-50%, 0) scale(1); }
.reserve-meter { position: relative; z-index: 1; grid-column: 2; grid-row: 1; height: 12px; margin-left: -3px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--reserve-color), white 20%); border-radius: 5px; background: repeating-linear-gradient(90deg, rgb(48 63 70 / 88%) 0 10px, rgb(6 15 24 / 96%) 10px 14px); box-shadow: inset 0 1px 3px rgb(0 0 0 / 55%), 0 0 6px color-mix(in srgb, var(--reserve-color), transparent 80%); pointer-events: auto; transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
.reserve-card:has(.reserve-meter:hover) .reserve-meter { transform: scaleY(1.35); border-color: color-mix(in srgb, var(--reserve-color), white 30%); box-shadow: 0 0 10px color-mix(in srgb, var(--reserve-color), transparent 55%), inset 0 1px 2px rgb(0 0 0 / 20%); }
.reserve-card:has(.reserve-meter:hover) .reserve-icon-wrap { animation: reserve-hover-bop .38s cubic-bezier(.2,.8,.2,1); }
.reserve-fill { position: relative; display: block; height: 100%; min-width: 0; border-radius: inherit; background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--reserve-color), #fff 15%) 0 10px, transparent 10px 14px); filter: drop-shadow(0 0 4px color-mix(in srgb, var(--reserve-color), transparent 28%)); transition: width 440ms cubic-bezier(.2,.8,.2,1); }
.reserve-fill::after { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(110deg, transparent 20%, rgb(255 255 255 / 75%) 50%, transparent 80%); content: ''; opacity: 0; }
.reserve-value { grid-column: 3; grid-row: 1; color: #fff8e9; font-size: .74rem; font-weight: 950; font-variant-numeric: tabular-nums; text-align: right; text-shadow: 0 1px 4px #09111c, 0 0 8px color-mix(in srgb, var(--reserve-color), transparent 55%); }
.motion-up { animation: reserve-pop .45s cubic-bezier(.2,.8,.2,1); }
.motion-down { animation: reserve-shimmy .38s ease-in-out; }
.fill-up::after { animation: reserve-shine .55s ease-out; }
.fill-full::after { animation: reserve-shine .72s cubic-bezier(.2,.8,.2,1); }
.fill-down { filter: saturate(1.3) brightness(1.18); }
.low-pulse .reserve-meter { animation: reserve-critical-pulse 2.35s ease-in-out infinite; }
.level-watch .reserve-fill { background: repeating-linear-gradient(90deg, #fff0a8 0 10px, transparent 10px 14px); }
.level-low .reserve-fill, .level-empty .reserve-fill { background: repeating-linear-gradient(90deg, #ffad8e 0 10px, transparent 10px 14px); }
.secondary-grid { position: absolute; right: 18px; bottom: 42px; display: grid; justify-items: end; gap: .34rem; width: auto; margin: 0; }
.science-widget { translate: var(--hud-science-x, 0px) var(--hud-science-y, 0px); }
.shelter-widget { translate: var(--hud-shelter-x, 0px) var(--hud-shelter-y, 0px); }
.stat-widget { position: relative; box-sizing: border-box; display: flex; align-items: center; justify-content: flex-end; gap: .28rem; width: 2.4rem; min-height: 2.4rem; overflow: visible; color: #f1eee5; transition: width 420ms cubic-bezier(.2,.85,.25,1); }
.stat-widget.is-expanded { width: min(190px, calc(100vw - 34px)); }
.stat-detail { box-sizing: border-box; display: grid; justify-items: end; align-content: center; gap: .12rem; width: 0; overflow: hidden; opacity: 0; text-align: right; transform: translateX(8px); transition: width 380ms cubic-bezier(.2,.85,.25,1), opacity 180ms ease, transform 380ms cubic-bezier(.2,.85,.25,1); pointer-events: none; }
.stat-widget.is-expanded .stat-detail { width: calc(100% - 2.4rem); overflow: visible; padding: .42rem .56rem; border: 1px solid rgb(158 218 255 / 45%); border-radius: 10px; background: rgb(8 24 39 / 94%); box-shadow: 0 6px 18px rgb(0 0 0 / 28%), inset 0 1px 0 rgb(255 255 255 / 9%); opacity: 1; transform: translateX(0); }
.science-widget.is-expanded .stat-detail { border-color: rgb(123 197 255 / 54%); box-shadow: 0 6px 18px rgb(0 0 0 / 28%), 0 0 14px rgb(81 172 255 / 13%), inset 0 1px 0 rgb(255 255 255 / 9%); }
.shelter-widget.is-expanded .stat-detail { border-color: rgb(255 204 125 / 50%); box-shadow: 0 6px 18px rgb(0 0 0 / 28%), 0 0 14px rgb(255 183 87 / 12%), inset 0 1px 0 rgb(255 255 255 / 9%); }
.secondary-label { color: #c5ecff; font-size: .52rem; font-weight: 900; letter-spacing: .09em; text-shadow: 0 1px 3px #091523; white-space: nowrap; }
.stat-value { color: #fff9e9; font-size: .92rem; line-height: 1.05; font-weight: 950; font-variant-numeric: tabular-nums; text-shadow: 0 1px 3px #091523; white-space: nowrap; }
.stat-value span { color: #cbd8e4; font-size: .72em; }
.science-track, .shelter-track { display: block; box-sizing: border-box; width: 100%; height: 6px; overflow: hidden; margin: .12rem 0 0 auto; border: 1px solid rgb(255 255 255 / 35%); border-radius: 999px; background: rgb(3 12 21 / 75%); box-shadow: inset 0 1px 2px rgb(0 0 0 / 50%); }
.science-track > span, .shelter-track > span { display: block; height: 100%; border-radius: inherit; transition: width 360ms cubic-bezier(.2,.8,.2,1); }
.science-track > span { background: linear-gradient(90deg, #77c8ff, #b1e9ff 55%, #f0fcff); box-shadow: 0 0 10px rgb(112 200 255 / 70%); }
.shelter-track > span { background: linear-gradient(90deg, #e8a95f, #ffd885 58%, #fff0bd); box-shadow: 0 0 10px rgb(255 194 105 / 60%); }
.shelter-note { display: block; margin: .06rem 0 0; color: #f0dfc1; font-size: .56rem; font-weight: 750; letter-spacing: .015em; text-shadow: 0 1px 3px #171317; white-space: nowrap; }
.stat-icon-button { position: relative; z-index: 1; display: grid; place-items: center; flex: 0 0 2.4rem; width: 2.4rem; height: 2.4rem; padding: 0; border: 2px solid color-mix(in srgb, currentColor, transparent 24%); border-radius: 50%; background: transparent; color: #d6d1c6; font: inherit; cursor: pointer; pointer-events: auto; box-shadow: 0 0 0 3px rgb(10 23 35 / 65%), 0 0 15px color-mix(in srgb, currentColor, transparent 70%), inset 0 1px 3px rgb(255 255 255 / 18%); transition: color 180ms ease, transform 240ms cubic-bezier(.2,.85,.25,1), border-color 180ms ease, box-shadow 180ms ease; }
.stat-icon-button > span { display: grid; place-items: center; width: 100%; height: 100%; font-size: 1.16rem; filter: drop-shadow(0 1px 2px rgb(0 0 0 / 45%)); }
.stat-icon-button:hover, .stat-widget.is-expanded .stat-icon-button { color: #fff3d4; border-color: currentColor; box-shadow: 0 0 0 3px rgb(10 23 35 / 74%), 0 0 20px color-mix(in srgb, currentColor, transparent 53%), inset 0 1px 4px rgb(255 255 255 / 22%); transform: scale(1.08); }
.stat-icon-button:hover > span, .stat-icon-button:focus-visible > span { animation: stat-icon-spin .5s cubic-bezier(.2,.8,.2,1) both; }
.stat-icon-button:focus-visible { outline: 2px solid #fff1ba; outline-offset: 2px; }
.science-icon { color: #a5dcff; }
.shelter-icon { color: #ffd18b; }
.progress-pop { position: absolute; z-index: 3; top: 50%; right: 2.62rem; display: flex; align-items: center; gap: .02rem; color: #f4f0e7; font-size: .76rem; font-weight: 800; line-height: 1; white-space: nowrap; text-shadow: 0 1px 4px rgb(0 0 0 / 85%); translate: 0 -50%; transform-origin: 85% 100%; animation: progress-pop-in .32s cubic-bezier(.18,1.4,.42,1) both, progress-pop-away .24s 1.22s ease-in forwards; pointer-events: none; }
.progress-numerator { position: relative; display: grid; min-width: .62em; height: 1em; overflow: hidden; place-items: center; font-variant-numeric: tabular-nums; }
.count-old, .count-new { grid-area: 1 / 1; }
.count-old { animation: count-roll-away .3s .22s cubic-bezier(.4,0,.7,.2) both; }
.count-new { color: #fff8e8; animation: count-roll-in .34s .22s cubic-bezier(.2,.9,.25,1.2) both; }
.progress-denominator { display: inline-block; color: #e1ddd4; font-size: .72em; font-weight: 650; animation: denominator-nudge .28s .2s ease-out both; }
.science-pop { color: #d9ebfa; }
.shelter-pop { color: #eee1c9; }
.feedback { position: absolute; top: 122px; left: 14px; display: flex; align-items: flex-start; gap: .42rem; width: min(260px, calc(100% - 28px)); margin: 0; padding: 0; border: 0; background: transparent; color: #fff3dc; font-size: .64rem; line-height: 1.35; text-shadow: 0 1px 4px #111722; }
.feedback { translate: var(--hud-feedback-x, 0px) var(--hud-feedback-y, 0px); }
.feedback-copy { display: grid; justify-items: start; gap: .16rem; min-width: 0; }
.feedback-copy > span { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.feedback strong { display: inline-flex; align-items: center; min-height: 1rem; padding: .04rem .34rem; border: 1px solid rgb(255 213 133 / 54%); border-radius: 999px; background: rgb(255 195 81 / 18%); color: #ffe19c; font-size: .52rem; letter-spacing: .08em; box-shadow: inset 0 1px 0 rgb(255 255 255 / 14%); }
.feedback-mark { width: .95rem; height: .95rem; display: grid; place-items: center; flex: 0 0 auto; border: 1px solid rgb(255 219 145 / 55%); border-radius: 50%; background: rgb(255 193 79 / 18%); color: #ffe19c; font-size: .76rem; font-weight: 950; box-shadow: 0 0 9px rgb(255 184 76 / 18%); }
.delayed-effects { box-sizing: border-box; position: absolute; top: 180px; left: 14px; width: min(250px, calc(100% - 28px)); margin: 0; padding: .42rem .52rem; border: 1px solid rgb(117 207 255 / 42%); border-left: 3px solid #67d6ec; border-radius: 9px; background: rgb(8 24 38 / 82%); color: #fff1cf; text-shadow: 0 1px 4px #171317; box-shadow: 0 5px 14px rgb(0 0 0 / 22%), inset 0 1px 0 rgb(255 255 255 / 8%); backdrop-filter: blur(5px); }
.delayed-effects { translate: var(--hud-delayed-x, 0px) var(--hud-delayed-y, 0px); }
.delayed-heading { color: #8ceaff; font-size: .54rem; font-weight: 950; letter-spacing: .1em; text-shadow: 0 0 8px rgb(88 215 247 / 25%); }
.delayed-item { display: grid; grid-template-columns: auto 1fr; gap: .35rem; margin: .18rem 0 0; color: #f6f2e7; font-size: .61rem; }
.delayed-timing { color: #ffd880; font-weight: 900; white-space: nowrap; }
.units-note { display: none; }
.achievement-toast { --toast-gold: #f3c76f; box-sizing: border-box; position: absolute; z-index: 12; top: 12px; left: 50%; display: grid; grid-template-columns: 3.1rem minmax(0, 1fr) 1rem; align-items: center; gap: .85rem; width: min(440px, calc(100% - 2rem)); min-height: 104px; padding: .8rem 1rem; border: 2px solid #f4d48e; border-radius: 12px; background: linear-gradient(110deg, rgb(60 48 34 / 98%), rgb(35 43 42 / 98%) 45%, rgb(30 37 40 / 98%)); color: #fff8e8; box-shadow: 0 18px 70px rgb(0 0 0 / 52%), 0 0 24px rgb(244 196 104 / 25%), inset 0 1px 0 rgb(255 248 220 / 22%); font: 650 .9rem/1.4 system-ui, sans-serif; animation: toast-in .52s cubic-bezier(.16,1.35,.4,1) both, toast-pulse .95s .55s 3 ease-in-out, toast-out .42s 4.75s ease-in forwards; }
.achievement-toast::before, .achievement-toast::after { position: absolute; width: 9px; height: 9px; border: 1px solid var(--toast-gold); background: #624b31; content: ''; transform: rotate(45deg); }
.achievement-toast::before { top: -6px; left: 18%; }
.achievement-toast::after { right: 18%; bottom: -6px; }
.toast-medal { width: 3rem; height: 3rem; display: grid; place-items: center; border: 2px solid #ffe6a8; border-radius: 50%; background: radial-gradient(circle at 35% 28%, #fff0b0, #e5a847 55%, #a65d2d); box-shadow: 0 0 18px rgb(248 197 103 / 45%), inset 0 1px 4px #fff7d9; }
.toast-medal svg { width: 1.75rem; height: 1.75rem; fill: none; stroke: #573b20; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.65; }
.toast-copy { display: grid; gap: .3rem; }
.toast-copy > strong { color: #ffdc96; font-size: .68rem; font-weight: 950; letter-spacing: .1em; text-shadow: 0 1px #50391f; }
.toast-message { display: grid; gap: .12rem; }
.toast-message > b { color: #ffdc96; font-size: .84rem; font-weight: 900; line-height: 1.15; }
.toast-message > span { color: #fff8e8; font-size: .82rem; }
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
@keyframes reserve-critical-pulse { 0%, 100% { box-shadow: inset 0 1px 2px rgb(0 0 0 / 20%); } 50% { box-shadow: 0 0 7px color-mix(in srgb, var(--reserve-color), transparent 52%), inset 0 1px 2px rgb(0 0 0 / 20%); } }
@keyframes toast-in { 0% { opacity: 0; transform: translate(-50%, -18px) scale(.72); } 68% { opacity: 1; transform: translate(-50%, 4px) scale(1.035); } 100% { opacity: 1; transform: translate(-50%, 0) scale(1); } }
@keyframes toast-pulse { 0%, 100% { box-shadow: 0 18px 70px rgb(0 0 0 / 52%), 0 0 24px rgb(244 196 104 / 25%), inset 0 1px 0 rgb(255 248 220 / 22%); } 50% { box-shadow: 0 18px 70px rgb(0 0 0 / 52%), 0 0 35px rgb(255 215 133 / 58%), inset 0 1px 0 rgb(255 248 220 / 35%); } }
@keyframes toast-out { to { opacity: 0; transform: translate(-50%, -9px) scale(.96); } }
@keyframes spark-spin { 50% { transform: rotate(40deg) scale(1.25); } }
@media (max-width: 420px) {
  .hud-header { top: 50px; left: 10px; width: min(224px, calc(100% - 20px)); }
  .shift-track { top: 100px; left: 10px; width: 160px; }
  .reserve-grid { left: 10px; bottom: 38px; width: min(215px, calc(100% - 20px)); padding: .48rem .5rem; }
  .secondary-grid { top: 32px; right: 10px; bottom: auto; gap: .26rem; }
  .feedback, .delayed-effects { left: 10px; width: min(222px, calc(100% - 20px)); }
  .feedback { top: 117px; }
  .delayed-effects { top: 171px; }
  .reserve-grid { gap: .3rem; }
  .reserve-card { min-height: 20px; padding: 0; }
  .reserve-meter { height: 7px; }
  .stat-widget.is-expanded { width: min(168px, calc(100vw - 20px)); }
  .stat-icon-button { flex-basis: 2.2rem; width: 2.2rem; height: 2.2rem; }
  .stat-widget.is-expanded .stat-detail { width: calc(100% - 2.2rem); }
  .achievement-toast { grid-template-columns: 2.5rem minmax(0, 1fr) .7rem; gap: .55rem; min-height: 90px; padding: .68rem .72rem; font-size: .82rem; }
  .toast-medal { width: 2.45rem; height: 2.45rem; }
  .toast-medal svg { width: 1.5rem; height: 1.5rem; }
  .toast-copy > strong { font-size: .58rem; }
}
@media (prefers-reduced-motion: reduce) {
  .shift-track > span, .reserve-fill, .science-track > span, .icon-tooltip, .stat-widget, .stat-detail, .stat-icon-button { transition: none; }
  .hud-header, .shift-track, .reserve-grid, .science-widget, .shelter-widget, .feedback, .delayed-effects, .achievement-toast { translate: none !important; }
  .progress-pop { translate: 0 -50% !important; }
  .motion-up, .motion-down, .reserve-icon-wrap:hover, .reserve-icon:focus-visible, .reserve-card:has(.reserve-meter:hover) .reserve-icon-wrap, .stat-icon-button:hover > span, .stat-icon-button:focus-visible > span, .progress-pop, .count-old, .count-new, .progress-denominator, .fill-up::after, .fill-full::after, .low-pulse .reserve-meter, .achievement-toast, .toast-spark { animation: none; }
}
</style>
