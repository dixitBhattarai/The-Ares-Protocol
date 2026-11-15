import * as THREE from 'three';
import type { AvatarActivity, PlayerMotion } from '../../contracts/exploration';
import { createCabinPosture } from './cabin-posture';
import { createAvatarActionLayer } from './avatar-action';

/** AnimationMixer blending, following Three.js's skinning/blending example.
 * Only bones are animated: Rapier owns the enclosing player's world transform.
 */
export function createLocomotion(model: THREE.Object3D, clips: readonly THREE.AnimationClip[]) {
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<string, THREE.AnimationAction>();
  for (const name of ['Idle', 'Walk']) {
    const source = clips.find(clip => clip.name === name);
    if (!source) throw new Error(`Character is missing ${name} animation`);
    const clip = source.clone();
    model.updateWorldMatrix(true,true);
    for (const track of clip.tracks) {
      if (!/hips\.position$/i.test(track.name)) continue;
      // Keep vertical breathing/steps, remove horizontal root motion and loop drift.
      // Imported FBX bones may have rotated centimetre parents, so local Z can be up.
      const hips = model.getObjectByName(track.name.replace(/\.position$/i,''));
      const parentToModel = new THREE.Matrix4().copy(model.matrixWorld).invert();
      if (hips?.parent) parentToModel.multiply(hips.parent.matrixWorld);
      else parentToModel.identity();
      const modelToParent=parentToModel.clone().invert();
      const first=new THREE.Vector3().fromArray(track.values,0).applyMatrix4(parentToModel);
      const value=new THREE.Vector3();
      for (let i = 0; i < track.values.length; i += 3) {
        value.fromArray(track.values,i).applyMatrix4(parentToModel);
        value.x=first.x;value.z=first.z;
        value.applyMatrix4(modelToParent);
        track.values[i]=value.x;track.values[i+1]=value.y;track.values[i+2]=value.z;
      }
    }
    actions.set(name, mixer.clipAction(clip).setEffectiveWeight(name === 'Idle' ? 1 : 0));
  }
  const actionLayer = createAvatarActionLayer(model);
  let current = actions.get('Idle')!;
  current.play();
  let moving = false;
  let sinceMovement = Infinity;
  let reduced = false;
  let playerMotion: PlayerMotion = {grounded:true,verticalSpeed:0,body:'mars'};
  let activity: AvatarActivity = {action:'none',progress:0};
  let posture:'ground'|'float'|'seated'='ground';
  const cabinPosture=createCabinPosture(model);
  const pose=()=>cabinPosture.apply(posture);
  return {
    mixer,
    setMotion(motion: PlayerMotion) { playerMotion = motion; actionLayer.setMotion(motion); },
    setActivity(next: AvatarActivity) { activity = next; actionLayer.setActivity(next); },
    resetActions() { actionLayer.reset(); playerMotion={grounded:true,verticalSpeed:0,body:'mars'}; activity={action:'none',progress:0}; moving = false; sinceMovement = Infinity; },
    getActionState: actionLayer.getState,
    setPosture(value:'ground'|'float'|'seated'){if(posture===value)return;cabinPosture.restore();actionLayer.beforeMixer();posture=value;moving=false;sinceMovement=Infinity;mixer.update(0);pose();},
    actions: actions as ReadonlyMap<string, THREE.AnimationAction>,
    setMoving(value: boolean) { moving = value; if (value) sinceMovement = 0; },
    update(seconds: number, active: boolean, reduceMotion: boolean) {
      if (!active) return;
      if (reduceMotion) {
        if (!reduced) {
          mixer.stopAllAction();
          current = actions.get('Idle')!;
          current.reset().setEffectiveWeight(1).play();
        }
        cabinPosture.restore();actionLayer.beforeMixer();
        mixer.update(0);
        pose();
        actionLayer.update(0, true, true, posture==='ground');
        reduced = true;
        return;
      }
      reduced = false;
      const delta = Number.isFinite(seconds) ? THREE.MathUtils.clamp(seconds, 0, .1) : 0;
      // Rendering can run faster than the fixed physics step; bridge empty pose frames.
      sinceMovement += delta;
      const walking = posture==='ground' && playerMotion.grounded && playerMotion.body!=='orbit' && activity.action==='none' && (moving || sinceMovement < .1);
      const next = actions.get(walking ? 'Walk' : 'Idle')!;
      if (next !== current) {
        next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
        current.crossFadeTo(next, .2, false);
        current = next;
      }
      cabinPosture.restore();actionLayer.beforeMixer();
      mixer.update(delta);
      pose();
      actionLayer.update(delta, true, false, posture==='ground');
    },
    dispose() { cabinPosture.restore();actionLayer.reset(); mixer.stopAllAction(); mixer.uncacheRoot(model); },
  };
}
