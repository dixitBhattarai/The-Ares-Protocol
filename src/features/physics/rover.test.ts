import {beforeAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createPhysics} from './index';
import {ROVER_DOCK} from '../../contracts/expedition';
// Initialize WASM in its native Node environment before installing browser input doubles.
beforeAll(async()=>{const p=await createPhysics();p.step(1/60);p.dispose();});
beforeEach(()=>{const listeners=new Map<string,Set<(e:Event)=>void>>();vi.stubGlobal('window',{addEventListener(type:string,fn:(e:Event)=>void){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type)!.add(fn);},removeEventListener(type:string,fn:(e:Event)=>void){listeners.get(type)?.delete(fn);},dispatchEvent(e:Event){for(const fn of listeners.get(e.type)??[])fn(e);return true;}});});afterEach(()=>vi.unstubAllGlobals());
function key(type:string,code:string){const e=new Event(type,{cancelable:true});Object.assign(e,{code,repeat:false});window.dispatchEvent(e);}
it('drives, steers, brakes without jumping, and has a safe exit',async()=>{
 const p=await createPhysics();p.setGravityBody?.('mars');try{
  p.step(1/60);expect(p.setRoverMode?.(true,ROVER_DOCK)).toBe(true);key('keydown','KeyW');key('keydown','KeyD');for(let i=0;i<60;i++)p.step(1/60);key('keyup','KeyD');
  expect(p.getPlayerPose().x).toBeGreaterThan(ROVER_DOCK.x+.5);expect(p.getRoverHeading?.()).toBeLessThan(Math.PI);
  key('keydown','Space');p.requestJump?.();for(let i=0;i<70;i++)p.step(1/60);key('keyup','Space');key('keyup','KeyW');expect(p.getPlayerPose().y).toBeLessThan(.9);
  p.pauseInput?.();const frozen=p.getPlayerPose();p.step(.1);expect(p.getPlayerPose().x).toBeCloseTo(frozen.x);p.resumeInput?.();
  const parked=p.getPlayerPose();expect(p.setRoverMode?.(false)).toBe(true);expect(Math.hypot(p.getPlayerPose().x-parked.x,p.getPlayerPose().z-parked.z)).toBeGreaterThan(1.8);
 }finally{p.dispose();}
});
it('keeps the vehicle clear of the pressure dome and solid landmarks',async()=>{
 const p=await createPhysics();try{
  p.step(1/60);p.setRoverMode?.(true,ROVER_DOCK);key('keydown','KeyW');for(let i=0;i<300;i++)p.step(1/60);key('keyup','KeyW');expect(Math.hypot(p.getPlayerPose().x,p.getPlayerPose().z+2)).toBeGreaterThanOrEqual(18.4);
  p.setRoverMode?.(true,{x:21,y:.8,z:13});key('keydown','KeyW');for(let i=0;i<180;i++)p.step(1/60);key('keyup','KeyW');expect(p.getPlayerPose().z).toBeGreaterThan(9.4);
 }finally{p.dispose();}
});
