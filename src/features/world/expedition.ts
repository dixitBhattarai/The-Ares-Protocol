import * as THREE from 'three';
import type { StationId, Vec3 } from '../../contracts';
import { createAstronaut, applyAstronautGait, updateAstronautAnimation } from './astronaut';
import type { ModelKit, WorldResources } from './resources';
import { dressRoom, furnishRoom } from './interiors';
import type { createNasaLoader } from './nasa-assets';
import { createSlidingDoor } from './doors';

export function createExpeditionViews(kit: ModelKit, resources: WorldResources, nasa: ReturnType<typeof createNasaLoader>) {
  const flight = new THREE.Scene();
  flight.background = new THREE.Color('#071421');
  flight.add(new THREE.HemisphereLight('#d5e8ff', '#253d59', 2));
  const sun = new THREE.DirectionalLight('#fff0ce', 4); sun.position.set(-5, 6, 9); flight.add(sun);
  const blue = resources.material(new THREE.MeshStandardMaterial({ color: '#247bb9', roughness: .8 }));
  const mars = resources.material(new THREE.MeshStandardMaterial({ color: '#bc694b', roughness: 1 }));
  kit.sphere(flight, blue, [2, 2, 2], [-6, -1, 0]);
  nasa.texture(new URL('./assets/earth.jpg', import.meta.url).href, blue);
  nasa.texture(new URL('./assets/mars.jpg', import.meta.url).href, mars);
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
  const { steel } = dressRoom(room, kit, resources);
  const door = createSlidingDoor(kit, 'interior', false); door.group.position.set(0, .92, 2.88); room.add(door.group);
  const observationWindow = new THREE.Group(); room.add(observationWindow);
  const windowRim = new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(.7, .07, 8, 32)), steel);
  windowRim.position.set(0,1.6,-2.78); observationWindow.add(windowRim);
  kit.sphere(observationWindow, blue, [.6,.6,.18], [0,1.6,-2.8]);
  const equipment = new THREE.Group(); room.add(equipment);
  const astronaut = createAstronaut(kit); room.add(astronaut.group);
  const suit = new THREE.Group(); suit.position.y = -.8; astronaut.group.add(suit);
  void nasa.attach(suit, 'astronaut', 1.55, astronaut.fallback);
  const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, .1, 100);
  let aspect = 1;
  let cycle = 0;
  const previous = new THREE.Vector3();
  const screens = [0, 1, 2].map(() => resources.material(new THREE.MeshStandardMaterial({ color: '#a6cddd', emissive: '#18374e', emissiveIntensity: .5 })));
  screens.forEach((screen, i) => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#1b2a34'; context.fillRect(0,0,128,64);
      context.fillStyle = '#e9ffec'; context.font = 'bold 34px sans-serif'; context.textAlign = 'center'; context.fillText(`${i + 1}`,64,43);
      const texture = resources.texture(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace; screen.map = texture;
    }
  });
  const rooms = new Map<string, THREE.Group>();
  return {
    flight, room, camera,
    setDoor(open: boolean, instant = false) { door.setOpen(open); if (instant) door.update(0, true); },
    isDoorOpen() { return door.isOpen(); },
    animate(seconds: number, active: boolean, reduced: boolean) { updateAstronautAnimation(astronaut, seconds, active, reduced); door.update(active ? seconds : 0, reduced); },
    pickControl(pointer: THREE.Vector2) {
      room.updateMatrixWorld(true); camera.updateMatrixWorld();
      const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(equipment.children, true).find(item => Number.isInteger(item.object.userData.controlIndex));
      return hit?.object.userData.controlIndex as number | undefined;
    },
    resize(value: number) { aspect = value; },
    journey(progress: number) {
      const p = Math.min(1, Math.max(0, progress));
      rocket.position.set(-4 + p * 8, Math.sin(p * Math.PI) * 2, 2);
      const half = Math.max(5, 10 / aspect);
      camera.position.set(0, 0, 24); camera.lookAt(0, 0, 0);
      camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();
    },
    interior(id: StationId | 'earth' | 'space') {
      equipment.clear();
      observationWindow.visible = id === 'space';
      let set = rooms.get(id);
      if (!set) {
        set = new THREE.Group(); furnishRoom(set, id, kit, screens, steel); rooms.set(id, set);
        if (id === 'earth') {
          const exhibit = new THREE.Group(); exhibit.position.set(1.8,.5,1.4); set.add(exhibit);
          void nasa.attach(exhibit, 'rover', .6, undefined, true);
        }
        if (id === 'space') {
          const satellite = new THREE.Group(); satellite.position.set(0,1.8,-2); set.add(satellite);
          void nasa.attach(satellite, 'satellite', .65, undefined, true);
        }
      }
      equipment.add(set);
    },
    progress(value: number) { screens.forEach((screen, i) => { screen.color.set(i < value ? '#96d8a8' : '#a6cddd'); screen.emissive.set(i < value ? '#478e60' : '#18374e'); }); },
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
    dispose() { flight.clear(); room.clear(); rooms.clear(); },
  };
}
