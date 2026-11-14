import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Vec3 } from '../../contracts';

/** A player-following perspective camera. App still owns all frame scheduling. */
export function createFollowCamera(canvas: HTMLCanvasElement) {
  const camera = new THREE.PerspectiveCamera(55, 1, .08, 180);
  camera.name = 'explorer-camera';
  camera.position.set(0, 4.5, 8);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.minPolarAngle = .28;
  controls.maxPolarAngle = 1.35;
  controls.minDistance = 2.5;
  controls.maxDistance = 18;
  controls.rotateSpeed = .65;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  const target = new THREE.Vector3();
  let context = '';
  return {
    camera, controls,
    update(pose: Vec3, aspect: number, nextContext: string, enabled: boolean) {
      controls.enabled = enabled;
      if (!enabled) return;
      target.set(pose.x, pose.y + .45, pose.z);
      if (context !== nextContext) {
        context = nextContext;
        camera.position.copy(target).add(new THREE.Vector3(0, nextContext === 'room' ? 3.5 : 4.2, nextContext === 'room' ? 5 : 7));
        controls.target.copy(target);
        controls.maxDistance = nextContext === 'room' ? 9 : 18;
      } else {
        camera.position.add(new THREE.Vector3().subVectors(target, controls.target));
        controls.target.copy(target);
      }
      camera.aspect = Math.max(.1, aspect); camera.updateProjectionMatrix(); controls.update();
    },
    yaw: () => controls.getAzimuthalAngle(),
    reset() { context = ''; },
    rotate(angle: number) { controls.rotateLeft(angle); controls.update(); },
    zoom(closer: boolean) { if (closer) controls.dollyIn(1 / 1.2); else controls.dollyOut(1 / 1.2); controls.update(); },
    dispose() { controls.dispose(); },
  };
}
