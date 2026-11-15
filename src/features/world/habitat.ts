import * as THREE from 'three';
import { HABITAT as H, type HabitatAccess } from '../../contracts/habitat';
import type { ModelKit, WorldResources } from './resources';
/** A transparent concept habitat. Ribs, pressure shell and a two-door equipment lock. */
export function createHabitatDome(kit: ModelKit, resources: WorldResources) {
 const group=new THREE.Group();group.name='pressurized-habitat';
 const shellMaterial=resources.material(new THREE.MeshPhysicalMaterial({color:'#9bdcdb',transparent:true,opacity:.09,roughness:.3,metalness:.1,side:THREE.DoubleSide,depthWrite:false}));
 const shell=new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(H.radius,48,20,0,Math.PI*2,0,Math.PI/2)),shellMaterial);
 shell.position.z=H.centerZ;group.add(shell);
 const deck=resources.material(new THREE.MeshStandardMaterial({color:'#667478',roughness:.85}));
 const deckMesh=new THREE.Mesh(resources.geometry(new THREE.CylinderGeometry(H.radius,H.radius,.06,96)),deck);deckMesh.position.set(0,-.027,H.centerZ);group.add(deckMesh);
 const seam=resources.material(new THREE.MeshBasicMaterial({color:'#98a9a5',transparent:true,opacity:.35,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
 for(const radius of [5,9.5,13.4]){const ring=new THREE.Mesh(resources.geometry(new THREE.RingGeometry(radius-.012,radius+.012,96)),seam);ring.rotation.x=-Math.PI/2;ring.position.set(0,.007,H.centerZ);group.add(ring);}
 const occluders:THREE.Object3D[]=[];
 const rib=resources.material(new THREE.MeshStandardMaterial({color:'#91b5b6',metalness:.6,roughness:.5}));
 for(let i=0;i<8;i++){
  const points=Array.from({length:33},(_,j)=>{const a=j/32*Math.PI/2,r=Math.sin(a)*H.radius;return new THREE.Vector3(Math.cos(i*Math.PI/4)*r,Math.cos(a)*H.radius,H.centerZ+Math.sin(i*Math.PI/4)*r);});
  group.add(new THREE.Mesh(resources.geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.055,5,false)),rib));
 }
 const ring=new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(H.radius,.14,8,96)),rib);ring.rotation.x=Math.PI/2;ring.position.set(0,.08,H.centerZ);group.add(ring);
 for(const x of [-1.05,1.05])occluders.push(kit.box(group,rib,[.15,2.6,4.3],[x,1.3,12.8]));
 occluders.push(kit.box(group,rib,[2.2,.15,4.3],[0,2.65,12.8]));
 const gate=(z:number)=>{const g=new THREE.Group();g.position.z=z;kit.box(g,kit.materials.ivory,[1.85,2.5,.14],[0,1.25,0]);kit.box(g,kit.materials.glass,[1.3,.65,.16],[0,1.6,0]);kit.box(g,kit.materials.orange,[.08,2.4,.17],[.7,1.25,0]);group.add(g);return g;};
 const inner=gate(H.innerZ),outer=gate(H.outerZ);occluders.push(inner,outer);
 const rack=new THREE.Group();rack.name='EVA-suit-rack';rack.position.set(1.5,0,9);group.add(rack);
 kit.box(rack,kit.materials.trim,[1.3,2.1,.4],[0,1,0]);
 const suitFallback=new THREE.Group();rack.add(suitFallback);
 kit.sphere(suitFallback,kit.materials.ivory,[.28,.28,.26],[0,1.65,.3]);kit.sphere(suitFallback,kit.materials.dark,[.22,.16,.1],[0,1.65,.5]);
 kit.box(suitFallback,kit.materials.ivory,[.5,.65,.22],[0,1.04,.3]);
 for(const x of [-.16,.16])kit.box(suitFallback,kit.materials.ivory,[.19,.48,.23],[x,.48,.3]);
 for(const [text,x,y,z] of [['EVA SUITS',1.5,2.4,9],['AIRLOCK',0,3,11.2]] as const){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const c=canvas.getContext('2d');
  if(c){c.fillStyle='#15303c';c.fillRect(0,0,256,64);c.fillStyle='#ffdf9b';c.font='bold 28px sans-serif';c.textAlign='center';c.fillText(text,128,42);}
  const texture=resources.texture(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Sprite(resources.material(new THREE.SpriteMaterial({map:texture,depthTest:true})));sign.scale.set(1.1,.275,1);sign.position.set(x,y,z);group.add(sign);
 }
 const suitMount=new THREE.Group();suitMount.position.set(0,0,.35);rack.add(suitMount);
 return {group,occluders,suitMount,suitFallback,update(access:HabitatAccess){inner.position.x=access.phase==='inside'?-1.9:0;outer.position.x=access.phase==='outside'&&access.suited?-1.9:0;rack.visible=!access.suited;}};
}
