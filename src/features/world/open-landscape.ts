import * as THREE from 'three';
import {DISCOVERY_SITES} from '../../contracts/open-world';
import type {ModelKit,WorldResources} from './resources';
export function createOpenLandscape(kit:ModelKit,resources:WorldResources){
 const group=new THREE.Group();group.name='open-mars-discovery-trails';
 const trail=resources.material(new THREE.MeshStandardMaterial({color:'#b28d6d',roughness:1}));
 const rock=resources.material(new THREE.MeshStandardMaterial({color:'#56483d',roughness:1}));
 const metal=kit.materials.trim;
 const route=[[0,16],[0,24],[-38,24],[-33,-36],[37,-32],[36,30],[0,24]];
 for(let i=1;i<route.length;i++){
  const [ax,az]=route[i-1],[bx,bz]=route[i],length=Math.hypot(bx-ax,bz-az),angle=Math.atan2(bx-ax,bz-az);
  const path=kit.flatBox(group,trail,[1.7,.008,length],[(ax+bx)/2,.009,(az+bz)/2]);path.rotation.y=angle;
  for(let t=4;t<length;t+=8){const x=ax+(bx-ax)*t/length+Math.cos(angle)*1.2,z=az+(bz-az)*t/length-Math.sin(angle)*1.2;kit.cylinder(group,metal,[.025,.55,.025],[x,.275,z]);kit.box(group,kit.materials.orange,[.16,.08,.045],[x,.55,z]);}
 }
 for(const site of DISCOVERY_SITES){
  const zone=new THREE.Group();zone.name='discovery-'+site.id;zone.position.set(site.x,0,site.z);group.add(zone);
  const accent=resources.material(new THREE.MeshStandardMaterial({color:site.color,emissive:site.color,emissiveIntensity:.25,roughness:.65}));
  const marker=new THREE.Mesh(resources.geometry(new THREE.RingGeometry(.8,.84,32)),accent);marker.rotation.x=-Math.PI/2;marker.position.y=.025;zone.add(marker);
  kit.cylinder(zone,metal,[.04,1.7,.04],[-1.5,.85,0]);kit.box(zone,accent,[.45,.25,.06],[-1.5,1.65,0]);
  const prop=new THREE.Group();prop.name='landmark-'+site.id;prop.position.x=4;zone.add(prop);
  if(site.kind==='ridge'){
   const geo=resources.geometry(new THREE.DodecahedronGeometry(1,0));
   for(let i=0;i<5;i++){const b=new THREE.Mesh(geo,rock);b.scale.set(.7+i%2*.4,1.2+i%3*.6,.8);b.position.set((i%3-1)*1.1,b.scale.y*.7,Math.floor(i/3)*1.1-.5);b.rotation.y=i;b.castShadow=true;prop.add(b);}
   for(let i=0;i<4;i++)kit.flatBox(prop,kit.materials.orange,[3.2,.04,.03],[0,.5+i*.45,1.1]);
  }else if(site.kind==='rover'){
   kit.box(prop,kit.materials.ivory,[2.4,.65,1.4],[0,1,0]);kit.box(prop,metal,[1.4,.09,2.8],[0,1.4,0]);
   for(const x of [-.85,0,.85])for(const z of [-.9,.9]){const wheel=kit.cylinder(prop,metal,[.4,.3,.4],[x,.4,z]);wheel.rotation.x=Math.PI/2;}
   kit.cylinder(prop,metal,[.04,1.1,.04],[.7,1.8,0]);kit.box(prop,accent,[.5,.24,.18],[.7,2.4,0]);
  }else if(site.kind==='relay'){
   for(const x of [-.9,.9])kit.cylinder(prop,metal,[.05,2.7,.05],[x,1.35,0]);
   const dish=kit.sphere(prop,kit.materials.ivory,[1.4,1.4,.3],[0,3,0]);dish.rotation.x=-.4;kit.cylinder(prop,metal,[.04,1,.04],[0,3,.6]);
   kit.box(prop,metal,[1.2,.8,1.2],[0,.4,0]);
  }else{
   for(const x of [-.8,.8])kit.cylinder(prop,metal,[.05,1.6,.05],[x,.8,0]);
   const barrel=kit.cylinder(prop,kit.materials.ivory,[.33,2.4,.33],[0,2.1,0]);barrel.rotation.x=.8;
   const lens=kit.cylinder(prop,accent,[.3,.05,.3],[0,2.94,-.86]);lens.rotation.x=.8;
   kit.box(prop,metal,[1.3,.25,1.3],[0,.15,0]);
  }
  if(typeof document!=='undefined'){
   const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');if(ctx){ctx.fillStyle='#132831';ctx.fillRect(0,0,512,96);ctx.fillStyle=site.color;ctx.font='bold 31px system-ui';ctx.textAlign='center';ctx.fillText(site.name.toUpperCase(),256,59);}
   const texture=resources.texture(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;
   const sign=new THREE.Sprite(resources.material(new THREE.SpriteMaterial({map:texture})));sign.position.set(0,2.5,0);sign.scale.set(3.6,.675,1);zone.add(sign);
  }
 }
 return group;
}
