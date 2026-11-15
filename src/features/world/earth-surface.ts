import * as THREE from 'three';
import type { WorldResources } from './resources';
/** Locally authored grain texture and broad coastal grass/sand variation. */
export function createEarthSurface(resources:WorldResources,span:number){
 const side=128,data=new Uint8Array(side*side*4);
 let seed=7193;for(let i=0;i<side*side;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=210+(seed/4294967296-.5)*18;data.set([v,v,v,255],i*4);}
 const texture=resources.texture(new THREE.DataTexture(data,side,side));texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(span/3,span/3);texture.magFilter=THREE.LinearFilter;texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.anisotropy=4;texture.needsUpdate=true;
 const geometry=resources.geometry(new THREE.PlaneGeometry(span,span,96,96));geometry.rotateX(-Math.PI/2);
 const colors=new Float32Array(geometry.attributes.position.count*3),sand=new THREE.Color('#b5a17b'),grass=new THREE.Color('#6a7950'),dry=new THREE.Color('#8e8b5d'),c=new THREE.Color();
 for(let i=0;i<geometry.attributes.position.count;i++){
  const x=geometry.attributes.position.getX(i),z=geometry.attributes.position.getZ(i);
  const patches=Math.sin(x*.083+Math.sin(z*.04)*2)*Math.cos(z*.065)+Math.sin(x*.23+z*.11)*.25;
  const coast=THREE.MathUtils.smoothstep(-z,32+patches*7,68);
  c.copy(grass).lerp(dry,THREE.MathUtils.clamp(patches*.3+.4,0,1)).lerp(sand,coast*.8);
  c.multiplyScalar(.94+Math.sin(x*.41-z*.27)*.02);c.toArray(colors,i*3);
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const material=resources.material(new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.045,vertexColors:true,roughness:1}));
 const ground=new THREE.Mesh(geometry,material);ground.name='coastal-grass-and-sand';ground.receiveShadow=true;
 return ground;
}
export function launchGroundOpacity(altitude:number):number{return 1-THREE.MathUtils.smoothstep(Math.max(0,altitude),600,1800);}
