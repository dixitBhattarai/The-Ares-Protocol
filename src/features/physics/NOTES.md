# Physics handoff — Anshu

Status: Complete and validated.

## Implemented Features

### 1. Grounded Controller & Colliders
- **Rapier 3D Body & Capsule**: Dynamic rigid body with locked rotations and capsule collider (`halfHeight: 0.5, radius: 0.3`, total height 1.6 m, standing at `y = 0.8` on ground `y = 0`). Configured with `friction: 0` and `restitution: 0` for smooth sliding along obstacle colliders.
- **Rapier Character Controller**: Integrated character controller with ground snapping (`snapToGround: 0.5`) and slide enabled.
- **Mars Surface Gravity**: Configured downward gravity of `3.72076 m/s²` (`~3.72 m/s²`).
  - *Citation*: Williams, D. R. (2024), "Mars Fact Sheet", NASA Goddard Space Flight Center / National Space Science Data Center (NSSDC). Surface gravity: 3.72 m/s² (3.72076 m/s²). Available at: https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
- **Map & Station Colliders**:
  - Ground collider: 40x40 bounded map at `Y = 0` (cuboid half-extents `20, 0.1, 20` translated to `y = -0.1`, placing the top surface at `y = 0`).
  - Station colliders: Habitat (`-5, 1, 0`), Solar (`5, 1, 0`), Greenhouse (`0, 1, -6`), each with cuboid dimensions `3x2x3` (half-extents `1.5, 1, 1.5`).
- **Boundary Clamping**: Strict clamping within `[-18, 18]` on X and Z axes, with height preserved on the ground at `y = 0.8`.
- **Vector Normalization**: WASD and Arrow key combinations normalize diagonal movement so diagonal speed equals orthogonal speed at `3.0 m/s`. Opposing keys cancel to `0 m/s`.

### 2. Reset, Pause & Focus Lifecycle
- **`reset(pose?: Vec3)`**: Resets astronaut position to default spawn `(0, 0.8, 5)` or provided pose, zeroes linear and angular velocities, and clears all held keys.
- **`pauseInput()`**: Sets input paused state, immediately clears held keys, and zeroes horizontal linear velocity.
- **`resumeInput()`**: Clears held keys and resumes accepting keyboard input.
- **Focus & Blur Safety**: Event listeners on `window.blur`, `window.focus`, and `document.visibilitychange` clear pressed keys to prevent stuck keys when navigating or unfocusing the window.
- **Form Control Protection**: Ignores movement keys when typing into buttons/inputs (`event.target.closest('button, input, textarea, select, [contenteditable]')`).
- **Scroll Prevention**: Calls `event.preventDefault()` on arrow keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) to prevent default page scrolling.
- **Clean Disposal**: `dispose()` detaches all event listeners, removes the character controller, and safely frees Rapier WASM world resources.

## Validation & Test Suite

- **Unit Tests (`src/features/physics/physics.test.ts`)**: 18 tests passing:
  - Exact orthogonal speeds for WASD and arrow keys.
  - Normalized diagonal velocity math matching 3.0 m/s.
  - Opposing key cancellation and empty key handling.
  - Strict position clamping to `[-18, 18]` boundaries and `y = 0.8` floor.
  - Mars gravity acceleration and settling on ground.
  - Habitat station collider collision blocking.
  - Continuous movement boundary enforcement in simulation.
  - Reset lifecycle with default and custom poses.
  - Input pause and resume mechanics.
  - Blur and document visibilitychange key clearing.
  - Input/button target key suppression.
  - Arrow key `preventDefault` verification.
  - Clean disposal without double-free errors.
- **Full Test Suite (`npm test`)**: 30 passing tests (12 game + 18 physics).
- **TypeScript Typecheck (`npm run typecheck`)**: 0 errors.
- **Production Build (`npm run build`)**: 0 errors.

## Limits & Design Notes
- Physics steps at fixed 1/60-second intervals as driven by Rohit's animation loop in `App.vue`. Large time deltas are clamped to prevent tunneling.
- No jumping or flight dynamics implemented (strictly grounded astronaut locomotion on Mars surface).

## Handoff & Git Commits
- **Branch**: `feat/anshu-physics`
- **Milestone 1**: `feat(physics): add grounded astronaut controller` (`cc9f45d`)
- **Milestone 2**: `fix(physics): handle focus pause and reset` (staged for commit)
- **Changed Paths**: `src/features/physics/index.ts`, `src/features/physics/physics.test.ts`, `src/features/physics/NOTES.md`

## Camera-heading handoff from Himamshu — 14 Nov 2026

User explicitly requested controllable third-person exploration. This coordinated slice adds only optional setCameraYaw and a pure rotateMovement helper; existing input, gravity, collider footprints, bounds and lifecycle stay owned by physics. App supplies world camera heading before fixed stepping. Tests verify a quarter-turn forward vector, preserved diagonal speed and invalid-heading fallback. Anshu retains subsequent physics ownership. No Three.js dependency/import enters physics.

## User-authorized continuous building handoff — 14 Nov 2026

Himamshu's user explicitly authorized the coordinated App/contracts/world/physics slice to remove Earth/Mars doorway teleports. Physics keeps exclusive pose ownership. Hollow station colliders now match the 3.2m half-size shared buildings at (-7,0), (7,0), (0,-9). Real walls/furniture and enabled closed-door colliders replace full solid boxes. Optional setDoorOpen and collision-respecting walkPath support animated door readiness and guided entry/exit. Manual input, blur, pause and reset cancel guided walking. The orbit cabin retains the legacy saved-pose hooks; Earth/Mars entry does not use them.

Tests: 101 project tests pass, including all three station open/closed round trips, bounded per-step movement, sidewall blocking and pause cancellation. Typecheck/build pass. Browser confirms same-scene Earth/Mars entry and all three Mars exits, maximum sampled step approximately .05m. Guided routes use a central waypoint, not general pathfinding around furniture. Owner handoff: Anshu retains physics ownership after this slice; shared spatial constants/App wiring remain Rohit's. Integrate together with world meshes/docs to avoid mismatched colliders. No gravity or movement-speed redesign and no package changes.

## Keyboard focus fix — 14 Nov 2026

Movement keys are ignored only in text-entry controls, not on focused buttons. This keeps WASD/arrows usable while focus remains on station or command-deck buttons, while retaining protection against typing into inputs, textareas, selects and editable content. Added a focused regression test for WASD on a focused button. Validation: `npm run typecheck`, `npm test` (119 tests) and `npm run build` passed; the build retains the existing large-chunk warning. Manual browser checks were not run for this small input-routing change.

## Spacecraft flight sim port — 14 Nov 2026

Added `src/features/physics/spacecraft/` (orbit/attitude/propulsion/power/thermal/life-support/comms/landing simulation, ported from the standalone backend; no server code). Separate from the astronaut controller; `PhysicsAdapter` is unchanged. Full usage, folder map and replacement guide: `spacecraft/INTEGRATION.md`. Entry point `createSpacecraftSim()` in `spacecraft/index.ts`; typings via `simulation/SimulationEngine.d.ts` (no `allowJs`). Tests: `spacecraft/spacecraft.test.ts` (written, not yet run).

Wired (user-requested coordinated edit to Rohit's `App.vue`): Earth ascent, compressed transfer and Mars powered descent create/step/dispose the sim and show a live flight-computer readout. Launch and landing prompts send throttle and attitude commands; stage progress remains authored and time-based. An additive optional `WorldAdapter.setFlightStage` drives the launch and landing visuals. Rohit to review/own. Further request: optionally pass `getSnapshot()` to the HUD/world for richer instrumentation. Gaps: Rapier contact backend untested and needs a dependency (analytic backend is the default); leftover `RoguelikeDirector`/`OutpostSystem` are removable.

## Earth ascent and Mars powered-descent presets — 14 Nov 2026

- Added `EARTH_LAUNCH_ASCENT` and `MARS_POWERED_DESCENT` profiles to the bundled deterministic flight sim. The App's launch/landing prompts send authored throttle and attitude commands and display the sim's propellant, altitude, speed and delta-v snapshot.
- Completed the sim wiring needed by the new profiles: preset propulsion factories now reach the spacecraft, the RK4 derivative context matches the current spacecraft API, the event bus receives a callable simulation clock, and surface inertia/contact torque use the spacecraft's actual dimensions and attitude APIs.
- These presets are tuned for a short demo sequence, not a verified launch vehicle, real Mars trajectory, parachute deployment or operational landing. The existing optional contact/Rapier backend remains out of scope; landing completion is the game sequence's authored touchdown.
- User-requested coordinated slice also changes shell/contracts/world/game/UI paths; this is a recorded temporary integration handoff. Anshu retains subsequent physics ownership.
- Validation: all five `spacecraft.test.ts` checks pass, including caller-stepped simulation, finite burn telemetry, Earth ascent propellant use and Mars descent preset initialization. `npm run typecheck` and `npm run build` pass. Full `npm test`: 118 passed, with one unrelated existing `jump.test.ts` failure (`window` is undefined in Vitest's Node environment). Live browser verification was blocked before navigation by unsupported URL policy enforcement in the Windows browser tool. Rapier contact remains disabled by default; the game's final touchdown remains an authored sequence.

Backup integration: Earth/Mars jump test now runs with a complete mock performance clock (141 total tests pass). Space ignores button/summary/link activation, WASD remains active on focused buttons, blur/pause clears jump requests. Orbit gravity is effective cabin-controller acceleration. See docs/MERGE_LOG.md for spacecraft validation limits.

### Continuous launch — 14 November
User-authorized physics/App/world/UI slice: launch-flight.ts is a small deterministic 2D ascent with gravity, exponential atmosphere drag, finite propellant and mass-dependent thrust. SI telemetry and 8x simulated time; invented vehicle constants/visual scale, not a validated flight model. Holding thrust/steering changes trajectory; cutoff coasts under gravity. Space objective at 100 km hands off to authored orbital insertion, not a claim of orbit. App never steps paused/hidden flight and clears held input on keyup/blur/pause/replay. Existing spacecraft engine still supplies transfer/landing; walking unchanged.
Focused checks only: 3 launch tests (pad/reset, throttle/steering trajectory, cutoff/space/fuel), typecheck and Vite build. Browser: ignition, live steering/throttle, pause frozen altitude, reach >85 km/Earth limb/stars, 360px layout, automatic handoff to orbit preparation; no page errors. No full mission suite repeated.

### Continuous Mars descent — 14 November
User-authorized cross-feature slice adds landing-flight.ts: 2D powered descent, real elapsed seconds, gravity 3.72076m/s², mass/fuel-dependent engine acceleration, bounded tilt and lateral drag. Initial state 320m / -12m/s; throttle/steering change motion continuously. Touchdown needs pad alignment, slow vertical/lateral speed, upright attitude and legs. Rough landings offer retry without advancing the mission; optional PD assist can complete the approach and deploy legs, and manual input cancels it. Engine/threshold constants are authored, not a validated lander model. App owns stepping and pause/hidden/replay lifecycle. Three focused tests cover control response, each touchdown criterion and assist/manual takeover; typecheck/build/browser validation in world notes.

### Space → Mars atmosphere → outpost; corrected pitch controls
User requested entry from space and W nose down/S nose up instead of throttle-driven backward-looking movement. Landing starts at 80km with non-negative forward speed and authored aerodynamic braking, transitions continuously to powered descent at 800m and physical contact. Snapshot separates nose pitch from lateral bank. W/S change nose angle, Q/E/slider thrust, A/D bank; manual attitude never sets reverse speed. Time is compressed up to 20x high up and blends to real time near the ground; final retries use a 320m checkpoint. All vehicle/atmosphere/heat figures are authored game approximations. Four focused landing tests pass, including independent pitch/throttle, phase crossing, non-negative speed, touchdown criteria and full-entry assisted landing. UI/browser checks in world notes; no full suite repeated.

### 15 November — coordinated Earth scene collision correction

The user explicitly requested replacing Earth's repeated Mars buildings. Himamshu's coordinated slice changes `index.ts` and `physics.test.ts`: track solar/greenhouse shell, furniture and door colliders as Mars-only; disable them on Earth and restore them plus current door intent on return to Mars. Habitat crew-operations lab coordinates and launch-vehicle collider remain unchanged. A regression test walks across the removed solar footprint on Earth, then confirms the same route is blocked by the visible building on Mars. Anshu retains subsequent physics ownership. Validation: all 208 tests, typecheck and production build passed; no physics contract change.

### 15 November — WASD beside the airlock and idempotent input resumption

User explicitly assigned this coordinated movement/pause correction to Himamshu. `habitat.ts` now confines the chamber-side-wall test to players actually inside the chamber, instead of freezing every player in its Z strip. An unsuited player already in the capsule's narrow safety margin may recover inward without crossing the dome outward. `index.ts` makes repeated `resumeInput` calls preserve held keys unless transitioning from a real pause, allowing App to reconcile movement eligibility with visible UI/focus each frame. `habitat.test.ts` and `motion.test.ts` cover adjacent movement, chamber-wall blocking, inward recovery, held-key continuity and pause clearing. All 214 tests/typecheck/build pass; actual browser WASD after pause/menu closure and beside the airlock passes. No API or gravity change. Anshu retains ongoing ownership.

Orbital cabin upgrade: separate bounded 3D inertial controller in cabin-motion.ts, Space/Shift vertical pushes, Ctrl braking, L grips nearby ladder and W/S climb. Disables station colliders in orbit; paused input freezes drift and resets velocity. Hull floor/ceiling/side constraints, visual furniture. Actual Rapier body pose browser-checked for drift/pause/climb. Three helper tests plus posture/game tests passed.
