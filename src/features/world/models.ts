import * as THREE from 'three';
import type { StationId } from '../../contracts';
import { WorldResources, type ModelKit } from './resources';

export interface StationVisual {
  group: THREE.Group;
  windows: THREE.MeshStandardMaterial;
  indicator: THREE.MeshStandardMaterial;
  beacon: THREE.MeshStandardMaterial;
  shelterPanels: THREE.Mesh[];
  selection: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
}

export const STATION_NAMES: Record<StationId, string> = {
  habitat: 'Habitat', solar: 'Solar station', greenhouse: 'Greenhouse',
};

export function createStation(id: StationId, kit: ModelKit, resources: WorldResources): StationVisual {
  const group = new THREE.Group();
  group.name = id;
  group.userData.stationId = id;
  const { ivory, trim, dark, orange, blue, green, soil } = kit.materials;
  const windows = resources.material(new THREE.MeshStandardMaterial({
    color: '#93d8db', emissive: '#76c5cf', emissiveIntensity: .2, roughness: .35,
  }));
  const indicator = resources.material(new THREE.MeshStandardMaterial({
    color: '#bce9b3', emissive: '#8ab982', emissiveIntensity: .3,
  }));
  const beacon = resources.material(new THREE.MeshStandardMaterial({
    color: '#91d0a3', emissive: '#91d0a3', emissiveIntensity: .2,
  }));
  const shelterPanels: THREE.Mesh[] = [];
  // All solid geometry remains within local X/Z +/-1.5, Y +/-1.
  kit.box(group, trim, [2.98, .16, 2.98], [0, -.91, 0]);
  if (id === 'habitat') {
    kit.box(group, ivory, [2.8, 1.5, 2.8], [0, -.08, 0]);
    kit.box(group, trim, [2.88, .18, 2.88], [0, .73, 0]);
    kit.box(group, ivory, [2.6, .12, 2.6], [0, .88, 0]);
    kit.box(group, orange, [.78, 1.3, .08], [0, -.16, 1.43]);
    kit.box(group, dark, [.56, 1.08, .04], [0, -.22, 1.48]);
    for (const x of [-.91, .91]) {
      kit.box(group, trim, [.63, .67, .06], [x, .04, 1.43]);
      kit.box(group, windows, [.49, .5, .025], [x, .07, 1.475]);
      const panel = kit.box(group, blue, [.65, .58, .025], [x, .07, 1.487]);
      panel.scale.y = .01;
      shelterPanels.push(panel);
    }
    kit.box(group, windows, [.04, .5, 1.1], [1.425, .1, 0]);
    kit.box(group, indicator, [.42, .08, .04], [0, .49, 1.48]);
  } else if (id === 'solar') {
    // A solid battery plinth makes the existing full box collider readable.
    kit.box(group, ivory, [2.8, 1.3, 2.8], [0, -.18, 0]);
    kit.box(group, trim, [2.9, .13, 2.9], [0, .48, 0]);
    kit.box(group, blue, [2.78, .14, 2.65], [0, .73, 0]);
    for (let x = -1.1; x <= 1.11; x += .55) {
      for (let z = -.99; z <= 1; z += .66) {
        kit.box(group, windows, [.48, .025, .58], [x, .815, z]);
      }
    }
    for (let x = -.95; x <= .96; x += .38) kit.box(group, trim, [.12, .65, .06], [x, -.14, 1.43]);
    kit.box(group, orange, [.6, .3, .06], [.8, .17, 1.44]);
    kit.box(group, indicator, [.36, .09, .025], [.8, .2, 1.485]);
  } else {
    kit.box(group, ivory, [2.85, .48, 2.85], [0, -.62, 0]);
    const glass = resources.material(new THREE.MeshStandardMaterial({
      color: '#8ed7c0', transparent: true, opacity: .18, depthWrite: false, roughness: .3,
    }));
    kit.box(group, glass, [2.8, 1.3, 2.8], [0, .22, 0]);
    for (const x of [-1.42, 1.42]) {
      for (const z of [-1.42, 1.42]) kit.box(group, trim, [.11, 1.42, .11], [x, .18, z]);
      kit.box(group, ivory, [.12, .12, 2.94], [x, .92, 0]);
    }
    for (const z of [-1.42, 0, 1.42]) kit.box(group, ivory, [2.9, .12, .12], [0, .92, z]);
    for (const x of [-.75, .75]) {
      kit.box(group, soil, [.8, .24, 2.3], [x, -.23, 0]);
      for (const z of [-.7, 0, .7]) {
        kit.cylinder(group, trim, [.025, .45, .025], [x, .04, z]);
        const leaf = kit.sphere(group, green, [.3, .12, .19], [x + .1, .2, z]);
        leaf.rotation.z = .4;
        const other = kit.sphere(group, green, [.27, .12, .2], [x - .13, .04, z]);
        other.rotation.z = -.4;
      }
    }
    kit.box(group, windows, [2.4, .045, .07], [0, .79, .8]);
    kit.box(group, indicator, [.45, .09, .04], [0, -.5, 1.46]);
  }
  kit.cylinder(group, trim, [.035, .12, .035], [1.4, .86, 1.4]);
  const lamp = kit.cylinder(group, beacon, [.07, .08, .07], [1.4, .94, 1.4]);
  lamp.name = `${id}-beacon`;
  const envelope = resources.geometry(new THREE.BoxGeometry(3.15, 2.1, 3.15));
  const outline = resources.geometry(new THREE.EdgesGeometry(envelope));
  const selection = new THREE.LineSegments(outline, resources.material(new THREE.LineBasicMaterial({ color: '#ffe0a2' })));
  selection.visible = false;
  // Selection is a non-solid annotation, not part of the collision/pick group.
  return { group, windows, indicator, beacon, shelterPanels, selection };
}

export function createGroundShadow(resources: WorldResources, width: number, depth: number): THREE.Mesh {
  const geometry = resources.geometry(new THREE.CircleGeometry(1, 24));
  const material = resources.material(new THREE.MeshBasicMaterial({ color: '#352c32', transparent: true, opacity: .16, depthWrite: false }));
  const shadow = new THREE.Mesh(geometry, material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(width, depth, 1);
  shadow.position.y = .014;
  return shadow;
}

export function createTerrain(kit: ModelKit, resources: WorldResources): THREE.Group {
  const terrain = new THREE.Group();
  const dust = resources.material(new THREE.MeshStandardMaterial({ color: '#b96547', roughness: 1 }));
  const desert = resources.material(new THREE.MeshStandardMaterial({ color: '#985039', roughness: 1 }));
  const path = resources.material(new THREE.MeshStandardMaterial({ color: '#d79a6d', roughness: 1 }));
  kit.box(terrain, desert, [180, .15, 180], [0, -.29, 0]);
  // Matches the floor collider: the playable surface is perfectly flat at Y=0.
  kit.box(terrain, dust, [40, .2, 40], [0, -.1, 0]);
  kit.box(terrain, path, [12, .008, 2.1], [0, .004, 0]);
  kit.box(terrain, path, [2.1, .008, 11.8], [0, .004, -.1]);
  const ring = resources.geometry(new THREE.RingGeometry(1.25, 1.35, 40));
  const landing = new THREE.Mesh(ring, resources.material(new THREE.MeshBasicMaterial({ color: '#e9c794', side: THREE.DoubleSide })));
  landing.rotation.x = -Math.PI / 2;
  landing.position.set(0, .012, 5);
  terrain.add(landing);
  for (const x of [-18.8, 18.8]) {
    for (let z = -18.8; z <= 18.8; z += 4.7) kit.box(terrain, path, [.12, .01, .65], [x, .01, z]);
  }
  for (const z of [-18.8, 18.8]) {
    for (let x = -18.8; x <= 18.8; x += 4.7) kit.box(terrain, path, [.65, .01, .12], [x, .01, z]);
  }
  // Deterministic scenery sits outside the movement area: no invisible obstacles.
  const rockGeometry = resources.geometry(new THREE.IcosahedronGeometry(1, 0));
  const rocks = new THREE.InstancedMesh(rockGeometry, desert, 70);
  const transform = new THREE.Object3D();
  for (let i = 0; i < 70; i++) {
    const angle = i * 2.399963;
    const radius = 29 + (i * 17 % 31);
    const size = .25 + (i * 13 % 11) * .12;
    transform.position.set(Math.cos(angle) * radius, -.05, Math.sin(angle) * radius);
    transform.scale.set(size * 1.5, size * .65, size);
    transform.rotation.set(i * .2, i, .1);
    transform.updateMatrix();
    rocks.setMatrixAt(i, transform.matrix);
  }
  terrain.add(rocks);
  return terrain;
}
