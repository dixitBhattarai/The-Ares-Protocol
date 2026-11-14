import * as THREE from 'three';
import { WorldResources } from './resources';

/** Authored procedural dust, not a satellite image or elevation dataset. */
export function createDustTexture(resources: WorldResources): THREE.DataTexture {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 703;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = (seed >>> 24) / 255;
    const ripple = Math.sin(x * .19 + Math.sin(y * .08) * 2) * 3;
    const i = (y * size + x) * 4;
    pixels[i] = 172 + grain * 25 + ripple;
    pixels[i + 1] = 100 + grain * 17 + ripple;
    pixels[i + 2] = 72 + grain * 12 + ripple;
    pixels[i + 3] = 255;
  }
  const texture = resources.texture(new THREE.DataTexture(pixels, size, size));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Flat weathering marks have no obstacle geometry inside the playable floor. */
export function createSurfaceDetails(resources: WorldResources): THREE.Group {
  const group = new THREE.Group();
  group.name = 'surface-details';
  const ring = resources.geometry(new THREE.RingGeometry(.87, 1, 24));
  const pigment = resources.material(new THREE.MeshBasicMaterial({
    color: '#593e35', transparent: true, opacity: .07, depthWrite: false,
  }));
  const marks = new THREE.InstancedMesh(ring, pigment, 18);
  marks.name = 'flat-crater-marks';
  const transform = new THREE.Object3D();
  for (let i = 0; i < marks.count; i++) {
    const angle = i * 2.399963;
    const radius = 11 + (i * 7 % 8);
    const size = .25 + (i * 11 % 9) * .13;
    transform.position.set(Math.cos(angle) * radius, .011, Math.sin(angle) * radius);
    transform.rotation.set(-Math.PI / 2, 0, i);
    transform.scale.set(size * 1.35, size, 1);
    transform.updateMatrix();
    marks.setMatrixAt(i, transform.matrix);
  }
  group.add(marks);
  return group;
}
