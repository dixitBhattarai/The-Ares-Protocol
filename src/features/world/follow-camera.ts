import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Vec3 } from '../../contracts';
import { FIRST_PERSON_FOV, applyLook, eyePosition, wrapYaw } from './first-person';
import type { Look } from './first-person';

/** A player-following perspective camera. App still owns all frame scheduling.
 * Third person orbits the player; first person sits at eye height and is driven by yaw/pitch.
 */
export function createFollowCamera(canvas: HTMLCanvasElement) {
  const camera = new THREE.PerspectiveCamera(55, 1, .08, 1400);
  const view = camera.clone(); view.name='explorer-camera';
  view.rotation.order = 'YXZ';
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
  const up = new THREE.Vector3(0, 1, 0);
  let context = '';
  let workFocus:'none'|'dig'|'research'='none';
  let firstPerson = false;
  let pendingYaw = 0;
  let look: Look = { yaw: 0, pitch: 0 };
  const ray = new THREE.Raycaster();
  return {
    camera:view, controls,
    setWorkFocus(value:'none'|'dig'|'research'){if(value===workFocus)return;workFocus=value;context='';},
    update(pose: Vec3, aspect: number, nextContext: string, enabled: boolean) {
      controls.enabled = enabled && !firstPerson;
      if (!enabled) return;
      if (firstPerson) {
        const eye = eyePosition(pose);
        view.fov = FIRST_PERSON_FOV; view.aspect = Math.max(.1, aspect);
        view.position.set(eye.x, eye.y, eye.z);
        view.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
        view.updateProjectionMatrix(); view.updateMatrixWorld();
        return;
      }
      target.set(pose.x, pose.y + .45, pose.z);
      if (context !== nextContext) {
        context = nextContext;
        const offset = new THREE.Vector3(workFocus==='research'?-2.4:workFocus==='dig'?2.4:0, workFocus!=='none'?1.65:nextContext === 'room' ? 3.5 : 2.5, workFocus==='research'?-2.4:workFocus==='dig'?3:nextContext === 'room' ? 5 : 8).applyAxisAngle(up, pendingYaw);
        pendingYaw = 0;
        camera.position.copy(target).add(offset);
        controls.target.copy(target);
        controls.maxDistance = nextContext === 'room' ? 9 : 18;
      } else {
        camera.position.add(new THREE.Vector3().subVectors(target, controls.target));
        controls.target.copy(target);
      }
      camera.aspect = Math.max(.1, aspect); camera.updateProjectionMatrix(); controls.update();
      view.copy(camera);view.name='explorer-camera';view.updateMatrixWorld();
    },
    avoidOcclusion(objects:THREE.Object3D[]) {
      if (firstPerson) return;
      const offset=new THREE.Vector3().subVectors(camera.position,controls.target),distance=offset.length();
      ray.set(controls.target,offset.normalize());
      const hit=ray.intersectObjects(objects,true).find(hit=>{let obj:THREE.Object3D|null=hit.object;while(obj){if(!obj.visible)return false;obj=obj.parent;}return true;});
      if(hit && hit.distance<distance) {view.position.copy(controls.target).addScaledVector(offset,Math.max(.45,hit.distance-.2));view.updateMatrixWorld();}
    },
    /** Switch viewpoint. The heading carries over so the player keeps facing the same way. */
    setFirstPerson(next: boolean) {
      if (next === firstPerson) return;
      if (next) look = { yaw: wrapYaw(controls.getAzimuthalAngle()), pitch: -.08 };
      else { pendingYaw = look.yaw; context = ''; }
      firstPerson = next;
    },
    isFirstPerson: () => firstPerson,
    /** Pointer deltas in pixels. Ignored outside first person. */
    look(dx: number, dy: number) { if (firstPerson) look = applyLook(look, dx, dy); },
    // OrbitControls subtracts these angles: positive mouse X must turn the view right.
    orbitLook(dx: number, dy: number) {
      controls.rotateLeft(dx * .0022);
      controls.rotateUp(dy * .0022);
      controls.update();
    },
    yaw: () => firstPerson ? look.yaw : controls.getAzimuthalAngle(),
    reset() { context = ''; if (firstPerson) look = { yaw: look.yaw, pitch: -.08 }; },
    rotate(angle: number) {
      if (firstPerson) { look = { yaw: wrapYaw(look.yaw + angle), pitch: look.pitch }; return; }
      controls.rotateLeft(angle); controls.update();
    },
    zoom(closer: boolean) { if (firstPerson) return; if (closer) controls.dollyIn(1 / 1.2); else controls.dollyOut(1 / 1.2); controls.update(); },
    dispose() { controls.dispose(); },
  };
}
