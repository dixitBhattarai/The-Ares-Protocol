import type {Vec3} from './index';

/** Authored practice locations; not a reconstruction or chemical survey of Mars. */
export const SURVEY_SITES = [
  {id:'rim',name:'Crater rim',sample:'Rim grains',x:29,y:.8,z:33,color:'#cba184'},
  {id:'basin',name:'Crater basin',sample:'Basin grains',x:35,y:.8,z:44,color:'#9a7262'},
  {id:'ejecta',name:'Rock apron',sample:'Apron grains',x:49,y:.8,z:23,color:'#c38d66'},
] as const;
export type SurveySiteId = typeof SURVEY_SITES[number]['id'];
export const SURVEY_CAPACITY = 2;
export interface SurveyState {
  scanned: SurveySiteId[];
  cargo: SurveySiteId[];
  analyzed: SurveySiteId[];
  scanning?: {id:SurveySiteId;elapsed:number};
}
export const freshSurvey = ():SurveyState => ({scanned:[],cargo:[],analyzed:[]});
export type SurveyAction =
  | {type:'SURVEY_START';id:SurveySiteId;pose:Vec3;suited:boolean;grounded:boolean}
  | {type:'SURVEY_TICK';seconds:number;pose:Vec3;suited:boolean;grounded:boolean}
  | {type:'SURVEY_CANCEL'}
  | {type:'SURVEY_COLLECT';id:SurveySiteId;pose:Vec3;suited:boolean;grounded:boolean};
