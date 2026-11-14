import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import type { WorldResources } from './resources';

export function glowTexture(resources:WorldResources) {
  const side=64,data=new Uint8Array(side*side*4);
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){
    const r=Math.hypot((x+.5)/side*2-1,(y+.5)/side*2-1),i=(y*side+x)*4;
    data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.max(0,Math.round((1-r)**3*180));
  }
  const texture=resources.texture(new THREE.DataTexture(data,side,side));texture.needsUpdate=true;return texture;
}

/** Shader sky and a small seeded dust field, not screen-space post-processing. */
export function createMarsAtmosphere(scene:THREE.Scene,resources:WorldResources) {
  scene.fog=new THREE.FogExp2('#bd8b78',.012);
  const sky=new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(140,32,16)),resources.material(new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{zenith:{value:new THREE.Color('#625b76')},horizon:{value:new THREE.Color('#e6b991')},nadir:{value:new THREE.Color('#aa6b58')}},
    vertexShader:'varying vec3 direction; void main(){direction=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform vec3 zenith,horizon,nadir;varying vec3 direction;void main(){
      vec3 c=mix(horizon,zenith,smoothstep(-0.03,0.35,direction.y));
      c=mix(c,nadir,smoothstep(0.0,0.6,-direction.y));gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  })));sky.name='mars-gradient-sky';scene.add(sky);
  const halo=new THREE.Sprite(resources.material(new THREE.SpriteMaterial({map:glowTexture(resources),color:'#ffd2a6',transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending,fog:false})));
  halo.position.set(-32,13,-65);halo.scale.set(32,32,1);scene.add(halo);
  const sun=new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(1.4,16,12)),resources.material(new THREE.MeshBasicMaterial({color:'#fff4c9',fog:false,toneMapped:false})));
  sun.name='mars-sun';sun.position.copy(halo.position);scene.add(sun);
  const points:number[]=[];
  for(let i=0;i<240;i++){
    const x=Math.sin(i*67.1)*25,z=Math.cos(i*41.7)*25;
    if(STATIONS.some(s=>Math.abs(x-s.position.x)<4&&Math.abs(z-s.position.z)<4))continue;
    points.push(x,.12+(i%17)/17*1.5,z);
  }
  const dust=new THREE.Points(resources.geometry(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3))),resources.material(new THREE.PointsMaterial({map:glowTexture(resources),color:'#ffe2be',size:.13,transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending})));
  dust.name='low-ground-dust';scene.add(dust);
  let phase=0;
  return {update(seconds:number,active:boolean,reduced:boolean){if(active&&!reduced){phase+=Math.min(.05,Math.max(0,seconds));dust.position.x=Math.sin(phase*.13)*.3;dust.position.z=Math.sin(phase*.08)*.2;}},dispose(){scene.remove(sky,halo,sun,dust);}};
}
