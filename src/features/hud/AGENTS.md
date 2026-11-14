# Saurav — HUD & Resource Feedback Lead

Read root `AGENTS.md` and `docs/CONTRACTS.md`. Own only `src/features/hud/**`, including this guide, local components/styles/assets and `NOTES.md`. Branch: `feat/saurav-hud`, independent from the shared main baseline.

## Task

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
