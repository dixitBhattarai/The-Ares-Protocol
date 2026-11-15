import { describe, expect, it } from 'vitest';
import { waterRoots, PLANT_X, ROOT_Y } from './watering';
import { MINI_TARGETS } from './minigame';
describe('hands-on root watering',()=>{
 it('only waters the thirsty roots, never healthy plants or leaves',()=>{
  for(let stage=0;stage<3;stage++){
   const target=MINI_TARGETS[stage];
   expect(waterRoots(stage,0,PLANT_X[target],ROOT_Y,.1,true)).toBeGreaterThan(0);
   expect(waterRoots(stage,0,PLANT_X[(target+1)%3],ROOT_Y,.1,true)).toBe(0);
   expect(waterRoots(stage,0,PLANT_X[target],120,.1,true)).toBe(0);
  }
 });
 it('retains partial work on release, clamps elapsed time and caps completion',()=>{
  const x=PLANT_X[MINI_TARGETS[0]];
  expect(waterRoots(0,.3,x,ROOT_Y,10,false)).toBe(.3);
  expect(waterRoots(0,.3,x,ROOT_Y,10,true)).toBeCloseTo(.35);
  let amount=0;for(let i=0;i<45;i++)amount=waterRoots(0,amount,x,ROOT_Y,.1,true);
  expect(amount).toBe(1);
  expect(waterRoots(0,amount,x,ROOT_Y,.1,true)).toBe(1);
  expect(waterRoots(8,0,x,ROOT_Y,.1,true)).toBe(0);
 });
});
