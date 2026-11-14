# Himamshu — 3D World & Engine Lead

Read root `AGENTS.md` and `docs/CONTRACTS.md`. You own only `src/features/world/**`, including this guide, local assets/tests/styles and `NOTES.md`. Branch: `feat/himamshu-world` from the shared scaffold on main, in your own clone/worktree.

Himamshu also owns merge coordination as a separate task. This world-feature prompt does not authorize merging. Finish and commit world work here; use `docs/MERGE_COORDINATOR_PROMPT.md` in the clean main checkout for any explicitly requested merges. App/contracts/package changes remain with Rohit.

## Task

### Latest task/reward/automatic hazard direction — 14 Nov

Supersedes older card requirements below: no three-card decisions or post-task cards in the playable loop. Any station job can be started, minigame completion gives one positive payout, and six completed jobs end the mission. Negatives come from active-time reserve consumption and automatic warned hazards; matching maintenance prevents hazard damage. Read root AGENTS.md and docs/CONTRACTS.md for the implemented optional station-tasks mode, action tokens and pause/reset rules. Himamshu's explicit user-requested cross-feature handoff is recorded in the local notes; normal ownership resumes afterward. Do not reintroduce card-first or post-task choice gates.


### Continuous building handoff — 14 Nov

The user explicitly authorized the coordinated App/contracts/world/physics slice replacing Earth/Mars portal teleports with hollow buildings. Read the updated spatial contract: station centers (-7,0), (7,0), (0,-9), half-size 3.2. Keep doors, walls, furniture obstacles and camera aligned. World supplies visuals/door readiness; physics alone moves the astronaut, including guided entry/exit. Legacy interior pose hooks serve the orbit cabin only. This supersedes older portal-first guidance below. Later cross-owner changes still require coordination.


### Current task-first direction (supersedes card-first entry restrictions)

Allow free exploration of the existing Mars level and entry/exit independent of job selection. Build visible open/closed animated doors, readable entrance paths and interior exit controls. Keep exterior portals aligned with physics envelopes; a room transition is acceptable for this prototype, but do not claim seamless geometry or zero-gravity movement. Render supplied job/loot markers and completion effects when Rohit's contracts land; never award resources in world code. Preserve the Mixamo rig and smooth idle/walk blending, cap model budgets, verify free asset licenses and document all credits. Use bright station accents coherently with HUD/UI rather than restyling their files. Continue committing tested world milestones and hand them off to Antigravity for merging.

Make one readable, lightweight Mars base with habitat, solar station, greenhouse, astronaut and camera. Improve the primitive scene rather than building a full planet. Give modules distinct silhouettes/labels. React visually to the supplied game state and support station picking.

Keep `createWorld(host, onInteract): WorldAdapter` and all adapter methods. Use shared `STATIONS` and documented module envelopes. Renderer/camera/lighting/visual assets are yours; movement integration, state rules and app mounting are not. Emit station IDs, not simulation effects. Don't import other features or start a second animation loop.

## Acceptance

- Base readable at laptop and narrow viewport sizes; camera and resize work.
- Astronaut follows `setPlayerPose`; no second movement simulation.
- `setState` visibly communicates relevant power/shelter status without mutating it.
- Picking returns habitat/solar/greenhouse IDs. Existing button-based decisions remain the accessible route.
- Dispose renderer, geometry, materials, textures, listeners and observers, including partially initialized resources on failure.
- Prefer local procedural/low-poly visuals; cap pixel ratio and avoid heavy post-processing/remote assets.
- Record licenses/credits next to any downloaded assets. Propose layout/collider changes in your notes for Anshu/Rohit; don't change shared constants yourself.

## Commit milestones

1. Readable base, modules, astronaut/camera: `feat(world): build readable Mars outpost`.
2. Status/picking/polish and cleanup: `feat(world): show module status and selection`.

Run typecheck/tests/build and relevant world checks. Stage only `src/features/world`, inspect staged diff, commit each working milestone. Update notes and hand off branch/hash/checks/limits. Do not edit App, contracts, manifests, global CSS or a teammate's folder.
