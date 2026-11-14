import type {LandingFlightSnapshot} from '../../contracts';
export const LANDING_ALTITUDE=80000;
export const PAD_HALF_WIDTH=12;
export function createLandingFlight():LandingFlightSnapshot{
 return {phase:'space',altitude:LANDING_ALTITUDE,verticalSpeed:-1400,forwardSpeed:3100,heat:0,offset:-14,horizontalSpeed:0,pitch:-8,bank:0,throttle:.36,fuel:300,legs:false,assist:false,status:'flying',result:''};
}
export function createFinalApproach():LandingFlightSnapshot{
 return {...createLandingFlight(),phase:'approach',altitude:320,verticalSpeed:-12,forwardSpeed:18,pitch:0};
}
export function landingGuidance(s:Readonly<LandingFlightSnapshot>){
 const desiredSpeed=s.altitude>800?-Math.max(16,Math.min(1400,s.altitude*.028)): -Math.max(1.8,Math.min(14,s.altitude*.075));
 const thrust=11000/(900+s.fuel);
 const throttle=s.altitude>800?0:Math.max(0,Math.min(1,(3.72076+(desiredSpeed-s.verticalSpeed)*.8)/thrust));
 const bank=Math.max(-18,Math.min(18,Math.atan2(-s.offset*.06-s.horizontalSpeed*.8,3.72076)*180/Math.PI));
 return {throttle,bank,pitch:s.altitude>800?4:0,desiredSpeed};
}
/** Continuous authored entry and powered descent. High-altitude time is compressed up to 20x.
 * Pitch changes the flight path; it never commands reverse thrust or negative forward speed.
 */
export function stepLandingFlight(previous:Readonly<LandingFlightSnapshot>,seconds:number,input:{throttle:number;steer:number;pitch?:number}):LandingFlightSnapshot{
 const s={...previous};if(s.status!=='flying'||!Number.isFinite(seconds)||seconds<=0)return s;
 const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));
 const dt=Math.min(.1,seconds),axis=(x:number|undefined)=>Number.isFinite(x)?clamp(x!,-1,1):0;
 const throttle=axis(input.throttle),steer=axis(input.steer),pitch=axis(input.pitch);
 if(throttle||steer||pitch)s.assist=false;
 if(s.assist){const g=landingGuidance(s),blend=1-Math.exp(-3*dt);if(s.altitude<=800)s.throttle+=(g.throttle-s.throttle)*blend;s.pitch+=(g.pitch-s.pitch)*blend;s.bank+=(g.bank-s.bank)*blend;if(s.altitude<100)s.legs=true;}
 else{s.throttle=clamp(s.throttle+throttle*dt*.5,0,1);s.pitch=clamp(s.pitch+pitch*dt*18,-25,25);s.bank=clamp(s.bank+steer*dt*18,-25,25);}
 const scale=1+19*clamp((s.altitude-600)/1800,0,1),n=Math.ceil(dt*scale/.025),h=dt*scale/n;
 for(let i=0;i<n;i++){
  const air=Math.exp(-s.altitude/12000),bank=s.bank*Math.PI/180,nose=s.pitch*Math.PI/180;
  if(s.altitude>800){
   const target=-Math.max(16,Math.min(1400,s.altitude*.028-s.pitch*2));
   s.verticalSpeed+=(target-s.verticalSpeed)*(1-Math.exp(-h*.35));
   const forward=Math.max(45,30+3150*(s.altitude/LANDING_ALTITUDE)**.75-s.pitch*2);
   s.forwardSpeed+=(forward-s.forwardSpeed)*(1-Math.exp(-h*.15));
   s.horizontalSpeed+=(Math.sin(bank)*.35-s.horizontalSpeed*.12)*h;
  }else{
   const power=s.fuel>0?s.throttle:0,acceleration=11000*power/(900+s.fuel);
   s.verticalSpeed+=(acceleration*Math.cos(nose)*Math.cos(bank)-3.72076)*h;
   s.horizontalSpeed+=(acceleration*Math.sin(bank)-s.horizontalSpeed*.025)*h;
   s.forwardSpeed=Math.max(0,s.forwardSpeed+(-Math.sin(nose)*1.3-s.forwardSpeed*(.08+power*.18))*h);
   s.fuel=Math.max(0,s.fuel-2.4*power*h);
  }
  s.forwardSpeed=Math.max(0,s.forwardSpeed);
  s.heat=clamp(air*(s.forwardSpeed/3000)**3*25,0,1);
  s.altitude=Math.max(0,s.altitude+s.verticalSpeed*h);s.offset+=s.horizontalSpeed*h;
  s.phase=s.altitude>45000?'space':s.altitude>800?'entry':'approach';
  if(s.altitude===0){
   const reason=Math.abs(s.offset)>PAD_HALF_WIDTH?'Outside the pad':!s.legs?'Deploy the landing legs':Math.abs(s.verticalSpeed)>5.5?'Too fast — brake earlier':Math.abs(s.horizontalSpeed)>3?'Too much sideways drift':s.forwardSpeed>8?'Too much forward speed':Math.abs(s.pitch)>12||Math.abs(s.bank)>12?'Level the lander':null;
   s.status=reason?'retry':'landed';s.result=reason??'Soft touchdown';break;
  }
 }
 return s;
}
