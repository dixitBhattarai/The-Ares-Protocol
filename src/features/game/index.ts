import type { GameAction, GameState, MissionData } from '../../contracts';

export function createInitialState(mission: MissionData): GameState {
  return { phase: 'ready', turn: 0, resources: { ...mission.initialResources }, shielding: 0, science: 0, log: [] };
}

export function getCurrentEvent(mission: MissionData, state: Readonly<GameState>) {
  return mission.events[state.turn % mission.events.length];
}

// Pure turn-based reducer. Only this module changes simulation resources.
export function reduceGame(state: Readonly<GameState>, action: GameAction, mission: MissionData): GameState {
  if (action.type === 'RESTART') return createInitialState(mission);
  if (action.type === 'START' && state.phase === 'ready') return { ...state, phase: 'running' };
  if (action.type === 'PAUSE' && state.phase === 'running') return { ...state, phase: 'paused' };
  if (action.type === 'RESUME' && state.phase === 'paused') return { ...state, phase: 'running' };
  if (action.type !== 'CHOOSE' || state.phase !== 'running') return state;
  const choice = getCurrentEvent(mission, state)?.choices.find(item => item.id === action.choiceId);
  if (!choice) return state;
  const resources = { ...state.resources };
  for (const key of ['power', 'oxygen', 'supplies'] as const) {
    resources[key] = Math.max(0, Math.min(100, resources[key] + (choice.effect.resources?.[key] ?? 0)));
  }
  const turn = state.turn + 1;
  const science = state.science + (choice.effect.science ?? 0);
  const depleted = Object.values(resources).some(value => value <= 0);
  const phase = depleted ? 'lost' : turn >= mission.maxTurns ? (science >= mission.scienceTarget ? 'won' : 'lost') : 'running';
  return {
    ...state, phase, turn, resources, science,
    shielding: Math.max(0, Math.min(100, state.shielding + (choice.effect.shielding ?? 0))),
    log: [...state.log, choice.explanation],
  };
}
