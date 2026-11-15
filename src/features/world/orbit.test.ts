import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { clampOrbitPitch, facingYaw, orbitOffset, orbitUp, pitchRange, yawDirection } from './orbit';

const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => a.x * b.x + a.y * b.y + a.z * b.z;
const pitches = [-.2, 0, .3, 1.2, Math.PI / 2, 2, Math.PI, 3.3];

describe('third-person orbit maths', () => {
  it('keeps the up vector perpendicular to the view at every pitch, including over the poles', () => {
    for (const yaw of [0, .7, -2.4]) for (const pitch of pitches) {
      const offset = orbitOffset(yaw, pitch), up = orbitUp(yaw, pitch);
      expect(Math.hypot(offset.x, offset.y, offset.z)).toBeCloseTo(1);
      expect(Math.hypot(up.x, up.y, up.z)).toBeCloseTo(1);
      expect(dot(offset, up)).toBeCloseTo(0);
    }
  });

  it('rolls smoothly through the top instead of snapping, and ends upside down on the far side', () => {
    const before = orbitUp(.4, Math.PI / 2 - .01), after = orbitUp(.4, Math.PI / 2 + .01);
    expect(Math.hypot(before.x - after.x, before.y - after.y, before.z - after.z)).toBeLessThan(.03);
    expect(orbitUp(.4, 0).y).toBeCloseTo(1);
    expect(orbitUp(.4, Math.PI).y).toBeCloseTo(-1);
  });

  it('allows an orbit over the top but never below the floor', () => {
    const range = pitchRange(.95, 8);
    expect(range.min).toBeLessThan(0);
    expect(range.max).toBeGreaterThan(Math.PI);
    for (let pitch = range.min; pitch <= range.max; pitch += .02) {
      expect(.95 + 8 * Math.sin(pitch)).toBeGreaterThanOrEqual(-1e-9);
    }
    // At the limits the camera rests exactly on the floor.
    expect(.95 + 8 * Math.sin(range.min)).toBeCloseTo(0);
    expect(.95 + 8 * Math.sin(range.max)).toBeCloseTo(0);
  });

  it('stops at the top when going over is switched off', () => {
    expect(pitchRange(.95, 8, false).max).toBeCloseTo(Math.PI / 2);
  });

  it('lets a closer camera tilt further below the horizon, and stays finite for bad input', () => {
    expect(pitchRange(.95, 4).min).toBeLessThan(pitchRange(.95, 18).min);
    expect(Number.isFinite(pitchRange(Number.NaN, 0).min)).toBe(true);
    expect(clampOrbitPitch(99, pitchRange(.95, 8))).toBeCloseTo(pitchRange(.95, 8).max);
    expect(clampOrbitPitch(-99, pitchRange(.95, 8))).toBeCloseTo(pitchRange(.95, 8).min);
    expect(Number.isFinite(clampOrbitPitch(Number.NaN, pitchRange(.95, 8)))).toBe(true);
  });

  it('reverses horizontal drag and facing once the view is upside down', () => {
    expect(yawDirection(.3)).toBe(1);
    expect(yawDirection(2.5)).toBe(-1);
    expect(facingYaw(.4, .3)).toBeCloseTo(.4);
    expect(facingYaw(.4, 2.5)).toBeCloseTo(.4 + Math.PI);
  });

  it('keeps screen-right on the same world direction at every pitch, so D and W stay screen-relative', () => {
    for (const yaw of [0, .7, -2.4]) for (const pitch of pitches) {
      const o = orbitOffset(yaw, pitch), u = orbitUp(yaw, pitch);
      const camera = new THREE.PerspectiveCamera();
      camera.up.set(u.x, u.y, u.z);
      camera.position.set(o.x * 8, o.y * 8, o.z * 8);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      expect(right.x).toBeCloseTo(Math.cos(yaw));
      expect(right.y).toBeCloseTo(0);
      expect(right.z).toBeCloseTo(-Math.sin(yaw));
    }
  });
});
