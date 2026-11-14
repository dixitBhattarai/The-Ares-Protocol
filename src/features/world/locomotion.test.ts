import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createLocomotion } from './locomotion';

function fixture() {
  const model = new THREE.Group(); model.position.set(5, .8, -3);
  const hips = new THREE.Bone(); hips.name = 'mixamorig1Hips'; model.add(hips);
  const idle = new THREE.AnimationClip('Idle', 1, [new THREE.VectorKeyframeTrack('mixamorig1Hips.position', [0, 1], [0, 1, 0, 0, 1.05, 0])]);
  const walk = new THREE.AnimationClip('Walk', 1, [new THREE.VectorKeyframeTrack('mixamorig1Hips.position', [0, 1], [0, 1, 0, 4, 1.2, 8])]);
  const controller = createLocomotion(model, [idle, walk]);
  const weight = (clip: THREE.AnimationClip) => controller.actions.get(clip.name)?.getEffectiveWeight();
  return { model, hips, idle, walk, controller, weight };
}

describe('Mixamo locomotion blending', () => {
  it('crossfades to walking, bridges render frames without physics steps, then returns to idle', () => {
    const { controller, idle, walk, weight } = fixture();
    for (let i = 0; i < 40; i++) {
      controller.setMoving(i % 2 === 0);
      controller.update(1 / 120, true, false);
    }
    expect(weight(walk)).toBeCloseTo(1);
    expect(weight(idle)).toBeCloseTo(0);
    controller.setMoving(false);
    for (let i = 0; i < 50; i++) controller.update(1 / 120, true, false);
    expect(weight(idle)).toBeCloseTo(1);
    expect(weight(walk)).toBeCloseTo(0);
    controller.dispose();
  });

  it('removes horizontal root drift without changing source clips or the physics pose', () => {
    const { controller, hips, model, walk } = fixture();
    controller.setMoving(true);
    for (let i = 0; i < 5; i++) controller.update(.1, true, false);
    expect(hips.position.x).toBe(0);
    expect(hips.position.z).toBe(0);
    expect(hips.position.y).toBeGreaterThan(1);
    expect(model.position.toArray()).toEqual([5, .8, -3]);
    expect(walk.tracks[0].values[3]).toBe(4);
    controller.dispose();
  });

  it('freezes paused/reduced motion and clamps elapsed time after tab suspension', () => {
    const { controller, model } = fixture();
    controller.update(.1, true, false);
    const time = controller.mixer.time;
    controller.update(20, false, false);
    expect(controller.mixer.time).toBe(time);
    controller.update(.1, true, true);
    const reduced = controller.mixer.time;
    controller.update(.1, true, true);
    expect(controller.mixer.time).toBe(reduced);
    controller.update(20, true, false);
    expect(controller.mixer.time - reduced).toBeCloseTo(.1);
    controller.update(Number.NaN, true, false);
    expect(Number.isFinite(controller.mixer.time)).toBe(true);
    const clip = controller.actions.get('Idle')!.getClip();
    controller.dispose();
    expect(controller.mixer.existingAction(clip, model)).toBeNull();
  });
});
