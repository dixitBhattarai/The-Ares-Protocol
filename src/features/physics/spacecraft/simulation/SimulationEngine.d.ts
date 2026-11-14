// Hand-written typings so TypeScript can consume the JS engine without enabling allowJs.
export interface SimulationEngineConfig {
  dtPhysics?: number;
  maxStepsPerTick?: number;
  contactEnabled?: boolean;
  /** true = the caller drives the engine with advance(); no internal setInterval. */
  externalLoop?: boolean;
}

export interface FlightCommand {
  action: string;
  [key: string]: unknown;
}

export interface SpacecraftSnapshot {
  time_s: number;
  mission_elapsed_time_s: number;
  time_scale: number;
  is_running: boolean;
  primary_body: { id: string; name: string; radius_m: number; mass_kg: number };
  spacecraft: {
    position_m: number[];
    velocity_m_s: number[];
    orientation_quaternion: number[];
    angular_velocity_rad_s: number[];
    speed_m_s: number;
    altitude_m: number;
    total_mass_kg: number;
    propellant_mass_kg: number;
    delta_v_remaining_m_s: number;
    landing_state: string;
    [key: string]: unknown;
  };
  power: Record<string, number | null>;
  thermal: { nodes: Array<{ id: string; name: string; temperature_K: number; temperature_C: number }> };
  life_support: Record<string, number>;
  radiation: Record<string, unknown>;
  comms: Record<string, unknown>;
  contact: unknown;
  events: unknown;
  [key: string]: unknown;
}

export class SimulationEngine {
  constructor(config?: SimulationEngineConfig);
  isRunning: boolean;
  timeScale: number;
  simulationTimeSeconds: number;
  currentPresetId: string;
  loadPreset(presetKey: string): void;
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  setTimeScale(scale: number): void;
  queueCommand(cmd: FlightCommand): void;
  advance(elapsedSeconds: number): void;
  getStateSnapshot(): SpacecraftSnapshot;
}
