import { describe, expect, it } from 'vitest';
import { loadMission } from '../missions';
import { createInitialState, reduceGame } from './index';

const mission = loadMission();
describe('mission state transitions', () => {
  it('does not spend resources before starting or while paused', () => {
    const ready = createInitialState(mission);
    expect(reduceGame(ready, { type: 'CHOOSE', choiceId: 'research' }, mission)).toBe(ready);
    const paused = reduceGame({ ...ready, phase: 'running' }, { type: 'PAUSE' }, mission);
    expect(reduceGame(paused, { type: 'CHOOSE', choiceId: 'research' }, mission)).toBe(paused);
  });
  it('applies costs and records an explanation without mutating the input', () => {
    const initial = { ...createInitialState(mission), phase: 'running' as const };
    const result = reduceGame(initial, { type: 'CHOOSE', choiceId: 'research' }, mission);
    expect(result.resources).toEqual({ power: 62, oxygen: 62, supplies: 65 });
    expect(result.science).toBe(1);
    expect(result.log).toHaveLength(1);
    expect(initial.resources.power).toBe(70);
  });
  it('loses on depletion, including on the final turn', () => {
    const state = { ...createInitialState(mission), phase: 'running' as const, turn: 5, science: 9, resources: { power: 1, oxygen: 70, supplies: 70 } };
    const result = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission);
    expect(result.phase).toBe('lost');
    expect(result.resources.power).toBe(0);
  });
  it('can finish a winning run and ignores later decisions', () => {
    let state = reduceGame(createInitialState(mission), { type: 'START' }, mission);
    for (let i = 0; i < mission.maxTurns; i++) state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission);
    expect(state.phase).toBe('won');
    expect(reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission)).toBe(state);
  });
  it('bounds reserves and restarts with fresh resources', () => {
    const initial = { ...createInitialState(mission), phase: 'running' as const, resources: { power: 70, oxygen: 99, supplies: 70 } };
    const result = reduceGame(initial, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);
    expect(result.resources.oxygen).toBe(100);
    expect(reduceGame(result, { type: 'RESTART' }, mission)).toEqual(createInitialState(mission));
  });
  it('ignores an invalid choice id', () => {
    const state = { ...createInitialState(mission), phase: 'running' as const };
    expect(reduceGame(state, { type: 'CHOOSE', choiceId: 'unknown' }, mission)).toBe(state);
  });
});
