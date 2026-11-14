# UI Feature Notes & Handoff — Dixit

## Completed Features

1. **Onboarding & Tutorial (`OnboardingPanel.vue` & `MissionPanels.vue`)**:
   - Child-friendly briefing for ages 7–12 introducing the role of Mars Outpost Commander.
   - Clear mission goals: Survive 6 shifts (`mission.maxTurns`), achieve science target (`mission.scienceTarget`), and zero-reserve termination rule.
   - Astronaut movement guide (WASD / Arrow Keys) and decision control guide (Tab / Enter / Space / Click).
   - Module descriptions for Solar Station (power), Hab & Shelter (protection/rest), and Greenhouse (air/food).
   - Prominent, accessible "Start Mission" action button.

2. **Decision Interface (`DecisionPanel.vue`)**:
   - Current shift counter ("Shift X of Y") and event title/description.
   - Accessible decision cards with distinct labels, plain-language explanations, and explicit resource delta badges (+/- values for Power, Oxygen, Supplies, Science, Shelter).
   - Delayed consequence preview banners when choices include delayed effects.
   - Real-time feedback bar with latest mission log and environmental hazard telemetry alerts.
   - "Pause Mission" control emitting `{ type: 'PAUSE' }`.

3. **Pause Screen (`PausePanel.vue`)**:
   - Suspended mission state explanation allowing players to review resources.
   - "Resume Mission" button emitting `{ type: 'RESUME' }`.

4. **Debrief, Replay & History (`DebriefPanel.vue`)**:
   - Handles won and lost states with supportive, constructive, non-shaming coaching.
   - Displays debrief title, summary, and root-cause analysis (e.g. "POWER reached 0 on Shift 3").
   - Final telemetry summary grid (Power, Oxygen, Supplies, Science, Shelter).
   - Actionable Flight Director recommendations and real-world spaceflight lessons.
   - Turn-by-turn timeline reviewing past shifts, choices made, hazard notices, and end-of-shift telemetry snapshots.
   - "Play Again" button emitting `{ type: 'RESTART' }`.

5. **Science Sources, Attributions & Disclaimers (`SourceCredits.vue`)**:
   - Collapsible drawer detailing data pipeline mode (`authored-demo`, `archived`, `live`).
   - Honest empty state note when no external telemetry records are loaded.
   - Formatted cards for NASA records with clickable external links (`target="_blank" rel="noopener noreferrer"`), retrieval dates, observation dates, units, license notes, and educational game mapping explanations.
   - Space weather physics clarification (solar flare measurements vs. biological dose).
   - Educational prototype disclaimer (ages 7–12; not astronaut training).
   - Mandatory NASA non-endorsement notice.

6. **Action Dispatch Helpers (`actions.ts`)**:
   - Type-safe helper emitters for `START`, `CHOOSE`, `PAUSE`, `RESUME`, and `RESTART`.

## Validation & Verification

- **Typecheck**: `npm run typecheck` (`vue-tsc --noEmit`) passes with 0 errors.
- **Unit Tests**: `npm test` passes 25/25 tests across all test suites:
  - `src/features/game/game.test.ts` (12 tests passed)
  - `src/features/ui/ui.test.ts` (13 tests passed)
    - Action emitter dispatch tests (`START`, `CHOOSE` with `choiceId`, `PAUSE`, `RESUME`, `RESTART`)
    - Onboarding rendering (goals, controls, modules, start button)
    - Decision panel rendering (shift count, choice cards, delta pills, delayed effects, hazard alerts, pause)
    - Paused phase rendering (pause message, resume button)
    - Won phase debrief (victory status, recommendations, lessons, turn history timeline, play again)
    - Lost phase debrief (depletion root cause, non-shaming feedback, low science debrief)
    - Science sources in authored-demo mode (honest empty note, NASA disclaimer, educational prototype caveat)
    - Science sources in archived mode (clickable links, observation dates, retrieval dates, game mapping notes)
- **Production Build**: `npm run build` succeeds cleanly.
- **Accessibility & Responsiveness**:
  - Semantic HTML with ARIA roles (`role="region"`, `role="alert"`, `role="status"`).
  - Visible focus rings (`:focus-visible` with high-contrast outlines).
  - Large touch targets (min height 48px–52px) for mobile usability.
  - Fully responsive styling down to 360px portrait viewports without horizontal overflow.
  - Clear text and sign badges (`+`/`-`) to avoid communicating state solely through color.

## Integration Handoff

- **Branch**: `feat/dixit-ui`
- **Milestone 1 Commit**: `3f66a5c` — `feat(ui): build onboarding and decisions`
- **Milestone 2 Commit**: (staged below) — `feat(ui): add debrief replay and source credits`
- **Changed Files**:
  - `src/features/ui/MissionPanels.vue`
  - `src/features/ui/OnboardingPanel.vue`
  - `src/features/ui/DecisionPanel.vue`
  - `src/features/ui/PausePanel.vue`
  - `src/features/ui/DebriefPanel.vue`
  - `src/features/ui/SourceCredits.vue`
  - `src/features/ui/actions.ts`
  - `src/features/ui/ui.test.ts`
  - `src/features/ui/NOTES.md`
- **Boundaries**: Strictly within `src/features/ui/**`. No shared files, contracts, or package manifests modified.
