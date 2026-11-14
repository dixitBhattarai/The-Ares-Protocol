import { STATIONS, type StationId, type Vec3 } from '../../contracts';

export type MachineId = 'air' | 'shelter' | 'power' | 'plants' | 'survey';
export interface WorkInteractable { id:MachineId; station:StationId; label:string; position:Vec3 }
/** Additive world-owned API. Shell supplies eligibility and handles game actions. */
export interface WorkWorldAdapter {
  setInteractables(list:readonly WorkInteractable[]):void;
  onInteract(handler:((id:MachineId)=>void)|null):void;
  setPrompt(text:string):void;
}

const definitions:readonly [MachineId,StationId,string,number,number][] = [
  ['air','habitat','Service the air system',-.85,-1.72],
  ['shelter','habitat','Reinforce the storm shelter',1.8,-1.72],
  ['power','solar','Clean and connect solar panels',-1.8,-1.72],
  ['plants','greenhouse','Care for the greenhouse',-1.1,.6],
  ['survey','solar','Record surface science',1.8,-1.72],
];
export const WORK_MACHINES:readonly WorkInteractable[]=definitions.map(([id,station,label,x,z])=>{
  const origin=STATIONS.find(item=>item.id===station)!.position;
  return {id,station,label,position:{x:origin.x+x,y:1.15,z:origin.z+z}};
});

export function usableMachines(pose:Vec3,station:StationId|null):WorkInteractable[] {
  return WORK_MACHINES.filter(item=>item.station===station&&Math.hypot(pose.x-item.position.x,pose.z-item.position.z)<=2.8)
    .sort((a,b)=>{
      const difference=Math.hypot(pose.x-a.position.x,pose.z-a.position.z)-Math.hypot(pose.x-b.position.x,pose.z-b.position.z);
      return Math.abs(difference)>1e-6?difference:WORK_MACHINES.indexOf(a)-WORK_MACHINES.indexOf(b);
    });
}

/** Reject unknown IDs, duplicates and forged positions. Never invent eligibility. */
export function filterInteractables(list:readonly WorkInteractable[]):WorkInteractable[] {
  const seen=new Set<MachineId>();
  return list.flatMap(item=>{
    const known=WORK_MACHINES.find(machine=>machine.id===item.id);
    if(!known||seen.has(item.id)||known.station!==item.station||typeof item.label!=='string'||!item.label.trim()||![item.position.x,item.position.y,item.position.z].every(Number.isFinite))return [];
    if(Math.hypot(item.position.x-known.position.x,item.position.y-known.position.y,item.position.z-known.position.z)>.05)return [];
    seen.add(item.id);return [{...known,label:item.label.trim().slice(0,100),position:{...known.position}}];
  });
}

export function createWorkInteraction() {
  let items:WorkInteractable[]=[],handler:((id:MachineId)=>void)|null=null;
  const consumed=new Set<MachineId>();
  return {
    setInteractables(list:readonly WorkInteractable[]){items=filterInteractables(list);for(const id of consumed)if(!items.some(item=>item.id===id))consumed.delete(id);},
    onInteract(callback:((id:MachineId)=>void)|null){handler=callback;},
    list:()=>items,
    activate(id:MachineId){if(!handler||consumed.has(id)||!items.some(item=>item.id===id))return false;consumed.add(id);handler(id);return true;},
    dispose(){items=[];handler=null;consumed.clear();},
  };
}

/** Only one reachable action, never a job menu. textContent prevents HTML injection. */
export function createWorkPrompt(host:HTMLElement,activate:()=>void) {
  const button=document.createElement('button');button.type='button';button.className='ares-world__work-prompt';button.hidden=true;
  button.setAttribute('aria-live','polite');button.addEventListener('click',activate);host.append(button);
  return {
    setPrompt(text:string){const value=text.trim().slice(0,160);if(button.textContent!==value){button.textContent=value;button.setAttribute('aria-label',value);}button.hidden=!value;},
    setEnabled(enabled:boolean){button.disabled=!enabled;},
    dispose(){button.removeEventListener('click',activate);button.remove();},
  };
}
