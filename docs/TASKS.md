# Six owners, six task areas

Saurav and Dixit were both assigned HUD/UI. Their work is split below to create six independent tracks. Rohit is the only shared-file integrator; everyone else can implement immediately against the supplied stubs and contracts.

| Owner | Task and deliverable | Acceptance criteria | Suggested feature commits |
| --- | --- | --- | --- |
| Himamshu | Small navigable Mars base, modules, astronaut, camera, picking and status visuals | Habitat/solar/greenhouse distinguishable; layout matches collisions; resize works; lightweight geometry; `setState` visibly reflects status; picking emits station ID; resources disposed | `feat(world): build readable Mars outpost`; `feat(world): show module status and selection` |
| Saurav | In-game status HUD | Three reserve bars with numbers; shift/science goal; plain-language shelter status; text plus color warnings; feedback on costs without mutating state; readable at 360px and laptop widths | `feat(hud): add accessible reserve meters`; `feat(hud): explain changes and warnings` |
| Dixit | Tutorial, choices, pause, results/debrief and sources | Keyboard-accessible start-to-retry flow; costs and benefits visible before choosing; constructive loss explanation and log review; attribution and demo/archive labels; no simulation logic | `feat(ui): build onboarding and decisions`; `feat(ui): add debrief replay and source credits` |
| Anshu | Reliable controller, collisions and input lifecycle | Normalized WASD/arrows; stationary at pause; no stuck keys after blur; floor/module collisions match map; grounded movement; bounded play area; cited Mars gravity if implemented; cleanup; request reset API with Rohit | `feat(physics): add grounded astronaut controller`; `fix(physics): handle focus pause and reset` |
| Genius | Evidence-backed mission pack | Six varied deterministic shifts; useful choices have costs; food/communications represented without more meters; at least one checked NASA observation with raw fixture/provenance; explicit game mapping; no live-fetch dependency; honest labels | `feat(missions): add six teaching decisions`; `feat(missions): add archived NASA evidence` |
| Rohit | Rules, composition, integration and release | Reserve costs, shelter benefit during hazard, science target, winning and losing strategies, pause/restart; one loop; tests of trade-offs and failure; merge five features; successful production demo and submission assets | `feat(game): implement consequences and debrief`; `feat(game): integrate team modules`; `fix(game): stabilize release and demo` |

## Existing starter versus remaining work

The scaffold has a simple reducer, six reducer tests, a primitive Three scene, basic Rapier horizontal movement, reserve meters and start/decision/pause/retry screens. This is a foundation, not finished work. Its single authored event repeats; shelter has no hazard effect; research-only wins; vertical physics is a placeholder; station selection only identifies a module; restarting does not reset player position. Those gaps have owners above.

## Dependencies without blocking

- HUD/UI render existing typed snapshots immediately.
- World/physics use frozen `STATIONS`, dimensions and metres/Y-up convention.
- Genius supplies `loadMission()` content; Rohit applies effects in `reduceGame()`.
- Starter effects handle reserves, shelter and science. Genius records requirements for conditional shelter/communication mechanics in `missions/NOTES.md`; Rohit coordinates contract extensions.
- UI handles empty sources honestly. Each feature's `NOTES.md` is its status board; do not have six agents edit this table.
