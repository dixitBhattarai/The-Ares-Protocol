import * as THREE from 'three';
import type { RoverState, StormPreparation } from '../../contracts/expedition';
import { ROVER_DOCK, STORM_CONTROLS, REMOTE_SAMPLE } from '../../contracts/expedition';
import type { ModelKit, WorldResources } from './resources';
import { createExpeditionSite } from './expedition-site';
export function createFieldExpedition(kit:ModelKit,resources:WorldResources){
 const group=new THREE.Group();group.name='field-expedition';const car=new THREE.Group();car.name='driveable-ares-rover';group.add(car);
 const ivory=kit.materials.ivory,trim=kit.materials.trim,orange=kit.materials.orange;
 kit.box(car,trim,[1.55,.22,2.45],[0,.42,0]);kit.box(car,ivory,[1.3,.45,1.5],[0,.73,-.2]);
 kit.box(car,kit.materials.blue,[.65,.12,.6],[0,1,-.15]);kit.box(car,trim,[.72,.65,.14],[0,1.25,-.45]);
 for(const x of [-.7,.7]){kit.cylinder(car,trim,[.045,1.35,.045],[x,1.2,-.8]);kit.cylinder(car,trim,[.045,1.35,.045],[x,1.2,.75]);kit.box(car,ivory,[.11,.12,1.8],[x,1.9,0]);}
 kit.box(car,ivory,[1.65,.1,1.9],[0,1.94,-.05]);
 const wheels:THREE.Group[]=[];const tire=resources.material(new THREE.MeshStandardMaterial({color:'#273137',roughness:.9}));
 for(const x of [-.93,.93])for(const z of [-.85,0,.85]){
  const wheel=new THREE.Group();wheel.position.set(x,.3,z);car.add(wheel);wheels.push(wheel);
  const t=kit.cylinder(wheel,tire,[.31,.2,.31],[0,0,0]);t.rotation.z=Math.PI/2;
  const hub=kit.cylinder(wheel,ivory,[.17,.22,.17],[0,0,0]);hub.rotation.z=Math.PI/2;
 }
 for(const x of [-.5,.5])kit.box(car,resources.material(new THREE.MeshBasicMaterial({color:'#e9faff'})),[.2,.12,.08],[x,.72,1.06]);
 kit.box(car,orange,[.7,.12,.08],[0,.8,-1]);const cargo=kit.box(car,orange,[.7,.3,.65],[0,1.1,-.94]);cargo.visible=false;
 const dock=new THREE.Group();dock.position.set(ROVER_DOCK.x,0,ROVER_DOCK.z);group.add(dock);
 kit.flatBox(dock,trim,[3.7,.018,4.3],[0,.013,0]);for(const x of [-1.75,1.75])kit.flatBox(dock,orange,[.05,.02,4],[x,.03,0]);
 const remote=createExpeditionSite(kit,resources);remote.group.position.set(REMOTE_SAMPLE.x,0,REMOTE_SAMPLE.z);group.add(remote.group);
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const c=canvas.getContext('2d');if(c){c.fillStyle='#15313c';c.fillRect(0,0,256,64);c.fillStyle='#ffe2a4';c.font='bold 24px sans-serif';c.textAlign='center';c.fillText('SAMPLE SITE',128,41);}
  const texture=resources.texture(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Sprite(resources.material(new THREE.SpriteMaterial({map:texture,depthTest:true})));sign.scale.set(3.2,.8,1);sign.position.set(REMOTE_SAMPLE.x,2.3,REMOTE_SAMPLE.z);group.add(sign);
 }
 const controls=STORM_CONTROLS.map(item=>{const g=new THREE.Group();g.position.set(item.x,0,item.z-.45);group.add(g);kit.box(g,trim,[.4,.6,.13],[0,1,0]);kit.cylinder(g,trim,[.035,.72,.035],[0,.36,0]);const indicator=resources.material(new THREE.MeshStandardMaterial({color:'#f5bd6b',emissive:'#bf792d',emissiveIntensity:.4}));kit.box(g,indicator,[.27,.32,.03],[0,1.03,.09]);return {id:item.id,indicator};});
 const crates=new THREE.Group();crates.position.set(-9,0,4);group.add(crates);kit.box(crates,trim,[1.4,.6,.55],[0,.32,0]);const strap=kit.box(crates,orange,[.12,.63,.57],[0,.33,0]);strap.visible=false;
 car.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
 let last=new THREE.Vector3(ROVER_DOCK.x,0,ROVER_DOCK.z),angle=0;
 return {group,remote,
  update(rover:RoverState,carrying:boolean,prep?:StormPreparation){
   const distance=Math.hypot(rover.pose.x-last.x,rover.pose.z-last.z);if(distance<2)angle+=distance/.31;
   car.position.set(rover.pose.x,rover.pose.y-.8,rover.pose.z);car.rotation.y=rover.heading;wheels.forEach(w=>w.rotation.x=angle);cargo.visible=carrying;
   last.set(rover.pose.x,0,rover.pose.z);strap.visible=!!(prep?.secured||prep?.dusty);
   controls.forEach(c=>{c.indicator.color.set(prep?.[c.id]?'#94e1ae':'#f5bd6b');c.indicator.emissive.set(prep?.[c.id]?'#3d945c':'#bf792d');});
  },
 };
}
