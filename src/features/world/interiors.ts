import * as THREE from 'three';
import { SPACECRAFT_SEAT } from '../../contracts';
import type { ModelKit, WorldResources } from './resources';

export interface RocketSeatVisual {
  marker: THREE.Group;
  harness: THREE.Group;
  indicator: THREE.MeshStandardMaterial;
}

export function dressRoom(room: THREE.Object3D, kit: ModelKit, resources: WorldResources) {
  const steel = resources.material(new THREE.MeshStandardMaterial({ color: '#536973', metalness: .65, roughness: .4 }));
  const light = resources.material(new THREE.MeshBasicMaterial({ color: '#c2ede6' }));
  for (let x = -2.5; x <= 2.5; x++) for (let z = -2.5; z <= 2.5; z++) {
    kit.flatBox(room, (Math.round(x + z) % 2) ? kit.materials.trim : steel, [.97, .025, .97], [x, .012, z]);
  }
  for (const x of [-2, -1, 0, 1, 2]) {
    kit.box(room, steel, [.04, 2.2, .07], [x, 1.12, -2.9]);
    kit.box(room, light, [.65, .035, .08], [x, 2.12, -2.82]);
  }
  for (const z of [-2, -.5, 1, 2.5]) {
    kit.box(room, steel, [.08, 2.25, .055], [-2.88, 1.12, z]);
    kit.box(room, steel, [5.8, .08, .06], [0, 2.3, z]);
  }
  for (const y of [.2, .38]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.75,y,2.5),new THREE.Vector3(-2.75,y,-2.7),new THREE.Vector3(2.6,y,-2.7)]);
    room.add(new THREE.Mesh(resources.geometry(new THREE.TubeGeometry(curve, 18, .035, 6, false)), steel));
  }
  // The interactive exit is placed at the front (+Z), aligned with room movement.
  return { steel, light };
}

/** Lightweight capsule ribs, equipment lockers and task-station lighting for the Ares flight cabin. */
export function dressRocketCabin(room: THREE.Object3D, kit: ModelKit, resources: WorldResources): void {
  const frame = resources.material(new THREE.MeshStandardMaterial({ color: '#526974', metalness: .72, roughness: .32 }));
  const panel = resources.material(new THREE.MeshStandardMaterial({ color: '#b8c6c5', metalness: .28, roughness: .68 }));
  const light = resources.material(new THREE.MeshBasicMaterial({ color: '#a8efd8' }));
  const warm = resources.material(new THREE.MeshBasicMaterial({ color: '#ffcf85' }));

  for (const z of [-2.65, -.9, .95, 2.55]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.72, .12, z), new THREE.Vector3(-2.72, 1.2, z),
      new THREE.Vector3(-2.24, 2.04, z), new THREE.Vector3(0, 2.35, z),
      new THREE.Vector3(2.24, 2.04, z), new THREE.Vector3(2.72, 1.2, z),
      new THREE.Vector3(2.72, .12, z),
    ]);
    room.add(new THREE.Mesh(resources.geometry(new THREE.TubeGeometry(curve, 24, .055, 7, false)), frame));
  }

  for (const side of [-1, 1]) {
    const locker = kit.box(room, panel, [.48, .62, 1.05], [side * 2.42, 1.43, 1.45]);
    locker.rotation.z = side * -.08;
    kit.box(room, kit.materials.trim, [.07, .46, .04], [side * 2.15, 1.43, 1.45]);
    kit.box(room, side < 0 ? light : warm, [.52, .035, .09], [side * 2.27, 2.04, .55]);
  }

  for (const x of [-1.9, -1.05, -.2, .65, 1.5]) {
    kit.box(room, frame, [.68, .035, .045], [x, 2.22, -.1]);
  }
  for (const x of [-1.8, 0, 1.8]) {
    kit.box(room, kit.materials.trim, [1.2, .045, .09], [x, 1.82, -1.78]);
    kit.box(room, x === 0 ? warm : light, [.34, .025, .06], [x, 1.85, -1.72]);
  }
}

/** A visible, proximity-gated pilot seat with an amber approach marker and a simple lap/shoulder harness. */
export function addRocketFlightSeat(parent: THREE.Object3D, kit: ModelKit, resources: WorldResources): RocketSeatVisual {
  const seat = new THREE.Group();
  seat.name = 'Ares flight seat';
  seat.position.set(SPACECRAFT_SEAT.x, 0, SPACECRAFT_SEAT.z);
  parent.add(seat);

  kit.cylinder(seat, kit.materials.trim, [.11, .48, .11], [0, .28, .14]);
  kit.flatBox(seat, kit.materials.dark, [.82, .16, .8], [0, .56, .13]);
  kit.box(seat, kit.materials.blue, [.72, .22, .64], [0, .68, .08]);
  kit.flatBox(seat, kit.materials.dark, [.82, .94, .16], [0, 1.08, .48]);
  kit.box(seat, kit.materials.blue, [.7, .76, .15], [0, 1.16, .37]);
  kit.box(seat, kit.materials.trim, [.44, .26, .16], [0, 1.68, .45]);
  for (const side of [-1, 1]) {
    kit.cylinder(seat, kit.materials.trim, [.07, .56, .07], [side * .44, .78, .1]);
    kit.flatBox(seat, kit.materials.trim, [.16, .09, .55], [side * .44, 1.02, .03]);
    kit.box(seat, kit.materials.orange, [.1, .11, .16], [side * .42, .8, -.2]);
  }
  kit.flatBox(seat, kit.materials.trim, [.68, .12, .46], [0, .1, -.08]);

  const harness = new THREE.Group();
  harness.name = 'seat harness';
  for (const side of [-1, 1]) {
    const strap = kit.box(harness, kit.materials.orange, [.09, .8, .055], [side * .2, 1.1, -.1]);
    strap.rotation.z = side * .48;
  }
  kit.box(harness, kit.materials.orange, [.54, .09, .055], [0, .84, -.1]);
  const buckle = kit.box(harness, kit.materials.ivory, [.14, .12, .06], [0, .84, -.14]);
  buckle.rotation.z = Math.PI / 4;
  harness.visible = false;
  seat.add(harness);

  const indicator = resources.material(new THREE.MeshStandardMaterial({ color: '#ffbf70', emissive: '#a94d12', emissiveIntensity: .9 }));
  kit.sphere(seat, indicator, [.09, .09, .09], [0, 1.97, .1]);

  const marker = new THREE.Group();
  marker.name = 'flight seat approach marker';
  const haloMaterial = resources.material(new THREE.MeshBasicMaterial({ color: '#ffd17f', transparent: true, opacity: .88 }));
  const ring = new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(.65, .045, 8, 32)), haloMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .035;
  marker.add(ring);
  const arrow = new THREE.Mesh(resources.geometry(new THREE.ConeGeometry(.12, .3, 8)), haloMaterial);
  arrow.position.set(0, 2.25, .08);
  marker.add(arrow);
  marker.visible = false;
  seat.add(marker);
  return { marker, harness, indicator };
}

export function furnishRoom(equipment: THREE.Group, id: string, kit: ModelKit, screens: THREE.MeshStandardMaterial[], steel: THREE.Material) {
  const consolePositions = id === 'earth' ? [-2.1, -.7, .7, 2.1] : [-1.8, 0, 1.8];
  const deskWidth = id === 'earth' ? .95 : 1.3;
  for (const [i, x] of consolePositions.entries()) {
    kit.box(equipment, kit.materials.ivory, [deskWidth, .85, .75], [x, .43, -2.2]);
    const monitor = kit.box(equipment, kit.materials.dark, [deskWidth * .82, .64, .13], [x, 1.24, -2]);
    monitor.rotation.x = -.1;
    const control = kit.box(equipment, screens[i], [deskWidth * .72, .48, .025], [x, 1.25, -1.92]);
    control.userData.controlIndex = i;
    kit.box(equipment, steel, [1.28, .08, .62], [x, .94, -1.9]);
    for (let j = 0; j < 5; j++) kit.box(equipment, j === 0 ? kit.materials.orange : kit.materials.trim, [.1, .035, .15], [x - .36 + j * .18, 1, -1.7]);
    for (let j = 0; j < 3; j++) kit.box(equipment, kit.materials.trim, [.9, .025, .05], [x, .22 + j * .17, -1.8]);
  }
  if (id === 'habitat' || id === 'earth') {
    for (const y of [.4, 1.25]) {
      kit.box(equipment, steel, [1.25, .1, 2], [-2, y, -.1]);
      kit.box(equipment, kit.materials.blue, [1.12, .16, 1.85], [-2, y + .12, -.1]);
      kit.box(equipment, kit.materials.ivory, [.85, .16, .38], [-2, y + .27, -.65]);
    }
    for (const z of [-1, .8]) kit.cylinder(equipment, steel, [.035, 1.7, .035], [-1.35,.85,z]);
    for (const x of [1.7, 2.25]) {
      kit.cylinder(equipment, kit.materials.ivory, [.18, 1.25, .18], [x, .7, .3]);
      kit.cylinder(equipment, kit.materials.orange, [.2, .08, .2], [x, 1.36, .3]);
    }
  }
  if (id === 'greenhouse') for (const x of [-1.65, 1.65]) {
    kit.box(equipment, steel, [1.05, .6, 2.3], [x, .3, .6]);
    kit.box(equipment, kit.materials.soil, [.92, .09, 2.15], [x, .63, .6]);
    for (const z of [-.1, .55, 1.2]) {
      kit.cylinder(equipment, kit.materials.green, [.025, .45, .025], [x, .86, z]);
      for (const direction of [-1,1]) {
        const leaf = kit.sphere(equipment, kit.materials.green, [.24,.065,.13], [x + direction * .13, 1, z]); leaf.rotation.z = direction * .35;
      }
    }
    kit.box(equipment, screens[0], [.85, .035, 2.1], [x, 1.75, .6]);
    for (const z of [-.5,1.7]) kit.cylinder(equipment, steel, [.025,1.5,.025], [x,1,z]);
  }
  if (id === 'solar') for (const x of [-2, 2]) {
    kit.box(equipment, steel, [.8, 1.6, 1.1], [x,.8,.2]);
    for (let y = .3; y < 1.5; y += .3) kit.box(equipment, kit.materials.dark, [.65,.2,.04], [x,y,.78]);
    kit.box(equipment, screens[0], [.12,.08,.045], [x + .2,1.5,.8]);
  }
}
