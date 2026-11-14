# Frozen integration contracts — v1

Canonical types and coordinates: `src/contracts/index.ts` (Rohit-owned). Keep public APIs compatible; request additive changes through your feature notes. Avoid casts that conceal mismatches.

| Owner / entry point | API | Caller |
| --- | --- | --- |
| Himamshu: `world/index.ts` | `createWorld(host: HTMLElement, onInteract: (station: StationId) => void): WorldAdapter` | App shell |
| Anshu: `physics/index.ts` | `createPhysics(): Promise<PhysicsAdapter>` | App shell |
| Genius: `missions/index.ts` | `loadMission(): MissionData` (synchronous, bundled evidence) | App shell |
| Rohit: `game/index.ts` | `createInitialState(mission): GameState`, `getCurrentEvent(mission, state): MissionEvent \| undefined`, `reduceGame(state, action, mission): GameState` | App shell |
| Saurav: `hud/HudOverlay.vue` | props `state: Readonly<GameState>`, `mission: MissionData`; no mutation | App shell |
| Dixit: `ui/MissionPanels.vue` | same props plus `event: MissionEvent \| undefined`; emit `action` carrying `GameAction` | App shell |

WorldAdapter: `setPlayerPose(Vec3)`, `setState(Readonly<GameState>)`, `render()`, `dispose()`. No separate animation loop.

PhysicsAdapter: `step(seconds)`, `getPlayerPose(): Vec3`, `dispose()`. App steps at 1/60 second only while running. Physics owns input and safe focus loss. Adapter v1 has no reset/pause-input method; propose these with Rohit, not by editing the shell on a physics branch.

## State and rules

- Phase: `ready | running | paused | won | lost`. `turn` is completed decisions, zero-based; `maxTurns` is total shifts.
- Reserves: `{ power, oxygen, supplies }` on a 0–100 authored game scale. Supplies includes food/construction stock. Not kWh, litres, dose or measured physiology.
- `shielding`: authored shelter score, 0–100, not a radiation measurement. `science`: progress toward target. `log`: child-readable resolved explanations.
- Actions: `START`, `PAUSE`, `RESUME`, `RESTART`, `CHOOSE { choiceId }`.
- `MissionData.events` must be nonempty. Event/choice IDs should be stable and unique. Starter cycles through `turn % events.length`; supply six events for six shifts.
- `Choice.effect.resources` has signed deltas; `shielding` and `science` are signed deltas. Every useful choice has a cost. Rohit owns clamping, depletion and completion.
- A choice advances a discrete shift regardless of walking/frame rate. No real-time reserve drain in v1.
- Starter permits choices that deplete reserves and loses at zero. Coordinate any future affordability restrictions and UI behavior with Dixit.
- Game owns immutable state updates. Keep Three/Rapier objects outside Vue's deep reactive state.

## Spatial convention

Metres, Y up, ground top Y=0. Surface X/Z -20..20; starter clamps astronaut centre to -18..18. Spawn `(0, 0.8, 5)`. Capsule radius .3 and cylindrical length 1. `STATIONS` defines habitat/solar/greenhouse centres; starter modules are `(3, 2, 3)` with collider half extents `(1.5, 1, 1.5)`. Coordinate changed layouts/envelopes through Rohit. World does not integrate movement; physics does not render.

## Evidence

`SourceRecord` requires ID, title, original URL, retrieval date, archived/live mode, usage notes and observation-to-game mapping; include observation date/units when relevant. Events reference source IDs. Keep raw fixtures, exact query and adaptation notes in `missions/data/`. `dataMode` stays `authored-demo` until a verified observation is used; bundled snapshots are `archived`, even if downloaded today.

A solar flare/CME is evidence about solar activity, not a crew-dose measurement on Mars. ISS dosimetry describes another environment. Neither alone establishes clinical health risk. Explain the simplification.
