# Missions Handoff — Genius (NASA Data & Mission Architect)

## Current Status — 14 Nov 2026

### Already integrated

- The original six-shift mission and May 2024 DONKI evidence were merged to `main` as `a8d9a39` (with the game alert wording reconciliation in `500c830`). The merge log records passing typecheck, tests and build.
- Integrated mission content includes oxygen vs science, shelter vs exploration, a solar-weather hazard with a shielding threshold, greenhouse trade-offs, delayed Earth communications, and a final science vs reserves decision.
- Rohit's game reducer supports the authored shelter hazard and delayed effects; Saurav's HUD surfaces hazard/delayed feedback; Dixit's UI includes decisions, debrief and a source-attribution drawer. These existing surfaces should consume the current mission fields without a new UI/API change for the bundled CME source.

### Local changes not yet integrated

- Added `scripts/refresh-donki-snapshot.mjs`: maintainer-run refresh of a date-bounded NASA DONKI CME query; validates the response, preserves raw records and selected observation, and replaces the snapshot only after success. It reads `NASA_API_KEY` or uses `DEMO_KEY`, and does not persist the key.
- Fetched a local snapshot for 2026-11-07 through 2026-11-14. It selects `2026-11-13T21:24:00-CME-001` (reported analysis speed 474 km/s). The snapshot is bundled for offline gameplay; runtime `loadMission()` remains synchronous and does not make requests.
- Updated mission sources and Shift 2/3 descriptions to use this observation as context and clarify that the shelter drill and reserve losses are authored, not measured Mars damage or crew dose.
- Removed the unverified APOD/EONET/NeoWS record from active mission sources. `nasa-apis-extra-raw.json` and `donki-flr-sep-may2024-raw.json` remain unused/unverified. The InSight Sol 675 fixture remains static and is not refreshed by the DONKI script.
- Added refresh and mission assertions, plus refresh instructions in `data/PROVENANCE.md`.
- These edits and newly added snapshot/script/data files are currently local and uncommitted. The current feature branch is 16 commits behind `origin/main`; none of these follow-up changes are recorded as integrated in `docs/MERGE_LOG.md`.
- Validation run on these local changes: 12 focused mission/refresh tests passed, all 76 project tests passed, typecheck and production build passed, and all five mission JSON files parsed. Build retains the existing large physics-chunk advisory.

### Cross-feature request — not implemented

- Request Rohit (game/contracts): add a once-per-expedition, 1% launch safety abort before the mission begins. Keep it non-graphic, end the expedition immediately, and ensure the chance is not rerolled by rendering. Decide whether retry starts a new expedition and rerolls. Suggested child-friendly message: “Launch safety check failed. The expedition was stopped before landing.”
- After the game outcome/state is agreed, ask Dixit (UI) to present the abort and retry action accessibly. This is not expressible using the current mission events and should not be added as a random mission choice.

## Original Mission Milestone: Integrated

Branch: `feat/genius-missions`  
Owned Paths: `src/features/missions/**` only.

---

## 1. Completed Features

### A. Six-Shift Pedagogical Teaching Arc
Authored six distinct, deterministic shifts matching `docs/HACKATHON_PLAN.md` with child-friendly explanations, stable IDs, and meaningful trade-offs where every choice costs reserves:
1. **Shift 1 (`shift-1-oxygen-vs-science`)**: Oxygen Production vs. Science Equipment. Demonstrates spending power and supplies to secure breathable air buffers vs. deploying initial science instruments.
2. **Shift 2 (`shift-2-shelter-vs-exploration`)**: Storm Shelter Preparation vs. Surface Exploration. Demonstrates spending construction stock and battery power to harden the storm bunker before space weather arrives vs. rover exploration.
3. **Shift 3 (`shift-3-solar-weather-alert`)**: Space Weather Hazard Response. Directly implements the environmental hazard:
   - If `shielding >= 15`: Mitigated damage ($-4\ \text{Power}, -2\ \text{Oxygen}$).
   - If `shielding < 15`: Unmitigated damage ($-22\ \text{Power}, -18\ \text{Oxygen}, -10\ \text{Supplies}$).
4. **Shift 4 (`shift-4-greenhouse-vs-battery`)**: Greenhouse Food Production vs. Battery Conservation. Teaches that growing food takes power and consumable supplies, while conserving power draws down stored rations.
5. **Shift 5 (`shift-5-comms-vs-autonomous`)**: Interplanetary Communications vs. Autonomous Science. Demonstrates speed-of-light delay across interplanetary space: transmitting telemetry to Earth takes 1 turn for confirmation (delayed effect: $+2\ \text{Science}$ on Shift 6), while autonomous science yields immediate $+1\ \text{Science}$.
6. **Shift 6 (`shift-6-final-science-vs-reserves`)**: Final Science Push vs. Reserve Stabilization. Balances a final push to achieve the science target ($\ge 3$) against stabilizing life-support air tanks for incoming expedition crews.

### B. Verified NASA Archived Observation & Sources
- **Archived Data Mode**: `dataMode: 'archived'`.
- **Historical NASA Source (`nasa-donki-cme-2024`)**:
  - Raw JSON fixture: `src/features/missions/data/donki-cme-may2024-raw.json`.
  - Event: Coronal Mass Ejection `2024-05-11T01:36:00-CME-001` associated with X5.8 flare from NOAA Active Region 13664.
  - Observing instruments: SOHO LASCO C2/C3, STEREO A SECCHI/COR2, SDO AIA 193.
  - Physical velocity: up to $1820\ \text{km/s}$ (CME Analysis 30761, Type O).
  - Explicit mapping to game: Incoming solar energetic particles (SEPs) drive the Shift 3 space weather alert; regolith shelter shielding mitigates damage to sensitive electronics and life support.
- **Contextual Sources**:
  - `nasa-moxie-isru`: NASA Perseverance MOXIE solid oxide electrolysis ($2\text{CO}_2 \to 2\text{CO} + \text{O}_2$) for Shift 1 air generation.
  - `nasa-dsn-light-delay`: NASA Deep Space Network light-travel delay ($c = 300{,}000\ \text{km/s}$, 3–22 min one-way latency) for Shift 5 comms delay.
  - `csa-space-food-toolkit`: Canadian Space Agency Controlled Environment Agriculture toolkit for Shift 4 greenhouse cultivation.
- **Provenance & Attribution**:
  - Detailed provenance documentation in `src/features/missions/data/PROVENANCE.md`.
  - Non-endorsement statement included on all sources: *"NASA data, imagery, and technical information may not be used to state or imply the endorsement by NASA or by any NASA employee of a commercial product, service, or activity, or used in any manner that might mislead."*
  - All event `sourceIds` resolve to `mission.sources`.

---

## 2. Validation & Automated Tests

All tests and checks pass cleanly on `.worktrees/genius`:
- **`npm run typecheck`**: Passed with 0 errors (`vue-tsc --noEmit`).
- **`npm test`**: 20/20 tests passing across 2 test suites:
  - `src/features/missions/missions.test.ts` (8 tests):
    - Valid mission configuration & 6 shifts with `archived` dataMode.
    - Unique, stable IDs (`shift-[1-6]-...`) and non-empty titles/descriptions.
    - Meaningful costs on all choices (no free benefits).
    - 6-shift educational arc content verification.
    - Verified archived sources schema and non-endorsement caveats.
    - All `sourceIds` resolve to existing `sources`.
    - Authentic NASA DONKI CME fixture data loading & physical validation ($1820\ \text{km/s}$, AR 13664, X5.8 flare).
    - Playthrough proving the Deep Space Communications strategy (Oxygen $\to$ Shield $\to$ Research $\to$ Research $\to$ Comms $\to$ Oxygen) achieves victory with Science = 4 and positive reserves.
  - `src/features/game/game.test.ts` (12 tests):
    - 100% regression compatibility maintained with all existing reducer, hazard, and win/loss strategy tests.
- **`npm run build`**: Client production build completed cleanly in Vite with 0 errors.

---

## 3. Scientific Distinctions & Educational Simplifications

1. **Space Weather Observation vs. Surface Biological Dose**:
   A solar flare (X5.8) and CME velocity ($1820\ \text{km/s}$) describe solar plasma ejection in the heliosphere, not a direct crew radiation dose on Mars. Mars lacks an intrinsic global dipolar magnetosphere and has a thin atmosphere (~1% of Earth's column density), allowing high-energy protons to penetrate to the surface. Translating this into game units ($-22\ \text{Power}, -18\ \text{Oxygen}$) is an educational abstraction illustrating the necessity of regolith shielding.
2. **Discrete Shifts vs. Continuous Time**:
   Shifts represent operational mission phases, not claims that hydroponic crops reach maturity or communications occur in minutes.
3. **Authored Reserves**:
   Power, Oxygen, and Supplies are 0–100 game indicators designed for young learners, not engineering telemetry in kWh, liters, or kilograms.

---

## 4. Integration Handoff for Rohit

- **Branch**: `feat/genius-missions`
- **Changed Paths**: `src/features/missions/**` only.
- **Contract Compatibility**: Zero changes to shared files or `src/contracts/**`.
- **Milestones**:
  - `a1b931d`: `feat(missions): add six teaching decisions`
  - Current: `feat(missions): add archived NASA evidence`
