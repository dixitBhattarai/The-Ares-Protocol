import type { Vec3 } from './index';
/** Physics telemetry drives character poses; it never comes from animation time. */
export interface PlayerMotion { grounded: boolean; verticalSpeed: number; body: 'earth'|'mars'|'orbit' }
export type AvatarAction = 'none'|'dig'|'research';
export interface AvatarActivity { action: AvatarAction; progress: number }
export const SAMPLE_SITE: Readonly<Vec3> = Object.freeze({x:3.2,y:.8,z:16.2});
export const SAMPLE_LAB: Readonly<Vec3> = Object.freeze({x:8.8,y:.8,z:-1.2});

/** Mars' walkable square runs this many metres either side of the base. Terrain is dead flat and the physics floor level inside it. */
export const MARS_WALKABLE_HALF_SIZE = 60;
export interface MarsObstacle { x: number; z: number; halfX: number; halfZ: number; height: number }
/** Landmarks inside the Mars arena: world draws them at these spots and physics makes them solid. */
export const MARS_LANDMARKS = Object.freeze({
  rover: { x: 21, z: 7, halfX: 1.5, halfZ: 1.5, height: 2 },
  lander: { x: 36, z: -26, halfX: 2.8, halfZ: 2.8, height: 1.2 },
  weatherStation: { x: -25, z: 22, halfX: .8, halfZ: .8, height: 3.3 },
  seismicPod: { x: 14, z: 24, halfX: .5, halfZ: .5, height: .6 },
} satisfies Record<string, MarsObstacle>);
export const MARS_OBSTACLES: readonly MarsObstacle[] = Object.values(MARS_LANDMARKS);

export interface FieldSample {
  stage: 'digging' | 'collected' | 'researching' | 'researched';
  runId: string;
  elapsed: number;
  researchStep: number;
}
