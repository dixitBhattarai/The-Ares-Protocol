import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import MissionPanels from './MissionPanels.vue';
import { emitStart, emitChoose, emitPause, emitResume, emitRestart } from './actions';
import type { GameAction, GameState, MissionData, TurnRecord } from '../../contracts';

const mockMission: MissionData = {
  id: 'test-mission',
  title: 'Test Mars Mission',
  maxTurns: 6,
  scienceTarget: 3,
  initialResources: { power: 70, oxygen: 70, supplies: 70 },
  dataMode: 'authored-demo',
  sources: [],
  events: [
    {
      id: 'event-1',
      title: 'Power Allocation Shift',
      description: 'Choose which subsystem receives power this shift.',
      sourceIds: [],
      choices: [
        {
          id: 'choice-oxygen',
          label: 'Run Oxygen Scrubber',
          explanation: 'Generates oxygen at the expense of power.',
          effect: { resources: { power: -10, oxygen: 15, supplies: -5 } },
        },
        {
          id: 'choice-research',
          label: 'Perform Geology Experiment',
          explanation: 'Conduct mineral analysis for science.',
          effect: { resources: { power: -8, oxygen: -5, supplies: -5 }, science: 1 },
          delayedEffect: {
            delayTurns: 1,
            description: 'Sample analysis completed by Earth science teams.',
            effect: { science: 1 },
          },
        },
      ],
    },
  ],
};

const mockMissionWithSources: MissionData = {
  ...mockMission,
  dataMode: 'archived',
  sources: [
    {
      id: 'source-curiosity',
      title: 'NASA Curiosity Rover RAD Telemetry',
      url: 'https://mars.nasa.gov/msl/mission/instruments/rad/',
      retrievedAt: '2026-11-14',
      observedAt: '2023-08-15',
      mode: 'archived',
      units: 'microgray/day',
      licenseNotes: 'Public domain NASA/JPL-Caltech data release',
      mapping: 'Solar energetic particle peaks mapped to outpost shelter requirements.',
    },
  ],
};

describe('UI Action Emitters', () => {
  it('emits START action for onboarding', () => {
    const emitted: GameAction[] = [];
    emitStart((_, action) => emitted.push(action));
    expect(emitted).toEqual([{ type: 'START' }]);
  });

  it('emits CHOOSE action with specific choiceId', () => {
    const emitted: GameAction[] = [];
    emitChoose((_, action) => emitted.push(action), 'choice-oxygen');
    expect(emitted).toEqual([{ type: 'CHOOSE', choiceId: 'choice-oxygen' }]);

    emitChoose((_, action) => emitted.push(action), 'choice-research');
    expect(emitted).toEqual([
      { type: 'CHOOSE', choiceId: 'choice-oxygen' },
      { type: 'CHOOSE', choiceId: 'choice-research' },
    ]);
  });

  it('emits PAUSE action when pause is requested', () => {
    const emitted: GameAction[] = [];
    emitPause((_, action) => emitted.push(action));
    expect(emitted).toEqual([{ type: 'PAUSE' }]);
  });

  it('emits RESUME action when resume is requested', () => {
    const emitted: GameAction[] = [];
    emitResume((_, action) => emitted.push(action));
    expect(emitted).toEqual([{ type: 'RESUME' }]);
  });

  it('emits RESTART action when play again is requested', () => {
    const emitted: GameAction[] = [];
    emitRestart((_, action) => emitted.push(action));
    expect(emitted).toEqual([{ type: 'RESTART' }]);
  });
});

describe('MissionPanels Rendering - Onboarding and Decisions', () => {
  it('renders onboarding briefing in ready phase with goals and controls', async () => {
    const state: GameState = {
      phase: 'ready',
      turn: 0,
      resources: { power: 70, oxygen: 70, supplies: 70 },
      shielding: 0,
      science: 0,
      log: [],
    };
    const app = createSSRApp(MissionPanels, {
      state,
      mission: mockMission,
      event: mockMission.events[0],
    });
    const html = await renderToString(app);

    // Goal and explanation verification
    expect(html).toContain('Welcome to Mars Outpost Ares!');
    expect(html).toContain('Survive 6 Shifts');
    expect(html).toContain('3 Science Points');
    expect(html).toContain('Zero-Reserve Rule');

    // Controls guide verification
    expect(html).toContain('How to Play');
    expect(html).toContain('Arrow Keys');
    expect(html).toContain('Start Mission (Shift 1)');

    // Modules overview verification
    expect(html).toContain('Solar Station');
    expect(html).toContain('Hab &amp; Shelter');
    expect(html).toContain('Greenhouse');
  });

  it('renders running phase decision cards with explicit costs, benefits, and delayed effects', async () => {
    const state: GameState = {
      phase: 'running',
      turn: 0,
      resources: { power: 70, oxygen: 70, supplies: 70 },
      shielding: 0,
      science: 0,
      log: ['Telemetry initialized for Shift 1.'],
      lastHazardNotice: 'Space radiation advisory active.',
    };
    const app = createSSRApp(MissionPanels, {
      state,
      mission: mockMission,
      event: mockMission.events[0],
    });
    const html = await renderToString(app);

    // Shift info
    expect(html).toContain('Shift 1 of 6');
    expect(html).toContain('Power Allocation Shift');

    // Choice cards and explicit +/- deltas
    expect(html).toContain('Run Oxygen Scrubber');
    expect(html).toContain('Perform Geology Experiment');
    expect(html).toContain('⚡ Power -10');
    expect(html).toContain('💨 Oxygen +15');
    expect(html).toContain('📦 Supplies -5');
    expect(html).toContain('🔬 Science +1');

    // Delayed effects preview
    expect(html).toContain('Arrives in 1 shifts');
    expect(html).toContain('Sample analysis completed by Earth science teams.');

    // Hazard notice and log
    expect(html).toContain('Space radiation advisory active.');
    expect(html).toContain('Telemetry initialized for Shift 1.');

    // Pause button
    expect(html).toContain('Pause');
  });

  it('renders paused phase with resume button', async () => {
    const state: GameState = {
      phase: 'paused',
      turn: 1,
      resources: { power: 60, oxygen: 65, supplies: 65 },
      shielding: 0,
      science: 0,
      log: ['Shift 1 completed.'],
    };
    const app = createSSRApp(MissionPanels, {
      state,
      mission: mockMission,
      event: mockMission.events[0],
    });
    const html = await renderToString(app);

    expect(html).toContain('Mission Paused');
    expect(html).toContain('Resume Mission');
  });
});

describe('MissionPanels Rendering - Debrief and Turn History', () => {
  const historyFixture: TurnRecord[] = [
    {
      turn: 0,
      shift: 1,
      eventId: 'event-1',
      eventTitle: 'Power Allocation Shift',
      choiceId: 'choice-oxygen',
      choiceLabel: 'Run Oxygen Scrubber',
      explanation: 'Generates oxygen at the expense of power.',
      resources: { power: 60, oxygen: 85, supplies: 65 },
      science: 0,
      shielding: 0,
    },
    {
      turn: 1,
      shift: 2,
      eventId: 'event-1',
      eventTitle: 'Power Allocation Shift',
      choiceId: 'choice-research',
      choiceLabel: 'Perform Geology Experiment',
      explanation: 'Conduct mineral analysis for science.',
      hazardNotice: 'Solar wind increased atmospheric ionization.',
      resources: { power: 52, oxygen: 80, supplies: 60 },
      science: 1,
      shielding: 0,
    },
  ];

  it('renders won debrief with constructive feedback, lessons, and turn timeline', async () => {
    const wonState: GameState = {
      phase: 'won',
      turn: 6,
      resources: { power: 30, oxygen: 45, supplies: 25 },
      shielding: 20,
      science: 4,
      log: ['Mission accomplished.'],
      history: historyFixture,
      debrief: {
        verdict: 'won',
        title: 'Outpost Mission Accomplished!',
        summary: 'Your crew maintained all life-support reserves across all 6 shifts and gathered 4 / 3 science points!',
        recommendations: [
          'Outstanding mission planning! You balanced survival maintenance with scientific goals.',
          'Try another run with different decision paths to explore alternative outpost strategies.',
        ],
        lessons: [
          'Mars exploration requires constant balance between keeping systems online and gathering scientific knowledge.',
          'Proactive hazard shielding protects critical solar arrays and atmosphere scrubbers.',
        ],
      },
    };

    const app = createSSRApp(MissionPanels, {
      state: wonState,
      mission: mockMission,
      event: undefined,
    });
    const html = await renderToString(app);

    // Title and verdict
    expect(html).toContain('Outpost Mission Accomplished!');
    expect(html).toContain('Mission Success');
    expect(html).toContain('Outstanding mission planning!');

    // Lessons
    expect(html).toContain('Mars exploration requires constant balance');
    expect(html).toContain('Proactive hazard shielding protects critical solar arrays');

    // Turn-by-turn history
    expect(html).toContain('Turn-by-Turn Mission Timeline');
    expect(html).toContain('Shift 1');
    expect(html).toContain('Run Oxygen Scrubber');
    expect(html).toContain('Shift 2');
    expect(html).toContain('Perform Geology Experiment');
    expect(html).toContain('Solar wind increased atmospheric ionization.');

    // Restart button
    expect(html).toContain('Play Again (New Mission)');
  });

  it('renders lost debrief due to depletion with non-shaming root cause and advice', async () => {
    const lostState: GameState = {
      phase: 'lost',
      turn: 3,
      resources: { power: 0, oxygen: 50, supplies: 45 },
      shielding: 0,
      science: 2,
      log: ['Power failed.'],
      history: historyFixture,
      debrief: {
        verdict: 'depleted',
        title: 'Mission Terminated: Reserves Depleted',
        primaryCause: 'POWER reached 0 on Shift 3.',
        summary: 'The outpost ran out of critical power during Shift 3. On Mars, power, air, and supplies must all stay above zero to survive.',
        recommendations: [
          'Conserve battery power and reinforce shelter before solar hazards strike.',
          'Prepare shelter in Shift 2 to avoid severe storm damage in Shift 3.',
        ],
        lessons: [
          'All life-support subsystems are interconnected; a failure in any reserve ends the mission.',
          'Greedy research strategies without infrastructure preparation are unsustainable.',
        ],
      },
    };

    const app = createSSRApp(MissionPanels, {
      state: lostState,
      mission: mockMission,
      event: undefined,
    });
    const html = await renderToString(app);

    expect(html).toContain('Mission Terminated: Reserves Depleted');
    expect(html).toContain('POWER reached 0 on Shift 3.');
    expect(html).toContain('Root Cause Analysis:');
    expect(html).toContain('Conserve battery power and reinforce shelter');
    expect(html).toContain('All life-support subsystems are interconnected');
    expect(html).toContain('Play Again (New Mission)');
  });

  it('renders lost debrief due to low science', async () => {
    const lowScienceState: GameState = {
      phase: 'lost',
      turn: 6,
      resources: { power: 40, oxygen: 60, supplies: 50 },
      shielding: 15,
      science: 2,
      log: ['Surviving completed but science incomplete.'],
      debrief: {
        verdict: 'low_science',
        title: 'Reserves Survived, But Science Goals Incomplete',
        primaryCause: 'Collected 2 / 3 science points.',
        summary: 'Your outpost survived all 6 shifts, but did not collect enough scientific data.',
        recommendations: [
          'Conduct scientific research during shifts when reserves are safely above 40%.',
        ],
        lessons: [
          'Surviving is necessary, but the ultimate purpose of planetary exploration is scientific discovery.',
        ],
      },
    };

    const app = createSSRApp(MissionPanels, {
      state: lowScienceState,
      mission: mockMission,
      event: undefined,
    });
    const html = await renderToString(app);

    expect(html).toContain('Reserves Survived, But Science Goals Incomplete');
    expect(html).toContain('Collected 2 / 3 science points.');
    expect(html).toContain('Conduct scientific research during shifts when reserves are safely above 40%.');
  });
});

describe('MissionPanels Rendering - Science Sources and Attributions', () => {
  it('renders honest empty-source state in authored-demo mode', async () => {
    const state: GameState = {
      phase: 'ready',
      turn: 0,
      resources: { power: 70, oxygen: 70, supplies: 70 },
      shielding: 0,
      science: 0,
      log: [],
    };
    const app = createSSRApp(MissionPanels, {
      state,
      mission: mockMission,
      event: undefined,
    });
    const html = await renderToString(app);

    expect(html).toContain('Science &amp; sources');
    expect(html).toContain('authored-demo');
    expect(html).toContain('Honest Attribution Note:');
    expect(html).toContain('No external NASA telemetry datasets are currently loaded');
    expect(html).toContain('educational prototype');
    expect(html).toContain('NASA does not endorse any non-U.S. Government entity');
  });

  it('renders source credits with clickable links, observation dates, and mapping notes', async () => {
    const state: GameState = {
      phase: 'running',
      turn: 2,
      resources: { power: 50, oxygen: 60, supplies: 60 },
      shielding: 10,
      science: 1,
      log: ['Telemetry ongoing.'],
    };
    const app = createSSRApp(MissionPanels, {
      state,
      mission: mockMissionWithSources,
      event: mockMissionWithSources.events[0],
    });
    const html = await renderToString(app);

    // Mode and title
    expect(html).toContain('archived');
    expect(html).toContain('Archived NASA Evidence');

    // Link and metadata
    expect(html).toContain('href="https://mars.nasa.gov/msl/mission/instruments/rad/"');
    expect(html).toContain('NASA Curiosity Rover RAD Telemetry');
    expect(html).toContain('2026-11-14');
    expect(html).toContain('2023-08-15');
    expect(html).toContain('microgray/day');
    expect(html).toContain('Solar energetic particle peaks mapped to outpost shelter requirements.');
    expect(html).toContain('Public domain NASA/JPL-Caltech data release');

    // Physics caveat
    expect(html).toContain('Space Physics Clarification:');
    expect(html).toContain('NASA does not endorse any non-U.S. Government entity');
  });
});
