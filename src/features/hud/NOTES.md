# HUD handoff — Saurav

Status: HUD status, resource feedback, and in-scene game HUD refinement completed.

- Added compact power, air, and supplies meters with numeric values, accessible meter values, and text warning levels.
- Added name-only Power, Air, and Supplies tooltips on the reserve icons, including keyboard focus support.
- Repositioned the reserve dock inside the 3D game viewport at the bottom-left. Each resource is a single stacked row: transparent line icon, translucent colored bar, and numeric value. There are no card or dock backgrounds. The resource name appears only on icon hover/focus.
- Updated the icons to small line SVGs and kept the separate amber, cyan, and green bar fills with shimmer on gains and a brief shimmy on losses.
- Resource motion is tracked and timed independently per meter. It runs only when that meter's value changes. Reaching 100 triggers a one-shot fill shine; reserves at 20 or lower pulse until they recover.
- The HUD teleports into the existing game viewport so its position follows the game panel at desktop and mobile widths; no shared shell files changed.
- Placed HUD-owned shift progress, science/shelter readouts, and change/delayed-effect feedback inside the same viewport with transparent styling. Reserve bars stay anchored bottom-left; secondary status sits in the viewport corners.
- Added a centered, animated mission update toast for hazard outcomes. It pulses and dismisses after about five seconds, with reduced-motion support.
- The app shell already plays `soundFX.playHazard()` when a hazard outcome occurs. The HUD does not start a second sound, avoiding duplicate audio. The current shared hazard cue is a short descending synthesized alert; Rohit can tune it to a softer achievement-style pop if desired.
- Kept shift progress, science goal, shelter readiness, upcoming delayed-effect timing, and latest decision feedback visible in the HUD.
- Kept the simplified game-unit explanation; values are not real spacecraft readings.
- Validation after the transparent viewport dock update: `npm run typecheck`, `npm test` (64 tests), `npm run build`, and `git diff --check` passed.
- Validation after independent per-reserve motion, full-level shine, and critical-level pulse: `npm run typecheck`, `npm test` (64 tests), `npm run build`, and `git diff --check` passed. Build reports the existing large physics chunk warning.
- Preview check: Vite preview at `http://127.0.0.1:5174/` showed the reserve rows at the viewport's lower-left and the remaining HUD readouts inside the game screen. Desktop visual check passed. The app-owned choice/briefing/debrief panel remains outside the viewport pending the shell/UI owners' handoff. Narrow-screen visual check and a full hazard gameplay interaction remain outstanding.
- Integration requests:
  - Rohit: Add a brief full-reserve sound to the shared audio system and play it once when a resource crosses from below 100 to full, respecting the sound toggle. Keep existing choice, hazard, and depletion sound priority intact.
  - Rohit: Move the shell's onboarding, decision, pause, results, and source panels into a coherent overlay host within the game viewport. Coordinate that composition with Dixit; the shell owns `src/App.vue`.
  - Rohit and Genius: Add typed, authored choice presentation metadata for short child-friendly summaries, icons, and rarity tiers if the UI will display mission-specific rarity. Keep it separate from simulation effects.
  - Dixit: Restyle choice cards as inviting roguelike draft popups with coherent rarity colors, icons, rarity-specific reveal motion, simplified descriptions, and clear resource-impact bar previews. Preserve explicit costs, keyboard access, reduced motion, and text labels; rarity must not imply a mechanically stronger choice.
- Limits: the requested shared audio, app-shell overlay, and choice-card work is outside Saurav's owned files and is handed to the respective owners above. The HUD itself adds no simulation logic or separate audio engine.
- Handoff: branch `feat/saurav-hud`; provide milestone commit hashes, changed files, and actual checks to Himamshu.

- Post-merge validation on `origin/main` 71faa94: `npm run typecheck`, `npm test` (70 tests), `npm run build`, and `git diff --check` passed. Build still reports the large physics chunk warning.
- HUD polish pass: Enlarged right-side science and shelter readouts with clearer icons, goal/protection progress tracks, and plain-language shelter readiness. Shift updates now use a short, clamped accent callout. Reserve icons give a restrained hover/focus shimmy and scale response; hovering a bar gently highlights it and nudges its icon. HUD and hazard toast are shown only while the mission phase is running.
- Validation for HUD polish: `npm run typecheck`, `npm test` (70 tests), `npm run build`, and `git diff --check` passed. Local browser preview at port 5175 did not connect through the in-app browser, so visual and narrow-screen review remain outstanding.
