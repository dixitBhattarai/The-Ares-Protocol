import * as THREE from 'three';
import { createEarthSurface } from './earth-surface';
import { STATIONS } from '../../contracts';
import { createStation } from './models';
import type { ModelKit, WorldResources } from './resources';

/** Coastal launch complex: one crew operations building, launch apron and distant assembly hangar. */
export function createEarthCampus(kit: ModelKit, resources: WorldResources) {
  const scene = new THREE.Scene();
  scene.name = 'earth-outdoors';
  scene.background = new THREE.Color('#a6c7d4');
  scene.fog = new THREE.Fog('#b9ced1', 65, 210);
  scene.add(new THREE.HemisphereLight('#d9eafa', '#7c7a65', 2.1));
  const sun = new THREE.DirectionalLight('#fff0d5', 3.2);
  sun.position.set(-35, 48, 22);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.06;sun.shadow.bias=-.00035;
  Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:.5,far:160});
  scene.add(sun);
  const concrete = resources.material(new THREE.MeshStandardMaterial({color:'#9da6a6',roughness:.95}));
  const asphalt = resources.material(new THREE.MeshStandardMaterial({color:'#434f56',roughness:1}));
  const sand = resources.material(new THREE.MeshStandardMaterial({color:'#b4ae8e',roughness:1}));
  const white = resources.material(new THREE.MeshStandardMaterial({color:'#d8dfdf',roughness:.8}));
  const steel = resources.material(new THREE.MeshStandardMaterial({color:'#364f5c',metalness:.45,roughness:.65}));
  const paint = resources.material(new THREE.MeshBasicMaterial({color:'#eee0b4'}));
  const glass = resources.material(new THREE.MeshStandardMaterial({color:'#497b89',metalness:.3,roughness:.25}));
  const ground=createEarthSurface(resources,440);ground.position.y=-.025;scene.add(ground);
  const apron=new THREE.Group();apron.name='crew-operations-apron';scene.add(apron);
  // One apron with an actual opening for the crew building: no coincident floor faces.
  const outline=new THREE.Shape();outline.moveTo(-12,-5);outline.lineTo(-2,-5);outline.lineTo(-2,5);outline.lineTo(-12,5);outline.closePath();
  const labOpening=new THREE.Path();labOpening.moveTo(-10.3,-3.3);labOpening.lineTo(-10.3,3.3);labOpening.lineTo(-3.7,3.3);labOpening.lineTo(-3.7,-3.3);labOpening.closePath();outline.holes.push(labOpening);
  const apronSurface=new THREE.Mesh(resources.geometry(new THREE.ShapeGeometry(outline)),concrete);apronSurface.rotation.x=-Math.PI/2;apronSurface.name='apron-with-lab-opening';apron.add(apronSurface);
  // Narrow paved routes leave the coastal grass/sand visible throughout the walkable map.
  kit.flatBox(apron,concrete,[2.4,.025,12],[-7,-.0125,11]);
  kit.flatBox(apron,concrete,[20,.025,2.4],[2.5,-.0125,5]);
  kit.flatBox(apron,concrete,[2.4,.025,15],[12,-.0125,-2.5]);
  for(let z=6;z<16;z+=1.5)kit.flatBox(apron,paint,[1.7,.004,.22],[-7,.008,z]);
  kit.flatBox(apron,asphalt,[7,.025,120],[23,-.0125,-36]);
  for(let z=-80;z<24;z+=5)kit.flatBox(apron,paint,[.12,.005,2],[23,.008,z]);

  // Only one occupiable Earth building. Keep its doorway/console coordinates aligned with physics.
  const station=STATIONS.find(s=>s.id==='habitat')!;
  const visual=createStation('habitat',kit,resources,false);
  visual.group.position.copy(station.position);scene.add(visual.group);
  const lab={...station,visual},stations=[lab];
  lab.visual.door.setOpen(true);lab.visual.door.update(0,true);
  kit.flatBox(visual.roof,white,[6.35,.1,6.35],[0,2.86,0]);
  for(const x of [-1.8,1.8]) {
    kit.flatBox(visual.roof,steel,[1.1,.38,1.3],[x,3.1,-1.5]);
    for(let z=-1.9;z<=-1.1;z+=.16)kit.flatBox(visual.roof,concrete,[.96,.02,.04],[x,3.3,z]);
  }

  // Assembly hall and storage stay outside the playable bounds, with no fake doors to walk through.
  const hangar=new THREE.Group();hangar.name='vehicle-assembly-hangar';hangar.position.set(-30,0,-21);scene.add(hangar);
  kit.flatBox(hangar,white,[19,12,24],[0,6,0]);
  kit.flatBox(hangar,steel,[15,10,.1],[0,5,12.06]);
  for(let x=-7;x<=7;x+=1.4)kit.flatBox(hangar,concrete,[.06,9.6,.05],[x,5,12.14]);
  kit.flatBox(hangar,glass,[16,1.2,.08],[0,10.9,12.1]);
  for(const x of [-9.6,9.6])kit.flatBox(hangar,steel,[.2,12.3,24.5],[x,6.1,0]);
  for(const x of [31,36,41]) {
    kit.cylinder(scene,white,[1.5,6,1.5],[x,3,-33]);
    kit.sphere(scene,white,[1.5,.6,1.5],[x,6,-33]);
    kit.cylinder(scene,steel,[1.6,.14,1.6],[x,.07,-33]);
  }
  // A windsock and ground service cabinets make the apron read as a working spaceport.
  kit.cylinder(scene,steel,[.045,5,.045],[-15,2.5,-13]);
  const windsock=kit.cylinder(scene,kit.materials.orange,[.2,1.2,.2],[-14.45,4.8,-13]);windsock.rotation.z=Math.PI/2;
  for(const x of [5,7,9]) {
    kit.flatBox(scene,white,[1.1,1.3,.8],[x,.65,-8]);
    kit.flatBox(scene,steel,[.8,.55,.03],[x,.9,-7.58]);
  }
  // Coastal water lies beyond the fence, rather than a forest surrounding the rocket.
  const water=new THREE.Group();water.name='earth-water-system';scene.add(water);
  const ocean=kit.flatBox(water,resources.material(new THREE.MeshStandardMaterial({color:'#527e8b',roughness:.4,metalness:.15})),[420,.05,170],[0,-.06,-138]);
  ocean.receiveShadow=true;
  for(let i=0;i<12;i++)kit.flatBox(water,resources.material(new THREE.MeshBasicMaterial({color:'#91aeb1',transparent:true,opacity:.15})),[190+i*7,.002,.13],[Math.sin(i)*9,-.028,-62-i*7]);
  // Low scrub beyond the apron; no giant trees, flowers, or repeated Mars houses.
  const forest=new THREE.Group();forest.name='earth-forest';scene.add(forest);
  const scrub=resources.material(new THREE.MeshStandardMaterial({color:'#76826a',roughness:1}));
  for(let i=0;i<48;i++) {
    const x=Math.sin(i*2.39996)*(45+i%7*4),z=15+Math.cos(i*2.39996)*28;
    if(Math.abs(x)<22&&z<22)continue;
    kit.sphere(forest,scrub,[1.1+i%3*.4,.25+i%4*.1,.8],[x,.1,z]);
  }
  const cloudsGroup=new THREE.Group();cloudsGroup.name='earth-clouds';scene.add(cloudsGroup);
  const cloudMat=resources.material(new THREE.MeshBasicMaterial({color:'#e2e8e6',transparent:true,opacity:.6,depthWrite:false}));
  const clouds: {group:THREE.Group;speedX:number;speedZ:number}[]=[];
  for(let i=0;i<7;i++) {
    const group=new THREE.Group();group.position.set((i-3)*35,40+i%3*7,-80-i%2*20);
    for(let j=0;j<3;j++)kit.sphere(group,cloudMat,[11,1.3,3.5],[j*8,Math.sin(j)*.5,0]);
    cloudsGroup.add(group);clouds.push({group,speedX:.35,speedZ:0});
  }
  // =========================================================================
  // 9. LAUNCH VEHICLE, SERVICE TOWER & GANTRY (100% Contract Preserved)
  // =========================================================================
  const launchPad = new THREE.Group();
  launchPad.name = 'ares-launch-pad';
  launchPad.position.set(12, 0, -14);
  scene.add(launchPad);

  const launchPadMat = resources.material(new THREE.MeshStandardMaterial({ color: '#55636c', roughness: 0.85 }));
  kit.flatBox(launchPad, launchPadMat, [10, 0.2, 10], [0, 0.04, 0]);

  const rocket = new THREE.Group();
  rocket.name = 'ares-launch-vehicle';
  launchPad.add(rocket);

  const modelSlot = new THREE.Group();
  modelSlot.name = 'ARES_ROCKET_MODEL_SLOT';
  rocket.add(modelSlot);

  const fallback = new THREE.Group();
  fallback.name = 'ARES_ROCKET_PROCEDURAL_FALLBACK';
  modelSlot.add(fallback);

  kit.cylinder(fallback, kit.materials.ivory, [1.3, 12, 1.3], [0, 6, 0]);
  kit.cylinder(fallback, kit.materials.blue, [1.31, 3.3, 1.31], [0, 3.2, 0]);
  kit.sphere(fallback, kit.materials.orange, [1.3, 2, 1.3], [0, 12, 0]);
  kit.sphere(fallback, kit.materials.glass, [0.38, 0.22, 0.38], [0, 8.4, 1.02]);
  for (const x of [-2, 2]) kit.cylinder(fallback, kit.materials.trim, [0.45, 8, 0.45], [x, 4, 0]);
  for (const x of [-2, 2]) kit.cylinder(fallback, kit.materials.orange, [0.36, 2.3, 0.36], [x, 1.1, 0]);

  const exhaust = new THREE.Group();
  exhaust.position.y = -0.7;
  exhaust.visible = false;
  rocket.add(exhaust);
  kit.cylinder(exhaust, kit.materials.orange, [0.9, 4, 0.9], [0, -2, 0]);
  kit.sphere(exhaust, kit.materials.ivory, [0.52, 2.7, 0.52], [0, -3.1, 0]);

  for (const x of [-2.2, 2.2]) kit.cylinder(launchPad, kit.materials.trim, [0.16, 10, 0.16], [x, 5, 0]);
  kit.flatBox(launchPad, kit.materials.trim, [4.6, 0.22, 0.3], [-0.2, 7.3, 0]);
  kit.flatBox(launchPad, kit.materials.trim, [0.22, 5, 0.3], [-2.25, 4.8, 0]);

  for (const x of [-13, 13]) {
    for (let z = -15; z <= 15; z += 4) {
      kit.cylinder(scene, kit.materials.trim, [0.07, 2, 0.07], [x, 1, z]);
      kit.box(scene, kit.materials.ivory, [0.05, 0.08, 4], [x, 1.7, z + 2]);
    }
  }

  const launchCamera = new THREE.PerspectiveCamera(44, 1, 0.1, 240);

  function setLaunchProgress(progress: number, reducedMotion = false) {
    const p = Math.max(0, Math.min(1, progress));
    rocket.position.y = reducedMotion ? 0 : p * 45;
    exhaust.visible = p > 0 && !reducedMotion;
    exhaust.scale.y = 0.6 + p * 1.2;
    launchCamera.position.set(20, Math.max(12, rocket.position.y + 20), 16);
    launchCamera.lookAt(12, rocket.position.y + 5, -14);
    launchCamera.updateProjectionMatrix();
  }

  function update(delta: number, reduceMotion = false) {
    if (reduceMotion) return;
    const d = Math.min(0.1, delta);

    for (const c of clouds) {
      c.group.position.x += c.speedX * d;
      c.group.position.z += c.speedZ * d;
      if (c.group.position.x > 120) c.group.position.x = -120;
      if (c.group.position.z > 120) c.group.position.z = -120;
    }
  }

  scene.traverse(object=>{if(object instanceof THREE.Mesh){object.receiveShadow=true;object.castShadow=object.scale.y>.15;}});
  return {
    dispose(){sun.shadow.dispose();scene.clear();},
    scene,
    stations,
    labDoor: lab.visual.door,
    launchCamera,
    launchVehicle: rocket,
    setLaunchProgress,
    resizeLaunchCamera(aspect: number) {
      launchCamera.aspect = Math.max(0.1, aspect);
      launchCamera.updateProjectionMatrix();
    },
    resetLaunch() {
      rocket.position.y = 0;
      exhaust.visible = false;
    },
    useLaunchVehicleModel(model: THREE.Object3D) {
      installLaunchVehicleModel(modelSlot, model);
    },
    update,
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
  model.scale.multiplyScalar(12 / Math.max(0.001, size.y));
  const fitted = new THREE.Box3().setFromObject(model);
  const center = fitted.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, fitted.min.y, center.z));
}