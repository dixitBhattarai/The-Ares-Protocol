import { describe, expect, it } from 'vitest';
import type { GameState, MissionData } from '../../contracts';
import { createInitialState, reduceGame, STATION_TASKS, taskCompletionId } from './index';

const mission:MissionData={id:'work-test',title:'Outpost work',gameplayMode:'station-tasks',maxTurns:6,scienceTarget:4,initialResources:{power:70,oxygen:70,supplies:70},events:[],sources:[],dataMode:'authored-demo'};
const start=()=>reduceGame(createInitialState(mission),{type:'START'},mission);
function work(state:GameState,id:string){
  state=reduceGame(state,{type:'START_TASK',taskId:id},mission);
  return reduceGame(state,{type:'COMPLETE_TASK',completionId:taskCompletionId(state,id)},mission);
}
function tick(state:GameState,seconds:number){for(let i=0;i<seconds;i++)state=reduceGame(state,{type:'TICK',seconds:1},mission);return state;}

describe('station work instead of decision cards',()=>{
  it.each(STATION_TASKS)('$id grants positive benefits and progresses one job only on completion',task=>{
    const before=start(),pending=reduceGame(before,{type:'START_TASK',taskId:task.id},mission);
    expect(pending.resources).toEqual(before.resources);expect(pending.turn).toBe(0);
    const complete=reduceGame(pending,{type:'COMPLETE_TASK',completionId:taskCompletionId(pending,task.id)},mission);
    expect(complete.turn).toBe(1);expect(complete.science).toBeGreaterThan(before.science);
    for(const key of ['power','oxygen','supplies'] as const)expect(complete.resources[key]).toBeGreaterThanOrEqual(before.resources[key]);
    expect(complete.history).toHaveLength(1);expect(complete.taskRun?.activeTaskId).toBeUndefined();
  });
  it('rejects old cards, unknown jobs, wrong tokens and completion without starting',()=>{
    const state=start();expect(reduceGame(state,{type:'CHOOSE',choiceId:'oxygen'},mission)).toBe(state);
    expect(reduceGame(state,{type:'START_TASK',taskId:'invented'},mission)).toBe(state);
    expect(reduceGame(state,{type:'COMPLETE_TASK',completionId:'0:0:air'},mission)).toBe(state);
    const pending=reduceGame(state,{type:'START_TASK',taskId:'air'},mission);
    expect(reduceGame(pending,{type:'START_TASK',taskId:'plants'},mission)).toBe(pending);
    expect(reduceGame(pending,{type:'COMPLETE_TASK',completionId:'0:0:plants'},mission)).toBe(pending);
  });
  it('rejects duplicate and stale rewards, including a token from the previous replay',()=>{
    const state=start(),token=taskCompletionId(state,'air'),completed=work(state,'air');
    expect(reduceGame(completed,{type:'COMPLETE_TASK',completionId:token},mission)).toBe(completed);
    let next=reduceGame(completed,{type:'START_TASK',taskId:'air'},mission);
    expect(reduceGame(next,{type:'COMPLETE_TASK',completionId:token},mission)).toBe(next);
    next=reduceGame(next,{type:'RESTART'},mission);next=reduceGame(next,{type:'START'},mission);next=reduceGame(next,{type:'START_TASK',taskId:'air'},mission);
    expect(reduceGame(next,{type:'COMPLETE_TASK',completionId:token},mission)).toBe(next);
  });
  it('cancelling never pays and allows starting another job',()=>{
    let state=reduceGame(start(),{type:'START_TASK',taskId:'air'},mission);
    state=reduceGame(state,{type:'CANCEL_TASK'},mission);expect(state.turn).toBe(0);expect(state.resources.oxygen).toBe(70);
    state=reduceGame(state,{type:'START_TASK',taskId:'plants'},mission);expect(state.taskRun?.activeTaskId).toBe('plants');
    state=reduceGame(state,{type:'PAUSE'},mission);state=reduceGame(state,{type:'CANCEL_TASK'},mission);
    state=reduceGame(state,{type:'RESUME'},mission);state=reduceGame(state,{type:'START_TASK',taskId:'power'},mission);expect(state.taskRun?.activeTaskId).toBe('power');
  });
  it('drains reserves automatically and applies a hazard while no job is selected',()=>{
    const state=tick(start(),30);expect(state.turn).toBe(0);
    expect(state.resources).toEqual({power:66,oxygen:52,supplies:67});expect(state.lastHazardNotice).toContain('Air leak hit');
  });
  it('air work prevents the matching damage but routine consumption continues',()=>{
    const state=tick(work(start(),'air'),30);expect(state.resources.oxygen).toBe(86);expect(state.lastHazardNotice).toContain('Air leak prevented');
  });
  it('panel work prevents dust damage while unrelated hazards still strike',()=>{
    const state=tick(work(start(),'power'),60);expect(state.lastHazardNotice).toContain('Dust fault prevented');expect(state.resources.power).toBe(80);expect(state.resources.oxygen).toBe(44);
  });
  it('shelter prevents storm losses and unprepared shelter receives them',()=>{
    const protectedState=tick(work(start(),'shelter'),90),unprotected=tick(start(),90);
    expect(protectedState.lastHazardNotice).toContain('Solar storm prevented');expect(unprotected.lastHazardNotice).toContain('Solar storm hit');
    expect(protectedState.resources.power-unprotected.resources.power).toBe(20);expect(protectedState.resources.oxygen-unprotected.resources.oxygen).toBe(12);
  });
  it('plant care blocks crop stress when protection is still active',()=>{
    let state=tick(start(),70);state=work(state,'plants');state=tick(state,50);
    expect(state.lastHazardNotice).toContain('Crop stress prevented');
  });
  it('maintenance protection expires rather than lasting forever',()=>{
    const state=tick(work(start(),'air'),150);expect(state.lastHazardNotice).toContain('Air leak hit');
  });
  it('pause ignores time/work and restart clears time, protection, progress and outcomes',()=>{
    let state=tick(work(start(),'air'),10);state=reduceGame(state,{type:'PAUSE'},mission);
    expect(tick(state,120)).toBe(state);expect(reduceGame(state,{type:'START_TASK',taskId:'air'},mission)).toBe(state);
    state=reduceGame(state,{type:'RESTART'},mission);expect(state.phase).toBe('ready');expect(state.turn).toBe(0);expect(state.taskRun).toMatchObject({elapsed:0,protections:{},completedIds:[]});expect(state.log).toEqual([]);expect(state.lastHazardNotice).toBeUndefined();
  });
  it('rejects non-finite/oversized ticks and caps rewards, with science still increasing',()=>{
    let state=start();for(const seconds of [NaN,Infinity,-1,0,5])expect(reduceGame(state,{type:'TICK',seconds},mission)).toBe(state);
    state={...state,resources:{power:100,oxygen:100,supplies:100}};state=work(state,'air');expect(state.resources.oxygen).toBe(100);expect(state.science).toBe(1);
  });
  it('six jobs win and an unattended outpost loses; terminal time and work are ignored',()=>{
    let state=start();for(const id of ['air','shelter','power','plants','survey','air'])state=work(state,id);
    expect(state.phase).toBe('won');expect(state.debrief?.verdict).toBe('won');expect(tick(state,90)).toBe(state);
    state=tick(start(),500);expect(state.phase).toBe('lost');expect(state.debrief?.verdict).toBe('depleted');expect(work(state,'air')).toBe(state);
  });
});
