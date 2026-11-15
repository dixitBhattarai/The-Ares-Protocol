<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import earthTextureUrl from '../../assets/earth_atmos_2048.jpg';
import cloudsTextureUrl from '../../assets/earth_clouds_1024.png';
import moonTextureUrl from '../../assets/moon_1024.jpg';
import { soundFX } from '../game/audio';

const emit = defineEmits<{ start: []; explore: []; account: [] }>();

const earthCanvas = ref<HTMLCanvasElement>();
const showSettings = ref(false);
const showCredits = ref(false);

const soundVolume = ref(80);
const soundMuted = ref(!soundFX.enabled);
const highQuality = ref(true);

watch(soundVolume, (newVol) => {
  if (newVol === 0) {
    soundMuted.value = true;
    soundFX.enabled = false;
  } else {
    soundMuted.value = false;
    soundFX.enabled = true;
  }
});

watch(soundMuted, (muted) => {
  soundFX.enabled = !muted;
  if (!muted && soundVolume.value === 0) {
    soundVolume.value = 80;
  }
});

function testAudioBeep() {
  soundFX.playDecision();
}

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let earthMesh: THREE.Mesh | null = null;
let cloudsMesh: THREE.Mesh | null = null;
let atmosphereMesh: THREE.Mesh | null = null;
let moonMesh: THREE.Mesh | null = null;
let animationId = 0;

function initEarthScene() {
  if (!earthCanvas.value) return;

  const canvasWidth = 140;
  const canvasHeight = 140;
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  renderer = new THREE.WebGLRenderer({
    canvas: earthCanvas.value,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(canvasWidth, canvasHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const textureLoader = new THREE.TextureLoader();

  // 1. Photorealistic 3D Earth — Scaled down for realistic celestial perspective
  const earthRadius = 0.52; // Smaller, distant planetary scale
  const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
  const earthTexture = textureLoader.load(earthTextureUrl);
  earthTexture.colorSpace = THREE.SRGBColorSpace;

  const earthMat = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.55,
    metalness: 0.08,
  });
  earthMesh = new THREE.Mesh(earthGeo, earthMat);
  // Earth's natural 23.4-degree axial tilt
  earthMesh.rotation.z = -0.409;
  scene.add(earthMesh);

  // 2. Realistic Multi-layered Atmospheric Clouds
  const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.012, 64, 64);
  const cloudsTexture = textureLoader.load(cloudsTextureUrl);
  cloudsTexture.colorSpace = THREE.SRGBColorSpace;

  const cloudsMat = new THREE.MeshStandardMaterial({
    map: cloudsTexture,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
  });
  cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
  cloudsMesh.rotation.z = earthMesh.rotation.z;
  scene.add(cloudsMesh);

  // 3. Delicate Rayleigh Atmospheric Scattering Rim
  const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.025, 64, 64);
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.28,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
  scene.add(atmosphereMesh);

  // 4. Photorealistic Moon — Proportional size & texture
  const moonRadius = 0.14; // Correct relative size to Earth (approx 1/4)
  const moonGeo = new THREE.SphereGeometry(moonRadius, 48, 48);
  const moonTexture = textureLoader.load(moonTextureUrl);
  moonTexture.colorSpace = THREE.SRGBColorSpace;

  const moonMat = new THREE.MeshStandardMaterial({
    map: moonTexture,
    roughness: 0.95,
    metalness: 0.0,
  });
  moonMesh = new THREE.Mesh(moonGeo, moonMat);
  scene.add(moonMesh);

  // 5. Directional Solar Lighting (matches the sunrise from bottom-left horizon of Mars)
  const sunLight = new THREE.DirectionalLight(0xfff8ea, 3.4);
  sunLight.position.set(-6, -2.5, 4.5);
  scene.add(sunLight);

  // Soft cosmic ambient fill
  const cosmicAmbient = new THREE.AmbientLight(0x0f172a, 0.45);
  scene.add(cosmicAmbient);

  // Faint starlight backlight
  const starlight = new THREE.DirectionalLight(0x38bdf8, 0.25);
  starlight.position.set(5, 4, -3);
  scene.add(starlight);

  // Animation: Gentle planetary rotation and inclined Moon orbit
  let moonAngle = 0;
  const orbitRadiusX = 1.35;
  const orbitRadiusZ = 0.85;

  const animate = () => {
    if (earthMesh) earthMesh.rotation.y += 0.0018;
    if (cloudsMesh) cloudsMesh.rotation.y += 0.0024;

    if (moonMesh) {
      moonAngle += 0.0022;
      moonMesh.position.x = Math.cos(moonAngle) * orbitRadiusX;
      moonMesh.position.y = Math.sin(moonAngle) * 0.28;
      moonMesh.position.z = Math.sin(moonAngle) * orbitRadiusZ;
      moonMesh.rotation.y += 0.0012;
    }

    renderer?.render(scene!, camera!);
    animationId = requestAnimationFrame(animate);
  };
  animate();
}

onMounted(() => {
  initEarthScene();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  renderer?.dispose();
});
</script>

<template>
  <div class="landing-container" aria-label="Ares Protocol Main Menu">
    <!-- Photorealistic Mars Observatory Artwork: 16:9 responsive stage -->
    <div class="stage-wrapper">
      <img
        src="../../assets/mars_telescope_clean.jpg"
        alt="Astronaut on Mars looking at Earth through telescope"
        class="background-artwork"
      />

      <!-- 
        Active 3D spinning Earth and orbiting Moon
        Mounted exactly where the telescope points in the sky (88.35% left, 11.35% top)
      -->
      <div class="earth-orbit-anchor">
        <canvas ref="earthCanvas" class="three-earth-canvas"></canvas>
      </div>

      <!-- Menu options aligned in their usual positions on the left -->
      <nav class="game-menu-panel" aria-label="Game navigation">
        <div class="menu-items">
          <button
            class="title-menu-btn"
            type="button"
            @click="emit('start')"
          >
            <span class="btn-text">Start</span>
            <span class="laser-flare"></span>
          </button>

          <button class="field-menu-btn" type="button" @click="emit('explore')"><span>Explore Mars</span><small>Free roam · no survival drain · discover</small></button>

          <button
            class="title-menu-btn account-menu-btn"
            type="button"
            @click="emit('account')"
          >
            <span class="btn-text">Sign in to sync progress</span>
            <span class="laser-flare"></span>
          </button>

          <button
            class="title-menu-btn"
            type="button"
            @click="showSettings = true"
          >
            <span class="btn-text">Settings</span>
            <span class="laser-flare"></span>
          </button>

          <button
            class="title-menu-btn"
            type="button"
            @click="showCredits = true"
          >
            <span class="btn-text">Credits</span>
            <span class="laser-flare"></span>
          </button>
        </div>
      </nav>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="modal-backdrop" @click.self="showSettings = false">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Settings">
        <h2 class="modal-title">MISSION SETTINGS</h2>
        
        <div class="setting-row">
          <div class="setting-header-row">
            <label for="volumeRange">Comm Audio Volume: {{ soundMuted ? 'Muted' : `${soundVolume}%` }}</label>
            <button
              type="button"
              class="test-sound-btn"
              title="Test audio beacon"
              @click="testAudioBeep"
            >
              🔊 Test Tone
            </button>
          </div>
          <input
            id="volumeRange"
            v-model.number="soundVolume"
            type="range"
            min="0"
            max="100"
            :disabled="soundMuted"
          />
        </div>

        <div class="setting-row checkbox-row">
          <input id="muteCheck" v-model="soundMuted" type="checkbox" />
          <label for="muteCheck">Mute All Outpost Synthesizer Audio</label>
        </div>

        <div class="setting-row checkbox-row">
          <input id="qualityCheck" v-model="highQuality" type="checkbox" />
          <label for="qualityCheck">High Fidelity 3D Planetary Shadows</label>
        </div>

        <div class="modal-actions">
          <button class="modal-close-btn" @click="showSettings = false">Done</button>
        </div>
      </div>
    </div>

    <!-- Credits Modal -->
    <div v-if="showCredits" class="modal-backdrop" @click.self="showCredits = false">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Credits">
        <h2 class="modal-title">MISSION CREDITS</h2>
        <p class="credits-team">The Ares Protocol Outpost Lab</p>
        
        <ul class="credits-list">
          <li><strong>Himamshu</strong> — 3D World & Engine Lead</li>
          <li><strong>Saurav</strong> — HUD</li>
          <li><strong>Dixit</strong> — UI Lead</li>
          <li><strong>Anshu</strong> — Physics & Controls Engineer</li>
          <li><strong>Genius</strong> — NASA Data & Mission Architect</li>
          <li><strong>Rohit</strong> — Game Loop & Pitch</li>
        </ul>

        <div class="modal-actions">
          <button class="modal-close-btn" @click="showCredits = false">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800;900&display=swap');

.landing-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: 'Orbitron', -apple-system, sans-serif;
  color: #fff;
}

.stage-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  max-width: calc(100vh * 16 / 9);
  max-height: calc(100vw * 9 / 16);
  aspect-ratio: 16 / 9;
}

.background-artwork {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

/* 
  Anchored right where the telescope points in the sky:
  left: 88.35%, top: 11.35%
*/
.earth-orbit-anchor {
  position: absolute;
  top: 11.35%;
  left: 88.35%;
  transform: translate(-50%, -50%);
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 5;
}

.three-earth-canvas {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 0 4px rgba(96, 165, 250, 0.65));
}

.game-menu-panel {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  width: 45%;
  height: 100%;
  padding: 0 4.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
}

.menu-items {
  display: flex;
  flex-direction: column;
  gap: 2.2rem;
}

/* Buttons with Orbitron bold font and laser flare */
.title-menu-btn {
  position: relative;
  background: transparent;
  border: none;
  padding: 0.6rem 0;
  cursor: pointer;
  outline: none;
  text-align: left;
  display: inline-block;
  width: fit-content;
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.25, 1.2);
}

.title-menu-btn .btn-text {
  display: block;
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(2rem, 3.8vw, 3.2rem);
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.08em;
  text-shadow: 0 0 15px rgba(0, 229, 255, 0.7), 0 0 35px rgba(0, 229, 255, 0.4);
  transition: all 0.2s ease;
}

.title-menu-btn .laser-flare {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(
    90deg,
    rgba(0, 229, 255, 0) 0%,
    rgba(0, 229, 255, 0.9) 35%,
    rgba(255, 255, 255, 1) 50%,
    rgba(0, 229, 255, 0.9) 65%,
    rgba(0, 229, 255, 0) 100%
  );
  box-shadow: 0 0 14px rgba(0, 229, 255, 0.9), 0 0 28px rgba(0, 180, 255, 0.7);
  opacity: 0.6;
  transition: all 0.25s ease;
}

.title-menu-btn:hover {
  transform: translateX(14px) scale(1.06);
}

.title-menu-btn:hover .btn-text {
  color: #e6ffff;
  text-shadow: 0 0 20px #ffffff, 0 0 35px #00e5ff, 0 0 60px #00a2ff;
}

.title-menu-btn:hover .laser-flare {
  opacity: 1;
  height: 4px;
  box-shadow: 0 0 22px rgba(0, 229, 255, 1), 0 0 45px rgba(0, 180, 255, 1);
}

.title-menu-btn:focus-visible {
  outline: 2px dashed #00e5ff;
  outline-offset: 6px;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-card {
  width: min(520px, 90vw);
  background: #0d1117;
  border: 1px solid rgba(255, 140, 0, 0.35);
  border-radius: 12px;
  padding: 2.4rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 35px rgba(255, 120, 0, 0.2);
  font-family: system-ui, -apple-system, sans-serif;
}

.modal-title {
  margin-top: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.4rem;
  letter-spacing: 0.08em;
  color: #ff9800;
}

.setting-row {
  margin: 1.6rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  color: #e2e8f0;
}

.setting-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-sound-btn {
  padding: 4px 10px;
  background: #1c303c;
  border: 1px solid #4a6677;
  border-radius: 6px;
  color: #d0e4ee;
  font-family: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.test-sound-btn:hover {
  background: #284455;
  color: #ffffff;
  border-color: #ff9800;
}

.setting-row input[type="range"] {
  accent-color: #ff9800;
}

.checkbox-row {
  flex-direction: row;
  align-items: center;
  gap: 0.8rem;
}

.checkbox-row input[type="checkbox"] {
  accent-color: #ff9800;
  width: 1.2rem;
  height: 1.2rem;
}

.credits-team {
  font-size: 1.1rem;
  color: #f1f5f9;
}

.credits-list {
  padding-left: 1.2rem;
  line-height: 1.9;
  color: #94a3b8;
}

.modal-actions {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
}

.modal-close-btn {
  padding: 0.75rem 2rem;
  background: #ff9800;
  color: #000;
  border: none;
  border-radius: 6px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-close-btn:hover {
  background: #f57c00;
}

/* Responsiveness */
@media (max-width: 768px) {
  .game-menu-panel {
    width: 100%;
    padding: 2rem;
    align-items: center;
    justify-content: flex-end;
    padding-bottom: 3.5rem;
  }

  .menu-items {
    align-items: center;
    gap: 1.8rem;
  }

  .title-menu-btn {
    text-align: center;
  }
}
</style>

<style scoped>.field-menu-btn{display:grid;gap:6px;justify-items:start;border:2px solid #00e5ff88;border-left:5px solid #00e5ff;border-radius:10px;padding:14px 20px;background:linear-gradient(135deg, #0e2a36ee, #143e4fee);color:#e6f9ff;cursor:pointer;text-align:left;box-shadow:0 8px 24px rgba(0,0,0,0.6), 0 0 20px rgba(0,229,255,0.35);transition:all .2s cubic-bezier(.2,.8,.25,1.15)}.field-menu-btn span{font-family:'Orbitron',sans-serif;font-size:18px;font-weight:800;letter-spacing:.05em;color:#00e5ff;text-shadow:0 0 12px rgba(0,229,255,0.6)}.field-menu-btn small{font-size:11px;letter-spacing:.08em;color:#bde7f7;font-weight:600}.field-menu-btn:hover{background:linear-gradient(135deg, #163f52, #1c566d);border-color:#00e5ff;box-shadow:0 12px 30px rgba(0,0,0,0.7), 0 0 35px rgba(0,229,255,0.6);transform:translateX(10px) scale(1.03)}.field-menu-btn:focus-visible{outline:3px solid #00e5ff;outline-offset:4px}@media(max-width:640px){.field-menu-btn{padding:10px 14px}.field-menu-btn span{font-size:14px}.field-menu-btn small{font-size:9px}}</style>
