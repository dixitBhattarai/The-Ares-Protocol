import {CABIN,stepCabin} from './cabin-motion';
import { constrainHabitatMotion } from './habitat';
import type { HabitatAccess } from '../../contracts/habitat';
import type { PlayerMotion } from '../../contracts/exploration';
import RAPIER from '@dimforge/rapier3d-compat';
import { BUILDING_HALF_SIZE, DOOR_HALF_WIDTH, STATIONS } from '../../contracts';
import type { GravityBody, GravityInfo, PhysicsAdapter, StationId, Vec3 } from '../../contracts';

// Documented Mars surface gravity: 3.72076 m/s² ~ 3.72 m/s² downward.
// Citation: Williams, D. R. (2024), "Mars Fact Sheet", NASA Goddard Space Flight Center / NSSDC.
export const MARS_GRAVITY = 3.72076;
// Standard gravity (CGPM 1901): 9.80665 m/s². Orbit cabin: free fall, so no weight (0 m/s²).
export const EARTH_GRAVITY = 9.80665;
export const GRAVITY_BY_BODY: Readonly<Record<GravityBody, number>> = { earth: EARTH_GRAVITY, orbit: 0, mars: MARS_GRAVITY };
// Same leg-push take-off speed everywhere, so only gravity changes the height.
// Tune the whole jump feel here: Earth jump height in metres. The astronaut is ~1.55 m tall (world attaches the model at 1.55 m;
// collider is 1.6 m). 0.3 m is a heavy-spacesuit jump (a bare-handed standing jump is ~0.5 m), which also keeps Mars (~0.8 m,
// about half the body height) believable next to the character.
export const EARTH_JUMP_HEIGHT_M = 0.3;
export const JUMP_SPEED = Math.sqrt(2 * EARTH_GRAVITY * EARTH_JUMP_HEIGHT_M);

export function describeGravity(body: GravityBody): GravityInfo {
  const g = GRAVITY_BY_BODY[body];
  return {
    body,
    gravityMS2: g,
    relativeToEarth: g / EARTH_GRAVITY,
    jumpHeightM: g > 0 ? (JUMP_SPEED * JUMP_SPEED) / (2 * g) : 0,
    canJump: g > 0,
  };
}

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

export function rotateMovement(vx: number, vz: number, yaw: number): { vx: number; vz: number } {
  const angle = Number.isFinite(yaw) ? yaw : 0;
  return { vx: vx * Math.cos(angle) + vz * Math.sin(angle), vz: -vx * Math.sin(angle) + vz * Math.cos(angle) };
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

  const stationColliders:RAPIER.Collider[]=[];
  const doors = new Map<StationId,RAPIER.Collider>();
  const doorStates = new Map<StationId,boolean>();
  const marsOnlyColliders: RAPIER.Collider[] = [];
  // Hollow shells: same world, solid walls, and an actual opening on the +Z face.
  for (const station of STATIONS) {
    const {x,z}=station.position, h=BUILDING_HALF_SIZE;
    const box=(hx:number,hy:number,hz:number,px:number,py:number,pz:number)=>{
      const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x+px,py,z+pz).setFriction(0));
      stationColliders.push(collider);if(station.id!=='habitat')marsOnlyColliders.push(collider);
      return collider;
    };
    box(.1,1.3,h,-h+.1,1.3,0);box(.1,1.3,h,h-.1,1.3,0);box(h,1.3,.1,0,1.3,-h+.1);
    const half=(h-DOOR_HALF_WIDTH)/2;
    for(const side of [-1,1])box(half,1.3,.1,side*(DOOR_HALF_WIDTH+half),1.3,h-.1);
    doors.set(station.id,box(DOOR_HALF_WIDTH,1.15,.1,0,1.15,h-.1));
    for(const px of [-1.8,0,1.8])box(.65,.45,.38,px,.45,-2.2);
    if(station.id==='greenhouse')for(const px of [-1.65,1.65])box(.525,.34,1.15,px,.34,.6);
    if(station.id==='habitat')box(.625,.9,1,-2,.9,-.1);
    if(station.id==='solar')for(const px of [-2,2])box(.4,.8,.55,px,.8,.2);
  }

  // Solid envelope around the Earth launch vehicle and its service gantry.
  // Keep this aligned with createEarthCampus's launch pad at (12, 0, -14).
  const earthLaunchVehicleCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(2.6, 6, 1.5)
      .setTranslation(12, 6.1, -14)
      .setFriction(0),
  );
  earthLaunchVehicleCollider.setEnabled(false);

  // Solid raised launch platform under the rocket (matches 'ares-launch-pad' in world/earth.ts):
  // a 10 x 10 slab centred on (12, -14) with its top at y=.36, reached by two .12m steps on the
  // crew-lab (+Z) side. Everywhere else its edge is a wall, so it can't be walked through.
  const earthLaunchPadColliders: RAPIER.Collider[] = [];
  const padBlock = (hx: number, hy: number, hz: number, x: number, topY: number, z: number) => {
    const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, topY - hy, z).setFriction(0));
    collider.setEnabled(false);
    earthLaunchPadColliders.push(collider);
  };
  padBlock(5, .5, 5, 12, .36, -14);
  padBlock(2, .3, .3, 12, .24, -8.7);
  padBlock(2, .3, .3, 12, .12, -8.1);

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
  let cameraYaw = 0;
  let walkingPath: Vec3[] = [];
  let habitatAccess: HabitatAccess | null = null;
  let gravityBody: GravityBody = 'mars';
  let drift={x:0,y:0,z:0},climbing=false;
  let jumpRequested = false;

  // The capsule reaches .8m below its centre. A short support probe handles
  // furniture tops as well as the flat base, without treating nearby walls as ground.
  function grounded(): boolean {
    if (isDisposed || gravityBody === 'orbit' || body.linvel().y > .1) return false;
    const position = body.translation();
    if (position.y <= GROUND_Y + .025 && Math.abs(body.linvel().y) < .15) return true;
    const hit = world.castRayAndGetNormal(
      new RAPIER.Ray(position, {x: 0, y: -1, z: 0}),
      GROUND_Y + .035,
      true,
      undefined,
      undefined,
      capsuleCollider,
      body,
    );
    return !!hit && hit.normal.y > .65 && Math.abs(body.linvel().y) < .15;
  }

  function requestJump(): void {
    if (isDisposed || isInputPaused || gravityBody === 'orbit'
      || (typeof document !== 'undefined' && document.hidden)) return;
    // An explicit jump takes over from an accessible walking route. It is consumed
    // on the next physics step, so air presses cannot queue a jump upon landing.
    walkingPath = [];
    jumpRequested = true;
  }

  const keyDown = (event: KeyboardEvent) => {
    if (isDisposed || isInputPaused) return;
    if ((event.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if(gravityBody==='orbit'){
 if(event.code==='KeyL'&&!event.repeat){const p=body.translation();if(climbing||Math.hypot(p.x-CABIN.ladderX,p.z-CABIN.ladderZ)<1.2){climbing=!climbing;drift={x:0,y:0,z:0};}return;}
 if(['Space','ShiftLeft','ShiftRight','ControlLeft','ControlRight'].includes(event.code)){event.preventDefault();pressed.add(event.code);return;}}
    if (event.code === 'Space') {
      if((event.target as HTMLElement|null)?.closest?.('button,summary,a'))return;
      event.preventDefault();
      if (!event.repeat) requestJump();
      return;
    }
    if (MOVEMENT_KEY_CODES.has(event.code)) {
      walkingPath=[];
      pressed.add(event.code);
    }
  };

  const keyUp = (event: KeyboardEvent) => {
    if (isDisposed) return;
    pressed.delete(event.code);
  };

  const clearKeys = () => {
    pressed.clear();
    walkingPath=[];
    jumpRequested=false;
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
    getMotionState(): PlayerMotion {
      return {grounded: grounded(), verticalSpeed: isDisposed ? 0 : body.linvel().y, body: gravityBody};
    },
    requestJump,
    setHabitatAccess(access) { habitatAccess = access; },
    setGravityBody(next) {
      if (isDisposed || !(next in GRAVITY_BY_BODY)) return;
      gravityBody = next;drift={x:0,y:0,z:0};climbing=false;
      stationColliders.forEach(c=>c.setEnabled(next!=='orbit'));
      world.gravity = { x: 0, y: -GRAVITY_BY_BODY[next], z: 0 };
      earthLaunchVehicleCollider.setEnabled(next === 'earth');
      earthLaunchPadColliders.forEach(collider => collider.setEnabled(next === 'earth'));
      marsOnlyColliders.forEach(collider=>collider.setEnabled(next === 'mars'));
      if(next === 'mars')for(const [id,collider] of doors)collider.setEnabled(!doorStates.get(id));
      jumpRequested = false;
    },
    getGravityInfo() { return describeGravity(gravityBody); },
    setDoorOpen(station,open) { if(isDisposed||doorStates.get(station)===open)return;doorStates.set(station,open);doors.get(station)?.setEnabled(!open && (gravityBody==='mars'||station==='habitat')); },
    walkPath(points) { if(isDisposed||isInputPaused)return;pressed.clear();walkingPath=points.filter(point=>[point.x,point.y,point.z].every(Number.isFinite)).map(point=>({...point})); },
    setCameraYaw(yaw) { cameraYaw = Number.isFinite(yaw) ? yaw : 0; },
    step(seconds: number) {
      if (isDisposed || !Number.isFinite(seconds) || seconds <= 0) return;
      const dt = Math.max(0.001, Math.min(seconds, 0.1));
      if(gravityBody==='orbit'&&outsidePose){const p=body.translation();
 if(walkingPath.length&&!isInputPaused){const t=walkingPath[0],d=Math.hypot(t.x-p.x,t.y-p.y,t.z-p.z);if(d<.1){walkingPath.shift();drift={x:0,y:0,z:0};}else drift={x:(t.x-p.x)/d,y:(t.y-p.y)/d,z:(t.z-p.z)/d};}
 const next=isInputPaused?{pose:{...p},velocity:{x:0,y:0,z:0}}:stepCabin(p,drift,pressed,cameraYaw,dt,climbing);drift=next.velocity;body.setTranslation(next.pose,true);body.setLinvel({x:0,y:0,z:0},true);return;}
      const input = computeMovementVelocity(pressed, ASTRONAUT_SPEED);
      let movement = rotateMovement(input.vx, input.vz, cameraYaw);
      if(walkingPath.length&&!isInputPaused) {
        const pose=body.translation(),target=walkingPath[0],dx=target.x-pose.x,dz=target.z-pose.z,distance=Math.hypot(dx,dz);
        if(distance<.08) {walkingPath.shift();movement={vx:0,vz:0};}
        else {const speed=Math.min(ASTRONAUT_SPEED,distance/dt);movement={vx:dx/distance*speed,vz:dz/distance*speed};}
      }
      const { vx, vz } = isInputPaused ? { vx: 0, vz: 0 } : movement;
      const curLinvel = body.linvel();
      let vy = curLinvel.y;
      const onGround = grounded();
      if (jumpRequested && onGround && !isInputPaused && !walkingPath.length && GRAVITY_BY_BODY[gravityBody] > 0) vy = JUMP_SPEED;
      jumpRequested = false;
      body.setLinvel({ x: vx, y: vy, z: vz }, true);

      const previousPose = {...body.translation()};
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

      if (gravityBody === 'mars' && !outsidePose && habitatAccess) {
        const safe=constrainHabitatMotion(previousPose,{x:clampedX,y:clampedY,z:clampedZ},habitatAccess);
        clampedX=safe.x;clampedZ=safe.z;
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
      walkingPath=[];
      outsidePose = undefined;drift={x:0,y:0,z:0};climbing=false;
      if (isDisposed) return;
      clearKeys();
      const target = pose ? { x: pose.x, y: pose.y, z: pose.z } : { ...DEFAULT_SPAWN };
      body.setTranslation(target, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    },
    pauseInput() {
      walkingPath=[];
      jumpRequested = false;
      if (isDisposed) return;
      isInputPaused = true;drift={x:0,y:0,z:0};
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
      outsidePose = undefined;drift={x:0,y:0,z:0};climbing=false;
      clearKeys();
    },
    resumeInput() {
      if (isDisposed) return;
      if (!isInputPaused) return;
      isInputPaused = false;
      clearKeys();
    },
    dispose() {
      walkingPath=[];
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
