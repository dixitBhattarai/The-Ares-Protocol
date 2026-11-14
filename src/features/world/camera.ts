import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import type { Vec3 } from '../../contracts';

/** Fit base + astronaut in camera space, rather than cropping on narrow screens. */
export function frameOutpost(camera: THREE.OrthographicCamera, aspect: number, player: Vec3): void {
  const bounds = new THREE.Box3(new THREE.Vector3(-2, 0, 3), new THREE.Vector3(2, 3.5, 7));
  for (const station of STATIONS) {
    bounds.expandByPoint(new THREE.Vector3(station.position.x - 2.3, 0, station.position.z - 2));
    bounds.expandByPoint(new THREE.Vector3(station.position.x + 2.3, 3.5, station.position.z + 2));
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
  const halfHeight = Math.max(6, vertical * 1.12, horizontal * 1.12 / safeAspect);
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.left = -halfHeight * safeAspect;
  camera.right = halfHeight * safeAspect;
  camera.updateProjectionMatrix();
}
