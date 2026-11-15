# Merge queue — Himamshu

Owner: Himamshu. Feature owners submit handoffs; only the coordinator updates this queue and records verified main merges. Rohit owns engineering fixes; he does not run this queue.

## Available handoffs

| Branch | Reported tip | Scope | State |
| --- | --- | --- | --- |
| `feat/himamshu-world` | `aa07bf0` | `src/features/world/**`, `src/App.vue`, `src/contracts/index.ts`, `docs/CONTRACTS.md`, `src/features/physics/**`, `src/features/game/**`, `src/features/ui/**` | Initial `c235948`; continuation `0c4b2cd`; art direction & mission-control dashboard `44365c5`; Earth arrival & playable station interiors `8764bfa`; NASA assets, detailed interiors, and playable Earth/orbit preflight `c644a59`; procedural suit rig `2a4f7f7`; Mixamo locomotion clips `0fae932`; openable doors & free building exploration `79ad90d`; third-person exploration & outdoor Earth campus merged by `e82fa10`; station minigames and task cues merged by `e05925c`; walk-through interiors & optimized environment models merged by `dded677`; paid station tasks and card-free gameplay loop merged by `42dd960`; work interactables and outpost visual refresh merged by `0fac3be`; realistic earth environment with mountains, water, forest, wildflowers and clouds merged by `49aab34`; realistic mars landscape, atmosphere, phobos, and alien formations merged by `bca2400`; seamless martian terrain & NASA visual fidelity merged by `aa07bf0`; checks passed |
| `feat/rohit-game` | `46f4189` | Game reducer/tests/audio/notes, contracts, app shell | Initial `c1a6f25`; follow-up `932f930`; hazard advisory `72f8f65`; audio synthesis, star badges, keyboard navigation `b7c9c33`; contextual station procedures `44a7120`; full-reserve sound, in-viewport deck overlay, and roguelike choice cards merged by `828493c`; visual earth launch and orbital space station minigames merged by `6ae0597`; checks passed |
| `feat/saurav-hud` | `e3a27f0` | HUD component and notes | Initial `3f1419b`; hazards `28b1dc5`; transparent reserve dock and hazard toast `76d163a`; per-resource reserve animations `4d07adf`; in-game status polish `86c1beb`; science & shelter readout softening `44ff31e`; expandable science and shelter buttons `f994aa7`; stat icon spin and numerator progress roll `667ae75`; gentle cursor parallax and motion polish `afff7e4`; viewport event toast details `94ce20e`; playful reserve meter visuals `d77cb4c`; Earth & orbit stage HUD displays merged by `17f518b`; active station job and payout merged by `5cb4c42`; checks passed |
| `feat/anshu-physics` | `9a4e770` | `src/features/physics/**` | Grounded astronaut controller, reset and pause merged by `dfe1d24`; WASD movement on focused buttons merged by `3e854a1`; Earth rocket/gantry collider fix merged by `2df59b1`; checks passed |
| `feat/dixit-ui` | `fc25d14` | `src/features/ui/**`, `src/App.vue`, `src/assets/**` | Initial onboarding, decisions, pause, debrief replay & sources `55799b3`; cinematic splash screen, Mars observatory menu, and 3D Earth view merged by `b4549b4`; audio volume/mute synthesizer controls and command deck mission info toggle controls merged by `c36bd06`; in-game pause audio, celebration badge, task board UI, and minigames merged by `dfeaaaa`; individual contributor roles in mission credits merged by `072302c`; arrival guidance and deferred hazard timer merged by `44883e3`; checks passed |
| `feat/genius-missions` | `87c2189` | `src/features/missions/**` | Six teaching decisions & NASA CME evidence `a8d9a39`; alert wording reconciled by `500c830`; refreshable DONKI snapshot and raw NASA datasets `e4abf24`; observation details and NASA API documentation merged by `15ea38e`; checks passed |
| `feat/ares-rocket-cabin` | `158c145` | `src/features/world/**`, `src/features/ui/**`, `src/features/game/**`, `src/App.vue`, `src/contracts/**`, docs | Ares flight-cabin interior, seat marker, panoramic window scenery, cabin seating sequence, flight deck transfer controls merged by `b44019a`; checks passed |

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

### 14 Nov 2026 — Rohit (game), Himamshu (world), and Saurav (HUD) continuation integration

1. **`feat/rohit-game` (tip `4d02fd0`)**:
   - Merged as `828493c`, preserving Rohit's commits `8653e0c` and `4d02fd0`.
   - Scope: `src/App.vue`, `src/contracts/index.ts`, `src/features/game/NOTES.md`, `src/features/game/audio.ts`, `src/features/game/game.test.ts`, `src/features/game/index.ts`. All paths owned by Rohit.
   - Changes: Synthesizer full-reserve ascending chime ($D5 \to A5 \to D6$) triggered when any resource crosses to 100%; in-viewport command deck overlay allowing full-screen surface exploration with toggle (`KeyC`); roguelike choice cards with additive rarity types (`vital`, `hazard-response`, `experimental`, `standard`), presentation badges, and tactile hover states.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (10 test files, 75 tests passed); `npm run build` passed cleanly.

2. **`feat/himamshu-world` (tip `bd51017`)**:
   - Merged as `2a4f7f7`, preserving Himamshu's commit `bd51017`.
   - Scope: `src/features/world/CREDITS.md`, `src/features/world/NOTES.md`, `src/features/world/astronaut.ts`, `src/features/world/index.ts`, `src/features/world/nasa-assets.ts`, `src/features/world/resources.ts`, `src/features/world/suit-rig.test.ts`, `src/features/world/suit-rig.ts`. All paths owned by Himamshu.
   - Changes: Procedural suit rig for the NASA astronaut model, binding animated joints and limb rotations to player movement vectors and posture states; added unit tests in `suit-rig.test.ts`.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (11 test files, 78 tests passed); `npm run build` passed cleanly.

3. **`feat/saurav-hud` (tip `2bdacef`)**:
   - Merged as `afff7e4`, preserving Saurav's commits `5f6aedd`, `50eaced`, and `2bdacef`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Eased sub-pixel cursor parallax with distinct directions and depths across HUD elements and hazard toast (disabled on reduced-motion); softened low-reserve meter pulse; progress pop positioned beside icon.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (11 test files, 78 tests passed); `npm run build` passed cleanly.

### 14 Nov 2026 — Himamshu (world) and Saurav (HUD) locomotion and event toast integration

1. **`feat/himamshu-world` (tip `21ce887`)**:
   - Merged as `0fae932`, preserving Himamshu's commit `21ce887`.
   - Scope: `src/features/world/**` (including `assets/astra.glb`, `manifest.json`, `astronaut.ts`, `expedition.ts`, `index.ts`, `locomotion.ts`, `locomotion.test.ts`, `nasa-assets.ts`, `prepare-mixamo.py`, `AssetCredits.vue`, `CREDITS.md`, `NOTES.md`).
   - Changes: Integrated Mixamo astronaut idle and walking locomotion blend tree with speed-matched stride, weight transitions, animation mixer lifecycle management, and unit tests in `locomotion.test.ts`. Added Blender Mixamo animation extraction script and updated 3D asset manifest.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (12 test files, 81 tests passed); `npm run build` passed cleanly.

2. **`feat/saurav-hud` (tip `c5973b1`)**:
   - Merged as `94ce20e`, preserving Saurav's commits `8af0f6f`, `164ff68`, and `c5973b1`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Surfaced viewport event toast details and contextual telemetry cues, matching the updated command deck aesthetic.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (12 test files, 81 tests passed); `npm run build` passed cleanly.

### 14 Nov 2026 — Himamshu (world) openable doors and free building exploration integration

1. **`feat/himamshu-world` (tip `20a8f9d`)**:
   - Merged as `79ad90d`, preserving Himamshu's commits `5573049` and `20a8f9d`.
   - Scope: `docs/CONTRACTS.md`, `src/App.vue`, `src/contracts/index.ts`, `src/features/world/ActivityPanel.vue`, `src/features/world/DoorPanel.vue`, `src/features/world/NOTES.md`, `src/features/world/doors.test.ts`, `src/features/world/doors.ts`, `src/features/world/expedition.ts`, `src/features/world/index.ts`, `src/features/world/interiors.ts`, `src/features/world/models.ts`, plus documentation updates in `AGENTS.md`, `docs/TASKS.md`, `docs/PROMPTS.md`, and all feature `AGENTS.md` files.
   - Changes: User-approved gameplay direction assigning task-first exploration, randomized job offers, post-task card trade-offs, and cohesive station visuals. Added animated split sliding doors to all three Mars outpost modules (Habitat, Solar Station, Greenhouse) and matching interior front exits. Walk-in and walk-out transitions, E key or visual button open/close controls with door-readiness gating (instant in reduced-motion mode). Bounded interior exploration permitted without gating on active job selection; existing 3-step procedures remain intact. Exploration ribbon controls under viewport with accessible door travel. Additive contracts: `setDoorState`, `isDoorOpen`, and `setMotionPaused` (fixing cosmetic idle during preparation pause). Added unit tests in `doors.test.ts`.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (13 test files, 84 tests passed); `npm run build` passed cleanly in 1.11s with all client assets bundled.

### 14 Nov 2026 — Himamshu (world) third-person exploration and outdoor Earth campus integration

1. **`feat/himamshu-world` (tip `9df93f0`)**:
   - Merged as `e82fa10`, preserving Himamshu's commits `e82521e` and `9df93f0`.
   - Scope: `docs/CONTRACTS.md`, `src/App.vue`, `src/contracts/index.ts`, `src/features/physics/camera-movement.test.ts`, `src/features/physics/index.ts`, `src/features/physics/NOTES.md`, `src/features/world/PreparationPanel.vue`, `src/features/world/earth.ts`, `src/features/world/expedition.ts`, `src/features/world/follow-camera.ts`, `src/features/world/index.ts`, `src/features/world/world.css`, `src/features/world/NOTES.md`.
   - Changes: Perspective third-person follow camera with drag/touch rotation, wheel/pinch zoom, and accessible rotate/zoom/reset controls using installed Three.js OrbitControls addon (suppressing accidental clicks during drags); outdoor Earth training campus with grass, walking paths, training buildings, distant launch vehicle, and openable training lab door; camera-heading relative movement mapping via additive `WorldAdapter.setEarthOutside/getCameraYaw` and `PhysicsAdapter.setCameraYaw` with unit tests in `camera-movement.test.ts`.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (14 test files, 87 tests passed); `npm run build` passed cleanly in 1.18s.

### 14 Nov 2026 — Himamshu (world) station minigames and task availability cues integration

1. **`feat/himamshu-world` (tip `278c91e`)**:
   - Merged as `e05925c`, preserving Himamshu's commit `278c91e`.
   - Scope: `docs/CONTRACTS.md`, `src/App.vue`, `src/contracts/index.ts`, `src/features/world/ActivityPanel.vue`, `src/features/world/NOTES.md`, `src/features/world/StationMinigame.vue`, `src/features/world/index.ts`, `src/features/world/minigame.test.ts`, `src/features/world/minigame.ts`, `src/features/world/world.css`. All paths within Himamshu's assigned feature and coordinated gameplay/door integration scope.
   - Changes: Accessible station-computer minigames for all three modules (Habitat air leak patch panel, Solar power-cell circuit alignment, Greenhouse hydroponic leaf inspection and root watering) with keyboard/touch alternative buttons; floating 3D station status labels with gentle bob and hover lift; task availability cues ('!' exclamation badges on stations offering tasks, and a 5s dismissible banner notification with synthesized audio chime); additive contract `setAvailableTasks` on `WorldAdapter`; unit tests in `minigame.test.ts`.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (15 test files, 91 tests passed); `npm run build` passed cleanly in 943ms.

### 14 Nov 2026 — Genius (missions) refreshable DONKI snapshot and raw NASA datasets integration

1. **`feat/genius-missions` (tip `2ecab55`)**:
   - Merged as `e4abf24`, preserving Genius's commits `4a9315f`, `45a8eab`, `8d59925`, `d45957a`, `ebe9358`, and `2ecab55`.
   - Scope: `src/features/missions/**` (`NOTES.md`, `data/PROVENANCE.md`, `data/donki-cme-snapshot.json`, `data/donki-flr-sep-may2024-raw.json`, `data/insight-mars-weather-raw.json`, `data/nasa-apis-extra-raw.json`, `index.ts`, `missions.test.ts`, `scripts/refresh-donki-snapshot.mjs`, `scripts/refresh-donki-snapshot.test.mjs`). All paths owned by Genius.
   - Changes: Maintainer script `scripts/refresh-donki-snapshot.mjs` for date-bounded NASA DONKI CME queries; local bundled snapshot for 2026-11-07 through 2026-11-14 with selected observation `2026-11-13T21:24:00-CME-001` (analysis speed 474 km/s); provenance documentation in `data/PROVENANCE.md`; raw NASA API dataset fixtures; updated source descriptions distinguishing authored shelter drill / reserve loss from measured Mars crew dose; unit tests in `scripts/refresh-donki-snapshot.test.mjs` and `missions.test.ts`.
   - Cross-feature request recorded: Genius requests Rohit (game) consider a 1% once-per-expedition pre-flight launch safety abort with Dixit (UI) presenting the non-graphic stop and retry action.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (16 test files, 95 tests passed); `npm run build` passed cleanly in 818ms.

### 14 Nov 2026 — Genius (missions), Saurav (HUD), and Dixit (UI) serial integration

1. **`feat/genius-missions` (tip `87c2189`)**:
   - Merged as `15ea38e`, preserving Genius's commit `87c2189`.
   - Scope: `src/features/missions/NOTES.md`. All paths owned by Genius.
   - Changes: Expanded observation snapshot details, NASA API query guidance, and documented distinction between measured Mars sensor data and authored simulation models.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (16 test files, 95 tests passed); `npm run build` passed cleanly.

2. **`feat/saurav-hud` (tip `45d52be`)**:
   - Merged as `d77cb4c`, preserving Saurav's commits `b053a2d`, `8035c96`, and `45d52be`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Playful reserve meter visuals with rounded pill meters, distinct resource-colored gauge tracks, refined warning states, and refreshed micro-interactions.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (16 test files, 95 tests passed); `npm run build` passed cleanly.

3. **`feat/dixit-ui` (tip `a974254`)**:
   - Merged as `b4549b4`, preserving Dixit's commits `797f857`, `ef0565a`, and integration merge `a974254`.
   - Scope: `src/features/ui/SplashScreen.vue`, `src/features/ui/LoginScreen.vue`, `src/features/ui/NOTES.md`, `src/App.vue`, and assets in `src/assets/**`.
   - Changes: Cinematic splash screen featuring Ares logo with 2.5s timed transition; Mars observatory title and login screen with interactive 3D telescope view of Earth, Moon, and atmospheric cloud layers; start mission action button initiating the game sequence.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (16 test files, 95 tests passed); `npm run build` passed cleanly in 1.06s.

### 14 Nov 2026 — Saurav (HUD) Earth and orbit stage HUD displays integration

1. **`feat/saurav-hud` (tip `603b5df`)**:
   - Merged as `17f518b`, preserving Saurav's commits `097963f` and `603b5df`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav.
   - Changes: Integrated Earth launch checklist readout and orbital flight trajectory indicators into in-viewport HUD during preflight/preparation phases, matching the aesthetic of the active Mars mission overlay.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (16 test files, 95 tests passed); `npm run build` passed cleanly in 1.12s.

### 14 Nov 2026 — Himamshu (world) walk-through interiors and optimized environment models integration

1. **`feat/himamshu-world` (tip `4463852`)**:
   - Merged as `dded677`, preserving Himamshu's commits `f8e44cb` and `4463852`.
   - Scope: `docs/CONTRACTS.md`, `src/App.vue`, `src/contracts/index.ts`, `src/features/physics/AGENTS.md`, `src/features/physics/NOTES.md`, `src/features/physics/building-movement.test.ts`, `src/features/physics/index.ts`, `src/features/world/**`. All paths within Himamshu's assigned feature, coordinated gameplay/door scope, and shared building collision contracts.
   - Changes: Replaced interior room portal transitions with continuous hollow, walk-through 6.4m outpost buildings in the outdoor scene (Habitat, Solar Station, Greenhouse) with Rapier solid walls, doorways, and interior furniture colliders; door readiness gating and doorway clearance checks; perspective follow camera shortening against interior walls/ceilings; optimized environment 3D assets (NASA/JPL-Caltech Earth and Mars globes, RenderX Moon, Curiosity rover, SebastianSosnowski Olympus Mons terrain, Nicholas-3D warehouse); CC BY 4.0 provenance documentation and asset hashes in `CREDITS.md`; additive physics contract `setDoorOpen` and unit tests in `building-movement.test.ts`.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (17 test files, 101 tests passed); `npm run build` passed cleanly in 1.54s.

### 14 Nov 2026 — Himamshu (world) paid station tasks and card-free gameplay loop integration

1. **`feat/himamshu-world` (tip `a11637f`)**:
   - Merged as `42dd960`, preserving Himamshu's sync commit `c53fb5e` and feature commit `a11637f`.
   - Scope: `AGENTS.md`, `docs/CONTRACTS.md`, `docs/PROMPTS.md`, `docs/TASKS.md`, `src/App.vue`, `src/contracts/index.ts`, `src/features/game/AGENTS.md`, `src/features/game/NOTES.md`, `src/features/game/index.ts`, `src/features/game/station-game.test.ts`, `src/features/game/station-game.ts`, `src/features/hud/AGENTS.md`, `src/features/missions/AGENTS.md`, `src/features/physics/AGENTS.md`, `src/features/ui/AGENTS.md`, `src/features/ui/DebriefPanel.vue`, `src/features/ui/MissionPanels.vue`, `src/features/ui/NOTES.md`, `src/features/ui/OnboardingPanel.vue`, `src/features/ui/TaskBoard.vue`, `src/features/world/AGENTS.md`, `src/features/world/ActivityPanel.vue`, `src/features/world/NOTES.md`.
   - Changes: User-requested card-free gameplay direction replacing the three-card decision loop with five persistent station work orders in `src/features/game/station-game.ts`; one-time positive payout upon interactive minigame completion; six completed jobs trigger mission debrief; active-time resource consumption (every 20s) and warned space hazards (every 30s); matching maintenance grants 60s hazard immunity and shelter $\ge 15$ blocks solar storms; validated start/cancel/complete tokens; fallback mission clock on engine initialization failure; unit tests in `station-game.test.ts`.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (18 test files, 118 tests passed); `npm run build` passed cleanly in 1.52s.

### 14 Nov 2026 — Anshu (physics) WASD movement on focused buttons integration

1. **`feat/anshu-physics` (tip `7122c7b`)**:
   - Merged as `3e854a1`, preserving Anshu's commit `7122c7b`.
   - Scope: `src/features/physics/NOTES.md`, `src/features/physics/index.ts`, `src/features/physics/physics.test.ts`. All paths owned by Anshu.
   - Changes: Restricted keyboard input suppression to text-entry elements (`input`, `textarea`, `select`, `[contenteditable]`), keeping WASD and arrow keys active when focus is on interactive buttons (such as station action buttons or command deck controls); added regression test in `physics.test.ts`.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (18 test files, 119 tests passed); `npm run build` passed cleanly in 2.26s.

### 14 Nov 2026 — Dixit (UI) audio settings and command deck controls integration

1. **`feat/dixit-ui` (tip `aea6ba9`)**:
   - Merged as `c36bd06`, preserving Dixit's commits `d7518d1`, `a7d46bf`, and `aea6ba9`.
   - Scope: `src/App.vue`, `src/features/ui/LoginScreen.vue`. All paths owned by Dixit or within minimal shell controls.
   - Changes: Connected sound volume slider and mute checkbox to `soundFX.enabled` in outpost audio synthesizer with an accessible test sound tone button; updated command deck toggle button in viewport header to display "ℹ Mission Info" / "✕ Close Deck" across mission phases; added corner close button (`deck-close-corner-btn`) to dismiss deck overlay.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (18 test files, 119 tests passed); `npm run build` passed cleanly in 1.05s.

### 14 Nov 2026 — Himamshu (world) work interactables and outpost visual refresh integration

1. **`feat/himamshu-world` (tip `a510847`)**:
   - Merged as `0fac3be`, preserving Himamshu's sync commit `5bf27c1` and feature commit `a510847`.
   - Scope: `src/App.vue`, `src/features/world/**` (`AGENTS.md`, `AssetCredits.vue`, `CREDITS.md`, `NOTES.md`, `assets/space-man.glb`, `atmosphere.ts`, `buildings.ts`, `earth.ts`, `follow-camera.ts`, `index.ts`, `interactables.test.ts`, `interactables.ts`, `interiors.ts`, `models.ts`, `nasa-assets.ts`, `shell.css`, `tools/prepare-space-man.py`, `work-machines.ts`, `world.css`). All paths within Himamshu's assigned feature and coordinated gameplay/door scope.
   - Changes: Five physical interactive machines inside outpost modules (Habitat air patch panel and life-support console, Solar power cell and battery switchboard, Greenhouse hydroponic bed control) with proximity detection, eligible glow, raycast hover/click and keyboard focus/Enter/E activation. World-local additive API `setInteractables`, `onInteract`, `setPrompt` via `WorkWorldAdapter`. Replaced `TaskBoard` in `App.vue` with physical machine interaction workflow; accessible single-machine fallback cycling. Outpost visual refresh with atmospheric sky shader gradient, directional warm sun, static soft shadows, room-ambient color balance (amber Habitat, blue-white Solar, green Greenhouse), and optimized Sloyd Space Man astronaut suit model exhibit (CC BY 4.0, 470KB). Added unit tests in `interactables.test.ts`.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (19 test files, 123 tests passed); `npm run build` passed cleanly in 1.39s with all assets bundled.

### Updated open requests

- **Rohit / Saurav / Dixit**: Verify overall HUD and UI visual balance in the browser once all panels are rendered together on the new mission-control dashboard.

For each completed merge, append:

- Date, feature owner, branch and checked feature-tip hash.
- Merge commit hash; no duplicate entry or cherry-pick of an already merged feature.
- Changed paths and any ownership/contract concerns.
- Typecheck, tests, build and browser checks actually run, with failures/limits if any.
- Open requests and responsible owner; stop the queue while an unresolved conflict/check failure remains.

Record a merge hash in a later log-only commit or final handoff; do not amend shared history just to insert a commit's own hash. Remote publication and deployment status must be stated separately.

### 14 November — verified backup spaceflight integration

User explicitly requested merging all branches and recovering `backup/uncommitted-changes` (`00bd30f`). Integrated on `codex/integrate-spaceflight` from main `3097b43`, preserving the newer card-free machine jobs, glass outpost UI, model credits and follow-camera framing while recovering guided launch/landing, orbit preparation, spacecraft telemetry, first-person controls and gravity-dependent jumping.

Resolved nine overlapping files semantically. Shell fixes resume walking after touchdown, reopen the flight deck at each stage, map four Earth checks onto the three physical consoles, preserve P for pause and Space for jump, and set gravity after async physics initialization. World picking aims through the locked crosshair and releases mouse lock when a machine opens. Physics retains WASD on focused buttons while Space activates buttons without also jumping; blur/pause clears queued jumps. The new headless jump test supplies the browser performance clock required by Rapier profiling.

Validation: typecheck passed; all 141 tests in 24 files passed; production build passed (existing large-chunk advisory remains). Production browser at 1440x1000: four Earth checks, four launch prompts, flight pause/resume, three orbit checks, six landing prompts and touchdown; all five machine types, six-job victory, replay and accessible machine fallback; first-person V toggle, E starts a job and releases mouse lock, third-person restoration. At 360x800: no document overflow; minigame and camera/door controls reachable. No runtime/console errors during the flight and six-job scripts. Local artifacts: `output/playwright/merge-spaceflight-mars.png`, `world-refresh-mobile-minigame.png`, `merge-camera-mobile.png` (ignored).

Limits: flight sequence timing and deployment prompts are authored, simplified gameplay; telemetry does not drive victory or stage timing. Orbit uses zero effective cabin-controller acceleration to represent free fall, not absence of gravitational attraction. Native pointer-lock crosshair clicking was not separately tested with a physical mouse; keyboard work interaction and release behavior were browser-tested. Optional spacecraft Rapier contact backend is not selected or validated. npm/package-lock remains the active install workflow; the backup's pnpm lock is retained as recovered history.

Main integration: backup merge resolution committed as 131cfcb (parents 3097b43 and 00bd30f); merged into main as 7c8a647. Main was clean and unchanged remotely after fetch. Main typecheck, all 141 tests and build passed again; its source tree matches the browser-tested integration commit. All six published team feature tips and the backup tip are ancestors of main. Original commits/authorship preserved; no branch deleted or history rewritten.

### 14 November — hands-on minigames / camera direction
Merged codex/hands-on-minigames (8576342): non-inverted right-click orbit, dust/sealant brushing, drag-to-connect battery cables, animated root watering and survey mineral scanning. Five world-only files; reward/API contract unchanged. Focused checks per user request: typecheck, 10 existing minigame/first-person tests, Vite build, browser workbench smoke (dust/cable completion once, watering, scan), actual OrbitControls yaw sign and 360px layout. Final feedback copy follows build; no full flight/mission suite repeated. Detailed handoff in world/NOTES.md. Clean main source matches feature except this log.

### 14 Nov 2026 — Dixit (UI) in-game pause audio, celebration badge, task board UI & minigames integration

1. **`feat/dixit-ui` (tip `9741424`)**:
   - Merged as `dfeaaaa`, preserving Dixit's commits `999a071`, `5c94462`, `4f7cc74`, and `9741424`.
   - Scope: `src/features/ui/DebriefPanel.vue`, `src/features/ui/PausePanel.vue`, `src/features/ui/TaskBoard.vue`, `src/features/ui/minigames/GreenhouseMiniGame.vue`, `src/features/ui/minigames/SolarStationWireFix.vue`. All paths strictly within Dixit's owned `src/features/ui/**` directory.
   - Changes: In-game pause panel audio synthesizer controls (volume slider, mute checkbox, beep test button) and restart expedition button; animated celebration badge and star banner in DebriefPanel upon mission victory; refreshed sci-fi TaskBoard design with station badge pills, mission progress indicators, active time tracker, consumption rates, accessible mode status, and interactive start work order buttons; standalone wire-fix and greenhouse minigame components.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (24 test files, 141 tests passed); `npm run build` passed cleanly in 1.43s with all assets bundled.

### 14 November — quieter exploration and centered work
Merged codex/quiet-centered-work (45abb36): no exploration sidebar; nearby E/click opens centered compact work; doors/pause kept small; wires accept any unused matching pair in any order and retain connections. Authored hazards now use seeded random windows with quiet periods and an 8s warning, not fixed 30s cycling. Focused checks only per user: typecheck, 21 station-game/minigame tests, Vite build, in-game desktop/mobile E + mismatch + three-pair connection smoke (no runtime errors). Final cable visual alignment/resume guard typechecked after smoke; full suite not repeated. Main was clean and unchanged remotely.

### 14 Nov 2026 — Rohit (game) visual earth launch and orbital space station minigames integration

1. **`feat/rohit-game` (tip `46f4189`)**:
   - Merged as `6ae0597`, preserving Rohit's commits `46a8ed3`, `8e64600`, `e70b346`, and merge `46f4189`.
   - Scope: `src/App.vue`, `src/features/game/NOTES.md`, `src/features/game/VisualPreflightMinigame.vue`, `src/features/game/minigame.test.ts`. All paths owned by Rohit (`src/features/game/**` and shared app wiring).
   - Changes: Integrated rich visual mini-games for preflight and orbital preparation steps (`VisualPreflightMinigame.vue`) replacing text-based checklist controls with interactive, child-friendly visual minigames; unit tests in `minigame.test.ts`; integrated into `App.vue` with control routing, pause/skip support, and upstream launch/orbit step contract compatibility.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (25 test files, 150 tests passed); `npm run build` passed cleanly in 1.38s with all client assets bundled.

### 14 Nov 2026 — Dixit (UI) mission credits individual contributor roles integration

1. **`feat/dixit-ui` (tip `e62ae41`)**:
   - Merged as `072302c`, preserving Dixit's commit `e62ae41`.
   - Scope: `src/features/ui/LoginScreen.vue`. Strictly within Dixit's owned UI path.
   - Changes: Updated credits drawer in `LoginScreen.vue` with individual contributor roles for the Ares Protocol hackathon team (Himamshu — 3D World & Engine Lead; Saurav — HUD; Dixit — UI Lead; Anshu — Physics & Controls Engineer; Genius — NASA Data & Mission Architect; Rohit — Game Loop & Pitch).
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (25 test files, 150 tests passed); `npm run build` passed cleanly in 1.33s.

### 14 November — continuous controllable Earth launch
Merged codex/continuous-launch (9a82834). Replaced launch checklist jumps with a continuous simplified 2D thrust/gravity/drag/fuel ascent; Space ignites, W/S adjust throttle, A/D steer; touch holds/tap/slider alternatives. World follows a detailed authored rocket through pad clearance, clouds, booster separation and atmospheric darkening to Earth limb/stars. Additive LaunchFlightSnapshot/setLaunchFlight API; 100 km triggers the authored orbital-insertion handoff. Transfer and Mars landing retain existing guided controls. No new dependency/download/animation loop. Focused checks: typecheck, 3 launch tests, Vite build; browser held steering/throttle, pause freezes altitude, >85 km exterior/Earth limb, 360px layout and orbit preparation handoff, no page errors. Final texture/exhaust render checked; final atmosphere/near-pad visual mapping reviewed after that pass. No full mission regression suite repeated. Notes document compressed 8x time and authored scene scale/vehicle limits. Main was clean and up to date before merge.

### 14 Nov 2026 — Himamshu (world) realistic earth environment with mountains, water, forest, and wildflowers integration

1. **`feat/himamshu-world` (tip `bab950e`)**:
   - Merged as `49aab34`, preserving commit `bab950e`.
   - Scope: `src/features/world/NOTES.md`, `src/features/world/earth.test.ts`, `src/features/world/earth.ts`, `src/features/world/index.ts`. All paths owned by Himamshu (`src/features/world/**`).
   - Changes: Realistic 250m × 250m sculpted Earth landscape with rolling hills, distant alpine mountain ridges with vertex-colored elevation transitions (lush meadow grass `#4c802b`, rocky granite cliffs `#646e75`, and alpine snow caps `#eef4f8`); shimmering river and mountain lake system with deep teal-cyan water (`#1b6e85`), transparency, depth, sandy gravel shorelines, wooden footbridge with railings and scenic lakeside bench; dense forest with over 200 trees (layered evergreen pines, broadleaf summer oaks, silver birches); wildflower meadows (golden buttercups, lavender, poppies, mountain daisies), pathway bushes/shrubs, mossy granite field boulders; zero-dependency azure gradient skydome (`#155d99` to `#d8eef8`) generated via zero-dependency DataTexture (100% Vitest/Node SSR compatible); volumetric 3D drifting cumulus clouds with animated gentle wind wrapping; golden directional sunlight (`#fff6de`) casting high-res soft PCF shadows with sky/meadow bounce hemisphere lighting; perfectly level central campus basin ($y = 0$) preserving all station footprints and player navigation without collision clipping; updated `earth.test.ts`.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (26 test files, 154 tests passed); `npm run build` passed cleanly in 1.53s with all assets bundled.

### 14 November — published branch sweep / Dixit arrival guidance
Fetched all refs; only origin/feat/dixit-ui had unmerged work, tip fc25d14. Merged as 44883e3, preserving original authorship. App.vue conflicts resolved semantically against latest user instructions: integrate optional compact arrival guidance and defer mission consumption/hazards until first movement, door/travel interaction, valid work or Explore. Do not restore mandatory Mission Info, a forced Habitat task, a fabricated fixed sandstorm, large text overlays, old launch slideshow or sidebar. Current continuous launch, visual preflight, centered tasks, free job choice and seeded random hazards retained. Replay clears guide/timer. Repeated movement does not clear held keys after the first unlock.
Validation: typecheck passed; 30 focused station-game/UI tests passed; Vite production build passed (existing chunk-size advisory). Final idempotent timer-unlock guard reviewed after those checks. No full test suite or browser playthrough repeated, per user's request to minimize validation/token use.

### 14 November — live Mars powered descent
Merged codex/live-mars-landing (152b96d). Continuous W/S thrust, A/D tilt/steering, Space landing legs; physical altitude/drift/fuel drive the existing forward cockpit approach rather than checklist slides. Added live pad alignment, thrust dust, instrument needles, optional assist and retry for rough/off-pad contact. Only valid soft touchdown advances to Mars. Camera baseline position/look direction retained; mild bank respects reduced motion. Optional LandingFlightSnapshot/setLandingFlight contract; pause/hidden/reset clear time/input correctly; no new dependency/assets/loop. Focused checks: typecheck, 3 landing tests, Vite build, one browser approach with manual controls/pause/legs/retry/assist/mobile and successful touchdown-to-exploration handoff. No page errors during controls check. Final pad alignment/daylight-star/instrument-reset polish reviewed after smoke; full mission suite not repeated. Authored vehicle thresholds/visual scaling documented in contracts and owner notes.

### 14 Nov 2026 — Himamshu (world) realistic Mars landscape, atmosphere, and surface immersion integration

1. **`feat/himamshu-world` (tip `bca2400`)**:
   - Merged as `bca2400`, preserving commit `241c4a1`.
   - Scope: `src/features/world/NOTES.md`, `src/features/world/atmosphere.ts`, `src/features/world/landscape.ts`, `src/features/world/models.ts`. All paths owned by Himamshu (`src/features/world/**`).
   - Changes: Cinematic 320m × 320m sculpted Martian landscape with rolling barchan dunes, dual impact craters with raised rims, deep rift valleys, and rugged mountain caldera walls; procedural iron-oxide soil blending (red `#b44d32`, butterscotch `#d68656`, dark volcanic basalt `#46221a`); custom atmosphere shader with peach horizon and NASA blue sunset glow; orbiting natural moons Phobos and Deimos; 520 dynamic atmospheric dust particles; dual chevron rover tracks from Curiosity, paired EVA bootprints between stations, retro lander descent stage wreckage in gold foil, weather sensor mast with spinning anemometer, and seismic sensor pod; towering yardang rock spires, balancing hoodoos, monolithic rock arches, and 150+ basalt boulders; level station plaza ($r < 18$, $y = 0$) preserving player navigation and Rapier 3D collision integrity.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (27 test files, 157 tests passed); `npm run build` passed cleanly in 1.66s with all client assets bundled.

### 14 November — space-to-Mars entry and corrected W/S controls
Integrated codex/mars-entry-controls (e819a94). Continuous 80km space approach, atmosphere/heat/haze, powered base approach and touchdown with HUD throughout. W nose down/S nose up, independent A/D bank, Q/E or slider thrust; non-negative forward speed. Growing Mars globe blends into terrain/base in the same cockpit; no new packages/downloads/loops. Four focused landing tests, typecheck and Vite build passed on feature; actual browser covered space/atmosphere/base, W pitch without thrust change, mobile HUD, no errors, and assisted touchdown-to-exploration. Final fog/planet-depth/daylight-star polish reviewed after captures. Newly merged landscape changes (241c4a1 via 6a02d48) retained; only append-only world notes conflicted, both entries preserved. No full suite repeated.

### 14 Nov 2026 — World seamless Martian terrain architecture & NASA visual fidelity integration

1. **`feat/himamshu-world` (tip `aa07bf0`)**:
   - Merged as `aa07bf0`, preserving feature commit `14868d5` by Rohit.
   - Scope: `src/features/world/NOTES.md`, `src/features/world/index.ts`, `src/features/world/landscape.ts`, `src/features/world/models.ts`. All paths within `src/features/world/**`.
   - Changes: Unified sculpted terrain mesh eliminating the redundant coplanar flatBox at Y=0 and eliminating z-fighting; hardware polygon offsets on decals, walkways, station pads, and guides (`polygonOffset: true, polygonOffsetFactor: -1 to -2`); doubled terrain subdivision to 160×160 quads with $C^2$-continuous quintic smootherstep departure from station plaza; $C^1$-continuous impact craters with smooth bell-curve depression bowls and sine-squared raised ejecta rims; slope- and elevation-based continuous multi-factor vertex color interpolation; 256×256 periodic harmonic dust texture with zero tiling seams; Mastcam/SuperCam calibrated peach hemisphere light (`#d49f85`) and oxidized bounce (`#4d2820`) with calibrated PCF shadow bias (`normalBias: 0.02, bias: -0.0003`); embedded scattered boulders.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (27 test files, 158 tests passed); `npm run build` passed cleanly in 1.50s with all assets bundled.

### 14 November — screenshot doorway/facade glitch fix
Merged codex/doorway-surface-fix (f58fb7e). Open exterior door leaves were nearly coplanar with the facade; recessed panels into pockets and increased retraction slightly to clear the opening. Moved status lamp above sign and hid zero-shield shutters instead of drawing a dark strip. Movement/collider contracts unchanged. Focused checks: typecheck, 4 existing door tests, Vite build, open/closed greenhouse renders under game lighting/shadows and geometry clearance assertions. Captures visually inspected in ignored output/playwright. No full suite repeated. Main was clean before merge; existing terrain/environment work preserved.

### 14 Nov 2026 — Saurav (HUD) active station job and payout integration

1. **`feat/saurav-hud` (tip `e3a27f0`)**:
   - Merged as `5cb4c42`, preserving Saurav's commit `e3a27f0`.
   - Scope: `src/features/hud/HudOverlay.vue`, `src/features/hud/NOTES.md`. All paths owned by Saurav (`src/features/hud/**`).
   - Changes: In station-task mode, mission progress and header show 'JOB' with count of completed jobs. Added compact station-colored active job cue displaying friendly task name and elapsed active-mission time. Heading for resource/science/shelter changes updated to 'JOB PAYOUT' when latest history record is a station-work payout, with positive shelter/science gains styled alongside reserve gains. Added flight stage copy and labels for launch, orbit-autopilot, transfer, landing, touchdown, earth, space, transit.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (27 test files, 158 tests passed); `npm run build` passed cleanly in 1.29s with all client assets bundled.
   - Cross-feature requests noted: Saurav requests Rohit update `src/App.vue` to pass `:stage="flightStage"` and `:stage-progress` to `HudOverlay` during flight stages.

### 14 Nov 2026 — Anshu (physics) Earth launch vehicle and gantry solid collision envelope integration

1. **`fix/earth-rocket-collider` (tip `9a4e770`)**:
   - Merged as `2df59b1`, preserving Anshu's commits `207d3b3` and `9a4e770`.
   - Scope: `src/features/physics/index.ts`, `src/features/world/NOTES.md`.
   - Changes: Solid Rapier cuboid collision envelope at `(12, 6.1, -14)` with half-extents `(2.6, 6, 1.5)` around the Earth launch vehicle and service gantry matching `createEarthCampus`'s launch pad, preventing player clipping through the rocket on Earth while remaining disabled in Mars/orbit gravity modes; recorded coordination handoff in world notes.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (27 test files, 158 tests passed); `npm run build` passed cleanly in 1.41s with all client assets bundled.

### 14 Nov 2026 — Anshu (physics/team) Ares flight cabin, seat marker, and planetary window scenery integration

1. **`feat/ares-rocket-cabin` (tip `158c145`)**:
   - Merged as `b44019a`, preserving Anshu's commits `672d710`, `6f52b46`, `e238743`, and `158c145`.
   - Scope: `src/features/world/**`, `src/features/ui/**`, `src/features/game/**`, `src/App.vue`, `src/contracts/**`, `docs/CONTRACTS.md`, team instruction docs.
   - Changes:
     - Authored zero-gravity Ares rocket flight-cabin interior after orbital insertion with capsule ribs, lockers, three labeled NAV / TRAJ / COMMS console stations, pilot seat, harness, and amber seat marker (`interiors.ts`, `expedition.ts`).
     - Wide forward panoramic cabin window with locally rendered starfield and moving planetary scenery (Earth, Moon, Sun, Mars, Venus, Jupiter) with slow drift while seated or active with engines idle, respecting pause and reduced motion.
     - Floating astronaut visual cue in the zero-g cabin.
     - UI `CabinSeatPanel.vue` and cabin seat prompt requiring the astronaut to reach and sit in the marked flight seat before starting the compressed Mars transfer.
     - Seating does not auto-advance; separate "Begin Mars transfer" action allows enjoying the window view.
     - Game: updated orbital preflight minigame title and step labels for Ares rocket flight cabin.
     - Additive contracts: `SPACECRAFT_SEAT`, `CabinSeatState`, `WorldAdapter.setCabinSeatState`.
   - Verification: `npm run typecheck` passed (0 errors); `npm test` passed (27 test files, 158 tests passed); `npm run build` passed cleanly in 1.31s with all client assets bundled.

### 15 November — published branch merge sweep
Merged origin/feat/immersive-mars-science, tip 782a20b, with original feature/merge history preserved. This was the only published branch with commits outside main. Clean automatic merge; includes the already-completed dome/EVA airlock, avatar actions and jump telemetry, sample expedition, compact instruments, cabin checks and NASA science console. The separate uncommitted codex/pressurized-outpost worktree was left untouched, per user instruction. Validation: npm run build (includes typecheck) passed; 35 focused tests across airlock, field sample, EVA suit, avatar actions, physics motion and science client passed. Existing large-chunk advisory remains. No additional implementation, full suite or browser walkthrough performed in this merge-only request.

### 15 November — PR #2 environment cleanup and hands-on station tasks

- User explicitly requested merging PR #2. Merged `fix/environment-and-hands-on-tasks` (tip `1ea3aee10394a69f50f0e4d2176e2f6abfd00798`) into latest `main` with merge commit `253f3d43f920ede265ed46cb2769b62390256a40`, preserving Himamshu Bhandari's feature commit and identity. No conflicts.
- Scope: world terrain/atmosphere, coastal Earth spaceport, aligned Mars paths and suit rack, direct animated watering and shelter plate repairs; coordinated physics changes remove deleted Earth-building colliders and restore Mars collision/door state. Exact paths and handoff recorded in world/physics notes.
- Post-merge validation in the clean coordinating main checkout: `npm run typecheck` passed; `npm test` passed (39 files, 208 tests); `npm run build` passed. Chromium checked the production build's Earth launch-prep entry and Mars field-mission entry, with no uncaught page errors. Detailed task interactions were checked on the feature branch as recorded in its notes. Full launch/landing sequence was not rerun. Existing bundle-size warning remains.
- Git main publication is authorized by the user's merge request; no environment configuration publication or deployment was performed.

### 15 November — PR #3 pause, movement and flight fixes
User requested merge of PR #3. Merged `fix/pause-movement-and-flight` tip `10bb50b` without conflicts, preserving feature authorship. Post-merge typecheck, all 214 tests and build passed. Feature browser checks cover movement, pause/lock/focus recovery, Earth floor, seated avatar and launch-ground removal. No environment publication or deployment.

### 15 November — PR #4 visual science field lab
Integrated `feat/visual-science-workbench`, tip `03cb7db`, as `4b5d06d` under the user's combined merge/science request and standing serial integration authorization. The solar science job now has visual terrain scanning, air molecule sorting and telescope/star exposures. Feature author preserved; no conflicts. Post-merge typecheck, all 216 tests across 42 files and production build passed. Production browser smoke checked Earth launch-prep and Mars mission entry with no uncaught errors. Detailed science interaction, wrong-match, keyboard/pause and exact payout checks are recorded in world notes. No environment publication or deployment.

### 15 November — enlarged orbital cabin and crew consequences
Merged codex/orbital-cabin (0883c24) cleanly. Larger cabin shell, upper gallery with ladder opening, human-sized door, floating/climbing joint poses, true bounded 3D inertial body translation in orbit (WASD push, Space/Shift vertical, Ctrl brake, L ladder grip). No cosmetic position bob or ground jump in orbit. Neglected solar storms add authored exposure; simulated radiation-sickness condition increases food use; shielding prevents new storm damage and permits active-time recovery; pause/replay respected. These are fictional game units, not medical/dose/treatment advice. Focused checks: typecheck/build, 22 cabin/posture/game tests, browser actual physics drift/pause/climb and inspected expanded-cabin render. Final gallery/locker/door/headroom polish reviewed after render. No full flight suite repeated. Older uncommitted pressurized-outpost checkout left untouched; work isolated in managed space-cabin checkout.

### 15 November — Olympus distance, EVA visor and jump polish
Merged codex/olympus-eva-jump tip 567ac70 cleanly, preserving its feature commit. Only world files: much larger distant Olympus with authored haze and camera clipping range, detailed curved visor/helmet and compact backpack, stronger physics-driven jump/landing poses on the existing rig. No new downloads/dependencies. Feature validation: typecheck, nine focused EVA/avatar tests, production build, actual-world and loaded-Mixamo Chromium visual checks. Main source tree matches that verified feature tip; checks were not repeated on an identical tree, honoring the user's reduced-testing request. Full mission replay not repeated; existing bundle-size advisory. No other teammate worktree modified. Remote feat/saurav-hud advanced to e86e31a during this task; that separate HUD publication has not been integrated as part of this world-only update.

Concurrent main integration: first push was rejected because origin/main advanced to 4bad981 with the teammates' account-save, task-cooldown and camera-orbit commits. Fetched and merged that published history without conflicts; preserved both camera-orbit/ground-clearance changes and Olympus far plane. Rechecked the combined source: typecheck and production build passed; 15 focused avatar/EVA/first-person tests passed. Account/database runtime was not exercised for this world task. Existing browser visual checks apply to the feature before this upstream combination. No force-push or history rewriting.
