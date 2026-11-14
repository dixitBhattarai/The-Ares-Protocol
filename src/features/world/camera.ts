import * as THREE from 'three';
import { BUILDING_HALF_SIZE, STATIONS } from '../../contracts';
import type { Vec3 } from '../../contracts';

/** Fit base + astronaut in camera space, rather than cropping on narrow screens. */
export function frameOutpost(camera: THREE.OrthographicCamera, aspect: number, player: Vec3,
  insets = { top: 0, bottom: 0 }): void {
  const bounds = new THREE.Box3(new THREE.Vector3(-1.4, 0, 4), new THREE.Vector3(1.4, 2.5, 6.5));
  for (const station of STATIONS) {
    bounds.expandByPoint(new THREE.Vector3(station.position.x - BUILDING_HALF_SIZE-.3, 0, station.position.z - BUILDING_HALF_SIZE-.3));
    bounds.expandByPoint(new THREE.Vector3(station.position.x + BUILDING_HALF_SIZE+.3, 3.4, station.position.z + BUILDING_HALF_SIZE+.3));
  }
  bounds.expandByPoint(new THREE.Vector3(player.x - 1, player.y - .8, player.z - 1));
  bounds.expandByPoint(new THREE.Vector3(player.x + 1, player.y + 1, player.z + 1));
  const target = bounds.getCenter(new THREE.Vector3());
  camera.position.copy(target).add(new THREE.Vector3(14, 19, 23));
  camera.lookAt(target);
  camera.updateMatrixWorld();
  let horizontal = 0;
  let vertical = 0;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const corner = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        horizontal = Math.max(horizontal, Math.abs(corner.x));
        vertical = Math.max(vertical, Math.abs(corner.y));
      }
    }
  }
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const top = Math.max(0, Math.min(.4, insets.top));
  const bottom = Math.max(0, Math.min(.25, insets.bottom));
  const halfHeight = Math.max(6, vertical * 1.12 / (1 - top - bottom), horizontal * 1.12 / safeAspect);
  // Shift the projection so the scene fits below labels and above the caption.
  const offset = halfHeight * (top - bottom);
  camera.top = halfHeight + offset;
  camera.bottom = -halfHeight + offset;
  camera.left = -halfHeight * safeAspect;
  camera.right = halfHeight * safeAspect;
  camera.updateProjectionMatrix();
}
