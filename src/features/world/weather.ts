import * as THREE from 'three';
import type { GameState } from '../../contracts';
import { HABITAT } from '../../contracts/habitat';
import type { WorldResources } from './resources';

/** Authored presentation of the supplied dust hazard; never creates hazards or resource losses. */
export function createWeatherTimeline() {
  let elapsed = 0, stormAt = -Infinity, warning = false, notice = '', previousElapsed = 0;
  return {
    setState(state: Readonly<GameState>) {
      elapsed = state.taskRun?.elapsed ?? 0;
      if (state.phase === 'ready' || elapsed < previousElapsed) { stormAt = -Infinity; warning = false; notice = ''; }
      const next = state.lastHazardNotice ?? '';
      const incoming = /dust/i.test(state.upcomingHazardNotice ?? '');
      if (/dust/i.test(next) && (next !== notice || warning && !incoming)) stormAt = elapsed;
      warning = incoming; notice = next; previousElapsed = elapsed;
    },
    strength() {
      const age = elapsed - stormAt;
      const event = age >= 0 && age < 30 ? 1 - THREE.MathUtils.smoothstep(age, 12, 30) : 0;
      return Math.max(warning ? .65 : 0, event);
    },
  };
}

/** Layered wind-driven dust outside the pressure dome; no rainfall or invented lightning. */
export function createMarsWeather(scene: THREE.Scene, resources: WorldResources) {
  const timeline = createWeatherTimeline(), group = new THREE.Group(); group.name = 'martian-weather'; scene.add(group);
  const side = 64, pixels = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const r = Math.hypot((x - 31.5) / 32, (y - 31.5) / 32);
    const noise = .65 + .35 * Math.sin(x * .7 + Math.sin(y * .23) * 3) * Math.sin(y * .49);
    pixels.set([255, 255, 255, Math.round(Math.max(0, 1 - r) ** 2 * noise * 200)], (y * side + x) * 4);
  }
  const texture = resources.texture(new THREE.DataTexture(pixels, side, side)); texture.needsUpdate = true;
  const veil = resources.material(new THREE.SpriteMaterial({ map: texture, color: '#ac6947', transparent: true, opacity: 0, depthWrite: false, fog: true }));
  const sheets = Array.from({ length: 28 }, (_, i) => {
    const sprite = new THREE.Sprite(veil); sprite.scale.set(22 + i % 4 * 6, 9 + i % 3 * 3, 1); group.add(sprite); return sprite;
  });
  const count = 1100, positions = new Float32Array(count * 3);
  const geometry = resources.geometry(new THREE.BufferGeometry()); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const grains = resources.material(new THREE.PointsMaterial({ map: texture, color: '#ebc595', size: .18, transparent: true, opacity: 0, depthWrite: false }));
  const points = new THREE.Points(geometry, grains); points.frustumCulled = false; group.add(points);
  const baseFog = new THREE.Color('#b87d69'), stormFog = new THREE.Color('#a66e4d'), horizon = new THREE.Color('#e0987c'), blueGlow = new THREE.Color('#7ec3ed');
  let strength = 0, clock = 0;
  function outside(x: number, z: number) { return Math.hypot(x, z - HABITAT.centerZ) > HABITAT.radius + 1; }
  return {
    setState(state: Readonly<GameState>) { timeline.setState(state); if (state.phase === 'ready') strength = 0; },
    intensity: () => strength,
    update(seconds: number, active: boolean, reduced: boolean) {
      if (!active) return;
      const dt = Number.isFinite(seconds) ? THREE.MathUtils.clamp(seconds, 0, .1) : 0;
      strength = reduced ? timeline.strength() : THREE.MathUtils.damp(strength, timeline.strength(), .8, dt);
      if (!reduced) clock += dt;
      group.visible = strength > .015;
      veil.opacity = strength * .65; grains.opacity = reduced ? 0 : strength * .9;
      for (let i = 0; i < sheets.length; i++) {
        const x = ((i * 17.3 + clock * (3 + strength * 8)) % 140) - 70, z = [-34, -21, 18, 32][i % 4];
        sheets[i].position.set(x, 3 + i % 5 * 1.1, z); sheets[i].visible = outside(x, z);
      }
      for (let i = 0; i < count; i++) {
        const x = ((i * 13.73 + clock * (7 + strength * 16)) % 140) - 70, z = ((i * 23.17 + clock * 3) % 140) - 70;
        positions[i * 3] = x; positions[i * 3 + 1] = outside(x, z) ? .2 + (i % 57) * .14 + Math.sin(clock + i) * .12 : -5; positions[i * 3 + 2] = z;
      }
      geometry.attributes.position.needsUpdate = true;
      if (scene.fog instanceof THREE.FogExp2) { scene.fog.density = .0095 + strength * .035; scene.fog.color.copy(baseFog).lerp(stormFog, strength); }
      // The landmark uses custom distance haze in clear weather; blend it out in a dust front.
      scene.getObjectByName('olympus-mons-distant')?.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          material.opacity = 1 - THREE.MathUtils.smoothstep(strength, .08, .7);
          material.transparent = material.opacity < 1; material.depthWrite = material.opacity === 1;
        }
      });
      const sky = scene.getObjectByName('mars-gradient-sky') as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | undefined;
      sky?.material.uniforms.horizon.value.copy(horizon).lerp(stormFog, strength * .85);
      sky?.material.uniforms.sunBlueGlow.value.copy(blueGlow).lerp(stormFog, strength);
    },
    dispose() { scene.remove(group); },
  };
}
