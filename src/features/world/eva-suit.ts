import * as THREE from 'three';
import type { ModelKit } from './resources';

/** Bone-following EVA equipment; the imported Mixamo rig remains untouched. */
export function createEvaEquipment(kit: ModelKit) {
  const { resources } = kit;
  const helmet = new THREE.Group(), pack = new THREE.Group();
  helmet.name = 'EVA-helmet'; pack.name = 'EVA-life-support';
  const shell = resources.material(new THREE.MeshPhysicalMaterial({
    color: '#e8ebe7', roughness: .4, metalness: .12, clearcoat: .5,
  }));
  const seal = resources.material(new THREE.MeshStandardMaterial({
    color: '#263947', roughness: .6, metalness: .3,
  }));
  const helmetMesh = new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(1, 40, 28)), shell);
  helmetMesh.scale.set(.215, .238, .225); helmet.add(helmetMesh);

  // An authored reflected horizon gives the curved visor depth without remote textures.
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4;
    const horizon = Math.exp(-(((y - 30) / 3) ** 2));
    const glint = Math.exp(-(((x - 13) / 3) ** 2)) * Math.exp(-(((y - 16) / 10) ** 2));
    pixels[i] = 50 + y * 1.1 + horizon * 75 + glint * 130;
    pixels[i + 1] = 64 + y * .45 + horizon * 62 + glint * 125;
    pixels[i + 2] = 80 - y * .3 + horizon * 45 + glint * 110;
    pixels[i + 3] = 255;
  }
  const reflection = resources.texture(new THREE.DataTexture(pixels, 64, 64));
  reflection.colorSpace = THREE.SRGBColorSpace; reflection.needsUpdate = true;
  const glass = resources.material(new THREE.MeshPhysicalMaterial({
    map: reflection, color: '#e5bc7f', metalness: .28, roughness: .17,
    clearcoat: 1, clearcoatRoughness: .06,
  }));
  const visorGeometry = resources.geometry(new THREE.SphereGeometry(
    1, 40, 24, Math.PI * .04, Math.PI * .92, Math.PI * .29, Math.PI * .43,
  ));
  const rim = new THREE.Mesh(visorGeometry, seal);
  rim.scale.set(.223, .246, .234); helmet.add(rim);
  const visor = new THREE.Mesh(visorGeometry, glass);
  visor.name = 'curved-EVA-visor';
  visor.scale.set(.225, .238, .238); visor.position.z = .003; helmet.add(visor);
  const collar = new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(.135, .025, 10, 40)), seal);
  collar.rotation.x = Math.PI / 2; collar.position.y = -.205; helmet.add(collar);
  for (const x of [-.218, .218]) {
    const hinge = new THREE.Mesh(resources.geometry(new THREE.CylinderGeometry(.044, .044, .025, 20)), shell);
    hinge.rotation.z = Math.PI / 2; hinge.position.set(x, 0, 0); helmet.add(hinge);
  }
  kit.box(helmet, shell, [.13, .04, .065], [0, -.17, .17]);
  kit.box(pack, shell, [.32, .41, .18], [0, -.03, -.16]);
  kit.box(pack, seal, [.23, .26, .02], [0, -.03, -.26]);
  for (let y = -.12; y < .09; y += .045) {
    kit.flatBox(pack, kit.materials.ivory, [.18, .012, .025], [0, y, -.278]);
  }
  kit.box(pack, kit.materials.orange, [.14, .065, .025], [0, .11, -.26]);
  const head = new THREE.Vector3(), back = new THREE.Vector3();
  const rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  return { helmet, pack, update(avatar: THREE.Object3D, suited: boolean) {
    helmet.visible = pack.visible = suited;
    if (!suited) return;
    avatar.updateWorldMatrix(true, true);
    let headBone: THREE.Object3D | undefined, spine: THREE.Object3D | undefined;
    avatar.traverse(node => {
      if (/(?:^|:|mixamorig\d*)Head$/.test(node.name)) headBone = node;
      if (/(?:^|:|mixamorig\d*)Spine2$/.test(node.name)) spine = node;
    });
    for (const [part, bone, fallback] of [
      [helmet, headBone, new THREE.Vector3(0, .45, 0)],
      [pack, spine, new THREE.Vector3(0, -.05, 0)],
    ] as const) {
      if (bone) {
        bone.matrixWorld.decompose(part === helmet ? head : back, rotation, scale);
        part.position.copy(avatar.worldToLocal((part === helmet ? head : back).clone()));
        if (part === helmet) part.position.y += .07;
        const inverseAvatar = avatar.getWorldQuaternion(new THREE.Quaternion()).invert();
        part.quaternion.copy(inverseAvatar.multiply(rotation));
      } else {
        part.position.copy(fallback); part.quaternion.identity();
      }
    }
  } };
}
