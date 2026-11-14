import {describe,it,expect} from 'vitest';
import {createLandingFlight,stepLandingFlight} from './landing-flight';
describe('continuous powered Mars descent',()=>{
 it('changes descent speed with thrust and lateral trajectory with tilt',()=>{
  const start=createLandingFlight();
  expect(stepLandingFlight({...start,throttle:1},.1,{throttle:0,steer:0}).verticalSpeed).toBeGreaterThan(stepLandingFlight({...start,throttle:0},.1,{throttle:0,steer:0}).verticalSpeed);
  expect(stepLandingFlight({...start,pitch:20},.1,{throttle:0,steer:0}).horizontalSpeed).toBeGreaterThan(stepLandingFlight({...start,pitch:-20},.1,{throttle:0,steer:0}).horizontalSpeed);
 });
 it('requires a gentle, aligned, level touchdown with legs',()=>{
  const safe={...createLandingFlight(),altitude:.01,verticalSpeed:-2,offset:0,horizontalSpeed:0,pitch:0,legs:true};
  expect(stepLandingFlight(safe,.1,{throttle:0,steer:0}).status).toBe('landed');
  for(const change of [{legs:false},{offset:20},{verticalSpeed:-10},{pitch:20},{horizontalSpeed:6}])expect(stepLandingFlight({...safe,...change},.1,{throttle:0,steer:0}).status).toBe('retry');
 });
 it('offers optional assistance that can finish the approach, with manual input taking over',()=>{
  let s={...createLandingFlight(),assist:true};
  for(let i=0;i<12000&&s.status==='flying';i++)s=stepLandingFlight(s,1/60,{throttle:0,steer:0});
  expect(s.status).toBe('landed');expect(s.fuel).toBeGreaterThan(0);
  expect(stepLandingFlight({...createLandingFlight(),assist:true},.1,{throttle:1,steer:0}).assist).toBe(false);
 });
});
