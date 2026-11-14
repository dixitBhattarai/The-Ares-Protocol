# The Ares Protocol — team-wide agent instructions

Read this file, `docs/TASKS.md`, `docs/CONTRACTS.md`, `docs/GIT_WORKFLOW.md`, and the `AGENTS.md` inside your assigned feature before editing. Use uppercase `AGENTS.md` so coding agents discover it. Do not create a competing lowercase copy on Windows.

## Product and scope

Build a browser game for children ages 7–12 managing a small Mars outpost. Teach costly choices involving power, breathable air, supplies/food, shelter, and delayed communication. This is an educational prototype, not professional astronaut training. Target one map, six shifts, a 3–5 minute mission, and a debrief explaining cause and effect. See `docs/HACKATHON_PLAN.md`.

Stack: Vue 3 + TypeScript for screens; Three.js for the world; Rapier for movement/collisions; Vite; npm with the committed lockfile. No backend, login, multiplayer, extra state library or engine migration for the MVP.

## Current gameplay direction — latest 14 November update

The user's latest request supersedes all three-card and post-task modifier requirements below or in older prompts. Remove decision cards from the playable loop. Players freely explore and use station computers or the work-order list to start any job. Completing the minigame pays one explicit positive reward once; six completed jobs lead to a debrief. Jobs may repeat, with science progress still awarded when reserves are capped. No card selection before or after a job.

Negatives occur automatically during active mission time: routine life-support consumption every 20 seconds and a warned hazard every 30 seconds. Matching air/power/plant maintenance prevents corresponding hazard damage for 60 active seconds; shelter score 15 prevents solar-storm damage. Routine consumption continues even with maintenance protection. These numbers are authored game mechanics, not NASA forecasts, dose estimates or medical predictions. Pause/hidden tabs stop the simulation; replay clears its clock/protection/rewards. Opportunity cost is the time spent doing one job while other systems need care.

For this explicitly requested implementation, Himamshu authors the necessary game, UI, App/contracts, world activity wording and coordination documentation slice in his isolated branch. Record exact paths/validation in game, UI and world notes. Existing owners retain their roles after handoff; do not edit their dirty checkouts. Antigravity continues main integration. The legacy CHOOSE reducer/API remains compatible for older integrations, but App uses station-tasks mode and does not display the old cards.

Use a cohesive brighter space palette, recognizable station colors, large illustrated controls, short friendly instructions and restrained success effects. Keep danger legible through icons/text, respect reduced motion, and do not obscure navigation with the card panel. Show explicit door state; allow exploration entry without selecting a job, and support open/close plus an easy exit.

Prefer well-made lightweight rigged models and coherent materials. Free downloads are authorized when their actual license permits incorporation into this game. Verify source/usage rights, keep credits and hashes, optimize textures/mesh size, bundle locally, retain load-failure fallbacks and never assume "free" means unrestricted. No new package or paid asset purchase is implied.

For this update only, Himamshu is explicitly assigned edits to root and all six feature AGENTS.md files and coordination task/prompt docs. His door integration may edit App.vue, additive world contracts and world files under the user's requested coordinated gameplay/door scope. Record the exact handoff in world/NOTES.md; Rohit retains subsequent engineering ownership. This does not transfer other feature implementation ownership or authorize editing another agent's dirty checkout. Antigravity retains the serial merge queue in main.

## Exclusive ownership (unchanged)

| Person | Primary task | Allowed feature files | Branch |
| --- | --- | --- | --- |
| Himamshu | 3D world; separate role as merge coordinator | `src/features/world/**`; coordination docs below | `feat/himamshu-world` |
| Saurav | In-game HUD and resource feedback | `src/features/hud/**` | `feat/saurav-hud` |
| Dixit | Onboarding, decisions, pause, results, sources | `src/features/ui/**` | `feat/dixit-ui` |
| Anshu | Physics, movement and interaction input | `src/features/physics/**` | `feat/anshu-physics` |
| Genius | NASA evidence and mission content | `src/features/missions/**` | `feat/genius-missions` |
| Rohit | Simulation, app wiring and release preparation | `src/features/game/**` plus engineering files below | `feat/rohit-game` |

Rohit owns shared engineering files: `src/App.vue`, `src/main.ts`, `src/styles.css`, `src/contracts/**`, root configuration/manifests/lockfile, `index.html`, `docs/CONTRACTS.md`, `docs/DEMO_CHECKLIST.md`, `docs/HACKATHON_PLAN.md`, and CI/deployment configuration. He implements app wiring on his feature branch; he does not merge team branches into main.

Himamshu owns merge coordination and its documents: root `AGENTS.md`, `README.md`, `docs/TASKS.md`, `docs/GIT_WORKFLOW.md`, `docs/PROMPTS.md`, `docs/MERGE_COORDINATOR_PROMPT.md`, and `docs/MERGE_LOG.md`. Only Himamshu, or an AI he explicitly assigns a merge-coordinator task, runs the serial merge queue. Keep that task in a clean main checkout, separate from his world feature worktree. This role does not transfer app/contracts/package ownership from Rohit. The project is already scaffolded; do not regenerate it.

Colocate components, styles, tests, assets, and data inside the owner's folder; use imports or `new URL('./assets/name.glb', import.meta.url)` for assets. Do not create shared barrel files or global CSS. Each feature owner can update their own `AGENTS.md` and `NOTES.md`. Public contracts are frozen at v1 until Rohit coordinates an additive update.

## Boundaries and integration

- Keep exports and Vue props/emits in `docs/CONTRACTS.md` compatible. Add helpers inside your feature freely.
- Game code is the only writer of simulation state. HUD/UI emit actions; world renders snapshots; physics owns transforms; missions supplies content. Do not duplicate these systems.
- Feature agents import `src/contracts` and their own files only. Do not import sibling feature internals. Rohit's shell composes features. Feature-local tests use local fixtures; Rohit's game integration tests may use mission exports.
- Exactly one animation loop lives in `src/App.vue`. Physics steps at 1/60 second; mission progression uses decisions, not frames. Avoid Vue reactivity on Three/Rapier objects.
- Missing neighboring work is not permission to rewrite it. Use the existing stub/contract and document the gap in your own `NOTES.md`.
- If another file must change, record the exact request in your `NOTES.md` and hand it to its owner. The owner commits the change; Himamshu merges it. Shared engineering requests still go to Rohit. A temporary ownership transfer requires coordination with affected owners and a recorded handoff. Never silently edit shared files.
- Do not independently add packages or regenerate `package-lock.json`; send dependency requests to Rohit. Do not mass-format the repo.
- Dispose GPU/WASM resources, observers, timers and input listeners on teardown. Keep rendering light enough for an ordinary laptop.
- Use child-friendly labels, keyboard buttons, visible focus, and readable contrast. Do not communicate danger by color alone.
- Separate real observations from authored mechanics. No fabricated NASA records, endorsement claims, exposed secrets, or medical/dose prediction claims. The demo must work without a NASA API request.

## Commits and parallel work

Use a separate clone or Git worktree per person. Never run six agents in the same working directory or switch its branch while another agent works. Follow `docs/GIT_WORKFLOW.md`.

Commit each coherent, working feature milestone after relevant checks; aim for 2–3 useful commits per role, not one mixed team dump. Stage explicit owned paths only (`git add -- src/features/<your-folder>`), inspect `git diff --cached --stat` and `git diff --cached`, then commit as `feat(<scope>): <completed behavior>` or `fix(<scope>): <fixed behavior>`. Use the actual configured author; never impersonate teammates. Do not commit generated builds, dependencies, credentials or other people's changes. Report Git identity/permission blockers instead of claiming success.

Every role starts from the same published scaffold commit on `main`, never a teammate's feature branch. Multiple commits on one feature branch are expected; unrelated branches must not depend on each other. Only Himamshu queues merges and checks each result. All feature agents, including Rohit's and Himamshu's world agent, must hand off instead of merging into main. Himamshu has authorized the merge coordinator to automatically discover, verify, and merge all published feature branches serially upon publication without repeated per-branch prompts, provided all tests and builds pass. Stop and report immediately on merge conflicts or check failures. No force-pushes, destructive resets or duplicate cherry-picks. Remote publication of verified main commits is authorized. File separation reduces conflicts; it cannot guarantee none.

Feature ownership controls authored edits. A coordinator's Git merge can include all owners' already committed files; it does not authorize rewriting their features or changing Rohit's engineering files independently.

### Regular commits, remote checks and publication

Himamshu authorized regular commits, checks of teammates' published work, automatic serial merges of verified feature branches, and publication of clean integration commits on 14 November 2026. Commit each coherent tested change; don't wait until the end of the hackathon or create a commit for every keystroke. Feature owners push their tested feature branches to `origin` after milestones. The coordinator automatically discovers, verifies, and merges all published feature branches serially, runs full verification checks, records entries in `docs/MERGE_LOG.md`, and pushes verified `main` commits to `origin`. This standing authorization does not authorize force-pushes, changing remotes, impersonating authors, or deployment.

Fetch `origin` at task start, before integration/publication and periodically during active work; compare branch tips and inspect new changes instead of blindly pulling them into a feature branch. Scheduled checks are requested every 30 minutes through 15 Nov 2026, 11:59 pm Asia/Katmandu. An agent cannot see unpushed work on another computer. Never commit someone else's dirty files merely to publish them. Verify checks/ownership and preserve original commit authors. Only the coordinator publishes main; stop on divergence and report it instead of forcing a push.

## Definition of done

1. Assigned acceptance criteria work through the documented API and within owned paths.
2. `npm run typecheck`, `npm test`, and `npm run build` pass. Add meaningful tests for changed simulation/parsing/physics behavior, not superficial label/style tests.
3. Perform relevant manual checks from `docs/DEMO_CHECKLIST.md` and report those actually run.
4. Update your feature `NOTES.md` with completed features, validation, limits, and requests. Supply final commit hashes in the handoff; do not make a second commit just to record its own hash.
5. Commit the milestone, then hand Himamshu the branch, commit hashes, changed paths and actual checks for merging. Send engineering/API requests to Rohit as well. Uncommitted code is not a completed handoff.
