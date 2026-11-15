export interface CabinCheck { bearing:number; burn:number; packets:readonly number[] }
export const newCabinCheck=():CabinCheck=>({bearing:30,burn:0,packets:[]});
export type CabinInput={type:'bearing'|'burn'|'packet';value:number};
export function adjustCabinCheck(state:CabinCheck,input:CabinInput,enabled=true):CabinCheck {
 if(!enabled||!Number.isFinite(input.value))return state;
 if(input.type==='bearing')return {...state,bearing:Math.max(0,Math.min(180,state.bearing+Math.max(-15,Math.min(15,input.value))))};
 if(input.type==='burn')return {...state,burn:Math.max(0,Math.min(6,state.burn+Math.sign(input.value)))};
 if(input.value!==state.packets.length+1||state.packets.length>=3)return state;
 return {...state,packets:[...state.packets,input.value]};
}
export function cabinCheckReady(state:CabinCheck,stage:number):boolean {
 return stage===0?Math.abs(state.bearing-90)<=5:stage===1?state.burn===3:stage===2?state.packets.length===3:false;
}
