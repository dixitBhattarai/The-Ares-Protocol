import {expect,it} from 'vitest';
import {launchGroundOpacity} from './earth-surface';
it('keeps terrain on the pad, fades it during ascent and removes it completely before the orbital view',()=>{
 expect(launchGroundOpacity(0)).toBe(1);expect(launchGroundOpacity(4000)).toBe(1);
 expect(launchGroundOpacity(7000)).toBeCloseTo(.5);expect(launchGroundOpacity(10000)).toBe(0);expect(launchGroundOpacity(100000)).toBe(0);
});

it('recedes smoothly throughout the fade without popping or reversing',()=>{
 let previous=1;for(let altitude=0;altitude<=12000;altitude+=100){const opacity=launchGroundOpacity(altitude);expect(opacity).toBeGreaterThanOrEqual(0);expect(opacity).toBeLessThanOrEqual(previous);expect(previous-opacity).toBeLessThan(.03);previous=opacity;}
});
