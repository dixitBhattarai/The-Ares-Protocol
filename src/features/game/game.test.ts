import { describe, expect, it } from 'vitest';
import type { MissionData } from '../../contracts';
import { loadMission } from '../missions';
import { createInitialState, getCurrentEvent, reduceGame } from './index';

const mission: MissionData = loadMission();

describe('mission state transitions and phase guards', () => {
  it('does not spend resources before starting or while paused', () => {
    const ready = createInitialState(mission);
    expect(reduceGame(ready, { type: 'CHOOSE', choiceId: 'research' }, mission)).toBe(ready);

    const running = reduceGame(ready, { type: 'START' }, mission);
    expect(running.phase).toBe('running');

    const paused = reduceGame(running, { type: 'PAUSE' }, mission);
    expect(paused.phase).toBe('paused');
    expect(reduceGame(paused, { type: 'CHOOSE', choiceId: 'research' }, mission)).toBe(paused);

    const resumed = reduceGame(paused, { type: 'RESUME' }, mission);
    expect(resumed.phase).toBe('running');
  });

  it('ignores invalid choice IDs and preserves immutability', () => {
    const running = { ...createInitialState(mission), phase: 'running' as const };
    const invalid = reduceGame(running, { type: 'CHOOSE', choiceId: 'nonexistent-action' }, mission);
    expect(invalid).toBe(running);

    const valid = reduceGame(running, { type: 'CHOOSE', choiceId: 'research' }, mission);
    expect(valid).not.toBe(running);
    expect(running.resources.power).toBe(70);
    expect(valid.resources.power).toBe(62);
    expect(valid.science).toBe(1);
    expect(valid.turn).toBe(1);
    expect(valid.history).toHaveLength(1);
    expect(valid.log).toHaveLength(1);
  });

  it('guards terminal states and ignores further choices once won or lost', () => {
    const wonState = { ...createInitialState(mission), phase: 'won' as const, turn: 6, science: 3 };
    expect(reduceGame(wonState, { type: 'CHOOSE', choiceId: 'research' }, mission)).toBe(wonState);

    const lostState = { ...createInitialState(mission), phase: 'lost' as const, turn: 3, resources: { power: 0, oxygen: 50, supplies: 50 } };
    expect(reduceGame(lostState, { type: 'CHOOSE', choiceId: 'research' }, mission)).toBe(lostState);
  });
});

describe('shelter hazard mechanics and eliminating research-only dominance', () => {
  it('mitigates solar hazard on Shift 3 when shelter shielding >= 15', () => {
    let state = reduceGame(createInitialState(mission), { type: 'START' }, mission);
    // Shift 1: Oxygen
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);
    // Shift 2: Shield -> raises shielding to 15
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission);
    expect(state.shielding).toBe(15);

    // Shift 3: Research -> triggers hazard evaluation
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission);
    expect(state.lastHazardNotice).toContain('shielded critical equipment');
    expect(state.phase).toBe('running');
    // Base research (-8 P, -8 O) plus mitigated hazard (-4 P, -2 O)
    // Shift 1: P=58, O=88, S=65
    // Shift 2: P=52, O=84, S=50
    // Shift 3: P = 52 - 8 - 4 = 40, O = 84 - 8 - 2 = 74, S = 50 - 5 = 45
    expect(state.resources.power).toBe(40);
    expect(state.resources.oxygen).toBe(74);
  });

  it('suffers severe unshielded hazard damage on Shift 3 when shielding < 15', () => {
    let state = reduceGame(createInitialState(mission), { type: 'START' }, mission);
    // Shift 1: Research (shielding remains 0)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission);
    expect(state.upcomingHazardNotice).toContain('approaching');

    // Shift 2: Research (shielding remains 0)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission);
    expect(state.shielding).toBe(0);
    expect(state.upcomingHazardNotice).toContain('imminent');

    // Shift 3: Research -> unshielded hazard damage (-22 P, -18 O, -10 S) plus choice cost (-8 P, -8 O, -5 S)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission);
    expect(state.lastHazardNotice).toContain('Insufficient shielding');
    // Shift 1: P=62, O=62, S=65
    // Shift 2: P=54, O=54, S=60
    // Shift 3: P = 54 - 8 - 22 = 24, O = 54 - 8 - 18 = 28, S = 60 - 5 - 10 = 45
    expect(state.resources.power).toBe(24);
    expect(state.resources.oxygen).toBe(28);
    expect(state.resources.supplies).toBe(45);
  });

  it('fails research-only strategy due to power depletion before completing all shifts', () => {
    let state = reduceGame(createInitialState(mission), { type: 'START' }, mission);
    for (let i = 0; i < 6; i++) {
      state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission);
      if (state.phase === 'lost') break;
    }
    // Research-only must lose and NOT win!
    expect(state.phase).toBe('lost');
    expect(state.resources.power).toBe(0);
    expect(state.debrief?.verdict).toBe('depleted');
    expect(state.debrief?.primaryCause).toContain('POWER');
  });
});

describe('multiple winning strategies and victory debrief', () => {
  it('achieves 3-Star Master Commander victory with DSN interplanetary comms strategy', () => {
    let state = reduceGame(createInitialState(mission), { type: 'START' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);   // Shift 1 (buffer O2)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission);   // Shift 2 (prepare bunker)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission); // Shift 3 (storm mitigated)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission); // Shift 4 (grow crops)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'comms' }, mission);    // Shift 5 (beam to Earth)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission); // Shift 6 (final push + delayed comms arrive)

    expect(state.phase).toBe('won');
    expect(state.science).toBe(5);
    expect(state.shielding).toBe(15);
    expect(state.resources.power).toBeGreaterThan(0);
    expect(state.resources.oxygen).toBeGreaterThan(0);
    expect(state.resources.supplies).toBeGreaterThan(0);
    expect(state.debrief?.verdict).toBe('won');
    expect(state.debrief?.stars).toBe(3);
    expect(state.debrief?.score).toBeGreaterThanOrEqual(230);
    expect(state.debrief?.summary).toContain('⭐⭐⭐ 3-Star Rating');
  });

  it('wins with Shelter-First Explorer strategy (Oxygen -> Shield -> Research x4)', () => {
    let state = reduceGame(createInitialState(mission), { type: 'START' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);   // Shift 1
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission);   // Shift 2
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission); // Shift 3 (hazard mitigated)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission); // Shift 4
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission); // Shift 5
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission); // Shift 6

    expect(state.phase).toBe('won');
    expect(state.science).toBe(4);
    expect(state.science).toBeGreaterThanOrEqual(mission.scienceTarget);
    expect(state.resources.power).toBeGreaterThan(0);
    expect(state.resources.oxygen).toBeGreaterThan(0);
    expect(state.resources.supplies).toBeGreaterThan(0);
    expect(state.debrief?.verdict).toBe('won');
    expect(state.debrief?.title).toContain('Accomplished');
    expect(state.debrief?.stars).toBe(2);
    expect(state.debrief?.score).toBeGreaterThan(150);
    expect(state.debrief?.summary).toContain('⭐⭐ 2-Star Rating');
  });

  it('wins with Fortified Base strategy (Shield -> Oxygen -> Shield -> Research x3)', () => {
    let state = reduceGame(createInitialState(mission), { type: 'START' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission);   // Shift 1
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);   // Shift 2
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission);   // Shift 3 (shielding 30)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission); // Shift 4
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission); // Shift 5
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission); // Shift 6

    expect(state.phase).toBe('won');
    expect(state.science).toBe(3);
    expect(state.shielding).toBe(30);
    expect(state.resources.power).toBeGreaterThan(0);
    expect(state.resources.oxygen).toBeGreaterThan(0);
    expect(state.resources.supplies).toBeGreaterThan(0);
    expect(state.debrief?.verdict).toBe('won');
    expect(state.debrief?.stars).toBeGreaterThanOrEqual(1);
    expect(state.debrief?.score).toBeGreaterThan(100);
    expect(state.debrief?.summary).toContain('Star Rating');
  });
});

describe('losing conditions, explanations and clamping', () => {
  it('loses if reserves survive 6 shifts but science target is not met', () => {
    let state = reduceGame(createInitialState(mission), { type: 'START' }, mission);
    // Alternate oxygen and shield without any research
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);

    expect(state.turn).toBe(6);
    expect(state.science).toBe(0);
    expect(state.phase).toBe('lost');
    expect(state.debrief?.verdict).toBe('low_science');
    expect(state.debrief?.primaryCause).toContain('0 / 3');
  });

  it('clamps resources and shielding between 0 and 100', () => {
    const running = {
      ...createInitialState(mission),
      phase: 'running' as const,
      resources: { power: 98, oxygen: 95, supplies: 90 },
      shielding: 95,
    };
    // Oxygen maker adds +18 oxygen, should clamp at 100
    const clamped = reduceGame(running, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);
    expect(clamped.resources.oxygen).toBe(100);

    // Shielding adding +15 should clamp at 100
    const shieldClamped = reduceGame(clamped, { type: 'CHOOSE', choiceId: 'shield' }, mission);
    expect(shieldClamped.shielding).toBe(100);
  });

  it('processes delayed effects accurately across shifts', () => {
    const customMission: MissionData = {
      ...mission,
      events: [{
        id: 'delayed-comms',
        title: 'Deep Space Transmission',
        description: 'Send scientific data to Earth with a light travel delay.',
        sourceIds: [],
        choices: [{
          id: 'beam-data',
          label: 'Transmit telemetry',
          explanation: 'Signal transmitted across interplanetary distance.',
          effect: { resources: { power: -10 } },
          delayedEffect: {
            delayTurns: 1,
            description: 'Earth received telemetry and confirmed discovery.',
            effect: { science: 2 },
          },
        }],
      }],
    };

    let state = reduceGame(createInitialState(customMission), { type: 'START' }, customMission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'beam-data' }, customMission);
    // Immediate: science is still 0, delayed effect is queued
    expect(state.science).toBe(0);
    expect(state.pendingDelayedEffects).toHaveLength(1);

    // Next shift: delayed effect is processed
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'beam-data' }, customMission);
    expect(state.science).toBe(2);
    expect(state.log).toContain('Earth received telemetry and confirmed discovery.');
  });

  it('RESTART resets all state cleanly including history and debrief', () => {
    let state = reduceGame(createInitialState(mission), { type: 'START' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission);

    const restarted = reduceGame(state, { type: 'RESTART' }, mission);
    expect(restarted).toEqual(createInitialState(mission));
    expect(restarted.turn).toBe(0);
    expect(restarted.phase).toBe('ready');
    expect(restarted.history).toEqual([]);
    expect(restarted.debrief).toBeUndefined();
  });

  it('supports 4th decision choice on Shift 5 (harden antenna & shelter)', () => {
    let state = reduceGame(createInitialState(mission), { type: 'START' }, mission);
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission); // Turn 0
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission); // Turn 1
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission); // Turn 2
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission); // Turn 3
    expect(state.turn).toBe(4); // Shift 5

    const eventShift5 = getCurrentEvent(mission, state);
    expect(eventShift5?.choices).toHaveLength(4);
    expect(eventShift5?.choices[3].id).toBe('shield');

    state = reduceGame(state, { type: 'CHOOSE', choiceId: eventShift5!.choices[3].id }, mission);
    expect(state.turn).toBe(5);
    expect(state.history?.[4].choiceId).toBe('shield');
    expect(state.shielding).toBe(45);
  });
});

describe('SoundFX synthesizer', () => {
  it('instantiates, toggles, and handles audio safely', async () => {
    const { soundFX, SoundFX } = await import('./audio');
    expect(soundFX.enabled).toBe(true);
    soundFX.enabled = false;
    expect(soundFX.enabled).toBe(false);
    expect(() => soundFX.playStart()).not.toThrow();
    expect(() => soundFX.playRestart()).not.toThrow();
    expect(() => soundFX.playFullReserve()).not.toThrow();
    expect(() => soundFX.playDecision()).not.toThrow();
    expect(() => soundFX.playTransmission()).not.toThrow();
    expect(() => soundFX.playOxygen()).not.toThrow();
    expect(() => soundFX.playShield()).not.toThrow();
    expect(() => soundFX.playWarning()).not.toThrow();
    expect(() => soundFX.playHazard()).not.toThrow();
    expect(() => soundFX.playVictory()).not.toThrow();
    expect(() => soundFX.playDepleted()).not.toThrow();
    soundFX.enabled = true;
    const custom = new SoundFX();
    expect(custom.enabled).toBe(true);
  });
});

describe('choice presentation & roguelike card metadata', () => {
  it('provides typed presentation metadata for choices', async () => {
    const { getChoicePresentation } = await import('./index');
    const oxygenPres = getChoicePresentation({ id: 'oxygen', label: 'Make Oxygen', explanation: '', effect: {} });
    expect(oxygenPres.rarity).toBe('vital');
    expect(oxygenPres.badge).toBe('LIFE SUPPORT');
    expect(oxygenPres.icon).toBe('💨');

    const shieldPres = getChoicePresentation({ id: 'shield', label: 'Bunker', explanation: '', effect: {} });
    expect(shieldPres.rarity).toBe('hazard-response');
    expect(shieldPres.icon).toBe('🛡️');

    const commsPres = getChoicePresentation({ id: 'comms', label: 'DSN', explanation: '', effect: {} });
    expect(commsPres.rarity).toBe('experimental');
    expect(commsPres.icon).toBe('📡');

    const researchPres = getChoicePresentation({ id: 'research', label: 'Survey', explanation: '', effect: {} });
    expect(researchPres.rarity).toBe('standard');
    expect(researchPres.icon).toBe('🔬');
  });
});
