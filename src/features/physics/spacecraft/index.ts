import { SimulationEngine } from './simulation/SimulationEngine.js';
import type { FlightCommand, SpacecraftSnapshot } from './simulation/SimulationEngine.js';

export type { FlightCommand, SpacecraftSnapshot };

/**
 * Spacecraft flight sim for the "space" level (launch / transit / landing).
 * The App's single animation loop calls step(seconds); there is no internal timer.
 * Independent of the astronaut PhysicsAdapter (contracts stay frozen at v1).
 */
export interface SpacecraftSim {
  step(seconds: number): void;
  command(cmd: FlightCommand): void;
  loadPreset(presetKey: string): void;
  setTimeScale(scale: number): void;
  getSnapshot(): Readonly<SpacecraftSnapshot>;
  pause(): void;
  resume(): void;
  dispose(): void;
}

export function createSpacecraftSim(presetKey = 'LEO_CIRCULAR'): SpacecraftSim {
  const engine = new SimulationEngine({ externalLoop: true });
  engine.loadPreset(presetKey);
  engine.start();
  let disposed = false;

  return {
    step(seconds) {
      if (!disposed) engine.advance(seconds);
    },
    command(cmd) {
      if (!disposed) engine.queueCommand(cmd);
    },
    loadPreset(key) {
      if (!disposed) engine.loadPreset(key);
    },
    setTimeScale(scale) {
      engine.setTimeScale(scale);
    },
    getSnapshot() {
      return engine.getStateSnapshot();
    },
    pause() {
      engine.pause();
    },
    resume() {
      if (!disposed) engine.resume();
    },
    dispose() {
      disposed = true;
      engine.pause();
    },
  };
}
