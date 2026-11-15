import type {GameAction,GameState,Vec3} from '../../contracts';
import {SURVEY_SITES,SURVEY_CAPACITY,freshSurvey,type SurveySiteId} from '../../contracts/survey';
import {freshRover} from '../../contracts/expedition';

export function queuedSample(state:Readonly<GameState>,id:SurveySiteId) {
  return {stage:'collected' as const,runId:`${state.taskRun!.session}:${state.turn}:sample:${id}`,elapsed:0,researchStep:0,remote:true,surveySite:id};
}
export function reduceSurvey(state:Readonly<GameState>,action:GameAction):GameState|undefined {
  if(!['SURVEY_START','SURVEY_TICK','SURVEY_CANCEL','SURVEY_COLLECT'].includes(action.type))return;
  if(!state.taskRun||!['running','paused'].includes(state.phase))return state;
  const survey=state.survey??freshSurvey();
  if(action.type==='SURVEY_CANCEL')return survey.scanning?{...state,survey:{...survey,scanning:undefined}}:state;
  if(state.phase!=='running'||state.rover?.driving)return state;
  if(action.type==='SURVEY_START'||action.type==='SURVEY_COLLECT'){
    const site=SURVEY_SITES.find(s=>s.id===action.id),rover=state.rover??freshRover();
    if(!site||!action.suited||!action.grounded||!near(action.pose,site,1.8)||Math.hypot(rover.pose.x-site.x,rover.pose.z-site.z)>8||state.taskRun.activeTaskId&&!(state.taskRun.activeTaskId==='survey'&&state.fieldSample?.stage==='collected'))return state;
    if(action.type==='SURVEY_START'){
      if(survey.scanning||survey.scanned.includes(site.id)||state.fieldSample?.stage==='digging'||state.fieldSample?.stage==='researching')return state;
      return {...state,survey:{...survey,scanning:{id:site.id,elapsed:0}}};
    }
    if(survey.scanning||!survey.scanned.includes(site.id)||survey.cargo.length>=SURVEY_CAPACITY||[...survey.cargo,...survey.analyzed].includes(site.id)||state.fieldSample&&!state.fieldSample.surveySite&&state.fieldSample.stage!=='researched')return state;
    const cargo=[...survey.cargo,site.id],fieldSample=survey.cargo.length?state.fieldSample:queuedSample(state,site.id);
    return {...state,survey:{...survey,cargo},fieldSample,log:[...state.log,`${site.sample} sealed. Cargo ${cargo.length}/${SURVEY_CAPACITY}. Return to the solar lab.`]};
  }
  if(action.type==='SURVEY_TICK'){
    const scan=survey.scanning,site=SURVEY_SITES.find(s=>s.id===scan?.id);
    if(!scan||!site||!Number.isFinite(action.seconds)||action.seconds<=0||action.seconds>.1)return state;
    if(!action.suited||!action.grounded||!near(action.pose,site,1.8))return {...state,survey:{...survey,scanning:undefined}};
    const elapsed=Math.min(3,scan.elapsed+action.seconds);
    return {...state,survey:{...survey,scanning:elapsed>=3?undefined:{...scan,elapsed},scanned:elapsed>=3?[...survey.scanned,site.id]:survey.scanned}};
  }
  return state;
}
function near(a:Vec3,b:Vec3,r:number){return [a.x,a.y,a.z].every(Number.isFinite)&&a.y>=0&&a.y<1.3&&Math.hypot(a.x-b.x,a.z-b.z)<=r;}
