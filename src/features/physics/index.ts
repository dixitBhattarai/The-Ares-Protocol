import RAPIER from '@dimforge/rapier3d-compat';
import { STATIONS } from '../../contracts';
import type { PhysicsAdapter } from '../../contracts';

export async function createPhysics(): Promise<PhysicsAdapter> {
  await RAPIER.init();
  // Starter controller uses zero vertical acceleration; Anshu owns Mars gravity,
  // ground detection and the final character controller, with a cited source.
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(20, .1, 20).setTranslation(0, -.1, 0));
  for (const station of STATIONS) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(1.5, 1, 1.5).setTranslation(station.position.x, station.position.y, station.position.z));
  }
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, .8, 5).lockRotations());
  world.createCollider(RAPIER.ColliderDesc.capsule(.5, .3), body);
  const pressed = new Set<string>();
  const keyDown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement | null)?.closest('button, input, textarea, select, [contenteditable]')) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    pressed.add(event.code);
  };
  const keyUp = (event: KeyboardEvent) => { pressed.delete(event.code); };
  const clear = () => pressed.clear();
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', clear);
  return {
    step(seconds) {
      const x = Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft'));
      const z = Number(pressed.has('KeyS') || pressed.has('ArrowDown')) - Number(pressed.has('KeyW') || pressed.has('ArrowUp'));
      const scale = 3 / (Math.hypot(x, z) || 1);
      body.setLinvel({ x: x * scale, y: 0, z: z * scale }, true);
      world.timestep = seconds;
      world.step();
      const pose = body.translation();
      body.setTranslation({ x: Math.max(-18, Math.min(18, pose.x)), y: .8, z: Math.max(-18, Math.min(18, pose.z)) }, true);
    },
    getPlayerPose() { const pose = body.translation(); return { x: pose.x, y: pose.y, z: pose.z }; },
    dispose() {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clear);
      world.free();
    },
  };
}
