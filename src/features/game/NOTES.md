# Game and integration handoff — Rohit

Status: Tested milestones complete; audio synthesis, station proximity, star ratings, hazard advisory, test exclusions & layout optimizations integrated.

- Branch: `feat/rohit-game`
- Owned paths: `src/features/game/**`, `src/contracts/**`, `src/App.vue`, `vitest.config.ts`, `docs/CONTRACTS.md`.
- Handoff to Himamshu: branch `feat/rohit-game`, commit hashes, changed engineering paths, actual checks, app-integration details, and remaining limits.

## Milestone 1: Consequences, Shelter Hazards & Debrief (`feat(game): implement consequences and debrief`)

- Additive Contracts (`src/contracts/index.ts`):
  - `PhysicsAdapter`: added optional `reset?(pose?: Vec3): void`, `pauseInput?(): void`, `resumeInput?(): void`.
  - `GameState`: added optional `debrief?: DebriefDetails`, `history?: readonly TurnRecord[]`, `pendingDelayedEffects?: readonly PendingDelayedEffect[]`, `lastHazardNotice?: string`, `upcomingHazardNotice?: string`.
  - `DebriefDetails`: added `stars?: number` (0 to 3 stars) and `score?: number` (Outpost Efficiency Score).
  - `Choice` & `MissionEvent`: added optional `delayedEffect` and `hazard?: HazardEffect`.
- Reducer Architecture (`src/features/game/index.ts`):
  - Fixed starter's research-only dominant strategy: greedy research without shelter preparation triggers depletion and defeat.
  - Useful shelter protection: shielding score (>= 15) mitigates severe solar radiation hazard on Shift 3.
  - Delayed consequences: supports light travel communication and food buffering across shifts.
  - Star Rating & Scoring: computes 1-3 stars and efficiency score for victory debriefs, incentivizing strategic replay.
  - Pure reducer: strict immutability, clamping (0..100), terminal state guarding, and clean replay on restart.
  - Pre-decision hazard foreshadowing: `getUpcomingHazardNotice` surfaces orbital sensor CME alerts on Shift 2 before the storm strikes on Shift 3.

## Milestone 2: Shell, Layout & Contract Composition (`feat(game): integrate team modules`)

- Shell & Audio Integration (`src/App.vue`, `src/features/game/audio.ts`):
  - Browser-native Web Audio synthesizer: zero external assets, 100% offline synthesized feedback for decisions, storm hazards, victory arpeggios, and depletion alerts.
  - Keyboard shortcuts: `1`, `2`, `3` for choices, `P` for pause/resume, `M` to toggle mute, `R` to play again.
  - Station proximity detection: dynamically alerts player when astronaut walks near Habitat, Solar Array, or Greenhouse.
  - Viewport accessibility: changed viewport container to `role="region"` with `aria-label="Interactive 3D Mars Outpost Viewport"`.
  - Centered HUD layout: wrapped in `.hud-container` with flexbox centering matching viewport proportions across desktop and mobile.
  - Conditional reset message: safely adapts whether `physics.reset` is present.
  - Test suite optimization: `vitest.config.ts` excludes `.worktrees/**` from test discovery.
  - Documentation: updated `docs/CONTRACTS.md` with all additive methods and state fields.

## Milestone 3: Dynamic Audio Synthesis, Star Badges & Shell Ergonomics (`feat(game): dynamic audio synthesis, star badges, and keyboard navigation`)

- Enriched Audio Synthesis (`src/features/game/audio.ts`):
  - Added `playStart()`: uplifting ascending arpeggio when mission starts.
  - Added `playRestart()`: soft reset tone when returning to mission briefing.
  - Added `playTransmission()`: synthesized high-tech dual-frequency chirp for interplanetary DSN telemetry.
  - Added `playOxygen()`: soothing harmonic sine pulse for MOXIE gas generation cycles.
  - Added `playShield()`: resonant low-frequency impact for regolith shelter construction.
  - Added `playWarning()`: low-frequency pulse alert when any resource drops to <= 20%.
- Game Evaluation & Debrief Presentation (`src/features/game/index.ts`):
  - Enhanced debrief summary with star rating icons and efficiency score (`⭐⭐⭐ 3-Star Rating (Score: 232)`).
  - Rewards strategic mastery: 3 stars requires score >= 230, science >= 4, and shielding >= 15 (e.g. DSN interplanetary comms strategy).
- App Shell Ergonomics & Shortcuts (`src/App.vue`):
  - Added support for 4th decision option via `Digit4` and `Numpad4` on Shift 5.
  - Added keyboard triggers for mission start (`Enter`, `Space`, `S`) and replay (`Enter`, `Space`, `R`).
  - Added module inspection badge with clear button (`✕`) when stations are clicked in the 3D surface view.
  - Cached player pose delta to avoid unnecessary proximity distance calculations when astronaut is idle.

## Milestone 4: Station Procedures, Step Audio Feedback & Direct Decision Mode (`feat(game): contextual station procedures, console audio, and direct decision mode`)

- Contextual Station Procedures (`src/features/game/activities.ts`, `src/features/game/activities.test.ts`):
  - Added shift-specific, educational 3-step procedures for every decision across all 6 shifts:
    - Shift 1: MOXIE $CO_2 \to O_2$ electrolysis, soil spectrometry, and regolith sandbagging.
    - Shift 2: Scrubber filter flushing, rover drill calibration, and bunker wall reinforcement.
    - Shift 3: Radiation sensor monitoring, bunker blast shield lockdown, and emergency air banks.
    - Shift 4: LED grow spectra adjustment, thermal dome blankets, and bioreactor aeration.
    - Shift 5: DSN high-gain dish alignment, autonomous bio-assay, and antenna motor hardening.
    - Shift 6: Final sensor mosaic compilation, high-pressure oxygen top-off, and dust storm winterization.
  - Added boundary checks and tests for invalid/out-of-range progress.
- Console Audio Feedback (`src/App.vue`):
  - Added step feedback: `soundFX.playDecision()` on correct console steps, `soundFX.playWarning()` on out-of-order controls, and `soundFX.playRestart()` on cancellation.
- Accessibility & Direct Decision Mode (`src/App.vue`):
  - Added "Direct Decisions / 3D Procedures" mode toggle in header controls for players, screen readers, and mobile users who prefer immediate decision execution.
  - Added keyboard shortcuts `KeyT` (accessible travel to task door) and `Escape` (cancel task).

## Milestone 5: Full-Reserve Chime, In-Viewport Command Deck & Roguelike Choice Cards (`feat(game): full-reserve sound, in-viewport deck overlay, and roguelike choice cards`)

- Full-Reserve Synthesizer Sound (`src/features/game/audio.ts`, `src/App.vue`):
  - Added `playFullReserve()`: sparkling ascending chime ($D5 \to A5 \to D6$) when any resource crosses from below 100 to full (100%).
  - Integrated into `dispatch` in `App.vue`, preserving priority order (victory > loss > hazard > full reserve > choice type).
- In-Viewport Command Deck Host (`src/App.vue`):
  - Moved `aside.command-panel` into `section.world-panel` as an in-viewport cockpit overlay.
  - Viewport expands to full width on desktop while command panel floats on the right with translucent backdrop blur.
  - Added deck toggle control (`KeyC` / `◨ Hide Deck`) allowing unobstructed full-screen surface exploration.
- Roguelike Choice Cards & Typed Metadata (`src/contracts/index.ts`, `src/features/game/index.ts`, `src/App.vue`):
  - Added additive `ChoiceRarity` (`vital`, `hazard-response`, `experimental`, `standard`) and `ChoicePresentation` to `src/contracts/index.ts`.
  - Added `getChoicePresentation(choice, event)` helper in `src/features/game/index.ts` supplying default child-friendly icons, badges, and summaries.
  - Styled `.choice-card` with roguelike draft aesthetics: tactile hover lift, glowing gradient borders, and distinct multi-channel impact pills.

## Milestone 6: Visual Earth Launch & Space Station Minigames (`feat(game): visual earth launch and orbital space station minigames`)

- Visual Minigame Architecture (`src/features/game/VisualPreflightMinigame.vue`):
  - Completely removed boring walls of instructional text, procedural numbering, and text-only buttons for junior explorers aged 7–12.
  - Earth Launch Pad:
    - Stage 0: Interactive tactile oxygen plunger pump with astronaut helmet visor clearing from foggy to crystal-clear, radial SVG pressure gauge, and automatic seal stamp at >= 80%.
    - Stage 1: Tactile rocket cargo bay dock; kids directly tap glowing battery (⚡), food rations (🍎), and repair tool (🛠️) crates to snap them into matching rocket slots.
    - Stage 2: Fighter-jet style flip-up hazard cover (yellow/black safety stripes) revealing a pulsing, glowing 3D arcade launch button that ignites rocket engines with animated exhaust plumes.
  - Orbit / Space Station:
    - Stage 0: Deep space orbital radar dish with directional steering thrusters (◀ / ▶) and direct lock (🎯), dynamic radio beam bridging Earth to the satellite, and 5-bar signal strength readout.
    - Stage 1: Dual-channel cockpit oscilloscope; kids match visual sine wave shape tiles (slow wave, mild wave, matching harmonic sine wave, and tight wave) without confusing kHz jargon.
    - Stage 2: Deep space laser corridor with animated high-speed photon packets beaming the flight plan to Earth with telemetry chirps.
- Integration & Seamless Access (`src/App.vue`):
  - Replaced text-only preparation panel with `VisualPreflightMinigame`.
  - Added `handleVisualMinigameControl(control)` which sets `remoteConsole = true` so kids interacting on-screen are not blocked by character walking distance.
  - Added `skipPreparation()` for immediate fast-forward testing.
  - 100% backward compatible with `advancePreparation`, 3D console screen handlers in `src/features/world`, and preflight step contracts.
- Testing (`src/features/game/minigame.test.ts`):
  - 8 new tests verifying SSR rendering of all Earth and Space stages, visual icon presence, lack of instructional walls of text, and pause/skip controls.

## Validation

- `npm run typecheck`: passed with zero type errors.
## Latest user-requested task-loop migration — 14 Nov 2026

- User explicitly requested removal of three-card decisions, positive work payouts and automatic preventable negatives. This supersedes the previous post-task-card design; no card panel is shown in App. Authored the coordinated game/App/contracts/UI/activity-wording slice in Himamshu's isolated worktree, after syncing published main (including Saurav HUD and Dixit splash/login). No HUD, mission-content, physics implementation, dependency or global stylesheet edits. Root/all six role guides and task/prompt docs mark older card requirements superseded. Rohit/Dixit retain ownership after handoff; Antigravity merges main.
- Added optional station-tasks mode in game/station-game.ts, five persistent jobs, validated start/cancel/completion tokens including replay session, once-only positive payouts and six-job debrief. Old CHOOSE reducer remains for legacy integrations/tests; playable App ignores it. Every job advances science, so a capped reserve still earns progress. Starting/cancelling a job never pays.
- Active-time negatives are independent of tasks: reserves drain every 20 seconds, hazards strike every 30 seconds, with matching warnings. Air/panel/plant work protects matching hazards for 60 seconds; shelter >=15 blocks solar-storm damage. Routine use still consumes reserves. Pause and hidden tabs stop time; terminal states ignore ticks/work. No NASA forecast, medical or dose claim.
- App uses its existing loop, station computers start jobs, work orders replace the decision desk, and accessible consoles use the same minigames. The old direct-decision instant reward bypass is removed. Replay session keys clear HUD's old hazard toast without editing its implementation. No deferred warning sound timer is left from choice resolution.
- Validation: typecheck, 118 tests and production build pass. New tests cover every reward, no-start/wrong/stale/duplicate/replay completions, cancellation, timed consumption with zero completed tasks, each hazard/prevention pair, expiry, pause/reset, invalid ticks, capped rewards, winning and unattended-depletion runs. Browser development full Earth/orbit→idle hazard while still 0/6 jobs→six paid tasks→victory→replay passes, plus paused timer, accessible minigames and 360px without overflow/page exceptions. Captures inspected.
- Final browser checks: an actual 3D habitat computer click started the matching shelter job; pause, cancel and explicit resume left the mission usable; air maintenance then prevented the next automatic air leak; six jobs won on the production preview and replay cleared the previous hazard notice. After deliberately aborting the physics-module request, the fallback mission clock still triggered the automatic air leak and the accessible air minigame still paid exactly 1 / 6 jobs. No page exceptions in either check.
- Limits: five authored persistent job types and three reused minigame families; no seeded random task generator/loot/card economy. The useful trade-off is time/attention while other systems need care. No new disease simulation or real spacecraft/medical predictions. Existing bundle warnings remain. NASA Mars globe supplied earlier remains in transfer scenes with its NASA source credit.

## Earth launch → Mars landing flow — 14 Nov 2026

- Added ordered, forgiving flight controls in `spaceflight.ts`: Space/W/A/D for launch and A/D/W/S/Space for landing. Wrong inputs keep the current step; every control also has a visible clickable alternative.
- App sequences Earth propellant, crew-air, supplies/cargo and guidance checks → guided ascent → short orbital autopilot → orbit navigation checks → compressed Mars transfer autopilot → guided descent → touchdown → the existing Mars mission. Restart and hidden-tab pause return the player to Earth preparation and clear flight state.
- The bundled sim now receives throttle and attitude commands and displays altitude, speed, remaining propellant and delta-v. Stage durations and control prompts remain authored game mechanics; the sim does not set mission outcome or claim a real Earth–Mars flight.
- Contract additions: `FlightStage`, `FlightControlKey`, `FlightControlStep` and optional `WorldAdapter.setFlightStage`. Rohit retains App/contracts/game wiring ownership after this coordinated user request; Himamshu retains world visuals, Anshu retains spacecraft presets/simulation, and Dixit retains the flight panel.
- Validation: `npm run typecheck` and `npm run build` pass. The full `npm test` run reports 118 passed and one unrelated failure in the pre-existing `src/features/physics/jump.test.ts` (`window` is undefined in Vitest's Node environment); the flight-control tests pass. A live browser walkthrough was blocked before navigation because the Windows browser tool does not support URL policy enforcement. Limits: orbital insertion, checklist values, flight duration and landing are condensed educational abstractions; no supplied rocket GLB was present, so the procedural fallback and replacement slot remain active.

### Random hazards — 14 November
Under the user's explicit coordinated UI/gameplay request, replaced fixed 30s event cycling with seeded 45s windows: 55% chance of one randomly typed/timed hazard (18–44s into window), otherwise no event; warning only in the last 8s. App samples MissionData.hazardSeed once, session varies replay; reducer is deterministic and pause-safe. All five jobs stay freely available, reward/prevention and routine drain unchanged. Focused station-game tests cover quiet windows, seed/replay variation, warnings, each maintenance prevention and expiry. World notes record browser checks; no full suite repeated.

### Rocket flight-cabin tasks and seat gate — 14 November
The existing three orbit minigames now run as required Ares rocket-cabin tasks after orbital insertion. Their three labeled 3D cabin consoles open the interactive work deck without directly advancing a task; the cabin fast-forward control is hidden for this stage. Completing all three reveals the marked flight seat. App enables E and the accessible “Sit and buckle in” action only within 0.95m of the seat. Sitting keeps the player in the cabin to watch the slow-moving panoramic planetary view with idle engines; the player starts compressed Mars transfer using a separate button. Mars landing controls remain downstream of that transfer. Replay clears the seat state. Exact paths: `src/App.vue`, `src/contracts/index.ts`, `docs/CONTRACTS.md`, `src/features/game/VisualPreflightMinigame.vue`, `src/features/world/preflight.ts`, `src/features/ui/CabinSeatPanel.vue`, `src/features/ui/SpaceflightPanel.vue`, `src/features/world/interiors.ts`, `src/features/world/expedition.ts`, `src/features/world/index.ts`. Validation: not run at the user's request; user will test. Limits: zero-G is existing zero-gravity mode plus a world-side visual drift cue; the cabin controller still uses its existing horizontal collision envelope and is not a full 6-DOF flight simulation. No mission/reward state or NASA source claims changed.

### 15 November — cabin/maintenance handoff
User requested a dome/suit gate, completed cabin and more minigames across feature boundaries. Added pure cabin-checks plus airlock helpers; crop station text describes tending/stores rather than instant growth. Existing session completion tokens and task payout guards remain authoritative. Cabin input tests include incorrect order, invalid/paused inputs and target mismatch. Full suite 168 passed; build/typecheck passed. App opens Earth puzzles instead of letting world clicks skip them; pose overrides live in world and do not mutate physics transforms.

### 15 November — sealed regolith expedition
Added field-sample reducer/tests and App composition for suit → dig → sealed transport → lab image/observation/record → once-only survey payout. Shared location/physics checks, bounded active time, stale-session rejection, pause and generic-completion bypass tests pass. Results describe visible loose grains without inventing composition or NASA measurements. No new independent timer, package, or direct UI resource mutation. Root integration also makes the existing science machine open the carried-sample examination instead of an unrelated puzzle. Existing station jobs remain available; a completed field expedition counts as one job.

Final integration review hardening: jumping/replay clear pending approach intents, and stale sample cancellation preserves unrelated active maintenance jobs. Added a reducer regression check for the latter. Browser traversal confirmed actual guided walking/collisions through both airlock directions and the solar-lab door, physical jump takeoff/landing, and the complete collection/research payout. Native NASA requests were denied by policy; controlled responses separately verified successful NASA rendering, mobile focus/resume, maintenance compatibility and replay without page errors. Controlled responses are not presented as live NASA evidence.
