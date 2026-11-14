import * as THREE from 'three';

/** Tracks ownership at creation time, including assets not yet attached to a scene. */
export class WorldResources {
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly textures = new Set<THREE.Texture>();
  private disposed = false;

  geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.add(geometry);
    return geometry;
  }

  material<T extends THREE.Material>(material: T): T {
    this.materials.add(material);
    return material;
  }

  texture<T extends THREE.Texture>(texture: T): T {
    this.textures.add(texture);
    return texture;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.textures.forEach(texture => texture.dispose());
    this.materials.forEach(material => material.dispose());
    this.geometries.forEach(geometry => geometry.dispose());
    this.textures.clear();
    this.materials.clear();
    this.geometries.clear();
  }
}

export function createModelKit(resources: WorldResources) {
  const box = resources.geometry(new THREE.BoxGeometry(1, 1, 1));
  const sphere = resources.geometry(new THREE.SphereGeometry(1, 12, 8));
  const cylinder = resources.geometry(new THREE.CylinderGeometry(1, 1, 1, 12));
  const palette = {
    ivory: '#e7e3cf', trim: '#384958', dark: '#162a37', orange: '#f3a64b',
    blue: '#355e88', glass: '#9de8d4', green: '#82bc76', soil: '#573b37',
  };
  const materials = Object.fromEntries(Object.entries(palette).map(([key, color]) => [
    key, resources.material(new THREE.MeshStandardMaterial({ color, roughness: .8 })),
  ])) as Record<keyof typeof palette, THREE.MeshStandardMaterial>;

  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
    size: readonly number[], position: readonly number[]): THREE.Mesh {
    const item = new THREE.Mesh(geometry, material);
    item.scale.set(size[0], size[1], size[2]);
    item.position.set(position[0], position[1], position[2]);
    parent.add(item);
    return item;
  }
  return {
    materials,
    box: (parent: THREE.Object3D, material: THREE.Material, size: readonly number[], position: readonly number[]) => mesh(parent, box, material, size, position),
    sphere: (parent: THREE.Object3D, material: THREE.Material, size: readonly number[], position: readonly number[]) => mesh(parent, sphere, material, size, position),
    cylinder: (parent: THREE.Object3D, material: THREE.Material, size: readonly number[], position: readonly number[]) => mesh(parent, cylinder, material, size, position),
  };
}

export type ModelKit = ReturnType<typeof createModelKit>;
