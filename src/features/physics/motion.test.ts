import {afterEach, describe, expect, it, vi} from 'vitest';
import {createPhysics, EARTH_GRAVITY, GROUND_Y, JUMP_SPEED, MARS_GRAVITY} from './index';
import type {PhysicsAdapter} from '../../contracts';

const live: PhysicsAdapter[] = [];
async function fixture() {
  const physics = await createPhysics();
  live.push(physics);
  return physics;
}
afterEach(() => {live.splice(0).forEach(physics => physics.dispose()); vi.unstubAllGlobals();});

function advance(physics: PhysicsAdapter, seconds: number) {
  for(let i=0;i<Math.ceil(seconds*60);i++) physics.step(1/60);
}

describe('physics-driven character motion', () => {
  it('reports takeoff, airborne apex, descent and grounded touchdown for a Mars jump', async () => {
    const physics=await fixture();
    expect(physics.getMotionState?.()).toEqual({grounded:true,verticalSpeed:0,body:'mars'});
    physics.requestJump?.();
    physics.step(1/60);
    const takeoff=physics.getMotionState!();
    expect(takeoff.grounded).toBe(false);
    expect(takeoff.verticalSpeed).toBeGreaterThan(2);
    let peak=physics.getPlayerPose().y;
    let descent=false;
    for(let i=0;i<120;i++){
      physics.step(1/60);
      peak=Math.max(peak,physics.getPlayerPose().y);
      const motion=physics.getMotionState!();
      if(motion.verticalSpeed<-.2) {descent=true;expect(motion.grounded).toBe(false);}
    }
    expect(peak-GROUND_Y).toBeCloseTo(JUMP_SPEED*JUMP_SPEED/(2*MARS_GRAVITY),1);
    expect(descent).toBe(true);
    expect(physics.getMotionState!().grounded).toBe(true);
    expect(physics.getMotionState!().verticalSpeed).toBeCloseTo(0,2);
  });

  it('does not restart a jump in midair or buffer it until touchdown', async () => {
    const physics=await fixture();
    physics.requestJump?.();advance(physics,.3);
    const before=physics.getMotionState!().verticalSpeed;
    physics.requestJump?.();physics.step(1/60);
    expect(physics.getMotionState!().verticalSpeed).toBeLessThan(before);
    advance(physics,2);
    expect(physics.getMotionState!().grounded).toBe(true);
    expect(physics.getPlayerPose().y).toBeCloseTo(GROUND_Y,3);
  });

  it('preserves the same takeoff impulse but gives a lower jump in Earth gravity', async () => {
    const physics=await fixture();physics.setGravityBody?.('earth');
    physics.requestJump?.();
    let peak=GROUND_Y;
    for(let i=0;i<90;i++){physics.step(1/60);peak=Math.max(peak,physics.getPlayerPose().y);}
    expect(physics.getMotionState!().body).toBe('earth');
    expect(peak-GROUND_Y).toBeCloseTo(JUMP_SPEED*JUMP_SPEED/(2*EARTH_GRAVITY),1);
    expect(physics.getMotionState!().grounded).toBe(true);
  });

  it('can jump from an actual elevated collider instead of requiring the base floor', async () => {
    const physics=await fixture();
    // Habitat desk collider: centre (-7,.45,-2.2), top at .9m.
    physics.reset?.({x:-7,y:2.1,z:-2.2});advance(physics,1);
    expect(physics.getPlayerPose().y).toBeCloseTo(1.7,1);
    expect(physics.getMotionState!().grounded).toBe(true);
    physics.requestJump?.();physics.step(1/60);
    expect(physics.getMotionState!().grounded).toBe(false);
    expect(physics.getMotionState!().verticalSpeed).toBeGreaterThan(2);
  });

  it('clears requests on pause/reset, rejects orbit and remains safe after disposal', async () => {
    const physics=await fixture();
    physics.requestJump?.();physics.pauseInput?.();physics.resumeInput?.();physics.step(1/60);
    expect(physics.getMotionState!().grounded).toBe(true);
    physics.pauseInput?.();physics.requestJump?.();physics.resumeInput?.();physics.step(1/60);
    expect(physics.getMotionState!().grounded).toBe(true);
    physics.requestJump?.();physics.reset?.();physics.step(1/60);
    expect(physics.getMotionState!().grounded).toBe(true);
    physics.setGravityBody?.('orbit');physics.requestJump?.();advance(physics,.5);
    expect(physics.getMotionState!()).toEqual({grounded:false,verticalSpeed:0,body:'orbit'});
    physics.dispose();expect(()=>physics.requestJump?.()).not.toThrow();
    expect(physics.getMotionState!()).toEqual({grounded:false,verticalSpeed:0,body:'orbit'});
  });

  it('clears queued jump on blur/hidden tabs and ignores Space on focused controls', async () => {
    const listeners=new Map<string,Set<(event:any)=>void>>();
    const target={
      addEventListener(type:string,fn:(event:any)=>void){const list=listeners.get(type)??new Set();list.add(fn);listeners.set(type,list);},
      removeEventListener(type:string,fn:(event:any)=>void){listeners.get(type)?.delete(fn);},
    };
    const dispatch=(type:string,event:any={})=>listeners.get(type)?.forEach(fn=>fn(event));
    const fakeDocument={...target,hidden:false};
    vi.stubGlobal('window',target);vi.stubGlobal('document',fakeDocument);
    const physics=await fixture();
    physics.requestJump?.();dispatch('blur');physics.step(1/60);expect(physics.getMotionState!().grounded).toBe(true);
    dispatch('keydown',{code:'Space',repeat:false,target:{closest:(selector:string)=>selector.includes('button')},preventDefault:vi.fn()});
    physics.step(1/60);expect(physics.getMotionState!().grounded).toBe(true);
    physics.requestJump?.();fakeDocument.hidden=true;dispatch('visibilitychange');
    physics.requestJump?.();fakeDocument.hidden=false;physics.step(1/60);expect(physics.getMotionState!().grounded).toBe(true);
    physics.step(Number.NaN);expect(Number.isFinite(physics.getPlayerPose().y)).toBe(true);
  });
});
