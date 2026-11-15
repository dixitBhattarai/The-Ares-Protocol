import {MARS_OBSTACLES} from '../../contracts/exploration';
import {it,expect} from 'vitest';
import * as THREE from 'three';
import {DISCOVERY_SITES,DISCOVERY_TRAILS,SITE_OBSTACLES,ROAM_LIMIT,nearbyDiscovery,discoverSite} from '../../contracts/open-world';
import {createTerrain} from './models';
import {createModelKit,WorldResources} from './resources';
it('keeps every landmark reachable on the expanded flat physics footprint',()=>{
 const r=new WorldResources(),terrain=createTerrain(createModelKit(r),r),mesh=terrain.getObjectByName('sculpted-martian-terrain') as THREE.Mesh;
 const vertices=mesh.geometry.attributes.position;
 for(let i=0;i<vertices.count;i++)if(Math.abs(vertices.getX(i))<=ROAM_LIMIT&&Math.abs(vertices.getZ(i))<=ROAM_LIMIT)expect(vertices.getY(i)).toBe(0);
 for(const site of DISCOVERY_SITES){expect(Math.max(Math.abs(site.x),Math.abs(site.z))+6).toBeLessThan(ROAM_LIMIT);expect(nearbyDiscovery({x:site.x,y:.8,z:site.z})?.id).toBe(site.id);}
 terrain.traverse(n=>{if(n instanceof THREE.InstancedMesh)n.dispose();});r.dispose();
});
it('records discoveries once in any order and does not trigger remotely',()=>{
 let found:readonly (typeof DISCOVERY_SITES[number]['id'])[]=[];
 for(const s of [...DISCOVERY_SITES].reverse()){found=discoverSite(found,s.id);expect(discoverSite(found,s.id)).toBe(found);}
 expect(found).toHaveLength(4);expect(nearbyDiscovery({x:0,y:.8,z:0})).toBeUndefined();
});

it('keeps every marked trail clear of legacy and discovery colliders with capsule clearance',()=>{
 for(const [[ax,az],[bx,bz]] of DISCOVERY_TRAILS){
  const length=Math.hypot(bx-ax,bz-az);
  for(let d=0;d<=length;d+=.2){const x=ax+(bx-ax)*d/length,z=az+(bz-az)*d/length;
   for(const o of [...MARS_OBSTACLES,...SITE_OBSTACLES])expect(Math.abs(x-o.x)>o.halfX+.32||Math.abs(z-o.z)>o.halfZ+.32).toBe(true);
  }
 }
});
