import type { Choice, MissionEvent, StationId } from '../../contracts';

export interface Activity {
  station: StationId;
  title: string;
  steps: readonly string[];
}

/** A station procedure completes the selected authored choice; it adds no bonus rewards. */
export function getActivity(event: MissionEvent, choice: Choice): Activity {
  const title = choice.label || 'Station Procedure';

  if (choice.id === 'shield') {
    const station: StationId = event.id.includes('greenhouse') ? 'greenhouse' : 'habitat';
    let steps: readonly string[] = ['Inspect seals', 'Close protective panels', 'Lock safety latches'];
    if (event.id.includes('shift-1')) {
      steps = ['Stack regolith sandbags', 'Inspect radiation shielding', 'Verify bunker pressure'];
    } else if (event.id.includes('shift-2')) {
      steps = ['Inspect storm bunker', 'Reinforce shelter walls', 'Test radiation sensors'];
    } else if (event.id.includes('shift-3')) {
      steps = ['Retract external sensors', 'Lock bunker blast shields', 'Engage radiation barrier'];
    } else if (event.id.includes('shift-4')) {
      steps = ['Dim growth lights', 'Draw thermal blankets', 'Seal greenhouse dome'];
    } else if (event.id.includes('shift-5')) {
      steps = ['Inspect antenna motors', 'Reinforce shelter frame', 'Secure cable conduits'];
    } else if (event.id.includes('shift-6')) {
      steps = ['Reinforce dome struts', 'Close storm shutters', 'Arm automated diagnostics'];
    }
    return { station, title, steps };
  }

  if (choice.id === 'oxygen') {
    const station: StationId = 'habitat';
    let steps: readonly string[] = ['Check air filter', 'Open intake valve', 'Start air processor'];
    if (event.id.includes('shift-1')) {
      steps = ['Warm solid oxide cell', 'Intake Martian CO2', 'Compress breathable O2'];
    } else if (event.id.includes('shift-2')) {
      steps = ['Inspect scrubber filters', 'Flush chemical absorbents', 'Recycle atmosphere loop'];
    } else if (event.id.includes('shift-3')) {
      steps = ['Isolate habitat circuits', 'Check emergency air banks', 'Equalize room pressure'];
    } else if (event.id.includes('shift-4')) {
      steps = ['Inspect hydroponic aeration', 'Start oxygen diffuser', 'Balance bioreactor loop'];
    } else if (event.id.includes('shift-5')) {
      steps = ['Buffer reserve tanks', 'Check seal integrity', 'Optimize air circulation'];
    } else if (event.id.includes('shift-6')) {
      steps = ['Top off oxygen tanks', 'Calibrate gas detectors', 'Verify survival margin'];
    }
    return { station, title, steps };
  }

  if (event.id.includes('greenhouse')) {
    return {
      station: 'greenhouse',
      title,
      steps: ['Adjust LED grow spectra', 'Check nutrient solution', 'Log plant growth readings'],
    };
  }

  if (choice.id === 'comms') {
    return {
      station: 'solar',
      title,
      steps: ['Align high-gain dish', 'Encode Earth telemetry', 'Transmit over Deep Space Network'],
    };
  }

  // General research / sensor deployment at solar station
  let steps: readonly string[] = ['Connect instrument', 'Calibrate sensor', 'Record observations'];
  if (event.id.includes('shift-1')) {
    steps = ['Deploy surface spectrometer', 'Calibrate soil sensor', 'Record mineral telemetry'];
  } else if (event.id.includes('shift-2')) {
    steps = ['Check rover battery', 'Drive sample drill', 'Catalog core samples'];
  } else if (event.id.includes('shift-3')) {
    steps = ['Power radiation sensors', 'Measure proton storm flux', 'Log space weather telemetry'];
  } else if (event.id.includes('shift-5')) {
    steps = ['Run automated bio-assay', 'Analyze mineral spectrum', 'Store local research logs'];
  } else if (event.id.includes('shift-6')) {
    steps = ['Power surface instruments', 'Complete sensor mosaic', 'Compile expedition findings'];
  }

  return { station: 'solar', title, steps };
}

export function advanceActivity(activity: Activity, progress: number, control: string): number {
  if (!Number.isInteger(progress) || progress < 0 || progress >= activity.steps.length) return progress;
  return activity.steps[progress] === control ? progress + 1 : progress;
}
