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

  it('generates authentic mission-specific steps for shifts and decisions', () => {
    const shift1Event: MissionEvent = { id: 'shift-1-oxygen-vs-science', title: 'O2', description: '', sourceIds: [], choices: [] };
    const moxie = getActivity(shift1Event, { id: 'oxygen', label: 'MOXIE', explanation: '', effect: {} });
    expect(moxie.station).toBe('habitat');
    expect(moxie.steps).toContain('Intake Martian CO2');

    const shift3Event: MissionEvent = { id: 'shift-3-solar-weather-alert', title: 'Storm', description: '', sourceIds: [], choices: [] };
    const bunker = getActivity(shift3Event, { id: 'shield', label: 'Bunker', explanation: '', effect: {} });
    expect(bunker.station).toBe('habitat');
    expect(bunker.steps).toContain('Lock bunker blast shields');

    const shift5Event: MissionEvent = { id: 'shift-5-comms-vs-autonomous', title: 'DSN', description: '', sourceIds: [], choices: [] };
    const dsn = getActivity(shift5Event, { id: 'comms', label: 'Earth Comms', explanation: '', effect: {} });
    expect(dsn.station).toBe('solar');
    expect(dsn.steps).toContain('Transmit over Deep Space Network');
  });

  it('requires controls in order and cannot reward a completed procedure twice', () => {
    const activity = getActivity(event, { id: 'oxygen', label: '', explanation: '', effect: {} });
    expect(advanceActivity(activity, 0, activity.steps[2])).toBe(0);
    let progress = 0;
    activity.steps.forEach(step => { progress = advanceActivity(activity, progress, step); });
    expect(progress).toBe(3);
    expect(advanceActivity(activity, progress, activity.steps[2])).toBe(3);
  });

  it('guards against invalid, negative or out-of-range progress inputs', () => {
    const activity = getActivity(event, { id: 'shield', label: 'Shield', explanation: '', effect: {} });
    expect(advanceActivity(activity, -1, activity.steps[0])).toBe(-1);
    expect(advanceActivity(activity, 999, activity.steps[0])).toBe(999);
    expect(advanceActivity(activity, 1.5 as unknown as number, activity.steps[0])).toBe(1.5);
  });
});
