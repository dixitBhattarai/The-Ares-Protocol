import {it,expect} from 'vitest';
import {createInitialState,reduceGame} from './index';
import {SURVEY_SITES} from '../../contracts/survey';
import {freshRover} from '../../contracts/expedition';
import {SAMPLE_LAB} from '../../contracts/exploration';
import type {GameState,GameAction,MissionData} from '../../contracts';

const mission:MissionData={id:'survey',title:'Survey',gameplayMode:'station-tasks',freeExploration:true,initialResources:{power:80,oxygen:80,supplies:80},maxTurns:6,scienceTarget:3,events:[],sources:[],dataMode:'authored-demo'};
const act=(s:GameState,a:GameAction)=>reduceGame(s,a,mission);
const start=()=>act(createInitialState(mission),{type:'START'});
function scan(s:GameState,site:typeof SURVEY_SITES[number]){
 s={...s,rover:{...freshRover(),pose:{...site,x:site.x+3}}};
 s=act(s,{type:'SURVEY_START',id:site.id,pose:site,suited:true,grounded:true});
 for(let i=0;i<31;i++)s=act(s,{type:'SURVEY_TICK',seconds:.1,pose:site,suited:true,grounded:true});
 return s;
}
function collect(s:GameState,site:typeof SURVEY_SITES[number]){return act(s,{type:'SURVEY_COLLECT',id:site.id,pose:site,suited:true,grounded:true});}
function analyze(s:GameState){
 s=act(s,{type:'START_SAMPLE_RESEARCH',pose:SAMPLE_LAB,grounded:true});
 for(let i=0;i<61;i++)s=act(s,{type:'FIELD_TICK',runId:s.fieldSample!.runId,seconds:.1,pose:SAMPLE_LAB,suited:false,grounded:true});
 for(const control of ['image','fine-grains','record'])s=act(s,{type:'SAMPLE_RESEARCH_STEP',runId:s.fieldSample!.runId,pose:SAMPLE_LAB,control});
 return s;
}
it('requires a parked rover, suit and proximity, pauses scanning and cancels on leaving',()=>{
 const site=SURVEY_SITES[0];let s=start();const action={type:'SURVEY_START' as const,id:site.id,pose:site,suited:true,grounded:true};
 expect(act(s,action)).toBe(s);
 s={...s,rover:{...freshRover(),pose:site}};
 expect(act(s,{...action,suited:false})).toBe(s);expect(act(s,{...action,grounded:false})).toBe(s);
 expect(act(s,{...action,pose:SAMPLE_LAB})).toBe(s);
 s=act(s,action);expect(s.survey?.scanning?.elapsed).toBe(0);
 expect(act(s,{type:'START_TASK',taskId:'power'})).toBe(s);
 const paused=act(s,{type:'PAUSE'});expect(act(paused,{type:'SURVEY_TICK',seconds:.1,pose:site,suited:true,grounded:true})).toBe(paused);
 s=act(s,{type:'SURVEY_TICK',seconds:.1,pose:SAMPLE_LAB,suited:true,grounded:true});expect(s.survey?.scanning).toBeUndefined();expect(s.survey?.scanned).toEqual([]);
});
it('scans three places but limits cargo to two and only pays after each distinct lab examination',()=>{
 let s=start();for(const site of SURVEY_SITES)s=scan(s,site);
 expect(s.survey?.scanned).toHaveLength(3);expect(s.science).toBe(0);
 const first=SURVEY_SITES[0],second=SURVEY_SITES[1],third=SURVEY_SITES[2];
 for(const site of [first,second]){s={...s,rover:{...freshRover(),pose:site}};s=collect(s,site);}
 const full=s;s={...s,rover:{...freshRover(),pose:third}};expect(collect(s,third)).toBe(s);expect(s.survey?.cargo).toEqual(['rim','basin']);
 expect(collect(full,first)).toBe(full);expect(s.science).toBe(0);
 s=analyze(s);expect(s.turn).toBe(1);expect(s.science).toBe(2);expect(s.survey?.cargo).toEqual(['basin']);expect(s.fieldSample?.surveySite).toBe('basin');expect(s.fieldSample?.stage).toBe('collected');
 const before=s;expect(act(s,{type:'SAMPLE_RESEARCH_STEP',runId:'0:0:sample:rim',pose:SAMPLE_LAB,control:'record'})).toBe(before);
 s=analyze(s);expect(s.turn).toBe(2);expect(s.science).toBe(4);expect(s.survey?.cargo).toEqual([]);expect(s.survey?.analyzed).toEqual(['rim','basin']);
 s={...s,rover:{...freshRover(),pose:first}};expect(collect(s,first)).toBe(s);
 expect(act(s,{type:'RESTART'}).survey).toBeUndefined();
});
