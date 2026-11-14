# Spacecraft physics — where it lives and how to use or replace it

Folder: `src/features/physics/spacecraft/` (owner: physics). Ported from the standalone hackathon backend.

## What it is
A deterministic spacecraft simulation (orbits, RK4 6-DOF attitude, propulsion, power, thermal, life support,
comms delay, landing/contact). It is **separate from the astronaut controller** in `../index.ts`
(`createPhysics`, Rapier, walking on Mars). The two do not share pose state. The App composes both in its single loop and sends flight stage/progress through the optional `WorldAdapter.setFlightStage` hook.

## Entry point (the only thing the game should import)
```ts
import { createSpacecraftSim } from '../physics/spacecraft'; // via Rohit's shell composition
const sim = createSpacecraftSim('LEO_CIRCULAR');
// inside the ONE App.vue animation loop:
sim.step(1 / 60);
const s = sim.getSnapshot();            // plain JSON-like object, safe to read every frame
sim.command({ action: 'set_throttle', throttle: 0.6 });
// teardown
sim.dispose();
```
No timers, no network, no globals: the caller supplies time. `sim.setTimeScale(1..1000)` for time warp
(auto-capped near surface/burns).

### Presets (`config/presets.js`)
`EARTH_LAUNCH_ASCENT`, `LEO_CIRCULAR` (default), `LUNAR_LANDING_DESCENT`, `LUNAR_FINAL_APPROACH`, `MARS_ATMOSPHERIC_ENTRY`, `MARS_POWERED_DESCENT`.
Add a new preset there; `loadPreset(key)` picks it up.

### Commands (`simulation/SimulationEngine.js` -> `executeCommand`)
`set_throttle {engine_id?, throttle 0..1}`, `fire_rcs {thruster_ids|thruster_id, active, duration_s?}`,
`reset_rcs`, `kill_rotation`, `set_attitude_target {quaternion:[w,x,y,z]}`, `disable_autopilot`.
Also present but game-optional: `choose_encounter`, outpost commands (`shovel_mars_dirt`, ...).

### Snapshot fields most useful for HUD/world
`spacecraft.altitude_m, speed_m_s, position_m, orientation_quaternion ([w,x,y,z], body->inertial),
propellant_mass_kg, delta_v_remaining_m_s, landing_state`; `contact` (touchdown report/damage);
`power.battery_soc`; `life_support.*`; `thermal.nodes`; `comms.delay_seconds`; `events` (alerts).
Axes: +X is the engine/thrust axis; quaternion order is w,x,y,z. Units SI (metres, seconds, kg).

## Folder map
| Path | Purpose |
| --- | --- |
| `index.ts` | typed facade (`createSpacecraftSim`) — **start here** |
| `simulation/SimulationEngine.js` (+ `.d.ts`) | fixed 0.1 s accumulator loop; `advance(dtWall)` |
| `simulation/Spacecraft.js` | vehicle state + subsystem wiring |
| `systems/*` | propulsion, attitude, power, thermal, life support, comms, radiation, failure, environment |
| `physics/*`, `math/*`, `navigation/*` | gravity, atmosphere, RK4, vectors/quaternions, orbital elements |
| `contact/*` | landing/liftoff contact physics (analytic default; optional Rapier backend, untested) |
| `config/*` | constants, mission presets |
| `docs/*` | original backend guides (HTTP parts are irrelevant here) |

## Rules when changing it
- Keep it pure and browser-safe: no `process`, `fs`, `setInterval`, `Date.now()` in physics paths.
- Keep RK4 derivative functions side-effect free (wheel momentum is committed once per step).
- Types: update `simulation/SimulationEngine.d.ts` when you add snapshot fields you want typed.
- Don't import other features' internals; don't add packages (request via Rohit).
- `RoguelikeDirector` / `OutpostSystem` are leftovers from the backend; safe to delete only together with
  their imports and `executeCommand` cases in `SimulationEngine.js`.

## Replacing it with a different physics engine
1. Implement `SpacecraftSim` (interface in `index.ts`): `step, command, loadPreset, setTimeScale, getSnapshot, pause, resume, dispose`.
2. Keep snapshot field names above (or update HUD consumers).
3. Swap the body of `createSpacecraftSim`; nothing else in the game should need to change.

## Current hookup (done, in `src/App.vue`, Rohit's file — user-authorized edit)
`startFlightSim(preset)` / `stepFlightSim(elapsed)` / `stopFlightSim()` run during the two transit legs
(`LEO_CIRCULAR` for Earth -> Orbit, `MARS_ATMOSPHERIC_ENTRY` for Orbit -> Mars). They show a live
"Flight computer" readout (altitude, speed, delta-v) in the transit overlay. Journey progress is still
time-based, so a sim failure can never block the game (errors are caught and the sim is dropped).
To make the sim drive progress or visuals, read `getSnapshot()` in `stepFlightSim`.

## Further hooking (needs Rohit — shared files)
- `App.vue`: step the sim in the existing loop at a fixed `1/60` instead of variable `elapsed` if you want strict determinism.
- Feed `getSnapshot()` to HUD (props via contracts) and world (`setJourney(progress)` etc.) — additive contract change.
- `tsconfig.json` needs no change (typing is via the `.d.ts`). Optional Rapier backend needs a dependency; skip it.

## Known limits
Written without being executed in the original project; run `npm test` first and treat failures as real bugs.
Unfinished ideas: parachute deployment, aero-heating -> thermal coupling, thrust in structural g-load,
radiation dose -> crew health, fault events to the event bus.
