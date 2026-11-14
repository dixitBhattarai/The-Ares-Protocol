import { expect, it } from 'vitest';
import { advancePreparation, PREPARATION } from './preflight';
it('requires all Earth and orbital controls in order and rejects repeated completion', () => {
  for (const level of ['earth', 'space'] as const) {
    expect(advancePreparation(level, 0, PREPARATION[level].steps[2])).toBe(0);
    let progress = 0;
    for (const control of PREPARATION[level].steps) progress = advancePreparation(level, progress, control);
    expect(progress).toBe(3);
    expect(advancePreparation(level, progress, PREPARATION[level].steps[2])).toBe(3);
  }
});
