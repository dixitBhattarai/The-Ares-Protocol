import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import { HABITAT } from '../../contracts/habitat';
import { SAMPLE_SITE } from '../../contracts/exploration';
import type { ModelKit, WorldResources } from './resources';

/** Practical path lights and a coherent visual language, without extra light/shadow passes. */
export function createVisualUpgrade(kit: ModelKit, resources: WorldResources) {
  const group = new THREE.Group();
  group.name = 'outpost-wayfinding';
  const metal = resources.material(new THREE.MeshStandardMaterial({ color: '#5f777a', roughness: .65, metalness: .45 }));
  const enamel = resources.material(new THREE.MeshStandardMaterial({ color: '#c3c9b8', roughness: .78 }));
  const warm = resources.material(new THREE.MeshStandardMaterial({
    color: '#f3c477', emissive: '#b97d39', emissiveIntensity: .65, roughness: .6,
  }));
  const cool = resources.material(new THREE.MeshStandardMaterial({
    color: '#b1dfd2', emissive: '#4d9e98', emissiveIntensity: .6, roughness: .5,
  }));
  const dark = resources.material(new THREE.MeshStandardMaterial({ color: '#1f353a', roughness: .82 }));
  const stationColors = { habitat: '#f0c383', solar: '#9dd6e3', greenhouse: '#a6d9ad' } as const;

  // Low inset lamps flank the existing +Z doorway approaches. They do not
  // pretend to illuminate a scene through a light source that isn't present.
  for (const station of STATIONS) {
    const accent = resources.material(new THREE.MeshStandardMaterial({
      color: stationColors[station.id], emissive: stationColors[station.id], emissiveIntensity: .24, roughness: .7,
    }));
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const x = station.position.x + side * 1.14;
        const z = station.position.z + 3.48 + i * .55;
        kit.box(group, metal, [.13, .045, .28], [x, .025, z]);
        kit.flatBox(group, accent, [.06, .008, .18], [x, .052, z]);
      }
    }
    // Flush threshold strip and tactile bars connect the building to its path.
    kit.flatBox(group, dark, [1.45, .012, .34], [station.position.x, .025, station.position.z + 3.48]);
    for (const x of [-.55, -.33, -.11, .11, .33, .55]) {
      kit.flatBox(group, enamel, [.06, .008, .23], [station.position.x + x, .035, station.position.z + 3.48]);
    }
    const trim = kit.flatBox(group, accent, [1.38, .05, .035], [station.position.x, 2.53, station.position.z + 3.22]);
    trim.name = `${station.id}-threshold-accent`;
  }

  // Flush edge lights make the conceptual pressure envelope legible without
  // covering it in bloom or blocking the Mars landscape.
  for (let i = 0; i < 32; i++) {
    const angle = i / 32 * Math.PI * 2;
    const x = Math.cos(angle) * (HABITAT.radius - .2);
    const z = HABITAT.centerZ + Math.sin(angle) * (HABITAT.radius - .2);
    if (Math.abs(x) < 1.4 && z > 9) continue; // The airlock approach stays clear.
    const base = kit.box(group, dark, [.16, .06, .3], [x, .04, z]);
    const top = kit.flatBox(group, i % 4 ? cool : warm, [.075, .01, .18], [x, .075, z]);
    base.rotation.y = top.rotation.y = -angle;
  }

  // A surveyed route from the outer door to the sample site. Sparse markers
  // are navigational props, not a second giant world-space text overlay.
  const start = new THREE.Vector3(0, .018, HABITAT.outerZ + .45);
  const end = new THREE.Vector3(SAMPLE_SITE.x, .018, SAMPLE_SITE.z - .2);
  const direction = end.clone().sub(start);
  const forward = Math.atan2(direction.x, direction.z);
  for (let i = 0; i < 7; i++) {
    const point = start.clone().lerp(end, i / 6);
    for (const side of [-1, 1]) {
      const marker = kit.flatBox(group, i % 2 ? warm : enamel, [.045, .008, .2], [
        point.x + Math.cos(forward) * side * .5, point.y, point.z - Math.sin(forward) * side * .5,
      ]);
      marker.rotation.y = forward;
    }
  }

  // A small physical rover-track motif suggests scientific field operations.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const mark = kit.flatBox(group, dark, [.22, .003, .04], [5.45 + side * .28, .012, 12.2 + i * .33]);
      mark.rotation.y = -.18;
    }
  }

  // A plain, stable communication beacon. Only its slow, restrained readout
  // changes; there is no strobe, lens flare, extra RAF or high-cost point light.
  const beacon = new THREE.Group();
  beacon.name = 'outpost-status-beacon';
  beacon.position.set(-1.6, 0, 9.3);
  group.add(beacon);
  kit.cylinder(beacon, metal, [.035, 1.1, .035], [0, .55, 0]);
  kit.cylinder(beacon, dark, [.09, .08, .09], [0, 1.08, 0]);
  const signalMaterial = resources.material(cool.clone());
  kit.cylinder(beacon, signalMaterial, [.065, .09, .065], [0, 1.15, 0]);
  kit.cylinder(beacon, enamel, [.085, .025, .085], [0, 1.21, 0]);
  let clock = 0;
  return {
    group,
    update(seconds: number, active: boolean, reduced: boolean) {
      if (active && !reduced && Number.isFinite(seconds)) clock += THREE.MathUtils.clamp(seconds, 0, .1);
      signalMaterial.emissiveIntensity = reduced ? .6 : .6 + Math.sin(clock * .9) * .08;
    },
  };
}
