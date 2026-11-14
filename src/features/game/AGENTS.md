# Rohit — Game Loop, Integration & Release Lead

Read root `AGENTS.md` and all `docs/` coordination files. Own `src/features/game/**` and the engineering files listed in the root ownership table. Branch: `feat/rohit-game` in an isolated feature workspace from the common scaffold. Himamshu runs the merge queue in a separate main checkout. Do not merge team branches into main or edit the other five feature folders on your branch.

## Task

### Latest task/reward/automatic hazard direction — 14 Nov

Supersedes older card requirements below: no three-card decisions or post-task cards in the playable loop. Any station job can be started, minigame completion gives one positive payout, and six completed jobs end the mission. Negatives come from active-time reserve consumption and automatic warned hazards; matching maintenance prevents hazard damage. Read root AGENTS.md and docs/CONTRACTS.md for the implemented optional station-tasks mode, action tokens and pause/reset rules. Himamshu's explicit user-requested cross-feature handoff is recorded in the local notes; normal ownership resumes afterward. Do not reintroduce card-first or post-task choice gates.


### Current task-first loop and integration ownership

Implement and coordinate the migration to explore → choose one of 2–3 available station jobs → minigame → base task outcome → three-card modifier offer → choose once → explore. Do not retain card-first walking gates. Game remains the only state writer: task completion and card resolution are distinct validated actions with once-only IDs; reward/cost cannot be applied twice by controls, replayed clicks or UI rerenders. Six completed jobs/shifts retain win/loss/debrief pacing. Essential jobs remain available; seeded optional variants and capped one-time loot reward exploration without required cooldowns or infinite farming. Add meaningful tests for these transitions, pause/restart, invalid/stale completion IDs, card duration/stacking and seeded offer reproducibility.

Coordinate backwards-compatible task/card/loot/door/playback contracts before owners depend on them, and explicitly document where current v1 behavior is retained during migration. Compose UI minigames, HUD job feedback and world markers without writing their internals. Keep keyboard/touch alternatives and full WebGL-failure playability. Integrate Himamshu's free-entry/openable-door handoff while preserving the current deck layout. Brighten shared shell styles only in coordination with HUD/UI. No second animation loop or mission progression tied to frames. Hand your feature branch to Antigravity; do not operate main's merge queue.

Build the deterministic resource/consequence loop and integrate all five feature adapters. The starter already supports phases, signed choice costs, clamping, depletion and science completion. Extend it so preparation meaningfully changes later hazards and there isn't a dominant free/winning strategy. Make the full mission understandable and replayable.

## Acceptance

- Decisions spend finite reserves; failures prioritize depletion; six shifts have an achievable science goal and at least two sensible strategies.
- Shelter provides a measurable hazard benefit at a cost. Food and communications have honest, understandable delayed consequences, coordinated with Genius.
- Coordinate additive contract changes before dependent feature work. Record the migration and have owners update their own implementations.
- Preserve pure reducer functions. Test resource math, clamping/depletion, valid/invalid transitions, unknown choices, shelter effect, terminal behavior and full reset; simulate a winning and losing run.
- Keep exactly one requestAnimationFrame loop. Physics is fixed-step, paused/hidden safely, capped after lag and independent from decision progression. Keep engine instances outside deep reactive state.
- Coordinate reset/input hooks with Anshu: restart should reset resources, history, pose, input and timers. Handle async initialization/unmount and WebGL/WASM errors without breaking decision UI.
- You own package manifests/lockfile, root CSS/entry, contracts, app shell, engineering docs and deployment configuration as listed in root AGENTS.md. Himamshu owns coordination docs and merging. Honor other feature ownership, including notes/guides.
- Hand completed branches and engineering fixes to Himamshu for serial merging; do not run merges into main yourself. Follow the final demo checklist for your app-wiring work. No public deployment, main push or account changes without authorization.

## Commit milestones

1. Tested consequences/debrief state: `feat(game): implement consequences and debrief`.
2. Shell/contract composition: `feat(game): integrate team modules`.
3. Verified release fixes/docs: `fix(game): stabilize release and demo`.

Stage explicit paths, not the entire repo. Run typecheck/tests/build per milestone. Coordinate corrections with folder owners rather than rewriting their code. Update `game/NOTES.md`; hand Himamshu branch/hash/paths/checks, limits and merge-order needs. App integration means wiring adapters in owned code; it does not mean merging branches. Do not operate Himamshu's main checkout.
