import * as THREE from 'three';
import type { AvatarActivity } from '../../contracts/exploration';
import type { ModelKit } from './resources';
import { avatarJointName } from './avatar-action';

/** Small authored field tools; all geometry/materials belong to the caller's ModelKit. */
export function createAvatarTools(kit: ModelKit) {
  const group = new THREE.Group(); group.name = 'astronaut-field-tools';
  const shovel = new THREE.Group(); shovel.name = 'sampling-scoop'; group.add(shovel);
  kit.cylinder(shovel, kit.materials.trim, [.018, .55, .018], [0, .22, 0]);
  kit.box(shovel, kit.materials.orange, [.07, .12, .05], [0, .05, 0]);
  const blade = kit.flatBox(shovel, kit.materials.ivory, [.14, .19, .04], [0, .53, .02]);
  blade.rotation.x = -.25;
  kit.flatBox(shovel, kit.materials.soil, [.09, .07, .02], [0, .53, .052]);
  const vial = new THREE.Group(); vial.name = 'sample-vial'; group.add(vial);
  kit.cylinder(vial, kit.materials.ivory, [.045, .13, .045], [0, 0, 0]);
  kit.cylinder(vial, kit.materials.orange, [.05, .035, .05], [0, .08, 0]);
  kit.box(vial, kit.materials.soil, [.065, .055, .07], [0, -.025, .02]);
  const scanner = new THREE.Group(); scanner.name = 'sample-scanner'; group.add(scanner);
  kit.box(scanner, kit.materials.trim, [.13, .19, .055], [0, 0, 0]);
  kit.box(scanner, kit.materials.glass, [.095, .11, .01], [0, .015, .035]);
  kit.box(scanner, kit.materials.green, [.045, .018, .012], [0, -.06, .035]);

  let cachedAvatar: THREE.Object3D | undefined;
  let rightHand: THREE.Object3D | undefined, leftHand: THREE.Object3D | undefined;
  let phase = 0;
  let previousAction = 'none';
  const position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
  const inverse = new THREE.Matrix4(), local = new THREE.Matrix4();

  function discover(avatar: THREE.Object3D) {
    if (cachedAvatar === avatar && (rightHand || leftHand)) return;
    cachedAvatar = avatar;
    avatar.traverse(node => {
      const name = avatarJointName(node.name);
      if (name === 'RightHand') rightHand = node;
      if (name === 'LeftHand') leftHand = node;
    });
  }
  function follow(avatar: THREE.Object3D, object: THREE.Object3D, bone: THREE.Object3D | undefined, left: boolean) {
    if (!bone) {
      object.position.set(left ? -.18 : .22, -.17, .28);
      object.quaternion.identity();
      return;
    }
    inverse.copy(avatar.matrixWorld).invert();
    local.multiplyMatrices(inverse, bone.matrixWorld).decompose(position, quaternion, scale);
    object.position.copy(position);
    object.quaternion.copy(quaternion);
    // Tool geometry stays in world metres, irrespective of the source rig's scale.
    object.scale.setScalar(1);
  }

  return {
    group,
    update(avatar: THREE.Object3D, activity: AvatarActivity, seconds: number, active: boolean, reduced: boolean) {
      const action = activity.action;
      if (action !== previousAction) { phase = 0; previousAction = action; }
      if (active && !reduced && Number.isFinite(seconds)) phase += THREE.MathUtils.clamp(seconds, 0, .1);
      group.visible = action !== 'none';
      shovel.visible = action === 'dig';
      scanner.visible = action === 'research';
      vial.visible = action !== 'none';
      if (!group.visible) return;
      discover(avatar);
      avatar.updateWorldMatrix(true, true);
      follow(avatar, shovel, rightHand, false);
      follow(avatar, scanner, rightHand, false);
      follow(avatar, vial, leftHand, true);
      // Restrained, joint-following inspection tilt; reduced motion has a stable pose.
      const tilt = reduced ? 0 : Math.sin(phase * 1.65) * .035;
      scanner.rotateZ(tilt);
      vial.rotateZ(-tilt);
    },
    reset() { phase = 0; previousAction = 'none'; group.visible = false; },
  };
}
