<script setup lang="ts">
import { computed } from 'vue';
import type { FlightControlKey, FlightControlStep, FlightStage } from '../../contracts';

const props = defineProps<{
  stage: FlightStage;
  progress: number;
  step: number;
  feedback: string;
  telemetry: string;
  paused: boolean;
  controls: readonly FlightControlStep[];
}>();

const emit = defineEmits<{
  control: [key: FlightControlKey];
  pause: [];
  continue: [];
}>();

const interactive = computed(() => props.stage === 'launch' || props.stage === 'landing');
const steps = computed(() => interactive.value ? props.controls : []);
const activeStep = computed(() => steps.value[Math.min(props.step, Math.max(0, steps.value.length - 1))]);
const percent = computed(() => Math.round(Math.min(1, Math.max(0, props.progress)) * 100));

function keyLabel(key: FlightControlKey): string {
  return key === 'Space' ? 'SPACE' : key.replace('Key', '');
}
</script>

<template>
  <section class="flight-panel" aria-label="Spaceflight controls">
    <p class="eyebrow">{{ stage === 'launch' ? 'EARTH · LAUNCH CONTROL' : stage === 'landing' ? 'MARS · GUIDED LANDING' : stage === 'orbit-autopilot' ? 'ORBIT · AUTOPILOT' : stage === 'transfer' ? 'DEEP SPACE · AUTOPILOT' : 'MARS · TOUCHDOWN' }}</p>
    <h2>{{ stage === 'launch' ? 'Launch sequence' : stage === 'landing' ? 'Bring Ares down safely' : stage === 'orbit-autopilot' ? 'Climbing to orbit' : stage === 'transfer' ? 'Cruise to Mars' : 'Touchdown sequence' }}</h2>

    <template v-if="interactive && activeStep">
      <p class="intro">{{ stage === 'launch' ? 'Use the cockpit prompts to start and guide liftoff. Then autopilot takes over.' : 'Follow the landing cues. Small corrections are enough; a wrong key never resets your progress.' }}</p>
      <div class="guidance" role="status" aria-live="polite">
        <kbd>{{ keyLabel(activeStep.key) }}</kbd>
        <div><strong>{{ activeStep.action }}</strong><span>{{ activeStep.explanation }}</span></div>
      </div>
      <ol class="checklist" :aria-label="stage === 'launch' ? 'Launch controls' : 'Landing controls'">
        <li v-for="(item, index) in steps" :key="`${item.key}-${item.action}`" :class="{ done: index < step, current: index === step }">
          <span aria-hidden="true">{{ index < step ? '✓' : index + 1 }}</span>{{ item.action }}
        </li>
      </ol>
      <div class="button-row" aria-label="Keyboard control alternatives">
        <button v-for="item in steps" :key="`button-${item.key}-${item.action}`" type="button" :disabled="paused" @click="emit('control', item.key)">
          <kbd>{{ keyLabel(item.key) }}</kbd> {{ item.action }}
        </button>
      </div>
    </template>

    <template v-else>
      <p class="intro">{{ stage === 'transfer' ? 'The flight computer holds the planned course while the crew rests. This is a compressed story sequence, not real travel time.' : stage === 'orbit-autopilot' ? 'Guidance is completing orbital insertion. Watch the rocket climb; you will take over again for the Mars landing.' : 'Autopilot is lowering the lander for the final approach.' }}</p>
      <progress :value="percent" max="100" aria-label="Flight stage progress" />
      <button class="continue" type="button" :disabled="paused" @click="emit('continue')">{{ stage === 'orbit-autopilot' ? 'Continue to orbit checks' : stage === 'transfer' ? 'Begin Mars approach' : 'Finish touchdown' }}</button>
    </template>

    <p v-if="telemetry" class="telemetry">{{ telemetry }}</p>
    <p v-if="feedback" class="feedback" role="status">{{ feedback }}</p>
    <div class="footer">
      <span>W/S = thrust · A/D = steer · Space = confirm</span>
      <button type="button" @click="emit('pause')">{{ paused ? 'Resume' : 'Pause' }}</button>
    </div>
  </section>
</template>

<style scoped>
.flight-panel { padding: 18px; color: #18313c; background: #f5f8f7; border: 1px solid #c9d8d4; border-radius: 14px; font-size: 13px; line-height: 1.5; }
.eyebrow { margin: 0 0 6px; color: #54747a; font-size: 10px; font-weight: 800; letter-spacing: .12em; }
h2 { margin: 0 0 8px; color: #173541; font-size: 20px; }
.intro { margin: 0 0 12px; }
.guidance { display: flex; gap: 12px; align-items: center; padding: 12px; color: #15333e; background: #e0f3ef; border: 1px solid #97c9be; border-radius: 10px; }
.guidance kbd { min-width: 48px; text-align: center; font-size: 17px; }
.guidance strong, .guidance span { display: block; }
.guidance span { color: #42616a; font-size: 12px; }
kbd { display: inline-block; padding: 3px 8px; color: #142d37; background: #fff; border: 1px solid #a9c0c0; border-radius: 5px; box-shadow: 0 2px 0 #aec1c0; font-family: ui-monospace, Consolas, monospace; font-weight: 800; }
.checklist { display: grid; gap: 5px; margin: 12px 0; padding: 0; list-style: none; }
.checklist li { display: flex; gap: 8px; align-items: center; color: #50666b; }
.checklist li > span { width: 22px; height: 22px; display: inline-grid; place-items: center; background: #e4e9e7; border-radius: 50%; font-size: 11px; font-weight: 800; }
.checklist li.current { color: #173541; font-weight: 750; }
.checklist li.current > span { color: white; background: #168070; }
.checklist li.done > span { color: #176246; background: #d5efdf; }
.button-row { display: grid; gap: 7px; }
button { min-height: 42px; padding: 8px 10px; text-align: left; color: #173541; background: #fff; border: 1px solid #adc2c0; border-radius: 8px; cursor: pointer; }
button:hover:not(:disabled) { background: #e6f3ef; }
button:disabled { opacity: .55; cursor: not-allowed; }
button:focus-visible { outline: 3px solid #c17231; outline-offset: 2px; }
button kbd { margin-right: 8px; }
.telemetry { margin: 12px 0 0; padding: 9px; color: #38535c; background: #e9efee; border-radius: 7px; font-size: 11px; font-variant-numeric: tabular-nums; }
.feedback { min-height: 1.2em; color: #285a59; }
.footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; color: #597077; font-size: 10px; }
.footer button { text-align: center; min-width: 76px; }
.continue { display: block; width: 100%; margin-top: 12px; text-align: center; font-weight: 750; }
progress { width: 100%; height: 12px; accent-color: #168070; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; } }
</style>
