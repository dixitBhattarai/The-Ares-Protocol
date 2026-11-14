# UI handoff — Dixit

Status: Splash screen and main menu / login screen completed and integrated.

- Completed:
  - `SplashScreen.vue`: High-polish scale-in logo presentation with smooth 850ms cubic-bezier crossfade into main menu.
  - `LoginScreen.vue`: Cinematic Mars landscape with astronaut telescope view. Embedded Three.js canvas renders photorealistic spinning 3D Earth (NASA surface texture, cloud atmosphere layer) and orbiting Moon precisely aligned with telescope optics. Menu buttons (Start, Settings, Credits) styled with Orbitron typography and sci-fi glowing accents. Includes modal dialogs for settings/credits and audio toggle.
  - `App.vue`: Minimal integration hook to render SplashScreen on initial load, smoothly transition to LoginScreen when state phase is 'ready', and transition to main game simulation on 'START'.
- Validation:
  - `npm run typecheck` passed cleanly.
  - `npm test` passed (6/6 tests).
  - `npm run build` production build succeeds.
- Integration notes:
  - Uses existing `three` dependency already present in the workspace.
  - Kept inside Dixit's assigned UI scope (`src/features/ui/`), with minimal non-disruptive integration in `App.vue`.
