import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import type { WorldResources } from './resources';

export const NASA_ASSETS = {
  astronaut: new URL('./assets/astronaut.glb', import.meta.url).href,
  satellite: new URL('./assets/eo1.glb', import.meta.url).href,
  rover: new URL('./assets/opportunity.glb', import.meta.url).href,
};

export function createNasaLoader(resources: WorldResources) {
  let alive = true;
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => url.endsWith('draco_wasm_wrapper.js')
    ? new URL('./assets/draco/draco_wasm_wrapper.js', import.meta.url).href
    : url.endsWith('draco_decoder.wasm') ? new URL('./assets/draco/draco_decoder.wasm', import.meta.url).href : url);
  const draco = new DRACOLoader(manager).setDecoderPath({
    js: new URL('./assets/draco/draco_wasm_wrapper.js', import.meta.url).href,
    wasm: new URL('./assets/draco/draco_decoder.wasm', import.meta.url).href,
  }).setWorkerLimit(1);
  const loader = new GLTFLoader(manager).setDRACOLoader(draco);
  return {
    async attach(parent: THREE.Object3D, key: keyof typeof NASA_ASSETS, height: number, fallback?: THREE.Object3D, extent = false) {
      try {
        const { scene } = await loader.loadAsync(NASA_ASSETS[key]);
        scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (alive) resources.geometry(object.geometry); else object.geometry.dispose();
          for (const material of materials) {
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) { if (alive) resources.texture(value); else value.dispose(); }
            if (alive) resources.material(material); else material.dispose();
          }
          object.castShadow = true; object.receiveShadow = true;
        });
        if (!alive) { draco.dispose(); return; }
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const scale = height / Math.max(.001, extent ? Math.max(size.x, size.y, size.z) : size.y);
        scene.scale.multiplyScalar(scale);
        const fitted = new THREE.Box3().setFromObject(scene);
        const center = fitted.getCenter(new THREE.Vector3());
        scene.position.sub(new THREE.Vector3(center.x, fitted.min.y, center.z));
        scene.name = `nasa-${key}`;
        parent.add(scene);
        if (fallback) fallback.visible = false;
        parent.userData.assetLoaded = key;
      } catch { if (alive) parent.userData.assetFailed = key; else draco.dispose(); }
    },
    texture(url: string, material: THREE.MeshStandardMaterial) {
      new THREE.TextureLoader().load(url, texture => {
        if (!alive) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace; resources.texture(texture); material.map = texture; material.needsUpdate = true;
      }, undefined, () => { /* Solid-color planet remains available offline or on asset failure. */ });
    },
    dispose() { alive = false; draco.dispose(); },
  };
}
