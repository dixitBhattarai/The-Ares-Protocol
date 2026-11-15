import { describe, expect, it } from 'vitest';
import { normalizeProgressSnapshot } from './progress.mjs';

const validSave = () => ({
  version: 1,
  missionSeed: 42,
  state: {
    phase: 'paused', turn: 2, resources: { power: 90, oxygen: 80, supplies: 70 }, shielding: 5, science: 2,
    log: ['Solar station job completed.'],
    taskRun: { session: 1, elapsed: 45, completedIds: ['solar-job-1'], activeTaskId: 'air-repair', protections: { solar: 60 } },
  },
  activity: { taskId: 'air-repair', progress: 1 },
  ignored: 'This field is not persisted',
});

describe('progress snapshot allowlist', () => {
  it('keeps only the bounded game snapshot fields', () => {
    const saved = normalizeProgressSnapshot(validSave());
    expect(saved).not.toBeNull();
    expect(saved).not.toHaveProperty('ignored');
    expect(saved?.state).not.toHaveProperty('ignored');
    expect(saved?.activity).toEqual({ taskId: 'air-repair', progress: 1 });
  });

  it('rejects malformed or out-of-range progress', () => {
    const tooMuch = validSave();
    tooMuch.state.resources.power = 101;
    expect(normalizeProgressSnapshot(tooMuch)).toBeNull();

    const noSeed = validSave();
    noSeed.missionSeed = -1;
    expect(normalizeProgressSnapshot(noSeed)).toBeNull();

    const extraLargeLog = validSave();
    extraLargeLog.state.log = ['x'.repeat(501)];
    expect(normalizeProgressSnapshot(extraLargeLog)).toBeNull();

    const noTaskRun = validSave();
    delete noTaskRun.state.taskRun;
    expect(normalizeProgressSnapshot(noTaskRun)).toBeNull();
  });
});
