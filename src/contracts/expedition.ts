import type { Vec3 } from './index';
export interface RoverState { pose: Vec3; heading: number; battery: number; driving: boolean }
export const ROVER_DOCK: Readonly<Vec3> = {x:0,y:.8,z:21};
export const REMOTE_SAMPLE: Readonly<Vec3> = {x:29,y:.8,z:33};
export const STORM_CONTROLS = [
 {id:'shutters',label:'Close greenhouse shutters',x:2,y:.8,z:-4.6},
 {id:'secured',label:'Secure the equipment racks',x:-9,y:.8,z:4.6},
] as const;
export type StormControlId = typeof STORM_CONTROLS[number]['id'];
export interface StormPreparation { shutters:boolean; secured:boolean; dusty:boolean }
export type ExpeditionAction =
 | {type:'ROVER_ENTER';pose:Vec3;suited:boolean}
 | {type:'ROVER_EXIT'}
 | {type:'ROVER_TICK';seconds:number;pose:Vec3;heading:number}
 | {type:'ROVER_RECOVER'}
 | {type:'PREPARE_STORM';id:StormControlId;pose:Vec3};
export const freshRover = ():RoverState => ({pose:{...ROVER_DOCK},heading:Math.PI,battery:100,driving:false});
