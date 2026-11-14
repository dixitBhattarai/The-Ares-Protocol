import type { MissionData } from '../../contracts';

// Deliberately authored balancing numbers. Genius replaces/extends this with
// verified evidence and provenance; never label this starter as NASA data.
export function loadMission(): MissionData {
  return {
    id: 'mars-starter',
    title: 'Keep the outpost running',
    maxTurns: 6,
    scienceTarget: 3,
    initialResources: { power: 70, oxygen: 70, supplies: 70 },
    dataMode: 'authored-demo',
    sources: [],
    events: [{
      id: 'power-budget',
      title: 'One battery, two jobs',
      description: 'Choose how to use this shift. Every choice uses supplies and power.',
      sourceIds: [],
      choices: [
        { id: 'oxygen', label: 'Run the oxygen maker', explanation: 'Making breathable air uses power and supplies.', effect: { resources: { power: -12, oxygen: 18, supplies: -5 } } },
        { id: 'research', label: 'Study a rock sample', explanation: 'Science uses energy and air while the crew works.', effect: { resources: { power: -8, oxygen: -8, supplies: -5 }, science: 1 } },
        { id: 'shield', label: 'Improve the shelter', explanation: 'Extra protection costs construction supplies and energy.', effect: { resources: { power: -6, oxygen: -4, supplies: -15 }, shielding: 15 } },
      ],
    }],
  };
}
