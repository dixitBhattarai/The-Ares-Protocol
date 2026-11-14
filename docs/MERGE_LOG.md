# Merge queue — Himamshu

Owner: Himamshu. Feature owners submit handoffs; only the coordinator updates this queue and records verified main merges. Rohit owns engineering fixes; he does not run this queue.

## Available handoffs

| Branch | Reported tip | Scope | State |
| --- | --- | --- | --- |
| `feat/himamshu-world` | `95a03b3` | `src/features/world/**` | Local handoff exists; not merged by this coordination update |

Verify refs, scope and checks before a merge; this table is not authorization to merge. Other roles have no handoff recorded here yet.

## Completed merges

None recorded. The workflow-document update is a policy commit, not a feature merge. This document does not claim the world feature is present on main.

For each completed merge, append:

- Date, feature owner, branch and checked feature-tip hash.
- Merge commit hash; no duplicate entry or cherry-pick of an already merged feature.
- Changed paths and any ownership/contract concerns.
- Typecheck, tests, build and browser checks actually run, with failures/limits if any.
- Open requests and responsible owner; stop the queue while an unresolved conflict/check failure remains.

Record a merge hash in a later log-only commit or final handoff; do not amend shared history just to insert a commit's own hash. Remote publication and deployment status must be stated separately.
