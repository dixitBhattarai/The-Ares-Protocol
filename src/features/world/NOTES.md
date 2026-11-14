# World handoff — Himamshu

Branch: `feat/himamshu-world`, isolated worktree `.worktrees/himamshu`.
Baseline: `710e015` on main. No shared files or dependencies changed.

## Milestone 1 — readable base

- Added procedural habitat, battery-backed solar station and framed greenhouse, suited astronaut, flat walkways, landing marker and deterministic distant rocks. See `CREDITS.md`; no external assets/network requests.
- All solid station geometry fits the existing 3 × 2 × 3 collider boxes at unchanged `STATIONS` coordinates. Ground remains Y=0; distant decorative rocks don't occupy the walkable area.
- Orthographic camera fits base plus player, including map edges and narrow/wide viewports. World only displays supplied poses; no physics or extra animation loop.
- Labels and mesh picking report original station IDs. Namespaced feature CSS leaves global UI untouched.
- Resource ownership tracks geometry/materials/textures before scene attachment; initialization failures and repeated disposal clean up safely. Instanced scenery buffers and WebGL context are released on disposal.
- Validation: typecheck passed, all 9 tests passed (6 existing + 3 world contract/lifecycle tests), production build passed. Browser inspected at 1280×900 and 360×800; all three label buttons called the shell callback; no horizontal page overflow.

## Milestone 2 — state and selection

- Added mesh hover/selection outlines, keyboard-native label buttons with pressed state, Enter/Space activation and Escape clearing. Mesh and label actions use the same station callback, exactly once per activation.
- Labels mirror air/power/supplies; warnings show words as well as lamp/border color. Power changes window/panel illumination. Shelter changes habitat shutter coverage within its original envelope. These are visual representations of supplied authored scores, not physical shielding calculations or new game mechanics.
- Scene phase reflects ready/running/paused/won/lost. A new ready snapshot clears selection; unchanged immutable snapshots avoid repeated DOM/material updates.
- Labels switch to a compact legend when projected positions would overlap. Its camera reserves room for labels/caption; a distant-player marker keeps the astronaut identifiable near map edges. No controls, camera loop, terrain/collider layout or public adapter API changes.
- Added tests for recursive picking, reserve-to-station mapping/immutability and safe bounded render parameters/shutter geometry. Camera tests cover both full-frame and overlay-safe projection.
- Final automated verification: `npm run typecheck`, `npm test` (12 passing, including 6 world tests) and `npm run build` passed.
- Browser verification in isolated Chrome: actual canvas raycasts selected all three nested module models; Enter/Space produced one callback each; Escape cleared selection; frozen supplied states displayed critical reserves and shelter; map-edge 360px labels stayed within the host. No page exceptions.
- Lifecycle verification: repeated dispose and three create/render/dispose cycles left no canvases/labels or active button callbacks. Injected ResizeObserver initialization failure disconnected its observer and removed partial DOM.
- Final production preview passed: three real shelter actions updated the world to shelter 45; pause/resume updated the scene phase; 360px labels had no overflow. No page errors or failed requests. Inspected desktop/mobile production screenshots. Browser artifacts are local under ignored `output/playwright/`, not source assets.

## Handoff

- Ready for Rohit's serial merge of `feat/himamshu-world`. Milestone 1 is `9fc1290`; the final status/selection commit hash is supplied in the completion message.
- Changed paths only under `src/features/world/`: `index.ts`, `models.ts`, `resources.ts`, `camera.ts`, `picking.ts`, `status.ts`, `world.css`, `world.test.ts`, `CREDITS.md`, `NOTES.md`.
- No App/contracts/physics/game/UI/HUD/mission/package/lockfile edits; no push or merge to main.
- Remaining integration request: replace shell viewport's `role="img"` with a labeled `region`/`group`. World labels have native keyboard semantics but the current ancestor image role hides them from the accessibility tree.

## Integration requests / limits

- Rohit: App's viewport currently has `role="img"`, which hides descendant station buttons from the accessibility tree. Change that host role to `region` or `group` while retaining its label so the world's native buttons are exposed to screen readers. World does not edit shell-owned semantics.
- Layout/collider contracts remain unchanged; no request to Anshu.
- Camera is automatic and fixed-angle; no orbit/zoom controls. This keeps controls simple for children. NASA evidence and gameplay consequences remain with their owners.
