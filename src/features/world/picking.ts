import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import type { StationId } from '../../contracts';

export function pickStationAt(pointer: THREE.Vector2, camera: THREE.Camera,
  groups: THREE.Object3D[], raycaster: THREE.Raycaster): StationId | undefined {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(groups, true)[0];
  let object: THREE.Object3D | null = hit?.object ?? null;
  while (object) {
    const id = STATIONS.find(station => station.id === object!.userData.stationId)?.id;
    if (id) return id;
    object = object.parent;
  }
  return undefined;
}
