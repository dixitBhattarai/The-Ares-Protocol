export type PreparationLevel = 'earth' | 'space';
export const PREPARATION = {
  earth: { title: 'Earth · Launch preparation', description: 'Complete the departure checks. These are simplified game prompts, not a real launch procedure.', steps: ['Check fuel and oxidizer gauges', 'Verify cabin pressure and suit air', 'Secure food, water and science cargo', 'Confirm batteries, guidance and launch window'] },
  space: { title: 'Ares · Rocket flight cabin', description: 'After orbital insertion, drift through three crew tasks in the Ares cabin. Complete navigation, trajectory and communications before returning to the flight seat.', steps: ['Align the navigation beacon', 'Verify the Mars trajectory', 'Transmit and confirm the flight plan'] },
} as const;
export function advancePreparation(level: PreparationLevel, progress: number, control: string): number {
  return progress >= 0 && progress < PREPARATION[level].steps.length && PREPARATION[level].steps[progress] === control ? progress + 1 : progress;
}
