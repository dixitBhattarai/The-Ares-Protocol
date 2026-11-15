import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createEarthCampus, installLaunchVehicleModel } from './earth';
import { createModelKit, WorldResources } from './resources';

describe('Earth launch vehicle asset slot', () => {
  it('keeps the procedural fallback available until a local model is installed', () => {
    const slot = new THREE.Group();
    const fallback = new THREE.Group();
    fallback.name = 'ARES_ROCKET_PROCEDURAL_FALLBACK';
    slot.add(fallback);
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

describe('Realistic Earth Campus Environment', () => {
  it('constructs a rich Earth scene with mountains, water, forests, and clouds', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    const earth = createEarthCampus(kit, resources);

    expect(earth.scene.name).toBe('earth-outdoors');
    expect(earth.stations).toHaveLength(1);
    expect(earth.labDoor).toBeDefined();
    expect(earth.stations[0].id).toBe('habitat');
    expect(earth.scene.getObjectByName('solar')).toBeUndefined();
    expect(earth.scene.getObjectByName('greenhouse')).toBeUndefined();
    expect(earth.scene.getObjectByName('vehicle-assembly-hangar')).toBeDefined();
    expect(earth.launchVehicle).toBeDefined();

    // Check water, forest, and cloud subsystems
    expect(earth.scene.getObjectByName('earth-water-system')).toBeDefined();
    expect(earth.scene.getObjectByName('earth-forest')).toBeDefined();
    expect(earth.scene.getObjectByName('earth-clouds')).toBeDefined();
    expect(earth.scene.getObjectByName('ares-launch-pad')).toBeDefined();

    // Check launch progression
    earth.setLaunchProgress(0.5);
    expect(earth.launchVehicle.position.y).toBeGreaterThan(0);
    earth.resetLaunch();
    expect(earth.launchVehicle.position.y).toBe(0);

    // Check cloud animation
    const clouds = earth.scene.getObjectByName('earth-clouds')!;
    const initialCloudX = clouds.children[0].position.x;
    earth.update(1.0);
    expect(clouds.children[0].position.x).not.toBe(initialCloudX);

    resources.dispose();
  });
});

it('leaves an actual hole in the apron beneath the lab floor',()=>{
 const resources=new WorldResources(),earth=createEarthCampus(createModelKit(resources),resources);
 earth.scene.updateMatrixWorld(true);
 const apron=earth.scene.getObjectByName('apron-with-lab-opening')!;
 const ray=new THREE.Raycaster(new THREE.Vector3(-7,2,0),new THREE.Vector3(0,-1,0));
 expect(ray.intersectObject(apron)).toHaveLength(0);
 ray.set(new THREE.Vector3(-11,2,0),new THREE.Vector3(0,-1,0));expect(ray.intersectObject(apron)).toHaveLength(1);
 earth.dispose();resources.dispose();
});
