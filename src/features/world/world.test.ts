import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BUILDING_HALF_SIZE, STATIONS } from '../../contracts';
import type { GameState } from '../../contracts';
import { frameOutpost } from './camera';
import { createStation } from './models';
import { createModelKit, WorldResources } from './resources';
import { applyStationStatus, getStationStatus, getWorldEventNotice } from './status';
import { pickStationAt } from './picking';

function snapshot(power = 70, shielding = 0): GameState {
  return { phase: 'running', turn: 1, resources: { power, oxygen: 70, supplies: 70 }, shielding, science: 0, log: [] };
}

describe('world spatial and ownership contracts', () => {
  it('keeps hollow station models within their documented building envelopes', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    for (const { id } of STATIONS) {
      const { group } = createStation(id, kit, resources);
      const bounds = new THREE.Box3().setFromObject(group);
      expect(bounds.min.x, id).toBeGreaterThanOrEqual(-3.3001);
      expect(bounds.max.x, id).toBeLessThanOrEqual(3.3001);
      expect(bounds.min.z, id).toBeGreaterThanOrEqual(-3.3001);
      expect(bounds.max.z, id).toBeLessThanOrEqual(3.3001);
      expect(bounds.min.y, id).toBeGreaterThanOrEqual(-1.1001);
      expect(bounds.max.y, id).toBeLessThanOrEqual(2.3001);
    }
    resources.dispose();
  });

  it('keeps all station corners and an astronaut at map edges in the camera view', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 220);
    for (const insets of [{ top: 0, bottom: 0 }, { top: .32, bottom: .14 }]) for (const aspect of [360 / 336, 1280 / 378, 1920 / 210, .5]) {
      for (const x of [-18, 0, 18]) for (const z of [-18, 0, 18]) {
        const player = { x, y: .8, z };
        frameOutpost(camera, aspect, player, insets);
        const points = [new THREE.Vector3(x, .8, z)];
        for (const station of STATIONS) {
          for (const dx of [-BUILDING_HALF_SIZE, BUILDING_HALF_SIZE]) for (const dz of [-BUILDING_HALF_SIZE, BUILDING_HALF_SIZE]) {
            points.push(new THREE.Vector3(station.position.x + dx, 0, station.position.z + dz));
            points.push(new THREE.Vector3(station.position.x + dx, 3.2, station.position.z + dz));
          }
        }
        for (const point of points) {
          point.project(camera);
          expect(Math.abs(point.x)).toBeLessThan(1);
          expect(Math.abs(point.y)).toBeLessThan(1);
          expect(Math.abs(point.z)).toBeLessThan(1);
          expect(point.y).toBeLessThan(1 - 2 * insets.top);
          expect(point.y).toBeGreaterThan(-1 + 2 * insets.bottom);
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

  it('picks nested station meshes after shared station transforms, and ignores empty space', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    const scene = new THREE.Scene();
    const groups = STATIONS.map(station => {
      const visual = createStation(station.id, kit, resources);
      visual.group.position.copy(station.position);
      scene.add(visual.group);
      return visual.group;
    });
    scene.updateMatrixWorld(true);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 220);
    frameOutpost(camera, 2, { x: 0, y: .8, z: 5 });
    const raycaster = new THREE.Raycaster();
    for (const station of STATIONS) {
      const point = new THREE.Vector3().copy(station.position).project(camera);
      expect(pickStationAt(new THREE.Vector2(point.x, point.y), camera, groups, raycaster)).toBe(station.id);
    }
    expect(pickStationAt(new THREE.Vector2(.99, .99), camera, groups, raycaster)).toBeUndefined();
    resources.dispose();
  });

  it('maps only the relevant reserve to each station and never alters the snapshot', () => {
    const state = snapshot(20, 75);
    state.resources.oxygen = 40;
    state.resources.supplies = 41;
    const before = JSON.stringify(state);
    expect(getStationStatus('solar', state)).toMatchObject({ reserve: 20, level: 'critical' });
    expect(getStationStatus('habitat', state)).toMatchObject({ reserve: 40, level: 'low' });
    expect(getStationStatus('greenhouse', state)).toMatchObject({ reserve: 41, level: 'normal' });
    expect(getStationStatus('greenhouse', { ...state, resources: { ...state.resources, supplies: 40 } }).level).toBe('low');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps shutter geometry in its collider and GPU parameters finite for extreme state values', () => {
    const resources = new WorldResources();
    const kit = createModelKit(resources);
    const visual = createStation('habitat', kit, resources);
    for (const value of [0, 20, 70, 100, -100, 200, Number.NaN, Number.POSITIVE_INFINITY]) {
      const state = snapshot(value, value);
      applyStationStatus(visual, getStationStatus('habitat', state), value, value);
      const bounds = new THREE.Box3().setFromObject(visual.group);
      expect(bounds.max.y).toBeLessThanOrEqual(2.3001);
      expect(bounds.min.y).toBeGreaterThanOrEqual(-1.1001);
      expect(Number.isFinite(visual.windows.emissiveIntensity)).toBe(true);
      expect(visual.windows.emissiveIntensity).toBeGreaterThanOrEqual(0);
      expect(visual.windows.emissiveIntensity).toBeLessThanOrEqual(.4);
      expect(visual.shelterPanels[0].scale.y).toBeGreaterThanOrEqual(.01);
      expect(visual.shelterPanels[0].scale.y).toBeLessThanOrEqual(.58);
    }
    resources.dispose();
  });

  it('displays supplied event outcomes without inventing one for a shift or after restart', () => {
    expect(getWorldEventNotice({ ...snapshot(), turn: 3 })).toBe('');
    expect(getWorldEventNotice({ ...snapshot(), lastHazardNotice: '  Recorded outcome  ' })).toBe('Recorded outcome');
    expect(getWorldEventNotice({ ...snapshot(), phase: 'ready', lastHazardNotice: 'Old event' })).toBe('');
    expect(getWorldEventNotice({ ...snapshot(), lastHazardNotice: '   ' })).toBe('');
  });

  it('restores alert beacons and bounds their light output without changing game state', () => {
    const resources = new WorldResources();
    const visual = createStation('solar', createModelKit(resources), resources);
    const state = snapshot(45, 15);
    const before = JSON.stringify(state);
    const status = getStationStatus('solar', state);
    applyStationStatus(visual, status, state.resources.power, state.shielding, false);
    const normal = visual.beacon.color.getHex();
    applyStationStatus(visual, status, state.resources.power, state.shielding, true);
    expect(visual.beacon.color.getHex()).not.toBe(normal);
    expect(visual.beacon.emissiveIntensity).toBeGreaterThanOrEqual(.1);
    expect(visual.beacon.emissiveIntensity).toBeLessThanOrEqual(.6);
    applyStationStatus(visual, status, state.resources.power, state.shielding, false);
    expect(visual.beacon.color.getHex()).toBe(normal);
    expect(JSON.stringify(state)).toBe(before);
    resources.dispose();
  });
});
