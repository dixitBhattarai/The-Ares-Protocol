# Manual acceptance and demo checks

These are checks to run, not claims that all final-game requirements already pass. Owners record actual results in local notes; Rohit records integrated checks in `game/NOTES.md`.

- Fresh checkout: `npm ci`, typecheck, tests, build; inspect the production build via `npm run preview`.
- No login/API key needed. After initial assets load, decisions require no network. First-ever offline loading would need a service worker and is outside MVP.
- New player can explain the goal, distinguish reserves and see a decision's cost before choosing.
- Normalized WASD/arrows; no page scroll on movement arrows; camera/astronaut remain legible.
- Walk into each module: collisions match visible footprints; solid ground; bounded map.
- Pause and tab away/back: no resource catch-up or unexpected movement; explicit resume.
- Every useful choice costs something; delayed consequences have simple explanations.
- Shelter measurably changes a hazard outcome and costs an opportunity. Compare prepared/unprepared runs.
- Prove a winning plan and at least one reserve-depletion/missed-goal loss. Ended runs ignore further choices.
- Debrief explains outcomes and suggests a new plan. Replay resets all state and, once implemented, pose/input too.
- Tab/Enter/Space operate menus; visible focus; words/numbers supplement color warnings.
- At 360px portrait and laptop widths, choices stay reachable and readable without horizontal overflow. Touch decisions work; full mobile walking may be deferred.
- Resize/remount/reload doesn't duplicate canvases/listeners or leak GPU/WASM resources.
- Sources show observation/retrieval dates, units/context and game mapping. Static evidence says archived; authored reserves say game units.
- No NASA endorsement/professional-training claim or exposed secrets; retain third-party asset credits.
- If WebGL/WASM initialization fails, show an explanation and keep decision gameplay usable.
- On deployed URL: fresh private window, second machine, correct asset loading, full play/replay and no blocking console errors.
- Save a backup demo, screenshots and submission copy before the final hour.
