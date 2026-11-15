# UI Feature Notes & Handoff — Dixit

## Completed Features

1. **Splash Screen & Cinematic Intro (`SplashScreen.vue`)**:
   - High-polish scale-in logo presentation with smooth 850ms cubic-bezier crossfade into main menu.
   - Clean scale-in typography and NASA-inspired palette without distracting sweeps.

2. **Photorealistic Mars Main Menu (`LoginScreen.vue`)**:
   - Cinematic Mars landscape with astronaut telescope view.
   - Embedded Three.js canvas rendering photorealistic spinning 3D Earth (NASA surface texture, cloud atmosphere layer) and orbiting Moon precisely aligned with telescope optics (88.35% left, 11.35% top).
   - Menu navigation buttons (Start, Settings, Credits) styled with Orbitron typography and sci-fi glowing laser flares.
   - Interactive Settings and Credits modal dialogs.
   - Accessible keyboard controls and responsive 16:9 layout scaling down to mobile viewports.

3. **Onboarding & Tutorial (`OnboardingPanel.vue` & `MissionPanels.vue`)**:
   - Child-friendly briefing for ages 7–12 introducing the role of Mars Outpost Commander.
   - Clear mission goals: Survive 6 shifts (`mission.maxTurns`), achieve science target (`mission.scienceTarget`), and zero-reserve termination rule.
   - Astronaut movement guide (WASD / Arrow Keys) and decision control guide (Tab / Enter / Space / Click).
   - Module descriptions for Solar Station (power), Hab & Shelter (protection/rest), and Greenhouse (air/food).
   - Prominent, accessible "Start Mission" action button.

4. **Decision Interface (`DecisionPanel.vue`)**:
   - Current shift counter ("Shift X of Y") and event title/description.
   - Accessible decision cards with distinct labels, plain-language explanations, and explicit resource delta badges (+/- values for Power, Oxygen, Supplies, Science, Shelter).
   - Delayed consequence preview banners when choices include delayed effects.
   - Real-time feedback bar with latest mission log and environmental hazard telemetry alerts.
   - "Pause Mission" control emitting `{ type: 'PAUSE' }`.

5. **Pause Screen (`PausePanel.vue`)**:
   - Suspended mission state explanation allowing players to review resources.
   - "Resume Mission" button emitting `{ type: 'RESUME' }`.

6. **Debrief, Replay & History (`DebriefPanel.vue`)**:
   - Handles won and lost states with supportive, constructive, non-shaming coaching.
   - Displays debrief title, summary, and root-cause analysis (e.g. "POWER reached 0 on Shift 3").
   - Final telemetry summary grid (Power, Oxygen, Supplies, Science, Shelter).
   - Actionable Flight Director recommendations and real-world spaceflight lessons.
   - Turn-by-turn timeline reviewing past shifts, choices made, hazard notices, and end-of-shift telemetry snapshots.
   - "Play Again" button emitting `{ type: 'RESTART' }`.

7. **Science Sources, Attributions & Disclaimers (`SourceCredits.vue`)**:
   - Collapsible drawer detailing data pipeline mode (`authored-demo`, `archived`, `live`).
   - Honest empty state note when no external telemetry records are loaded.
   - Formatted cards for NASA records with clickable external links (`target="_blank" rel="noopener noreferrer"`), retrieval dates, observation dates, units, license notes, and educational game mapping explanations.
   - Space weather physics clarification (solar flare measurements vs. biological dose).
   - Educational prototype disclaimer (ages 7–12; not astronaut training).
   - Mandatory NASA non-endorsement notice.

8. **Action Dispatch Helpers (`actions.ts`)**:
   - Type-safe helper emitters for `START`, `CHOOSE`, `PAUSE`, `RESUME`, and `RESTART`.

## Validation & Verification

- **Typecheck**: `npm run typecheck` (`vue-tsc --noEmit`) passes with 0 errors.
- **Unit Tests**: `npm test` passes all test suites.
- **Production Build**: `npm run build` succeeds cleanly.
- **Accessibility & Responsiveness**:
  - Semantic HTML with ARIA roles (`role="region"`, `role="alert"`, `role="status"`).
  - Visible focus rings (`:focus-visible` with high-contrast outlines).
  - Large touch targets (min height 48px–52px) for mobile usability.
  - Fully responsive styling down to 360px portrait viewports without horizontal overflow.
  - Clear text and sign badges (`+`/`-`) to avoid communicating state solely through color.

## Integration Handoff

- **Branch**: `feat/dixit-ui`
- **Changed Files**:
  - `src/features/ui/SplashScreen.vue`
  - `src/features/ui/LoginScreen.vue`
  - `src/features/ui/MissionPanels.vue`
  - `src/features/ui/OnboardingPanel.vue`
  - `src/features/ui/DecisionPanel.vue`
  - `src/features/ui/PausePanel.vue`
  - `src/features/ui/DebriefPanel.vue`
  - `src/features/ui/SourceCredits.vue`
  - `src/features/ui/actions.ts`
  - `src/features/ui/ui.test.ts`
  - `src/features/ui/NOTES.md`
  - `src/App.vue` (minimal non-intrusive integration)
  - `src/assets/*` (Earth, Moon, and Mars telescope textures)
- **Boundaries**: Strictly within `src/features/ui/**` with minimal hook in `App.vue`.

## Card-free station work handoff — 14 Nov 2026

User explicitly requested no three-card choices, positive completed-work benefits and automatic preventable hazards. Himamshu's coordinated UI/game/App/contracts slice adds TaskBoard.vue, onboarding wording and a guard preventing MissionPanels from showing old DecisionPanel in station-tasks mode. TaskBoard receives typed jobs/state and emits START_TASK/PAUSE only; it never writes balances. Five work-order rows are available, with explicit rewards/prevention. Minigames remain in world and emit checks through App; accessible consoles use those same puzzles. Root/role guides mark older post-task card requirements superseded. Normal UI ownership returns to Dixit after handoff.

Validation: keyboard/button browser flow through Earth/orbit, idle hazard, all six jobs to victory, replay and accessible console at 360px passes without page exceptions or overflow. Desktop/mobile captures inspected. Typecheck, 118 tests and production build pass. Tasks and clocks are authored mechanics; NASA sources provide context. Legacy DecisionPanel remains compatible for non-station-tasks integrations but is unreachable in the playable app. Station-tasks onboarding now says “Finish 6 Jobs” and the debrief labels each record as “Work completed” on a job-by-job timeline; card-mode wording remains for legacy integrations. No UI simulation logic or package/global style edits.

## Spaceflight control panel — 14 Nov 2026

- Added `SpaceflightPanel.vue` for child-readable launch, autopilot and landing prompts. It shows the current WASD/Space action, checklist progress, telemetry and clickable keyboard alternatives, plus pause/resume and a way to continue compressed autopilot stages.
- The component receives shared `FlightStage` and flight-control presentation types; it does not mutate game resources or import the game reducer.
- Validation: typecheck and production build pass; the full suite passes all flight-panel related checks (118 tests pass overall). The suite still has one unrelated physics jump-test failure because `window` is undefined in Vitest's Node environment. Live browser verification was blocked before navigation by unsupported URL policy enforcement in the Windows browser tool. Rohit owns subsequent App integration; Dixit retains UI ownership.

### Live rocket controls — 14 November
User-authorized launch UI: compact LaunchControls overlay leaves the rocket visible; live altitude/climb/fuel, throttle slider, tilt gauge, ignition and held/tap control buttons. Keyboard controls still work with a button focused; range slider uses normal keyboard range behavior. Pointer cancel/lost capture/unmount release holds. Pause/reset remain reachable at 360x800. Landing/transfer panel is unchanged. Focused flight validation and authored-model limits in physics/world notes.

### Live landing controls — 14 November
Added compact LandingControls telemetry, pad alignment/tilt, thrust slider, held/tap W/S/A/D controls, Space legs, optional assist, pause and retry. Existing forward cockpit stays visible; no modal checklist or text wall during descent. Uses shell-supplied guidance, no sibling physics import or simulation writes. Controller releases held buttons on pointer cancel/lost capture/unmount. Successful contact transitions to Mars; rough contact provides a clear retry. Desktop/mobile visual/control checks passed; final scene polish noted by world.

### Entry HUD and corrected landing input
Landing HUD now stays through space approach, atmospheric entry and base approach, with km/m altitude, descent, non-negative forward speed, fuel, heat, pitch and bank. W/S explicitly say Nose down/up. Separate Q/E thrust buttons and slider remain keyboard/touch operable. Engine standby/active and 800m leg gate explain current controls compactly. Earth launch bindings unchanged. Retry in final approach uses a short checkpoint. Desktop/mobile browser pass checked W changes pitch without changing throttle and all entry phases retain HUD.

### Rocket cabin seat handoff — 14 November
Added `CabinSeatPanel.vue` for the post-task cabin state: tells the player to reach the glowing seat, exposes a nearby-only “Sit and buckle in” button, supports E and pause, and reports seat/harness status with text and an icon. Seated players can watch the cabin panorama with the engines idle, then start transfer explicitly from a separate button. `SpaceflightPanel.vue` continues to report the flight state. `VisualPreflightMinigame.vue` labels the space work as Ares flight-cabin tasks and hides fast-forward for that stage. Validation: not run at the user's request; user will test. No HUD props, simulation logic, or resource behavior changed.

### 15 November — requested cabin completion
Added concise illustrated CabinTasks controls for bearing alignment, course matching and ordered flight-plan packets. Wrong choices do not advance; pause disables inputs; messages are queued without claiming an instant Earth reply. CabinSeatPanel has guided approach, proximity-gated seating and transfer. App preserves one completion per stage and the existing seat gate. Covered by cabin-checks tests; full suite 168 passed; typecheck/build passed. This coordinated request temporarily touches game/world/App; normal ownership resumes after handoff.

### 15 November — child-friendly integrated console
Shortened briefing/pause text, collapsed debrief history/coaching, and moved sources into optional reading. Sources retain the full NASA non-endorsement/data-use statement and clearly label the dome, rules, timing and terrain as authored. Linked DONKI, OSDR, RadLab, Mars Trek and CSA resources are further reading, not claimed live inputs. Replaced conflicting overlay positions with shared instrument lanes; fixed the App style tag whose inline arrival-guide styles were ignored with an external src. App opens the pause console, traps keyboard focus and Escape resumes. Targeted Chromium checks passed cabin puzzles/seat, suit and both pressure cycles, shelter/crop once-only rewards, and narrow-screen puzzle controls. Actual GLB loader check confirmed Idle/Walk clips and sanitized bone names; equipment follows those real names. Full flight-to-landing end-to-end replay has not been performed.

### 15 November — visible fieldwork and real science console
Added FieldWorkPanel, connected the NASA ScienceConsole, and added a direct Mars field-mission entry alongside the complete flight path. Work controls sit to the side on desktop and above the avatar on mobile. The science modal pauses/resumes the game or preflight, traps keyboard focus, cancels outstanding refreshes on close/unmount and retains a labelled archive when blocked. The default path keeps prompts short; source dates, image credits and the NASA statement remain available in the science console.
