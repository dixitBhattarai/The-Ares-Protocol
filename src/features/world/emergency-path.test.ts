import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { doorApproach } from './doors';
import { createEmergencyPath } from './emergency-path';
import { createModelKit, WorldResources } from './resources';

describe('emergency path trailer', () => {
  it('creates holographic trailer group and remains hidden by default', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    const trailer = createEmergencyPath(kit, resources);

    expect(trailer.group.name).toBe('emergency-path-trailer');
    expect(trailer.group.visible).toBe(false);
    expect(trailer.isActive()).toBe(false);
    expect(trailer.getTarget()).toBeNull();
    expect(trailer.getDistance()).toBe(0);

    trailer.dispose();
    resources.dispose();
  });

  it('lays out route to a station doorApproach and computes distance', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    const trailer = createEmergencyPath(kit, resources);

    const from = { x: 0, y: 0.8, z: 0 };
    trailer.setRoute(from, 'habitat', { emergency: true });

    const habitatApproach = doorApproach('habitat');
    expect(trailer.isActive()).toBe(true);
    expect(trailer.getTarget()).toEqual(habitatApproach);

    const expectedDist = Math.hypot(habitatApproach.x - from.x, habitatApproach.z - from.z);
    expect(trailer.getDistance()).toBeCloseTo(expectedDist, 2);

    // Trailer group and destination beacon must be visible
    expect(trailer.group.visible).toBe(true);
    const beacon = trailer.group.getObjectByName('emergency-destination-beacon');
    expect(beacon).toBeDefined();
    expect(beacon?.visible).toBe(true);
    expect(beacon?.position.x).toBeCloseTo(habitatApproach.x, 2);
    expect(beacon?.position.z).toBeCloseTo(habitatApproach.z, 2);

    // Markers must be visible along the path
    const container = trailer.group.getObjectByName('path-markers-container');
    expect(container).toBeDefined();
    const visibleMarkers = container!.children.filter(c => c.visible);
    expect(visibleMarkers.length).toBeGreaterThan(0);

    trailer.dispose();
    resources.dispose();
  });

  it('hides when destination is set to null', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    const trailer = createEmergencyPath(kit, resources);

    trailer.setRoute({ x: 0, y: 0.8, z: 0 }, 'solar', { emergency: true });
    expect(trailer.isActive()).toBe(true);

    trailer.setRoute({ x: 0, y: 0.8, z: 0 }, null);
    expect(trailer.isActive()).toBe(false);
    expect(trailer.group.visible).toBe(false);
    expect(trailer.getTarget()).toBeNull();

    trailer.dispose();
    resources.dispose();
  });

  it('switches between emergency amber and cyan holographic palette', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    const trailer = createEmergencyPath(kit, resources);

    trailer.setRoute({ x: 0, y: 0.8, z: 0 }, 'greenhouse', { emergency: true });
    const beacon = trailer.group.getObjectByName('emergency-destination-beacon')!;
    const outerRing = beacon.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    expect(outerRing.material.color.getHexString().toLowerCase()).toBe('ffaa00');

    // Switch to non-emergency nav route
    trailer.setRoute({ x: 0, y: 0.8, z: 0 }, 'greenhouse', { emergency: false });
    expect(outerRing.material.color.getHexString().toLowerCase()).toBe('00e5ff');

    trailer.dispose();
    resources.dispose();
  });

  it('updates animation without exceptions for active and reduced motion', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    const trailer = createEmergencyPath(kit, resources);

    trailer.setRoute({ x: 0, y: 0.8, z: 0 }, 'habitat');
    expect(() => {
      trailer.update(0.016, true, false);
      trailer.update(0.016, true, true); // reduced motion
      trailer.update(0.016, false, false); // paused
    }).not.toThrow();

    trailer.dispose();
    resources.dispose();
  });

  it('points chevron arrow tips forward towards the destination in all directions', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    const trailer = createEmergencyPath(kit, resources);

    const testTargets = [
      { name: '+Z', target: { x: 0, y: 0.8, z: 10 }, check: (tip: THREE.Vector3, center: THREE.Vector3) => tip.z > center.z },
      { name: '-Z', target: { x: 0, y: 0.8, z: -10 }, check: (tip: THREE.Vector3, center: THREE.Vector3) => tip.z < center.z },
      { name: '+X', target: { x: 10, y: 0.8, z: 0 }, check: (tip: THREE.Vector3, center: THREE.Vector3) => tip.x > center.x },
      { name: '-X', target: { x: -10, y: 0.8, z: 0 }, check: (tip: THREE.Vector3, center: THREE.Vector3) => tip.x < center.x },
    ];

    for (const { name, target, check } of testTargets) {
      trailer.setRoute({ x: 0, y: 0.8, z: 0 }, target);
      const container = trailer.group.getObjectByName('path-markers-container')!;
      const firstMarker = container.children[0] as THREE.Group;
      expect(firstMarker.visible, `${name} marker visible`).toBe(true);

      const chevronMesh = firstMarker.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
      expect(chevronMesh, `${name} chevron mesh`).toBeDefined();

      trailer.group.updateMatrixWorld(true);
      const geom = chevronMesh.geometry;
      const tipLocal = new THREE.Vector3(
        geom.attributes.position.getX(0),
        geom.attributes.position.getY(0),
        geom.attributes.position.getZ(0),
      );
      const tipWorld = tipLocal.clone().applyMatrix4(chevronMesh.matrixWorld);

      expect(check(tipWorld, firstMarker.position), `${name} chevron tip points toward destination`).toBe(true);
    }

    trailer.dispose();
    resources.dispose();
  });
});
