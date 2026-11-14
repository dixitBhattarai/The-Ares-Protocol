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
| Himamshu | 3D world and presentation | [world](src/features/world/AGENTS.md) |
| Saurav | In-game HUD and feedback | [hud](src/features/hud/AGENTS.md) |
| Dixit | Onboarding, choices, results and sources | [ui](src/features/ui/AGENTS.md) |
| Anshu | Physics and controls | [physics](src/features/physics/AGENTS.md) |
| Genius | NASA evidence and mission content | [missions](src/features/missions/AGENTS.md) |
| Rohit | Rules, integration and release | [game](src/features/game/AGENTS.md) |

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
docs/                     # Rohit: plan, APIs, prompts, release checklist
```

Each feature has its own `AGENTS.md` and `NOTES.md`; add helpers/assets/tests inside it. Shared configuration and lockfile changes go through Rohit. Six independent branches start at the same scaffold commit; Rohit merges serially with checks. Commit coherent milestones using explicit owned paths. File boundaries reduce conflicts; integrated behavior still needs testing.

## Current limits and priorities

This is a runnable foundation, not a completed submission: one authored event repeats, research-only can win, shelter has no hazard benefit, vertical physics is a placeholder and replay doesn't reset position. No NASA observation is bundled yet. Those gaps have named owners in the task list.

Keep scope to one map, three reserve meters, six meaningful choices, one verified NASA-backed scenario and a debrief. Read [the deadline plan and pitfalls](docs/HACKATHON_PLAN.md) and [demo checklist](docs/DEMO_CHECKLIST.md). This is a learning game, not professional astronaut training.

All starter reserve values are authored game units. Real observations must retain provenance and a mapping to simplified rules; never label a static snapshot live.

NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. For non-U.S. Government websites, participants must comply with any data use parameters of that specific website.
