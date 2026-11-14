# HUD handoff — Saurav

Status: HUD status, resource feedback, and in-scene game HUD refinement completed.

- Added compact power, air, and supplies meters with numeric values, accessible meter values, and text warning levels.
- Added name-only Power, Air, and Supplies tooltips on the reserve icons, including keyboard focus support.
- Repositioned the reserve dock inside the 3D game viewport at the bottom-left. Each resource is a single stacked row: transparent line icon, translucent colored bar, and numeric value. There are no card or dock backgrounds. The resource name appears only on icon hover/focus.
- Updated the icons to small line SVGs and kept the separate amber, cyan, and green bar fills with shimmer on gains and a brief shimmy on losses.
- The HUD teleports into the existing game viewport so its position follows the game panel at desktop and mobile widths; no shared shell files changed.
- Added a centered, animated mission update toast for hazard outcomes. It pulses and dismisses after about five seconds, with reduced-motion support.
- The app shell already plays `soundFX.playHazard()` when a hazard outcome occurs. The HUD does not start a second sound, avoiding duplicate audio. The current shared hazard cue is a short descending synthesized alert; Rohit can tune it to a softer achievement-style pop if desired.
- Kept shift progress, science goal, shelter readiness, upcoming delayed-effect timing, and latest decision feedback visible in the HUD.
- Kept the simplified game-unit explanation; values are not real spacecraft readings.
- Validation after the transparent viewport dock update: `npm run typecheck`, `npm test` (64 tests), `npm run build`, and `git diff --check` passed.
- Preview check: Vite preview at `http://127.0.0.1:5174/` showed the three bare icon-and-bar rows inside the lower-left of the 3D game screen, above the scene's bottom hint. Desktop visual check passed. Narrow-screen visual check and a full hazard gameplay interaction remain outstanding.
- Integration requests: none for APIs. Optional sound-style adjustment belongs to Rohit in `src/features/game/audio.ts`.
- Limits: hazard toast uses the hazard notice and turn snapshot already supplied by the game; no simulation or audio playback logic is added here.
- Handoff: branch `feat/saurav-hud`; provide milestone commit hashes, changed files, and actual checks to Himamshu.
