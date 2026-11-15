import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Vec3 } from '../../contracts';
import { FIRST_PERSON_FOV, applyLook, eyePosition, wrapYaw } from './first-person';
import type { Look } from './first-person';
import {
  FLOOR_ABOVE_FEET, PLAYER_CENTER_HEIGHT, clampOrbitPitch, facingYaw, orbitOffset, orbitUp, pitchRange, yawDirection,
} from './orbit';

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
  // OrbitControls clamps its polar angle to [0, PI], so it can never carry the camera over the top.
  // It keeps zoom (wheel, pinch, buttons), distance limits and the `enabled` flag; rotation is done here
  // with a yaw/pitch pair whose up vector rolls through the poles (see orbit.ts).
  controls.enableRotate = false;
  controls.minDistance = 2.5;
  controls.maxDistance = 18;
  controls.rotateSpeed = .65;
  const target = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let context = '';
  let workFocus:'none'|'dig'|'research'='none';
  let firstPerson = false;
  let pendingYaw = 0;
  let look: Look = { yaw: 0, pitch: 0 };
  const ray = new THREE.Raycaster();
  let groundY = 0; // height of the floor under the player's feet
  let yaw = 0, pitch = Math.atan2(2.5, 8), dist = Math.hypot(2.5, 8);

  /** Put the camera on its orbit sphere. Pitch is limited so the camera never drops below the floor,
   * but it may pass straight over the top and come down the far side (upside down). */
  const place = () => {
    pitch = clampOrbitPitch(pitch, pitchRange(target.y - (groundY + FLOOR_ABOVE_FEET), dist));
    const o = orbitOffset(yaw, pitch), u = orbitUp(yaw, pitch);
    camera.up.set(u.x, u.y, u.z);
    camera.position.set(target.x + o.x * dist, target.y + o.y * dist, target.z + o.z * dist);
    camera.lookAt(target);
  };
  const orbit = (dyaw: number, dpitch: number) => {
    if (!Number.isFinite(dyaw) || !Number.isFinite(dpitch)) return;
    // Pointer right turns the view right; pointer down raises the camera, as OrbitControls drag did.
    yaw = wrapYaw(yaw - dyaw * yawDirection(pitch));
    pitch += dpitch;
    controls.dispatchEvent({ type: 'change' });
  };

  // Drag / one-finger orbit. Two fingers are left to OrbitControls for pinch zoom.
  const pointers = new Set<number>();
  let dragPointer = -1, lastX = 0, lastY = 0;
  const onPointerDown = (event: PointerEvent) => {
    if (!controls.enabled || firstPerson || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (event.pointerType === 'mouse') pointers.clear();
    pointers.add(event.pointerId);
    if (pointers.size === 1) {
      dragPointer = event.pointerId; lastX = event.clientX; lastY = event.clientY;
      try { canvas.setPointerCapture(event.pointerId); } catch { /* capture is a convenience only */ }
    } else dragPointer = -1;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== dragPointer || !controls.enabled || firstPerson) return;
    const dx = event.clientX - lastX, dy = event.clientY - lastY;
    lastX = event.clientX; lastY = event.clientY;
    const scale = Math.PI * 2 * controls.rotateSpeed / Math.max(1, canvas.clientHeight);
    orbit(dx * scale, dy * scale);
  };
  const onPointerEnd = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (event.pointerId === dragPointer) dragPointer = -1;
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);
  canvas.addEventListener('lostpointercapture', onPointerEnd);

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
      groundY = pose.y - PLAYER_CENTER_HEIGHT; target.set(pose.x, pose.y + .45, pose.z);
      if (context !== nextContext) {
        context = nextContext;
        const offset = new THREE.Vector3(workFocus==='research'?-2.4:workFocus==='dig'?2.4:0, workFocus!=='none'?1.65:nextContext === 'room' ? 3.5 : 2.5, workFocus==='research'?-2.4:workFocus==='dig'?3:nextContext === 'room' ? 5 : 8).applyAxisAngle(up, pendingYaw);
        pendingYaw = 0;
        dist = offset.length();
        yaw = Math.atan2(offset.x, offset.z);
        pitch = Math.asin(offset.y / dist);
        controls.maxDistance = nextContext === 'room' ? 9 : 18;
      } else {
        // Wheel, pinch and the zoom buttons change the camera's radius inside OrbitControls.
        dist = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target), controls.minDistance, controls.maxDistance);
      }
      controls.target.copy(target);
      place();
      camera.aspect = Math.max(.1, aspect); camera.updateProjectionMatrix();
      view.copy(camera);view.name='explorer-camera';view.updateMatrixWorld();
    },
    avoidOcclusion(objects:THREE.Object3D[]) {
      if (firstPerson) return;
      const offset=new THREE.Vector3().subVectors(view.position,controls.target),distance=offset.length();
      ray.set(controls.target,offset.normalize());
      const hit=ray.intersectObjects(objects,true).find(hit=>{let obj:THREE.Object3D|null=hit.object;while(obj){if(!obj.visible)return false;obj=obj.parent;}return true;});
      // Moving along the ray toward the target can only bring the camera closer to the target's height, so the floor limit still holds.
      if(hit && hit.distance<distance) {view.position.copy(controls.target).addScaledVector(offset,Math.max(.45,hit.distance-.2));view.updateMatrixWorld();}
    },
    /** Switch viewpoint. The heading carries over so the player keeps facing the same way. */
    setFirstPerson(next: boolean) {
      if (next === firstPerson) return;
      if (next) look = { yaw: wrapYaw(facingYaw(yaw, pitch)), pitch: -.08 };
      else { pendingYaw = look.yaw; context = ''; }
      firstPerson = next;
    },
    isFirstPerson: () => firstPerson,
    /** Pointer deltas in pixels. Ignored outside first person. */
    look(dx: number, dy: number) { if (firstPerson) look = applyLook(look, dx, dy); },
    // Positive mouse X must turn the view right, positive Y raises the camera (matches OrbitControls drag).
    orbitLook(dx: number, dy: number) {
      if (firstPerson) return;
      orbit(dx * .0022, dy * .0022);
    },
    /** Screen-relative heading used for WASD: stays continuous over the top, so W is always "up the screen". */
    yaw: () => firstPerson ? look.yaw : yaw,
    reset() { context = ''; if (firstPerson) look = { yaw: look.yaw, pitch: -.08 }; },
    rotate(angle: number) {
      if (firstPerson) { look = { yaw: wrapYaw(look.yaw + angle), pitch: look.pitch }; return; }
      orbit(angle, 0);
    },
    zoom(closer: boolean) { if (firstPerson) return; if (closer) controls.dollyIn(1 / 1.2); else controls.dollyOut(1 / 1.2); },
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
      canvas.removeEventListener('lostpointercapture', onPointerEnd);
      controls.dispose();
    },
  };
}
