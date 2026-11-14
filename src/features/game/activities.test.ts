import { describe, expect, it } from 'vitest';
import { advanceActivity, getActivity } from './activities';
import type { MissionEvent } from '../../contracts';
const event: MissionEvent = { id: 'shift-4-greenhouse', title: 'Plants', description: '', sourceIds: [], choices: [] };
describe('station procedures', () => {
  it('maps shelter, air, food and communication work to the relevant station', () => {
    expect(getActivity(event, { id: 'shield', label: '', explanation: '', effect: {} }).station).toBe('greenhouse');
    expect(getActivity(event, { id: 'oxygen', label: '', explanation: '', effect: {} }).station).toBe('habitat');
    expect(getActivity(event, { id: 'research', label: '', explanation: '', effect: {} }).station).toBe('greenhouse');
    expect(getActivity({ ...event, id: 'comms' }, { id: 'comms', label: '', explanation: '', effect: {} }).station).toBe('solar');
  });
  it('requires controls in order and cannot reward a completed procedure twice', () => {
    const activity = getActivity(event, { id: 'oxygen', label: '', explanation: '', effect: {} });
    expect(advanceActivity(activity, 0, activity.steps[2])).toBe(0);
    let progress = 0;
    activity.steps.forEach(step => { progress = advanceActivity(activity, progress, step); });
    expect(progress).toBe(3);
    expect(advanceActivity(activity, progress, activity.steps[2])).toBe(3);
  });
});
