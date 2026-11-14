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
  return {
    mixer,
    actions: actions as ReadonlyMap<string, THREE.AnimationAction>,
    setMoving(value: boolean) { moving = value; if (value) sinceMovement = 0; },
    update(seconds: number, active: boolean, reduceMotion: boolean) {
      if (reduceMotion) {
        if (!reduced) {
          mixer.stopAllAction();
          current = actions.get('Idle')!;
          current.reset().setEffectiveWeight(1).play();
          mixer.update(0);
        }
        reduced = true;
        return;
      }
      reduced = false;
      if (!active) return;
      const delta = Number.isFinite(seconds) ? THREE.MathUtils.clamp(seconds, 0, .1) : 0;
      // Rendering can run faster than the fixed physics step; bridge empty pose frames.
      sinceMovement += delta;
      const next = actions.get(moving || sinceMovement < .1 ? 'Walk' : 'Idle')!;
      if (next !== current) {
        next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
        current.crossFadeTo(next, .2, false);
        current = next;
      }
      mixer.update(delta);
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(model); },
  };
}
