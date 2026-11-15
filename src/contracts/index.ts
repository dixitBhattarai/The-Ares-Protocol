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
export interface StationTask {
  id: string;
  station: StationId;
  title: string;
  steps: readonly string[];
  reward: Effect;
  benefit: string;
  prevention: string;
}
export interface DelayedEffectDef {
  delayTurns: number;
  description: string;
  effect: Effect;
}
export type ChoiceRarity = 'standard' | 'vital' | 'experimental' | 'hazard-response';

export interface ChoicePresentation {
  icon?: string;
  summary?: string;
  rarity?: ChoiceRarity;
  badge?: string;
}

export interface Choice {
  id: string;
  label: string;
  explanation: string;
  effect: Effect;
  delayedEffect?: DelayedEffectDef;
  presentation?: ChoicePresentation;
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
  /** Session seed for authored, random hazard timing. Not a NASA forecast. */
  hazardSeed?: number;
  gameplayMode?: 'station-tasks';
  freeExploration?: boolean;
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
  survey?: import('./survey').SurveyState;
  rover?: import('./expedition').RoverState;
  fieldSample?: import('./exploration').FieldSample;
  taskRun?: {
    stormPrep?: import('./expedition').StormPreparation;
    radiationExposure?: number;
    session: number;
    elapsed: number;
    completedIds: readonly string[];
    activeTaskId?: string;
    /** Task IDs remain unavailable until these active-time expiries. */
    cooldowns?: Readonly<Record<string, number>>;
    protections: Partial<Record<StationId, number>>;
  };
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
export type GameAction = import('./survey').SurveyAction | import('./expedition').ExpeditionAction
  | { type: 'START_DIG'; pose: Vec3; suited: boolean; grounded: boolean }
  | { type: 'START_SAMPLE_RESEARCH'; pose: Vec3; grounded: boolean }
  | { type: 'FIELD_TICK'; runId: string; seconds: number; pose: Vec3; suited: boolean; grounded: boolean }
  | { type: 'SAMPLE_RESEARCH_STEP'; runId: string; control: string; pose: Vec3 }
  | { type: 'CANCEL_SAMPLE' }
  | { type: 'START_TASK'; taskId: string }
  | { type: 'COMPLETE_TASK'; completionId: string }
  | { type: 'CANCEL_TASK' }
  | { type: 'TICK'; seconds: number }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'CHOOSE'; choiceId: string };
export interface WorldAdapter {
  setBatteryRepair?(stage: number | null): void;
  setRover?(state: import('./expedition').RoverState, carrying: boolean): void;
  setSampleStage?(stage: import('./exploration').FieldSample['stage'] | 'empty', progress: number): void;
  setPlayerMotion?(motion: import('./exploration').PlayerMotion): void;
  setAvatarActivity?(activity: import('./exploration').AvatarActivity): void;
  setHabitatAccess?(access: import('./habitat').HabitatAccess): void;
  setAvailableTasks?(stations: readonly StationId[], offerId: string): void;
  setEarthOutside?(outside: boolean): void;
  getCameraYaw?(): number;
  setDoorState?(station: StationId, open: boolean): void;
  isDoorOpen?(station: StationId): boolean;
  setMotionPaused?(paused: boolean): void;
  setLevel?(level: 'earth' | 'space' | null): void;
  setConsoleHandler?(handler: ((index: number) => void) | null): void;
  setInterior?(station: StationId | null): void;
  setJourney?(progress: number | null): void;
  setObjective?(station: StationId | null): void;
  setEmergencyPath?(target: StationId | Vec3 | null, options?: { emergency?: boolean; label?: string; color?: string }): void;
  setActivityProgress?(progress: number): void;
  setFlightStage?(stage: FlightStage | null, progress: number): void;
  setCabinSeatState?(state: CabinSeatState): void;
  setLaunchFlight?(snapshot: Readonly<LaunchFlightSnapshot> | null): void;
  setLandingFlight?(snapshot: Readonly<LandingFlightSnapshot> | null): void;
  setPlayerPose(pose: Vec3): void;
  setState(state: Readonly<GameState>): void;
  render(): void;
  dispose(): void;
}
export type GravityBody = 'earth' | 'orbit' | 'mars';
export type FlightStage = 'launch' | 'orbit-autopilot' | 'transfer' | 'landing' | 'touchdown';
export type CabinSeatState = 'hidden' | 'available' | 'occupied';
/** Position in the orbit cabin controller space, metres, Y up. */
export const SPACECRAFT_SEAT: Readonly<Vec3> = Object.freeze({ x: 1.65, y: 0.8, z: 0.8 });
export interface LaunchFlightSnapshot {
  altitude: number;
  verticalSpeed: number;
  downrange: number;
  horizontalSpeed: number;
  pitch: number;
  throttle: number;
  fuel: number;
  elapsed: number;
  ignited: boolean;
  spaceReached: boolean;
}
export interface LandingFlightSnapshot {
  phase:'space'|'entry'|'approach';
  bank:number;
  forwardSpeed:number;
  heat:number;
  altitude:number;
  verticalSpeed:number;
  offset:number;
  horizontalSpeed:number;
  pitch:number;
  throttle:number;
  fuel:number;
  legs:boolean;
  assist:boolean;
  status:'flying'|'landed'|'retry';
  result:string;
}
export type FlightControlKey = 'KeyW' | 'KeyA' | 'KeyS' | 'KeyD' | 'KeyQ' | 'KeyE' | 'Space';
export interface FlightControlStep { key: FlightControlKey; action: string; explanation: string }
export interface GravityInfo {
  body: GravityBody;
  gravityMS2: number;
  relativeToEarth: number;
  jumpHeightM: number;
  canJump: boolean;
}
export interface PhysicsAdapter {
  setRoverMode?(enabled: boolean, pose?: Vec3, heading?: number): boolean;
  getRoverHeading?(): number;
  setRoverParking?(pose: Vec3): void;
  setRoverPower?(powered: boolean): void;
  setFreeRoam?(enabled:boolean):void;
  getMotionState?(): import('./exploration').PlayerMotion;
  requestJump?(): void;
  setHabitatAccess?(access: import('./habitat').HabitatAccess): void;
  setGravityBody?(body: GravityBody): void;
  getGravityInfo?(): GravityInfo;
  setDoorOpen?(station: StationId, open: boolean): void;
  walkPath?(points: readonly Vec3[]): void;
  setCameraYaw?(yaw: number): void;
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
  { id: 'habitat', position: { x: -7, y: 1, z: 0 } },
  { id: 'solar', position: { x: 7, y: 1, z: 0 } },
  { id: 'greenhouse', position: { x: 0, y: 1, z: -9 } },
];
export const BUILDING_HALF_SIZE = 3.2;
export const DOOR_HALF_WIDTH = .78;
