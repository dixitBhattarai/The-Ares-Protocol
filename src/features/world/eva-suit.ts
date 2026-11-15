import * as THREE from 'three';
import type { ModelKit } from './resources';
export function createEvaEquipment(kit:ModelKit) {
 const helmet=new THREE.Group(),pack=new THREE.Group();helmet.name='EVA-helmet';pack.name='EVA-life-support';
 kit.sphere(helmet,kit.materials.ivory,[.205,.22,.205],[0,0,0]);
 kit.sphere(helmet,kit.materials.dark,[.175,.135,.12],[0,.01,.13]);
 kit.box(pack,kit.materials.ivory,[.4,.5,.23],[0,0,-.16]);kit.box(pack,kit.materials.orange,[.22,.12,.025],[0,.05,-.29]);
 const head=new THREE.Vector3(),back=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
 return {helmet,pack,update(avatar:THREE.Object3D,suited:boolean){
  helmet.visible=pack.visible=suited;if(!suited)return;
  avatar.updateWorldMatrix(true,true);
  let headBone:THREE.Object3D|undefined,spine:THREE.Object3D|undefined;
  avatar.traverse(node=>{if(/(?:^|:|mixamorig\d*)Head$/.test(node.name))headBone=node;if(/(?:^|:|mixamorig\d*)Spine2$/.test(node.name))spine=node;});
  for(const [part,bone,fallback] of [[helmet,headBone,new THREE.Vector3(0,.45,0)],[pack,spine,new THREE.Vector3(0,-.05,0)]] as const){
   if(bone){bone.matrixWorld.decompose(part===helmet?head:back,rotation,scale);part.position.copy(avatar.worldToLocal((part===helmet?head:back).clone()));if(part===helmet)part.position.y+=.07;const q=avatar.getWorldQuaternion(new THREE.Quaternion()).invert();part.quaternion.copy(q.multiply(rotation));}
   else {part.position.copy(fallback);part.quaternion.identity();}
  }
 }};
}
