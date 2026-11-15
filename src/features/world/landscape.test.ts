import * as THREE from 'three';
import { expect, it } from 'vitest';
import { createSurfaceDetails } from './landscape';
import { MARS_WALKABLE_HALF_SIZE } from '../../contracts/exploration';
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

it('keeps boulders and rock formations outside the walkable arena, where nothing is solid', async () => {
  const { createTerrain } = await import('./models');
  const { createModelKit } = await import('./resources');
  const resources=new WorldResources();
  const terrain=createTerrain(createModelKit(resources),resources);
  const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
  let boulders=0;
  terrain.traverse(object=>{
    // Unnamed instanced meshes are the scattered boulders; named ones are flat surface decals.
    if(!(object instanceof THREE.InstancedMesh)||object.name)return;
    for(let i=0;i<object.count;i++){
      object.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);
      expect(Math.max(Math.abs(point.x),Math.abs(point.z))).toBeGreaterThanOrEqual(MARS_WALKABLE_HALF_SIZE);boulders++;
    }
  });
  expect(boulders).toBe(150);
  const formations=terrain.getObjectByName('alien-rock-formations')!;
  expect(formations.children.length).toBeGreaterThan(0);
  for(const formation of formations.children){
    const box=new THREE.Box3().setFromObject(formation);
    const outside=box.min.x>=MARS_WALKABLE_HALF_SIZE||box.max.x<=-MARS_WALKABLE_HALF_SIZE||box.min.z>=MARS_WALKABLE_HALF_SIZE||box.max.z<=-MARS_WALKABLE_HALF_SIZE;
    expect(outside).toBe(true);
  }
  terrain.traverse(object=>{if(object instanceof THREE.InstancedMesh)object.dispose();});
  resources.dispose();
});

it('keeps the whole square walkable area aligned with its flat physics floor', async () => {
  const { createTerrain } = await import('./models');
  const { createModelKit } = await import('./resources');
  const resources=new WorldResources();
  const terrain=createTerrain(createModelKit(resources),resources);
  const surface=terrain.getObjectByName('sculpted-martian-terrain') as THREE.Mesh;
  const positions=surface.geometry.attributes.position;
  for(let i=0;i<positions.count;i++)if(Math.abs(positions.getX(i))<=MARS_WALKABLE_HALF_SIZE&&Math.abs(positions.getZ(i))<=MARS_WALKABLE_HALF_SIZE)expect(positions.getY(i)).toBe(0);
  terrain.traverse(object=>{if(object instanceof THREE.InstancedMesh)object.dispose();});
  resources.dispose();
});
