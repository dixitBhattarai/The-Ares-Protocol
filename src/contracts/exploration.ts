import type { Vec3 } from './index';
/** Physics telemetry drives character poses; it never comes from animation time. */
export interface PlayerMotion { grounded: boolean; verticalSpeed: number; body: 'earth'|'mars'|'orbit' }
export type AvatarAction = 'none'|'dig'|'research';
export interface AvatarActivity { action: AvatarAction; progress: number }
export const SAMPLE_SITE: Readonly<Vec3> = Object.freeze({x:3.2,y:.8,z:16.2});
export const SAMPLE_LAB: Readonly<Vec3> = Object.freeze({x:8.8,y:.8,z:-1.2});

export interface FieldSample {
  stage: 'digging' | 'collected' | 'researching' | 'researched';
  runId: string;
  elapsed: number;
  researchStep: number;
}
