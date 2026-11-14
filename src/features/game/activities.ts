import type { Choice, MissionEvent, StationId } from '../../contracts';

export interface Activity {
  station: StationId;
  title: string;
  steps: readonly string[];
}

/** A station procedure completes the selected authored choice; it adds no bonus rewards. */
export function getActivity(event: MissionEvent, choice: Choice): Activity {
  if (choice.id === 'shield') return {
    station: event.id.includes('greenhouse') ? 'greenhouse' : 'habitat', title: choice.label,
    steps: ['Inspect seals', 'Close protective panels', 'Lock safety latches'],
  };
  if (choice.id === 'oxygen') return {
    station: 'habitat', title: choice.label, steps: ['Check air filter', 'Open intake valve', 'Start air processor'],
  };
  if (event.id.includes('greenhouse')) return {
    station: 'greenhouse', title: choice.label, steps: ['Check water loop', 'Set grow lights', 'Log plant readings'],
  };
  return { station: 'solar', title: choice.label, steps: choice.id === 'comms'
    ? ['Align antenna', 'Encode telemetry', 'Send transmission']
    : ['Connect instrument', 'Calibrate sensor', 'Record observations'] };
}

export function advanceActivity(activity: Activity, progress: number, control: string): number {
  if (!Number.isInteger(progress) || progress < 0 || progress >= activity.steps.length) return progress;
  return activity.steps[progress] === control ? progress + 1 : progress;
}
