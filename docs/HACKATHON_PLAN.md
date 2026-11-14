# Build to the challenge

Deadline assumption from the conversation: **15 November 2026, 11:59 pm Asia/Katmandu (UTC+05:45)**. Verify the organizer's timezone/deadline; this repository does not confirm it. Use the earlier cutoff if the official timezone differs.

## Recommended concept

A junior astronaut outpost decision game for ages 7–12: one small Mars base, three readable reserves, six shifts and a debrief. Walking connects visible systems; costly decisions teach power, air, food/supplies, shelter and communications. The core must work using ordinary buttons even if 3D/input fails.

A mission takes 3–5 real minutes. Shifts are compressed game time, not claims that crops, shielding or biological changes happen in minutes.

## Approaches to correct now

1. Pitch a learning game, not professional astronaut training. Show what a child learns by choosing.
2. Avoid a large open world. Primitive/low-poly assets and a controlled camera are enough. Defer multiplayer, crafting trees, procedural planets and cinematic systems.
3. Give every useful choice a cost. Shelter needs a later benefit; science competes with survival. The starter's research-only strategy wins and shelter does nothing yet: Rohit/Genius must fix that before judging.
4. Keep three meters. Explain food/shelter/communications through choices and feedback rather than more unfamiliar gauges. Show costs and benefits before selection.
5. Keep physics separate from resource rules. Use one animation loop, fixed physics steps, and a deterministic reducer. Rapier compatibility embeds WASM but still initializes asynchronously. [Official Rapier setup](https://rapier.rs/docs/user_guides/javascript/getting_started_js/).
6. Use a small verified archived NASA observation bundled with the app. Don't depend on a live request/key during judging. No observation is loaded in this scaffold.
7. Don't infer Mars crew dose from a flare category or ISS dosimetry alone. Explain how evidence inspired a simplified hazard. Follow [DONKI's current API links, usage caveats and attribution](https://ccmc.gsfc.nasa.gov/tools/DONKI/).
8. Integrate and rehearse early. Separate folders reduce conflicts but can't replace a tested merge queue.

## Six-shift teaching arc to implement

| Shift | Decision | Trade-off |
| --- | --- | --- |
| 1 | Oxygen production or science equipment | Spend power now to protect later air reserves |
| 2 | Prepare shelter or extend exploration | Construction stock and time compete with protection |
| 3 | Respond to a warning inspired by verified archived solar activity | Shelter reduces a modeled later penalty; safety costs opportunity |
| 4 | Greenhouse power or battery reserve | Food production needs time/energy; immediate food uses stored stock |
| 5 | Communications power or autonomous science | Earth's reply is delayed; extra power can't remove light travel time |
| 6 | Complete science or protect the final reserve | Cumulative consequences determine success and debrief |

This is a content plan, not implemented physical data. Genius supplies evidence; Rohit supplies conditional consequences. First run should be predictable; alternate scenarios are optional after the core works.

## Work backwards from the deadline

- First 2 hours after kickoff: publish baseline, open six isolated workspaces, agree contracts, commit one useful milestone per owner.
- Next 4–6 hours: integrate start → costly choice → consequence → debrief → retry. Include one verified NASA record. Deploy a preview on the selected static host.
- By 15 Nov, 3:00 pm Nepal time: all roles hand off and one mission works; cut unfinished optional features.
- By 7:00 pm: feature freeze, fix demo blockers; prove winning/losing strategies, test a second machine and small screen.
- By 9:00 pm: record backup demo, screenshots, credits and submission text; test public URL in a private window.
- By 10:30 pm: submit, leaving buffer before the assumed 11:59 pm deadline.

## Evidence and pitch

One deep NASA integration beats superficial links to five APIs. Genius should keep a real observation, exact query, retrieval/observation dates, raw fixture, units/context, usage conditions and explicit mapping to authored gameplay. Check the current docs, since endpoints can change. If retrieval fails, retain the authored-demo label and explain the limitation; never invent records.

Keep third-party asset credits and the NASA non-endorsement statement. Distinguish facts, observations and balancing values. Pitch: learner problem → visible choice/cost → delayed consequence → cited observation/simplification → debrief/replay. A working mission teaches more than extra scenery; no plan can guarantee a result.

Build tooling follows [Vite's official Vue/TypeScript setup](https://vite.dev/guide/). Install pinned versions with `npm ci`; don't upgrade packages independently during parallel work.
