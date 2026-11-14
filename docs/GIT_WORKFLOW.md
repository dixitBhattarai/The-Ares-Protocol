# Independent branches and a single merge queue

Git commits are ordered on a branch. Avoid unrelated work depending on another feature branch or landing in one mixed commit. Separate paths reduce textual conflicts; tests and playthroughs catch integration problems.

## Publish one baseline

Rohit publishes the verified scaffold commit to `main` before everyone starts. A local scaffold commit is not published until pushed. Everyone starts from that same shared commit.

Separate computers: clone normally, run `git fetch origin`, then `git switch -c feat/<name>-<scope> origin/main` with your exact branch below. Run `npm ci` in that clone.

On one computer, use separate worktrees. From the coordinating clone, run once per person (substitute the other branch/path names). `.worktrees` is ignored and inside this workspace.

```powershell
git fetch origin
git worktree add .worktrees/himamshu -b feat/himamshu-world origin/main
Set-Location .worktrees/himamshu
npm ci
```

Open each AI only in its own clone/worktree. Worktrees share history but have separate indexes and files. Do not run feature agents in the coordinating directory. Never nest one person's worktree in another. If a branch already exists, inspect it and attach it rather than overwriting it. Before a remote is available, use the agreed local scaffold commit hash in place of `origin/main`.

Branches: `feat/himamshu-world`, `feat/saurav-hud`, `feat/dixit-ui`, `feat/anshu-physics`, `feat/genius-missions`, `feat/rohit-game`. They are siblings, not a chain.

## Commit finished milestones

Example for Saurav; use your own folder and scope:

```powershell
git status --short
npm run typecheck
npm test
npm run build
git diff -- src/features/hud
git add -- src/features/hud
git diff --cached --stat
git diff --cached
git commit -m "feat(hud): add readable resource warnings"
```

Inspect the staged diff: no other owner's paths, secrets, dependencies or generated builds. Don't use `git add .`, `git add -A`, or `git commit -am`. Don't auto-stash/reset others' work. Fix owned failures, record unrelated failures with evidence and report blockers. Don't claim failed checks passed. Use fix commits after published milestones; no rewriting shared history or empty commits to meet a count.

Rohit also stages explicit paths: game folder and individually listed integration files. Never bundle another person's changes. Update your own `NOTES.md`; include completed behavior, actual checks, limits and API requests. Hand off branch/hash. Push feature branches only when the human/team has authorized remote publication; committing is required, publishing is separate.

## Rohit integrates serially

Suggested queue: game contracts/rules first, missions, physics, world, HUD, UI. Compatible stubs let each compile independently. If two roles need new contracts, land them on `main` first; owners then merge `origin/main` and adapt only their paths. Never branch from or merge a teammate's feature branch into yours.

Use a clean integration checkout on `main`. Fetch authorized feature branches, inspect diffs against the baseline, and `git merge --no-ff <feature-branch>` one at a time so milestone commits remain visible. Run typecheck/tests/build and browser smoke checks after each merge. Publish tested results if authorized. No simultaneous merges or overlapping cherry-picks and merges.

If conflicts arise, inspect both sides with the affected owner; don't blindly choose ours/theirs. Keep contracts/lockfile changes with Rohit. Finish or abort the unresolved merge before another. A green build isn't proof of gameplay: test start → choices → hazard → debrief → replay.

Handoff: owner, branch, commit hashes, changed files, checks, limits, integration requests. After merge, don't reuse the branch for unrelated work. Defer branch cleanup until after the hackathon.
