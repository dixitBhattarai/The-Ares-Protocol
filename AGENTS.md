# The Ares Protocol — team-wide agent instructions

Read this file, `docs/TASKS.md`, `docs/CONTRACTS.md`, `docs/GIT_WORKFLOW.md`, and the `AGENTS.md` inside your assigned feature before editing. Use uppercase `AGENTS.md` so coding agents discover it. Do not create a competing lowercase copy on Windows.

## Product and scope

Build a browser game for children ages 7–12 managing a small Mars outpost. Teach costly choices involving power, breathable air, supplies/food, shelter, and delayed communication. This is an educational prototype, not professional astronaut training. Target one map, six shifts, a 3–5 minute mission, and a debrief explaining cause and effect. See `docs/HACKATHON_PLAN.md`.

Stack: Vue 3 + TypeScript for screens; Three.js for the world; Rapier for movement/collisions; Vite; npm with the committed lockfile. No backend, login, multiplayer, extra state library or engine migration for the MVP.

## Exclusive ownership

| Person | Primary task | Allowed feature files | Branch |
| --- | --- | --- | --- |
| Himamshu | 3D world and engine presentation | `src/features/world/**` | `feat/himamshu-world` |
| Saurav | In-game HUD and resource feedback | `src/features/hud/**` | `feat/saurav-hud` |
| Dixit | Onboarding, decisions, pause, results, sources | `src/features/ui/**` | `feat/dixit-ui` |
| Anshu | Physics, movement and interaction input | `src/features/physics/**` | `feat/anshu-physics` |
| Genius | NASA evidence and mission content | `src/features/missions/**` | `feat/genius-missions` |
| Rohit | Simulation, integration and release | `src/features/game/**` plus integration files below | `feat/rohit-game` |

Rohit alone owns shared files: `src/App.vue`, `src/main.ts`, `src/styles.css`, `src/contracts/**`, root configuration/manifests/lockfile, `index.html`, root `AGENTS.md`, `README.md`, `docs/**`, and any CI/deployment configuration. The project is already scaffolded. Do not regenerate it.

Colocate components, styles, tests, assets, and data inside the owner's folder; use imports or `new URL('./assets/name.glb', import.meta.url)` for assets. Do not create shared barrel files or global CSS. Each feature owner can update their own `AGENTS.md` and `NOTES.md`. Public contracts are frozen at v1 until Rohit coordinates an additive update.

## Boundaries and integration

- Keep exports and Vue props/emits in `docs/CONTRACTS.md` compatible. Add helpers inside your feature freely.
- Game code is the only writer of simulation state. HUD/UI emit actions; world renders snapshots; physics owns transforms; missions supplies content. Do not duplicate these systems.
- Feature agents import `src/contracts` and their own files only. Do not import sibling feature internals. Rohit's shell composes features. Feature-local tests use local fixtures; Rohit's game integration tests may use mission exports.
- Exactly one animation loop lives in `src/App.vue`. Physics steps at 1/60 second; mission progression uses decisions, not frames. Avoid Vue reactivity on Three/Rapier objects.
- Missing neighboring work is not permission to rewrite it. Use the existing stub/contract and document the gap in your own `NOTES.md`.
- If another file must change, record the exact request in your `NOTES.md` and hand it to its owner. The owner makes the change and Rohit integrates it. A temporary ownership transfer requires coordination with both affected owners and a recorded handoff. Never silently edit shared files.
- Do not independently add packages or regenerate `package-lock.json`; send dependency requests to Rohit. Do not mass-format the repo.
- Dispose GPU/WASM resources, observers, timers and input listeners on teardown. Keep rendering light enough for an ordinary laptop.
- Use child-friendly labels, keyboard buttons, visible focus, and readable contrast. Do not communicate danger by color alone.
- Separate real observations from authored mechanics. No fabricated NASA records, endorsement claims, exposed secrets, or medical/dose prediction claims. The demo must work without a NASA API request.

## Commits and parallel work

Use a separate clone or Git worktree per person. Never run six agents in the same working directory or switch its branch while another agent works. Follow `docs/GIT_WORKFLOW.md`.

Commit each coherent, working feature milestone after relevant checks; aim for 2–3 useful commits per role, not one mixed team dump. Stage explicit owned paths only (`git add -- src/features/<your-folder>`), inspect `git diff --cached --stat` and `git diff --cached`, then commit as `feat(<scope>): <completed behavior>` or `fix(<scope>): <fixed behavior>`. Use the actual configured author; never impersonate teammates. Do not commit generated builds, dependencies, credentials or other people's changes. Report Git identity/permission blockers instead of claiming success.

Every role starts from the same published scaffold commit on `main`, never a teammate's feature branch. Multiple commits on one feature branch are expected; unrelated branches must not depend on each other. Only Rohit queues merges and checks each result. Do not push/merge `main`, force-push, reset someone else's work, or cherry-pick commits already merged. File separation reduces conflicts; it cannot guarantee none.

## Definition of done

1. Assigned acceptance criteria work through the documented API and within owned paths.
2. `npm run typecheck`, `npm test`, and `npm run build` pass. Add meaningful tests for changed simulation/parsing/physics behavior, not superficial label/style tests.
3. Perform relevant manual checks from `docs/DEMO_CHECKLIST.md` and report those actually run.
4. Update your feature `NOTES.md` with completed features, validation, limits, and requests. Supply final commit hashes in the handoff; do not make a second commit just to record its own hash.
5. Commit the milestone, then hand Rohit the branch, changed paths, checks and integration needs. Uncommitted code is not a completed handoff.
