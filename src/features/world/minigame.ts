import type { StationId } from '../../contracts';
export interface MiniState { stage: number; taps: number; selected: number | null; inspected: number | null; complete: boolean; feedback: string }
export type MiniInput = { type: 'tap' | 'source' | 'socket' | 'leaf' | 'care'; index: number };
export const MINI_TARGETS = [1, 2, 0] as const;
export const CIRCUIT_SYMBOLS = ['Star', 'Circle', 'Triangle'] as const;
export function createMiniState(stage: number): MiniState { return {stage,taps:0,selected:null,inspected:null,complete:false,feedback:''}; }

/** Local puzzle progress only. The shell dispatches the existing task outcome once. */
export function advanceMiniGame(station: StationId, state: MiniState, input: MiniInput, enabled = true): MiniState {
  if (!enabled || state.complete || !Number.isInteger(state.stage) || state.stage < 0 || state.stage > 2 || !Number.isInteger(input.index) || input.index < 0 || input.index > 2) return state;
  const target = MINI_TARGETS[state.stage];
  if (station === 'habitat' && input.type === 'tap') {
    if (input.index !== target) return {...state,feedback:'Find the panel marked with escaping air.'};
    const taps = Math.min(3,state.taps+1);
    return {...state,taps,complete:taps===3,feedback:taps===3?'Panel sealed!':'Keep securing this panel. No need to rush.'};
  }
  if (station === 'solar') {
    if(input.type==='source') return {...state,selected:input.index,feedback:'Now choose the socket with the same symbol.'};
    if(input.type==='socket') {
      const correct=state.selected===state.stage && input.index===state.stage;
      return {...state,complete:correct,feedback:correct?'Circuit connected!':'Match the requested symbol on both ends. Try again.'};
    }
  }
  if (station === 'greenhouse') {
    if(input.type==='leaf') return {...state,inspected:input.index,feedback:input.index===target?'This leaf is drooping. Choose gentle root watering.':'This leaf looks healthy. Inspect the drooping one.'};
    if(input.type==='care') {
      const correct=state.inspected===target && input.index===0;
      return {...state,complete:correct,feedback:correct?'Plant checked and watered!':'Inspect the drooping leaf, then water its roots gently.'};
    }
  }
  return state;
}
