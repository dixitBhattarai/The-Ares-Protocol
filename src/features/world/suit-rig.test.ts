import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WorldResources } from './resources';
import { rigSuit } from './suit-rig';

function fixture() {
  const resources = new WorldResources();
  const geometry = resources.geometry(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.6, 1.2, 0, .6, 1.2, 0, -.15, .05, 0, .15, .05, 0, 0, 1, 0,
  ], 3));
  const source = new THREE.Mesh(geometry, resources.material(new THREE.MeshBasicMaterial()));
  const rig = rigSuit(source, resources, 1.55);
  const mesh = rig.group.children.find(child => child instanceof THREE.SkinnedMesh) as THREE.SkinnedMesh;
  return { resources, source, rig, mesh };
}

describe('procedural NASA suit rig', () => {
  it('keeps source geometry intact and gives every vertex normalized finite skin weights', () => {
    const { resources, source, mesh } = fixture();
    expect(mesh.geometry).not.toBe(source.geometry);
    expect(source.geometry.getAttribute('skinWeight')).toBeUndefined();
    const weights = mesh.geometry.getAttribute('skinWeight');
    for (let i = 0; i < weights.count; i++) {
      const values = [weights.getX(i), weights.getY(i), weights.getZ(i), weights.getW(i)];
      expect(values.every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
      expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    }
    resources.dispose();
  });

  it('deforms limbs while leaving the torso and physics-owned root position alone', () => {
    const { resources, rig, mesh } = fixture();
    rig.group.position.set(4, .8, -2);
    rig.animate(Math.PI / 2, true);
    rig.group.updateMatrixWorld(true);
    mesh.skeleton.update();
    expect(rig.legs[0].rotation.x).toBeGreaterThan(0);
    expect(rig.legs[1].rotation.x).toBeLessThan(0);
    expect(mesh.getVertexPosition(2, new THREE.Vector3()).z).not.toBeCloseTo(0);
    expect(mesh.getVertexPosition(4, new THREE.Vector3()).toArray()).toEqual([0, 1, 0]);
    expect(rig.group.position.toArray()).toEqual([4, .8, -2]);
    rig.animate(Math.PI / 2, false);
    expect(rig.legs.every(bone => bone.rotation.x === 0)).toBe(true);
    rig.animate(Number.NaN, true);
    expect(rig.arms.every(bone => Number.isFinite(bone.rotation.x))).toBe(true);
    resources.dispose();
  });

  it('releases the GPU bone texture exactly once on teardown', () => {
    const { resources, mesh } = fixture();
    mesh.skeleton.computeBoneTexture();
    let disposals = 0;
    mesh.skeleton.boneTexture!.addEventListener('dispose', () => { disposals++; });
    resources.dispose();
    resources.dispose();
    expect(disposals).toBe(1);
    expect(mesh.skeleton.boneTexture).toBeNull();
  });
});
