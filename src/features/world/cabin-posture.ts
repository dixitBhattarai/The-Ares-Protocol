import * as THREE from 'three';
import { avatarJointName } from './avatar-action';
/** Bone-parent axes differ in the imported rig. Author poses in the character's axes. */
export function createCabinPosture(model:THREE.Object3D){
 const joints=new Map<string,{bone:THREE.Object3D;base:THREE.Quaternion}>();
 model.traverse(bone=>{const name=avatarJointName(bone.name);if(/^(Spine|(?:Left|Right)(?:UpLeg|Leg|Arm|ForeArm|Foot))$/.test(name))joints.set(name,{bone,base:bone.quaternion.clone()});});
 let applied=false;
 function restore(){if(!applied)return;for(const {bone,base} of joints.values())bone.quaternion.copy(base);applied=false;}
 function rotate(name:string,x:number,z=0){
  const joint=joints.get(name);if(!joint?.bone.parent)return;
  const modelRotation=model.getWorldQuaternion(new THREE.Quaternion());
  const parentRotation=joint.bone.parent.getWorldQuaternion(new THREE.Quaternion());
  const toParent=parentRotation.invert().multiply(modelRotation);
  const delta=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,0,z));
  joint.bone.quaternion.premultiply(toParent.clone().multiply(delta).multiply(toParent.invert()));
 }
 return {restore,apply(posture:'ground'|'float'|'seated'){
  if(posture==='ground')return;
  for(const joint of joints.values())joint.base.copy(joint.bone.quaternion);applied=true;
  for(const side of ['Left','Right']){
   rotate(side+'UpLeg',posture==='seated'?-Math.PI/2:-.18);
   rotate(side+'Leg',posture==='seated'?Math.PI/2:.3);
   if(posture==='seated'){rotate(side+'Arm',-.15,side==='Left'?-.12:.12);rotate(side+'ForeArm',-.55);}
  }
 }};
}
