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
- `habitat`: `(-5, 1, 0)`
- `solar`: `(5, 1, 0)`
- `greenhouse`: `(0, 1, -6)`

## Additive world door/playback hooks — 14 Nov

Himamshu's user-requested door slice adds optional `setDoorState(station, open)`, `isDoorOpen(station)` and `setMotionPaused(paused)` methods to WorldAdapter. Shell owns each door's intent; world renders it and reports fully-open readiness after its 0.4-second slide (instant for reduced motion). Closed or still-opening doors cannot trigger entry. Pausing freezes door and character animations, including Earth/orbit preparation. No second loop is introduced.

Existing `setInterior`, `setLevel`, `setJourney`, `setConsoleHandler`, `setObjective`, `setActivityProgress` and physics `enterInterior`/`exitInterior` remain compatible. This implementation uses cutaway room portals, not seamless building collision geometry. Exterior doors face +Z. Approach/return is station `(x, .8, z + 2.65)`; the entry trigger is within .48m of door center X and relative Z 1.75..2.02, before the unchanged station collider face + capsule radius. Indoor exit is centered X within .55m and Z >= 2.4. Return uses the safe approach point to prevent immediate re-entry. No task or resource cost is required to explore a room. Closing a door changes navigation only; it does not invent shelter/radiation simulation effects.

Rohit retains engineering ownership after this explicitly authorized handoff. Task-first job rewards/card/loot migration is separately assigned and not implemented by these hooks.

## Scientific evidence record requirements

`SourceRecord` requires ID, title, original URL, retrieval date, archived/live mode, usage notes and observation-to-game mapping; include observation date/units when relevant. Real observations retain provenance in `src/features/missions/data/`. `dataMode` is `archived` for bundled snapshots.
