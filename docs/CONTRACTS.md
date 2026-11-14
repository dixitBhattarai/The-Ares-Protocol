# Frozen integration contracts — v1 & additive extensions

Canonical types and coordinates: `src/contracts/index.ts` (Rohit-owned). Public APIs are frozen with additive backwards-compatible fields.

| Owner / entry point | API | Caller |
| --- | --- | --- |
| Himamshu: `world/index.ts` | `createWorld(host: HTMLElement, onInteract: (station: StationId) => void): WorldAdapter` | App shell |
| Anshu: `physics/index.ts` | `createPhysics(): Promise<PhysicsAdapter>` | App shell |
| Genius: `missions/index.ts` | `loadMission(): MissionData` (synchronous, bundled evidence) | App shell |
| Rohit: `game/index.ts` | `createInitialState(mission): GameState`, `getCurrentEvent(mission, state): MissionEvent \| undefined`, `reduceGame(state, action, mission): GameState` | App shell |
| Saurav: `hud/HudOverlay.vue` | props `state: Readonly<GameState>`, `mission: MissionData`; no mutation | App shell |
| Dixit: `ui/MissionPanels.vue` | same props plus `event: MissionEvent \| undefined`; emit `action` carrying `GameAction` | App shell |

## World & Physics Adapters

- **WorldAdapter**: `setPlayerPose(Vec3)`, `setState(Readonly<GameState>)`, `render()`, `dispose()`. Single animation loop lives in `App.vue`.
- **PhysicsAdapter**: `step(seconds)`, `getPlayerPose(): Vec3`, `dispose()`.
  - Additive optional lifecycle hooks:
    - `reset?(pose?: Vec3): void`: Resets astronaut position and velocity back to spawn (or given pose) and clears held keys.
    - `pauseInput?(): void`: Clears held keys and suppresses keyboard motion while game is paused.
    - `resumeInput?(): void`: Resumes keyboard motion processing.

## State and Rules

- **Phase**: `ready | running | paused | won | lost`. `turn` is completed decisions, zero-based; `maxTurns` is total shifts.
- **Reserves**: `{ power, oxygen, supplies }` on a 0–100 authored game scale. Supplies includes food/construction stock.
- **Shielding**: authored shelter score, 0–100.
- **Science**: progress toward target.
- **Log**: child-readable resolved explanations.
- **Additive GameState Fields**:
  - `debrief?: DebriefDetails`: Structured outcome containing verdict (`won` | `depleted` | `low_science`), title, summary, primaryCause, flight director recommendations, spaceflight lessons, star rating (`stars: 0..3`), and efficiency score (`score: number`).
  - `history?: readonly TurnRecord[]`: Turn-by-turn log recording shift number, choice, explanation, hazard notice, and reserve snapshots for debrief timeline replay.
  - `pendingDelayedEffects?: readonly PendingDelayedEffect[]`: Queued delayed consequences (e.g., speed-of-light radio delay from Earth).
  - `lastHazardNotice?: string`: Most recent hazard mitigation or unmitigated damage alert.
- **Additive Event & Choice Fields**:
  - `MissionEvent.hazard?: HazardEffect`: Defines `minShielding`, `mitigatedLoss`, `unmitigatedLoss`, and child-readable notices.
  - `Choice.delayedEffect?: DelayedEffectDef`: Defines `delayTurns`, `description`, and `effect` applied when the due turn arrives.

## Spatial Convention

Metres, Y up, ground top Y=0. Surface X/Z -20..20; astronaut clamped to -18..18. Spawn `(0, 0.8, 5)`. Stations located at:
- `habitat`: `(-7, 1, 0)`
- `solar`: `(7, 1, 0)`
- `greenhouse`: `(0, 1, -9)`

## Additive world door/playback hooks — 14 Nov

Himamshu's user-requested door slice adds optional `setDoorState(station, open)`, `isDoorOpen(station)` and `setMotionPaused(paused)` methods to WorldAdapter. Shell owns each door's intent; world renders it and reports fully-open readiness after its 0.4-second slide (instant for reduced motion). Closed or still-opening doors cannot trigger entry. Pausing freezes door and character animations, including Earth/orbit preparation. No second loop is introduced.

Existing hooks remain compatible. Physics `enterInterior`/`exitInterior` now serve only the separate orbit cabin. Earth/Mars use hollow buildings in the exterior world: crossing the doorway never resets the pose or swaps room scenes. `setInterior` selects presentation/console context only.

User-authorized spatial update: `BUILDING_HALF_SIZE=3.2`, ground Y=0, walls height 2.6 and thickness .2. Side walls are local X=±3.1, back Z=-3.1, front Z=3.1 with a centered opening X=±.78 (`DOOR_HALF_WIDTH`). Floor is 6.5 square. Door collider half extents are (.78,1.15,.1), center (0,1.15,3.1). Desks, habitat bunks, greenhouse planters and solar racks also have physics obstacles. Station centers moved apart to prevent the larger rooms overlapping.

Approach is station `(x,.8,z+4.3)`. Presentation considers |local X| and |local Z| <3.05 inside. The shell checks |X|<1.15 and .65m around front Z=3.2 before allowing closure, preventing player entrapment. Optional `PhysicsAdapter.setDoorOpen(station,open)` enables/disables the solid door; App permits passage only after world reports fully-open animation readiness. Optional `walkPath(points: readonly Vec3[])` guides horizontal walking through collisions at normal speed. Manual movement, blur, pause, reset and dispose cancel the route; this is not a pathfinder. Accessible travel *to a door* remains explicit; Enter/Exit buttons walk through the opening. Entry/exit alone grants no reserves, shielding or health effects.

Rohit retains engineering ownership after this explicitly authorized handoff. Task-first job rewards/card/loot migration is separately assigned and not implemented by these hooks.

## Scientific evidence record requirements

`SourceRecord` requires ID, title, original URL, retrieval date, archived/live mode, usage notes and observation-to-game mapping; include observation date/units when relevant. Real observations retain provenance in `src/features/missions/data/`. `dataMode` is `archived` for bundled snapshots.

## Additive exploration camera / Earth hooks — 14 Nov

WorldAdapter optionally supplies getCameraYaw(): number and setEarthOutside(outside: boolean). PhysicsAdapter optionally accepts setCameraYaw(yaw: number). Yaw is radians around world +Y, measured from camera-target +Z; forward input moves opposite that horizontal camera offset. Default/overview yaw is zero. App supplies heading before physics fixed steps. Earth training lab uses the same continuous world/colliders as Mars. Orbit alone retains a bounded cabin. The shell owns stage changes; physics owns walking poses. Camera controls are updated/disposed inside world and never schedule another RAF.

## Additive station task cues — 14 Nov

WorldAdapter.setAvailableTasks?(stations: readonly StationId[], offerId: string) renders available-task markers and one dismissible timed notice when the stable offer ID changes. App derives stations from existing mission/activity exports and uses mission ID + turn as the offer ID; pause preserves the current offer, ready/terminal states clear it. App owns the sound cue and honors the existing mute flag. This API changes no simulation resources. Station minigames emit one completed procedure check at a time; only the existing final App completion dispatch resolves the task outcome. Computer raycasts open the game/deck rather than advancing checks directly. The future separate post-task card/loot state machine is not implied by this API.

## Additive Earth launch and Mars landing hooks — 14 Nov

`FlightStage` is `launch | orbit-autopilot | transfer | landing | touchdown`. `WorldAdapter.setFlightStage?(stage, progress)` optionally renders the shell-owned stage and normalized progress: a launch-pad ascent, compressed transfer, or guided Mars descent. `setFlightStage(null, 0)` restores the ordinary Earth/Mars view. This is additive and does not change `createWorld` or the existing `setJourney` hook.

The shell owns the stage sequence and completes Earth departure checks for propellant, cabin air/suit seals, food/water/science cargo, power, guidance and the launch window. Launch controls use Space/W/A/D; Mars landing uses A/D/W/S/Space. The ported spacecraft sim receives simple throttle and attitude commands and supplies telemetry; the prompts and stage timing are authored game mechanics. Autopilot compresses cruise time. These visuals and checks do not represent a real vehicle, launch checklist, mission duration or astronaut training. The single App animation loop remains the only driver; flight visuals and telemetry stop on pause, hidden tab and disposal.
