import * as THREE from 'three';
import type { AvatarActivity, PlayerMotion } from '../../contracts/exploration';

export type AvatarActionMode = 'idle' | 'takeoff' | 'fall' | 'land' | 'dig' | 'research';
type JointName = 'Hips' | 'Spine' | 'Spine1' | 'Spine2' | 'Neck' | 'Head'
  | 'LeftUpLeg' | 'RightUpLeg' | 'LeftLeg' | 'RightLeg'
  | 'LeftArm' | 'RightArm' | 'LeftForeArm' | 'RightForeArm' | 'LeftHand' | 'RightHand';
interface Joint { bone: THREE.Object3D; base: THREE.Quaternion; position: THREE.Vector3 }

/** GLTFLoader removes ':' from Mixamo names. Procedural and NASA fallbacks use aliases. */
export function avatarJointName(name: string): string {
  const aliases: Record<string, JointName> = {
    'left-leg': 'LeftUpLeg', 'right-leg': 'RightUpLeg',
    'left-arm': 'LeftArm', 'right-arm': 'RightArm',
    'suit-left-leg': 'LeftUpLeg', 'suit-right-leg': 'RightUpLeg',
    'suit-left-arm': 'LeftArm', 'suit-right-arm': 'RightArm',
  };
  return aliases[name] ?? name.replace(/^.*:/, '').replace(/^mixamorig\d*/, '');
}

/** Authored joint animation layered over the licensed Idle/Walk clips.
 * No pose here changes a physics root, grants science or schedules a frame.
 */
export function createAvatarActionLayer(model: THREE.Object3D) {
  const joints = new Map<string, Joint>();
  model.traverse(bone => {
    const name = avatarJointName(bone.name);
    if (/^(Hips|Spine[12]?|Neck|Head|(?:Left|Right)(?:UpLeg|Leg|Foot|Arm|ForeArm|Hand))$/.test(name)) {
      joints.set(name, { bone, base: bone.quaternion.clone(), position: bone.position.clone() });
    }
  });
  let motion: PlayerMotion = { grounded: true, verticalSpeed: 0, body: 'mars' };
  let activity: AvatarActivity = { action: 'none', progress: 0 };
  let clock = 0;
  let landing = 0;
  let airborneWeight = 0;
  let workWeight = 0;
  let applied = false;
  let mode: AvatarActionMode = 'idle';
  const rotation = new THREE.Quaternion();
  const offset = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const modelRotation = new THREE.Quaternion();
  const parentRotation = new THREE.Quaternion();
  const toParent = new THREE.Quaternion();
  const parentDelta = new THREE.Quaternion();
  const point = new THREE.Vector3();

  function restore() {
    if (!applied) return;
    joints.forEach(({ bone, base, position }) => {
      bone.quaternion.copy(base);
      bone.position.copy(position);
    });
    applied = false;
  }
  function rotate(name: JointName, x = 0, y = 0, z = 0, amount = 1) {
    const joint = joints.get(name);
    if (!joint || amount <= 0) return;
    // Mixamo's bind axes differ between left/right limbs. Author in model axes,
    // then convert the delta into each bone parent's current coordinate frame.
    model.getWorldQuaternion(modelRotation);
    joint.bone.parent?.getWorldQuaternion(parentRotation);
    toParent.copy(parentRotation).invert().multiply(modelRotation);
    offset.setFromEuler(euler.set(x, y, z));
    parentDelta.copy(toParent).multiply(offset).multiply(toParent.clone().invert());
    rotation.copy(joint.bone.quaternion).premultiply(parentDelta);
    joint.bone.quaternion.slerp(rotation, amount);
  }
  function lowerHips(metres: number, amount: number) {
    const joint = joints.get('Hips');
    if (!joint?.bone.parent) return;
    // The bundled FBX-derived rig uses centimetres and a rotated Armature.
    // Translate in world metres, then convert back to its parent coordinates.
    joint.bone.getWorldPosition(point); point.y -= metres * amount;
    joint.bone.position.copy(joint.bone.parent.worldToLocal(point));
  }

  return {
    /** Restore the last mixer result before AnimationMixer evaluates the next frame. */
    beforeMixer: restore,
    setMotion(next: PlayerMotion) {
      if (!Number.isFinite(next.verticalSpeed) || !['earth', 'mars', 'orbit'].includes(next.body)) return;
      if (!motion.grounded && next.grounded && next.body !== 'orbit') landing = 1;
      if (motion.body !== next.body) { landing = 0; airborneWeight = 0; }
      motion = { ...next };
    },
    setActivity(next: AvatarActivity) {
      if (!['none', 'dig', 'research'].includes(next.action) || !Number.isFinite(next.progress)) return;
      if (next.action !== activity.action) { clock = 0; workWeight = 0; }
      activity = { action: next.action, progress: THREE.MathUtils.clamp(next.progress, 0, 1) };
    },
    update(seconds: number, active: boolean, reduced: boolean, enabled = true) {
      if (!active) return;
      const dt = Number.isFinite(seconds) ? THREE.MathUtils.clamp(seconds, 0, .1) : 0;
      if (!reduced) clock += dt;
      const airborne = !motion.grounded && motion.body !== 'orbit';
      const work = !airborne && motion.body !== 'orbit' && activity.action !== 'none';
      const smoothing = reduced ? 1 : 1 - Math.exp(-dt * 14);
      airborneWeight = THREE.MathUtils.lerp(airborneWeight, Number(airborne), smoothing);
      workWeight = THREE.MathUtils.lerp(workWeight, Number(work), smoothing);
      if (motion.grounded) landing = Math.max(0, landing - (reduced ? 1 : dt / .34));
      else landing = 0;
      mode = !enabled ? 'idle' : airborne ? (motion.verticalSpeed > .08 ? 'takeoff' : 'fall')
        : landing > 0 ? 'land' : work ? activity.action as 'dig' | 'research' : 'idle';
      if (!enabled) return;

      // Capture the freshly evaluated mixer pose. Offsets never accumulate across frames.
      joints.forEach(joint => {
        joint.base.copy(joint.bone.quaternion);
        joint.position.copy(joint.bone.position);
      });
      applied = true;
      const footHeight = () => {
        const feet = ['LeftFoot','RightFoot'].flatMap(name => {
          const joint = joints.get(name); return joint ? [joint.bone.getWorldPosition(point).y] : [];
        });
        return feet.length ? Math.min(...feet) : undefined;
      };
      const baselineFootHeight = footHeight();
      const plantFeet = () => {
        const current = footHeight();
        if (current !== undefined && baselineFootHeight !== undefined) lowerHips(THREE.MathUtils.clamp(current-baselineFootHeight,-.45,.45),1);
      };
      const jump = airborneWeight;
      if (jump > .001) {
        const rising = THREE.MathUtils.smoothstep(motion.verticalSpeed, -.3, .8);
        rotate('LeftUpLeg', -.12 - rising * .3, 0, -.04, jump);
        rotate('RightUpLeg', -.08 - rising * .18, 0, .04, jump);
        rotate('LeftLeg', .18 + rising * .42, 0, 0, jump);
        rotate('RightLeg', .18 + rising * .28, 0, 0, jump);
        rotate('LeftArm', -.18 - rising * .25, 0, -.12, jump);
        rotate('RightArm', -.18 - rising * .25, 0, .12, jump);
        rotate('LeftForeArm', -.25, 0, 0, jump);
        rotate('RightForeArm', -.25, 0, 0, jump);
      }
      if (landing > 0) {
        const compression = Math.sin(landing * Math.PI / 2);
        for (const side of ['Left', 'Right'] as const) {
          rotate(`${side}UpLeg`, -.38, 0, 0, compression);
          rotate(`${side}Leg`, .72, 0, 0, compression);
        }
        rotate('Spine', .14, 0, 0, compression);
        lowerHips(.065, compression);
        plantFeet();
      }
      if (workWeight <= .001) return;
      const time = reduced ? .38 : clock;
      if (activity.action === 'dig') {
        // Kneel, drive the scoop down, then lift it toward the sample vial.
        const scoop = .5 + .5 * Math.sin(time * Math.PI * 2 / 1.65);
        const twist = Math.sin(time * Math.PI * 2 / 1.65 - .6);
        rotate('LeftUpLeg', -.94, 0, -.07, workWeight);
        rotate('LeftLeg', 1.58, 0, 0, workWeight);
        rotate('RightUpLeg', -.52, 0, .06, workWeight);
        rotate('RightLeg', 1.05, 0, 0, workWeight);
        rotate('Spine', .24 + scoop * .16, twist * .1, 0, workWeight);
        rotate('Spine1', .12, 0, 0, workWeight);
        rotate('Neck', .15, -.1, 0, workWeight);
        rotate('RightArm', -.48 - scoop * .42, 0, .06, workWeight);
        rotate('RightForeArm', -.34 - (1 - scoop) * .72, 0, 0, workWeight);
        rotate('LeftArm', -.52, 0, -.13, workWeight);
        rotate('LeftForeArm', -.82, .1, 0, workWeight);
        lowerHips(.28, workWeight);
        plantFeet();
      } else if (activity.action === 'research') {
        const inspect = Math.sin(time * 1.65);
        rotate('Spine2', .12, inspect * .035, 0, workWeight);
        rotate('Neck', .18, -.1 + inspect * .05, 0, workWeight);
        rotate('LeftArm', -.6, 0, -.1, workWeight);
        rotate('LeftForeArm', -.95, -.15, 0, workWeight);
        rotate('RightArm', -.52 + inspect * .04, 0, .11, workWeight);
        rotate('RightForeArm', -1.08, .12, inspect * .04, workWeight);
        rotate('LeftHand', .06, 0, -.08, workWeight);
        rotate('RightHand', .08, 0, .08, workWeight);
      }
    },
    getState() { return { mode, clock, landing, airborneWeight, workWeight }; },
    reset() {
      restore();
      motion = { grounded: true, verticalSpeed: 0, body: 'mars' };
      activity = { action: 'none', progress: 0 };
      mode = 'idle'; clock = landing = airborneWeight = workWeight = 0;
    },
  };
}
