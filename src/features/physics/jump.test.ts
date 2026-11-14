import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPhysics, describeGravity, EARTH_GRAVITY, EARTH_JUMP_HEIGHT_M, MARS_GRAVITY } from './index';
import type { GravityBody } from '../../contracts';

describe('gravity info', () => {
  it('Mars is about 38% of Earth and jumps about 2.6x higher with the same take-off speed', () => {
    const earth = describeGravity('earth');
    const mars = describeGravity('mars');
    expect(earth.gravityMS2).toBeCloseTo(EARTH_GRAVITY, 5);
    expect(mars.gravityMS2).toBeCloseTo(MARS_GRAVITY, 5);
    expect(mars.relativeToEarth).toBeCloseTo(0.379, 2);
    expect(earth.jumpHeightM).toBeCloseTo(EARTH_JUMP_HEIGHT_M, 3);
    expect(mars.jumpHeightM / earth.jumpHeightM).toBeCloseTo(EARTH_GRAVITY / MARS_GRAVITY, 3);
  });

  it('orbit cabin is weightless and cannot jump', () => {
    const orbit = describeGravity('orbit');
    expect(orbit.gravityMS2).toBe(0);
    expect(orbit.canJump).toBe(false);
  });
});

async function peakHeight(body: GravityBody): Promise<number> {
  const physics = await createPhysics();
  physics.setGravityBody?.(body);
  for (let i = 0; i < 60; i++) physics.step(1 / 60); // settle on the ground
  const base = physics.getPlayerPose().y;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  let peak = base;
  for (let i = 0; i < 240; i++) {
    physics.step(1 / 60);
    peak = Math.max(peak, physics.getPlayerPose().y);
  }
  physics.dispose();
  return peak - base;
}

describe('jumping', () => {
  beforeEach(() => {
    // Rapier's profiler uses window.performance when a browser window is present.
    const target = new EventTarget();
    Object.assign(target, { performance: globalThis.performance });
    vi.stubGlobal('window', target);
    vi.stubGlobal('KeyboardEvent', class extends Event {
      code: string;
      repeat = false;
      constructor(type: string, options: { code: string }) {
        super(type);
        this.code = options.code;
      }
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('jumps higher on Mars than on Earth and does not jump in orbit', async () => {
    const earth = await peakHeight('earth');
    const mars = await peakHeight('mars');
    const orbit = await peakHeight('orbit');
    expect(earth).toBeGreaterThan(EARTH_JUMP_HEIGHT_M * 0.7);
    expect(earth).toBeLessThan(EARTH_JUMP_HEIGHT_M * 1.2);
    expect(mars).toBeGreaterThan(earth * 2);
    expect(orbit).toBeLessThan(0.05);
  });
});
