import { describe, expect, it } from 'vitest';
import { BUILDING_HALF_SIZE, STATIONS } from '../../contracts';
import { createPhysics } from './index';

describe('continuous hollow-building movement',()=>{
  it.each(STATIONS)('walks through $id and back without pose jumps, while closed doors block',async(station)=>{
    const physics=await createPhysics();const {x,z}=station.position;
    physics.reset?.({x,y:.8,z:z+BUILDING_HALF_SIZE+1.1});
    physics.walkPath?.([{x,y:.8,z:z+1}]);
    for(let i=0;i<120;i++)physics.step(1/60);
    expect(physics.getPlayerPose().z-z).toBeGreaterThan(3.4);
    physics.setDoorOpen?.(station.id,true);
    let previous=physics.getPlayerPose();
    for(let i=0;i<100;i++){physics.step(1/60);const pose=physics.getPlayerPose();expect(Math.hypot(pose.x-previous.x,pose.z-previous.z)).toBeLessThan(.075);previous=pose;}
    expect(physics.getPlayerPose().z-z).toBeLessThan(2);
    expect(physics.getPlayerPose().x).toBeCloseTo(x);
    physics.setDoorOpen?.(station.id,false);physics.walkPath?.([{x,y:.8,z:z+4.3}]);
    for(let i=0;i<100;i++)physics.step(1/60);
    expect(physics.getPlayerPose().z-z).toBeLessThan(2.8);
    physics.setDoorOpen?.(station.id,true);
    for(let i=0;i<100;i++)physics.step(1/60);
    expect(physics.getPlayerPose().z-z).toBeGreaterThan(4);
    physics.dispose();
  });
  it('keeps side walls solid even while a doorway is open',async()=>{
    const physics=await createPhysics();const x=STATIONS[0].position.x;
    physics.setDoorOpen?.('habitat',true);physics.reset?.({x:x+4,y:.8,z:0});physics.walkPath?.([{x,y:.8,z:0}]);
    for(let i=0;i<120;i++)physics.step(1/60);
    expect(physics.getPlayerPose().x).toBeGreaterThan(x+3.4);physics.dispose();
  });
  it('cancels guided walking when paused instead of resuming it unexpectedly',async()=>{
    const physics=await createPhysics();physics.reset?.({x:0,y:.8,z:8});physics.walkPath?.([{x:0,y:.8,z:4}]);
    for(let i=0;i<10;i++)physics.step(1/60);
    physics.pauseInput?.();const before=physics.getPlayerPose();for(let i=0;i<30;i++)physics.step(1/60);
    expect(physics.getPlayerPose().z).toBeCloseTo(before.z);physics.resumeInput?.();for(let i=0;i<30;i++)physics.step(1/60);
    expect(physics.getPlayerPose().z).toBeCloseTo(before.z);physics.dispose();
  });
});
