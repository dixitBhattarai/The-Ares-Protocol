# Merge queue — Himamshu

Owner: Himamshu. Feature owners submit handoffs; only the coordinator updates this queue and records verified main merges. Rohit owns engineering fixes; he does not run this queue.

## Available handoffs

| Branch | Reported tip | Scope | State |
| --- | --- | --- | --- |
| `feat/himamshu-world` | `7f156a5` | `src/features/world/**` | Initial `c235948`; continuation merged by `0c4b2cd`; checks passed |
| `feat/rohit-game` | `0901e36` | Game reducer/tests/audio/notes, contracts, app shell | Initial `c1a6f25`; follow-up `932f930`; hazard advisory & test exclusions merged by `72f8f65`; checks passed |
| `feat/saurav-hud` | `3dd3ba7` | HUD component and notes | Initial `3f1419b`; hazards & delayed updates merged by `28b1dc5`; checks passed |
| `feat/anshu-physics` | `4108654` | `src/features/physics/**` | Grounded astronaut controller, reset and pause merged by `dfe1d24`; checks passed |
| `feat/dixit-ui` | `0637603` | `src/features/ui/**` | Onboarding, decisions, pause, debrief replay & sources merged by `55799b3`; checks passed |
| `feat/genius-missions` | `66a5322` | `src/features/missions/**` | Discovered remotely; merge attempted but rolled back due to assertion mismatch in `game.test.ts` on Shift 3 hazard wording; queue stopped pending Rohit coordination |

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

5. **`feat/genius-missions` (tip `66a5322`) — Attempted & Queue Stopped**:
   - Attempted merge of `origin/feat/genius-missions`. Merge succeeded at git level, but verification check failed in `src/features/game/game.test.ts:78`:
     `AssertionError: expected '⚠️ Space Weather Alert: Severe storm event active! Shielding of 15 required to mitigate damage.' to contain 'imminent'`
   - Root cause: Rohit's `game.test.ts` expected `upcomingHazardNotice` on turn 2 to contain `'imminent'` from Rohit's fallback mock, whereas Genius's authored mission supplies a real `hazard` on Shift 3 (`turn 2`), causing `getUpcomingHazardNotice()` in `src/features/game/index.ts` to return the real active storm alert message (`'⚠️ Space Weather Alert: Severe storm event active!...'`).
   - Action taken: Per protocol, rolled back the merge to preserve a 100% clean and verified `main` (commit `55799b3`). Stopped the queue for `feat/genius-missions`.
   - Coordination request sent to Rohit (`src/features/game/**`) to update either `getUpcomingHazardNotice` wording or `game.test.ts` assertion to accommodate Genius's authored hazard.

6. **`feat/himamshu-world`**:
   - Tip remains `7f156a5`; no new unmerged commits.

### Updated open requests

- **Rohit**: In `src/features/game/game.test.ts` (or `src/features/game/index.ts`), adjust the Shift 3 hazard notice assertion/text (e.g. accept `'imminent'` or `'Severe storm event active'` / `'Space Weather Alert'`) so that Genius's authored Shift 3 hazard passes test suite upon merge.
- **Rohit / Saurav / Dixit**: Verify overall HUD and UI visual balance in the browser once all panels are rendered together.

For each completed merge, append:

- Date, feature owner, branch and checked feature-tip hash.
- Merge commit hash; no duplicate entry or cherry-pick of an already merged feature.
- Changed paths and any ownership/contract concerns.
- Typecheck, tests, build and browser checks actually run, with failures/limits if any.
- Open requests and responsible owner; stop the queue while an unresolved conflict/check failure remains.

Record a merge hash in a later log-only commit or final handoff; do not amend shared history just to insert a commit's own hash. Remote publication and deployment status must be stated separately.
