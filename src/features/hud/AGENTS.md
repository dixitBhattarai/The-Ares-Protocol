# Saurav — HUD & Resource Feedback Lead

Read root `AGENTS.md` and `docs/CONTRACTS.md`. Own only `src/features/hud/**`, including this guide, local components/styles/assets and `NOTES.md`. Branch: `feat/saurav-hud`, independent from the shared main baseline.

## Task

### Latest task/reward/automatic hazard direction — 14 Nov

Supersedes older card requirements below: no three-card decisions or post-task cards in the playable loop. Any station job can be started, minigame completion gives one positive payout, and six completed jobs end the mission. Negatives come from active-time reserve consumption and automatic warned hazards; matching maintenance prevents hazard damage. Read root AGENTS.md and docs/CONTRACTS.md for the implemented optional station-tasks mode, action tokens and pause/reset rules. Himamshu's explicit user-requested cross-feature handoff is recorded in the local notes; normal ownership resumes afterward. Do not reintroduce card-first or post-task choice gates.


### Current task-first direction

Show available station jobs, the selected job, its base reward/cost and progress using Rohit's supplied snapshots. Separate a task payout from a later card modifier in feedback so children can explain each change. Support capped exploration discoveries without inventing balances or randomizing in the HUD. Use brighter station colors, friendly icons, readable large controls and short success feedback with reduced-motion support. Keep door/interaction prompts and cards from obscuring the player. Rohit coordinates any new props/contracts; retain compatibility and do not implement the new reducer or App routing. The intended order is explore → chosen station minigame → task outcome → one of three trade-off cards → explore, not card selection before entry.

Make a readable in-game status HUD for ages 7–12: power, air, supplies, current shift, science goal and shelter status. Explain resource changes with words/numbers and gentle visual feedback. Keep `HudOverlay.vue` props `state` and `mission` compatible. Components beneath it are yours.

You own the status display, not the welcome/decision/pause/results screens (Dixit), state reducer (Rohit), or canvas (Himamshu). Import contracts and your own helpers only. Never directly mutate props, allocate an engine, fetch data or implement a second simulation.

## Acceptance

- Three primary reserve bars with names, values and text warning levels; shelter/goal stay secondary.
- Label values as simplified game units. Don't display them as real oxygen litres, battery kWh or radiation dose.
- Readable at 360px and laptop widths; use scoped styles and no global body/element overrides.
- Warnings use words/icons/numbers as well as color; meters have accessible names; animation respects reduced-motion preferences.
- Cost/change feedback uses supplied snapshots/log, not duplicate balance logic. Avoid announcing the full HUD on every render.
- Zero/max values, pause, completed mission and restart don't leave stale animations or warnings.

## Commit milestones

1. Accessible status layout: `feat(hud): add accessible reserve meters`.
2. Change feedback/warnings: `feat(hud): explain changes and warnings`.

Run typecheck/tests/build plus narrow-screen and keyboard checks. Stage only `src/features/hud`, inspect diff and commit each working milestone. Update notes; hand Himamshu branch/hash/paths/validation/limits for merging. Send prop/API requests to Rohit. Do not edit contracts/App/global CSS/packages or Dixit's UI, and do not merge into main.

## Temporary rocket cabin handoff — 14 Nov

No HUD files or reserve behavior change in the coordinated cabin slice. Flight-seat progress stays in the world/flight UI; Saurav retains HUD ownership after handoff.
