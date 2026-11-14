import { describe, expect, it } from 'vitest';
import { BUILDING_HALF_SIZE, STATIONS } from '../../contracts';
import { atDoorThreshold, atRoomExit, createSlidingDoor, doorApproach, doorwayOccupied, insideStation, nearbyDoor } from './doors';
import { createModelKit, WorldResources } from './resources';

describe('building entrances and door readiness', () => {
  it('derives room context from continuous coordinates and protects occupied thresholds',()=>{
    for(const station of STATIONS){
      const {x,z}=station.position;
      expect(insideStation({x,y:.8,z})).toBe(station.id);
      expect(insideStation(doorApproach(station.id))).toBeNull();
      expect(doorwayOccupied({x,y:.8,z:z+BUILDING_HALF_SIZE},station.id)).toBe(true);
      expect(doorwayOccupied({x:x+2,y:.8,z:z+BUILDING_HALF_SIZE},station.id)).toBe(false);
      expect(doorwayOccupied({x,y:.8,z},station.id)).toBe(false);
    }
  });
  it('keeps all approach/return points outside the collider and immediate re-entry trigger', () => {
    for (const station of STATIONS) {
      const pose = doorApproach(station.id);
      expect(pose.z - station.position.z).toBeGreaterThan(BUILDING_HALF_SIZE + .3);
      expect(nearbyDoor(pose)).toBe(station.id);
      expect(atDoorThreshold(pose, station.id)).toBe(false);
      expect(atDoorThreshold({ ...pose, z: station.position.z + BUILDING_HALF_SIZE }, station.id)).toBe(true);
      expect(atDoorThreshold({ ...pose, x: pose.x + .7, z: station.position.z + BUILDING_HALF_SIZE }, station.id)).toBe(false);
      expect(nearbyDoor({ ...pose, z: station.position.z - 2.65 })).toBeNull();
    }
  });
  it('requires the centered front room exit rather than any room boundary', () => {
    expect(atRoomExit({ x: 0, y: .8, z: 2.45 })).toBe(true);
    expect(atRoomExit({ x: 2, y: .8, z: 2.45 })).toBe(false);
    expect(atRoomExit({ x: 0, y: .8, z: 2 })).toBe(false);
  });
  it('blocks entry while sliding, closes immediately for navigation and honors reduced motion', () => {
    const resources = new WorldResources();
    const door = createSlidingDoor(createModelKit(resources), 'test');
    expect(door.isOpen()).toBe(false);
    door.setOpen(true); door.update(.1, false);
    expect(door.isOpen()).toBe(false);
    for (let i = 0; i < 3; i++) door.update(.1, false);
    expect(door.isOpen()).toBe(true);
    door.setOpen(false);
    expect(door.isOpen()).toBe(false);
    door.update(0, true);
    expect(door.group.userData.openProgress).toBe(0);
    door.setOpen(true); door.update(0, true);
    expect(door.isOpen()).toBe(true);
    resources.dispose();
  });
});
