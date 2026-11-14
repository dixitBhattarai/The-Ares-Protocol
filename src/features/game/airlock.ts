import { atSuitRack, inAirlock, type HabitatAccess } from '../../contracts/habitat';
import type { Vec3 } from '../../contracts';
export function changeSuit(state: HabitatAccess, pose: Vec3): HabitatAccess {
 if (state.phase !== 'inside' || !atSuitRack(pose)) return state;
 return {...state, suited: !state.suited};
}
export function cycleAirlock(state: HabitatAccess, pose: Vec3): HabitatAccess {
 if (!inAirlock(pose) || !state.suited || state.remaining > 0) return state;
 return {...state,phase: state.phase === 'inside' ? 'venting' : 'filling',remaining: 2};
}
/** Active game seconds only; the two doors are never open together. */
export function stepAirlock(state: HabitatAccess, seconds: number): HabitatAccess {
 if (!Number.isFinite(seconds) || seconds <= 0 || state.remaining <= 0) return state;
 const remaining=Math.max(0,state.remaining-Math.min(seconds,.1));
 return {...state,remaining,phase:remaining > 0 ? state.phase : state.phase==='venting' ? 'outside' : 'inside'};
}
