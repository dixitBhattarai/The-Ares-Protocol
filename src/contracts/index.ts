// Shared API v1. Rohit owns changes; feature owners consume these contracts.
export type Phase = 'ready' | 'running' | 'paused' | 'won' | 'lost';
export type ResourceId = 'power' | 'oxygen' | 'supplies';
export type StationId = 'habitat' | 'solar' | 'greenhouse';
export interface Vec3 { x: number; y: number; z: number }
export interface Resources { power: number; oxygen: number; supplies: number }
export interface Effect {
  resources?: Partial<Resources>;
  shielding?: number;
  science?: number;
}
export interface DelayedEffectDef {
  delayTurns: number;
  description: string;
  effect: Effect;
}
export interface Choice {
  id: string;
  label: string;
  explanation: string;
  effect: Effect;
  delayedEffect?: DelayedEffectDef;
}
export interface HazardEffect {
  minShielding: number;
  mitigatedLoss: Partial<Resources>;
  unmitigatedLoss: Partial<Resources>;
  mitigatedNotice: string;
  unmitigatedNotice: string;
}
export interface MissionEvent {
  id: string;
  title: string;
  description: string;
  choices: readonly Choice[];
  sourceIds: readonly string[];
  hazard?: HazardEffect;
}
export interface SourceRecord {
  id: string;
  title: string;
  url: string;
  retrievedAt: string;
  observedAt?: string;
  mode: 'archived' | 'live';
  units?: string;
  licenseNotes: string;
  mapping: string;
}
export interface MissionData {
  id: string;
  title: string;
  maxTurns: number;
  scienceTarget: number;
  initialResources: Resources;
  events: readonly MissionEvent[];
  sources: readonly SourceRecord[];
  dataMode: 'authored-demo' | 'archived' | 'live';
}

export type DebriefVerdict = 'won' | 'depleted' | 'low_science';

export interface DebriefDetails {
  verdict: DebriefVerdict;
  title: string;
  summary: string;
  primaryCause?: string;
  recommendations: readonly string[];
  lessons: readonly string[];
  stars?: number;
  score?: number;
}

export interface TurnRecord {
  turn: number;
  shift: number;
  eventId: string;
  eventTitle: string;
  choiceId: string;
  choiceLabel: string;
  explanation: string;
  hazardNotice?: string;
  resources: Resources;
  science: number;
  shielding: number;
}

export interface PendingDelayedEffect {
  dueTurn: number;
  description: string;
  effect: Effect;
}

export interface GameState {
  phase: Phase;
  turn: number;
  resources: Resources;
  shielding: number;
  science: number;
  log: readonly string[];
  history?: readonly TurnRecord[];
  debrief?: DebriefDetails;
  pendingDelayedEffects?: readonly PendingDelayedEffect[];
  lastHazardNotice?: string;
  upcomingHazardNotice?: string;
}
export type GameAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'CHOOSE'; choiceId: string };
export interface WorldAdapter {
  setInterior?(station: StationId | null): void;
  setJourney?(progress: number | null): void;
  setObjective?(station: StationId | null): void;
  setActivityProgress?(progress: number): void;
  setPlayerPose(pose: Vec3): void;
  setState(state: Readonly<GameState>): void;
  render(): void;
  dispose(): void;
}
export interface PhysicsAdapter {
  enterInterior?(): void;
  exitInterior?(): void;
  step(seconds: number): void;
  getPlayerPose(): Vec3;
  dispose(): void;
  reset?(pose?: Vec3): void;
  pauseInput?(): void;
  resumeInput?(): void;
}
// Units: metres, Y up, ground at Y=0. Keep rendering and collision layouts identical.
export const STATIONS: ReadonlyArray<{ id: StationId; position: Vec3 }> = [
  { id: 'habitat', position: { x: -5, y: 1, z: 0 } },
  { id: 'solar', position: { x: 5, y: 1, z: 0 } },
  { id: 'greenhouse', position: { x: 0, y: 1, z: -6 } },
];
