# Merge queue — Himamshu

Owner: Himamshu. Feature owners submit handoffs; only the coordinator updates this queue and records verified main merges. Rohit owns engineering fixes; he does not run this queue.

## Available handoffs

| Branch | Reported tip | Scope | State |
| --- | --- | --- | --- |
| `feat/himamshu-world` | `95a03b3` | `src/features/world/**` | Pushed to origin and remote tip verified; not merged into main |

Verify refs, scope and checks before a merge; this table is not authorization to merge. Other roles have no handoff recorded here yet.

## Remote review and publication — 14 November 2026

- Fetched origin and inspected all published branches. At the initial check, only `origin/main` existed at `710e015`; no teammate feature branches were published yet.
- Local main held coordination update `9149a4b`; local world held verified milestones `9fc1290` and `95a03b3`, with a clean worktree. All existing commits retain their configured author metadata.
- Himamshu authorized normal pushes of tested milestones and periodic checks. No feature merge is authorized or performed by this publication task.
- Created active recurring check `check-ares-team-branches`: every 30 minutes through 15 Nov 2026, 11:59 pm Asia/Katmandu. It checks branch tips/handoffs, preserves authorship and may publish reviewed tested commits under the standing authorization; it does not automatically merge branches. Local checks require the computer/app/project to remain available and applicable Git/network permissions.
- Publication completed: pushed main through `9284537` (including coordinator policy `9149a4b`) and published `feat/himamshu-world` at `95a03b3`, preserving both world milestones and their original author. Verified both remote hashes using `git ls-remote --heads origin`; local branches matched their upstreams.
- A second fetch found no additional teammate feature branches. Their unpushed work on other computers remains unavailable; later checks will review published updates. This log entry is a later documentation commit and does not merge any feature.

## Completed merges

None recorded. The workflow-document update is a policy commit, not a feature merge. This document does not claim the world feature is present on main.

For each completed merge, append:

- Date, feature owner, branch and checked feature-tip hash.
- Merge commit hash; no duplicate entry or cherry-pick of an already merged feature.
- Changed paths and any ownership/contract concerns.
- Typecheck, tests, build and browser checks actually run, with failures/limits if any.
- Open requests and responsible owner; stop the queue while an unresolved conflict/check failure remains.

Record a merge hash in a later log-only commit or final handoff; do not amend shared history just to insert a commit's own hash. Remote publication and deployment status must be stated separately.
