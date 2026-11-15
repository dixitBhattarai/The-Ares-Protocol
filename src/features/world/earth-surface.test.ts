import {expect,it} from 'vitest';
import {launchGroundOpacity} from './earth-surface';
it('keeps terrain on the pad, fades it during ascent and removes it completely before the orbital view',()=>{
 expect(launchGroundOpacity(0)).toBe(1);expect(launchGroundOpacity(500)).toBe(1);
 expect(launchGroundOpacity(1200)).toBeCloseTo(.5);expect(launchGroundOpacity(1800)).toBe(0);expect(launchGroundOpacity(100000)).toBe(0);
});
