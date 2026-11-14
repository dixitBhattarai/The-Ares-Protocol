# Missions Handoff — Genius (NASA Data & Mission Architect)

## Current Status — 14 Nov 2026

### Already integrated

- The original six-shift mission and May 2024 DONKI evidence were merged to `main` as `a8d9a39` (with the game alert wording reconciliation in `500c830`). The merge log records passing typecheck, tests and build.
- Integrated mission content includes oxygen vs science, shelter vs exploration, a solar-weather hazard with a shielding threshold, greenhouse trade-offs, delayed Earth communications, and a final science vs reserves decision.
- Rohit's game reducer supports the authored shelter hazard and delayed effects; Saurav's HUD surfaces hazard/delayed feedback; Dixit's UI includes decisions, debrief and a source-attribution drawer. These existing surfaces should consume the current mission fields without a new UI/API change for the bundled CME source.
- The refreshable DONKI update was merged to `main` in `e4abf24` and recorded in `9386a29`. The feature branch also contains `2907fb1`, which removed the optional launch-failure idea from the notes; no launch-failure mechanic was implemented.

### Current snapshot update workflow

- The refresh script is [scripts/refresh-donki-snapshot.mjs](./scripts/refresh-donki-snapshot.mjs). It downloads a bounded NASA DONKI CME query, validates it, preserves the raw response and selected observation, and replaces `data/donki-cme-snapshot.json` only after a successful response. It uses `NASA_API_KEY` if set, otherwise `DEMO_KEY`; the key is not stored in the snapshot.
- To refresh manually, open a terminal at the repository root while online and run:

  ```sh
  node src/features/missions/scripts/refresh-donki-snapshot.mjs
  ```

  By default it queries the previous seven UTC days. To choose a date window, run:

  ```sh
  node src/features/missions/scripts/refresh-donki-snapshot.mjs 2026-11-07 2026-11-14
  ```

- After refreshing, inspect the snapshot diff and validate before committing:

  ```sh
  git diff -- src/features/missions/data/donki-cme-snapshot.json
  npm test
  npm run typecheck
  npm run build
  ```

  If the checks pass, commit only the intended missions paths on `feat/genius-missions`, push that branch, and ask Himamshu to merge it. The deployed static game changes only after that merge and the normal deployment. The game itself never makes NASA requests and keeps using its bundled snapshot offline.

### Which archived data is used in events

- **DONKI CME snapshot (`data/donki-cme-snapshot.json`)**: imported by `index.ts`. Its observation date and estimated CME speed appear in the Shift 2 shelter decision and Shift 3 authored drill; its source is also credited in Shift 6. The CME does not calculate or trigger the hazard or reserve losses. Those remain authored mechanics, not measured Mars damage or crew dose.
- **InSight weather snapshot (`data/insight-mars-weather-raw.json`)**: imported by `index.ts`. Sol 675 pressure is shown in Shift 1 text; wind and temperature are shown in Shift 6 text. It is a static local snapshot and the DONKI refresh script does not update it.
- **CSA food and NASA DSN references**: their source records are shown for attribution and inform the Shift 4/5 teaching concepts, but they are not local API snapshots.
- **Historical May 2024 DONKI raw fixture**: retained for provenance/tests; it is not the active CME snapshot imported by `index.ts`.
- **Other unverified fixtures**: `nasa-apis-extra-raw.json` and `donki-flr-sep-may2024-raw.json` are not active event inputs or mission sources. Do not treat them as verified evidence until their provenance and raw responses are checked.
- No extra UI/API work is needed to show the current source fields: the existing source drawer renders mission source metadata and the decision panel renders event descriptions. Verify those in the integrated browser flow after a snapshot refresh.

### Integration checks and handoff

- The refresh merge recorded in `docs/MERGE_LOG.md` passed project tests, typecheck and production build. Later integrated work may add tests, so rerun the current suite after refreshing instead of relying on the historical test count.
- To hand off a new snapshot update, tell Himamshu the feature branch, commit hash, exact owned paths, validation commands/results, and any remaining caveats. Ask Dixit only for a UI check if the displayed source/wording needs verification; ask Rohit if gameplay rules or contracts must change.
- Current feature branch is published and integrated; it contains the launch-failure note removal. Unverified extra fixtures remain outside the feature handoff unless validated and deliberately added.

### Copy-ready team messages

**Template to Himamshu after a future refresh:**

> Missions handoff: `feat/genius-missions`, commit `<hash>`, scope `src/features/missions/**`. Refreshed bundled DONKI snapshot and verified the observation mapping to the authored Shift 2/3 shelter drill; no live game requests. Checks: `<test/typecheck/build results>`. Please queue this branch for the normal serial merge.

**To Dixit (UI):**

> The refreshed DONKI mission source needs no UI code change: `SourceCredits` already renders source title/link/date/units/mapping and `DecisionPanel` renders the event description. Please verify the new CME source card and authored-drill wording during integration.

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
