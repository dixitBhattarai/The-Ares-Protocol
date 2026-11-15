import type {Vec3} from '../../contracts';
export const CABIN={half:4.4,ceiling:4.45,ladderX:-3.7,ladderZ:2.6};
export function stepCabin(p:Vec3,v:Vec3,keys:ReadonlySet<string>,yaw:number,dt:number,ladder:boolean){
 const axis=(a:string,b:string)=>Number(keys.has(a))-Number(keys.has(b));
 const x=axis('KeyD','KeyA'),z=axis('KeyS','KeyW'),up=Number(keys.has('Space'))-Number(keys.has('ShiftLeft')||keys.has('ShiftRight'));const q={...v};
 if(ladder){q.x=q.z=0;q.y=axis('KeyW','KeyS')*1.3;}else{q.x+=(x*Math.cos(yaw)+z*Math.sin(yaw))*2*dt;q.z+=(-x*Math.sin(yaw)+z*Math.cos(yaw))*2*dt;q.y+=up*2*dt;const drag=Math.exp(-(keys.has('ControlLeft')||keys.has('ControlRight')?6:.12)*dt);for(const k of ['x','y','z'] as const)q[k]=Math.max(-2,Math.min(2,q[k]*drag));}
 const next={x:ladder?CABIN.ladderX:p.x+q.x*dt,y:p.y+q.y*dt,z:ladder?CABIN.ladderZ:p.z+q.z*dt};for(const k of ['x','y','z'] as const){const lo=k==='y'?.8:-CABIN.half,hi=k==='y'?CABIN.ceiling:CABIN.half;if(next[k]<lo||next[k]>hi){next[k]=Math.max(lo,Math.min(hi,next[k]));q[k]=0;}}return {pose:next,velocity:q};}

