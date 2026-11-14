# Himamshu's separate merge-coordinator task

Use this in the clean coordinating checkout on main, not `.worktrees/himamshu` or another feature workspace. Rohit continues game/app engineering; Himamshu controls which completed branches enter main. A feature-development prompt never implicitly starts a merge task.

Replace the branch placeholder with the exact branch(s) you want merged. For branches on a teammate's computer, obtain their authorized push and fetch the branch first. No feature branch is merged or pushed by this document change.

```text
You are assisting Himamshu as merge coordinator for The Ares Protocol.

Branches I authorize you to merge for this task: [paste exact branch names here].

Read root AGENTS.md, docs/GIT_WORKFLOW.md and docs/MERGE_LOG.md. Inspect Git status, current branch, branch list and worktree list first. Use the existing clean main checkout. Do not switch a feature workspace, stash/reset another person's changes, or start a second checkout of main. If I have not named branches, report the available handoffs and ask which to merge; do not guess.

For each named branch, verify that it exists and matches its owner's handoff tip. Inspect its commits and changed paths against main. Read its own NOTES.md using git show <branch>:src/features/<folder>/NOTES.md, since main may still have old notes. If a branch is unavailable, report that it must be fetched/published; don't recreate its files.

Merge one branch at a time with git merge --no-ff, preserving feature commits. Do not manually copy a feature folder, squash unrelated owners' commits, or cherry-pick already merged work. If conflicts or checks fail, stop the queue, report exact files/output, and coordinate with the affected owner. Do not blindly accept ours/theirs or rewrite other owners' code. Rohit still owns app/contracts/package fixes and commits those on his branch.

After each merge, run npm run typecheck, npm test, npm run build and a relevant browser smoke check. Record the branch, feature tip, merge commit, actual check results and remaining requests in docs/MERGE_LOG.md. Commit any merge-log update using that explicit path; never git add . or git add -A. Report the final main commit, included branches and remaining limits. Do not push, deploy or delete worktrees/branches unless separately authorized.
```

Current local world handoff, recorded 14 Nov 2026: `feat/himamshu-world`, tip `95a03b3`, includes milestone `9fc1290`, based on `710e015`. Verify those refs when used; this is a handoff example, not an automatic instruction to merge it. The coordinator change does not merge the world feature.

If teammates already started their AIs with an older prompt, send them:

```text
Workflow update: Himamshu now handles all team merges into main. Finish, test and commit your own feature, then give Himamshu your branch name, tip hash, changed paths, actual checks and limitations. Do not merge team branches into main. Rohit still handles game rules, shared app wiring, contracts and package changes on feat/rohit-game, and hands his branch to Himamshu too. Read the updated root AGENTS.md and docs/GIT_WORKFLOW.md.
```
