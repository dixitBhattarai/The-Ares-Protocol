import type { Vec3 } from '../../contracts';
import { HABITAT as H, type HabitatAccess } from '../../contracts/habitat';
/** Sweep both bulkheads and the dome footprint, including jumps and diagonal movement. */
export function constrainHabitatMotion(previous: Vec3, next: Vec3, access: HabitatAccess): Vec3 {
 const corridor=Math.abs(previous.x)<H.halfWidth-.3 && Math.abs(next.x)<H.halfWidth-.3;
 for (const [z,open] of [[H.innerZ,access.phase==='inside'],[H.outerZ,access.phase==='outside'&&access.suited]] as const) {
  if ((previous.z-z)*(next.z-z)<=0 && previous.z!==next.z && Math.max(previous.z,next.z)>=H.innerZ-.4 && corridor && !open) return {...previous,y:next.y};
 }
 const radius=(p:Vec3)=>Math.hypot(p.x,p.z-H.centerZ);
 const chamber=(p:Vec3)=>Math.abs(p.x)<H.halfWidth-.3 && p.z>=H.innerZ-.4 && p.z<=H.outerZ+.4;
 for(const side of [-1,1]) {
  const wall=side*(H.halfWidth-.3);
  if((previous.x-wall)*(next.x-wall)<=0 && previous.x!==next.x){
   const t=(wall-previous.x)/(next.x-previous.x),z=previous.z+t*(next.z-previous.z);
   if(z>H.innerZ-.3 && z<H.outerZ+.3)return {...previous,y:next.y};
  }
 }
 // Side walls of the chamber cannot be bypassed even with a suit.
 if (Math.abs(previous.x)<H.halfWidth-.3 && previous.z>H.innerZ && previous.z<H.outerZ && (Math.abs(next.x)>H.halfWidth-.3)) return {...previous,y:next.y};
 if (chamber(next) && (chamber(previous)||corridor)) return next;
 const wasInside=radius(previous)<=H.radius-.32;
 const isInside=radius(next)<=H.radius-.32;
 const recovering=!access.suited && !wasInside && radius(previous)<H.radius-.02 && radius(next)<radius(previous);
 if (wasInside!==isInside && !recovering && !(corridor&&Math.min(previous.z,next.z)>H.innerZ)) return {...previous,y:next.y};
 if (!isInside && !chamber(next) && !access.suited && radius(next)>=radius(previous)) return {...previous,y:next.y};
 return next;
}
