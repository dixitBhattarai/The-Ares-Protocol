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
- Next milestone: selection/hover feedback, state-driven status lamps/labels and habitat shutters, plus browser state/picking/teardown checks.

## Integration requests / limits

- Rohit: App's viewport currently has `role="img"`, which hides descendant station buttons from the accessibility tree. Change that host role to `region` or `group` while retaining its label so the world's native buttons are exposed to screen readers. World does not edit shell-owned semantics.
- Layout/collider contracts remain unchanged; no request to Anshu.
- Camera is automatic and fixed-angle; no orbit/zoom controls. This keeps controls simple for children. NASA evidence and gameplay consequences remain with their owners.
