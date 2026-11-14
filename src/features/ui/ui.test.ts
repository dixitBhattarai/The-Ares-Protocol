import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import MissionPanels from './MissionPanels.vue';
import { emitStart, emitChoose, emitPause, emitResume, emitRestart } from './actions';
import type { GameAction, GameState, MissionData } from '../../contracts';

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
