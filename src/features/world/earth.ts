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
  // Distant launch vehicle is scenery beyond the playable bounds, not a walk-through collider.
  const rocket = new THREE.Group(); rocket.position.set(27,0,-16); scene.add(rocket);
  kit.cylinder(rocket,kit.materials.ivory,[1.3,12,1.3],[0,6,0]);
  kit.sphere(rocket,kit.materials.orange,[1.3,2,1.3],[0,12,0]);
  for(const x of [-2,2]) kit.cylinder(rocket,kit.materials.trim,[.45,8,.45],[x,4,0]);
  for(const x of [-12,12]) for(let z=-14;z<=14;z+=4) {
    kit.cylinder(scene,kit.materials.trim,[.07,2,.07],[x,1,z]);
    kit.box(scene,kit.materials.ivory,[.05,.08,4],[x,1.7,z+2]);
  }
  return {scene, stations, labDoor:lab.visual.door};
}
