import type { GameAction, GameState, Vec3 } from '../../contracts';
import { SAMPLE_LAB, SAMPLE_SITE } from '../../contracts/exploration';

import { REMOTE_SAMPLE } from '../../contracts/expedition';
import type { FieldSample } from '../../contracts/exploration';
export const DIG_SECONDS = 6;
export const RESEARCH_SECONDS = 6;
export const RESEARCH_CHECKS = ['image', 'fine-grains', 'record'] as const;
export function nearSampleLocation(pose: Vec3, target: Vec3): boolean {
  return [pose.x, pose.y, pose.z].every(Number.isFinite)
    && Math.hypot(pose.x-target.x, pose.z-target.z) <= 1.8 && pose.y < 1.2;
}
export function fieldBusy(state: Readonly<GameState>): boolean {
  return state.fieldSample?.stage === 'digging' || state.fieldSample?.stage === 'researching';
}
/** Fieldwork owns no timers or random measurements. The shell supplies active simulation time. */
export function reduceFieldSample(
  state: Readonly<GameState>, action: GameAction,
  complete: (prepared: GameState) => GameState,
): GameState | undefined {
  const sample = state.fieldSample;
  if (action.type === 'CANCEL_SAMPLE' && sample && state.taskRun
      && (state.phase === 'running' || state.phase === 'paused')) {
    if (sample.stage === 'researched') return state;
    return {...state, fieldSample: sample.stage === 'digging' ? undefined : {...sample, stage:'collected', elapsed:0, researchStep:0},
      taskRun:{...state.taskRun,activeTaskId:state.taskRun.activeTaskId==='survey'?undefined:state.taskRun.activeTaskId}};
  }
  if (!['START_DIG','START_SAMPLE_RESEARCH','FIELD_TICK','SAMPLE_RESEARCH_STEP'].includes(action.type)) return undefined;
  if (state.phase !== 'running' || !state.taskRun || state.rover?.driving) return state;
  const run=state.taskRun;
  if (action.type === 'START_DIG') {
    if (run.activeTaskId || sample || !action.suited || !action.grounded || !(nearSampleLocation(action.pose,SAMPLE_SITE)||nearSampleLocation(action.pose,REMOTE_SAMPLE))) return state;
    return {...state,taskRun:{...run,activeTaskId:'survey'},fieldSample:{stage:'digging',runId:`${run.session}:${state.turn}:sample`,elapsed:0,researchStep:0,remote:nearSampleLocation(action.pose,REMOTE_SAMPLE)}};
  }
  if (!sample) return state;
  if (action.type === 'START_SAMPLE_RESEARCH') {
    if (sample.stage !== 'collected' || (run.activeTaskId && run.activeTaskId!=='survey') || !action.grounded || !nearSampleLocation(action.pose,SAMPLE_LAB)) return state;
    return {...state,taskRun:{...run,activeTaskId:'survey'},fieldSample:{...sample,stage:'researching',elapsed:0,researchStep:0}};
  }
  if (action.type === 'FIELD_TICK') {
    if (action.runId!==sample.runId || !fieldBusy(state) || !Number.isFinite(action.seconds) || action.seconds <= 0 || action.seconds > .1) return state;
    const target=sample.stage==='digging'?(sample.remote?REMOTE_SAMPLE:SAMPLE_SITE):SAMPLE_LAB;
    if (!action.grounded || !nearSampleLocation(action.pose,target) || (sample.stage==='digging'&&!action.suited)) return state;
    const elapsed=Math.min(sample.stage==='digging'?DIG_SECONDS:RESEARCH_SECONDS,sample.elapsed+action.seconds);
    return {...state,fieldSample:{...sample,elapsed,stage:sample.stage==='digging'&&elapsed>=DIG_SECONDS?'collected':sample.stage}};
  }
  if (action.type === 'SAMPLE_RESEARCH_STEP') {
    if (action.runId!==sample.runId || sample.stage!=='researching' || !nearSampleLocation(action.pose,SAMPLE_LAB)
      || action.control!==RESEARCH_CHECKS[sample.researchStep] || sample.elapsed+.00001 < (sample.researchStep+1)*2) return state;
    const researchStep=sample.researchStep+1;
    const next={...state,fieldSample:{...sample,researchStep,stage:researchStep===3?'researched' as const:'researching' as const}};
    return researchStep===3?complete(next):next;
  }
  return state;
}
