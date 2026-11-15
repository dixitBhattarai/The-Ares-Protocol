import {describe,it,expect} from 'vitest';
import {stepCabin,CABIN} from './cabin-motion';
describe('orbital cabin motion',()=>{
 it('retains momentum with no keys and brakes deliberately',()=>{const p={x:0,y:2,z:0},v={x:1,y:0,z:0};expect(stepCabin(p,v,new Set(),0,.1,false).velocity.x).toBeGreaterThan(.9);expect(stepCabin(p,v,new Set(['ControlLeft']),0,.1,false).velocity.x).toBeLessThan(.6);});
 it('rises and descends without ground jumping, and contains the crew',()=>{const p={x:0,y:2,z:0},v={x:0,y:0,z:0};expect(stepCabin(p,v,new Set(['Space']),0,.1,false).pose.y).toBeGreaterThan(2);expect(stepCabin(p,v,new Set(['ShiftLeft']),0,.1,false).pose.y).toBeLessThan(2);expect(stepCabin({...p,y:4.6},{...v,y:2},new Set(),0,.1,false).pose.y).toBe(CABIN.ceiling);});
 it('climbs along the visible ladder rather than walking through the deck',()=>{const q=stepCabin({x:-3.7,y:1,z:2.6},{x:0,y:0,z:0},new Set(['KeyW']),0,.1,true);expect(q.pose.y).toBeGreaterThan(1);expect(q.pose.x).toBe(CABIN.ladderX);});
});
