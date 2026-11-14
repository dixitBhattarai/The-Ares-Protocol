# Merge queue — Himamshu

Owner: Himamshu. Feature owners submit handoffs; only the coordinator updates this queue and records verified main merges. Rohit owns engineering fixes; he does not run this queue.

## Available handoffs

| Branch | Reported tip | Scope | State |
| --- | --- | --- | --- |
| `feat/himamshu-world` | `95a03b3` | `src/features/world/**` | Integrated locally by `c235948`; verified with game/HUD |
| `feat/rohit-game` | `2911ae0` | Game reducer/tests/audio/notes, contracts, app shell | First integrated by `c1a6f25`; follow-up by `932f930`; checks passed |
| `feat/saurav-hud` | `999a70f` | HUD component and notes | Integrated locally by `3f1419b`; checks passed |

Verify refs, scope and checks before a merge; this table is not authorization to merge. Anshu, Dixit and Genius have no published handoff recorded at this review.

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

For each completed merge, append:

- Date, feature owner, branch and checked feature-tip hash.
- Merge commit hash; no duplicate entry or cherry-pick of an already merged feature.
- Changed paths and any ownership/contract concerns.
- Typecheck, tests, build and browser checks actually run, with failures/limits if any.
- Open requests and responsible owner; stop the queue while an unresolved conflict/check failure remains.

Record a merge hash in a later log-only commit or final handoff; do not amend shared history just to insert a commit's own hash. Remote publication and deployment status must be stated separately.
