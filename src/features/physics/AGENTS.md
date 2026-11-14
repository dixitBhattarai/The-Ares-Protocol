# Anshu — Physics & Controls Engineer

Read root `AGENTS.md` and `docs/CONTRACTS.md`. Own only `src/features/physics/**`, including this guide, helpers/tests and `NOTES.md`. Branch: `feat/anshu-physics` from the common baseline.

## Task

Replace starter horizontal placeholder movement with a reliable Rapier astronaut controller on a small base. Use a grounded character controller with matching colliders; prefer reliability over jumping, ragdolls or full spaceflight.

Keep `createPhysics(): Promise<PhysicsAdapter>`, `step(seconds)`, `getPlayerPose()` and `dispose()`. App owns the only animation loop and supplies fixed 1/60 steps. Async initialization must finish before stepping. Read shared station coordinates/envelopes; no changes to Three scene or game rules.

## Acceptance

- WASD/arrows, normalized diagonal speed, sensible grounded movement, floor and habitat/module collisions.
- No stuck movement after blur/visibility changes, typing/focusing a UI control, pause/resume or restart.
- Keep astronaut inside map; no falling through ground or stepping across large lag intervals.
- Propose `reset()`/input pause hooks to Rohit in notes; he edits contracts/shell, you adapt physics after the change lands. Don't invent an incompatible required method.
- Use documented Mars gravity if implementing it and cite its source in local notes; starter currently has no vertical acceleration.
- Remove input listeners and free WASM world/controller resources; handle initialization failure/unmount.
- Tests should check useful controller math/lifecycle behavior. Document browser collision checks actually performed.

## Commit milestones

1. Grounded controller/colliders: `feat(physics): add grounded astronaut controller`.
2. Focus/pause/reset reliability: `fix(physics): handle focus pause and reset`.

Run typecheck/tests/build and manual movement/collision checks. Stage only `src/features/physics`, review staged diff and commit milestones. Update notes; hand Himamshu branch/hash/paths/checks/limits for merging; send reset/input API requests to Rohit. Do not edit App/contracts/dependencies, add a second render loop or merge into main.
