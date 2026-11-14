# Copy-paste prompts for the six teammates

Publish the scaffold first. Give each person a separate clone or worktree as described in `GIT_WORKFLOW.md`, then paste their whole block into their coding AI. All branches start from the same baseline on main, not from one another. The prompt assumes you opened the correct person's isolated workspace; the AI must inspect current branch/status before editing. Don't run all six prompts in this directory.

## Himamshu — world

```text
You are working with Himamshu as 3D World & Engine Lead on The Ares Protocol, a Vue + Three.js + Rapier hackathon learning game for ages 7–12. Read root AGENTS.md, docs/TASKS.md, docs/CONTRACTS.md, docs/GIT_WORKFLOW.md and src/features/world/AGENTS.md first. Inspect Git status/branch; use an isolated clone/worktree on feat/himamshu-world starting from the shared scaffold on main, never another feature branch. Do not switch a shared working directory.

Implement only src/features/world/**: one readable Mars outpost, distinct habitat/solar/greenhouse, astronaut visual, camera/resize, station picking, and state-driven module visuals. Preserve createWorld(host, onInteract): WorldAdapter. Read STATIONS and keep the documented collision envelopes. App owns the only animation loop; physics owns player movement. Keep assets lightweight and local with usage credits. Dispose GPU assets/listeners/observers. Keep the public API stable; don't edit App, contracts, global styles, packages/lockfile or another feature.

Improve your folder's AGENTS.md if useful; track progress/API requests in your own NOTES.md. Complete a working base milestone and a status/selection milestone, run npm run typecheck, npm test, npm run build plus visual resize/picking checks, and commit each completed milestone with explicit git add -- src/features/world after inspecting staged diff. Use feat(world): messages. No mixed team commits or git add .; don't push main. Hand Rohit branch, hashes, changed files, actual validation, limits and cross-owner requests. Proceed with implementation, not just a plan.
```

## Saurav — HUD

```text
You are working with Saurav as HUD & Resource Feedback Lead on The Ares Protocol, a learning game for ages 7–12. Read root AGENTS.md, docs/TASKS.md, docs/CONTRACTS.md, docs/GIT_WORKFLOW.md and src/features/hud/AGENTS.md. Inspect Git status/branch; work in your isolated clone/worktree on feat/saurav-hud from the common scaffold on main. Never branch from another person's feature or switch their working directory.

Implement only src/features/hud/**. Preserve HudOverlay.vue props state: Readonly<GameState> and mission: MissionData. Build readable power/air/supplies meters, shift/science goal, secondary shelter status, textual warnings and change feedback using supplied state/log. Label authored values as game units. Use scoped responsive styles, clear labels, words/numbers as well as color, and reduced-motion support. Check 360px and laptop layouts. Do not implement menus/results/choice cards (Dixit), mutate state, fetch NASA data, create physics/rendering, or edit App/contracts/packages/global CSS/other features.

Update your own AGENTS.md/NOTES.md with progress and requests. Finish accessible meters then feedback/warnings in useful separate milestones. Run npm run typecheck, npm test, npm run build and relevant accessibility/layout checks. Stage only git add -- src/features/hud, inspect staged diff and commit each completed milestone using feat(hud): messages. No git add ., mixed commits or main pushes. Hand Rohit branch, commit hashes, changed paths, actual checks and limitations. Implement now, not just a plan.
```

## Dixit — UI

```text
You are working with Dixit as UI, Onboarding & Debrief Lead on The Ares Protocol for ages 7–12. Read root AGENTS.md, docs/TASKS.md, docs/CONTRACTS.md, docs/GIT_WORKFLOW.md and src/features/ui/AGENTS.md. Inspect branch/status; use an isolated clone/worktree on feat/dixit-ui from the shared main scaffold, never another feature branch.

Implement only src/features/ui/**. Keep MissionPanels.vue props state, mission, event and its typed action emit compatible. Build concise onboarding, cost/benefit decision cards, pause/resume, constructive win/loss debrief with log review, retry, and source credits. Use keyboard-accessible responsive scoped components. Sources must honestly distinguish authored demo values, archived observations and live data, with NASA non-endorsement. No source is loaded in the starter. Saurav owns status meters; Rohit owns rules. Emit actions instead of changing state; don't import other features, fetch data or edit App/contracts/global CSS/packages.

Update your own AGENTS.md/NOTES.md. Commit onboarding/decisions then debrief/credits as working milestones after npm run typecheck, npm test, npm run build and keyboard/narrow-screen start-to-retry checks. Stage only git add -- src/features/ui, review staged diff, use feat(ui): messages. No git add ., team-wide changes or main pushes. Give Rohit branch, hashes, changed files, actual validation, limitations and required interface changes. Proceed to implementation.
```

## Anshu — physics

```text
You are working with Anshu as Physics & Controls Engineer on The Ares Protocol. Read root AGENTS.md, docs/TASKS.md, docs/CONTRACTS.md, docs/GIT_WORKFLOW.md and src/features/physics/AGENTS.md. Inspect Git branch/status. Work only in your isolated clone/worktree on feat/anshu-physics starting at the same scaffold on main as the others.

Implement only src/features/physics/**. Preserve async createPhysics(): Promise<PhysicsAdapter> and step/getPlayerPose/dispose. Replace placeholder horizontal movement with a reliable grounded Rapier controller, normalized WASD/arrows, matching floor/module colliders, bounds and safe focus/input lifecycle. Read STATIONS and spatial contract. If implementing Mars gravity, verify and cite a source. App owns the single fixed-step loop. Coordinate reset/pause input hooks with Rohit through your NOTES.md before changing APIs. Never edit scene, App, contracts, packages or another folder. Don't duplicate reserve rules or add flight/ragdoll scope.

Update your local guide/notes. Commit a working controller milestone then lifecycle/reset reliability after meaningful tests and npm run typecheck, npm test, npm run build plus collision/focus/pause checks. Stage only git add -- src/features/physics, inspect staged diff, and use feat(physics): or fix(physics): commits. No git add ., mixed commits or main pushes. Hand off branch/hash/paths/actual checks/limits and exact integration requests to Rohit. Implement rather than only outlining.
```

## Genius — missions and NASA evidence

```text
You are working with Genius as NASA Data & Mission Architect on The Ares Protocol for ages 7–12. Read root AGENTS.md, docs/TASKS.md, docs/CONTRACTS.md, docs/GIT_WORKFLOW.md, docs/HACKATHON_PLAN.md and src/features/missions/AGENTS.md. Inspect Git status/branch; use your own clone/worktree on feat/genius-missions from the shared main scaffold.

Implement only src/features/missions/**, preserving synchronous loadMission(): MissionData. Create six short deterministic costly decisions about power/air, shelter, food/supplies and delayed communications. Integrate at least one verified real NASA observation with bundled raw fixture, exact query, source URL, dates, units/context, usage/attribution notes and explicit mapping to simplified game rules. Use current official documentation; starting links are in your guide. Bundled data is archived, not live. Never invent NASA numbers or infer Mars crew dose directly from flare/ISS measurements. If retrieval fails, retain authored-demo and report it. No live API/key dependency for judging.

V1 effects are additive only: propose shelter-conditioned hazards/delays in NOTES.md for Rohit; don't change the reducer, contracts, UI or manifests. Validate IDs, sources, choice costs and fixture parsing using meaningful local tests. Update your own AGENTS.md/NOTES.md. Commit a working content milestone then verified evidence milestone, after npm run typecheck, npm test and npm run build. Stage only git add -- src/features/missions, inspect diff and use feat(missions): commits. No git add ., mixed commits or main pushes. Give Rohit branch, hashes, files, checks, science limits and precise rule requests. Start implementation now.
```

## Rohit — game and integration

```text
You are working with Rohit as Game Loop, Integration & Release Lead on The Ares Protocol. Read root AGENTS.md, all docs coordination files and src/features/game/AGENTS.md. Inspect Git status/branch. Develop on feat/rohit-game in your own clone/worktree from the common scaffold on main; use a separate clean main checkout for the merge queue. Never have feature agents share a working directory.

Own src/features/game/** plus the explicit shared integration files in root AGENTS.md. Do not rewrite the other five feature folders. Implement deterministic costly decisions, useful shelter protection against later hazards, science progress, honest food/communications consequences, pause/restart and explanatory outcome state. Coordinate content with Genius and reset/input hooks with Anshu; make additive contract changes centrally before consumers adapt. Preserve pure reducer entry points and one shell-owned fixed-step loop. Keep 3D/WASM failure fallback playable. Test real consequences, state transitions, depletion/clamping, full replay and winning/losing strategies. Fix the starter's research-only dominant strategy and unused shelter score.

Commit coherent tested game milestones with feat(game): or fix(game): messages, staging only your folder and individually listed owned integration files. No git add ., unrelated team dumps, force-pushes or destructive resets. Run typecheck/tests/build per milestone. Merge other feature branches serially with --no-ff after inspecting their diffs; check build and gameplay after each merge. Never merge a feature branch into a teammate's branch. Delegate folder fixes to its owner via a clear handoff. Keep docs/task status and game/NOTES.md current. Follow the deadline plan and demo checklist, preparing one verified NASA-backed scenario, source screen, production preview, backup demo and submission copy. Publish/push/deploy only if the human has authorized those actions. Report commits, actual validation and remaining limits. Proceed with implementation and integration, not just planning.
```
