import type { Vec3 } from '../../contracts';

/**
 * Pure first-person camera maths. No Three.js objects live here so the
 * conventions can be unit tested.
 *
 * Heading convention (matches the follow camera and physics rotateMovement):
 * yaw 0 looks along -Z, yaw +PI/2 looks along -X, so a positive yaw turns left.
 * Pitch is positive when looking up.
 */
export const EYE_HEIGHT = 0.62; // above the capsule centre (centre y .8, so the eye sits near 1.4m)
export const MAX_PITCH = 1.35; // about 77 degrees, stops the view flipping over
export const LOOK_SPEED = 0.0022; // radians per pixel of pointer movement
export const FIRST_PERSON_FOV = 75;

export interface Look { yaw: number; pitch: number }

export function clampPitch(pitch: number): number {
  return Number.isFinite(pitch) ? Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch)) : 0;
}

export function wrapYaw(yaw: number): number {
  if (!Number.isFinite(yaw)) return 0;
  const turn = Math.PI * 2;
  return ((yaw + Math.PI) % turn + turn) % turn - Math.PI;
}

/** Pointer right turns right (yaw falls), pointer down looks down (pitch falls). */
export function applyLook(look: Look, dx: number, dy: number, speed = LOOK_SPEED): Look {
  const sx = Number.isFinite(dx) ? dx : 0;
  const sy = Number.isFinite(dy) ? dy : 0;
  return { yaw: wrapYaw(look.yaw - sx * speed), pitch: clampPitch(look.pitch - sy * speed) };
}

export function eyePosition(pose: Vec3): Vec3 {
  return { x: pose.x, y: pose.y + EYE_HEIGHT, z: pose.z };
}

export function lookDirection(yaw: number, pitch: number): Vec3 {
  const flat = Math.cos(pitch);
  return { x: -Math.sin(yaw) * flat, y: Math.sin(pitch), z: -Math.cos(yaw) * flat };
}
