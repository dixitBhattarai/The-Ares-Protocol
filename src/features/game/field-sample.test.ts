import { describe,it,expect } from 'vitest';
import {createInitialState,reduceGame,taskCompletionId} from './index';
import type {GameState,MissionData} from '../../contracts';
import {SAMPLE_SITE,SAMPLE_LAB} from '../../contracts/exploration';
const mission:MissionData={id:'sample',title:'Sample',gameplayMode:'station-tasks',maxTurns:6,scienceTarget:3,initialResources:{power:70,oxygen:70,supplies:70},events:[],sources:[],dataMode:'authored-demo'};
const start=()=>reduceGame(createInitialState(mission),{type:'START'},mission);
const dig=(state:GameState)=>reduceGame(state,{type:'START_DIG',pose:SAMPLE_SITE,suited:true,grounded:true},mission);
function ticks(state:GameState,pose=SAMPLE_SITE,n=61){for(let i=0;i<n;i++)state=reduceGame(state,{type:'FIELD_TICK',runId:state.fieldSample!.runId,seconds:.1,pose,suited:true,grounded:true},mission);return state;}
describe('field sample chain of custody',()=>{
 it('requires a suit, grounded pose and the actual exterior site',()=>{const s=start();expect(reduceGame(s,{type:'START_DIG',pose:SAMPLE_SITE,suited:false,grounded:true},mission)).toBe(s);expect(reduceGame(s,{type:'START_DIG',pose:SAMPLE_LAB,suited:true,grounded:true},mission)).toBe(s);expect(reduceGame(s,{type:'START_DIG',pose:SAMPLE_SITE,suited:true,grounded:false},mission)).toBe(s);expect(dig(s).fieldSample?.stage).toBe('digging');});
 it('pays once only after digging, returning to the lab and recording ordered observations',()=>{let s=dig(start());s=ticks(s);expect(s.fieldSample?.stage).toBe('collected');expect(s.science).toBe(0);expect(reduceGame(s,{type:'COMPLETE_TASK',completionId:taskCompletionId(s,'survey')},mission)).toBe(s);expect(reduceGame(s,{type:'START_SAMPLE_RESEARCH',pose:SAMPLE_SITE,grounded:true},mission)).toBe(s);s=reduceGame(s,{type:'START_SAMPLE_RESEARCH',pose:SAMPLE_LAB,grounded:true},mission);s=ticks(s,SAMPLE_LAB);for(const control of ['image','fine-grains','record'])s=reduceGame(s,{type:'SAMPLE_RESEARCH_STEP',runId:s.fieldSample!.runId,pose:SAMPLE_LAB,control},mission);expect(s.turn).toBe(1);expect(s.science).toBe(2);expect(s.fieldSample?.stage).toBe('researched');expect(dig(s)).toBe(s);expect(reduceGame(s,{type:'SAMPLE_RESEARCH_STEP',runId:s.fieldSample!.runId,pose:SAMPLE_LAB,control:'record'},mission)).toBe(s);});
 it('freezes during pause and rejects stale callbacks, skipping checks, invalid ticks and wrong-location work',()=>{let s=dig(start());const id=s.fieldSample!.runId;s=reduceGame(s,{type:'PAUSE'},mission);expect(ticks(s)).toEqual(s);s=reduceGame(s,{type:'RESUME'},mission);expect(reduceGame(s,{type:'FIELD_TICK',runId:id,seconds:10,pose:SAMPLE_SITE,suited:true,grounded:true},mission)).toBe(s);expect(ticks(s,SAMPLE_LAB)).toEqual(s);s=ticks(s);s=reduceGame(s,{type:'START_SAMPLE_RESEARCH',pose:SAMPLE_LAB,grounded:true},mission);expect(reduceGame(s,{type:'SAMPLE_RESEARCH_STEP',runId:id,pose:SAMPLE_LAB,control:'record'},mission)).toBe(s);s=reduceGame(s,{type:'RESTART'},mission);s=reduceGame(s,{type:'START'},mission);s=dig(s);expect(s.fieldSample!.runId).not.toBe(id);expect(reduceGame(s,{type:'FIELD_TICK',runId:id,seconds:.1,pose:SAMPLE_SITE,suited:true,grounded:true},mission)).toBe(s);});
});

it('a late sample cancellation cannot cancel an unrelated maintenance job',()=>{
 let s=ticks(dig(start()));s=reduceGame(s,{type:'CANCEL_SAMPLE'},mission);s=reduceGame(s,{type:'START_TASK',taskId:'plants'},mission);
 expect(s.taskRun?.activeTaskId).toBe('plants');s=reduceGame(s,{type:'CANCEL_SAMPLE'},mission);expect(s.taskRun?.activeTaskId).toBe('plants');expect(s.fieldSample?.stage).toBe('collected');
});
