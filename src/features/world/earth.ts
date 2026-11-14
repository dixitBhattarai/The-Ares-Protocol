import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import { createStation } from './models';
import type { ModelKit, WorldResources } from './resources';

/** Fictional terrestrial training campus using the existing exterior collision footprints. */
export function createEarthCampus(kit: ModelKit, resources: WorldResources) {
  const scene = new THREE.Scene(); scene.name = 'earth-outdoors';
  scene.background = new THREE.Color('#8ccce6'); scene.fog = new THREE.Fog('#a7d8e8', 30, 95);
  scene.add(new THREE.HemisphereLight('#e8faff', '#65833a', 2.3));
  const sun = new THREE.DirectionalLight('#fff0ce', 3); sun.position.set(-10, 18, 10); scene.add(sun);
  const grass = resources.material(new THREE.MeshStandardMaterial({ color:'#82ae60',roughness:1 }));
  const path = resources.material(new THREE.MeshStandardMaterial({color:'#c8c7b2',roughness:1}));
  kit.flatBox(scene, grass, [90,.2,90], [0,-.12,0]);
  kit.flatBox(scene, path, [15,.025,2], [0,.005,3]);
  kit.flatBox(scene, path, [2,.025,12], [0,.005,-1]);
  const stations = STATIONS.map(station => {
    const visual = createStation(station.id,kit,resources,false); visual.group.position.copy(station.position); scene.add(visual.group); return {...station,visual};
  });
  const lab = stations.find(station=>station.id==='habitat')!;
  lab.visual.door.setOpen(true); lab.visual.door.update(0,true);
  for(let i=0;i<20;i++) {
    const angle=i*Math.PI/10, radius=22+(i%3)*3;
    const tree = new THREE.Group(); tree.position.set(Math.sin(angle)*radius,0,Math.cos(angle)*radius); scene.add(tree);
    kit.cylinder(tree,kit.materials.soil,[.2,2,.2],[0,1,0]);
    kit.sphere(tree,kit.materials.green,[1.4,2,1.4],[0,3,0]);
  }
  // Accessible campus launch pad. The authored model remains a fallback until a licensed GLB is supplied.
  const launchPad = new THREE.Group(); launchPad.name = 'ares-launch-pad'; launchPad.position.set(12,0,-14); scene.add(launchPad);
  kit.flatBox(launchPad, path, [9,.12,9], [0,.02,0]);
  const rocket = new THREE.Group(); rocket.name = 'ares-launch-vehicle'; launchPad.add(rocket);
  const modelSlot = new THREE.Group(); modelSlot.name = 'ARES_ROCKET_MODEL_SLOT'; rocket.add(modelSlot);
  const fallback = new THREE.Group(); fallback.name = 'ARES_ROCKET_PROCEDURAL_FALLBACK'; modelSlot.add(fallback);
  kit.cylinder(fallback,kit.materials.ivory,[1.3,12,1.3],[0,6,0]);
  kit.cylinder(fallback,kit.materials.blue,[1.31,3.3,1.31],[0,3.2,0]);
  kit.sphere(fallback,kit.materials.orange,[1.3,2,1.3],[0,12,0]);
  kit.sphere(fallback,kit.materials.glass,[.38,.22,.38],[0,8.4,1.02]);
  for(const x of [-2,2]) kit.cylinder(fallback,kit.materials.trim,[.45,8,.45],[x,4,0]);
  for(const x of [-2,2]) kit.cylinder(fallback,kit.materials.orange,[.36,2.3,.36],[x,1.1,0]);
  const exhaust = new THREE.Group(); exhaust.position.y = -.7; exhaust.visible = false; rocket.add(exhaust);
  kit.cylinder(exhaust,kit.materials.orange,[.9,4,.9],[0,-2,0]);
  kit.sphere(exhaust,kit.materials.ivory,[.52,2.7,.52],[0,-3.1,0]);
  // Simple service tower stays beside the vehicle during liftoff.
  for(const x of [-2.2,2.2]) kit.cylinder(launchPad,kit.materials.trim,[.16,10,.16],[x,5,0]);
  kit.flatBox(launchPad,kit.materials.trim,[4.6,.22,.3],[-.2,7.3,0]);
  kit.flatBox(launchPad,kit.materials.trim,[.22,5,.3],[-2.25,4.8,0]);
  for(const x of [-12,12]) for(let z=-14;z<=14;z+=4) {
    kit.cylinder(scene,kit.materials.trim,[.07,2,.07],[x,1,z]);
    kit.box(scene,kit.materials.ivory,[.05,.08,4],[x,1.7,z+2]);
  }
  const launchCamera = new THREE.PerspectiveCamera(44, 1, .1, 180);
  function setLaunchProgress(progress: number, reducedMotion = false) {
    const p = Math.max(0, Math.min(1, progress));
    rocket.position.y = reducedMotion ? 0 : p * 45;
    exhaust.visible = p > 0 && !reducedMotion;
    exhaust.scale.y = .6 + p * 1.2;
    launchCamera.position.set(20, Math.max(12, rocket.position.y + 20), 16);
    launchCamera.lookAt(12, rocket.position.y + 5, -14);
    launchCamera.updateProjectionMatrix();
  }
  return {
    scene,
    stations,
    labDoor: lab.visual.door,
    launchCamera,
    launchVehicle: rocket,
    setLaunchProgress,
    resizeLaunchCamera(aspect: number) { launchCamera.aspect = Math.max(.1, aspect); launchCamera.updateProjectionMatrix(); },
    resetLaunch() { rocket.position.y = 0; exhaust.visible = false; },
    useLaunchVehicleModel(model: THREE.Object3D) { installLaunchVehicleModel(modelSlot, model); },
  };
}

/** Install a locally bundled, license-verified rocket model in the named slot; the fallback stays available. */
export function installLaunchVehicleModel(slot: THREE.Group, model: THREE.Object3D): void {
  const fallback = slot.getObjectByName('ARES_ROCKET_PROCEDURAL_FALLBACK');
  const placeholder = slot.getObjectByName('ARES_ROCKET_ASSET');
  if (placeholder) slot.remove(placeholder);
  if (fallback) fallback.visible = false;
  model.name = 'ARES_ROCKET_ASSET';
  slot.add(model);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(12 / Math.max(.001, size.y));
  const fitted = new THREE.Box3().setFromObject(model);
  const center = fitted.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, fitted.min.y, center.z));
}
