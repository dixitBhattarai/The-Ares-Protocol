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
