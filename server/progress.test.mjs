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

it('preserves radiation consequences and job cooldowns across save normalization', () => {
  const input = validSave();
  input.state.taskRun.radiationExposure = 50;
  input.state.taskRun.cooldowns = { air: 105, survey: 90 };
  const loaded = normalizeProgressSnapshot(JSON.parse(JSON.stringify(input)));
  expect(loaded.state.taskRun.radiationExposure).toBe(50);
  expect(loaded.state.taskRun.cooldowns).toEqual({ air: 105, survey: 90 });
  expect(loaded.state.taskRun.cooldowns.air - loaded.state.taskRun.elapsed).toBe(60);
});
it('rejects invalid exposure and unknown or invalid cooldowns while accepting older saves', () => {
  expect(normalizeProgressSnapshot(validSave())).not.toBeNull();
  for (const extra of [{ radiationExposure: -1 }, { radiationExposure: 101 }, { cooldowns: { air: Infinity } }, { cooldowns: { unknown: 100 } }]) {
    const input = validSave(); Object.assign(input.state.taskRun, extra);
    expect(normalizeProgressSnapshot(input)).toBeNull();
  }
});

it('preserves rover parking, battery, sample cargo and storm preparations',()=>{
 const input=validSave();input.state.rover={pose:{x:29,y:.8,z:33},heading:1,battery:42,driving:true};
 input.state.fieldSample={stage:'collected',runId:'1:2:sample',elapsed:6,researchStep:0,remote:true};
 input.state.taskRun.stormPrep={shutters:true,secured:false,dusty:true};
 const saved=normalizeProgressSnapshot(input);expect(saved.state.rover).toEqual({...input.state.rover,driving:false});expect(saved.state.fieldSample).toEqual(input.state.fieldSample);expect(saved.state.taskRun.stormPrep).toEqual(input.state.taskRun.stormPrep);
});
