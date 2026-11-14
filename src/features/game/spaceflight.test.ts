import { describe, expect, it } from 'vitest';
import { advanceFlightControls, FLIGHT_CONTROL_STEPS, flightCommandForControl } from './spaceflight';

describe('guided spaceflight controls', () => {
  it('requires the launch actions in order and completes exactly once', () => {
    let progress = 0;
    const steps = FLIGHT_CONTROL_STEPS.launch;
    expect(advanceFlightControls('launch', progress, 'KeyW')).toMatchObject({ accepted: false, progress: 0 });
    for (const step of steps) {
      const result = advanceFlightControls('launch', progress, step.key);
      expect(result.accepted).toBe(true);
      progress = result.progress;
    }
    expect(progress).toBe(steps.length);
    expect(advanceFlightControls('launch', progress, 'Space')).toMatchObject({ accepted: false, complete: true });
  });

  it('keeps landing forgiving by rejecting a wrong action without losing progress', () => {
    expect(advanceFlightControls('landing', 3, 'KeyS')).toMatchObject({
      accepted: false,
      progress: 3,
      complete: false,
      expected: FLIGHT_CONTROL_STEPS.landing[3],
    });
    expect(advanceFlightControls('landing', 3, 'KeyW')).toMatchObject({ accepted: true, progress: 4 });
  });

  it('maps thrust and steering prompts to stable sim commands', () => {
    expect(flightCommandForControl('launch', 'KeyW', 1)).toEqual({ action: 'set_throttle', throttle: 0.82 });
    expect(flightCommandForControl('landing', 'KeyS', 4)).toEqual({ action: 'set_throttle', throttle: 0.18 });
    expect(flightCommandForControl('landing', 'KeyA', 0)?.action).toBe('set_attitude_target');
    expect(flightCommandForControl('landing', 'Space', 4)).toBeUndefined();
  });
});
