export const EXPOSED_PANELS=[[0,4,8],[1,3,7],[2,4,6]] as const;
export const CROP_TARGETS=[{water:2,light:3},{water:3,light:1},{water:1,light:2}] as const;
export function placeShield(stage:number,covered:readonly number[],index:number):readonly number[]{
 const targets:readonly number[]=EXPOSED_PANELS[stage]??[];
 return targets.includes(index)&&!covered.includes(index)?[...covered,index]:covered;
}
export function cropBalanced(stage:number,water:number,light:number):boolean{
 const goal=CROP_TARGETS[stage];return !!goal&&water===goal.water&&light===goal.light;
}
