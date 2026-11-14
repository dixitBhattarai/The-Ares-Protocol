# Manual acceptance and demo checks

These are checks to run, not claims that all final-game requirements already pass. Owners record feature checks in local notes; Rohit records game/app-wiring checks in `game/NOTES.md`; Himamshu records post-merge checks in `MERGE_LOG.md`.

- Fresh checkout: `npm ci`, typecheck, tests, build; inspect the production build via `npm run preview`.
- No login/API key needed. After initial assets load, decisions require no network. First-ever offline loading would need a service worker and is outside MVP.
- New player can explain the goal, distinguish reserves and see a decision's cost before choosing.
- Normalized WASD/arrows; no page scroll on movement arrows; camera/astronaut remain legible.
- Complete the Earth propellant, crew-air, cargo and guidance checks; try both the numbered console and accessible controls.
- Use Space/W/A/D through liftoff, observe autopilot telemetry, then use A/D/W/S/Space to finish the Mars landing. Pause/resume and replay from Earth.
- Confirm the flight is described as a compressed educational sequence, with authored checks and mechanics clearly distinguished from real launch procedures.
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
