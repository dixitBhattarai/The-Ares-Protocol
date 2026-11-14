export type PreparationLevel = 'earth' | 'space';
export const PREPARATION = {
  earth: { title: 'Earth · Launch preparation', description: 'Complete the departure checks. These are simplified game prompts, not a real launch procedure.', steps: ['Check fuel and oxidizer gauges', 'Verify cabin pressure and suit air', 'Secure food, water and science cargo', 'Confirm batteries, guidance and launch window'] },
  space: { title: 'Orbit · Communications cabin', description: 'Earth is outside the observation port. Confirm the navigation link and Mars flight plan before the compressed autopilot transfer.', steps: ['Align navigation beacon', 'Verify the Mars trajectory', 'Transmit the flight plan'] },
} as const;
export function advancePreparation(level: PreparationLevel, progress: number, control: string): number {
  return progress >= 0 && progress < PREPARATION[level].steps.length && PREPARATION[level].steps[progress] === control ? progress + 1 : progress;
}
