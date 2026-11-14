import * as THREE from 'three';
import type { StationId, Vec3 } from '../../contracts';
import { createAstronaut, applyAstronautGait } from './astronaut';
import type { ModelKit, WorldResources } from './resources';

export function createExpeditionViews(kit: ModelKit, resources: WorldResources) {
  const flight = new THREE.Scene();
  flight.background = new THREE.Color('#071421');
  flight.add(new THREE.HemisphereLight('#d5e8ff', '#253d59', 2));
  const sun = new THREE.DirectionalLight('#fff0ce', 4); sun.position.set(-5, 6, 9); flight.add(sun);
  const blue = resources.material(new THREE.MeshStandardMaterial({ color: '#247bb9', roughness: .8 }));
  const mars = resources.material(new THREE.MeshStandardMaterial({ color: '#bc694b', roughness: 1 }));
  const earth = kit.sphere(flight, blue, [2, 2, 2], [-6, -1, 0]);
  for (let i = 0; i < 8; i++) kit.sphere(earth, kit.materials.green, [.23, .15, .13], [Math.sin(i * 2) * .6, Math.cos(i * 3) * .6, .75]);
  kit.sphere(flight, mars, [1.6, 1.6, 1.6], [6, -1, 0]);
  const starMaterial = resources.material(new THREE.PointsMaterial({ color: '#c4deef', size: .055 }));
  const positions = Array.from({ length: 240 }, (_, i) => Math.sin(i * 37.13) * (i % 3 === 2 ? 3 : 15));
  const stars = resources.geometry(new THREE.BufferGeometry()); stars.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  flight.add(new THREE.Points(stars, starMaterial));
  const rocket = new THREE.Group();
  kit.cylinder(rocket, kit.materials.ivory, [.22, .95, .22], [0, 0, 0]);
  kit.sphere(rocket, kit.materials.orange, [.22, .3, .22], [0, .48, 0]);
  kit.box(rocket, kit.materials.blue, [.85, .16, .25], [0, -.3, 0]);
  kit.sphere(rocket, kit.materials.orange, [.12, .5, .12], [0, -.8, 0]);
  rocket.rotation.z = -Math.PI / 2; flight.add(rocket);

  const room = new THREE.Scene(); room.background = new THREE.Color('#132932');
  room.add(new THREE.HemisphereLight('#d7f4ed', '#314149', 3));
  const roomSun = new THREE.DirectionalLight('#fff5d7', 2); roomSun.position.set(3, 8, 5); room.add(roomSun);
  kit.flatBox(room, kit.materials.trim, [6, .2, 6], [0, -.1, 0]);
  kit.box(room, kit.materials.ivory, [6, 2.3, .15], [0, 1.15, -3]);
  kit.box(room, kit.materials.ivory, [.15, 2.3, 6], [-3, 1.15, 0]);
  const equipment = new THREE.Group(); room.add(equipment);
  const astronaut = createAstronaut(kit); room.add(astronaut.group);
  const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, .1, 100);
  let aspect = 1;
  let cycle = 0;
  const previous = new THREE.Vector3();
  const screens = [0, 1, 2].map(() => resources.material(new THREE.MeshStandardMaterial({ color: '#315d7c', emissive: '#18374e', emissiveIntensity: .5 })));
  return {
    flight, room, camera,
    resize(value: number) { aspect = value; },
    journey(progress: number) {
      const p = Math.min(1, Math.max(0, progress));
      rocket.position.set(-4 + p * 8, Math.sin(p * Math.PI) * 2, 2);
      const half = Math.max(5, 10 / aspect);
      camera.position.set(0, 0, 24); camera.lookAt(0, 0, 0);
      camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();
    },
    interior(id: StationId) {
      equipment.clear();
      // Geometry/materials are shared by the kit and remain owned until world disposal.
      for (const [i, x] of [-1.8, 0, 1.8].entries()) {
        kit.box(equipment, kit.materials.dark, [1.2, .9, .7], [x, .45, -2.1]);
        kit.box(equipment, screens[i], [.95, .45, .08], [x, 1.05, -1.7]);
        kit.cylinder(equipment, kit.materials.orange, [.12, .12, .12], [x, .94, -1.55]);
      }
      if (id === 'habitat') for (const z of [-.5, 1]) kit.box(equipment, kit.materials.blue, [1.15, .45, .9], [-2, .23, z]);
      if (id === 'greenhouse') for (const x of [-1.5, 1.5]) for (const z of [0, 1.3]) {
        kit.box(equipment, kit.materials.soil, [.8, .3, .7], [x, .15, z]);
        kit.sphere(equipment, kit.materials.green, [.4, .4, .3], [x, .55, z]);
      }
    },
    progress(value: number) { screens.forEach((screen, i) => { screen.color.set(i < value ? '#96d8a8' : '#315d7c'); screen.emissive.set(i < value ? '#478e60' : '#18374e'); }); },
    pose(pose: Vec3, moving: boolean) {
      const d = previous.distanceTo(new THREE.Vector3(pose.x, pose.y, pose.z));
      if (d > .001 && d < 1) { cycle += d * 7; astronaut.group.rotation.y = Math.atan2(pose.x - previous.x, pose.z - previous.z); }
      astronaut.group.position.copy(pose); previous.copy(pose);
      applyAstronautGait(astronaut, cycle, moving && d < 1);
    },
    roomCamera() {
      const half = Math.max(4.7, 5.2 / aspect);
      camera.position.set(8, 10, 12); camera.lookAt(0, .5, 0);
      camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();
    },
    dispose() { flight.clear(); room.clear(); },
  };
}
