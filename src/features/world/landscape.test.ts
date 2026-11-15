import * as THREE from 'three';
import { expect, it } from 'vitest';
import { createSurfaceDetails } from './landscape';
import { WorldResources } from './resources';

it('keeps every decorative crater flat and clear of the central module paths', () => {
  const resources = new WorldResources();
  const details = createSurfaceDetails(resources);
  const marks = details.getObjectByName('flat-crater-marks') as THREE.InstancedMesh;
  const matrix = new THREE.Matrix4();
  marks.geometry.computeBoundingBox();
  for (let i = 0; i < marks.count; i++) {
    marks.getMatrixAt(i, matrix);
    const bounds = marks.geometry.boundingBox!.clone().applyMatrix4(matrix);
    expect(bounds.min.y).toBeGreaterThan(0);
    expect(bounds.max.y).toBeLessThan(.015);
    expect(bounds.distanceToPoint(new THREE.Vector3())).toBeGreaterThan(8);
  }
  marks.dispose();
  resources.dispose();
});

it('keeps the whole square walkable area aligned with its flat physics floor', async () => {
  const { createTerrain } = await import('./models');
  const { createModelKit } = await import('./resources');
  const resources=new WorldResources();
  const terrain=createTerrain(createModelKit(resources),resources);
  const surface=terrain.getObjectByName('sculpted-martian-terrain') as THREE.Mesh;
  const positions=surface.geometry.attributes.position;
  for(let i=0;i<positions.count;i++)if(Math.abs(positions.getX(i))<=18&&Math.abs(positions.getZ(i))<=18)expect(positions.getY(i)).toBe(0);
  terrain.traverse(object=>{if(object instanceof THREE.InstancedMesh)object.dispose();});
  resources.dispose();
});
