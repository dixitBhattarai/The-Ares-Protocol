<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PreparationLevel } from '../world/preflight';
import { PREPARATION } from '../world/preflight';
import { soundFX } from './audio';

const props = defineProps<{
  level: PreparationLevel;
  progress: number;
  paused: boolean;
}>();

const emit = defineEmits<{
  control: [step: string];
  pause: [];
  skip: [];
}>();

const totalSteps = computed(() => PREPARATION[props.level].steps.length);

// ==========================================
// 1. EARTH MINIGAME STATE (4 Visual Stages)
// ==========================================
// Stage 0: Fuel & Oxidizer Fill (Tap levers to fill Fuel and Oxidizer to 100%)
const fuelLevel = ref(30);
const oxidizerLevel = ref(30);

function fillFuel() {
  if (props.progress !== 0 || props.paused) return;
  soundFX.playDecision();
  fuelLevel.value = Math.min(100, fuelLevel.value + 35);
  checkFuelingComplete();
}

function fillOxidizer() {
  if (props.progress !== 0 || props.paused) return;
  soundFX.playOxygen();
  oxidizerLevel.value = Math.min(100, oxidizerLevel.value + 35);
  checkFuelingComplete();
}

function checkFuelingComplete() {
  if (fuelLevel.value >= 100 && oxidizerLevel.value >= 100) {
    soundFX.playFullReserve();
    emit('control', PREPARATION.earth.steps[0]);
  }
}

// Stage 1: Suit & Cabin O2 Pressure Pump (Mash plunger into green safe zone >= 80%)
const earthPressure = ref(20);
const pumpDown = ref(false);

function pumpO2() {
  if (props.progress !== 1 || props.paused) return;
  soundFX.playOxygen();
  pumpDown.value = true;
  setTimeout(() => (pumpDown.value = false), 140);
  earthPressure.value = Math.min(100, earthPressure.value + 25);

  if (earthPressure.value >= 80) {
    soundFX.playFullReserve();
    emit('control', PREPARATION.earth.steps[1]);
  }
}

// Stage 2: Cargo Bay Loading (Click items to snap into glowing rocket slots)
const loadedCells = ref({
  battery: false,
  food: false,
  tools: false,
});

function loadCargoItem(item: 'battery' | 'food' | 'tools') {
  if (props.progress !== 2 || props.paused || loadedCells.value[item]) return;
  soundFX.playShield();
  loadedCells.value[item] = true;

  if (loadedCells.value.battery && loadedCells.value.food && loadedCells.value.tools) {
    soundFX.playFullReserve();
    emit('control', PREPARATION.earth.steps[2]);
  }
}

// Stage 3: Rocket Launch Ignition (Flip safety cover, then press BIG RED button)
const launchCoverOpen = ref(false);
const launching = ref(false);

function flipCover() {
  if (props.progress !== 3 || props.paused) return;
  soundFX.playDecision();
  launchCoverOpen.value = !launchCoverOpen.value;
}

function launchRocket() {
  if (props.progress !== 3 || props.paused || !launchCoverOpen.value || launching.value) return;
  launching.value = true;
  soundFX.playVictory();
  emit('control', PREPARATION.earth.steps[3]);
}

// ==========================================
// 2. ORBIT / SPACE MINIGAME STATE (3 Stages)
// ==========================================
// Stage 0: Radar Dish Alignment (Aim dish at Earth, lock angle at 90°)
const dishAngle = ref(30);

function turnDish(delta: number) {
  if (props.progress !== 0 || props.paused) return;
  soundFX.playDecision();
  const next = Math.max(0, Math.min(180, dishAngle.value + delta));
  dishAngle.value = next;
  if (Math.abs(dishAngle.value - 90) <= 12) {
    dishAngle.value = 90;
    soundFX.playFullReserve();
    emit('control', PREPARATION.space.steps[0]);
  }
}

function snapDishDirect(angle: number) {
  if (props.progress !== 0 || props.paused) return;
  dishAngle.value = angle;
  if (angle === 90) {
    soundFX.playFullReserve();
    emit('control', PREPARATION.space.steps[0]);
  } else {
    soundFX.playDecision();
  }
}

// Stage 1: Wave Frequency Matching (Click wave shape card to match target sine wave)
const selectedWave = ref(1);
const targetWave = 3; // Card index 3 is matching wave

function chooseWave(index: number) {
  if (props.progress !== 1 || props.paused) return;
  selectedWave.value = index;
  if (index === targetWave) {
    soundFX.playFullReserve();
    emit('control', PREPARATION.space.steps[1]);
  } else {
    soundFX.playDecision();
  }
}

// Stage 2: Flight Plan Uplink Laser (Pull transmission lever to beam flight plan to Earth)
const transmitting = ref(false);

function transmitFlightPlan() {
  if (props.progress !== 2 || props.paused || transmitting.value) return;
  transmitting.value = true;
  soundFX.playTransmission();
  setTimeout(() => {
    soundFX.playVictory();
    emit('control', PREPARATION.space.steps[2]);
  }, 450);
}

// Reset state on level switch
watch(
  () => props.level,
  () => {
    fuelLevel.value = 30;
    oxidizerLevel.value = 30;
    earthPressure.value = 20;
    loadedCells.value = { battery: false, food: false, tools: false };
    launchCoverOpen.value = false;
    launching.value = false;
    dishAngle.value = 30;
    selectedWave.value = 1;
    transmitting.value = false;
  }
);
</script>

<template>
  <section
    class="visual-minigame"
    role="region"
    :aria-label="level === 'earth' ? 'Earth Preflight Minigame' : 'Space Station Minigame'"
  >
    <!-- Top Progress Ribbon: Stage Dots and Level Badge -->
    <header class="minigame-ribbon">
      <div class="mission-badge">
        <span class="live-dot" aria-hidden="true" />
        <span class="badge-title">{{ level === 'earth' ? '🚀 EARTH LAUNCH PAD' : '🛰️ ORBITAL CABIN' }}</span>
      </div>
      <div class="stage-stepper" aria-label="Minigame stages">
        <div
          v-for="i in totalSteps"
          :key="i"
          class="step-bubble"
          :class="{
            completed: i - 1 < progress,
            active: i - 1 === progress,
            pending: i - 1 > progress
          }"
        >
          <span v-if="i - 1 < progress">✓</span>
          <span v-else>{{ i }}</span>
        </div>
      </div>
    </header>

    <!-- ==================================================== -->
    <!-- EARTH MINIGAME                                       -->
    <!-- ==================================================== -->
    <div v-if="level === 'earth'" class="minigame-arena">
      <!-- -------------------------------------------------- -->
      <!-- STAGE 0: FUEL & OXIDIZER PUMPS                     -->
      <!-- -------------------------------------------------- -->
      <div v-if="progress === 0" class="stage-card fueling-stage">
        <div class="tanks-rack">
          <!-- Fuel Tank (Orange) -->
          <div class="tank-column" @click="fillFuel">
            <div class="tank-glass">
              <div
                class="tank-liquid fuel-liquid"
                :style="{ height: `${fuelLevel}%` }"
              />
              <span class="tank-pct">{{ fuelLevel }}%</span>
            </div>
            <button
              type="button"
              class="tank-pump-btn fuel-btn"
              :disabled="paused || fuelLevel >= 100"
              aria-label="Pump Rocket Fuel"
              @click="fillFuel"
            >
              <span class="pump-btn-icon">🔥</span>
              <span>{{ fuelLevel >= 100 ? '✓ FULL' : 'FUEL' }}</span>
            </button>
          </div>

          <!-- Rocket Silhouette Separator -->
          <div class="fueling-rocket-icon" aria-hidden="true">
            🚀
          </div>

          <!-- Oxidizer Tank (Cyan) -->
          <div class="tank-column" @click="fillOxidizer">
            <div class="tank-glass">
              <div
                class="tank-liquid ox-liquid"
                :style="{ height: `${oxidizerLevel}%` }"
              />
              <span class="tank-pct">{{ oxidizerLevel }}%</span>
            </div>
            <button
              type="button"
              class="tank-pump-btn ox-btn"
              :disabled="paused || oxidizerLevel >= 100"
              aria-label="Pump Liquid Oxidizer"
              @click="fillOxidizer"
            >
              <span class="pump-btn-icon">❄️</span>
              <span>{{ oxidizerLevel >= 100 ? '✓ FULL' : 'OXYGEN' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- -------------------------------------------------- -->
      <!-- STAGE 1: O2 SUIT PRESSURE PUMP                     -->
      <!-- -------------------------------------------------- -->
      <div v-else-if="progress === 1" class="stage-card pump-stage">
        <!-- Visual Gauge with Astronaut Visor -->
        <div class="gauge-display" @click="pumpO2">
          <div class="visor-container" :class="{ sealed: earthPressure >= 80 }">
            <span class="astronaut-icon">👨‍🚀</span>
            <div
              class="visor-bubble"
              :style="{ opacity: Math.max(0.1, (100 - earthPressure) / 100) }"
              title="Oxygen pressure"
            />
            <div v-if="earthPressure >= 80" class="seal-sparkle">✨</div>
          </div>

          <!-- Circular Pressure Gauge SVG -->
          <div class="meter-radial">
            <svg viewBox="0 0 100 100" class="radial-svg" aria-hidden="true">
              <circle cx="50" cy="50" r="42" class="track-bg" />
              <!-- Safe Target Zone (80% - 100%) -->
              <circle
                cx="50"
                cy="50"
                r="42"
                class="target-arc"
                stroke-dasharray="52.8 264"
                stroke-dashoffset="-211.2"
              />
              <!-- Active Pressure Needle Fill -->
              <circle
                cx="50"
                cy="50"
                r="42"
                class="pressure-arc"
                :class="{ green: earthPressure >= 80 }"
                :stroke-dasharray="`${earthPressure * 2.64} 264`"
              />
            </svg>
            <div class="meter-text">
              <span class="pressure-number">{{ earthPressure }}%</span>
              <span class="pressure-tag" :class="{ ok: earthPressure >= 80 }">
                {{ earthPressure >= 80 ? '✓ SAFE' : 'LOW' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Big Tactile Plunger Pump -->
        <button
          type="button"
          class="plunger-button"
          :class="{ pressed: pumpDown }"
          :disabled="paused"
          aria-label="Pump Oxygen Pressure"
          @click="pumpO2"
        >
          <div class="plunger-handle">
            <span class="plunger-grip" />
            <span class="plunger-shaft" />
          </div>
          <div class="plunger-base">
            <span class="pump-icon">🫁</span>
            <span class="pump-label">PUMP!</span>
          </div>
        </button>
      </div>

      <!-- -------------------------------------------------- -->
      <!-- STAGE 2: CARGO LOADING DOCK                        -->
      <!-- -------------------------------------------------- -->
      <div v-else-if="progress === 2" class="stage-card cargo-stage">
        <!-- Rocket Cargo Hold Sockets (Top) -->
        <div class="cargo-hold" aria-label="Rocket Cargo Bay">
          <!-- Battery Socket -->
          <div
            class="cargo-socket"
            :class="{ filled: loadedCells.battery }"
            @click="loadCargoItem('battery')"
          >
            <span class="socket-icon">{{ loadedCells.battery ? '⚡' : '⭕' }}</span>
            <span class="socket-name">POWER</span>
          </div>

          <!-- Food Socket -->
          <div
            class="cargo-socket"
            :class="{ filled: loadedCells.food }"
            @click="loadCargoItem('food')"
          >
            <span class="socket-icon">{{ loadedCells.food ? '🍎' : '⭕' }}</span>
            <span class="socket-name">FOOD</span>
          </div>

          <!-- Tools Socket -->
          <div
            class="cargo-socket"
            :class="{ filled: loadedCells.tools }"
            @click="loadCargoItem('tools')"
          >
            <span class="socket-icon">{{ loadedCells.tools ? '🛠️' : '⭕' }}</span>
            <span class="socket-name">TOOLS</span>
          </div>
        </div>

        <!-- Cargo Crates to Click (Bottom) -->
        <div class="cargo-dock">
          <!-- Battery Crate -->
          <button
            type="button"
            class="cargo-crate"
            :class="{ slotted: loadedCells.battery }"
            :disabled="paused || loadedCells.battery"
            aria-label="Load Power Battery"
            @click="loadCargoItem('battery')"
          >
            <span class="crate-emoji">🔋</span>
            <span class="crate-check" v-if="loadedCells.battery">✓</span>
          </button>

          <!-- Food Crate -->
          <button
            type="button"
            class="cargo-crate"
            :class="{ slotted: loadedCells.food }"
            :disabled="paused || loadedCells.food"
            aria-label="Load Food Rations"
            @click="loadCargoItem('food')"
          >
            <span class="crate-emoji">📦</span>
            <span class="crate-check" v-if="loadedCells.food">✓</span>
          </button>

          <!-- Tool Crate -->
          <button
            type="button"
            class="cargo-crate"
            :class="{ slotted: loadedCells.tools }"
            :disabled="paused || loadedCells.tools"
            aria-label="Load Tool Kit"
            @click="loadCargoItem('tools')"
          >
            <span class="crate-emoji">🔬</span>
            <span class="crate-check" v-if="loadedCells.tools">✓</span>
          </button>
        </div>
      </div>

      <!-- -------------------------------------------------- -->
      <!-- STAGE 3: ROCKET LAUNCH IGNITION                    -->
      <!-- -------------------------------------------------- -->
      <div v-else-if="progress === 3" class="stage-card launch-stage">
        <!-- Visual Rocket on Gantry -->
        <div class="launch-pad-view">
          <div class="gantry-left">🗼</div>
          <div class="rocket-center" :class="{ blastoff: launching }">
            <span class="rocket-sprite">🚀</span>
            <div v-if="launching" class="rocket-plume">🔥💨</div>
          </div>
          <div class="gantry-right">🗼</div>
        </div>

        <!-- Physical Flip-Cover Arcade Launch Switch -->
        <div class="arcade-switch-box">
          <!-- Flip Cover (Yellow/Black Hazard Stripes) -->
          <button
            type="button"
            class="hazard-flip-cover"
            :class="{ opened: launchCoverOpen }"
            :disabled="paused"
            aria-label="Safety Switch Cover"
            @click="flipCover"
          >
            <span class="hazard-stripes" />
            <span class="cover-handle">{{ launchCoverOpen ? '🔓 OPEN' : '🔒 FLIP UP' }}</span>
          </button>

          <!-- Big Red Arcade Launch Button -->
          <button
            type="button"
            class="big-red-button"
            :class="{ ready: launchCoverOpen, fire: launching }"
            :disabled="paused || !launchCoverOpen || launching"
            aria-label="Ignite Rocket Launch"
            @click="launchRocket"
          >
            <span class="arcade-glow" />
            <span class="arcade-text">{{ launching ? '🚀 BLAST OFF!' : '🔥 LAUNCH' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- ORBIT / SPACE MINIGAME                               -->
    <!-- ==================================================== -->
    <div v-else class="minigame-arena">
      <!-- -------------------------------------------------- -->
      <!-- STAGE 0: RADAR DISH ALIGNMENT                      -->
      <!-- -------------------------------------------------- -->
      <div v-if="progress === 0" class="stage-card radar-stage">
        <!-- Visual Space Horizon -->
        <div class="radar-arena">
          <div class="earth-globe" title="Earth Base">
            <span class="globe-icon">🌍</span>
            <div class="target-ping" />
          </div>

          <!-- Pulsing Laser Beam -->
          <div
            class="antenna-beam"
            :class="{ locked: dishAngle === 90 }"
            :style="{
              opacity: Math.max(0.2, 1 - Math.abs(dishAngle - 90) / 90),
              transform: `rotate(${dishAngle - 90}deg)`
            }"
          />

          <!-- Rotating Satellite Dish -->
          <div
            class="station-dish"
            :style="{ transform: `rotate(${dishAngle - 90}deg)` }"
            @click="turnDish(dishAngle < 90 ? 20 : -20)"
          >
            🛰️
          </div>
        </div>

        <!-- Signal Strength Bars -->
        <div class="signal-readout">
          <div class="signal-bars">
            <span
              v-for="bar in 5"
              :key="bar"
              class="bar"
              :class="{
                lit: bar <= Math.round(Math.max(1, 5 - Math.abs(dishAngle - 90) / 18)),
                green: dishAngle === 90
              }"
            />
          </div>
          <span class="signal-pct">{{ dishAngle === 90 ? 'LOCKED! 100%' : `${Math.max(10, Math.round(100 - Math.abs(dishAngle - 90) * 1.1))}%` }}</span>
        </div>

        <!-- Tactile Directional Steering Controls -->
        <div class="dish-steering">
          <button
            type="button"
            class="steer-arrow-btn"
            :disabled="paused || dishAngle <= 10"
            aria-label="Rotate Left"
            @click="turnDish(-20)"
          >
            ◀
          </button>

          <!-- Direct Target Alignment Sweet-Spot Button -->
          <button
            type="button"
            class="steer-center-btn"
            :class="{ aligned: dishAngle === 90 }"
            :disabled="paused"
            aria-label="Lock on Earth"
            @click="snapDishDirect(90)"
          >
            🎯 LOCK
          </button>

          <button
            type="button"
            class="steer-arrow-btn"
            :disabled="paused || dishAngle >= 170"
            aria-label="Rotate Right"
            @click="turnDish(20)"
          >
            ▶
          </button>
        </div>
      </div>

      <!-- -------------------------------------------------- -->
      <!-- STAGE 1: WAVE FREQUENCY MATCHING                   -->
      <!-- -------------------------------------------------- -->
      <div v-else-if="progress === 1" class="stage-card wave-stage">
        <!-- Visual Dual-Channel Oscilloscope -->
        <div class="oscilloscope-screen" aria-label="Frequency Oscilloscope">
          <!-- Target Wave (Cyan Top Channel) -->
          <div class="scope-channel">
            <span class="channel-dot cyan" />
            <svg viewBox="0 0 200 40" class="scope-svg" aria-hidden="true">
              <path
                d="M 0 20 Q 25 2, 50 20 T 100 20 T 150 20 T 200 20"
                class="target-sine"
              />
            </svg>
          </div>

          <!-- Player Adjusted Wave (Bottom Channel) -->
          <div class="scope-channel">
            <span class="channel-dot" :class="selectedWave === targetWave ? 'gold' : 'amber'" />
            <svg viewBox="0 0 200 40" class="scope-svg" aria-hidden="true">
              <path
                :d="selectedWave === 3
                  ? 'M 0 20 Q 25 2, 50 20 T 100 20 T 150 20 T 200 20'
                  : selectedWave === 1
                    ? 'M 0 20 Q 50 8, 100 20 T 200 20'
                    : selectedWave === 2
                      ? 'M 0 20 Q 33 5, 66 20 T 133 20 T 200 20'
                      : 'M 0 20 Q 12 0, 25 20 T 50 20 T 75 20 T 100 20 T 125 20 T 150 20 T 175 20 T 200 20'"
                class="player-sine"
                :class="{ matched: selectedWave === targetWave }"
              />
            </svg>
          </div>

          <div class="scope-status" :class="{ matched: selectedWave === targetWave }">
            {{ selectedWave === targetWave ? '✨ MATCHED!' : 'MATCH THE WAVE' }}
          </div>
        </div>

        <!-- 4 Visual Waveform Shape Cards (No confusing kHz text!) -->
        <div class="wave-cards">
          <!-- Wave 1: Slow/flat -->
          <button
            type="button"
            class="wave-tile"
            :class="{ active: selectedWave === 1 }"
            :disabled="paused"
            aria-label="Slow Waveform"
            @click="chooseWave(1)"
          >
            <span class="wave-glyph">〰️</span>
          </button>

          <!-- Wave 2: Mild -->
          <button
            type="button"
            class="wave-tile"
            :class="{ active: selectedWave === 2 }"
            :disabled="paused"
            aria-label="Mild Waveform"
            @click="chooseWave(2)"
          >
            <span class="wave-glyph">∿∿</span>
          </button>

          <!-- Wave 3: Perfect match -->
          <button
            type="button"
            class="wave-tile"
            :class="{ active: selectedWave === 3, golden: selectedWave === 3 }"
            :disabled="paused"
            aria-label="Matching Waveform"
            @click="chooseWave(3)"
          >
            <span class="wave-glyph">∿∿∿</span>
          </button>

          <!-- Wave 4: Super tight -->
          <button
            type="button"
            class="wave-tile"
            :class="{ active: selectedWave === 4 }"
            :disabled="paused"
            aria-label="Tight Waveform"
            @click="chooseWave(4)"
          >
            <span class="wave-glyph">≋≋</span>
          </button>
        </div>
      </div>

      <!-- -------------------------------------------------- -->
      <!-- STAGE 2: TRANSMISSION UPLINK BEAM                  -->
      <!-- -------------------------------------------------- -->
      <div v-else-if="progress === 2" class="stage-card uplink-stage">
        <!-- Visual Deep Space Laser Corridor -->
        <div class="uplink-corridor" :class="{ active: transmitting }">
          <div class="spacecraft">🛰️</div>
          <div class="laser-track">
            <span class="laser-core" :class="{ fired: transmitting }" />
            <span v-if="transmitting" class="photon-packet" />
          </div>
          <div class="destination">🌍</div>
        </div>

        <!-- Giant Uplink Trigger Button -->
        <button
          type="button"
          class="uplink-fire-btn"
          :class="{ transmitting }"
          :disabled="paused || transmitting"
          aria-label="Beam Flight Plan to Earth"
          @click="transmitFlightPlan"
        >
          <span class="beam-glow" aria-hidden="true" />
          <span class="beam-icon">⚡</span>
          <span class="beam-label">{{ transmitting ? 'BEAMING...' : '⚡ TRANSMIT BEAM' }}</span>
        </button>
      </div>
    </div>

    <!-- Bottom Controls: Pause & Skip -->
    <footer class="minigame-footer">
      <button
        type="button"
        class="secondary-chip"
        :aria-label="paused ? 'Resume preparation' : 'Pause preparation'"
        @click="$emit('pause')"
      >
        {{ paused ? '▶ Resume' : '⏸ Pause' }}
      </button>

      <button
        type="button"
        class="secondary-chip skip-chip"
        aria-label="Fast-Forward preparation"
        @click="$emit('skip')"
      >
        ⚡ Fast-Forward
      </button>
    </footer>
  </section>
</template>

<style scoped>
.visual-minigame {
  padding: 16px;
  background: linear-gradient(150deg, rgba(20, 34, 46, 0.97), rgba(12, 22, 30, 0.98));
  border: 1px solid #365063;
  border-radius: 14px;
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.55);
  user-select: none;
}

/* Ribbon */
.minigame-ribbon {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid #284152;
}
.mission-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 10px #34d399;
}
.badge-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #fde68a;
}
.stage-stepper {
  display: flex;
  gap: 6px;
}
.step-bubble {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  background: #182c3a;
  border: 1px solid #365266;
  color: #94a3b8;
  transition: all 0.2s ease;
}
.step-bubble.completed {
  background: #065f46;
  border-color: #34d399;
  color: #a7f3d0;
}
.step-bubble.active {
  background: #d97706;
  border-color: #fde047;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.6);
  transform: scale(1.1);
}

/* Minigame Arena */
.minigame-arena {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.stage-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* ==================================================== */
/* EARTH MINIGAME STYLES                                */
/* ==================================================== */
/* Stage 0: Fueling Tanks */
.tanks-rack {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  width: 100%;
}
.tank-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.tank-glass {
  position: relative;
  width: 65px;
  height: 110px;
  background: #0c1a24;
  border: 2px solid #2d485a;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.6);
}
.tank-liquid {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  transition: height 0.25s ease;
}
.fuel-liquid {
  background: linear-gradient(180deg, #f97316, #ea580c);
  box-shadow: 0 0 14px rgba(249, 115, 22, 0.5);
}
.ox-liquid {
  background: linear-gradient(180deg, #38bdf8, #0284c7);
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.5);
}
.tank-pct {
  position: relative;
  font-size: 13px;
  font-weight: 850;
  color: #ffffff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  z-index: 2;
}
.tank-pump-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid #4a6679;
  background: #183345;
  color: #f1f5f9;
  transition: transform 0.1s ease, filter 0.1s ease;
}
.tank-pump-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.2);
}
.fuel-btn {
  border-color: #f97316;
}
.ox-btn {
  border-color: #38bdf8;
}
.fueling-rocket-icon {
  font-size: 42px;
  opacity: 0.85;
}

/* Stage 1: Plunger Pump */
.gauge-display {
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
}
.visor-container {
  position: relative;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background: #152634;
  border: 3px solid #38bdf8;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.25);
  transition: all 0.3s ease;
}
.visor-container.sealed {
  border-color: #34d399;
  box-shadow: 0 0 20px rgba(52, 211, 153, 0.45);
}
.astronaut-icon {
  font-size: 38px;
}
.visor-bubble {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(200, 220, 240, 0.2) 70%);
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.seal-sparkle {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 18px;
  animation: spin-pulse 1.5s infinite;
}

.meter-radial {
  position: relative;
  width: 110px;
  height: 110px;
}
.radial-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.track-bg {
  fill: none;
  stroke: #1e3343;
  stroke-width: 11;
}
.target-arc {
  fill: none;
  stroke: rgba(52, 211, 153, 0.3);
  stroke-width: 11;
}
.pressure-arc {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 11;
  stroke-linecap: round;
  transition: stroke-dasharray 0.2s ease, stroke 0.2s ease;
}
.pressure-arc.green {
  stroke: #34d399;
}
.meter-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.pressure-number {
  font-size: 17px;
  font-weight: 850;
  color: #ffffff;
}
.pressure-tag {
  font-size: 10px;
  font-weight: 800;
  color: #94a3b8;
}
.pressure-tag.ok {
  color: #34d399;
}

.plunger-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  max-width: 250px;
  padding: 12px 18px;
  border-radius: 12px;
  background: linear-gradient(145deg, #0284c7, #0369a1);
  border: 2px solid #38bdf8;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(2, 132, 199, 0.45);
  transition: transform 0.1s ease, filter 0.1s ease;
}
.plunger-button:hover:not(:disabled) {
  filter: brightness(1.15);
  transform: translateY(-2px);
}
.plunger-button.pressed {
  transform: scale(0.94);
}
.plunger-base {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pump-icon {
  font-size: 22px;
}
.pump-label {
  font-size: 15px;
  font-weight: 850;
  letter-spacing: 0.06em;
}

/* Stage 2: Cargo Loading */
.cargo-hold {
  display: flex;
  gap: 14px;
}
.cargo-socket {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  border: 2px dashed #4b6475;
  background: rgba(24, 40, 52, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.25s ease;
}
.cargo-socket.filled {
  border: 2px solid #34d399;
  background: rgba(6, 95, 70, 0.45);
  box-shadow: 0 0 16px rgba(52, 211, 153, 0.35);
}
.socket-icon {
  font-size: 24px;
}
.socket-name {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #cbd5e1;
}

.cargo-dock {
  display: flex;
  gap: 14px;
}
.cargo-crate {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background: linear-gradient(145deg, #1e3a4e, #132735);
  border: 2px solid #3b5f77;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}
.cargo-crate:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.05);
  border-color: #60a5fa;
  box-shadow: 0 8px 20px rgba(96, 165, 250, 0.35);
}
.cargo-crate.slotted {
  opacity: 0.35;
  cursor: default;
  transform: none;
  border-color: #34d399;
}
.crate-emoji {
  font-size: 32px;
}
.crate-check {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 12px;
  font-weight: 900;
  color: #34d399;
}

/* Stage 3: Rocket Launch Ignition */
.launch-pad-view {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}
.gantry-left,
.gantry-right {
  font-size: 28px;
  opacity: 0.6;
}
.rocket-center {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.45s ease;
}
.rocket-center.blastoff {
  transform: translateY(-40px) scale(1.2);
}
.rocket-sprite {
  font-size: 52px;
}
.rocket-plume {
  font-size: 24px;
  margin-top: -10px;
  animation: blast-shake 0.1s infinite;
}

.arcade-switch-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 250px;
}
.hazard-flip-cover {
  width: 100%;
  padding: 8px 14px;
  border-radius: 8px;
  background: repeating-linear-gradient(
    45deg,
    #b45309,
    #b45309 10px,
    #1e293b 10px,
    #1e293b 20px
  );
  border: 2px solid #f59e0b;
  color: #fef3c7;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);
  transition: transform 0.2s ease, filter 0.2s ease;
}
.hazard-flip-cover.opened {
  background: #1e293b;
  border-color: #34d399;
  color: #34d399;
  transform: translateY(-4px);
}
.big-red-button {
  position: relative;
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(145deg, #7f1d1d, #450a0a);
  border: 2px solid #ef4444;
  color: #fca5a5;
  opacity: 0.35;
  cursor: not-allowed;
  transition: all 0.2s ease;
}
.big-red-button.ready {
  opacity: 1;
  background: linear-gradient(145deg, #dc2626, #b91c1c);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 0 28px rgba(239, 68, 68, 0.65);
  animation: launch-glow 1.4s infinite;
}
.big-red-button.fire {
  background: #f97316;
  transform: scale(0.96);
}
.arcade-text {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

/* ==================================================== */
/* ORBIT / SPACE MINIGAME STYLES                        */
/* ==================================================== */
/* Stage 0: Radar Alignment */
.radar-arena {
  position: relative;
  width: 100%;
  max-width: 260px;
  height: 90px;
  background: #0d1e28;
  border: 1px solid #28475c;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  overflow: hidden;
}
.earth-globe {
  position: relative;
  font-size: 34px;
  z-index: 2;
}
.station-dish {
  font-size: 32px;
  z-index: 2;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.antenna-beam {
  position: absolute;
  top: 50%;
  left: 55px;
  right: 55px;
  height: 3px;
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.antenna-beam.locked {
  background: #34d399;
  box-shadow: 0 0 14px #34d399;
  height: 4px;
}

.signal-readout {
  display: flex;
  align-items: center;
  gap: 10px;
}
.signal-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 18px;
}
.signal-bars .bar {
  width: 6px;
  height: 6px;
  background: #334155;
  border-radius: 1px;
}
.signal-bars .bar:nth-child(2) { height: 9px; }
.signal-bars .bar:nth-child(3) { height: 12px; }
.signal-bars .bar:nth-child(4) { height: 15px; }
.signal-bars .bar:nth-child(5) { height: 18px; }

.signal-bars .bar.lit {
  background: #f59e0b;
}
.signal-bars .bar.lit.green {
  background: #34d399;
  box-shadow: 0 0 6px #34d399;
}
.signal-pct {
  font-size: 11px;
  font-weight: 850;
  color: #fde68a;
}

.dish-steering {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 250px;
}
.steer-arrow-btn {
  flex: 1;
  padding: 10px;
  font-size: 16px;
  font-weight: 900;
  border-radius: 8px;
  background: #183345;
  border: 1px solid #396380;
  color: #e2e8f0;
  cursor: pointer;
}
.steer-arrow-btn:hover:not(:disabled) {
  background: #234b66;
}
.steer-center-btn {
  flex: 1.4;
  padding: 10px;
  font-size: 11px;
  font-weight: 850;
  border-radius: 8px;
  background: #183345;
  border: 1px solid #396380;
  color: #fde68a;
  cursor: pointer;
}
.steer-center-btn.aligned {
  background: #065f46;
  border-color: #34d399;
  color: #a7f3d0;
}

/* Stage 1: Wave Frequency */
.oscilloscope-screen {
  width: 100%;
  max-width: 260px;
  background: #091720;
  border: 1px solid #23475a;
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.scope-channel {
  display: flex;
  align-items: center;
  gap: 8px;
}
.channel-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.channel-dot.cyan {
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
}
.channel-dot.amber {
  background: #f59e0b;
}
.channel-dot.gold {
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80;
}
.scope-svg {
  flex: 1;
  height: 28px;
}
.target-sine {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 3;
}
.player-sine {
  fill: none;
  stroke: #f59e0b;
  stroke-width: 3;
  transition: all 0.2s ease;
}
.player-sine.matched {
  stroke: #4ade80;
  stroke-width: 4;
}
.scope-status {
  text-align: center;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.08em;
  color: #f59e0b;
}
.scope-status.matched {
  color: #4ade80;
}

.wave-cards {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 260px;
}
.wave-tile {
  flex: 1;
  height: 52px;
  border-radius: 10px;
  background: #142a38;
  border: 1px solid #365970;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.wave-tile:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: #38bdf8;
}
.wave-tile.active {
  background: #0284c7;
  border-color: #38bdf8;
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.4);
}
.wave-tile.golden {
  background: #065f46;
  border-color: #34d399;
  box-shadow: 0 0 16px rgba(52, 211, 153, 0.5);
}
.wave-glyph {
  font-size: 16px;
  font-weight: 900;
  color: #ffffff;
}

/* Stage 2: Uplink Transmission */
.uplink-corridor {
  width: 100%;
  max-width: 260px;
  height: 76px;
  background: #0a1822;
  border: 1px solid #244658;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}
.spacecraft,
.destination {
  font-size: 30px;
}
.laser-track {
  position: relative;
  flex: 1;
  height: 5px;
  margin: 0 12px;
  background: #193344;
  border-radius: 3px;
  overflow: hidden;
}
.laser-core {
  position: absolute;
  inset: 0;
  background: transparent;
  transition: background 0.3s ease;
}
.laser-core.fired {
  background: linear-gradient(90deg, #818cf8, #38bdf8);
  box-shadow: 0 0 14px #38bdf8;
}
.photon-packet {
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 100%;
  background: #ffffff;
  box-shadow: 0 0 10px #ffffff;
  animation: photon-run 0.4s infinite linear;
}

.uplink-fire-btn {
  position: relative;
  width: 100%;
  max-width: 250px;
  padding: 14px;
  border-radius: 12px;
  background: linear-gradient(145deg, #7c3aed, #5b21b6);
  border: 2px solid #a78bfa;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(124, 58, 237, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.15s ease, filter 0.15s ease;
}
.uplink-fire-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.15);
}
.uplink-fire-btn.transmitting {
  background: #ec4899;
  border-color: #f472b6;
  transform: scale(0.96);
}
.beam-icon {
  font-size: 18px;
}
.beam-label {
  font-size: 14px;
  font-weight: 850;
  letter-spacing: 0.05em;
}

/* Footer Controls */
.minigame-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #233a4a;
}
.secondary-chip {
  padding: 6px 12px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 6px;
  background: #192b37;
  border: 1px solid #3c576b;
  color: #cbd5e1;
  cursor: pointer;
  transition: background 0.12s ease;
}
.secondary-chip:hover {
  background: #253e50;
  color: #ffffff;
}
.skip-chip {
  background: #223746;
  color: #fde68a;
  border-color: #55778f;
}

/* Animations */
@keyframes spin-pulse {
  0% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.25) rotate(180deg); }
  100% { transform: scale(1) rotate(360deg); }
}

@keyframes blast-shake {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes launch-glow {
  0%, 100% { box-shadow: 0 0 16px rgba(239, 68, 68, 0.5); }
  50% { box-shadow: 0 0 32px rgba(239, 68, 68, 0.95); }
}

@keyframes photon-run {
  0% { left: 0%; }
  100% { left: 100%; }
}
</style>
