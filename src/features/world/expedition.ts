import * as THREE from 'three';
import { SPACECRAFT_SEAT } from '../../contracts';
import type { CabinSeatState, FlightStage, LandingFlightSnapshot, StationId, Vec3 } from '../../contracts';
import { createAstronaut, applyAstronautGait, updateAstronautAnimation } from './astronaut';
import type { ModelKit, WorldResources } from './resources';
import { addRocketFlightSeat, dressRoom, dressRocketCabin, furnishRoom } from './interiors';
import type { RocketSeatVisual } from './interiors';
import type { createNasaLoader } from './nasa-assets';
import { createSlidingDoor } from './doors';

export function createExpeditionViews(kit: ModelKit, resources: WorldResources, nasa: ReturnType<typeof createNasaLoader>) {
  const flight = new THREE.Scene();
  flight.background = new THREE.Color('#071421');
  flight.add(new THREE.HemisphereLight('#d5e8ff', '#253d59', 2));
  const sun = new THREE.DirectionalLight('#fff0ce', 4); sun.position.set(-5, 6, 9); flight.add(sun);
  const blue = resources.material(new THREE.MeshStandardMaterial({ color: '#247bb9', roughness: .8 }));
  const mars = resources.material(new THREE.MeshStandardMaterial({ color: '#bc694b', roughness: 1 }));
  const earthFallback=kit.sphere(flight, blue, [2, 2, 2], [-6, -1, 0]);
  nasa.texture(new URL('./assets/earth.jpg', import.meta.url).href, blue);
  nasa.texture(new URL('./assets/mars.jpg', import.meta.url).href, mars);
  const marsFallback=kit.sphere(flight, mars, [1.6, 1.6, 1.6], [6, -1, 0]);
  for(const [key,diameter,x,y,fallback] of [
    ['earthGlobe',4,-6,-3,earthFallback],['marsGlobe',3.2,6,-2.6,marsFallback],
    ['moon',.8,-3.5,-1.8,undefined],
  ] as const) {
    const planet=new THREE.Group();planet.position.set(x,y,0);flight.add(planet);
    void nasa.attach(planet,key,diameter,fallback,true);
  }
  const starMaterial = resources.material(new THREE.PointsMaterial({ color: '#c4deef', size: .055 }));
  const positions = Array.from({ length: 240 }, (_, i) => Math.sin(i * 37.13) * (i % 3 === 2 ? 3 : 15));
  const stars = resources.geometry(new THREE.BufferGeometry()); stars.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  flight.add(new THREE.Points(stars, starMaterial));
  const rocket = new THREE.Group();
  kit.cylinder(rocket, kit.materials.ivory, [.22, .95, .22], [0, 0, 0]);
  kit.sphere(rocket, kit.materials.orange, [.22, .3, .22], [0, .48, 0]);
  kit.box(rocket, kit.materials.blue, [.85, .16, .25], [0, -.3, 0]);
  kit.sphere(rocket, kit.materials.orange, [.12, .5, .12], [0, -.8, 0]);
  rocket.rotation.z = -Math.PI / 2; flight.add(rocket);
  const parachute = new THREE.Group(); parachute.visible = false; rocket.add(parachute);
  kit.sphere(parachute, kit.materials.orange, [1.25,.5,.9], [0,2.1,0]);
  for (const x of [-.8, 0, .8]) kit.cylinder(parachute, kit.materials.ivory, [.025,1.8,.025], [x,1.2,0]);

  // A fixed first-person flight view. Only the world beyond the windshield moves; the
  // cockpit itself is a still DOM frame owned by world/index.ts.
  const cockpitFlight = new THREE.Scene();
  const earthSky = new THREE.Color('#83cbe7');
  const spaceSky = new THREE.Color('#071421');
  const marsSky = new THREE.Color('#bd765e');
  const cockpitBackground = earthSky.clone();
  cockpitFlight.background = cockpitBackground;
  cockpitFlight.add(new THREE.HemisphereLight('#e8f7ff', '#554840', 2.1));
  const cockpitKeyLight = new THREE.DirectionalLight('#fff0ce', 3.2); cockpitKeyLight.position.set(-9, 14, 10); cockpitFlight.add(cockpitKeyLight);
  const cockpitCamera = new THREE.PerspectiveCamera(58, 1, .1, 6000);
  const cockpitHomeY = 1.65;
  cockpitCamera.position.set(0, cockpitHomeY, 10);
  cockpitCamera.lookAt(0, -1.5, -100);

  const earthGroundMaterial = resources.material(new THREE.MeshStandardMaterial({ color: '#aaa77f', roughness: 1 }));
  const earthHillMaterial = resources.material(new THREE.MeshStandardMaterial({ color: '#779b6d', roughness: 1 }));
  const launchHorizon = new THREE.Group(); cockpitFlight.add(launchHorizon);
  kit.flatBox(launchHorizon, earthGroundMaterial, [360, 2, 520], [0, -3.3, -225]);
  for (const [x, z, width, height, depth] of [[-88, -150, 75, 18, 44], [86, -205, 92, 26, 55], [0, -330, 150, 36, 72]]) {
    kit.sphere(launchHorizon, earthHillMaterial, [width, height, depth], [x, -2, z]);
  }
  const launchTower = new THREE.Group(); launchTower.position.set(8, -1, -38); launchHorizon.add(launchTower);
  for (const x of [-2, 2]) kit.cylinder(launchTower, kit.materials.trim, [.22, 18, .22], [x, 8, 0]);
  kit.flatBox(launchTower, kit.materials.trim, [4.8, .32, .5], [0, 15, 0]);
  kit.flatBox(launchTower, kit.materials.ivory, [1.1, 2.4, 1.2], [-2.2, 5.8, 0]);

  const earthWindowPlanet = kit.sphere(cockpitFlight, blue, [54, 54, 54], [0, -51, -124]);
  earthWindowPlanet.visible = false;
  const distantEarth = kit.sphere(cockpitFlight, blue, [7, 7, 7], [-36, -16, -132]);
  distantEarth.visible = false;
  const marsWindowPlanet = kit.sphere(cockpitFlight, mars, [20, 20, 20], [0, -12, -78]);
  marsWindowPlanet.visible = false;
  const moonSurface = resources.material(new THREE.MeshStandardMaterial({ color: '#c6c9ce', roughness: 1 }));
  const moonWindowPlanet = kit.sphere(cockpitFlight, moonSurface, [5, 5, 5], [55, 8, -150]);
  moonWindowPlanet.visible = false;
  const venusSurface = resources.material(new THREE.MeshStandardMaterial({ color: '#ddb982', roughness: .9 }));
  const venusWindowPlanet = kit.sphere(cockpitFlight, venusSurface, [6, 6, 6], [-76, 30, -245]);
  venusWindowPlanet.visible = false;
  const jupiterSurface = resources.material(new THREE.MeshStandardMaterial({ color: '#c99b71', roughness: .9 }));
  const jupiterWindowPlanet = kit.sphere(cockpitFlight, jupiterSurface, [12, 12, 12], [92, -2, -255]);
  jupiterWindowPlanet.visible = false;
  const cockpitSunMaterial = resources.material(new THREE.MeshBasicMaterial({ color: '#ffe2a4' }));
  const cockpitSun = kit.sphere(cockpitFlight, cockpitSunMaterial, [5, 5, 5], [-74, 55, -225]);
  cockpitSun.visible = false;
  const sunHaloCanvas = document.createElement('canvas'); sunHaloCanvas.width = 64; sunHaloCanvas.height = 64;
  const sunHaloContext = sunHaloCanvas.getContext('2d');
  if (sunHaloContext) {
    const glow = sunHaloContext.createRadialGradient(32, 32, 2, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255,226,164,.65)'); glow.addColorStop(.35, 'rgba(255,194,112,.22)'); glow.addColorStop(1, 'rgba(255,178,91,0)');
    sunHaloContext.fillStyle = glow; sunHaloContext.fillRect(0, 0, 64, 64);
  }
  const sunHaloTexture = resources.texture(new THREE.CanvasTexture(sunHaloCanvas));
  const cockpitSunHalo = new THREE.Sprite(resources.material(new THREE.SpriteMaterial({ map: sunHaloTexture, transparent: true, depthWrite: false })));
  cockpitSunHalo.scale.set(30, 30, 1); cockpitSunHalo.visible = false; cockpitFlight.add(cockpitSunHalo);
  const entryMaterial=resources.material(new THREE.MeshStandardMaterial({color:'#d6aa92',roughness:1,transparent:true}));
  nasa.texture(new URL('./assets/mars.jpg',import.meta.url).href,entryMaterial);
  const entryPlanet=new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(1,64,40)),entryMaterial);entryPlanet.visible=false;entryMaterial.fog=false;entryMaterial.depthWrite=false;cockpitFlight.add(entryPlanet);
  const entryLimbMaterial=resources.material(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
    uniforms:{alpha:{value:1}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 n;varying vec3 v;uniform float alpha;void main(){float a=pow(max(0.,1.-abs(dot(normalize(n),normalize(v)))),3.);gl_FragColor=vec4(1.,.43,.19,a*.28*alpha);}'
  }));
  const entryLimb=new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(1,64,40)),entryLimbMaterial);entryLimb.visible=false;cockpitFlight.add(entryLimb);

  const cockpitStarCount = 2200;
  const starPositions = new Float32Array(cockpitStarCount * 3);
  for (let i = 0; i < cockpitStarCount; i++) {
    starPositions[i * 3] = Math.sin(i * 37.13) * 220;
    starPositions[i * 3 + 1] = Math.sin(i * 11.71 + 1) * 115;
    starPositions[i * 3 + 2] = -35 - (i % 31) * 18;
  }
  const cockpitStarGeometry = resources.geometry(new THREE.BufferGeometry());
  cockpitStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const cockpitStarMaterial = resources.material(new THREE.PointsMaterial({ color: '#d6efff', size: .8, transparent: true, opacity: 0, sizeAttenuation: false }));
  const cockpitStars = new THREE.Points(cockpitStarGeometry, cockpitStarMaterial); cockpitFlight.add(cockpitStars);

  const marsGroundMaterial = resources.material(new THREE.MeshStandardMaterial({ color: '#9b5946', roughness: 1 }));
  const marsRockMaterial = resources.material(new THREE.MeshStandardMaterial({ color: '#67443a', roughness: 1 }));
  const marsLandingView = new THREE.Group(); cockpitFlight.add(marsLandingView); marsLandingView.visible = false;
  kit.flatBox(marsLandingView, marsGroundMaterial, [400, 3, 520], [0, -9, -220]);
  for (const [x, y, z, sx, sy, sz] of [
    [-30, -5, -65, 8, 5, 7], [27, -5, -78, 12, 7, 10], [-18, -6, -112, 16, 8, 12], [42, -5, -138, 19, 9, 16],
  ]) {
    kit.sphere(marsLandingView, marsRockMaterial, [sx, sy, sz], [x, y, z]);
  }
  const landingBeacon = new THREE.Group(); landingBeacon.position.set(0, -5, -48); marsLandingView.add(landingBeacon);
  kit.cylinder(landingBeacon, kit.materials.ivory, [.18, 5, .18], [0, 2.5, 0]);
  const beaconMaterial = resources.material(new THREE.MeshStandardMaterial({ color: '#ffe189', emissive: '#ed9a42', emissiveIntensity: 1.2 }));
  kit.sphere(landingBeacon, beaconMaterial, [.72, .72, .72], [0, 5.2, 0]);
  landingBeacon.position.x=6;
  const padMaterial=resources.material(new THREE.MeshStandardMaterial({color:'#26434b',roughness:.85}));
  kit.cylinder(marsLandingView,padMaterial,[4.2,.18,4.2],[0,-7.36,-38]);
  const padLight=resources.material(new THREE.MeshBasicMaterial({color:'#b7f4cf'}));
  const padRing=new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(4,.12,6,48)),padLight);padRing.rotation.x=Math.PI/2;padRing.position.set(0,-7.23,-38);marsLandingView.add(padRing);
  kit.flatBox(marsLandingView,padLight,[.18,.03,5],[0,-7.21,-38]);kit.flatBox(marsLandingView,padLight,[5,.03,.18],[0,-7.21,-38]);
  // The destination is the outpost itself, not an isolated marker in empty terrain.
  for(const [i,x,z,color] of [[0,-14,-70,'#f2cf91'],[1,15,-65,'#99d8ef'],[2,0,-94,'#a7e4b9']] as const){
    const base=new THREE.Group();base.position.set(x,-7.4,z);marsLandingView.add(base);
    kit.box(base,kit.materials.ivory,[8,3,6],[0,1.5,0]);kit.flatBox(base,kit.materials.trim,[8.4,.2,6.4],[0,3.1,0]);
    const light=resources.material(new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.6}));
    kit.flatBox(base,light,[1.8,1.8,.1],[0,1.05,3.05]);kit.flatBox(base,light,[5,.35,.1],[0,2.65,3.06]);
    if(i===1)for(const side of [-1,1])kit.flatBox(base,kit.materials.blue,[5,.12,4],[side*6,1.3,0]);
    if(i===2)kit.sphere(base,kit.materials.glass,[3.8,1,2.8],[0,3.1,0]);
  }
  const dustCanvas=document.createElement('canvas');dustCanvas.width=64;dustCanvas.height=64;
  const dc=dustCanvas.getContext('2d');if(dc){const g=dc.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(220,155,105,.5)');g.addColorStop(1,'rgba(220,155,105,0)');dc.fillStyle=g;dc.fillRect(0,0,64,64);}
  const landingDustMaterial=resources.material(new THREE.SpriteMaterial({map:resources.texture(new THREE.CanvasTexture(dustCanvas)),transparent:true,depthWrite:false,opacity:0}));
  const landingDust=Array.from({length:16},()=>{const sprite=new THREE.Sprite(landingDustMaterial);marsLandingView.add(sprite);return sprite;});
  const landingFog=new THREE.Fog('#bd765e',150,650);
  let cockpitTime = 0;
  function updateCockpitView(stage: FlightStage, progress: number, seconds: number, active: boolean, reduced: boolean, landing?:Readonly<LandingFlightSnapshot>|null): void {
    const p = reduced
      ? stage === 'launch' || stage === 'orbit-autopilot' ? 0 : stage === 'touchdown' ? 1 : .5
      : THREE.MathUtils.clamp(progress, 0, 1);
    if (active && !reduced) cockpitTime += Math.min(.1, Math.max(0, seconds));
    cockpitCamera.position.set(0, cockpitHomeY, 10);
    cockpitCamera.lookAt(0, -1.5, -100);
    cockpitFlight.fog=landing&&landing.altitude<12000?landingFog:null;
    landingDustMaterial.opacity=0;
    entryPlanet.visible=false;entryLimb.visible=false;
    cockpitStarMaterial.opacity = landing ? 0 : reduced ? .68 : .78;
    cockpitStars.rotation.z = cockpitTime * .004;
    launchHorizon.visible = stage === 'launch';
    earthWindowPlanet.visible = stage === 'orbit-autopilot' || (stage === 'launch' && p > .55);
    distantEarth.visible = stage === 'transfer';
    marsWindowPlanet.visible = stage === 'transfer';
    const orbitalView = stage === 'orbit-autopilot' || stage === 'transfer';
    moonWindowPlanet.visible = orbitalView;
    venusWindowPlanet.visible = orbitalView;
    jupiterWindowPlanet.visible = orbitalView;
    cockpitSun.visible = orbitalView;
    cockpitSunHalo.visible = orbitalView;
    marsLandingView.visible = stage === 'landing' || stage === 'touchdown';

    if (stage === 'launch') {
      const escape = Math.max(0, (p - .25) / .75);
      launchHorizon.position.y = -p * 58;
      cockpitBackground.copy(earthSky).lerp(spaceSky, THREE.MathUtils.smoothstep(escape, 0, 1));
      cockpitStarMaterial.opacity = escape * .78;
      earthWindowPlanet.position.set(0, -51, -124);
      earthWindowPlanet.scale.setScalar(54 * (.2 + escape * .8));
    } else if (stage === 'orbit-autopilot') {
      cockpitBackground.copy(spaceSky);
      earthWindowPlanet.position.set(0, -44, -110);
      earthWindowPlanet.scale.setScalar(54);
      const drift = cockpitTime;
      moonWindowPlanet.position.set(54 + Math.sin(drift * .035) * 6, 8 + Math.sin(drift * .027) * 2.2, -150);
      venusWindowPlanet.position.set(-76 + Math.sin(drift * .019) * 7, 30 + Math.cos(drift * .023) * 2, -245);
      jupiterWindowPlanet.position.set(92 + Math.cos(drift * .017) * 9, -2 + Math.sin(drift * .021) * 2.5, -255);
      cockpitSun.position.set(-74 + Math.sin(drift * .012) * 8, 55 + Math.cos(drift * .016) * 3, -225);
      cockpitSunHalo.position.copy(cockpitSun.position);
    } else if (stage === 'transfer') {
      cockpitBackground.copy(spaceSky);
      distantEarth.position.set(-36 - p * 26, -18 - p * 5, -132 - p * 24);
      distantEarth.scale.setScalar(7 * Math.max(.18, .42 - p * .2));
      marsWindowPlanet.position.set(3 - p * 3, -12 + p * 5, -92 + p * 20);
      marsWindowPlanet.scale.setScalar(20 * (.2 + p * .8));
      const drift = cockpitTime;
      moonWindowPlanet.position.set(55 + p * 13 + Math.sin(drift * .035) * 6, 8 + Math.sin(drift * .027) * 2.2, -150 - p * 16);
      venusWindowPlanet.position.set(-76 + p * 14 + Math.sin(drift * .019) * 7, 30 + Math.cos(drift * .023) * 2, -245 - p * 22);
      jupiterWindowPlanet.position.set(92 - p * 18 + Math.cos(drift * .017) * 9, -2 + Math.sin(drift * .021) * 2.5, -255 - p * 28);
      cockpitSun.position.set(-74 + p * 18 + Math.sin(drift * .012) * 8, 55 + Math.cos(drift * .016) * 3, -225 - p * 28);
      cockpitSunHalo.position.copy(cockpitSun.position);
    } else {
      cockpitBackground.copy(marsSky).lerp(spaceSky, stage === 'touchdown' ? 0 : p * .08);
      if(landing){
        const air=1-THREE.MathUtils.smoothstep(landing.altitude,1000,45000);
        cockpitBackground.copy(spaceSky).lerp(marsSky,air);cockpitStarMaterial.opacity=Math.pow(1-air,4)*.78;
        landingFog.near=100+landing.altitude*.3;landingFog.far=700+landing.altitude*1.5;
        const radius=180+(1-THREE.MathUtils.smoothstep(landing.altitude,1500,80000))*1200;
        const planetFade=THREE.MathUtils.smoothstep(landing.altitude,400,3000);
        entryPlanet.visible=planetFade>0;entryLimb.visible=planetFade>0;
        entryPlanet.position.set(-landing.offset*.02,-radius*.95,-350-radius*.1);entryPlanet.scale.setScalar(radius);
        entryMaterial.opacity=planetFade;entryLimb.position.copy(entryPlanet.position);entryLimb.scale.setScalar(radius*1.035);entryLimbMaterial.uniforms.alpha.value=planetFade;
        // Same forward approach camera: terrain translates continuously with altitude/offset.
        marsLandingView.position.set(-landing.offset*.35,7-landing.altitude*.15,18-landing.altitude*.85);
        marsLandingView.scale.setScalar(1);landingBeacon.scale.setScalar(.7);
        cockpitCamera.rotateX(landing.pitch*Math.PI/180*.65);
        if(!reduced)cockpitCamera.rotateZ(-landing.bank*Math.PI/180*.35);
        padLight.color.set(landing.status==='retry'?'#ffb28e':Math.abs(landing.offset)<=12?'#b7f4cf':'#ffda93');
        landingDustMaterial.opacity=landing.status==='flying'?Math.max(0,1-landing.altitude/45)*landing.throttle*.6:0;
        landingDust.forEach((sprite,i)=>{const age=(cockpitTime*.65+i/16)%1;sprite.position.set(landing.offset*.35+Math.sin(i*2.4)*(2+age*11),-6+age*2,-34+Math.cos(i*2.4)*(2+age*11));sprite.scale.setScalar(2+age*9);});
      } else if (stage === 'landing') {
        marsLandingView.position.set(0, -p * 7, p * 48);
        marsLandingView.scale.setScalar(.78 + p * .5);
        landingBeacon.scale.setScalar(.65 + p * 2.2);
      } else {
        marsLandingView.position.set(0, -7, 48);
        marsLandingView.scale.setScalar(1.28);
        landingBeacon.scale.setScalar(2.85);
      }
    }
  }

  const room = new THREE.Scene(); room.background = new THREE.Color('#132932');
  room.add(new THREE.HemisphereLight('#d7f4ed', '#314149', 3));
  const roomSun = new THREE.DirectionalLight('#fff5d7', 2); roomSun.position.set(3, 8, 5); room.add(roomSun);
  kit.flatBox(room, kit.materials.trim, [6, .2, 6], [0, -.1, 0]);
  const backWall = kit.box(room, kit.materials.ivory, [6, 2.3, .15], [0, 1.15, -3]);
  const leftWall = kit.box(room, kit.materials.ivory, [.15, 2.3, 6], [-3, 1.15, 0]);
  const { steel } = dressRoom(room, kit, resources);
  dressRocketCabin(room, kit, resources);
  const door = createSlidingDoor(kit, 'interior', false); door.group.position.set(0, .92, 2.88); room.add(door.group);
  const observationWindow = new THREE.Group(); room.add(observationWindow);
  const windowGlass = resources.material(new THREE.MeshBasicMaterial({ color: '#071b2a' }));
  const windowGlow = resources.material(new THREE.MeshBasicMaterial({ color: '#163a50', transparent: true, opacity: .42 }));
  const windowStarMaterial = resources.material(new THREE.PointsMaterial({ color: '#d9efff', size: .026, transparent: true, opacity: .9, sizeAttenuation: true }));
  kit.box(observationWindow, steel, [5.18, 1.58, .2], [0, 1.52, -2.77]);
  kit.flatBox(observationWindow, windowGlass, [5.02, 1.46, .025], [0, 1.52, -2.645]);
  kit.flatBox(observationWindow, windowGlow, [4.94, 1.38, .012], [0, 1.52, -2.625]);
  for (const y of [.75, 2.29]) kit.flatBox(observationWindow, kit.materials.trim, [5.24, .075, .085], [0, y, -2.59]);
  for (const x of [-2.57, 2.57]) kit.flatBox(observationWindow, kit.materials.trim, [.075, 1.62, .085], [x, 1.52, -2.59]);
  kit.flatBox(observationWindow, kit.materials.trim, [.045, 1.44, .06], [0, 1.52, -2.575]);

  // A compact illustrated starfield and nearby planets sit just beyond the forward glass.
  // Their slow parallax keeps the view alive while the engines are idle in the cabin.
  const cabinStarCount = 520;
  const cabinStarPositions = new Float32Array(cabinStarCount * 3);
  let starSeed = 7193;
  for (let i = 0; i < cabinStarCount; i++) {
    starSeed = (starSeed * 16807) % 2147483647;
    cabinStarPositions[i * 3] = ((starSeed / 2147483647) * 4.78) - 2.39;
    starSeed = (starSeed * 16807) % 2147483647;
    cabinStarPositions[i * 3 + 1] = 1.52 + ((starSeed / 2147483647) * 1.3) - .65;
    cabinStarPositions[i * 3 + 2] = -2.61;
  }
  const cabinStarGeometry = resources.geometry(new THREE.BufferGeometry());
  cabinStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cabinStarPositions, 3));
  const cabinStars = new THREE.Points(cabinStarGeometry, windowStarMaterial); observationWindow.add(cabinStars);
  const moonWindowMaterial = resources.material(new THREE.MeshStandardMaterial({ color: '#c6c9ce', roughness: 1 }));
  const venusWindowMaterial = resources.material(new THREE.MeshStandardMaterial({ color: '#ddb982', roughness: .9 }));
  const jupiterWindowMaterial = resources.material(new THREE.MeshStandardMaterial({ color: '#c99b71', roughness: .9 }));
  const cabinEarth = kit.sphere(observationWindow, blue, [.38, .38, .38], [-1.76, 1.58, -2.48]);
  const cabinMoon = kit.sphere(observationWindow, moonWindowMaterial, [.15, .15, .15], [-1.05, 1.13, -2.49]);
  const cabinMars = kit.sphere(observationWindow, mars, [.3, .3, .3], [.86, 1.57, -2.48]);
  const cabinVenus = kit.sphere(observationWindow, venusWindowMaterial, [.19, .19, .19], [.2, 1.14, -2.48]);
  const cabinJupiter = kit.sphere(observationWindow, jupiterWindowMaterial, [.22, .22, .22], [1.88, 1.15, -2.48]);
  const cabinSunMaterial = resources.material(new THREE.MeshBasicMaterial({ color: '#ffe1a0' }));
  const cabinSun = kit.sphere(observationWindow, cabinSunMaterial, [.13, .13, .13], [.05, 2.02, -2.46]);
  const cabinSunHalo = new THREE.Sprite(resources.material(new THREE.SpriteMaterial({ map: sunHaloTexture, transparent: true, depthWrite: false, opacity: .85 })));
  cabinSunHalo.scale.set(.68, .68, 1); cabinSunHalo.position.copy(cabinSun.position); observationWindow.add(cabinSunHalo);
  // Only nearby Earth and Moon belong in this window; the other planets are not a real panorama.
  for(const distant of [cabinMars,cabinVenus,cabinJupiter,cabinSun,cabinSunHalo])distant.visible=false;
  const equipment = new THREE.Group(); room.add(equipment);
  const astronaut = createAstronaut(kit); room.add(astronaut.group);
  const suit = new THREE.Group(); suit.position.y = -.8; astronaut.group.add(suit);
  void nasa.attach(suit, 'astronaut', 1.55, astronaut.fallback);
  const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, .1, 100);
  let aspect = 1;
  let cycle = 0;
  const previous = new THREE.Vector3();
  const createScreens = (labels: readonly string[]) => labels.map((label, i) => {
    const screen = resources.material(new THREE.MeshStandardMaterial({ color: '#a6cddd', emissive: '#18374e', emissiveIntensity: .5 }));
    const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 96;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#10242e'; context.fillRect(0,0,192,96);
      context.strokeStyle = i === 0 ? '#76d8b5' : i === 1 ? '#80c9ed' : '#f3c878'; context.lineWidth = 4; context.strokeRect(6,6,180,84);
      context.fillStyle = '#e9ffec'; context.font = 'bold 24px sans-serif'; context.textAlign = 'center'; context.fillText(label,96,57);
      const texture = resources.texture(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace; screen.map = texture;
    }
    return screen;
  });
  const screens = createScreens(['01', '02', '03', '04']);
  const flightCabinScreens = createScreens(['NAV', 'TRAJ', 'COMMS']);
  const rooms = new Map<string, THREE.Group>();
  let activeRoom: string | null = null;
  let cabinSeat: RocketSeatVisual | undefined;
  let cabinSeatState: CabinSeatState = 'hidden';
  let cabinFloatTime = 0;
  let cabinWindowTime = 0;
  let reducedCabinMotion = false;
  return {
    flight, room, camera, cockpitFlight, cockpitCamera,
    setDoor(open: boolean, instant = false) { door.setOpen(open); if (instant) door.update(0, true); },
    isDoorOpen() { return door.isOpen(); },
    animate(seconds: number, active: boolean, reduced: boolean) {
      reducedCabinMotion = reduced;
      if (active && !reduced && activeRoom === 'space') {
        const elapsed = Math.min(.1, Math.max(0, seconds));
        cabinWindowTime += elapsed;
        if (cabinSeatState !== 'occupied') cabinFloatTime += elapsed;
      }
      const windowTime = cabinWindowTime;
      cabinStars.rotation.z = Math.sin(windowTime * .012) * .012;
      cabinEarth.position.set(-1.76 + Math.sin(windowTime * .045) * .12, 1.58 + Math.sin(windowTime * .031) * .035, -2.48);
      cabinMoon.position.set(-1.05 + Math.sin(windowTime * .061 + .7) * .1, 1.13 + Math.cos(windowTime * .049) * .04, -2.49);
      cabinMars.position.set(.86 + Math.sin(windowTime * .038 + 2) * .12, 1.57 + Math.cos(windowTime * .027) * .045, -2.48);
      cabinVenus.position.set(.2 + Math.cos(windowTime * .035) * .08, 1.14 + Math.sin(windowTime * .052 + 1) * .035, -2.48);
      cabinJupiter.position.set(1.88 + Math.sin(windowTime * .024 + 1.5) * .09, 1.15 + Math.cos(windowTime * .032) * .035, -2.48);
      cabinSun.position.set(.05 + Math.cos(windowTime * .018) * .08, 2.02 + Math.sin(windowTime * .025) * .025, -2.46);
      cabinSunHalo.position.copy(cabinSun.position);
      suit.userData.setPosture?.(cabinSeatState==='occupied'?'seated':activeRoom==='space'?'float':'ground');
      updateAstronautAnimation(astronaut, seconds, active, reduced);
      if(activeRoom==='space'&&cabinSeatState==='occupied'){
        astronaut.group.updateWorldMatrix(true,true);
        let hips:THREE.Object3D|undefined;astronaut.group.traverse(node=>{if(/(?:^|:|mixamorig\d*)Hips$/.test(node.name))hips=node;});
        if(hips){const point=hips.getWorldPosition(new THREE.Vector3());astronaut.group.position.add(new THREE.Vector3(SPACECRAFT_SEAT.x,.8,SPACECRAFT_SEAT.z+.02).sub(point));}
      }
      door.update(active ? seconds : 0, reduced);
    },
    cutaway(view: THREE.Camera) { backWall.visible = view.position.z > -2.8; leftWall.visible = view.position.x > -2.8; },
    pickControl(pointer: THREE.Vector2, view: THREE.Camera = camera) {
      room.updateMatrixWorld(true); view.updateMatrixWorld();
      const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, view);
      const hit = ray.intersectObjects(equipment.children, true).find(item => Number.isInteger(item.object.userData.controlIndex));
      return hit?.object.userData.controlIndex as number | undefined;
    },
    resize(value: number) { aspect = value; },
    cockpit(stage: FlightStage, progress: number, seconds: number, active: boolean, reduced: boolean, landing?:Readonly<LandingFlightSnapshot>|null) {
      updateCockpitView(stage, progress, seconds, active, reduced,landing);
      cockpitCamera.aspect = Math.max(.1, aspect);
      cockpitCamera.updateProjectionMatrix();
    },
    journey(progress: number) {
      const p = Math.min(1, Math.max(0, progress));
      rocket.rotation.z = -Math.PI / 2; parachute.visible = false;
      rocket.position.set(-4 + p * 8, Math.sin(p * Math.PI) * 2, 2);
      const half = Math.max(5, 10 / aspect);
      camera.position.set(0, 0, 24); camera.lookAt(0, 0, 0);
      camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();
    },
    landing(progress: number) {
      const p = Math.min(1, Math.max(0, progress));
      rocket.rotation.z = 0;
      rocket.position.set(6, 5.5 - p * 4, 1);
      parachute.visible = p >= (2 / 6) && p < .72;
      const half = Math.max(5, 10 / aspect);
      camera.position.set(6, 0, 24); camera.lookAt(6, 0, 0);
      camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();
    },
    interior(id: StationId | 'earth' | 'space') {
      activeRoom = id;
      equipment.clear();
      observationWindow.visible = id === 'space';
      let set = rooms.get(id);
      if (!set) {
        set = new THREE.Group(); furnishRoom(set, id, kit, id === 'space' ? flightCabinScreens : screens, steel); rooms.set(id, set);
        if (id === 'earth') {
          const exhibit = new THREE.Group(); exhibit.position.set(1.8,.5,1.4); set.add(exhibit);
          void nasa.attach(exhibit, 'rover', .6, undefined, true);
        }
        if (id === 'space') {
          const satellite = new THREE.Group(); satellite.position.set(0,1.8,-2); set.add(satellite);
          void nasa.attach(satellite, 'satellite', .65, undefined, true);
          cabinSeat = addRocketFlightSeat(set, kit, resources);
        }
      }
      equipment.add(set);
    },
    setCabinSeatState(state: CabinSeatState) {
      cabinSeatState = state;
      if (!cabinSeat) return;
      cabinSeat.marker.visible = state === 'available';
      cabinSeat.harness.visible = state === 'occupied';
      cabinSeat.indicator.color.set(state === 'occupied' ? '#9ae5bd' : state === 'available' ? '#ffd17f' : '#54727a');
      cabinSeat.indicator.emissive.set(state === 'occupied' ? '#2b9a69' : state === 'available' ? '#a94d12' : '#16272b');
    },
    progress(value: number) {
      [screens, flightCabinScreens].forEach(group => group.forEach((screen, i) => {
        screen.color.set(i < value ? '#96d8a8' : '#a6cddd');
        screen.emissive.set(i < value ? '#478e60' : '#18374e');
      }));
    },
    pose(pose: Vec3, moving: boolean) {
      const d = previous.distanceTo(new THREE.Vector3(pose.x, pose.y, pose.z));
      if (d > .001 && d < 1) { cycle += d * 7; astronaut.group.rotation.y = Math.atan2(pose.x - previous.x, pose.z - previous.z); }
      previous.copy(pose);
      applyAstronautGait(astronaut, cycle, moving && d < 1 && cabinSeatState !== 'occupied');
      if (activeRoom === 'space' && cabinSeatState === 'occupied') {
        astronaut.group.position.set(SPACECRAFT_SEAT.x, SPACECRAFT_SEAT.y, SPACECRAFT_SEAT.z);
        astronaut.group.rotation.set(0, Math.PI, 0);
        astronaut.legs.forEach((leg, index) => { leg.rotation.x = index ? .74 : .9; });
        astronaut.arms.forEach((arm, index) => { arm.rotation.x = index ? -.45 : -.7; });
      } else {
        const drift = activeRoom === 'space' ? .42 + (reducedCabinMotion ? 0 : Math.sin(cabinFloatTime * 1.15) * .045) : 0;
        astronaut.group.position.set(pose.x, pose.y + drift, pose.z);
        astronaut.group.rotation.z = activeRoom === 'space' && !reducedCabinMotion ? Math.sin(cabinFloatTime * .55) * .035 : 0;
      }
    },
    setAvatarVisible(visible: boolean) { astronaut.group.visible = visible; },
    roomCamera() {
      const half = Math.max(4.7, 5.2 / aspect);
      camera.position.set(8, 10, 12); camera.lookAt(0, .5, 0);
      camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();
    },
    dispose() { flight.clear(); cockpitFlight.clear(); room.clear(); rooms.clear(); },
  };
}
