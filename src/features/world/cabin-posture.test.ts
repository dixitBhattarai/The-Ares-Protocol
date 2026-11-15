import * as THREE from 'three';
import {expect,it} from 'vitest';
import {createCabinPosture} from './cabin-posture';
it('bends both knees forward in character axes despite mirrored imported bone parents, without accumulating',()=>{
 const model=new THREE.Group();model.rotation.y=.4;
 const legs=[];
 for(const side of ['Left','Right']){
  const parent=new THREE.Group();parent.rotation.z=side==='Left'?.35:-.35;model.add(parent);
  const upper=new THREE.Bone();upper.name='mixamorig1'+side+'UpLeg';parent.add(upper);
  const lower=new THREE.Bone();lower.name='mixamorig1'+side+'Leg';lower.position.set(0,-.4,0);upper.add(lower);
  legs.push({parent,upper,lower});
 }
 model.updateWorldMatrix(true,true);const layer=createCabinPosture(model);
 layer.apply('seated');
 legs.forEach(({lower})=>{const knee=model.worldToLocal(lower.getWorldPosition(new THREE.Vector3()));expect(knee.z).toBeGreaterThan(.3);});
 const first=legs.map(({upper})=>upper.quaternion.clone());
 for(let i=0;i<100;i++){layer.restore();layer.apply('seated');}
 legs.forEach(({upper},i)=>expect(upper.quaternion.angleTo(first[i])).toBeLessThan(.00001));
 layer.restore();legs.forEach(({upper,lower})=>{expect(upper.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(.00001);expect(lower.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(.00001);});
});
