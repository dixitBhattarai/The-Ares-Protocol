import type { GameAction, GameState, MissionData, Resources, StationId, StationTask } from '../../contracts';

/** Authored game rewards, not NASA measurements or real engineering procedures. */
export const STATION_TASKS: readonly StationTask[] = [
  {id:'air',station:'habitat',title:'Service the air system',steps:['Inspect air panels','Patch the leak','Check the air loop'],reward:{resources:{oxygen:20},science:1},benefit:'+20 air · +1 science',prevention:'Prevents air-leak damage for 60 active seconds.'},
  {id:'shelter',station:'habitat',title:'Reinforce the storm shelter',steps:['Inspect the shield panels','Secure the barrier','Test shelter seals'],reward:{shielding:18,science:1},benefit:'+18 shelter · +1 science',prevention:'Shelter score 15 prevents solar-storm damage.'},
  {id:'power',station:'solar',title:'Clean and connect solar panels',steps:['Check the power cells','Match the connections','Test the battery feed'],reward:{resources:{power:22},science:1},benefit:'+22 power · +1 science',prevention:'Prevents dust-fault damage for 60 active seconds.'},
  {id:'plants',station:'greenhouse',title:'Care for the greenhouse',steps:['Inspect the leaves','Check the roots','Water the plants'],reward:{resources:{supplies:20,oxygen:5},science:1},benefit:'+20 supplies · +5 air · +1 science',prevention:'Prevents crop-stress damage for 60 active seconds.'},
  {id:'survey',station:'solar',title:'Record surface science',steps:['Connect the sensor','Match the signal','Save the observations'],reward:{science:2},benefit:'+2 science',prevention:'Builds mission progress. For dust protection, service the solar panels.'},
];

const KEYS = ['power','oxygen','supplies'] as const;
const HAZARDS: readonly {title:string;station?:StationId;loss:Partial<Resources>;advice:string}[] = [
  {title:'Air leak',station:'habitat',loss:{oxygen:-14},advice:'Service the air system'},
  {title:'Dust fault',station:'solar',loss:{power:-16},advice:'Clean and connect solar panels'},
  {title:'Solar storm',loss:{power:-20,oxygen:-12,supplies:-6},advice:'Reinforce the storm shelter to score 15'},
  {title:'Crop stress',station:'greenhouse',loss:{supplies:-14},advice:'Care for the greenhouse'},
];

export function taskHazardNotice(elapsed:number):string {
  const index=Math.floor(elapsed/30),hazard=HAZARDS[index%HAZARDS.length];
  return `${hazard.title} in ${Math.max(1,Math.ceil((index+1)*30-elapsed))}s. ${hazard.advice} to prevent damage. Game forecast, not live space weather.`;
}

export function taskCompletionId(state:Readonly<GameState>,taskId:string):string {
  return `${state.taskRun?.session??0}:${state.turn}:${taskId}`;
}

function apply(resources:Resources,effect:Partial<Resources> = {}):Resources {
  return Object.fromEntries(KEYS.map(key=>[key,Math.max(0,Math.min(100,resources[key]+(effect[key]??0)))])) as unknown as Resources;
}

function finish(state:GameState,mission:MissionData):GameState {
  const empty=KEYS.find(key=>state.resources[key]<=0);
  const ended=!!empty || state.turn>=mission.maxTurns;
  if(!ended)return state;
  const won=!empty && state.science>=mission.scienceTarget;
  const phase=won?'won':'lost';
  return {...state,phase,upcomingHazardNotice:undefined,taskRun:{...state.taskRun!,activeTaskId:undefined},debrief:{
    verdict:won?'won':empty?'depleted':'low_science',
    title:won?'Outpost Mission Accomplished!':'Let’s try a new maintenance plan',
    summary:won?`You finished ${state.turn} jobs and gathered ${state.science} science points while keeping the outpost running.`:empty?`${empty} reached zero. Work restores reserves; time and unprevented hazards use them up.`:`You finished the jobs, but need ${mission.scienceTarget} science points.`,
    primaryCause:empty?`${empty} ran out after ${Math.floor(state.taskRun!.elapsed)} active seconds.`:undefined,
    recommendations:['Watch the next hazard warning and service its matching system.','Keep all reserves above zero; pause whenever you need thinking time.'],
    lessons:['Completed work pays once. Everyday system use continues while you explore.','Air, solar and plant maintenance prevent matching hazards for 60 seconds. Shelter protects against solar storms.'],
    stars:won?(state.shielding>=15?3:2):0,
    score:Math.round(state.resources.power+state.resources.oxygen+state.resources.supplies+state.science*25),
  }};
}

/** Simulation time is supplied by App's only loop, never wall-clock callbacks. */
export function reduceStationGame(state:Readonly<GameState>,action:GameAction,mission:MissionData,initial:()=>GameState):GameState {
  if(action.type==='RESTART'){
    const fresh=initial();return {...fresh,taskRun:{...fresh.taskRun!,session:(state.taskRun?.session??0)+1}};
  }
  if(action.type==='START'&&state.phase==='ready')return {...state,phase:'running'};
  if(action.type==='PAUSE'&&state.phase==='running')return {...state,phase:'paused'};
  if(action.type==='RESUME'&&state.phase==='paused')return {...state,phase:'running'};
  const run=state.taskRun;
  if(action.type==='CANCEL_TASK'&&run?.activeTaskId&&(state.phase==='running'||state.phase==='paused'))return {...state,taskRun:{...run,activeTaskId:undefined}};
  if(state.phase!=='running'||!run)return state;
  if(action.type==='CHOOSE')return state; // Old card actions cannot bypass station work.
  if(action.type==='START_TASK') {
    if(run.activeTaskId||!STATION_TASKS.some(task=>task.id===action.taskId))return state;
    return {...state,taskRun:{...run,activeTaskId:action.taskId}};
  }
  if(action.type==='COMPLETE_TASK') {
    const task=STATION_TASKS.find(task=>task.id===run.activeTaskId);
    if(!task||action.completionId!==taskCompletionId(state,task.id)||run.completedIds.includes(action.completionId))return state;
    const resources=apply(state.resources,task.reward.resources);
    const science=state.science+(task.reward.science??0),shielding=Math.min(100,state.shielding+(task.reward.shielding??0));
    const explanation=`${task.title} completed: ${task.benefit}. ${task.prevention}`;
    const protections={...run.protections};
    if(['air','power','plants'].includes(task.id))protections[task.station]=run.elapsed+60;
    return finish({...state,turn:state.turn+1,resources,science,shielding,
      taskRun:{...run,activeTaskId:undefined,protections,completedIds:[...run.completedIds,action.completionId]},
      log:[...state.log,explanation],history:[...(state.history??[]),{turn:state.turn,shift:state.turn+1,eventId:'station-work',eventTitle:'Station work',choiceId:task.id,choiceLabel:task.title,explanation,resources:{...resources},science,shielding}],
    },mission);
  }
  if(action.type!=='TICK'||!Number.isFinite(action.seconds)||action.seconds<=0||action.seconds>1)return state;
  const elapsed=run.elapsed+action.seconds;
  let resources={...state.resources},notice=state.lastHazardNotice;
  const notes:string[]=[];
  if(Math.floor(elapsed/20)>Math.floor(run.elapsed/20)){
    resources=apply(resources,{power:-4,oxygen:-4,supplies:-3});
    notes.push('Outpost systems used 4 power, 4 air and 3 supplies during the last 20 active seconds.');
  }
  if(Math.floor(elapsed/30)>Math.floor(run.elapsed/30)){
    const hazard=HAZARDS[(Math.floor(elapsed/30)-1)%HAZARDS.length];
    const protectedNow=hazard.station?(run.protections[hazard.station]??-1)>=elapsed:state.shielding>=15;
    if(!protectedNow)resources=apply(resources,hazard.loss);
    notice=protectedNow?`${hazard.title} prevented by your maintenance. No hazard damage.`:`${hazard.title} hit: ${Object.entries(hazard.loss).map(([key,value])=>`${key} ${value}`).join(', ')}. ${hazard.advice} before the next warning ends.`;
    notes.push(notice);
  }
  return finish({...state,resources,taskRun:{...run,elapsed},lastHazardNotice:notice,upcomingHazardNotice:taskHazardNotice(elapsed),log:[...state.log,...notes]},mission);
}
