import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { installLaunchVehicleModel } from './earth';

describe('Earth launch vehicle asset slot', () => {
  it('keeps the procedural fallback available until a local model is installed', () => {
    const slot = new THREE.Group();
    const fallback = new THREE.Group(); fallback.name = 'ARES_ROCKET_PROCEDURAL_FALLBACK'; slot.add(fallback);
    const model = new THREE.Group();
    model.add(new THREE.Mesh(new THREE.BoxGeometry(2, 4, 1), new THREE.MeshBasicMaterial()));

    installLaunchVehicleModel(slot, model);

    const bounds = new THREE.Box3().setFromObject(model);
    expect(fallback.visible).toBe(false);
    expect(model.name).toBe('ARES_ROCKET_ASSET');
    expect(bounds.getSize(new THREE.Vector3()).y).toBeCloseTo(12, 5);
    expect(bounds.min.y).toBeCloseTo(0, 5);
  });
});
