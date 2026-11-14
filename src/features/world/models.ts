import * as THREE from 'three';
import { STATIONS, type StationId } from '../../contracts';
import { WorldResources, type ModelKit } from './resources';
import { createDustTexture, createSurfaceDetails } from './landscape';
import { createSlidingDoor } from './doors';

export interface StationVisual {
  screens: THREE.MeshStandardMaterial[];
  roof: THREE.Group;
  walls: THREE.Mesh[];
  door: ReturnType<typeof createSlidingDoor>;
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

export { createBuilding as createStation } from './buildings';

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
  const dust = resources.material(new THREE.MeshStandardMaterial({ map: createDustTexture(resources), color: '#d5b4a0', roughness: 1 }));
  const desert = resources.material(new THREE.MeshStandardMaterial({ color: '#985039', roughness: 1 }));
  const path = resources.material(new THREE.MeshStandardMaterial({ color: '#495351', roughness: .95 }));
  const paint = resources.material(new THREE.MeshBasicMaterial({ color: '#e5cfaa', transparent: true, opacity: .65 }));
  kit.flatBox(terrain, dust, [180, .15, 180], [0, -.29, 0]);
  // Matches the floor collider: the playable surface is perfectly flat at Y=0.
  kit.flatBox(terrain, dust, [40, .2, 40], [0, -.1, 0]);
  kit.box(terrain, path, [12, .008, 2.1], [0, .004, 0]);
  kit.box(terrain, path, [2.1, .008, 11.8], [0, .004, -.1]);
  const padGeometry = resources.geometry(new THREE.CircleGeometry(4.5, 48));
  const rimGeometry = resources.geometry(new THREE.RingGeometry(4.4, 4.45, 48));
  const rimMaterial = resources.material(new THREE.MeshBasicMaterial({ color: '#b9c9bd' }));
  for (const station of STATIONS) {
    const pad = new THREE.Mesh(padGeometry, path);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(station.position.x, .009, station.position.z);
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(station.position.x, .012, station.position.z);
    terrain.add(pad, rim);
  }
  terrain.add(createSurfaceDetails(resources));
  // Painted walkway guides stay flat and outside the station collision boxes.
  for (const x of [-1.02, 1.02]) for (let z = -4.2; z <= 4; z += .7) {
    kit.box(terrain, paint, [.045, .002, .3], [x, .01, z]);
  }
  for (const z of [-1.02, 1.02]) for (const x of [-3, -2.3, -1.6, 1.6, 2.3, 3]) {
    kit.box(terrain, paint, [.3, .002, .045], [x, .01, z]);
  }
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
