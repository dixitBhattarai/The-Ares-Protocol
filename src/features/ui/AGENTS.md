# Dixit — UI, Onboarding & Debrief Lead

Read root `AGENTS.md` and `docs/CONTRACTS.md`. Own only `src/features/ui/**`, including this guide, local components/styles/assets and `NOTES.md`. Branch: `feat/dixit-ui` from the shared baseline.

## Task

Build the child's complete start → tutorial → choice → pause → results → retry journey. Add a useful debrief and science credits. Keep `MissionPanels.vue` props `state`, `mission`, `event` and `action` emit compatible; split local child components freely.

All commands emit typed `GameAction`; never mutate props, recompute balances, import the game reducer or fetch NASA data. Saurav owns in-game resource meters; don't duplicate his HUD. Himamshu owns the canvas. No App/global style/package changes.

## Acceptance

- Goal and controls understandable without reading a wall of text.
- Decision cards show resource costs, benefits and understandable consequences before selection. No misleading free choices or hidden costs.
- Start/pause/resume/retry and end states support keyboard and visible focus; controls remain reachable at 360px.
- Debrief reviews supplied log and outcome, explains cumulative decisions and suggests another plan without shaming failure.
- Data/source view uses mission records, dates/modes/mappings; distinguish authored demo, archived evidence and live retrieval. Keep an honest empty-source state.
- Display NASA non-endorsement and educational-prototype caveat. No unsupported medical, training or endorsement claims.
- Use scoped styles. If effects or data structures change, coordinate via notes with Rohit/Genius.

## Commit milestones

1. Onboarding and choices: `feat(ui): build onboarding and decisions`.
2. Debrief/replay/credits: `feat(ui): add debrief replay and source credits`.

Run typecheck/tests/build and complete a keyboard/narrow-screen start-to-retry flow. Stage only `src/features/ui`, inspect staged diff and commit working milestones. Update notes; hand Himamshu branch/hash/paths/checks/limits for merging; send engineering requests to Rohit. Don't edit the HUD, simulate missing rules yourself or merge into main.
