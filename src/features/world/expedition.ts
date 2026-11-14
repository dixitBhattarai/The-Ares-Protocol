import * as THREE from 'three';
import type { FlightStage, LandingFlightSnapshot, StationId, Vec3 } from '../../contracts';
import { createAstronaut, applyAstronautGait, updateAstronautAnimation } from './astronaut';
import type { ModelKit, WorldResources } from './resources';
import { dressRoom, furnishRoom } from './interiors';
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
  const cockpitSun = new THREE.DirectionalLight('#fff0ce', 3.2); cockpitSun.position.set(-9, 14, 10); cockpitFlight.add(cockpitSun);
  const cockpitCamera = new THREE.PerspectiveCamera(58, 1, .1, 700);
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

  const starPositions = new Float32Array(320 * 3);
  for (let i = 0; i < 320; i++) {
    starPositions[i * 3] = Math.sin(i * 37.13) * 125;
    starPositions[i * 3 + 1] = Math.sin(i * 11.71 + 1) * 75;
    starPositions[i * 3 + 2] = -35 - (i % 17) * 19;
  }
  const cockpitStarGeometry = resources.geometry(new THREE.BufferGeometry());
  cockpitStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const cockpitStarMaterial = resources.material(new THREE.PointsMaterial({ color: '#d6efff', size: .6, transparent: true, opacity: 0 }));
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
    cockpitFlight.fog=landing?landingFog:null;
    landingDustMaterial.opacity=0;
    cockpitStarMaterial.opacity = landing ? 0 : reduced ? .68 : .78;
    cockpitStars.rotation.z = active && !reduced ? cockpitTime * .004 : 0;
    launchHorizon.visible = stage === 'launch';
    earthWindowPlanet.visible = stage === 'orbit-autopilot' || (stage === 'launch' && p > .55);
    distantEarth.visible = stage === 'transfer';
    marsWindowPlanet.visible = stage === 'transfer';
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
    } else if (stage === 'transfer') {
      cockpitBackground.copy(spaceSky);
      distantEarth.position.set(-36 - p * 26, -18 - p * 5, -132 - p * 24);
      distantEarth.scale.setScalar(7 * Math.max(.18, .42 - p * .2));
      marsWindowPlanet.position.set(3 - p * 3, -12 + p * 5, -92 + p * 20);
      marsWindowPlanet.scale.setScalar(20 * (.2 + p * .8));
    } else {
      cockpitBackground.copy(marsSky).lerp(spaceSky, stage === 'touchdown' ? 0 : p * .08);
      if(landing){
        // Same forward approach camera: terrain translates continuously with altitude/offset.
        marsLandingView.position.set(-landing.offset*.35,7-landing.altitude*.15,18-landing.altitude*.85);
        marsLandingView.scale.setScalar(1);landingBeacon.scale.setScalar(.7);
        if(!reduced)cockpitCamera.rotateZ(-landing.pitch*Math.PI/180*.35);
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
  const door = createSlidingDoor(kit, 'interior', false); door.group.position.set(0, .92, 2.88); room.add(door.group);
  const observationWindow = new THREE.Group(); room.add(observationWindow);
  const windowRim = new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(.7, .07, 8, 32)), steel);
  windowRim.position.set(0,1.6,-2.78); observationWindow.add(windowRim);
  kit.sphere(observationWindow, blue, [.6,.6,.18], [0,1.6,-2.8]);
  const equipment = new THREE.Group(); room.add(equipment);
  const astronaut = createAstronaut(kit); room.add(astronaut.group);
  const suit = new THREE.Group(); suit.position.y = -.8; astronaut.group.add(suit);
  void nasa.attach(suit, 'astronaut', 1.55, astronaut.fallback);
  const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, .1, 100);
  let aspect = 1;
  let cycle = 0;
  const previous = new THREE.Vector3();
  const screens = [0, 1, 2, 3].map(() => resources.material(new THREE.MeshStandardMaterial({ color: '#a6cddd', emissive: '#18374e', emissiveIntensity: .5 })));
  screens.forEach((screen, i) => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#1b2a34'; context.fillRect(0,0,128,64);
      context.fillStyle = '#e9ffec'; context.font = 'bold 34px sans-serif'; context.textAlign = 'center'; context.fillText(`${i + 1}`,64,43);
      const texture = resources.texture(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace; screen.map = texture;
    }
  });
  const rooms = new Map<string, THREE.Group>();
  return {
    flight, room, camera, cockpitFlight, cockpitCamera,
    setDoor(open: boolean, instant = false) { door.setOpen(open); if (instant) door.update(0, true); },
    isDoorOpen() { return door.isOpen(); },
    animate(seconds: number, active: boolean, reduced: boolean) { updateAstronautAnimation(astronaut, seconds, active, reduced); door.update(active ? seconds : 0, reduced); },
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
      equipment.clear();
      observationWindow.visible = id === 'space';
      let set = rooms.get(id);
      if (!set) {
        set = new THREE.Group(); furnishRoom(set, id, kit, screens, steel); rooms.set(id, set);
        if (id === 'earth') {
          const exhibit = new THREE.Group(); exhibit.position.set(1.8,.5,1.4); set.add(exhibit);
          void nasa.attach(exhibit, 'rover', .6, undefined, true);
        }
        if (id === 'space') {
          const satellite = new THREE.Group(); satellite.position.set(0,1.8,-2); set.add(satellite);
          void nasa.attach(satellite, 'satellite', .65, undefined, true);
        }
      }
      equipment.add(set);
    },
    progress(value: number) { screens.forEach((screen, i) => { screen.color.set(i < value ? '#96d8a8' : '#a6cddd'); screen.emissive.set(i < value ? '#478e60' : '#18374e'); }); },
    pose(pose: Vec3, moving: boolean) {
      const d = previous.distanceTo(new THREE.Vector3(pose.x, pose.y, pose.z));
      if (d > .001 && d < 1) { cycle += d * 7; astronaut.group.rotation.y = Math.atan2(pose.x - previous.x, pose.z - previous.z); }
      astronaut.group.position.copy(pose); previous.copy(pose);
      applyAstronautGait(astronaut, cycle, moving && d < 1);
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
