import { expect,it } from 'vitest';
import { constrainHabitatMotion as move } from './habitat';
import { freshHabitatAccess } from '../../contracts/habitat';
it('blocks dome bypass and unsuited outer exits, including jumps',()=>{const s=freshHabitatAccess(),a={x:13.5,y:.8,z:-2},b={x:14,y:3,z:-2};expect(move(a,b,s).x).toBe(a.x);expect(move(a,b,{...s,suited:true}).x).toBe(a.x);const c={x:0,y:.8,z:14.7},d={x:0,y:3,z:15};expect(move(c,d,s).z).toBe(c.z);expect(move(c,d,{...s,suited:true,phase:'outside'})).toEqual(d);});
it('permits the correct door in either direction and seals the other door',()=>{const a={x:0,y:.8,z:10.7},b={...a,z:10.9},s=freshHabitatAccess();expect(move(a,b,s)).toEqual(b);expect(move(a,b,{...s,suited:true,phase:'outside'}).z).toBe(a.z);expect(move(b,a,{...s,phase:'filling'}).z).toBe(b.z);});
