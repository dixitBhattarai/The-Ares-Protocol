# Rohit — Game Loop, Integration & Release Lead

Read root `AGENTS.md` and all `docs/` coordination files. Own `src/features/game/**` and the shared integration files listed in the root ownership table. Branch: `feat/rohit-game` from the common scaffold; use a separate clean checkout for serial merges on main. Do not edit the other five feature folders on your branch.

## Task

Build the deterministic resource/consequence loop and integrate all five feature adapters. The starter already supports phases, signed choice costs, clamping, depletion and science completion. Extend it so preparation meaningfully changes later hazards and there isn't a dominant free/winning strategy. Make the full mission understandable and replayable.

## Acceptance

- Decisions spend finite reserves; failures prioritize depletion; six shifts have an achievable science goal and at least two sensible strategies.
- Shelter provides a measurable hazard benefit at a cost. Food and communications have honest, understandable delayed consequences, coordinated with Genius.
- Coordinate additive contract changes before dependent feature work. Record the migration and have owners update their own implementations.
- Preserve pure reducer functions. Test resource math, clamping/depletion, valid/invalid transitions, unknown choices, shelter effect, terminal behavior and full reset; simulate a winning and losing run.
- Keep exactly one requestAnimationFrame loop. Physics is fixed-step, paused/hidden safely, capped after lag and independent from decision progression. Keep engine instances outside deep reactive state.
- Coordinate reset/input hooks with Anshu: restart should reset resources, history, pose, input and timers. Handle async initialization/unmount and WebGL/WASM errors without breaking decision UI.
- Only you change package manifests/lockfile, root CSS/entry, contracts, app shell, shared docs and deployment configuration. Honor other feature ownership, including their notes/guides.
- Follow serial merge workflow and final demo checklist. No public deployment, push to main or account changes without existing authorization for that action.

## Commit milestones

1. Tested consequences/debrief state: `feat(game): implement consequences and debrief`.
2. Shell/contract composition: `feat(game): integrate team modules`.
3. Verified release fixes/docs: `fix(game): stabilize release and demo`.

Stage explicit paths, not the entire repo. Run typecheck/tests/build per milestone and after each merge. Delegate corrections to folder owners by handoff rather than rewriting their code. Update `game/NOTES.md`; report branch/hash/checks and remaining limits. Integrator role does not authorize losing someone else's changes.
