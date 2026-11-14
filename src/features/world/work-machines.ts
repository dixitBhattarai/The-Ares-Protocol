import * as THREE from 'three';
import { STATIONS, type StationId } from '../../contracts';
import type { ModelKit, WorldResources } from './resources';
import { WORK_MACHINES, type MachineId } from './interactables';

/** Machines sit on existing desks/planter colliders, leaving the central path clear. */
export function createWorkMachines(station:StationId,room:THREE.Group,kit:ModelKit,resources:WorldResources) {
  const origin=STATIONS.find(item=>item.id===station)!.position;
  const machines=new Map<MachineId,THREE.Group>();
  for(const item of WORK_MACHINES.filter(item=>item.station===station)){
    const group=new THREE.Group();group.name=`work-${item.id}`;group.userData.machineId=item.id;
    group.position.set(item.position.x-origin.x,0,item.position.z-origin.z);room.add(group);machines.set(item.id,group);
    const glow=resources.material(new THREE.MeshStandardMaterial({color:'#b0e8e4',emissive:item.id==='air'?'#ffb054':item.id==='plants'?'#69e997':'#5bcbf1',emissiveIntensity:.65,metalness:.3,roughness:.35}));
    group.userData.highlightMaterial=glow;
    if(item.id==='plants'){
      kit.box(group,kit.materials.trim,[.16,.65,.16],[0,.9,0]);
      const gauge=kit.box(group,glow,[.6,.42,.1],[0,1.35,0]);gauge.rotation.x=-.2;
      for(let i=0;i<3;i++)kit.box(group,kit.materials.dark,[.34-i*.07,.035,.02],[0,1.43-i*.08,.065]);
      kit.cylinder(group,kit.materials.orange,[.13,.25,.13],[.32,1.05,0]);
    }else{
      kit.box(group,kit.materials.trim,[1.05,.95,.22],[0,1.26,0]);
      kit.box(group,glow,[.92,.78,.04],[0,1.26,.13]);
      if(item.id==='air'){
        for(const x of [-.25,.25])kit.cylinder(group,kit.materials.ivory,[.08,.55,.08],[x,1.28,.22]);
        const valve=kit.cylinder(group,kit.materials.orange,[.18,.07,.18],[0,1.22,.27]);valve.rotation.x=Math.PI/2;
        for(let i=0;i<3;i++)kit.sphere(group,glow,[.035,.035,.035],[.33,1.25+i*.12,.35]);
      }else if(item.id==='shelter'){
        for(const side of [-1,1]){const brace=kit.box(group,kit.materials.ivory,[.1,.72,.1],[0,1.27,.24]);brace.rotation.z=side*.65;}
        for(const x of [-.34,.34])for(const y of [.99,1.55])kit.cylinder(group,kit.materials.orange,[.05,.07,.05],[x,y,.25]).rotation.x=Math.PI/2;
      }else if(item.id==='power'){
        for(let i=0;i<3;i++){
          kit.box(group,kit.materials.blue,[.2,.48,.07],[-.28+i*.28,1.3,.2]);
          kit.cylinder(group,kit.materials.orange,[.045,.19,.045],[-.28+i*.28,1.02,.24]);
        }
      }else{
        const dish=kit.sphere(group,kit.materials.ivory,[.3,.3,.1],[0,1.3,.23]);dish.rotation.y=.2;
        kit.cylinder(group,kit.materials.orange,[.025,.3,.025],[0,1.65,.25]);
        kit.sphere(group,glow,[.07,.07,.07],[0,1.83,.25]);
      }
    }
    group.traverse(object=>{if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;object.userData.machineId=item.id;}});
  }
  return machines;
}
