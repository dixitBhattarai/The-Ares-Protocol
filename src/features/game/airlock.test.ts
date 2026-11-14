import { describe,it,expect } from 'vitest';
import { freshHabitatAccess } from '../../contracts/habitat';
import { changeSuit,cycleAirlock,stepAirlock } from './airlock';
const rack={x:1.5,y:.8,z:9},chamber={x:0,y:.8,z:12.5};
describe('EVA pressure interlock',()=>{
 it('requires a rack and suit before venting; locks during a cycle',()=>{
  const fresh=freshHabitatAccess();expect(changeSuit(fresh,chamber)).toBe(fresh);expect(cycleAirlock(fresh,chamber)).toBe(fresh);
  const suit=changeSuit(fresh,rack),cycle=cycleAirlock(suit,chamber);expect(cycle.phase).toBe('venting');expect(cycleAirlock(cycle,chamber)).toBe(cycle);expect(changeSuit(cycle,rack)).toBe(cycle);
  let done=cycle;for(let i=0;i<21;i++)done=stepAirlock(done,.1);expect(done.phase).toBe('outside');
  const back=cycleAirlock(done,chamber);expect(back.phase).toBe('filling');let inside=back;for(let i=0;i<21;i++)inside=stepAirlock(inside,.1);expect(inside.phase).toBe('inside');expect(changeSuit(inside,rack).suited).toBe(false);
 });
 it('does not advance on invalid time or leak state across replay',()=>{const s=cycleAirlock(changeSuit(freshHabitatAccess(),rack),chamber);expect(stepAirlock(s,NaN)).toBe(s);expect(stepAirlock(s,0)).toBe(s);expect(freshHabitatAccess().suited).toBe(false);});
});
