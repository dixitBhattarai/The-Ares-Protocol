import * as THREE from 'three';
import { STATIONS, type StationId } from '../../contracts';
import type { ModelKit, WorldResources } from './resources';
import { WORK_MACHINES, type MachineId } from './interactables';

/** Machines retain their IDs and desk/planter locations; presentation never awards resources. */
export function createWorkMachines(station: StationId, room: THREE.Group, kit: ModelKit, resources: WorldResources) {
  const origin = STATIONS.find(item => item.id === station)!.position;
  const machines = new Map<MachineId, THREE.Group>();
  const metal = resources.material(new THREE.MeshStandardMaterial({ color: '#94a8ab', metalness: .65, roughness: .34 }));
  const rubber = resources.material(new THREE.MeshStandardMaterial({ color: '#1e3037', roughness: .72 }));
  function pipe(parent: THREE.Object3D, points: number[][], radius: number, material: THREE.Material) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])));
    parent.add(new THREE.Mesh(resources.geometry(new THREE.TubeGeometry(curve, 14, radius, 6, false)), material));
  }
  for (const item of WORK_MACHINES.filter(item => item.station === station)) {
    const group = new THREE.Group(); group.name = `work-${item.id}`; group.userData.machineId = item.id;
    group.position.set(item.position.x - origin.x, 0, item.position.z - origin.z); room.add(group); machines.set(item.id, group);
    const glow = resources.material(new THREE.MeshStandardMaterial({ color: '#b0e8e4', emissive: item.id === 'air' ? '#ffb054' : item.id === 'plants' ? '#69e997' : '#5bcbf1', emissiveIntensity: .65, metalness: .2, roughness: .35 }));
    group.userData.highlightMaterial = glow;
    if (item.id === 'plants') {
      kit.box(group, metal, [.12, .6, .12], [0, 1.03, 0]);
      const controller = new THREE.Group(); controller.position.set(0, 1.36, .02); controller.rotation.x = -.25; group.add(controller);
      kit.box(controller, rubber, [.55, .4, .09], [0, 0, 0]);
      kit.box(controller, glow, [.44, .24, .02], [0, .025, .055]);
      for (let i = 0; i < 3; i++) kit.flatBox(controller, rubber, [.08, .025, .015], [-.13 + i * .13, -.145, .055]);
      kit.cylinder(group, metal, [.13, .32, .13], [.32, 1.06, 0]);
      kit.cylinder(group, glow, [.135, .14, .135], [.32, 1.08, 0]);
      pipe(group, [[.32, 1.24, 0], [.36, 1.28, .18], [.1, 1, .23], [0, .78, .2]], .018, rubber);
    } else if (item.id === 'air') {
      kit.box(group, rubber, [1, .72, .17], [0, 1.3, 0]);
      for (const x of [-.28, .28]) {
        kit.cylinder(group, metal, [.105, .54, .105], [x, 1.33, .17]);
        for (const y of [1.1, 1.56]) kit.cylinder(group, rubber, [.115, .055, .115], [x, y, .17]);
      }
      pipe(group, [[-.28, 1.6, .17], [-.28, 1.7, .17], [.28, 1.7, .17], [.28, 1.6, .17]], .035, metal);
      const wheel = new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(.13, .025, 8, 24)), kit.materials.orange);
      wheel.position.set(0, 1.27, .28); group.add(wheel);
      for (const a of [0, Math.PI / 3, -Math.PI / 3]) { const spoke = kit.box(group, kit.materials.orange, [.22, .025, .025], [0, 1.27, .28]); spoke.rotation.z = a; }
      const dial = kit.cylinder(group, glow, [.075, .025, .075], [0, 1.56, .16]); dial.rotation.x = Math.PI / 2;
      const needle = kit.flatBox(group, rubber, [.015, .09, .01], [0, 1.58, .18]); needle.rotation.z = -.55;
    } else if (item.id === 'shelter') {
      kit.box(group, rubber, [1, .85, .15], [0, 1.32, 0]);
      const plate = new THREE.Mesh(resources.geometry(new THREE.CylinderGeometry(.43, .43, .08, 6)), metal);
      plate.rotation.x = Math.PI / 2; plate.position.set(0, 1.32, .13); group.add(plate);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const bolt = kit.cylinder(group, kit.materials.orange, [.035, .035, .035], [Math.sin(a) * .34, 1.32 + Math.cos(a) * .34, .19]); bolt.rotation.x = Math.PI / 2;
      }
      kit.box(group, glow, [.16, .24, .025], [0, 1.32, .185]);
    } else if (item.id === 'power') {
      kit.box(group, rubber, [1.05, .8, .17], [0, 1.32, 0]);
      const cells=new THREE.Group();cells.name='swappable-battery';group.add(cells);
      const cellMaterial=resources.material(new THREE.MeshStandardMaterial({color:'#d39b78',metalness:.45,roughness:.5}));
      const leads=new THREE.Group();group.add(leads);
      group.userData.repair=(stage:number|null)=>{cells.visible=stage!==1;leads.visible=stage!==1;cells.position.z=stage===0?.08:0;cellMaterial.color.set(stage!==null&&stage>=2?'#9ed9c6':'#d39b78');};
      for (let i = 0; i < 3; i++) {
        const x = -.3 + i * .3;
        kit.cylinder(cells, cellMaterial, [.1, .5, .1], [x, 1.35, .18]);
        kit.cylinder(cells, glow, [.105, .055, .105], [x, 1.53, .18]);
        kit.box(cells, kit.materials.orange, [.055, .06, .06], [x, 1.63, .18]);
        pipe(leads, [[x, 1.08, .18], [x, .99, .22], [x + .1, .99, .24], [x + .1, 1.13, .24]], .018, i % 2 ? kit.materials.orange : kit.materials.blue);
      }
    } else {
      kit.box(group, rubber, [1, .75, .2], [0, 1.3, 0]);
      const scope = new THREE.Group(); scope.position.set(-.1, 1.36, .18); scope.rotation.x = -.18; group.add(scope);
      kit.box(scope, metal, [.68, .46, .08], [0, 0, 0]);
      kit.box(scope, glow, [.56, .34, .02], [0, 0, .055]);
      const reticle = new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(.115, .008, 5, 28)), rubber); reticle.position.z = .073; scope.add(reticle);
      kit.flatBox(scope, rubber, [.3, .008, .01], [0, 0, .075]); kit.flatBox(scope, rubber, [.008, .29, .01], [0, 0, .075]);
      for (let i = 0; i < 3; i++) { const knob = kit.cylinder(group, metal, [.04, .035, .04], [-.26 + i * .23, 1, .18]); knob.rotation.x = Math.PI / 2; }
      pipe(group, [[.4, 1.08, .1], [.46, 1.3, .1], [.4, 1.62, .1], [.3, 1.7, .1]], .02, metal);
    }
    group.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; object.userData.machineId = item.id; } });
  }
  return machines;
}
