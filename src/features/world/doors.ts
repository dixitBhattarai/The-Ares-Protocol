import * as THREE from 'three';
import { STATIONS, type StationId, type Vec3 } from '../../contracts';
import type { ModelKit } from './resources';

/** Portals sit in front of the unchanged solid station envelope (+Z face at 1.5m). */
export function doorApproach(id: StationId): Vec3 {
  const station = STATIONS.find(station => station.id === id)!;
  return { x: station.position.x, y: .8, z: station.position.z + 2.65 };
}
export function nearbyDoor(pose: Vec3): StationId | null {
  return STATIONS.find(({ position }) => Math.abs(pose.x - position.x) < 1.2
    && pose.z - position.z >= 1.75 && pose.z - position.z <= 3.6)?.id ?? null;
}
export function atDoorThreshold(pose: Vec3, id: StationId): boolean {
  const station = STATIONS.find(station => station.id === id)!;
  return Math.abs(pose.x - station.position.x) < .48
    && pose.z - station.position.z >= 1.75 && pose.z - station.position.z <= 2.02;
}
export function atRoomExit(pose: Vec3): boolean { return Math.abs(pose.x) < .55 && pose.z >= 2.4; }

export function createSlidingDoor(kit: ModelKit, name: string, backdrop = true) {
  const group = new THREE.Group(); group.name = `${name}-door`;
  const { trim, dark, ivory, orange, glass } = kit.materials;
  if (backdrop) kit.flatBox(group, dark, [1.22, 1.72, .03], [0, 0, -.035]);
  for (const x of [-.67, .67]) kit.box(group, ivory, [.12, 1.86, .09], [x, 0, 0]);
  kit.box(group, orange, [1.44, .12, .09], [0, .89, 0]);
  const leaves = [-1, 1].map(side => {
    const leaf = new THREE.Group(); group.add(leaf);
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
    leaves.forEach((leaf, i) => { leaf.position.x = (i ? 1 : -1) * (.3 + eased * .65); });
    group.userData.openProgress = progress;
  }
  update(0, false);
  return { group, setOpen(open: boolean) { target = open; }, update, isOpen: () => target && progress >= .95 };
}
