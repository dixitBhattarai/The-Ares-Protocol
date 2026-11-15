import { describe, expect, it } from 'vitest';
import { scheduledHazard, taskHazardNotice } from './station-game';
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
  it('leaves quiet periods and varies hazard type/timing by seed and replay',()=>{
    const events=Array.from({length:40},(_,slot)=>scheduledHazard(slot));
    expect(events.some(event=>!event)).toBe(true);
    expect(new Set(events.filter(Boolean).map(event=>event!.index)).size).toBe(4);
    expect(scheduledHazard(1,1,0)).toEqual(scheduledHazard(1,1,0));
    expect(Array.from({length:8},(_,i)=>scheduledHazard(i,1,0))).not.toEqual(Array.from({length:8},(_,i)=>scheduledHazard(i,2,1)));
    expect(start().upcomingHazardNotice).toBeUndefined();
    const event=events.find(Boolean)!;
    expect(taskHazardNotice(event.at-9)).toBeUndefined();
    expect(taskHazardNotice(event.at-8)).toContain('8s');
    expect(taskHazardNotice(event.at)).toBeUndefined();
  });
  it.each([['air',0],['power',1],['shelter',2],['plants',3]] as const)('%s prevents its random hazard while routine consumption continues',(id,index)=>{
    const event=Array.from({length:100},(_,slot)=>scheduledHazard(slot)).find(event=>event?.index===index)!;
    const before={...start(),taskRun:{...start().taskRun!,elapsed:event.at-9}};
    const protectedState=tick(work(before,id),10),unprotected=tick(before,10);
    expect(protectedState.lastHazardNotice).toContain('prevented');
    expect(unprotected.lastHazardNotice).toContain('hit');
    expect(protectedState.turn).toBe(1);expect(unprotected.turn).toBe(0);
    expect(Object.values(protectedState.resources).some((value,i)=>value>Object.values(unprotected.resources)[i])).toBe(true);
    expect(protectedState.taskRun!.elapsed).toBe(event.at+1);
  });
  it('expires maintenance protection before a later random hazard',()=>{
    const event=Array.from({length:100},(_,slot)=>scheduledHazard(slot)).find(event=>event?.index===0&&event.at>65)!;
    const completed=work(start(),'air');
    const before={...completed,taskRun:{...completed.taskRun!,elapsed:event.at-1}};
    expect(tick(before,1).lastHazardNotice).toContain('Air leak hit');
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
    let state=start();for(const id of ['air','shelter','power','plants','survey'])state=work(state,id);state=work(tick(state,60),'air');
    expect(state.phase).toBe('won');expect(state.debrief?.verdict).toBe('won');expect(tick(state,90)).toBe(state);
    state=tick(start(),500);expect(state.phase).toBe('lost');expect(state.debrief?.verdict).toBe('depleted');expect(work(state,'air')).toBe(state);
  });
});

it('models repeated unprotected storms as a game condition with extra food use and shelter recovery',()=>{
 const event=Array.from({length:100},(_,slot)=>scheduledHazard(slot)).find(e=>e?.index===2)!;
 let state=start();state={...state,taskRun:{...state.taskRun!,radiationExposure:0,elapsed:event.at-1}};
 state=tick(state,1);expect(state.taskRun!.radiationExposure).toBe(50);
 const protectedState={...state,shielding:18};const recovered=tick(protectedState,30);
 expect(recovered.taskRun!.radiationExposure).toBe(35);
 const paused=reduceGame(state,{type:'PAUSE'},mission);expect(tick(paused,30)).toBe(paused);
 const restarted=reduceGame(state,{type:'RESTART'},mission);expect(restarted.taskRun!.radiationExposure??0).toBe(0);
});

it.each([0,50])('explains actual routine supplies use at exposure %s', exposure => {
 const state=start();const before={...state,taskRun:{...state.taskRun!,elapsed:19,radiationExposure:exposure}};
 const after=tick(before,1),used=before.resources.supplies-after.resources.supplies;
 expect(used).toBe(exposure>=40?5:3);
 expect(after.log.at(-1)).toContain(`${used} supplies`);
 if(exposure>=40)expect(after.log.at(-1)).toContain('crew recovery');
});
