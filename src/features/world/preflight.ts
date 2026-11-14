export type PreparationLevel = 'earth' | 'space';
export const PREPARATION = {
  earth: { title: 'Earth · Launch preparation', description: 'Walk to the back-wall console. Inspect your suit and cargo before authorizing departure.', steps: ['Check suit pressure seal', 'Verify cargo manifest', 'Authorize launch'] },
  space: { title: 'Orbit · Communications cabin', description: 'Earth is outside the observation port. Walk to the console and establish a navigation link before the Mars transfer.', steps: ['Align navigation beacon', 'Match antenna frequency', 'Transmit flight plan'] },
} as const;
export function advancePreparation(level: PreparationLevel, progress: number, control: string): number {
  return progress >= 0 && progress < PREPARATION[level].steps.length && PREPARATION[level].steps[progress] === control ? progress + 1 : progress;
}
