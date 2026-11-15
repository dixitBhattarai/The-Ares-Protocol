import type {Vec3} from './index';
export const ROAM_LIMIT=72;
export const DISCOVERY_SITES=[
 {id:'basalt',name:'Basalt gardens',x:-38,z:24,stage:0,color:'#d8ac7b',kind:'ridge'},
 {id:'rover',name:'Rover camp',x:36,z:30,stage:0,color:'#b7d8c0',kind:'rover'},
 {id:'relay',name:'Silent relay',x:37,z:-32,stage:1,color:'#92cbd4',kind:'relay'},
 {id:'stars',name:'Horizon observatory',x:-33,z:-36,stage:2,color:'#c1b7e0',kind:'telescope'},
] as const;
export type DiscoveryId=typeof DISCOVERY_SITES[number]['id'];
export function nearbyDiscovery(pose:Vec3){return DISCOVERY_SITES.find(site=>Math.hypot(pose.x-site.x,pose.z-site.z)<3.5);}
export function discoverSite(found:readonly DiscoveryId[],id:DiscoveryId){return DISCOVERY_SITES.some(s=>s.id===id)&&!found.includes(id)?[...found,id]:found;}
export const SITE_OBSTACLES=DISCOVERY_SITES.map(site=>({x:site.x+4,z:site.z,halfX:site.kind==='ridge'?2.2:1.6,halfZ:1.7,height:site.kind==='ridge'?4:2.5}));
/** A loop with clear approach spurs, avoiding both legacy and discovery landmark footprints. */
export const DISCOVERY_TRAILS=[
 [[0,16],[0,24]],[[0,24],[0,36]],[[0,36],[-46,36]],[[-46,36],[-46,-42]],
 [[-46,-42],[46,-42]],[[46,-42],[46,36]],[[46,36],[0,36]],[[-38,36],[-38,24]],
 [[-33,-42],[-33,-36]],[[37,-42],[37,-32]],[[36,36],[36,30]],
] as const;
