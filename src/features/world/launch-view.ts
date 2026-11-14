import * as THREE from 'three';
import type { LaunchFlightSnapshot } from '../../contracts';
import type { ModelKit, WorldResources } from './resources';
import type { createNasaLoader } from './nasa-assets';

/** Authored exterior launch view. Reuses credited Earth imagery; no extra render loop. */
export function createLaunchView(kit:ModelKit,resources:WorldResources,nasa:ReturnType<typeof createNasaLoader>){
 const scene=new THREE.Scene();scene.name='continuous-earth-launch';
 const camera=new THREE.PerspectiveCamera(52,1,.15,16000);
 const skyColor=new THREE.Color('#79bce3'),black=new THREE.Color('#030813');scene.background=skyColor;
 const ambient=new THREE.HemisphereLight('#e1efff','#334342',2.3);scene.add(ambient);
 const sun=new THREE.DirectionalLight('#fff1d6',3.5);sun.position.set(-300,500,250);scene.add(sun);
 const globeGeo=resources.geometry(new THREE.SphereGeometry(850,96,64));
 const earthMaterial=resources.material(new THREE.MeshStandardMaterial({color:'#c4d9e7',roughness:.95}));
 nasa.texture(new URL('../../assets/earth_atmos_2048.jpg',import.meta.url).href,earthMaterial);
 const earth=new THREE.Mesh(globeGeo,earthMaterial);earth.position.y=-850;earth.rotation.y=1.3;scene.add(earth);
 // Thin luminous atmospheric limb, evaluated from the camera direction.
 const atmosphereMaterial=resources.material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
  uniforms:{tint:{value:new THREE.Color('#63baff')}},
  vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
  fragmentShader:'varying vec3 n;varying vec3 v;uniform vec3 tint;void main(){float a=pow(max(0.,1.-abs(dot(normalize(n),normalize(v)))),3.);gl_FragColor=vec4(tint,a*.24);}'
 }));
 const atmosphere=new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(862,64,40)),atmosphereMaterial);atmosphere.position.copy(earth.position);scene.add(atmosphere);
 const land=resources.material(new THREE.MeshStandardMaterial({color:'#567c56',roughness:1}));
 const concrete=resources.material(new THREE.MeshStandardMaterial({color:'#899796',roughness:.9}));
 const pad=new THREE.Group();scene.add(pad);
 kit.flatBox(pad,land,[260,.3,260],[0,-.25,0]);
 kit.cylinder(pad,concrete,[10,.3,10],[0,.1,0]);
 kit.flatBox(pad,kit.materials.trim,[3,.08,110],[0,.35,56]);
 const tower=new THREE.Group();tower.position.set(-9,0,-3);pad.add(tower);
 for(const x of [-1.6,1.6])for(const z of [-1.6,1.6])kit.cylinder(tower,kit.materials.trim,[.18,19,.18],[x,9.5,z]);
 for(let y=2;y<20;y+=3){kit.flatBox(tower,concrete,[4,.2,4],[0,y,0]);for(const side of [-1,1]){const beam=kit.cylinder(tower,kit.materials.trim,[.1,4,.1],[side*1.6,y-1.4,0]);beam.rotation.x=.7;}}
 kit.flatBox(tower,kit.materials.ivory,[8,.4,1],[3,17,0]);
 for(let i=0;i<8;i++)kit.box(pad,concrete,[4+(i%2)*2,2,6],[-35+(i%4)*18,1,22+Math.floor(i/4)*28]);
 const hull=resources.material(new THREE.MeshStandardMaterial({color:'#eef0ea',metalness:.35,roughness:.4}));
 const metal=resources.material(new THREE.MeshStandardMaterial({color:'#8e9fa8',metalness:.8,roughness:.3}));
 const blackHull=resources.material(new THREE.MeshStandardMaterial({color:'#182833',metalness:.5,roughness:.45}));
 const rocket=new THREE.Group();rocket.name='launch-vehicle';scene.add(rocket);
 kit.cylinder(rocket,hull,[1.12,9,1.12],[0,0,0]);
 const nose=new THREE.Mesh(resources.geometry(new THREE.ConeGeometry(1.12,2.8,32)),hull);nose.position.y=5.85;rocket.add(nose);
 for(const y of [-3.9,-1.8,1.4,3.8])kit.cylinder(rocket,metal,[1.15,.14,1.15],[0,y,0]);
 kit.cylinder(rocket,blackHull,[1.14,1.15,1.14],[0,-2.7,0]);
 for(const x of [-.44,.44])kit.box(rocket,kit.materials.blue,[.54,1.1,.12],[x,3,1.06]);
 // Small mission marking made locally; no unlicensed logo.
 const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=128;
 const c=labelCanvas.getContext('2d');if(c){c.fillStyle='#eef0ea';c.fillRect(0,0,256,128);c.fillStyle='#193b50';c.font='bold 38px sans-serif';c.textAlign='center';c.fillText('ARES',128,60);c.font='20px sans-serif';c.fillText('01',128,95);}
 const labelTexture=resources.texture(new THREE.CanvasTexture(labelCanvas));labelTexture.colorSpace=THREE.SRGBColorSpace;
 const label=new THREE.Mesh(resources.geometry(new THREE.PlaneGeometry(1.4,.7)),resources.material(new THREE.MeshBasicMaterial({map:labelTexture})));label.position.set(0,.4,1.125);rocket.add(label);
 for(let i=0;i<4;i++){const fin=kit.flatBox(rocket,metal,[.12,2,2.3],[0,-3.4,0]);fin.rotation.y=i*Math.PI/2;fin.position.x=Math.sin(i*Math.PI/2)*1.3;fin.position.z=Math.cos(i*Math.PI/2)*1.3;}
 const flameMaterial=resources.material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 uniforms:{time:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'varying vec2 v;uniform float time;void main(){float noise=.85+.15*sin(v.y*65.-time*45.+sin(v.x*28.));float fade=smoothstep(0.,.55,v.y);vec3 color=mix(vec3(1.,.25,.045),vec3(.7,.88,1.),pow(v.y,3.));gl_FragColor=vec4(color,fade*noise*.68);}'
}));
 const coreMaterial=resources.material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'varying vec2 v;void main(){gl_FragColor=vec4(.72,.9,1.,smoothstep(0.,.6,v.y)*.85);}'
}));
 const plumes:THREE.Group[]=[];
 function engine(parent:THREE.Group,x:number,y:number){
  const bell=new THREE.Mesh(resources.geometry(new THREE.CylinderGeometry(.38,.72,.9,24,1,true)),blackHull);bell.position.set(x,y,0);parent.add(bell);
  const plume=new THREE.Group();plume.position.set(x,y-.45,0);parent.add(plume);
  const outer=new THREE.Mesh(resources.geometry(new THREE.ConeGeometry(1.2,10,24,1,true)),flameMaterial);outer.position.y=-5;plume.add(outer);
  const core=new THREE.Mesh(resources.geometry(new THREE.ConeGeometry(.48,6,20)),coreMaterial);core.position.y=-3;plume.add(core);plumes.push(plume);
 }
 engine(rocket,0,-4.9);
 const boosters=[-1,1].map(side=>{const b=new THREE.Group();b.position.set(side*2.05,-.9,0);rocket.add(b);kit.cylinder(b,hull,[.64,7,.64],[0,0,0]);kit.cylinder(b,metal,[.68,.3,.68],[0,-2.8,0]);const n=new THREE.Mesh(resources.geometry(new THREE.ConeGeometry(.64,1.6,24)),hull);n.position.y=4.3;b.add(n);engine(b,0,-3.9);return b;});
 const engineLight=new THREE.PointLight('#ffac6f',0,28,2);engineLight.position.y=-6;rocket.add(engineLight);
 const cloudCanvas=document.createElement('canvas');cloudCanvas.width=64;cloudCanvas.height=64;const ctx=cloudCanvas.getContext('2d');if(ctx){const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,.85)');g.addColorStop(.45,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);}
 const cloudTexture=resources.texture(new THREE.CanvasTexture(cloudCanvas));
 const cloudMaterial=resources.material(new THREE.SpriteMaterial({map:cloudTexture,color:'#eef5ff',transparent:true,opacity:.65,depthWrite:false}));
 const clouds=new THREE.Group();scene.add(clouds);
 for(let i=0;i<70;i++){const p=new THREE.Sprite(cloudMaterial);p.position.set(Math.sin(i*23.4)*180,30+(i%3)*24,Math.cos(i*17.7)*180);p.scale.set(45+(i%5)*9,12+(i%4)*5,1);clouds.add(p);}
 const smokeMaterial=resources.material(new THREE.SpriteMaterial({map:cloudTexture,color:'#d6d7d1',transparent:true,opacity:.65,depthWrite:false}));
 const smoke=Array.from({length:24},()=>{const p=new THREE.Sprite(smokeMaterial);scene.add(p);return p;});
 const starsGeometry=resources.geometry(new THREE.BufferGeometry());const points=[];
 for(let i=0;i<900;i++){const yaw=i*2.399963,up=Math.sin(i*13.71)*.95,r=Math.sqrt(1-up*up);points.push(Math.cos(yaw)*r*7000,up*7000,Math.sin(yaw)*r*7000);}
 starsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 const starMaterial=resources.material(new THREE.PointsMaterial({color:'#e4f0ff',size:4,transparent:true,opacity:0,depthWrite:false}));scene.add(new THREE.Points(starsGeometry,starMaterial));
 let clock=0;
 const target=new THREE.Vector3();const desired=new THREE.Vector3();
 return {scene,camera,
  update(s:Readonly<LaunchFlightSnapshot>,aspect:number,seconds:number,active:boolean,reduced:boolean){
   if(active&&!reduced)clock+=Math.min(.1,Math.max(0,seconds));
   // Preserve visible pad clearance early, then compress the much larger atmospheric climb.
   const altitude=20*Math.log1p(s.altitude/35)+s.altitude*.0045,space=THREE.MathUtils.smoothstep(s.altitude,12000,75000);
   skyColor.set('#79bce3').lerp(black,space);starMaterial.opacity=space*.9;
   ambient.intensity=2.3-space*1.4;
   rocket.position.set(s.downrange*.006,altitude+7,0);rocket.rotation.z=-s.pitch*Math.PI/180;
   const separation=THREE.MathUtils.clamp((s.altitude-45000)/20000,0,1);
   boosters.forEach((b,i)=>{b.position.set((i===0?-1:1)*(2.05+separation*18),-.9-separation*25,0);b.rotation.z=(i===0?1:-1)*separation*.45;b.visible=separation<1;});
   const thrust=s.ignited&&s.fuel>0&&!s.spaceReached?s.throttle:0;
   plumes.forEach((p,i)=>{p.visible=thrust>.02&&(i===0||separation===0);p.scale.set(.7+thrust*.5,(.35+thrust*.8)*(reduced?1:1+Math.sin(clock*43+i)*.055),.7+thrust*.5);});
   flameMaterial.uniforms.time.value=clock;engineLight.intensity=thrust*90;
   smoke.forEach((p,i)=>{p.visible=thrust>.3&&s.altitude<2400;const age=((clock*.7+i/24)%1);const radius=age*24+3;p.position.set(Math.sin(i*2.4)*radius,1+age*8,Math.cos(i*2.4)*radius);p.scale.setScalar(3+age*18);});
   // Clouds stay below the ascending camera rather than being swapped for a new slide.
   clouds.visible=s.altitude<60000;
   const lift=THREE.MathUtils.smoothstep(s.altitude,2000,95000);
   target.copy(rocket.position).add(new THREE.Vector3(0,1.3,0));
   const shake=!reduced&&active&&thrust>.4?(1-space)*.045:0;
   desired.copy(rocket.position).add(new THREE.Vector3(24,7+lift*33,43));
   camera.position.copy(desired);camera.position.x+=Math.sin(clock*37)*shake;camera.position.y+=Math.sin(clock*47)*shake;
   camera.aspect=Math.max(.1,aspect);camera.fov=aspect<.65?66:52;camera.lookAt(target);camera.updateProjectionMatrix();
  },
  dispose(){scene.clear();}
 };
}
