import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createEvaTether } from './tether';
import { WorldResources } from './resources';

describe('EVA safety tether rope system', () => {
  it('initializes cleanly and cleans up all scene nodes on dispose', () => {
    const scene = new THREE.Scene();
    const resources = new WorldResources();
    const tether = createEvaTether(scene, resources);

    expect(tether.getGroup().name).toBe('eva-safety-tether-system');
    expect(scene.children).toContain(tether.getGroup());

    tether.dispose();
    expect(scene.children).not.toContain(tether.getGroup());
    resources.dispose();
  });

  it('keeps tether retracted and suit recovering when inside a station', () => {
    const scene = new THREE.Scene();
    const resources = new WorldResources();
    const tether = createEvaTether(scene, resources);

    const status = tether.update(0.1, { x: -8, y: 0.8, z: -4 }, false, false);
    expect(status.attached).toBe(false);
    expect(status.length).toBe(0);
    expect(status.tension).toBe(0);
    expect(status.isNearLimit).toBe(false);
    expect(status.suitSafety).toBe(100);

    tether.dispose();
    resources.dispose();
  });

  it('attaches tether when outside on Mars and computes physical extension and tension', () => {
    const scene = new THREE.Scene();
    const resources = new WorldResources();
    const tether = createEvaTether(scene, resources);

    // Step outside to Mars (about 7 meters away from habitat airlock at z=3.2)
    const status1 = tether.update(0.1, { x: -7, y: 0.8, z: 10 }, true, false);
    expect(status1.attached).toBe(true);
    expect(status1.length).toBeGreaterThan(4);
    expect(status1.tension).toBeLessThan(0.5);
    expect(status1.isNearLimit).toBe(false);

    // Move 27 meters away (approaching 30m limit: distance > 25.5m)
    const status2 = tether.update(0.1, { x: 18, y: 0.8, z: 14 }, true, false);
    expect(status2.attached).toBe(true);
    expect(status2.isNearLimit).toBe(true);
    expect(status2.warningMessage).toContain('TETHER CAUTION');

    tether.dispose();
    resources.dispose();
  });

  it('depletes suit safety during outdoor exploration and restores it in the airlock', () => {
    const scene = new THREE.Scene();
    const resources = new WorldResources();
    const tether = createEvaTether(scene, resources);

    // Spend 10 seconds outside in harsh Mars environment
    let status = tether.getStatus();
    for (let i = 0; i < 100; i++) {
      status = tether.update(0.1, { x: 0, y: 0.8, z: 0 }, true, false);
    }
    expect(status.suitSafety).toBeLessThan(100);
    expect(status.oxygenLevel).toBeLessThan(100);

    const depletedSafety = status.suitSafety;

    // Return inside the habitat airlock
    for (let i = 0; i < 50; i++) {
      status = tether.update(0.1, { x: -8, y: 0.8, z: -4 }, false, false);
    }
    expect(status.suitSafety).toBeGreaterThan(depletedSafety);
    expect(status.attached).toBe(false);

    tether.dispose();
    resources.dispose();
  });
});
