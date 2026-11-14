import * as THREE from 'three';
import type { ModelKit } from './resources';

export interface AstronautVisual {
  group: THREE.Group;
  legs: readonly THREE.Group[];
  arms: readonly THREE.Group[];
}

export function createAstronaut(kit: ModelKit): AstronautVisual {
  const group = new THREE.Group();
  group.name = 'astronaut';
  const { ivory, dark, orange, trim } = kit.materials;
  kit.sphere(group, ivory, [.235, .4, .2], [0, -.12, 0]);
  kit.box(group, trim, [.32, .4, .13], [0, -.05, -.15]);
  kit.sphere(group, ivory, [.29, .29, .29], [0, .43, 0]);
  kit.sphere(group, dark, [.25, .18, .16], [0, .44, .12]);
  kit.box(group, orange, [.18, .14, .04], [0, -.04, .195]);
  const legs = [-.13, .13].map((x, index) => {
    const leg = new THREE.Group();
    leg.name = index ? 'right-leg' : 'left-leg';
    leg.position.set(x, -.3, 0);
    kit.box(leg, ivory, [.16, .36, .18], [0, -.18, 0]);
    kit.box(leg, dark, [.16, .14, .26], [0, -.42, .02]);
    group.add(leg);
    return leg;
  });
  const arms = [-.23, .23].map((x, index) => {
    const arm = new THREE.Group();
    arm.name = index ? 'right-arm' : 'left-arm';
    arm.position.set(x, .04, 0);
    kit.sphere(arm, ivory, [.065, .29, .08], [0, -.19, 0]);
    kit.sphere(arm, orange, [.065, .09, .075], [0, -.43, .02]);
    group.add(arm);
    return arm;
  });
  return { group, legs, arms };
}

/** Animate only the visual rig. The caller supplies distance-based cycle and pose. */
export function applyAstronautGait(visual: AstronautVisual, cycle: number, moving: boolean): void {
  const swing = moving && Number.isFinite(cycle) ? Math.sin(cycle) : 0;
  visual.legs.forEach((leg, index) => {
    const side = index ? -1 : 1;
    leg.rotation.x = side * swing * .15;
    leg.position.y = -.3 + Math.abs(swing) * .01 + Math.max(0, side * swing) * .025;
  });
  visual.arms.forEach((arm, index) => { arm.rotation.x = (index ? 1 : -1) * swing * .12; });
}
