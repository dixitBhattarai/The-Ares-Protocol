import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyAstronautGait, createAstronaut } from './astronaut';
import { createModelKit, WorldResources } from './resources';

describe('astronaut visual rig', () => {
  it('moves opposite limbs without changing the supplied root transform', () => {
    const resources = new WorldResources();
    const visual = createAstronaut(createModelKit(resources));
    visual.group.position.set(2, .8, -3);
    visual.group.rotation.y = .6;
    applyAstronautGait(visual, Math.PI / 2, true);
    expect(visual.legs[0].rotation.x).toBeCloseTo(-visual.legs[1].rotation.x);
    expect(visual.arms[0].rotation.x).toBeCloseTo(-visual.arms[1].rotation.x);
    expect(visual.arms[0].rotation.x * visual.legs[0].rotation.x).toBeLessThan(0);
    expect(visual.group.position.toArray()).toEqual([2, .8, -3]);
    expect(visual.group.rotation.y).toBe(.6);
    resources.dispose();
  });

  it('keeps the moving rig inside its existing capsule-sized visual envelope and above ground', () => {
    const resources = new WorldResources();
    const visual = createAstronaut(createModelKit(resources));
    for (let i = 0; i < 32; i++) {
      applyAstronautGait(visual, i * Math.PI / 16, true);
      const box = new THREE.Box3().setFromObject(visual.group);
      expect(box.min.y).toBeGreaterThanOrEqual(-.8);
      expect(box.max.y).toBeLessThanOrEqual(.8);
      expect(Math.max(Math.abs(box.min.x), Math.abs(box.max.x))).toBeLessThanOrEqual(.3);
      expect(Math.max(Math.abs(box.min.z), Math.abs(box.max.z))).toBeLessThanOrEqual(.3);
    }
    resources.dispose();
  });

  it('returns to a neutral pose when still, paused, reduced-motion or given an invalid cycle', () => {
    const resources = new WorldResources();
    const visual = createAstronaut(createModelKit(resources));
    for (const [cycle, moving] of [[1, false], [Number.NaN, true], [Number.POSITIVE_INFINITY, true]] as const) {
      applyAstronautGait(visual, 1, true);
      applyAstronautGait(visual, cycle, moving);
      expect(visual.legs.map(leg => Math.abs(leg.rotation.x))).toEqual([0, 0]);
      expect(visual.legs.map(leg => leg.position.y)).toEqual([-.3, -.3]);
      expect(visual.arms.map(arm => Math.abs(arm.rotation.x))).toEqual([0, 0]);
    }
    resources.dispose();
  });
});
