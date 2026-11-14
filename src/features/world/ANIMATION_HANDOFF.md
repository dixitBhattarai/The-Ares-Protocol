# Character action handoff — 15 November

This is the current user's explicitly requested animation slice. The existing Mixamo Idle/Walk clips remain the base; authored joint layers add ascent tuck, descent extension, landing compression, a planted-foot sampling crouch/scoop, and handheld sample inspection. No new asset download, package, simulation writer or animation loop was introduced.

## Integrate in world/index.ts

Import `setAstronautMotion`, `setAstronautActivity`, `resetAstronautActions` from `astronaut.ts`. These drive loaded Mixamo, auto-rigged NASA suit and procedural fallback players uniformly:

- `setAstronautMotion(astronaut, motion)` accepts the new `PlayerMotion` telemetry from physics. Supply before `render()` every frame, including frames without horizontal movement.
- `setAstronautActivity(astronaut, {action:'none'|'dig'|'research',progress})` receives shell-owned task presentation. This does not award resources or advance task state.
- `resetAstronautActions(astronaut)` clears activity, landing recovery and airborne weights on replay/teleport reset.

The loader also exposes `setMotion`, `setActivity`, `resetActions` beside the existing `setPosture` on the suit container's `userData`. `setPosture` still takes precedence in the flight cabin. Walk playback stops while airborne or working, without changing the physics root.

Import `createAvatarTools` from `avatar-tools.ts`. Create once with the existing ModelKit, add `tools.group` to `astronaut.group`, and call `tools.update(astronaut.group,activity,seconds,active,reduced)` **after** `updateAstronautAnimation` and before rendering. It attaches a sampling scoop and vial to animated hands, and swaps the scoop for a scanner during research. `tools.reset()` hides equipment on replay. ModelKit owns its resources; no separate disposal is needed. Root yaw should face the work target: `atan2(target.x-player.x,target.z-player.z)`; the character's authored forward direction is +Z.

## Rig handling and verification

The bundled GLB uses sanitized `mixamorig1Head`-style names, a rotated centimetre Armature, and different limb bind axes. Joint rotations are authored in model axes and converted into each bone parent's frame. Hip compression is translated in world metres; digging/landing preserve the lowest boot's pre-action height. Root-motion filtering now strips horizontal motion in model space, preserving vertical breathing even when local Z is the imported rig's up direction. EVA helmet/backpack following remains compatible.

Pause freezes all action clocks and poses. Reduced-motion mode uses stable pose samples without advancing procedural clocks. Actions restore each prior mixer result before applying their next offsets, preventing accumulation. Grounded/orbit telemetry and invalid inputs are handled without inventing motion.

Validation: 34 test files / 176 tests passed; typecheck and production build passed. New tests cover ascent/descent/landing, pause/reset, stable reduced motion, orbit handling, action drift, fallback animation, animated-hand equipment, rotated centimetre root tracks and planted boots. An isolated Chromium scene loaded the actual Astra GLB and rendered digging, research and jump views at `/tmp/ares-animation-{dig,research,jump}.png`; these are generated review artifacts, not tracked assets. The main game still requires the world/App integration above before these new animations are user-reachable.
