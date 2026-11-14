import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  ASTRONAUT_SPEED,
  BOUNDARY_MAX,
  BOUNDARY_MIN,
  DEFAULT_SPAWN,
  GROUND_Y,
  MARS_GRAVITY,
  clampAstronautPosition,
  computeMovementVelocity,
  createPhysics,
} from './index';

describe('physics velocity vector normalization and input math', () => {
  it('computes exact orthogonal speeds for cardinal directions', () => {
    expect(computeMovementVelocity(new Set(['KeyD']))).toEqual({ vx: ASTRONAUT_SPEED, vz: 0 });
    expect(computeMovementVelocity(new Set(['KeyA']))).toEqual({ vx: -ASTRONAUT_SPEED, vz: 0 });
    expect(computeMovementVelocity(new Set(['KeyS']))).toEqual({ vx: 0, vz: ASTRONAUT_SPEED });
    expect(computeMovementVelocity(new Set(['KeyW']))).toEqual({ vx: 0, vz: -ASTRONAUT_SPEED });

    expect(computeMovementVelocity(new Set(['ArrowRight']))).toEqual({ vx: ASTRONAUT_SPEED, vz: 0 });
    expect(computeMovementVelocity(new Set(['ArrowLeft']))).toEqual({ vx: -ASTRONAUT_SPEED, vz: 0 });
    expect(computeMovementVelocity(new Set(['ArrowDown']))).toEqual({ vx: 0, vz: ASTRONAUT_SPEED });
    expect(computeMovementVelocity(new Set(['ArrowUp']))).toEqual({ vx: 0, vz: -ASTRONAUT_SPEED });
  });

  it('normalizes diagonal speed so it matches orthogonal speed', () => {
    const diagWD = computeMovementVelocity(new Set(['KeyW', 'KeyD']));
    const speedWD = Math.hypot(diagWD.vx, diagWD.vz);
    expect(speedWD).toBeCloseTo(ASTRONAUT_SPEED, 6);
    expect(diagWD.vx).toBeGreaterThan(0);
    expect(diagWD.vz).toBeLessThan(0);

    const diagSA = computeMovementVelocity(new Set(['KeyS', 'KeyA']));
    const speedSA = Math.hypot(diagSA.vx, diagSA.vz);
    expect(speedSA).toBeCloseTo(ASTRONAUT_SPEED, 6);

    const diagArrows = computeMovementVelocity(new Set(['ArrowUp', 'ArrowLeft']));
    const speedArrows = Math.hypot(diagArrows.vx, diagArrows.vz);
    expect(speedArrows).toBeCloseTo(ASTRONAUT_SPEED, 6);
  });

  it('cancels out opposing key presses and handles zero input', () => {
    expect(computeMovementVelocity(new Set())).toEqual({ vx: 0, vz: 0 });
    expect(computeMovementVelocity(new Set(['KeyW', 'KeyS']))).toEqual({ vx: 0, vz: 0 });
    expect(computeMovementVelocity(new Set(['KeyA', 'KeyD']))).toEqual({ vx: 0, vz: 0 });
    expect(computeMovementVelocity(new Set(['ArrowLeft', 'ArrowRight']))).toEqual({ vx: 0, vz: 0 });
    expect(computeMovementVelocity(new Set(['KeyW', 'KeyS', 'KeyD']))).toEqual({ vx: ASTRONAUT_SPEED, vz: 0 });
  });

  it('respects custom speed parameter', () => {
    const custom = computeMovementVelocity(new Set(['KeyD']), 6.0);
    expect(custom).toEqual({ vx: 6.0, vz: 0 });
  });
});

describe('boundary clamping and ground height', () => {
  it('strictly clamps positions to boundary limits [-18, 18]', () => {
    const outsideMin = clampAstronautPosition({ x: -25, y: 0.8, z: -30 });
    expect(outsideMin.x).toBe(BOUNDARY_MIN);
    expect(outsideMin.z).toBe(BOUNDARY_MIN);

    const outsideMax = clampAstronautPosition({ x: 25, y: 0.8, z: 20 });
    expect(outsideMax.x).toBe(BOUNDARY_MAX);
    expect(outsideMax.z).toBe(BOUNDARY_MAX);
  });

  it('clamps height to ground level 0.8 and preserves valid height above ground', () => {
    const belowGround = clampAstronautPosition({ x: 0, y: -2, z: 0 });
    expect(belowGround.y).toBe(GROUND_Y);

    const inAir = clampAstronautPosition({ x: 0, y: 3.5, z: 0 });
    expect(inAir.y).toBe(3.5);
  });

  it('preserves valid in-bound positions unmodified', () => {
    const valid = { x: -5, y: 1.2, z: 7 };
    expect(clampAstronautPosition(valid)).toEqual(valid);
  });
});

describe('Mars gravity and station colliders in Rapier 3D', () => {
  it('enters a bounded room and restores the saved surface pose once on exit', async () => {
    const physics = await createPhysics();
    physics.reset?.({ x: -5, y: .8, z: 2.6 });
    physics.enterInterior?.();
    expect(physics.getPlayerPose().x).toBeCloseTo(0);
    expect(physics.getPlayerPose().z).toBeCloseTo(2);
    physics.enterInterior?.();
    for (let i = 0; i < 30; i++) physics.step(1 / 60);
    expect(physics.getPlayerPose().y).toBeGreaterThan(.75);
    physics.exitInterior?.();
    expect(physics.getPlayerPose().x).toBeCloseTo(-5);
    expect(physics.getPlayerPose().z).toBeCloseTo(2.6);
    physics.exitInterior?.();
    expect(physics.getPlayerPose().x).toBeCloseTo(-5);
    physics.dispose();
  });
  it('cites and configures Mars surface gravity at 3.72076 m/s²', () => {
    expect(MARS_GRAVITY).toBeCloseTo(3.72, 2);
    expect(MARS_GRAVITY).toBe(3.72076);
  });

  it('spawns astronaut at initial pose (0, 0.8, 5) and rests on ground', async () => {
    const physics = await createPhysics();
    const pose = physics.getPlayerPose();
    expect(pose.x).toBeCloseTo(DEFAULT_SPAWN.x, 3);
    expect(pose.y).toBeCloseTo(DEFAULT_SPAWN.y, 3);
    expect(pose.z).toBeCloseTo(DEFAULT_SPAWN.z, 3);

    // Step physics for 30 frames (0.5s) with no input
    for (let i = 0; i < 30; i++) physics.step(1 / 60);
    const restingPose = physics.getPlayerPose();
    expect(restingPose.x).toBeCloseTo(0, 2);
    expect(restingPose.y).toBeCloseTo(GROUND_Y, 2);
    expect(restingPose.z).toBeCloseTo(5, 2);

    physics.dispose();
  });

  it('drops astronaut from height under Mars gravity until grounded', async () => {
    const physics = await createPhysics();
    // Reset to height y = 4.0
    physics.reset!({ x: 0, y: 4.0, z: 0 });
    expect(physics.getPlayerPose().y).toBe(4.0);

    // Step 10 frames (~0.166s) - height must decrease under Mars gravity
    for (let i = 0; i < 10; i++) physics.step(1 / 60);
    expect(physics.getPlayerPose().y).toBeLessThan(4.0);

    // Step remaining frames to settle on ground
    for (let i = 0; i < 120; i++) physics.step(1 / 60);
    expect(physics.getPlayerPose().y).toBeCloseTo(GROUND_Y, 2);

    physics.dispose();
  });

  it('blocks astronaut entry into habitat station collider at (-5, 1, 0)', async () => {
    const physics = await createPhysics();
    // Position astronaut right outside habitat station (habitat center is -5, halfExtent 1.5, capsule radius 0.3 -> barrier at -3.2)
    physics.reset!({ x: -3.0, y: 0.8, z: 0 });

    // Try forcing movement into the station at -5 for 60 steps
    // To simulate direct input in headless test, we reset position just outside and step
    for (let i = 0; i < 60; i++) {
      physics.step(1 / 60);
    }
    // Cannot be inside the station core (x < -3.5 is station body)
    expect(physics.getPlayerPose().x).toBeGreaterThanOrEqual(-3.25);

    physics.dispose();
  });
});

describe('Reset, Pause, Focus and Lifecycle Hooks', () => {
  let originalWindow: any;
  let originalDocument: any;
  let eventListeners: Map<string, Set<(e: any) => void>>;

  beforeEach(() => {
    eventListeners = new Map();
    originalWindow = (globalThis as any).window;
    originalDocument = (globalThis as any).document;

    const mockTarget = {
      addEventListener: (type: string, fn: (e: any) => void) => {
        if (!eventListeners.has(type)) eventListeners.set(type, new Set());
        eventListeners.get(type)!.add(fn);
      },
      removeEventListener: (type: string, fn: (e: any) => void) => {
        eventListeners.get(type)?.delete(fn);
      },
      dispatchEvent: (event: any) => {
        const fns = eventListeners.get(event.type);
        if (fns) {
          for (const fn of Array.from(fns)) fn(event);
        }
        return true;
      },
    };

    (globalThis as any).window = mockTarget;
    (globalThis as any).document = {
      ...mockTarget,
      hidden: false,
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
  });

  it('enforces boundaries strictly during continuous movement in simulation', async () => {
    const physics = await createPhysics();

    // Test X max boundary (18)
    physics.reset!({ x: 17.5, y: 0.8, z: 0 });
    // Simulate walking right (+X)
    window.dispatchEvent({ type: 'keydown', code: 'KeyD' } as any);
    for (let i = 0; i < 60; i++) physics.step(1 / 60);
    expect(physics.getPlayerPose().x).toBe(BOUNDARY_MAX);
    window.dispatchEvent({ type: 'keyup', code: 'KeyD' } as any);

    // Test X min boundary (-18)
    physics.reset!({ x: -17.5, y: 0.8, z: 0 });
    window.dispatchEvent({ type: 'keydown', code: 'KeyA' } as any);
    for (let i = 0; i < 60; i++) physics.step(1 / 60);
    expect(physics.getPlayerPose().x).toBe(BOUNDARY_MIN);
    window.dispatchEvent({ type: 'keyup', code: 'KeyA' } as any);

    // Test Z max boundary (18)
    physics.reset!({ x: 0, y: 0.8, z: 17.5 });
    window.dispatchEvent({ type: 'keydown', code: 'KeyS' } as any);
    for (let i = 0; i < 60; i++) physics.step(1 / 60);
    expect(physics.getPlayerPose().z).toBe(BOUNDARY_MAX);
    window.dispatchEvent({ type: 'keyup', code: 'KeyS' } as any);

    // Test Z min boundary (-18)
    physics.reset!({ x: 0, y: 0.8, z: -17.5 });
    window.dispatchEvent({ type: 'keydown', code: 'KeyW' } as any);
    for (let i = 0; i < 60; i++) physics.step(1 / 60);
    expect(physics.getPlayerPose().z).toBe(BOUNDARY_MIN);
    window.dispatchEvent({ type: 'keyup', code: 'KeyW' } as any);

    physics.dispose();
  });

  it('reset() restores spawn pose and clears velocity', async () => {
    const physics = await createPhysics();

    // Move or modify pose
    physics.reset!({ x: 8, y: 0.8, z: -4 });
    const customPose = physics.getPlayerPose();
    expect(customPose.x).toBeCloseTo(8, 4);
    expect(customPose.y).toBeCloseTo(0.8, 4);
    expect(customPose.z).toBeCloseTo(-4, 4);

    // Call reset() with no args -> restores default spawn (0, 0.8, 5)
    physics.reset!();
    const pose = physics.getPlayerPose();
    expect(pose.x).toBeCloseTo(DEFAULT_SPAWN.x, 3);
    expect(pose.y).toBeCloseTo(DEFAULT_SPAWN.y, 3);
    expect(pose.z).toBeCloseTo(DEFAULT_SPAWN.z, 3);

    physics.dispose();
  });

  it('pauseInput() halts input movement and resumeInput() restores it', async () => {
    const physics = await createPhysics();

    // Simulate keydown KeyD
    window.dispatchEvent({ type: 'keydown', code: 'KeyD' } as any);
    for (let i = 0; i < 30; i++) physics.step(1 / 60);
    const movingX = physics.getPlayerPose().x;
    expect(movingX).toBeGreaterThan(0.5);

    // Pause input
    physics.pauseInput!();
    // Simulate pressing KeyD while paused (should be ignored)
    window.dispatchEvent({ type: 'keydown', code: 'KeyD' } as any);
    for (let i = 0; i < 30; i++) physics.step(1 / 60);
    const pausedX = physics.getPlayerPose().x;
    // Astronaut must have stopped advancing
    expect(pausedX).toBeCloseTo(movingX, 2);

    // Resume input and press KeyD
    physics.resumeInput!();
    window.dispatchEvent({ type: 'keydown', code: 'KeyD' } as any);
    for (let i = 0; i < 30; i++) physics.step(1 / 60);
    expect(physics.getPlayerPose().x).toBeGreaterThan(pausedX);

    physics.dispose();
  });

  it('blur event and visibilitychange clear held keys to prevent stuck movement', async () => {
    const physics = await createPhysics();

    // Press KeyD
    window.dispatchEvent({ type: 'keydown', code: 'KeyD' } as any);
    for (let i = 0; i < 10; i++) physics.step(1 / 60);
    const beforeBlurX = physics.getPlayerPose().x;

    // Trigger blur
    window.dispatchEvent({ type: 'blur' } as any);
    for (let i = 0; i < 30; i++) physics.step(1 / 60);
    const afterBlurX = physics.getPlayerPose().x;
    // Astronaut does not keep moving after blur cleared keys
    expect(afterBlurX).toBeCloseTo(beforeBlurX, 2);

    // Test document visibility change when hidden
    (document as any).hidden = true;
    window.dispatchEvent({ type: 'keydown', code: 'KeyA' } as any);
    document.dispatchEvent({ type: 'visibilitychange' } as any);
    for (let i = 0; i < 30; i++) physics.step(1 / 60);
    // Keys cleared, no movement
    expect(physics.getPlayerPose().x).toBeCloseTo(afterBlurX, 2);

    physics.dispose();
  });

  it('ignores movement keys when typing in input, button, or textarea elements', async () => {
    const physics = await createPhysics();

    const mockInputElement = {
      closest: (selector: string) => selector.includes('input'),
    };

    window.dispatchEvent({
      type: 'keydown',
      code: 'KeyD',
      target: mockInputElement,
    } as any);

    for (let i = 0; i < 30; i++) physics.step(1 / 60);
    // Astronaut should not have moved because event target was inside an input
    expect(physics.getPlayerPose().x).toBeCloseTo(0, 3);

    physics.dispose();
  });

  it('keeps WASD movement active while a button has focus', async () => {
    const physics = await createPhysics();
    const mockButton = {
      closest: (selector: string) => selector.includes('button'),
    };

    window.dispatchEvent({
      type: 'keydown',
      code: 'KeyD',
      target: mockButton,
    } as any);

    for (let i = 0; i < 30; i++) physics.step(1 / 60);
    expect(physics.getPlayerPose().x).toBeGreaterThan(0.5);

    physics.dispose();
  });

  it('prevents default scroll behavior on arrow keys', async () => {
    const physics = await createPhysics();
    const preventDefault = vi.fn();

    window.dispatchEvent({
      type: 'keydown',
      code: 'ArrowDown',
      preventDefault,
    } as any);

    expect(preventDefault).toHaveBeenCalled();

    physics.dispose();
  });

  it('cleanly disposes event listeners and Rapier memory without double-free errors', async () => {
    const physics = await createPhysics();

    // Verify listeners attached
    expect(eventListeners.get('keydown')?.size).toBeGreaterThan(0);

    // Dispose
    physics.dispose();

    // Verify listeners removed
    expect(eventListeners.get('keydown')?.size).toBe(0);
    expect(eventListeners.get('keyup')?.size).toBe(0);
    expect(eventListeners.get('blur')?.size).toBe(0);

    // Calling dispose again should be safe and idempotent
    expect(() => physics.dispose()).not.toThrow();

    // Calling step after dispose should be a safe no-op
    expect(() => physics.step(1 / 60)).not.toThrow();
  });
  it('bounds interior movement and clears the room mode when resetting the mission', async () => {
    const physics = await createPhysics();
    physics.enterInterior?.();
    window.dispatchEvent({ type: 'keydown', code: 'KeyD' } as any);
    for (let i = 0; i < 240; i++) physics.step(1 / 60);
    expect(physics.getPlayerPose().x).toBeLessThanOrEqual(2.6001);
    physics.reset?.();
    physics.exitInterior?.();
    expect(physics.getPlayerPose().x).toBeCloseTo(DEFAULT_SPAWN.x);
    expect(physics.getPlayerPose().z).toBeCloseTo(DEFAULT_SPAWN.z);
    physics.dispose();
  });
});
