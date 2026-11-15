import {it,expect} from 'vitest';
import {createInitialState,reduceGame,taskCompletionId} from './index';
import {loadMission} from '../missions';
it('free exploration ignores reserve/hazard ticks and stays playable after more than six jobs',()=>{
 const mission={...loadMission(),gameplayMode:'station-tasks' as const,freeExploration:true};
 let state=reduceGame(createInitialState(mission),{type:'START'},mission),before=state;
 for(let i=0;i<300;i++)state=reduceGame(state,{type:'TICK',seconds:1},mission);
 expect(state).toBe(before);
 for(let i=0;i<8;i++){state=reduceGame(state,{type:'START_TASK',taskId:'air'},mission);state=reduceGame(state,{type:'COMPLETE_TASK',completionId:taskCompletionId(state,'air')},mission);}
 expect(state.turn).toBe(8);expect(state.phase).toBe('running');
});
