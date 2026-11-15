import { expect,it } from 'vitest';
import { constrainHabitatMotion as move } from './habitat';
import { freshHabitatAccess } from '../../contracts/habitat';
it('blocks dome bypass and unsuited outer exits, including jumps',()=>{const s=freshHabitatAccess(),a={x:13.5,y:.8,z:-2},b={x:14,y:3,z:-2};expect(move(a,b,s).x).toBe(a.x);expect(move(a,b,{...s,suited:true}).x).toBe(a.x);const c={x:0,y:.8,z:14.7},d={x:0,y:3,z:15};expect(move(c,d,s).z).toBe(c.z);expect(move(c,d,{...s,suited:true,phase:'outside'})).toEqual(d);});
it('permits the correct door in either direction and seals the other door',()=>{const a={x:0,y:.8,z:10.7},b={...a,z:10.9},s=freshHabitatAccess();expect(move(a,b,s)).toEqual(b);expect(move(a,b,{...s,suited:true,phase:'outside'}).z).toBe(a.z);expect(move(b,a,{...s,phase:'filling'}).z).toBe(b.z);});
it('lets astronauts walk beside either side of the airlock without freezing the whole strip',()=>{
 const s=freshHabitatAccess();
 for(const x of [-3,-1.4,1.4,3])for(const z of [11,11.5]){
  const a={x,y:.8,z},b={x:x+.03,y:.8,z:z-.03};
  expect(move(a,b,s)).toEqual(b);
 }
 const outside={x:.5,y:.8,z:12},throughWall={x:.8,y:.8,z:12};
 expect(move(outside,throughWall,{...s,suited:true})).toEqual(outside);
});

it('lets an unsuited player recover inward from the capsule safety margin without allowing a dome exit',()=>{
 const access=freshHabitatAccess();let pose={x:3,y:.8,z:11.5};
 for(let i=0;i<30;i++)pose=move(pose,{...pose,z:pose.z-.03},access);
 expect(pose.z).toBeCloseTo(10.6);
 expect(move(pose,{...pose,z:14},access)).toEqual(pose);
});
