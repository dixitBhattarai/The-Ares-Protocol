import { describe, expect, it } from 'vitest';
import type { GameState } from '../../contracts';
import { reduceGame } from '../game';
import donkiRawData from './data/donki-cme-may2024-raw.json';
import { loadMission } from './index';

describe('Mission Architecture & Schema Acceptance', () => {
  const mission = loadMission();

  it('provides a valid mission configuration with 6 shifts and archived dataMode', () => {
    expect(mission.id).toBeDefined();
    expect(mission.title).toBeDefined();
    expect(mission.maxTurns).toBe(6);
    expect(mission.scienceTarget).toBe(3);
    expect(mission.initialResources).toEqual({ power: 70, oxygen: 70, supplies: 70 });
    expect(mission.events).toHaveLength(6);
    expect(mission.dataMode).toBe('archived');
  });

  it('ensures each shift has a unique, stable ID and descriptive title', () => {
    const ids = mission.events.map(e => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(6);

    for (const event of mission.events) {
      expect(event.id).toMatch(/^shift-[1-6]-/);
      expect(event.title.length).toBeGreaterThan(5);
      expect(event.description.length).toBeGreaterThan(20);
      expect(event.choices.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('ensures every choice has meaningful costs and no free lunch', () => {
    for (const event of mission.events) {
      const choiceIds = new Set<string>();
      for (const choice of event.choices) {
        expect(choiceIds.has(choice.id)).toBe(false);
        choiceIds.add(choice.id);

        expect(choice.label.trim().length).toBeGreaterThan(3);
        expect(choice.explanation.trim().length).toBeGreaterThan(10);

        // Every useful choice must have a resource cost (power, oxygen, or supplies negative)
        const res = choice.effect.resources ?? {};
        const hasCost = (res.power ?? 0) < 0 || (res.oxygen ?? 0) < 0 || (res.supplies ?? 0) < 0;
        expect(hasCost).toBe(true);

        // Science or shielding benefits must not be free
        if ((choice.effect.science ?? 0) > 0 || (choice.effect.shielding ?? 0) > 0) {
          expect(hasCost).toBe(true);
        }
      }
    }
  });

  it('verifies the 6-shift educational arc content', () => {
    // Shift 1: Oxygen vs science
    const shift1 = mission.events[0];
    expect(shift1.choices.some(c => c.id === 'oxygen')).toBe(true);
    expect(shift1.choices.some(c => c.id === 'research')).toBe(true);

    // Shift 2: Shelter preparation
    const shift2 = mission.events[1];
    const shieldChoice2 = shift2.choices.find(c => c.id === 'shield');
    expect(shieldChoice2).toBeDefined();
    expect((shieldChoice2?.effect.shielding ?? 0)).toBeGreaterThan(0);

    // Shift 3: Solar weather hazard with verified mitigation threshold
    const shift3 = mission.events[2];
    expect(shift3.hazard).toBeDefined();
    expect(shift3.hazard?.minShielding).toBe(15);
    expect(shift3.hazard?.mitigatedLoss.power).toBeDefined();
    expect(shift3.hazard?.unmitigatedLoss.power).toBeDefined();
    expect(shift3.hazard?.unmitigatedLoss.power!).toBeLessThan(shift3.hazard?.mitigatedLoss.power!);

    // Shift 4: Greenhouse food production
    const shift4 = mission.events[3];
    expect(shift4.title).toContain('Greenhouse');

    // Shift 5: Interplanetary communications with 1-turn delayed effect
    const shift5 = mission.events[4];
    const commsChoice = shift5.choices.find(c => c.id === 'comms');
    expect(commsChoice).toBeDefined();
    expect(commsChoice?.delayedEffect).toBeDefined();
    expect(commsChoice?.delayedEffect?.delayTurns).toBe(1);
    expect(commsChoice?.delayedEffect?.effect.science).toBe(2);

    // Shift 6: Final science push vs reserve stabilization
    const shift6 = mission.events[5];
    expect(shift6.choices.some(c => c.id === 'research')).toBe(true);
    expect(shift6.choices.some(c => c.id === 'oxygen')).toBe(true);
  });
});

describe('NASA Evidence, Provenance & Source Resolution', () => {
  const mission = loadMission();

  it('provides verified archived sources with valid schema and non-endorsement caveats', () => {
    expect(mission.sources.length).toBeGreaterThanOrEqual(1);

    const sourceMap = new Map(mission.sources.map(s => [s.id, s]));
    expect(sourceMap.has('nasa-donki-cme-2024')).toBe(true);

    for (const source of mission.sources) {
      expect(source.id).toBeDefined();
      expect(source.title.length).toBeGreaterThan(5);
      expect(source.url).toMatch(/^https?:\/\//);
      expect(source.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(source.mode).toBe('archived');
      expect(source.licenseNotes.toLowerCase()).toContain('non-endorsement');
      expect(source.mapping.length).toBeGreaterThan(20);
    }
  });

  it('ensures all sourceIds referenced across all events resolve to existing sources', () => {
    const knownSourceIds = new Set(mission.sources.map(s => s.id));
    for (const event of mission.events) {
      for (const sourceId of event.sourceIds) {
        expect(knownSourceIds.has(sourceId)).toBe(true);
      }
    }
  });

  it('loads and verifies authentic raw NASA DONKI CME fixture data', () => {
    const cmes = donkiRawData as Array<{
      activityID: string;
      startTime: string;
      sourceLocation: string;
      activeRegionNum: number | null;
      note: string;
      cmeAnalyses?: Array<{ speed: number; type: string; halfAngle: number }>;
    }>;

    expect(Array.isArray(cmes)).toBe(true);
    expect(cmes.length).toBeGreaterThanOrEqual(1);

    // Verify presence of May 11, 2024 high-speed CME from NOAA Active Region 13664
    const may11Cme = cmes.find(c => c.activityID === '2024-05-11T01:36:00-CME-001');
    expect(may11Cme).toBeDefined();
    expect(may11Cme?.activeRegionNum).toBe(13664);
    expect(may11Cme?.note).toContain('X5.8 flare');

    const topAnalysis = may11Cme?.cmeAnalyses?.find(a => a.speed >= 1800);
    expect(topAnalysis).toBeDefined();
    expect(topAnalysis?.speed).toBe(1820);
    expect(topAnalysis?.type).toBe('O');
  });

  it('proves the Deep Space Communications delayed-effect strategy succeeds with science >= 3', () => {
    let state: GameState = {
      phase: 'running',
      turn: 0,
      resources: { ...mission.initialResources },
      shielding: 0,
      science: 0,
      log: [],
      history: [],
      pendingDelayedEffects: [],
    };

    // Shift 1: Oxygen generator (+18 O, -12 P, -5 S)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);
    expect(state.turn).toBe(1);

    // Shift 2: Fortify storm shelter (+15 shielding)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'shield' }, mission);
    expect(state.shielding).toBe(15);
    expect(state.turn).toBe(2);

    // Shift 3: Record solar telemetry (hazard mitigated due to shielding >= 15)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission);
    expect(state.lastHazardNotice).toContain('shielded critical equipment');
    expect(state.science).toBe(1);
    expect(state.turn).toBe(3);

    // Shift 4: Cultivate greenhouse crops (+1 science)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'research' }, mission);
    expect(state.science).toBe(2);
    expect(state.turn).toBe(4);

    // Shift 5: Transmit telemetry to Earth (1-turn delay, queued for Shift 6)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'comms' }, mission);
    expect(state.science).toBe(2); // Still 2 immediately!
    expect(state.pendingDelayedEffects).toHaveLength(1);
    expect(state.turn).toBe(5);

    // Shift 6: Stabilize air reserves (delayed effect triggers: +2 science!)
    state = reduceGame(state, { type: 'CHOOSE', choiceId: 'oxygen' }, mission);
    expect(state.turn).toBe(6);
    expect(state.science).toBe(4); // 2 + 2 = 4!
    expect(state.phase).toBe('won');
    expect(state.resources.power).toBeGreaterThan(0);
    expect(state.resources.oxygen).toBeGreaterThan(0);
    expect(state.resources.supplies).toBeGreaterThan(0);
    expect(state.debrief?.verdict).toBe('won');
  });
});
