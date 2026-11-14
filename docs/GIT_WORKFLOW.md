# Independent branches and a single merge queue

Git commits are ordered on a branch. Avoid unrelated work depending on another feature branch or landing in one mixed commit. Separate paths reduce textual conflicts; tests and playthroughs catch integration problems.

## Publish one baseline

Himamshu coordinates publication of the verified scaffold commit before everyone starts; pushing still requires explicit authorization. A local commit is not published until pushed. Everyone starts from the same shared scaffold commit, never another person's feature branch.

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

Rohit also stages explicit paths: game folder and individually listed engineering files. Never bundle another person's changes. Update your own `NOTES.md`; include completed behavior, actual checks, limits and API requests. **Every owner hands branch/hash/paths/checks to Himamshu for merging.** Engineering/API requests also go to Rohit. Feature-branch pushes require existing authorization; committing is required, publishing is separate. An owner on another computer must publish their authorized branch before Himamshu can fetch it; worktree folders themselves are not uploaded.

## Himamshu merges serially

Himamshu owns the merge queue. Rohit continues implementing rules, shared app wiring/contracts and release preparation on `feat/rohit-game`; his AI must not merge other team branches or operate the main merge checkout. Himamshu's world agent also stays on its feature branch. Only a separately assigned coordinator task operates the clean main checkout. Use `MERGE_COORDINATOR_PROMPT.md` for that task.

Suggested queue: game contracts/rules first, missions, physics, world, HUD, UI. Compatible stubs let each compile independently. If roles need new contracts, Rohit commits them and Himamshu merges them first; affected owners then update from the agreed main commit and adapt only their paths. Never branch from or merge a teammate's feature branch into yours.

Use the existing clean checkout on `main`, not a feature worktree. Start with `git status`, `git branch --show-current` and `git worktree list`. Do not switch another agent's working directory or try to check out main in a second worktree while the coordinating checkout already holds it. Commit/stash nothing belonging to another owner automatically.

Merge only branches Himamshu explicitly names for the current coordinator task. For each, inspect `git log --oneline main..<branch>` and `git diff --name-only main...<branch>`. Read the owner's notes from that branch (`git show <branch>:src/features/<folder>/NOTES.md`); main's notes may still describe an older version. A local branch can be merged directly; a branch from another clone must first be available as a fetched remote branch. If missing, report the missing branch instead of inventing or copying the feature.

Run `git merge --no-ff <feature-branch>` one at a time so feature commits remain visible. Run typecheck/tests/build and browser smoke checks after each merge. Record branch, tip, merge commit, checks and limitations in Himamshu-owned `MERGE_LOG.md`. Stop the queue if conflicts/checks fail; route fixes to the file owner and keep the result unpublished until checked. Publish only if authorized. No simultaneous merges or overlapping cherry-picks and merges.

If conflicts arise, inspect both sides with Himamshu and the affected owner; don't blindly choose ours/theirs or overwrite files to imitate a merge. Rohit authors engineering/contract/lockfile fixes on his branch; Himamshu merges them. Finish or abort the unresolved merge before another. A green build isn't proof of gameplay: test start → choices → hazard → debrief → replay.

Handoff: owner, branch, commit hashes, changed files, checks, limits, integration requests. After merge, don't reuse the branch for unrelated work. Defer branch cleanup until after the hackathon.
