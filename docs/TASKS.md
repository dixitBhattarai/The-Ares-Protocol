# Latest task-loop direction — 14 November

The latest user instruction supersedes the card-related acceptance below. Implemented handoff: freely choose a station job or use a 3D computer, finish its minigame, receive a positive payout once, keep exploring. No three-card decisions before or after work. Five reusable job types cover air, shelter, power, plants and science. Six completions end the mission. Active-time system consumption and warned hazards happen without completing jobs; service matching systems to prevent hazard damage. Pause/hidden tabs freeze time. Root AGENTS.md and docs/CONTRACTS.md describe the exact optional mode and handoff.

Himamshu: continuous interiors, markers and computer entry. Saurav: supplied reserve/hazard/progress feedback. Dixit: work orders, onboarding, pause and debrief. Anshu: movement/input lifecycle. Genius: NASA context/provenance, without representing authored timers as observations. Rohit: authoritative tasks/rewards/timers and shell integration. Antigravity: serial main integration.

## Additive rocket flight-cabin handoff — 14 November

The Earth launch → Mars flow now pauses after orbital insertion for three interactive Ares flight-cabin tasks: navigation beacon, Mars trajectory, and flight-plan communications. The player then glides to the marked pilot seat and presses E or the nearby-only seat button to buckle in. They can watch an animated panorama through the forward window with the engines idle, then explicitly choose “Begin Mars transfer” when ready; Mars landing controls remain after transfer. The space-task fast-forward path is hidden and cabin console clicks open the task deck without skipping a minigame. `SPACECRAFT_SEAT` and `WorldAdapter.setCabinSeatState` are additive. Zero-G avatar drift is a world-side visual cue; no physics movement redesign or mission-state/reward changes are part of this handoff. Validation is intentionally pending because the user asked to run it themselves.

---

# Six owners, six task areas

## Active update: explore, task, outcome, cards

The 14 Nov user-approved direction in root AGENTS.md supersedes the original card-first scaffold acceptance below. This is assigned work, not a claim that the migration is complete. Keep each implementation in its owner's feature branch, with additive contracts coordinated by Rohit and serial merging by Antigravity.

| Owner | Next deliverable | Acceptance |
| --- | --- | --- |
| Himamshu | Free building exploration, animated open/close doors, readable local models | Enter without an active task; closed doors block portal entry; walk through open door; safe exit; keyboard/touch controls; local licensed optimized assets; disposal |
| Saurav | Brighter task-aware HUD | Available/current job, separate task payout and card effect feedback, reserves readable, player/door prompts unobscured |
| Dixit | Three minigame families and post-task card UI | Air leak, power connections, greenhouse balance with accessible alternatives; exactly three post-task cards; benefits/costs/durations visible; no card-first entry gate |
| Anshu | Reliable door portal/movement support | Shared coordinates, safe exterior return, closed-door checks composed by shell, no wall bypass, pause/restart/focus reliability |
| Genius | Station job variants and trade-off content | Stable IDs, seeded optional variants, distinct base outcomes and modifiers; essential jobs always available; bounded loot; honest NASA mapping |
| Rohit | Validated task → outcome → card state machine and wiring | Once-only completion and card resolution, six-job pacing, tested modifier lifecycle/reset, capped one-time finds, additive contracts and backwards-compatible migration |

Scope guard: one Mars map plus existing Earth/orbit introductions, 2–3 available jobs, three reusable minigames, modest exploration finds. No mandatory idle timeout, giant open world or uncontrolled random resource economy. Existing six shifts remain until the coordinated migration is complete.

Saurav and Dixit were both assigned HUD/UI. Their work is split below to create six independent tracks. Rohit implements shared app wiring/contracts; Himamshu runs the Git merge queue. Every owner, including Rohit, hands completed branches to Himamshu. Everyone can implement against the supplied stubs and contracts immediately.

| Owner | Task and deliverable | Acceptance criteria | Suggested feature commits |
| --- | --- | --- | --- |
| Himamshu | Small navigable Mars base, modules, astronaut, camera, picking and status visuals | Habitat/solar/greenhouse distinguishable; layout matches collisions; resize works; lightweight geometry; `setState` visibly reflects status; picking emits station ID; resources disposed | `feat(world): build readable Mars outpost`; `feat(world): show module status and selection` |
| Saurav | In-game status HUD | Three reserve bars with numbers; shift/science goal; plain-language shelter status; text plus color warnings; feedback on costs without mutating state; readable at 360px and laptop widths | `feat(hud): add accessible reserve meters`; `feat(hud): explain changes and warnings` |
| Dixit | Tutorial, choices, pause, results/debrief and sources | Keyboard-accessible start-to-retry flow; costs and benefits visible before choosing; constructive loss explanation and log review; attribution and demo/archive labels; no simulation logic | `feat(ui): build onboarding and decisions`; `feat(ui): add debrief replay and source credits` |
| Anshu | Reliable controller, collisions and input lifecycle | Normalized WASD/arrows; stationary at pause; no stuck keys after blur; floor/module collisions match map; grounded movement; bounded play area; cited Mars gravity if implemented; cleanup; request reset API with Rohit | `feat(physics): add grounded astronaut controller`; `fix(physics): handle focus pause and reset` |
| Genius | Evidence-backed mission pack | Six varied deterministic shifts; useful choices have costs; food/communications represented without more meters; at least one checked NASA observation with raw fixture/provenance; explicit game mapping; no live-fetch dependency; honest labels | `feat(missions): add six teaching decisions`; `feat(missions): add archived NASA evidence` |
| Rohit | Rules, app composition and release preparation | Reserve costs, shelter benefit during hazard, science target, winning and losing strategies, pause/restart; one loop; tested shared wiring; hand branch to Himamshu; demo/submission assets | `feat(game): implement consequences and debrief`; `feat(game): integrate team modules`; `fix(game): stabilize release and demo` |

Himamshu additionally coordinates merging from a clean main checkout: inspect handoffs, merge one named branch at a time, run integrated checks and record results in `docs/MERGE_LOG.md`. His world feature remains isolated on `feat/himamshu-world`. See `MERGE_COORDINATOR_PROMPT.md` for the separate coordinator task.

## Existing starter versus remaining work

The scaffold has a simple reducer, six reducer tests, a primitive Three scene, basic Rapier horizontal movement, reserve meters and start/decision/pause/retry screens. This is a foundation, not finished work. Its single authored event repeats; shelter has no hazard effect; research-only wins; vertical physics is a placeholder; station selection only identifies a module; restarting does not reset player position. Those gaps have owners above.

## Dependencies without blocking

- HUD/UI render existing typed snapshots immediately.
- World/physics use frozen `STATIONS`, dimensions and metres/Y-up convention.
- Genius supplies `loadMission()` content; Rohit applies effects in `reduceGame()`.
- Starter effects handle reserves, shelter and science. Genius records requirements for conditional shelter/communication mechanics in `missions/NOTES.md`; Rohit coordinates contract extensions.
- UI handles empty sources honestly. Each feature's `NOTES.md` is its status board; do not have six agents edit this table.
