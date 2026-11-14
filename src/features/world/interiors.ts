import * as THREE from 'three';
import type { ModelKit, WorldResources } from './resources';

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
  if (id === 'solar' || id === 'space') for (const x of [-2, 2]) {
    if(id==='solar'&&x===2){kit.box(equipment,steel,[.8,.12,1.1],[x,.06,.2]);continue;}
    kit.box(equipment, steel, [.8, 1.6, 1.1], [x,.8,.2]);
    for (let y = .3; y < 1.5; y += .3) kit.box(equipment, kit.materials.dark, [.65,.2,.04], [x,y,.78]);
    kit.box(equipment, screens[0], [.12,.08,.045], [x + .2,1.5,.8]);
  }
}
