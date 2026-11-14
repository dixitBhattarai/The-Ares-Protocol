import {it,expect} from 'vitest';
import * as THREE from 'three';
import {createLocomotion} from './locomotion';
it('poses the loaded skeleton for cabin seating, freezes on pause and returns to walking',()=>{
 const model=new THREE.Group(),leg=new THREE.Bone();leg.name='mixamorig1:LeftUpLeg';model.add(leg);
 const clips=['Idle','Walk'].map(name=>new THREE.AnimationClip(name,1,[new THREE.QuaternionKeyframeTrack('mixamorig1:LeftUpLeg.quaternion',[0,1],[0,0,0,1,0,0,0,1])]));
 const c=createLocomotion(model,clips);c.setPosture('seated');c.update(.1,true,false);expect(leg.rotation.x).toBeCloseTo(-1.15);const q=leg.quaternion.clone();c.update(2,false,false);expect(leg.quaternion.equals(q)).toBe(true);c.setPosture('ground');c.setMoving(true);for(let i=0;i<5;i++)c.update(.1,true,false);expect(leg.rotation.x).toBeCloseTo(0);expect(c.actions.get('Walk')!.getEffectiveWeight()).toBeCloseTo(1);c.dispose();
});
