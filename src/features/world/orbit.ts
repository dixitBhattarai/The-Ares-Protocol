import type { Vec3 } from '../../contracts';

/**
 * Pure third-person orbit maths. No Three.js objects live here so the conventions can be unit tested.
 *
 * OrbitControls clamps its polar angle to [0, PI], so it can never pass over a pole. A full vertical
 * orbit needs the camera's up vector to roll with it, which is what orbitUp() provides.
 *
 * Conventions (same azimuth as OrbitControls and the physics camera heading):
 *   yaw   0 puts the camera on +Z of the target, looking toward -Z.
 *   pitch 0 is level, +PI/2 is straight overhead, PI is level again on the far side (upside down).
 */
export const PLAYER_CENTER_HEIGHT = 0.8; // capsule centre above the feet (physics GROUND_Y)
export const FLOOR_ABOVE_FEET = 0.3; // lowest the camera may sit above the ground
/** false stops the orbit at the top; true lets it carry on over and down the far side. */
export const ORBIT_OVER_THE_TOP = true;

export interface PitchRange { min: number; max: number }

/** Unit vector from the target to the camera. */
export function orbitOffset(yaw: number, pitch: number): Vec3 {
  const flat = Math.cos(pitch);
  return { x: Math.sin(yaw) * flat, y: Math.sin(pitch), z: Math.cos(yaw) * flat };
}

/** Camera up vector. Always perpendicular to orbitOffset, and continuous through both poles. */
export function orbitUp(yaw: number, pitch: number): Vec3 {
  const rise = Math.sin(pitch);
  return { x: -Math.sin(yaw) * rise, y: Math.cos(pitch), z: -Math.cos(yaw) * rise };
}

/**
 * Pitch limits that keep a camera `distance` from the target above the floor.
 * `targetAboveFloor` is how far the look-at point sits above the lowest allowed camera height.
 */
export function pitchRange(targetAboveFloor: number, distance: number, overTheTop = ORBIT_OVER_THE_TOP): PitchRange {
  const ratio = distance > 0 && Number.isFinite(distance) && Number.isFinite(targetAboveFloor)
    ? Math.max(-1, Math.min(1, -targetAboveFloor / distance)) : 0;
  const min = Math.asin(ratio);
  return { min, max: overTheTop ? Math.PI - min : Math.PI / 2 };
}

export function clampOrbitPitch(pitch: number, range: PitchRange): number {
  const value = Number.isFinite(pitch) ? pitch : 0;
  return Math.max(range.min, Math.min(range.max, value));
}

/** Once the view is upside down, horizontal drag must reverse so the scene still follows the pointer. */
export function yawDirection(pitch: number): 1 | -1 {
  return Math.cos(pitch) < 0 ? -1 : 1;
}

/** First-person yaw for "looking away from the camera", whichever side of the pole the camera is on. */
export function facingYaw(yaw: number, pitch: number): number {
  return Math.cos(pitch) < 0 ? yaw + Math.PI : yaw;
}
