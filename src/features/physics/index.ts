import RAPIER from '@dimforge/rapier3d-compat';
import { STATIONS } from '../../contracts';
import type { PhysicsAdapter, Vec3 } from '../../contracts';

// Documented Mars surface gravity: 3.72076 m/s² ~ 3.72 m/s² downward.
// Citation: Williams, D. R. (2024), "Mars Fact Sheet", NASA Goddard Space Flight Center / NSSDC.
export const MARS_GRAVITY = 3.72076;

export const BOUNDARY_MIN = -18;
export const BOUNDARY_MAX = 18;
export const GROUND_Y = 0.8;
export const DEFAULT_SPAWN: Readonly<Vec3> = Object.freeze({ x: 0, y: 0.8, z: 5 });
export const ASTRONAUT_SPEED = 3.0; // 3 m/s

export const MOVEMENT_KEY_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

export function computeMovementVelocity(
  pressedKeys: ReadonlySet<string>,
  speed: number = ASTRONAUT_SPEED,
): { vx: number; vz: number } {
  const x = Number(pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) - Number(pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft'));
  const z = Number(pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) - Number(pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp'));
  const length = Math.hypot(x, z);
  if (length === 0) return { vx: 0, vz: 0 };
  return {
    vx: (x / length) * speed,
    vz: (z / length) * speed,
  };
}

export function clampAstronautPosition(
  pos: Vec3,
  minBound: number = BOUNDARY_MIN,
  maxBound: number = BOUNDARY_MAX,
  groundY: number = GROUND_Y,
): Vec3 {
  return {
    x: Math.max(minBound, Math.min(maxBound, pos.x)),
    y: Math.max(groundY, pos.y),
    z: Math.max(minBound, Math.min(maxBound, pos.z)),
  };
}

export async function createPhysics(): Promise<PhysicsAdapter> {
  await RAPIER.init();

  const gravity = { x: 0, y: -MARS_GRAVITY, z: 0 };
  const world = new RAPIER.World(gravity);

  // Ground collider: 40x40 bounded map, Y=0.
  // Half extents (20, 0.1, 20) with translation (0, -0.1, 0) places top surface at Y=0.
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(20, 0.1, 20)
      .setTranslation(0, -0.1, 0)
      .setFriction(0)
      .setRestitution(0),
  );

  // Station colliders (habitat at -5,1,0; solar at 5,1,0; greenhouse at 0,1,-6; each 3x2x3 with half extents 1.5, 1, 1.5)
  for (const station of STATIONS) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(1.5, 1, 1.5)
        .setTranslation(station.position.x, station.position.y, station.position.z)
        .setFriction(0)
        .setRestitution(0),
    );
  }

  // Astronaut dynamic rigid body with locked rotations and capsule collider (halfHeight 0.5, radius 0.3)
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, DEFAULT_SPAWN.z)
    .lockRotations();
  const body = world.createRigidBody(bodyDesc);
  const capsuleCollider = world.createCollider(
    RAPIER.ColliderDesc.capsule(0.5, 0.3)
      .setFriction(0)
      .setRestitution(0),
    body,
  );

  // Character controller for kinematic/grounded interaction
  const controller = world.createCharacterController(0.01);
  controller.enableSnapToGround(0.5);
  controller.setSlideEnabled(true);

  const pressed = new Set<string>();
  let isInputPaused = false;
  let isDisposed = false;
  let outsidePose: Vec3 | undefined;

  const keyDown = (event: KeyboardEvent) => {
    if (isDisposed || isInputPaused) return;
    if ((event.target as HTMLElement | null)?.closest?.('button, input, textarea, select, [contenteditable]')) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (MOVEMENT_KEY_CODES.has(event.code)) {
      pressed.add(event.code);
    }
  };

  const keyUp = (event: KeyboardEvent) => {
    if (isDisposed) return;
    pressed.delete(event.code);
  };

  const clearKeys = () => {
    pressed.clear();
  };

  const visibilityChange = () => {
    if (typeof document !== 'undefined' && document.hidden) {
      clearKeys();
    }
  };

  const hasWindow = typeof window !== 'undefined';
  const hasDoc = typeof document !== 'undefined';
  if (hasWindow) {
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clearKeys);
    window.addEventListener('focus', clearKeys);
  }
  if (hasDoc) {
    document.addEventListener('visibilitychange', visibilityChange);
  }

  return {
    step(seconds: number) {
      if (isDisposed) return;
      const dt = Math.max(0.001, Math.min(seconds, 0.1));
      const { vx, vz } = isInputPaused ? { vx: 0, vz: 0 } : computeMovementVelocity(pressed, ASTRONAUT_SPEED);
      const curLinvel = body.linvel();
      body.setLinvel({ x: vx, y: curLinvel.y, z: vz }, true);

      world.timestep = dt;
      world.step();

      const pose = body.translation();
      const min = outsidePose ? -2.6 : BOUNDARY_MIN;
      const max = outsidePose ? 2.6 : BOUNDARY_MAX;
      let clampedX = Math.max(min, Math.min(max, pose.x));
      let clampedZ = Math.max(min, Math.min(max, pose.z));
      let clampedY = pose.y;

      if (clampedY < GROUND_Y) {
        clampedY = GROUND_Y;
        if (body.linvel().y < 0) {
          body.setLinvel({ x: vx, y: 0, z: vz }, true);
        }
      }

      if (clampedX !== pose.x || clampedY !== pose.y || clampedZ !== pose.z) {
        body.setTranslation({ x: clampedX, y: clampedY, z: clampedZ }, true);
      }
    },
    getPlayerPose(): Vec3 {
      if (isDisposed) return { ...DEFAULT_SPAWN };
      const pose = body.translation();
      return { x: pose.x, y: pose.y, z: pose.z };
    },
    reset(pose?: Vec3) {
      outsidePose = undefined;
      if (isDisposed) return;
      clearKeys();
      const target = pose ? { x: pose.x, y: pose.y, z: pose.z } : { ...DEFAULT_SPAWN };
      body.setTranslation(target, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    },
    pauseInput() {
      if (isDisposed) return;
      isInputPaused = true;
      clearKeys();
      const curLinvel = body.linvel();
      body.setLinvel({ x: 0, y: curLinvel.y, z: 0 }, true);
    },
    enterInterior() {
      if (isDisposed || outsidePose) return;
      outsidePose = { ...body.translation() };
      clearKeys();
      body.setTranslation({ x: 0, y: .8, z: 2 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    },
    exitInterior() {
      if (isDisposed || !outsidePose) return;
      body.setTranslation(outsidePose, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      outsidePose = undefined;
      clearKeys();
    },
    resumeInput() {
      if (isDisposed) return;
      isInputPaused = false;
      clearKeys();
    },
    dispose() {
      if (isDisposed) return;
      isDisposed = true;
      clearKeys();
      if (hasWindow) {
        window.removeEventListener('keydown', keyDown);
        window.removeEventListener('keyup', keyUp);
        window.removeEventListener('blur', clearKeys);
        window.removeEventListener('focus', clearKeys);
      }
      if (hasDoc) {
        document.removeEventListener('visibilitychange', visibilityChange);
      }
      world.removeCharacterController(controller);
      world.free();
    },
  };
}
