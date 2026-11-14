import type { FlightControlKey, FlightControlStep } from '../../contracts';
export type { FlightControlKey, FlightControlStep };
export type InteractiveFlightStage = 'launch' | 'landing';

export const FLIGHT_CONTROL_STEPS: Readonly<Record<InteractiveFlightStage, readonly FlightControlStep[]>> = {
  launch: [
    { key: 'Space', action: 'Start the countdown', explanation: 'Confirm the pad is clear and begin the launch sequence.' },
    { key: 'KeyW', action: 'Bring the engines up', explanation: 'Build steady thrust for liftoff.' },
    { key: 'KeyA', action: 'Nudge left', explanation: 'Follow the marked ascent corridor.' },
    { key: 'KeyD', action: 'Center the rocket', explanation: 'Bring the guidance marker back to the middle.' },
  ],
  landing: [
    { key: 'KeyA', action: 'Line up left', explanation: 'Steer toward the landing beacon.' },
    { key: 'Space', action: 'Deploy the parachute', explanation: 'Let the atmosphere help slow the lander.' },
    { key: 'KeyD', action: 'Center over the beacon', explanation: 'Make a small correction back toward the landing area.' },
    { key: 'KeyW', action: 'Add braking thrust', explanation: 'Use a short controlled burn to slow the descent.' },
    { key: 'KeyS', action: 'Ease the thrust', explanation: 'Reduce thrust for the final approach.' },
    { key: 'Space', action: 'Deploy the landing legs', explanation: 'Prepare the lander for a gentle touchdown.' },
  ],
};

export interface FlightControlResult {
  accepted: boolean;
  progress: number;
  complete: boolean;
  expected?: FlightControlStep;
}

export function advanceFlightControls(
  stage: InteractiveFlightStage,
  progress: number,
  key: FlightControlKey,
): FlightControlResult {
  const steps = FLIGHT_CONTROL_STEPS[stage];
  if (!Number.isInteger(progress) || progress < 0 || progress >= steps.length) {
    return { accepted: false, progress, complete: progress === steps.length };
  }
  const expected = steps[progress];
  if (expected.key !== key) return { accepted: false, progress, complete: false, expected };
  const next = progress + 1;
  return { accepted: true, progress: next, complete: next === steps.length };
}

/** Small, readable commands for the bundled demo sim; the key prompts are authored game mechanics. */
export function flightCommandForControl(
  stage: InteractiveFlightStage,
  key: FlightControlKey,
  _progress: number,
): { action: string; [key: string]: unknown } | undefined {
  if (key === 'KeyW') return { action: 'set_throttle', throttle: stage === 'launch' ? 0.82 : 0.45 };
  if (key === 'KeyS') return { action: 'set_throttle', throttle: 0.18 };
  if (stage === 'launch' && key === 'KeyA') return attitudeTarget(-3);
  if (stage === 'launch' && key === 'KeyD') return attitudeTarget(0);
  if (stage === 'landing' && key === 'KeyA') return attitudeTarget(-4);
  if (stage === 'landing' && key === 'KeyD') return attitudeTarget(0);
  // The Space step is a simplified deployment prompt, not a claim that the ported sim models gear.
  return undefined;
}

function attitudeTarget(degrees: number) {
  const half = degrees * Math.PI / 360;
  return { action: 'set_attitude_target', quaternion: [Math.cos(half), 0, 0, Math.sin(half)] };
}
