import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import VisualPreflightMinigame from './VisualPreflightMinigame.vue';
import { PREPARATION, advancePreparation } from '../world/preflight';

describe('VisualPreflightMinigame Component', () => {
  it('renders Earth Stage 0 (Fuel & Oxidizer pumps)', async () => {
    const app = createSSRApp(VisualPreflightMinigame, {
      level: 'earth',
      progress: 0,
      paused: false,
    });
    const html = await renderToString(app);

    expect(html).toContain('EARTH LAUNCH PAD');
    expect(html).toContain('FUEL');
    expect(html).toContain('OXYGEN');
    expect(html).toContain('Pump Rocket Fuel');
    expect(html).toContain('Pump Liquid Oxidizer');
    // Ensure no boring walls of text
    expect(html).not.toContain('WASD / arrows to move');
    expect(html).not.toContain('Move closer to the back-wall console');
  });

  it('renders Earth Stage 1 (O2 suit pressure pump)', async () => {
    const app = createSSRApp(VisualPreflightMinigame, {
      level: 'earth',
      progress: 1,
      paused: false,
    });
    const html = await renderToString(app);

    expect(html).toContain('PUMP!');
    expect(html).toContain('Oxygen pressure');
  });

  it('renders Earth Stage 2 (Cargo loading)', async () => {
    const app = createSSRApp(VisualPreflightMinigame, {
      level: 'earth',
      progress: 2,
      paused: false,
    });
    const html = await renderToString(app);

    expect(html).toContain('POWER');
    expect(html).toContain('FOOD');
    expect(html).toContain('TOOLS');
    expect(html).toContain('Load Power Battery');
  });

  it('renders Earth Stage 3 (Ignition with flip safety cover)', async () => {
    const app = createSSRApp(VisualPreflightMinigame, {
      level: 'earth',
      progress: 3,
      paused: false,
    });
    const html = await renderToString(app);

    expect(html).toContain('FLIP UP');
    expect(html).toContain('LAUNCH');
    expect(html).toContain('Safety Switch Cover');
  });

  it('renders Space Station Stage 0 (Radar dish steering)', async () => {
    const app = createSSRApp(VisualPreflightMinigame, {
      level: 'space',
      progress: 0,
      paused: false,
    });
    const html = await renderToString(app);

    expect(html).toContain('ORBITAL CABIN');
    expect(html).toContain('Earth Base');
    expect(html).toContain('LOCK');
    expect(html).toContain('Rotate Left');
  });

  it('renders Space Station Stage 1 (Oscilloscope wave matching)', async () => {
    const app = createSSRApp(VisualPreflightMinigame, {
      level: 'space',
      progress: 1,
      paused: false,
    });
    const html = await renderToString(app);

    expect(html).toContain('MATCH THE WAVE');
    expect(html).toContain('Frequency Oscilloscope');
    expect(html).toContain('Matching Waveform');
  });

  it('renders Space Station Stage 2 (Transmission uplink laser)', async () => {
    const app = createSSRApp(VisualPreflightMinigame, {
      level: 'space',
      progress: 2,
      paused: false,
    });
    const html = await renderToString(app);

    expect(html).toContain('TRANSMIT BEAM');
    expect(html).toContain('Beam Flight Plan to Earth');
  });

  it('supports pause and fast-forward controls', async () => {
    const app = createSSRApp(VisualPreflightMinigame, {
      level: 'earth',
      progress: 0,
      paused: true,
    });
    const html = await renderToString(app);

    expect(html).toContain('Resume');
    expect(html).toContain('Fast-Forward');
  });

  it('advances all Earth and Orbit steps predictably with contracts', () => {
    for (const level of ['earth', 'space'] as const) {
      const steps = PREPARATION[level].steps;
      let progress = 0;
      for (const step of steps) {
        progress = advancePreparation(level, progress, step);
      }
      expect(progress).toBe(PREPARATION[level].steps.length);
    }
  });
});
