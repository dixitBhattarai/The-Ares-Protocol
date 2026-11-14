import { describe, expect, it } from 'vitest';
import { createSpacecraftSim } from './index';

describe('spacecraft sim wrapper', () => {
  it('advances simulated time from caller-supplied frame steps without its own timer', () => {
    const sim = createSpacecraftSim('LEO_CIRCULAR');
    for (let i = 0; i < 600; i++) sim.step(1 / 60); // 10 s of wall time at 1x
    const snap = sim.getSnapshot();
    expect(snap.time_s).toBeGreaterThan(9);
    expect(snap.time_s).toBeLessThanOrEqual(10.1);
    expect(Number.isFinite(snap.spacecraft.altitude_m)).toBe(true);
    expect(snap.spacecraft.altitude_m).toBeGreaterThan(100_000); // still in orbit
    sim.dispose();
  });

  it('does nothing after dispose', () => {
    const sim = createSpacecraftSim();
    sim.dispose();
    const before = sim.getSnapshot().time_s;
    sim.step(1);
    expect(sim.getSnapshot().time_s).toBe(before);
  });

  it('keeps every state vector finite while burning', () => {
    const sim = createSpacecraftSim('LEO_CIRCULAR');
    sim.command({ action: 'set_throttle', throttle: 0.5 });
    for (let i = 0; i < 300; i++) sim.step(1 / 60);
    const s = sim.getSnapshot().spacecraft;
    for (const v of [...s.position_m, ...s.velocity_m_s, ...s.orientation_quaternion]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    sim.dispose();
  });

  it('loads the surface launch profile and burns its staged propellant when commanded', () => {
    const sim = createSpacecraftSim('EARTH_LAUNCH_ASCENT');
    const startingFuel = sim.getSnapshot().spacecraft.propellant_mass_kg;
    sim.setTimeScale(10);
    sim.command({ action: 'set_throttle', throttle: 0.82 });
    for (let i = 0; i < 120; i++) sim.step(1 / 60);
    const ascent = sim.getSnapshot().spacecraft;
    expect(ascent.propellant_mass_kg).toBeLessThan(startingFuel);
    expect(Number.isFinite(ascent.altitude_m)).toBe(true);
    expect(ascent.altitude_m).toBeGreaterThan(0);
    sim.dispose();
  });

  it('provides a separate powered-descent profile for the landing sequence', () => {
    const sim = createSpacecraftSim('MARS_POWERED_DESCENT');
    const snapshot = sim.getSnapshot().spacecraft;
    expect(snapshot.altitude_m).toBeGreaterThan(4_900);
    expect(snapshot.altitude_m).toBeLessThan(5_100);
    expect(snapshot.speed_m_s).toBeGreaterThan(0);
    expect(snapshot.propellant_mass_kg).toBeGreaterThan(0);
    sim.dispose();
  });
});
