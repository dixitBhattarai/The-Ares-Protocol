import { MINI_TARGETS } from './minigame';
export const PLANT_X = [70, 180, 290] as const;
export const ROOT_Y = 208;
/** Root-only watering; the clamp prevents hidden-tab time from completing a job. */
export function waterRoots(stage: number, moisture: number, x: number, y: number, seconds: number, pouring: boolean): number {
  const target = MINI_TARGETS[stage];
  if (!pouring || target === undefined || ![moisture, x, y, seconds].every(Number.isFinite)) return moisture;
  if (Math.hypot((x - PLANT_X[target]) / 1.25, y - ROOT_Y) > 27) return moisture;
  return Math.min(1, Math.max(0, moisture) + Math.max(0, Math.min(.1, seconds)) / 2);
}
