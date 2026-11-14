import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { STATIONS } from '../../contracts';
import { frameOutpost } from './camera';
import { createStation } from './models';
import { createModelKit, WorldResources } from './resources';

describe('world spatial and ownership contracts', () => {
  it('keeps solid station models within their existing collider envelopes', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    for (const { id } of STATIONS) {
      const { group } = createStation(id, kit, resources);
      const bounds = new THREE.Box3().setFromObject(group);
      expect(bounds.min.x, id).toBeGreaterThanOrEqual(-1.5001);
      expect(bounds.max.x, id).toBeLessThanOrEqual(1.5001);
      expect(bounds.min.z, id).toBeGreaterThanOrEqual(-1.5001);
      expect(bounds.max.z, id).toBeLessThanOrEqual(1.5001);
      expect(bounds.min.y, id).toBeGreaterThanOrEqual(-1.0001);
      expect(bounds.max.y, id).toBeLessThanOrEqual(1.0001);
    }
    resources.dispose();
  });

  it('keeps all station corners and an astronaut at map edges in the camera view', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 220);
    for (const aspect of [360 / 336, 1280 / 378, 1920 / 210, .5]) {
      for (const x of [-18, 0, 18]) for (const z of [-18, 0, 18]) {
        const player = { x, y: .8, z };
        frameOutpost(camera, aspect, player);
        const points = [new THREE.Vector3(x, .8, z)];
        for (const station of STATIONS) {
          for (const dx of [-1.5, 1.5]) for (const dz of [-1.5, 1.5]) {
            points.push(new THREE.Vector3(station.position.x + dx, 0, station.position.z + dz));
            points.push(new THREE.Vector3(station.position.x + dx, 2, station.position.z + dz));
          }
        }
        for (const point of points) {
          point.project(camera);
          expect(Math.abs(point.x)).toBeLessThan(1);
          expect(Math.abs(point.y)).toBeLessThan(1);
          expect(Math.abs(point.z)).toBeLessThan(1);
        }
      }
    }
  });

  it('releases shared and unattached assets exactly once, even after repeated cleanup', () => {
    const resources = new WorldResources();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial();
    const texture = new THREE.Texture();
    let disposedGeometry = 0;
    let disposedMaterial = 0;
    let disposedTexture = 0;
    geometry.addEventListener('dispose', () => disposedGeometry++);
    material.addEventListener('dispose', () => disposedMaterial++);
    texture.addEventListener('dispose', () => disposedTexture++);
    resources.geometry(geometry);
    resources.geometry(geometry);
    resources.material(material);
    resources.texture(texture);
    resources.dispose();
    resources.dispose();
    expect([disposedGeometry, disposedMaterial, disposedTexture]).toEqual([1, 1, 1]);
  });
});
