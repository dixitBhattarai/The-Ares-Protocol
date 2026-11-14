import type {LandingFlightSnapshot} from '../../contracts';
export const LANDING_ALTITUDE=320;
export const PAD_HALF_WIDTH=12;
export function createLandingFlight():LandingFlightSnapshot{
 return {altitude:LANDING_ALTITUDE,verticalSpeed:-12,offset:-14,horizontalSpeed:1.2,pitch:0,throttle:.36,fuel:300,legs:false,assist:false,status:'flying',result:''};
}
export function landingGuidance(s:Readonly<LandingFlightSnapshot>){
 const desiredSpeed=-Math.max(1.8,Math.min(14,s.altitude*.075));
 const thrust=11000/(900+s.fuel);
 const throttle=Math.max(0,Math.min(1,(3.72076+(desiredSpeed-s.verticalSpeed)*.8)/thrust));
 const pitch=Math.max(-18,Math.min(18,Math.atan2(-s.offset*.06-s.horizontalSpeed*.8,3.72076)*180/Math.PI));
 return {throttle,pitch,desiredSpeed};
}
/** Authored powered descent in SI units and real elapsed seconds. No timers or random impulses. */
export function stepLandingFlight(previous:Readonly<LandingFlightSnapshot>,seconds:number,input:{throttle:number;steer:number}):LandingFlightSnapshot{
 const s={...previous};
 if(s.status!=='flying'||!Number.isFinite(seconds)||seconds<=0)return s;
 const dt=Math.min(.1,seconds),throttle=Number.isFinite(input.throttle)?Math.max(-1,Math.min(1,input.throttle)):0,steer=Number.isFinite(input.steer)?Math.max(-1,Math.min(1,input.steer)):0;
 if(throttle||steer)s.assist=false;
 if(s.assist){const guide=landingGuidance(s),blend=1-Math.exp(-3*dt);s.throttle+=(guide.throttle-s.throttle)*blend;s.pitch+=(guide.pitch-s.pitch)*blend;if(s.altitude<100)s.legs=true;}
 else {s.throttle=Math.max(0,Math.min(1,s.throttle+throttle*dt*.5));s.pitch=Math.max(-25,Math.min(25,s.pitch+steer*dt*18));}
 const n=Math.ceil(dt/.02),h=dt/n;
 for(let i=0;i<n;i++){
  const power=s.fuel>0?s.throttle:0,acceleration=11000*power/(900+s.fuel),angle=s.pitch*Math.PI/180;
  s.verticalSpeed+=(acceleration*Math.cos(angle)-3.72076)*h;
  s.horizontalSpeed+=(acceleration*Math.sin(angle)-s.horizontalSpeed*.025)*h;
  s.altitude=Math.max(0,s.altitude+s.verticalSpeed*h);s.offset+=s.horizontalSpeed*h;s.fuel=Math.max(0,s.fuel-2.4*power*h);
  if(s.altitude===0){
   const reason=Math.abs(s.offset)>PAD_HALF_WIDTH?'Outside the pad':!s.legs?'Deploy the landing legs':Math.abs(s.verticalSpeed)>5.5?'Too fast — brake earlier':Math.abs(s.horizontalSpeed)>3?'Too much sideways drift':Math.abs(s.pitch)>12?'Level the lander':null;
   s.status=reason?'retry':'landed';s.result=reason??'Soft touchdown';break;
  }
 }
 return s;
}
