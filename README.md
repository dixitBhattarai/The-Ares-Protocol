# The Ares Protocol

A hackathon starter for a 3D Mars outpost decision game for children ages 7–12. Stack: Vue 3, TypeScript, Three.js, Rapier and Vite. Teach engineering trade-offs through a short mission.

## Start locally

Use Node 22.12+ (a current LTS is preferable) and npm:

```powershell
npm ci
npm run dev
```

Checks: `npm run typecheck`, `npm test`, `npm run build`. Inspect the production build with `npm run preview`. Open the URL printed by Vite. `dist/` can be served by a static host; this starter needs no backend or API key. No hosting account/deployment is configured.

## Team assignments

| Person | Task | Owned folder / instructions |
| --- | --- | --- |
| Himamshu | 3D world and separate merge coordination | [world](src/features/world/AGENTS.md) |
| Saurav | In-game HUD and feedback | [hud](src/features/hud/AGENTS.md) |
| Dixit | Onboarding, choices, results and sources | [ui](src/features/ui/AGENTS.md) |
| Anshu | Physics and controls | [physics](src/features/physics/AGENTS.md) |
| Genius | NASA evidence and mission content | [missions](src/features/missions/AGENTS.md) |
| Rohit | Rules, app wiring and release preparation | [game](src/features/game/AGENTS.md) |

Give each AI its [copy-paste prompt](docs/PROMPTS.md) in its own clone/worktree. Start with [AGENTS.md](AGENTS.md), [tasks](docs/TASKS.md), [contracts](docs/CONTRACTS.md), and [branch/commit rules](docs/GIT_WORKFLOW.md).

```text
src/
  App.vue                 # Rohit: composition and single frame loop
  main.ts, styles.css     # Rohit: entry and global style
  contracts/index.ts      # Rohit: frozen shared types and station layout
  features/
    world/                # Himamshu: Three scene, camera, picking, assets
    hud/                  # Saurav: status display
    ui/                   # Dixit: menus, choices, debrief, credits
    physics/              # Anshu: Rapier controller, colliders, input
    missions/             # Genius: scenarios, evidence, local fixtures
    game/                 # Rohit: reducer, rules, integration tests
docs/                     # Himamshu: coordination; Rohit: engineering guides
```

Each feature has its own `AGENTS.md` and `NOTES.md`; add helpers/assets/tests inside it. Shared engineering configuration and lockfile changes go through Rohit. Six independent branches start at the same scaffold commit; **Himamshu merges serially with checks**, including Rohit's branch. Commit coherent milestones using explicit owned paths. File boundaries reduce conflicts; integrated behavior still needs testing.

Himamshu's separate [merge-coordinator prompt](docs/MERGE_COORDINATOR_PROMPT.md) explains how to collect handoffs and merge in a clean main checkout. [MERGE_LOG.md](docs/MERGE_LOG.md) records actual merge results. The world feature worktree is not the merge workspace.

## Current playable workflow

Choose **Start** for the complete Earth launch/cabin/landing introduction, or **Mars field mission** for a direct outpost demo. Explore a proposed pressurized dome, equip the EVA helmet/air pack at the rack, cycle the two-door airlock and follow the survey markers to the sand site. Collect and seal a sample, return through the airlock, and use the blue solar lab to image and describe it. Recording the observation earns one job and two science points. Other station jobs maintain air, power, crops and solid shelter; six finished jobs end the mission.

Space jumps use physics telemetry with grounded/ascent/fall/landing poses. The existing character's Idle/Walk clips remain intact; authored scoop/inspection layers and tools follow its actual bones. The field sample and its grain illustration are game content, not a real NASA sample or a chemical analysis.

The **NASA** instrument opens public DONKI and NASA Images requests, shows source/observation dates and image credits, and distinguishes a fresh response from bundled DONKI/InSight archives. Timeouts, policy failures, empty responses and rate limits do not break gameplay. NASA's public DEMO_KEY is sufficient; no private API key is exposed. To enable requests in a restricted environment allow `api.nasa.gov`, `images-api.nasa.gov`, and `images-assets.nasa.gov` (record links also use `ccmc.gsfc.nasa.gov` and `images.nasa.gov`).

This is a teaching prototype. The dome is a concept design, the local terrain is authored, and pressure-cycle times, reserve rewards, crop targets, hazards and interplanetary travel are compressed game rules. A transparent dome is not radiation protection. CME speed is not a Mars dose/impact forecast; NASA records never silently alter the game's hazards. Preserve source credits and usage terms. No account, backend, live request or hosting deployment is required to play.

NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. For non-U.S. Government websites, participants must comply with any data use parameters of that specific website.
