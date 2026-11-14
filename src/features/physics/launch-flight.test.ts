import {describe,it,expect} from 'vitest';
import {createLaunchFlight,stepLaunchFlight} from './launch-flight';
const fly=(throttle:number,steer=0,frames=600)=>{
 let s={...createLaunchFlight(),ignited:true,throttle};
 for(let i=0;i<frames;i++)s=stepLaunchFlight(s,1/60,{throttle:0,steer});
 return s;
};
describe('continuous launch',()=>{
 it('stays on the pad before ignition and resets without inherited controls',()=>{
  expect(stepLaunchFlight(createLaunchFlight(),.1,{throttle:1,steer:1}).altitude).toBe(0);
  expect(createLaunchFlight()).toMatchObject({altitude:0,elapsed:0,ignited:false,pitch:0});
 });
 it('uses throttle and steering to change the trajectory, not checklist progress',()=>{
  expect(fly(1).altitude).toBeGreaterThan(fly(.6).altitude);
  expect(fly(.9,1).downrange).toBeGreaterThan(0);
  expect(fly(.9,-1).downrange).toBeLessThan(0);
  expect(fly(.9,1).pitch).toBe(25);
 });
 it('coasts under gravity after cutoff and reaches space with sustained thrust',()=>{
  const rising=fly(.9,0,300);
  const cutoff=stepLaunchFlight({...rising,throttle:0},.1,{throttle:0,steer:0});
  expect(cutoff.verticalSpeed).toBeLessThan(rising.verticalSpeed);
  const space=fly(.9,0,2400);
  expect(space.spaceReached).toBe(true);
  expect(space.fuel).toBeLessThan(createLaunchFlight().fuel);
  expect(space.altitude).toBeGreaterThanOrEqual(100000);
 });
});
