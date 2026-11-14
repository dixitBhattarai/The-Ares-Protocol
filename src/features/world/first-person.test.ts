import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  EYE_HEIGHT, MAX_PITCH, applyLook, clampPitch, eyePosition, lookDirection, wrapYaw,
} from './first-person';

describe('first-person camera maths', () => {
  it('looks along -Z at yaw 0 and -X at a quarter turn, matching camera-relative walking', () => {
    const forward = lookDirection(0, 0);
    expect(forward.x).toBeCloseTo(0); expect(forward.z).toBeCloseTo(-1);
    const left = lookDirection(Math.PI / 2, 0);
    expect(left.x).toBeCloseTo(-1); expect(left.z).toBeCloseTo(0);
  });

  it('agrees with a real Three.js camera using YXZ rotation', () => {
    for (const [yaw, pitch] of [[0, 0], [.7, .3], [-2.1, -.5], [3, .9]]) {
      const camera = new THREE.PerspectiveCamera();
      camera.rotation.order = 'YXZ';
      camera.rotation.set(pitch, yaw, 0);
      camera.updateMatrixWorld();
      const actual = camera.getWorldDirection(new THREE.Vector3());
      const expected = lookDirection(yaw, pitch);
      expect(actual.x).toBeCloseTo(expected.x); expect(actual.y).toBeCloseTo(expected.y); expect(actual.z).toBeCloseTo(expected.z);
    }
  });

  it('turns right for pointer right and looks down for pointer down', () => {
    const next = applyLook({ yaw: 0, pitch: 0 }, 120, 80);
    expect(next.yaw).toBeLessThan(0);
    expect(next.pitch).toBeLessThan(0);
  });

  it('clamps pitch and ignores invalid input', () => {
    expect(clampPitch(10)).toBe(MAX_PITCH);
    expect(clampPitch(-10)).toBe(-MAX_PITCH);
    expect(clampPitch(Number.NaN)).toBe(0);
    const unchanged = applyLook({ yaw: .4, pitch: .2 }, Number.NaN, Infinity);
    expect(unchanged.yaw).toBeCloseTo(.4); expect(unchanged.pitch).toBeCloseTo(.2);
  });

  it('keeps yaw within one turn however far the player spins', () => {
    for (const yaw of [0, 4, -4, 100, -100]) {
      const wrapped = wrapYaw(yaw);
      expect(wrapped).toBeGreaterThanOrEqual(-Math.PI); expect(wrapped).toBeLessThanOrEqual(Math.PI);
      expect(Math.cos(wrapped)).toBeCloseTo(Math.cos(yaw)); expect(Math.sin(wrapped)).toBeCloseTo(Math.sin(yaw));
    }
    expect(wrapYaw(Number.NaN)).toBe(0);
  });

  it('places the eye above the pose and inside the 1.6m player capsule', () => {
    const eye = eyePosition({ x: 3, y: .8, z: -2 });
    expect(eye.x).toBe(3); expect(eye.z).toBe(-2);
    expect(eye.y).toBeCloseTo(.8 + EYE_HEIGHT);
    expect(EYE_HEIGHT).toBeLessThan(.8);
  });
});
