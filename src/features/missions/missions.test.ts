import { describe, expect, it } from 'vitest';
import { loadMission } from './index';

describe('Mission Architecture & Schema Acceptance', () => {
  const mission = loadMission();

  it('provides a valid mission configuration with 6 shifts', () => {
    expect(mission.id).toBeDefined();
    expect(mission.title).toBeDefined();
    expect(mission.maxTurns).toBe(6);
    expect(mission.scienceTarget).toBe(3);
    expect(mission.initialResources).toEqual({ power: 70, oxygen: 70, supplies: 70 });
    expect(mission.events).toHaveLength(6);
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
