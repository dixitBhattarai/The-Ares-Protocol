import * as THREE from 'three';
import type { WorldResources } from './resources';

/** Small authored automatic rig for the bundled, unrigged NASA suit. Not motion capture. */
export function rigSuit(source: THREE.Object3D, resources: WorldResources, height: number) {
  source.updateMatrixWorld(true);
  const root = new THREE.Bone(); root.name = 'suit-root';
  const limb = (name: string, x: number, y: number) => {
    const bone = new THREE.Bone(); bone.name = name; bone.position.set(x * height, y * height, 0); root.add(bone); return bone;
  };
  const legs = [limb('suit-left-leg', -.1, .46), limb('suit-right-leg', .1, .46)];
  const arms = [limb('suit-left-arm', -.19, .78), limb('suit-right-arm', .19, .78)];
  const skeleton = resources.skeleton(new THREE.Skeleton([root, ...legs, ...arms]));
  const group = new THREE.Group(); group.name = 'nasa-astronaut'; group.add(root);
  source.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = resources.geometry(object.geometry.clone().applyMatrix4(object.matrixWorld));
    const position = geometry.getAttribute('position');
    const indices = new Uint16Array(position.count * 4);
    const weights = new Float32Array(position.count * 4);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i) / height, y = position.getY(i) / height;
      const arm = THREE.MathUtils.smoothstep(Math.abs(x), .16, .28) * THREE.MathUtils.smoothstep(y, .5, .62) * (1 - THREE.MathUtils.smoothstep(y, .87, .95));
      const leg = (1 - THREE.MathUtils.smoothstep(y, .4, .51)) * THREE.MathUtils.smoothstep(Math.abs(x), .01, .06);
      const weight = Math.max(arm, leg);
      indices[i * 4] = arm > leg ? (x < 0 ? 3 : 4) : (x < 0 ? 1 : 2);
      indices[i * 4 + 1] = 0;
      weights[i * 4] = weight; weights[i * 4 + 1] = 1 - weight;
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, object.material);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    group.add(mesh);
    group.updateMatrixWorld(true); mesh.bind(skeleton);
  });
  const animate = (cycle: number, moving: boolean) => {
    const swing = moving && Number.isFinite(cycle) ? Math.sin(cycle) : 0;
    legs.forEach((bone, i) => { bone.rotation.x = (i ? -1 : 1) * swing * .18; });
    arms.forEach((bone, i) => { bone.rotation.z = i ? -.8 : .8; bone.rotation.x = (i ? 1 : -1) * swing * .12; });
  };
  animate(0, false);
  return { group, animate, legs, arms };
}
