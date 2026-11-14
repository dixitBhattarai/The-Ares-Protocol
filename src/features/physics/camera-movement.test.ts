import { describe, expect, it } from 'vitest';
import { rotateMovement } from './index';

describe('camera-relative movement', () => {
  it('moves forward along the camera heading after a quarter turn', () => {
    const result = rotateMovement(0, -3, Math.PI / 2);
    expect(result.vx).toBeCloseTo(-3); expect(result.vz).toBeCloseTo(0);
  });
  it('preserves normalized speed at every heading', () => {
    for (const yaw of [0, .3, Math.PI, -Math.PI / 2, 12]) {
      const result = rotateMovement(3 / Math.sqrt(2), -3 / Math.sqrt(2), yaw);
      expect(Math.hypot(result.vx, result.vz)).toBeCloseTo(3);
    }
  });
  it('falls back to world directions for invalid headings', () => {
    expect(rotateMovement(0, -3, Number.NaN)).toEqual({ vx:0, vz:-3 });
  });
});
