import {describe,it,expect} from 'vitest';
import {createLandingFlight,createFinalApproach,stepLandingFlight} from './landing-flight';
describe('continuous powered Mars descent',()=>{
 it('changes descent speed with thrust and lateral trajectory with tilt',()=>{
  const start=createFinalApproach();
  expect(stepLandingFlight({...start,throttle:1},.1,{throttle:0,steer:0}).verticalSpeed).toBeGreaterThan(stepLandingFlight({...start,throttle:0},.1,{throttle:0,steer:0}).verticalSpeed);
  expect(stepLandingFlight({...start,bank:20},.1,{throttle:0,steer:0}).horizontalSpeed).toBeGreaterThan(stepLandingFlight({...start,bank:-20},.1,{throttle:0,steer:0}).horizontalSpeed);
 });
 it('requires a gentle, aligned, level touchdown with legs',()=>{
  const safe={...createFinalApproach(),forwardSpeed:0,altitude:.01,verticalSpeed:-2,offset:0,horizontalSpeed:0,pitch:0,legs:true};
  expect(stepLandingFlight(safe,.1,{throttle:0,steer:0}).status).toBe('landed');
  for(const change of [{legs:false},{offset:20},{verticalSpeed:-10},{pitch:20},{horizontalSpeed:6}])expect(stepLandingFlight({...safe,...change},.1,{throttle:0,steer:0}).status).toBe('retry');
 });
 it('offers optional assistance that can finish the approach, with manual input taking over',()=>{
  let s={...createLandingFlight(),assist:true};
  for(let i=0;i<12000&&s.status==='flying';i++)s=stepLandingFlight(s,1/60,{throttle:0,steer:0});
  expect(s.status).toBe('landed');expect(s.fuel).toBeGreaterThan(0);
  expect(stepLandingFlight({...createLandingFlight(),assist:true},.1,{throttle:1,steer:0}).assist).toBe(false);
 });
 it('uses W/S pitch independently of throttle and never flies backwards through entry',()=>{
  let s=createLandingFlight();const down=stepLandingFlight(s,.1,{throttle:0,steer:0,pitch:-1});
  expect(down.pitch).toBeLessThan(s.pitch);expect(down.throttle).toBe(s.throttle);
  expect(stepLandingFlight(s,.1,{throttle:0,steer:0,pitch:1}).pitch).toBeGreaterThan(s.pitch);
  for(let i=0;i<4000&&s.phase!=='approach';i++){s=stepLandingFlight(s,1/60,{throttle:0,steer:0,pitch:1});expect(s.forwardSpeed).toBeGreaterThanOrEqual(0);}
  expect(s.phase).toBe('approach');expect(s.altitude).toBeLessThanOrEqual(800);
 });});
