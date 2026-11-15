export const TERRAIN_TARGETS=[{x:65,y:141},{x:180,y:176},{x:295,y:118}] as const;
export const STAR_TARGETS=[{x:65,y:74},{x:184,y:143},{x:293,y:70}] as const;
export const MOLECULES=['CO₂','O₂','N₂'] as const;
export const AIR_SAMPLE=[0,2,0,1,0,2] as const;
export function exposeTarget(values:readonly number[],targets:readonly {x:number;y:number}[],x:number,y:number,seconds:number,active:boolean):number[]{
 const next=[...values];if(!active||![x,y,seconds].every(Number.isFinite))return next;
 const index=targets.findIndex(p=>Math.hypot(p.x-x,p.y-y)<23);
 if(index>=0)next[index]=Math.min(1,(next[index]??0)+Math.max(0,Math.min(.1,seconds))/1.05);
 return next;
}
export function sortMolecule(sorted:readonly number[],particle:number,bin:number):readonly number[]{
 return Number.isInteger(particle)&&AIR_SAMPLE[particle]===bin&&!sorted.includes(particle)?[...sorted,particle]:sorted;
}
