import type { LaunchFlightSnapshot } from '../../contracts';

export const SPACE_ALTITUDE = 100_000;
export const LAUNCH_TIME_SCALE = 8;
const FUEL = 210_000;
export function createLaunchFlight(): LaunchFlightSnapshot {
  return {altitude:0,verticalSpeed:0,downrange:0,horizontalSpeed:0,pitch:0,throttle:.72,fuel:FUEL,elapsed:0,ignited:false,spaceReached:false};
}
export interface LaunchInput { throttle: number; steer: number }
/** Simplified 2D ascent: gravity, thinning air, fuel mass and gimballed thrust.
 * SI telemetry; time is compressed 8x. This is an authored game vehicle, not a real launch predictor.
 * No scheduler: App calls this only while visible and unpaused.
 */
export function stepLaunchFlight(previous:Readonly<LaunchFlightSnapshot>,seconds:number,input:LaunchInput):LaunchFlightSnapshot {
  if(!Number.isFinite(seconds)||seconds<=0)return {...previous};
  const dt=Math.min(.1,seconds),next={...previous};
  const throttle=Number.isFinite(input.throttle)?Math.max(-1,Math.min(1,input.throttle)):0;
  const steer=Number.isFinite(input.steer)?Math.max(-1,Math.min(1,input.steer)):0;
  next.throttle=Math.max(0,Math.min(1,next.throttle+throttle*dt*.38));
  next.pitch=Math.max(-25,Math.min(25,next.pitch+steer*dt*15));
  if(!next.ignited)return next;
  const count=Math.ceil(dt*LAUNCH_TIME_SCALE/.05),h=dt*LAUNCH_TIME_SCALE/count;
  for(let i=0;i<count;i++){
    const angle=next.pitch*Math.PI/180;
    const power=next.fuel>0&&!next.spaceReached?next.throttle:0;
    const mass=90_000+next.fuel;
    const gravity=9.80665*(6_371_000/(6_371_000+next.altitude))**2;
    const density=1.225*Math.exp(-next.altitude/8500);
    const speed=Math.hypot(next.verticalSpeed,next.horizontalSpeed);
    const drag=.5*density*14*speed/mass;
    const thrust=7_200_000*power/mass;
    next.verticalSpeed+=(thrust*Math.cos(angle)-gravity-drag*next.verticalSpeed)*h;
    next.horizontalSpeed+=(thrust*Math.sin(angle)-drag*next.horizontalSpeed)*h;
    next.altitude=Math.max(0,next.altitude+next.verticalSpeed*h);
    if(next.altitude===0)next.verticalSpeed=Math.max(0,next.verticalSpeed);
    next.downrange+=next.horizontalSpeed*h;
    next.fuel=Math.max(0,next.fuel-650*power*h);
    next.elapsed+=h;
    if(next.altitude>=SPACE_ALTITUDE)next.spaceReached=true;
  }
  return next;
}
