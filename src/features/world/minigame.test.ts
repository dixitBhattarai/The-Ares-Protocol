import { describe, expect, it } from 'vitest';
import { advanceMiniGame, createMiniState, MINI_TARGETS } from './minigame';

describe('station minigame input and completion', () => {
  it('requires three correct panel taps and ignores repeats after completion', () => {
    let state=createMiniState(0);
    state=advanceMiniGame('habitat',state,{type:'tap',index:0});expect(state.taps).toBe(0);
    for(let i=0;i<3;i++) {state=advanceMiniGame('habitat',state,{type:'tap',index:MINI_TARGETS[0]});expect(state.complete).toBe(i===2);}
    expect(advanceMiniGame('habitat',state,{type:'tap',index:1})).toBe(state);
  });
  it('requires the requested source and socket rather than arbitrary matching clicks', () => {
    let state=createMiniState(0);
    state=advanceMiniGame('solar',state,{type:'socket',index:0});expect(state.complete).toBe(false);
    state=advanceMiniGame('solar',state,{type:'source',index:1});
    state=advanceMiniGame('solar',state,{type:'socket',index:1});expect(state.complete).toBe(false);
    state=advanceMiniGame('solar',state,{type:'source',index:0});
    state=advanceMiniGame('solar',state,{type:'socket',index:0});expect(state.complete).toBe(true);
  });
  it('requires inspecting the affected leaf and selecting appropriate care', () => {
    let state=createMiniState(1);
    state=advanceMiniGame('greenhouse',state,{type:'care',index:0});expect(state.complete).toBe(false);
    state=advanceMiniGame('greenhouse',state,{type:'leaf',index:0});
    state=advanceMiniGame('greenhouse',state,{type:'care',index:0});expect(state.complete).toBe(false);
    state=advanceMiniGame('greenhouse',state,{type:'leaf',index:MINI_TARGETS[1]});
    state=advanceMiniGame('greenhouse',state,{type:'care',index:1});expect(state.complete).toBe(false);
    state=advanceMiniGame('greenhouse',state,{type:'care',index:0});expect(state.complete).toBe(true);
  });
  it('ignores paused input, invalid targets and terminal stages without mutating state', () => {
    const state=createMiniState(0);
    expect(advanceMiniGame('habitat',state,{type:'tap',index:1},false)).toBe(state);
    expect(advanceMiniGame('habitat',state,{type:'tap',index:10})).toBe(state);
    const ended=createMiniState(3);
    expect(advanceMiniGame('solar',ended,{type:'source',index:0})).toBe(ended);
    expect(state).toEqual(createMiniState(0));
  });
});
