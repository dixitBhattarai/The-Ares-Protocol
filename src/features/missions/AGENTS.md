# Genius — NASA Data & Mission Architect

Read root `AGENTS.md`, `docs/CONTRACTS.md` and `docs/HACKATHON_PLAN.md`. Own only `src/features/missions/**`, including content, fixtures/provenance, tests, this guide and `NOTES.md`. Branch: `feat/genius-missions` from the shared baseline.

## Task

### Latest task/reward/automatic hazard direction — 14 Nov

Supersedes older card requirements below: no three-card decisions or post-task cards in the playable loop. Any station job can be started, minigame completion gives one positive payout, and six completed jobs end the mission. Negatives come from active-time reserve consumption and automatic warned hazards; matching maintenance prevents hazard damage. Read root AGENTS.md and docs/CONTRACTS.md for the implemented optional station-tasks mode, action tokens and pause/reset rules. Himamshu's explicit user-requested cross-feature handoff is recorded in the local notes; normal ownership resumes afterward. Do not reintroduce card-first or post-task choice gates.


### Current task-first content direction

Supply a small pool of station jobs and three useful post-task trade-off cards per offer, coordinated through Rohit's additive schema. Jobs themselves have explicit base outcomes; cards add a distinct benefit, cost/drawback or temporary modifier. Author air-leak, power-connection and greenhouse-balance variants suitable for ages 7–12; use stable IDs and seeded selection for reproducible demos. Preserve six shifts/completed jobs and meaningful power/air/food/shelter/communications trade-offs. Essential progression must remain available without waiting; optional finds are small and capped, not infinite resources. Separate authored random encounters from archived NASA observations. Never claim crop growth is instant, solar activity predicts disease, or the prototype trains real astronauts. Keep current loadMission compatibility until Rohit's migration is agreed; do not silently rewrite the reducer/contracts.

Author six short, deterministic shifts teaching engineering trade-offs. Integrate at least one verified real NASA observation into a decision/consequence, with a local raw fixture and transparent mapping. Favor one well-explained evidence source over superficial API breadth.

Preserve synchronous `loadMission(): MissionData`. Bundle a curated snapshot; don't make the demo depend on live API, credentials, CORS, rate limits or today's random event. If evidence can't be retrieved, keep `authored-demo` and report the limitation, not fabricated NASA values.

## Content acceptance

- Six varied, stable-ID events; useful choices always cost reserves/time/opportunity. Include power/air, shelter, food production and delayed Earth communications.
- Three meters only; supplies covers stored food/materials. Don't suggest crops grow instantly or a power purchase eliminates light travel delay.
- Propose conditional hazard/shelter or delayed effects in your notes for Rohit to implement. V1 has only additive effects; don't silently add unsupported fields or edit the reducer/contracts.
- Preserve raw observation, exact query URL/parameters, retrieval/observation dates, units/context, usage terms and attribution in `data/`; map adapted events to `sourceIds`.
- Sources referenced by events must resolve. Write meaningful schema/provenance tests and verify event IDs/choice costs.
- Bundled observations are `archived`; reserve deltas remain authored game units. Solar activity isn't a direct Mars astronaut dose; ISS measurements aren't Mars measurements.
- Check sources before making scientific claims. Don't expose API keys or download giant datasets.

## Starting resources from the brief

- [NASA Open APIs](https://api.nasa.gov/)
- [DONKI overview and current API links](https://ccmc.gsfc.nasa.gov/tools/DONKI/) — check current documentation/usage caveats, not hard-coded legacy endpoints.
- [OSDR](https://osdr.nasa.gov/bio/repo/) and [keyword search](https://osdr.nasa.gov/osdr/data/search?term=KEYWORD)
- [RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/)
- [Mars Trek](https://trek.nasa.gov/mars/)
- [CSA youth STEM resources](https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp)
- [CSA food production toolkit](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/)

These are starting links, not evidence already imported by the scaffold. Inspect actual records and applicable terms. Keep NASA's non-endorsement statement in attribution handoff to Dixit.

## Commit milestones

1. Six authored teaching events: `feat(missions): add six teaching decisions`.
2. Verified fixture/mapping/credits: `feat(missions): add archived NASA evidence`.

Run typecheck/tests/build and content/provenance checks. Stage only `src/features/missions`, inspect staged diff and commit working milestones. Update notes; hand Himamshu branch/hash/paths/checks for merging and send requested rule changes to Rohit. Do not edit UI, game, contracts, root docs, manifests or lockfile, and do not merge into main.

## Temporary rocket cabin handoff — 14 Nov

This coordinated cabin presentation adds no mission-source records or NASA claims. The three cabin minigames and authored transfer timing remain game mechanics; Genius retains mission-content ownership after handoff.
