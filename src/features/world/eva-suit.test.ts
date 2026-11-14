import * as THREE from 'three';
import { it,expect } from 'vitest';
import { createEvaEquipment } from './eva-suit';
import { WorldResources,createModelKit } from './resources';
it('keeps EVA equipment attached to animated bones across equip, walk and stow',()=>{
 const resources=new WorldResources(),avatar=new THREE.Group(),head=new THREE.Bone(),spine=new THREE.Bone();head.name='mixamorig1:Head';spine.name='mixamorig1:Spine2';head.position.set(0,.5,0);avatar.add(head,spine);avatar.position.set(5,.8,3);
 const eva=createEvaEquipment(createModelKit(resources));avatar.add(eva.helmet,eva.pack);eva.update(avatar,true);expect(eva.helmet.position.y).toBeCloseTo(.5);
 head.position.x=.1;head.rotation.z=.2;eva.update(avatar,true);expect(eva.helmet.position.x).toBeCloseTo(.1);expect(eva.helmet.rotation.z).toBeCloseTo(.2);expect(avatar.position.x).toBe(5);
 eva.update(avatar,false);expect(eva.helmet.visible).toBe(false);expect(eva.pack.visible).toBe(false);resources.dispose();
});
