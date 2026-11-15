import type { GameState, GameAction } from '../../contracts';
import { freshRover, ROVER_DOCK, STORM_CONTROLS } from '../../contracts/expedition';
export function reduceExpedition(state:Readonly<GameState>,action:GameAction):GameState|undefined {
 if(!['ROVER_ENTER','ROVER_EXIT','ROVER_TICK','ROVER_RECOVER','PREPARE_STORM'].includes(action.type))return;
 if(state.phase!=='running'||!state.taskRun)return state;
 const rover=state.rover??freshRover();
 if(action.type==='ROVER_ENTER'){
  if(state.survey?.scanning||rover.driving||rover.battery<=0||!action.suited||state.fieldSample?.stage==='digging'||state.fieldSample?.stage==='researching'||state.taskRun.activeTaskId&&!(state.taskRun.activeTaskId==='survey'&&state.fieldSample?.stage==='collected')||!near(action.pose,rover.pose,2.8))return state;
  return {...state,rover:{...rover,driving:true}};
 }
 if(action.type==='ROVER_EXIT')return rover.driving?{...state,rover:{...rover,driving:false}}:state;
 if(action.type==='ROVER_TICK'){
  if(!Number.isFinite(action.seconds)||action.seconds<=0||action.seconds>1||!Number.isFinite(action.heading)||![action.pose.x,action.pose.y,action.pose.z].every(Number.isFinite)||Math.abs(action.pose.x)>73||Math.abs(action.pose.z)>73)return state;
  const distance=rover.driving?Math.hypot(action.pose.x-rover.pose.x,action.pose.z-rover.pose.z):0;
  if(distance>9*action.seconds+1)return state;
  const pose=rover.driving?{...action.pose}:rover.pose;
  const charging=near(pose,ROVER_DOCK,3);
  const battery=Math.max(0,Math.min(100,rover.battery+(charging?4*action.seconds:rover.driving?-(distance*.18+action.seconds*.05):0)));
  return {...state,rover:{...rover,pose,heading:rover.driving?action.heading:rover.heading,battery}};
 }
 if(action.type==='ROVER_RECOVER'){
  if(rover.battery>0||state.resources.power<5)return state;
  return {...state,rover:{...freshRover(),battery:25},resources:{...state.resources,power:Math.max(0,state.resources.power-5)},log:[...state.log,'Rover recovered to its dock. Recovery used 5 base power.']};
 }
 if(action.type==='PREPARE_STORM'){
  const target=STORM_CONTROLS.find(item=>item.id===action.id),prep=state.taskRun.stormPrep??{shutters:false,secured:false,dusty:false};
  if(!target||prep[action.id]||rover.driving||state.taskRun.activeTaskId||!near(action.pose,target,2))return state;
  return {...state,taskRun:{...state.taskRun,stormPrep:{...prep,[action.id]:true}},log:[...state.log,`${target.label} complete. Both preparations prevent the next dust fault.`]};
 }
 return state;
}
function near(a:{x:number;y:number;z:number},b:{x:number;z:number},range:number){return [a.x,a.y,a.z].every(Number.isFinite)&&a.y<1.5&&Math.hypot(a.x-b.x,a.z-b.z)<=range;}
