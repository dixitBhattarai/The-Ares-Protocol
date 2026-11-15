import * as THREE from 'three';
import {SURVEY_SITES,type SurveyState} from '../../contracts/survey';
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
 const markers=SURVEY_SITES.map(site=>{const marker=new THREE.Group();marker.position.set(site.x,0,site.z);group.add(marker);kit.cylinder(marker,trim,[.035,1.4,.035],[.9,.7,.4]);const material=resources.material(new THREE.MeshStandardMaterial({color:'#e5ba7b',emissive:'#b58045',emissiveIntensity:.4}));kit.box(marker,material,[.23,.22,.12],[.9,1.47,.4]);if(site.id!=='rim'){kit.flatBox(marker,trim,[1.1,.02,.8],[0,.025,0]);for(let i=0;i<8;i++){const pebble=kit.cylinder(marker,kit.materials.orange,[.04+(i%3)*.01,.04,.035],[-.4+(i%4)*.24,.06,-.22+Math.floor(i/4)*.38]);pebble.rotation.z=i*.3;}}const scan=kit.cylinder(marker,resources.material(new THREE.MeshBasicMaterial({color:'#8fe7e8',transparent:true,opacity:.14,depthWrite:false})),[1.35,.025,1.35],[0,.06,0]);scan.visible=false;return {id:site.id,material,scan};});
 // A shallow, irregular practice crater keeps its entire approach walkable.
 const vertices:number[]=[],colors:number[]=[],indices:number[]=[];const rings=[0,5.9,7.3,9.5],heights=[.006,.012,.025,.006],segments=48;
 for(let r=0;r<rings.length;r++)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,wobble=1+Math.sin(a*5)*.045+Math.cos(a*9)*.025;vertices.push(Math.cos(a)*rings[r]!*wobble,heights[r]!+Math.abs(Math.sin(a*3))*.003,Math.sin(a)*rings[r]!*wobble);const color=new THREE.Color(r<2?'#845b47':r===2?'#ae7958':'#a67152');color.multiplyScalar(.92+Math.sin(a*7+r)*.045);colors.push(color.r,color.g,color.b);}
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<segments;i++){const a=r*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const craterGeometry=new THREE.BufferGeometry();craterGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));craterGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));craterGeometry.setIndex(indices);craterGeometry.computeVertexNormals();
 const crater=new THREE.Mesh(resources.geometry(craterGeometry),resources.material(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1})));crater.position.set(36,0,38);crater.receiveShadow=true;group.add(crater);
 const cassettes=[-.22,.22].map(x=>kit.box(car,ivory,[.32,.18,.45],[x,1.33,-.94]));cassettes.forEach(c=>c.visible=false);
 const dock=new THREE.Group();dock.position.set(ROVER_DOCK.x,0,ROVER_DOCK.z);group.add(dock);
 kit.flatBox(dock,trim,[3.7,.018,4.3],[0,.013,0]);for(const x of [-1.75,1.75])kit.flatBox(dock,orange,[.05,.02,4],[x,.03,0]);
 const remote=createExpeditionSite(kit,resources);remote.group.position.set(REMOTE_SAMPLE.x,0,REMOTE_SAMPLE.z);group.add(remote.group);
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const c=canvas.getContext('2d');if(c){c.fillStyle='#15313c';c.fillRect(0,0,256,64);c.fillStyle='#ffe2a4';c.font='bold 24px sans-serif';c.textAlign='center';c.fillText('SAMPLE SITE',128,41);}
  const texture=resources.texture(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Sprite(resources.material(new THREE.SpriteMaterial({map:texture,depthTest:true})));sign.scale.set(1.8,.45,1);sign.position.set(REMOTE_SAMPLE.x+1.3,1.9,REMOTE_SAMPLE.z+.4);group.add(sign);
 }
 const controls=STORM_CONTROLS.map(item=>{const g=new THREE.Group();g.position.set(item.x,0,item.z-.45);group.add(g);kit.box(g,trim,[.4,.6,.13],[0,1,0]);kit.cylinder(g,trim,[.035,.72,.035],[0,.36,0]);const indicator=resources.material(new THREE.MeshStandardMaterial({color:'#f5bd6b',emissive:'#bf792d',emissiveIntensity:.4}));kit.box(g,indicator,[.27,.32,.03],[0,1.03,.09]);return {id:item.id,indicator};});
 const crates=new THREE.Group();crates.position.set(-9,0,4);group.add(crates);kit.box(crates,trim,[1.4,.6,.55],[0,.32,0]);const strap=kit.box(crates,orange,[.12,.63,.57],[0,.33,0]);strap.visible=false;
 car.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
 let last=new THREE.Vector3(ROVER_DOCK.x,0,ROVER_DOCK.z),angle=0;
 return {group,remote,
  updateSurvey(survey?:SurveyState){cassettes.forEach((c,i)=>c.visible=i<(survey?.cargo.length??0));markers.forEach(m=>{const done=survey?.scanned.includes(m.id);m.material.color.set(done?'#9ee9cd':'#e5ba7b');m.material.emissive.set(done?'#408e78':'#b58045');m.scan.visible=survey?.scanning?.id===m.id;m.scan.scale.setScalar(.4+(survey?.scanning?.elapsed??0)/3*.6);});},
  update(rover:RoverState,carrying:boolean,prep?:StormPreparation){
   const distance=Math.hypot(rover.pose.x-last.x,rover.pose.z-last.z);if(distance<2)angle+=distance/.31;
   car.position.set(rover.pose.x,rover.pose.y-.8,rover.pose.z);car.rotation.y=rover.heading;wheels.forEach(w=>w.rotation.x=angle);cargo.visible=carrying;
   last.set(rover.pose.x,0,rover.pose.z);strap.visible=!!(prep?.secured||prep?.dusty);
   controls.forEach(c=>{c.indicator.color.set(prep?.[c.id]?'#94e1ae':'#f5bd6b');c.indicator.emissive.set(prep?.[c.id]?'#3d945c':'#bf792d');});
  },
 };
}
