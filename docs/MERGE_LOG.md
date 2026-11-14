# Merge queue — Himamshu

Owner: Himamshu. Feature owners submit handoffs; only the coordinator updates this queue and records verified main merges. Rohit owns engineering fixes; he does not run this queue.

## Available handoffs

| Branch | Reported tip | Scope | State |
| --- | --- | --- | --- |
| `feat/himamshu-world` | `97547fe` | `src/features/world/**`, `src/App.vue`, `src/contracts/index.ts` | Initial `c235948`; continuation `0c4b2cd`; art direction & mission-control dashboard `44365c5`; Earth arrival & playable station interiors `8764bfa`; NASA assets, detailed interiors, and playable Earth/orbit preflight merged by `c644a59`; checks passed |
| `feat/rohit-game` | `a17ea4b` | Game reducer/tests/audio/notes, contracts, app shell | Initial `c1a6f25`; follow-up `932f930`; hazard advisory `72f8f65`; audio synthesis, star badges, keyboard navigation `b7c9c33`; contextual station procedures, console audio, and direct decision mode merged by `44a7120`; checks passed |
| `feat/saurav-hud` | `1d6902a` | HUD component and notes | Initial `3f1419b`; hazards `28b1dc5`; transparent reserve dock and hazard toast `76d163a`; per-resource reserve animations `4d07adf`; in-game status polish `86c1beb`; science & shelter readout softening `44ff31e`; expandable science and shelter buttons `f994aa7`; stat icon spin and numerator progress roll merged by `667ae75`; checks passed |
| `feat/anshu-physics` | `4108654` | `src/features/physics/**` | Grounded astronaut controller, reset and pause merged by `dfe1d24`; checks passed |
| `feat/dixit-ui` | `0637603` | `src/features/ui/**` | Onboarding, decisions, pause, debrief replay & sources merged by `55799b3`; checks passed |
| `feat/genius-missions` | `66a5322` | `src/features/missions/**` | Six teaching decisions & NASA CME evidence merged by `a8d9a39`; alert wording reconciled by `500c830`; checks passed |

Verify refs, scope and checks before a merge; this table is not authorization to merge. Anshu and Dixit have no published branch recorded at this review.

## Remote review and publication — 14 November 2026

- Fetched origin and inspected all published branches. At the initial check, only `origin/main` existed at `710e015`; no teammate feature branches were published yet.
- Local main held coordination update `9149a4b`; local world held verified milestones `9fc1290` and `95a03b3`, with a clean worktree. All existing commits retain their configured author metadata.
- Himamshu authorized normal pushes of tested milestones and periodic checks. No feature merge is authorized or performed by this publication task.
- Created active recurring check `check-ares-team-branches`: every 30 minutes through 15 Nov 2026, 11:59 pm Asia/Katmandu. It checks branch tips/handoffs, preserves authorship and may publish reviewed tested commits under the standing authorization; it does not automatically merge branches. Local checks require the computer/app/project to remain available and applicable Git/network permissions.
- Publication completed: pushed main through `9284537` (including coordinator policy `9149a4b`) and published `feat/himamshu-world` at `95a03b3`, preserving both world milestones and their original author. Verified both remote hashes using `git ls-remote --heads origin`; local branches matched their upstreams.
- A second fetch found no additional teammate feature branches. Their unpushed work on other computers remains unavailable; later checks will review published updates. This log entry is a later documentation commit and does not merge any feature.

## Completed merges

### 14 Nov 2026 — world, game and HUD

- Himamshu resumed integration after Rohit's login/push. Verified `origin/feat/rohit-game` and `origin/feat/saurav-hud`; Rohit's earlier `2c02d15` merged main's workflow documents into his branch, not the other feature branches.
- World merge: `c235948`, preserving `9fc1290` and `95a03b3`. Game merge: `c1a6f25`, preserving Rohit's `9c975de`, `2c02d15`, `7489d9d`. HUD merge: `3f1419b`, preserving Saurav's `999a70f`. All merges were conflict-free and original author metadata remains intact.
- Game integration: Vue/TypeScript check and production build passed; 18 unique reducer/world tests passed. Browser checked station callbacks, sheltered win, unshielded research-only loss, pause/resume and resource replay with no page exceptions.
- HUD integration: production build and the same 18 unique tests passed. Browser additionally checked ARIA reserve values, reset feedback, depletion warnings and desktop/360px layouts. No horizontal overflow or page exceptions; inspected screenshots.
- Rohit published follow-up `2911ae0` during integration. Reviewed its owned paths and merged it as `932f930`: browser-native sound/mute, keyboard shortcuts, proximity descriptions and additional score fields. Build/typecheck and 19 unique tests passed; repeated the integrated browser mission flow with no page exceptions. Audio quality itself was not subjectively evaluated.
- Standard `npm test` passed 30 tests because it also discovers 12 tests in the ignored local world worktree. To verify the actual main suite once, ran `node node_modules/vitest/vitest.mjs run --exclude '**/.worktrees/**'`: 18 passed. Rohit should exclude worktree paths in test configuration.
- No Anshu, Dixit or Genius branch was available at this review. NASA evidence, varied mission content, full controller reset and final debrief UI remain with their owners. Publication is performed after the checks above; final published tip is reported in the task handoff.

### Open engineering/content requests

- Rohit: change App viewport `role="img"` to labeled `region`/`group` so world buttons are exposed to assistive technology; add `.worktrees` test exclusion; update `docs/CONTRACTS.md` to describe the additive hazard/delay/history and optional physics hooks already in code.
- Rohit/Anshu: optional reset/pause hooks are wired but the current physics adapter doesn't implement them. The shell currently says the astronaut reset even when no reset method exists; make that message conditional until the controller handoff lands.
- Genius/Dixit/Rohit: make the authored Shift 3 hazard visible before the decision, and surface the supplied structured debrief. Current content remains a repeated authored event; do not label its numbers as NASA measurements.
- Saurav/Rohit: HUD passed browser checks, but desktop HUD is a 760px block above the full-width scene. Coordinate final app layout with the UI owner; no layout file was edited during integration.

### 14 Nov 2026 — world continuation

- Reviewed and merged the previously selected `feat/himamshu-world` at `7f156a5` as `0c4b2cd`, preserving `2d5a661` (pose-driven walking/contact shadows) and `7f156a5` (supplied event feedback). No conflicts. All authored edits are under `src/features/world/**`; shared app, contracts, physics and dependencies are unchanged.
- Public `createWorld`/adapter API and station collision envelopes remain compatible. Event beacons/report render `lastHazardNotice` already supplied by game; they infer no radiation risk or damage. Reserve warning bands match the existing HUD.
- Main typecheck and production build passed. Standard `npm test` passed 48 tests including the local worktree copy; the deduplicated main suite passed 24 tests. The existing large Three/Rapier chunk warning remains.
- Production browser passed three station callbacks, sheltered win, research-only loss, pause/resume, reserve replay, event report display/clearing and 360px report/layout bounds with one canvas and no page exceptions. Feature browser additionally checked real movement/gait, reduced motion, canvas raycasts, keyboard selection, map-edge resize, repeated teardown/remount and initialization-failure cleanup. Screenshots inspected; artifacts stay ignored.
- Fresh fetch discovered `origin/feat/genius-missions` at `66a5322`. It is queued separately; this entry neither validates nor authorizes its merge. Rohit remains at `2911ae0`; Saurav's branch now also contains the already integrated main baseline. No new Anshu/Dixit branch was observed.
- Remaining requests are listed above and in world `NOTES.md`, including authored hazard wording for Rohit/Genius. No deploy or branch/worktree deletion was performed. Publication follows these checks; final pushed main hash is reported in the handoff.

### 14 Nov 2026 — Rohit (game), Saurav (HUD), Anshu (physics), Dixit (UI) serial integration

1. **`feat/rohit-game` (tip `0901e36`)**:
   - Merged as `72f8f65`, preserving Rohit's commits `8332a93`, `d634c34`, `0901e36`.
   - Scope: `docs/CONTRACTS.md`, `src/App.vue`, `src/contracts/index.ts`, `src/features/game/NOTES.md`, `src/features/game/game.test.ts`, `src/features/game/index.ts`, `vitest.config.ts`. All paths owned by Rohit.
   - Changes: Upcoming hazard advisory notice, accessible viewport `role="region"`, centered HUD container layout, and `vitest.config.ts` excluding `.worktrees/**` to prevent duplicated test execution.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (24 tests); `npm run build` passed cleanly.

2. **`feat/saurav-hud` (tip `3dd3ba7`)**:
   - Merged as `28b1dc5`, preserving Saurav's commits `aa9ef29` and `3dd3ba7`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Surfaced space weather hazards, delayed mission updates, shift delta feedback, and aligned styles with app palette.
   - Verification: `npm run typecheck` passed; `npm test` passed (24 tests); `npm run build` passed cleanly.

3. **`feat/anshu-physics` (tip `4108654`)**:
   - Merged as `dfe1d24`, preserving Anshu's commits `cc9f45d` and `4108654`.
   - Scope: `src/features/physics/index.ts`, `src/features/physics/physics.test.ts`, `src/features/physics/NOTES.md`. All paths owned by Anshu.
   - Changes: Rapier 3D dynamic body with capsule collider, character controller with ground snapping, Mars gravity ($3.72076\ \text{m/s}^2$ per NASA NSSDC), boundary clamping `[-18, 18]`, vector normalization ($3.0\ \text{m/s}$), `reset(pose?)`, `pauseInput()`, `resumeInput()`, focus/blur key clearing, and input target event suppression.
   - Verification: `npm run typecheck` passed; `npm test` passed (42 tests, including 18 physics tests); `npm run build` passed cleanly.

4. **`feat/dixit-ui` (tip `0637603`)**:
   - Merged as `55799b3`, preserving Dixit's commits `3f66a5c` and `0637603`.
   - Scope: `src/features/ui/**` (`DebriefPanel.vue`, `DecisionPanel.vue`, `MissionPanels.vue`, `OnboardingPanel.vue`, `PausePanel.vue`, `SourceCredits.vue`, `actions.ts`, `ui.test.ts`, `NOTES.md`). All paths owned by Dixit.
   - Changes: Onboarding briefing for ages 7–12, decision panel with delta badges and delayed consequence banners, pause screen, debrief panel with supportive feedback, telemetry summary and turn timeline, and science sources attribution drawer with NASA non-endorsement caveat.
   - Verification: `npm run typecheck` passed; `npm test` passed (55 tests, including 13 UI tests); `npm run build` passed cleanly.

### 14 Nov 2026 — World art direction, mission-control dashboard, and NASA missions integration

1. **`feat/himamshu-world` (tip `79b1d9b`)**:
   - Merged as `44365c5`, preserving `902f905`, `3cdb88a`, `963f122`, `3b55b8d`, `b2f19cc`, `79b1d9b`.
   - Scope: `src/features/world/**`, plus authorized shell layout in `src/App.vue` and `src/styles.css`.
   - Changes: Detailed Mars surface and outpost modules, embedded event report bounds, aligned watch reserve threshold ($\le 40$) matching integrated HUD, reworked lighting/shadows, softened architectural edges, arched greenhouse, and mission-control dashboard layout with persistent viewport, independently scrolling decision desk, and responsive stacking below 1000px.
   - Verification: `npm run typecheck` passed; `npm test` passed (56 tests); `npm run build` passed cleanly.

2. **`feat/genius-missions` (tip `66a5322`)**:
   - Merged as `a8d9a39`, preserving `a1b931d` and `66a5322`.
   - Scope: `src/features/missions/**` (`index.ts`, `missions.test.ts`, `data/PROVENANCE.md`, `data/donki-cme-may2024-raw.json`, `NOTES.md`).
   - Changes: Six authentic teaching decisions for ages 7–12, NASA DONKI CME (May 2024) space weather alert data, Perseverance MOXIE oxygen generation, CSA deep-space food production, DSN speed-of-light comms latency, and science sources with non-endorsement disclaimers.
   - Integration reconciliation commit `500c830`: In `src/features/game/index.ts`, aligned active storm hazard notice wording to include `'Solar storm strike imminent'` alongside `'Severe storm event active'`, satisfying both Genius's alert details and Rohit's `game.test.ts:78` test assertion.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (7 test files, 64 tests passed); `npm run build` passed cleanly.

All six feature branches (`feat/himamshu-world`, `feat/genius-missions`, `feat/rohit-game`, `feat/saurav-hud`, `feat/anshu-physics`, `feat/dixit-ui`) are now fully merged and verified on `main`.

### 14 Nov 2026 — Rohit (game) and Saurav (HUD) continuation integration

1. **`feat/rohit-game` (tip `e08a858`)**:
   - Merged as `b7c9c33`, preserving Rohit's commit `e08a858`.
   - Scope: `src/App.vue`, `src/features/game/NOTES.md`, `src/features/game/audio.ts`, `src/features/game/game.test.ts`, `src/features/game/index.ts`. All paths owned by Rohit.
   - Changes: Dynamic Web Audio synthesizer (`playStart`, `playRestart`, `playTransmission`, `playOxygen`, `playShield`, `playWarning`), star rating & outpost efficiency score calculation in debrief evaluation, keyboard navigation (1-4 choices, Enter/Space/S start, Enter/Space/R replay), station inspection badge with clear button, and idle pose proximity optimization.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (7 test files, 66 tests passed); `npm run build` passed cleanly.

2. **`feat/saurav-hud` (tip `20c52af`)**:
   - Merged as `76d163a`, preserving Saurav's commits `08724e9`, `6e31f6b`, `fa94cb4`, `1d7051e`, `a754f2a`, `20c52af`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Transparent reserve dock positioned in the lower-left of the 3D viewport with line icons, translucent colored bars, and accessible tooltips on icon hover/focus. Animated hazard outcome toast with pulse and 5s auto-dismiss, respecting reduced-motion settings. Teleports directly into game viewport without altering shell files.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (7 test files, 66 tests passed); `npm run build` passed cleanly.
   - Browser smoke check: Vite preview on `http://127.0.0.1:4173/` verified clean load with 0 console errors/exceptions, 3D Mars viewport and module inspection, mission start transition, sound toggle, pause/resume, keyboard choice shortcuts (1/2/3) across Shifts 1–4, CME hazard alert and shelter mitigation feedback, and live telemetry synchronization with lower-left HUD reserve bars.

3. **`feat/himamshu-world` (tip `1f93ff1`)**:
   - Merged as `8764bfa`, preserving Himamshu's commits `df7fe90` and `1f93ff1`.
   - Scope: `src/App.vue`, `src/contracts/index.ts`, `src/features/game/activities.ts`, `src/features/game/activities.test.ts`, `src/features/physics/index.ts`, `src/features/physics/physics.test.ts`, `src/features/world/ActivityPanel.vue`, `src/features/world/expedition.ts`, `src/features/world/index.ts`, `src/features/world/world.css`, `src/features/world/NOTES.md`.
   - Changes: Procedural 8-second Earth→Mars arrival sequence with skip/reduced-motion support, cutaway station interior views (Habitat, Solar/Science station, Greenhouse) with bounded interior physics movement and pose caching, and ordered module activity checklist procedures tied to shift decisions that update outpost telemetry upon execution.
   - Conflict resolution: Reconciled `src/App.vue` viewport header by placing the arrival overlay cleanly above the status bar while preserving the module selection clear button and status message.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (8 test files, 70 tests passed); `npm run build` passed cleanly.
   - Browser smoke check: Vite preview on `http://127.0.0.1:4173/` verified clean load with 0 errors, briefing launch, Earth→Mars transit overlay and skip button, Mars landing, module proximity selection, accessible and manual door entry into cutaway Habitat interior, sequential checklist execution ("Check air filter" -> "Open intake valve" -> "Start air processor"), reserve dispatch to reducer (Power: 58, Air: 88, Supplies: 65), safe exit to exterior spawn, and transition to Shift 2.

### 14 Nov 2026 — Saurav (HUD) and Rohit (game) continuation integration & Standing Auto-Merge Mandate

Himamshu issued a standing mandate authorizing the merge coordinator to automatically discover, verify, and merge all published feature branches serially upon availability without requiring manual branch-by-branch approval prompts, provided all tests and builds pass cleanly.

1. **`feat/saurav-hud` (tip `474254d`)**:
   - Merged as `4d07adf`, preserving Saurav's commits `42b9a07`, `64706c0`, and `474254d`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Independent per-reserve motion tracking and animation (shimmer on gains, brief shimmy on losses), one-shot fill shine on reaching 100 capacity, continuous pulse animation on critical reserves ($\le 20$), and post-merge validation.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (8 test files, 70 tests passed); `npm run build` passed cleanly.

2. **`feat/rohit-game` (tip `a17ea4b`)**:
   - Merged as `44a7120`, preserving Rohit's commit `a17ea4b`.
   - Scope: `src/App.vue`, `src/features/game/NOTES.md`, `src/features/game/activities.test.ts`, `src/features/game/activities.ts`. All paths owned by Rohit.
   - Changes: Shift-specific contextual 3-step procedures for every decision across all 6 shifts with out-of-order bounds checks and unit tests; synthesized console step audio feedback (`playDecision` on correct steps, `playWarning` on mistakes, `playRestart` on cancellation); accessible "Direct Decisions / 3D Procedures" toggle in viewport header; keyboard shortcuts `KeyT` (accessible travel to task door) and `Escape` (cancel task).
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (8 test files, 72 tests passed); `npm run build` passed cleanly.

### Standing Auto-Merge Automation Policy

- Authorized by Himamshu on 14 Nov 2026: The merge coordinator automatically polls `origin`, discovers any feature branches containing unmerged commits ahead of `main`, merges each serially with `--no-ff`, executes `npm run typecheck`, `npm test`, and `npm run build`, logs the verified merge, and pushes `main` to `origin`.
- Manual approval prompts are disabled for normal passing merges. The coordinator stops and alerts Himamshu only if a merge conflict arises or if automated checks fail.

### 14 Nov 2026 — Saurav (HUD) in-game status polish integration

1. **`feat/saurav-hud` (tip `dbd126c`)**:
   - Merged as `86c1beb`, preserving Saurav's commits `661819a`, `abc5695`, and `dbd126c`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Enlarged science and shelter status indicators with progress tracks, clamped accent callouts for shift updates, restrained icon hover/focus shimmy and gentle bar highlight, and ensured HUD and hazard toast render only during running mission phase.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (8 test files, 72 tests passed); `npm run build` passed cleanly.

### 14 Nov 2026 — Saurav (HUD) science & shelter readout softening integration

1. **`feat/saurav-hud` (tip `0467edb`)**:
   - Merged as `44ff31e`, preserving Saurav's commit `0467edb`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Removed gradient panel wash and decorative divider from science and shelter secondary cards; set tracks and panels transparent; softened glow effects, icon, label, number, and fill colors for visual balance against the 3D viewport.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (8 test files, 72 tests passed); `npm run build` passed cleanly.

### 14 Nov 2026 — Saurav (HUD) expandable science & shelter buttons integration

1. **`feat/saurav-hud` (tip `29ad929`)**:
   - Merged as `f994aa7`, preserving Saurav's commits `35c2f6b`, `7a73552`, `45d953d`, `ee96b46`, and `29ad929`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Replaced always-visible science and shelter readouts with two independent icon-only buttons with hover, keyboard focus, and click-to-pin expansion revealing value, progress track, and status. Animated progress bubbles on value gains, and simplified shift feedback.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (8 test files, 72 tests passed); `npm run build` passed cleanly.

### 14 Nov 2026 — Himamshu (world) NASA assets, detailed interiors, and playable Earth/orbit preflight integration

1. **`feat/himamshu-world` (tip `97547fe`)**:
   - Merged as `c644a59`, preserving Himamshu's commits `e5324bd` and `97547fe`.
   - Scope: `src/App.vue`, `src/contracts/index.ts`, `src/features/world/**` (including `assets/**`, `nasa-assets.ts`, `interiors.ts`, `preflight.ts`, `preflight.test.ts`, `music.ts`, `music.test.ts`, `PreparationPanel.vue`, `AssetCredits.vue`, `ActivityPanel.vue`, `CREDITS.md`, `NOTES.md`).
   - Changes: Local NASA GLB models (astronaut, EO-1, Opportunity), Earth/Mars textures, local Draco WASM/JS decoder with asynchronous loading and procedural fallbacks; detailed cutaway interiors with equipment, racks, monitors, hydroponic beds, and raycast 3D console screens; playable Earth departure checks and orbital communications cabin with sequential control validation and accessible remote mode; stage-specific music tracks (Snowfall, Space, happy tune) with pause/mute/visibility management; and visible asset attribution / NASA non-endorsement modal.
   - Conflict reconciliation: In `src/App.vue`, reconciled the header launch button condition (`state.phase === 'ready' && !preparation && flightProgress === null`) while preserving Rohit's direct decision mode toggle button (`⚡ Direct Mode` / `🚀 3D Procedures`).
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (10 test files, 74 tests passed); `npm run build` passed cleanly with all hashed assets generated in `dist/assets/`.

### 14 Nov 2026 — Saurav (HUD) stat icon spin & numerator progress roll integration

1. **`feat/saurav-hud` (tip `1d6902a`)**:
   - Merged as `667ae75`, preserving Saurav's commits `c81a6dc`, `50a70f4`, and `1d6902a`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Thin circular outline with one-shot spin on icon hover/focus; background-free progress feedback pop with numerator roll animation and gentle denominator nudge; shift update description placed below heading.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (10 test files, 74 tests passed); `npm run build` passed cleanly.

### Updated open requests

- **Rohit / Saurav / Dixit**: Verify overall HUD and UI visual balance in the browser once all panels are rendered together on the new mission-control dashboard.

For each completed merge, append:

- Date, feature owner, branch and checked feature-tip hash.
- Merge commit hash; no duplicate entry or cherry-pick of an already merged feature.
- Changed paths and any ownership/contract concerns.
- Typecheck, tests, build and browser checks actually run, with failures/limits if any.
- Open requests and responsible owner; stop the queue while an unresolved conflict/check failure remains.

Record a merge hash in a later log-only commit or final handoff; do not amend shared history just to insert a commit's own hash. Remote publication and deployment status must be stated separately.
