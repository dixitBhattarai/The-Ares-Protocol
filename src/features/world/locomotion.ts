import * as THREE from 'three';

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
    for (const track of clip.tracks) {
      if (!/hips\.position$/i.test(track.name)) continue;
      // Keep vertical breathing/steps, remove horizontal root motion and loop drift.
      for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] = track.values[0];
        track.values[i + 2] = track.values[2];
      }
    }
    actions.set(name, mixer.clipAction(clip).setEffectiveWeight(name === 'Idle' ? 1 : 0));
  }
  let current = actions.get('Idle')!;
  current.play();
  let moving = false;
  let sinceMovement = Infinity;
  let reduced = false;
  let posture:'ground'|'float'|'seated'='ground';
  const posed: {bone:THREE.Object3D;rest:THREE.Quaternion;kind:string}[]=[];
  model.traverse(bone=>{const kind=bone.name.replace(/^.*[:]/,'').replace(/^mixamorig\d*/, '');if(/^(Left|Right)(UpLeg|Leg|Arm|ForeArm)$/.test(kind))posed.push({bone,rest:bone.quaternion.clone(),kind});});
  function pose(){if(posture==='ground')return;for(const {bone,rest,kind} of posed){const seated=posture==='seated';const x=/UpLeg$/.test(kind)?(seated?-1.15:-.16):/Leg$/.test(kind)?(seated?1.4:.3):/ForeArm$/.test(kind)?-.6:0;const z=/Arm$/.test(kind)&&!/ForeArm$/.test(kind)?(kind.startsWith('Left')?.95:-.95):0;bone.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,0,z)));}}
  return {
    mixer,
    setPosture(value:'ground'|'float'|'seated'){if(posture===value)return;for(const {bone,rest} of posed)bone.quaternion.copy(rest);posture=value;moving=false;sinceMovement=Infinity;},
    actions: actions as ReadonlyMap<string, THREE.AnimationAction>,
    setMoving(value: boolean) { moving = value; if (value) sinceMovement = 0; },
    update(seconds: number, active: boolean, reduceMotion: boolean) {
      if (reduceMotion) {
        if (!reduced) {
          mixer.stopAllAction();
          current = actions.get('Idle')!;
          current.reset().setEffectiveWeight(1).play();
          mixer.update(0);
          pose();
        }
        reduced = true;
        return;
      }
      reduced = false;
      if (!active) return;
      const delta = Number.isFinite(seconds) ? THREE.MathUtils.clamp(seconds, 0, .1) : 0;
      // Rendering can run faster than the fixed physics step; bridge empty pose frames.
      sinceMovement += delta;
      const next = actions.get(posture==='ground'&&(moving || sinceMovement < .1) ? 'Walk' : 'Idle')!;
      if (next !== current) {
        next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
        current.crossFadeTo(next, .2, false);
        current = next;
      }
      mixer.update(delta);
      pose();
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(model); },
  };
}
