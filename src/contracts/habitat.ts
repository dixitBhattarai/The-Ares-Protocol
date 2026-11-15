import type { Vec3 } from './index';
/** Proposed pressurized habitat, metres. Game geometry, not an engineered pressure vessel. */
export const HABITAT = { radius: 14, centerZ: -2, innerZ: 10.8, outerZ: 14.8, halfWidth: .95 } as const;
export type AirlockPhase = 'inside' | 'venting' | 'outside' | 'filling';
export interface HabitatAccess { suited: boolean; phase: AirlockPhase; remaining: number }
export const freshHabitatAccess = (): HabitatAccess => ({ suited: false, phase: 'inside', remaining: 0 });
export function inAirlock(pose: Vec3): boolean {
 return Math.abs(pose.x) < HABITAT.halfWidth-.3 && pose.z > HABITAT.innerZ+.35 && pose.z < HABITAT.outerZ-.35;
}
export function atSuitRack(pose: Vec3): boolean {
 return Math.hypot(pose.x-1.5,pose.z-9) < 2;
}
