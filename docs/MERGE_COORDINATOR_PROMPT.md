# Himamshu's separate merge-coordinator task

Use this in the clean coordinating checkout on main, not `.worktrees/himamshu` or another feature workspace. Rohit continues game/app engineering; Himamshu controls which completed branches enter main. A feature-development prompt never implicitly starts a merge task.

Replace the branch placeholder with the exact branch(s) you want merged. For branches on a teammate's computer, obtain their authorized push and fetch the branch first. No feature branch is merged or pushed by this document change.

```text
You are assisting Himamshu as merge coordinator for The Ares Protocol.

Standing instruction: Automatically discover, verify, and merge all published feature branches with new commits ahead of main in serial order. Do not stop to prompt for manual approval on every branch; merge all available passing branches.

Read root AGENTS.md, docs/GIT_WORKFLOW.md and docs/MERGE_LOG.md. Inspect Git status, current branch, branch list and worktree list first. Use the existing clean main checkout. Do not switch a feature workspace, stash/reset another person's changes, or start a second checkout of main.

Fetch origin --prune to identify all feature branches (origin/feat/*) containing unmerged commits ahead of main. For each branch, inspect its commits and changed paths against main. Verify that changed files belong to that feature owner. Read its NOTES.md using git show <branch>:src/features/<folder>/NOTES.md.

Merge one branch at a time with git merge --no-ff, preserving feature commits and author metadata. Do not manually copy a feature folder, squash unrelated owners' commits, or cherry-pick already merged work. If conflicts occur or checks fail, stop the queue immediately, report exact files/output, and coordinate with the affected owner. Do not blindly accept ours/theirs or rewrite other owners' code.

After each merge, run npm run typecheck, npm test, and npm run build. Record the branch, feature tip, merge commit, and actual check results in docs/MERGE_LOG.md. Commit each merge-log update using that explicit path; never git add . or git add -A. Push verified main commits to origin under Himamshu's standing authorization. Report the final published refs/hashes, actual checks, and remaining open requests.
```

Current local world handoff, recorded 14 Nov 2026: `feat/himamshu-world`, tip `95a03b3`, includes milestone `9fc1290`, based on `710e015`. Verify those refs when used; this is a handoff example, not an automatic instruction to merge it. The coordinator change does not merge the world feature.

## Rocket cabin acceptance — 14 November

When a tested branch includes the coordinated cabin handoff, verify the actual progression: launch and orbital insertion → three complete rocket-cabin minigames (no space-stage fast-forward or console-click bypass) → player reaches the marked seat → E or the accessible button buckles the player in → player remains seated and can watch the moving planetary window with idle engines → explicit transfer button → Mars landing. Confirm a nearby seat is required, no transfer starts merely from sitting, pause/hidden-tab and reduced-motion behavior freeze window drift, replay clears the state, the cabin has reduced-motion-safe zero-G visuals, and no second animation loop or mission-resource changes were introduced. Do not merge a handoff that is still untested or uncommitted.

If teammates already started their AIs with an older prompt, send them:

```text
Workflow update: Himamshu now handles all team merges into main. After each tested feature milestone, commit your owned files, fetch origin, inspect updates/divergence and push your assigned feature branch with git push -u origin <your-assigned-feature-branch>. Pushing that branch is authorized. The parent .worktrees ignore rule does not prevent pushing its branch commits; don't remove that rule or stage the worktree folder. Give Himamshu your branch name, actual pushed tip hash, changed paths, checks and limitations. Do not force-push or push/merge main. Rohit still handles game rules, shared app wiring, contracts and package changes on feat/rohit-game, and hands his pushed branch to Himamshu too. Read the updated root AGENTS.md and docs/GIT_WORKFLOW.md. Report Git access errors rather than claiming a push succeeded.
```
