import * as THREE from 'three';
import { BUILDING_HALF_SIZE, STATIONS, type StationId, type Vec3 } from '../../contracts';
import type { ModelKit } from './resources';

/** Real door coordinates shared with the hollow building wall colliders. */
export function doorApproach(id: StationId): Vec3 {
  const station = STATIONS.find(station => station.id === id)!;
  return { x: station.position.x, y: .8, z: station.position.z + BUILDING_HALF_SIZE + 1.1 };
}
export function nearbyDoor(pose: Vec3): StationId | null {
  return STATIONS.find(({ position }) => Math.abs(pose.x - position.x) < 1.2
    && pose.z - position.z >= BUILDING_HALF_SIZE-.6 && pose.z - position.z <= BUILDING_HALF_SIZE+1.7)?.id ?? null;
}
export function insideStation(pose: Vec3): StationId | null {
  return STATIONS.find(({position})=>Math.abs(pose.x-position.x)<BUILDING_HALF_SIZE-.15 && Math.abs(pose.z-position.z)<BUILDING_HALF_SIZE-.15)?.id ?? null;
}
export function doorwayOccupied(pose: Vec3,id:StationId): boolean {
  const station=STATIONS.find(station=>station.id===id)!;
  return Math.abs(pose.x-station.position.x)<1.15 && Math.abs(pose.z-station.position.z-BUILDING_HALF_SIZE)<.65;
}
export function atDoorThreshold(pose: Vec3, id: StationId): boolean {
  const station = STATIONS.find(station => station.id === id)!;
  return Math.abs(pose.x - station.position.x) < .48
    && Math.abs(pose.z-station.position.z-BUILDING_HALF_SIZE)<.3;
}
export function atRoomExit(pose: Vec3): boolean { return Math.abs(pose.x) < .55 && pose.z >= 2.4; }

export function createSlidingDoor(kit: ModelKit, name: string, backdrop = true, pocketDepth = 0) {
  const group = new THREE.Group(); group.name = `${name}-door`;
  const { trim, dark, ivory, orange, glass } = kit.materials;
  if (backdrop) kit.flatBox(group, dark, [1.22, 1.72, .03], [0, 0, -.035]);
  for (const x of [-.67, .67]) kit.box(group, ivory, [.12, 1.86, .09], [x, 0, 0]);
  kit.box(group, orange, [1.44, .12, .09], [0, .89, 0]);
  const leaves = [-1, 1].map(side => {
    const leaf = new THREE.Group(); group.add(leaf);
    leaf.name=`${name}-leaf-${side<0?'left':'right'}`;
    // Exterior panels retract into the wall pocket rather than its front face.
    leaf.position.z=-pocketDepth;
    kit.box(leaf, trim, [.59, 1.68, .035], [0, 0, .012]);
    kit.box(leaf, glass, [.36, .37, .016], [0, .25, .04]);
    kit.box(leaf, orange, [.035, 1.43, .018], [-side * .25, 0, .04]);
    return leaf;
  });
  let target = false, progress = 0;
  function update(seconds: number, reduced: boolean) {
    const delta = Number.isFinite(seconds) ? THREE.MathUtils.clamp(seconds, 0, .1) : 0;
    progress = reduced ? Number(target) : THREE.MathUtils.clamp(progress + (target ? 1 : -1) * delta / .4, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    leaves.forEach((leaf, i) => { leaf.position.x = (i ? 1 : -1) * (.3 + eased * .70); });
    group.userData.openProgress = progress;
  }
  update(0, false);
  return { group, setOpen(open: boolean) { target = open; }, update, isOpen: () => target && progress >= .95 };
}
