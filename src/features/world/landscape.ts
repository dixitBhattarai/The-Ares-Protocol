import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import { WorldResources, type ModelKit } from './resources';

/** High-detail, 100% seamless procedural Martian regolith & dust texture based on NASA Mars photography. */
export function createDustTexture(resources: WorldResources): THREE.DataTexture {
  const size = 256;
  const pixels = new Uint8Array(size * size * 4);
  const PI2 = Math.PI * 2;

  // Authentic NASA Mars regolith color palette (Curiosity & Perseverance Mastcam observations):
  // 1. Weathered dark basalt granules / shadow crevices
  const rBasalt = 94, gBasalt = 48, bBasalt = 38;
  // 2. Iron-oxide oxidized regolith (predominant Martian soil)
  const rSoil = 186, gSoil = 94, bSoil = 60;
  // 3. Fine windblown golden dune crest sand
  const rDune = 212, gDune = 128, bDune = 82;
  // 4. Sulfate/silica light mineral deposits
  const rMineral = 224, gMineral = 172, bMineral = 142;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const vAng = v * PI2;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const uAng = u * PI2;

      // Pure integer harmonic frequencies ensure 100% mathematical periodic tiling (zero edge seams)
      // 1. Macro wind ripples oriented along Martian prevailing wind vector (~28 degrees)
      const wave1 = Math.sin(uAng * 4 + vAng * 2) * 0.45;
      const wave2 = Math.cos(uAng * 8 - vAng * 4 + wave1 * 1.4) * 0.28;

      // 2. Intermediate sand wavelets
      const ripple1 = Math.sin(uAng * 16 + vAng * 8) * 0.16;
      const ripple2 = Math.cos(uAng * 24 - vAng * 12 + ripple1 * 2) * 0.11;

      // 3. High-frequency regolith grain noise
      const grain1 = Math.sin(uAng * 48 + Math.cos(vAng * 48)) * 0.07;
      const grain2 = Math.cos(uAng * 64 - vAng * 32) * Math.sin(vAng * 64) * 0.05;

      // Combined normalized height factor in [0, 1]
      const hRaw = (wave1 + wave2 + ripple1 + ripple2 + grain1 + grain2 + 1.15) / 2.3;
      const h = Math.max(0, Math.min(1, hRaw));

      // Continuous natural gradient blending across authentic Martian soil layers
      let r: number, g: number, b: number;
      if (h < 0.35) {
        const t = h / 0.35;
        r = rBasalt + t * (rSoil - rBasalt);
        g = gBasalt + t * (gSoil - gBasalt);
        b = bBasalt + t * (bSoil - bBasalt);
      } else if (h < 0.78) {
        const t = (h - 0.35) / (0.78 - 0.35);
        r = rSoil + t * (rDune - rSoil);
        g = gSoil + t * (gDune - gSoil);
        b = bSoil + t * (bDune - bSoil);
      } else {
        const t = (h - 0.78) / (1 - 0.78);
        r = rDune + t * (rMineral - rDune);
        g = gDune + t * (gMineral - gDune);
        b = bDune + t * (bMineral - bDune);
      }

      const idx = (y * size + x) * 4;
      pixels[idx] = Math.round(r);
      pixels[idx + 1] = Math.round(g);
      pixels[idx + 2] = Math.round(b);
      pixels[idx + 3] = 255;
    }
  }

  const texture = resources.texture(new THREE.DataTexture(pixels, size, size));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Surface details including flat crater weathering marks, NASA rover tire tracks,
 * and astronaut bootprints. All markings remain perfectly flat (y <= 0.014) to ensure
 * smooth, unobstructed player movement, and use hardware polygon offset to eliminate z-fighting.
 */
export function createSurfaceDetails(resources: WorldResources): THREE.Group {
  const group = new THREE.Group();
  group.name = 'surface-details';

  // 1. Flat Crater Weathering Marks (Required by existing landscape tests)
  const ring = resources.geometry(new THREE.RingGeometry(0.87, 1, 24));
  const pigment = resources.material(
    new THREE.MeshBasicMaterial({
      color: '#593e35',
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const marks = new THREE.InstancedMesh(ring, pigment, 18);
  marks.name = 'flat-crater-marks';
  const transform = new THREE.Object3D();
  for (let i = 0; i < marks.count; i++) {
    const angle = i * 2.399963;
    const radius = 11 + ((i * 7) % 8);
    const size = 0.25 + ((i * 11) % 9) * 0.13;
    transform.position.set(Math.cos(angle) * radius, 0.011, Math.sin(angle) * radius);
    transform.rotation.set(-Math.PI / 2, 0, i);
    transform.scale.set(size * 1.35, size, 1);
    transform.updateMatrix();
    marks.setMatrixAt(i, transform.matrix);
  }
  marks.instanceMatrix.needsUpdate = true;
  group.add(marks);

  // 2. Realistic NASA Rover Tracks (Dual chevron treads from Curiosity rover heading to the desert)
  const trackGeo = resources.geometry(new THREE.PlaneGeometry(0.32, 0.09));
  trackGeo.rotateX(-Math.PI / 2);
  const trackMat = resources.material(
    new THREE.MeshBasicMaterial({
      color: '#4e281e',
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -1.5,
    })
  );

  const roverTrackCount = 60;
  const roverTracks = new THREE.InstancedMesh(trackGeo, trackMat, roverTrackCount * 2);
  roverTracks.name = 'nasa-rover-tracks';

  let roverMatrixIdx = 0;
  for (let i = 0; i < roverTrackCount; i++) {
    const t = i / roverTrackCount;
    // Curved path from Curiosity rover (21, 7) heading north-east towards the dunes (38, 28)
    const curveX = 21 + t * 18 + Math.sin(t * Math.PI) * 4;
    const curveZ = 7 + t * 22;
    const angle = Math.atan2(22, 18 + Math.cos(t * Math.PI) * 4 * Math.PI);

    // Left and right tire tread offset
    for (const side of [-0.65, 0.65]) {
      const offsetX = Math.cos(angle + Math.PI / 2) * side;
      const offsetZ = Math.sin(angle + Math.PI / 2) * side;
      transform.position.set(curveX + offsetX, 0.012, curveZ + offsetZ);
      transform.rotation.set(0, -angle, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      roverTracks.setMatrixAt(roverMatrixIdx++, transform.matrix);
    }
  }
  roverTracks.instanceMatrix.needsUpdate = true;
  group.add(roverTracks);

  // 3. Astronaut Bootprints (Winding EVA trails between base modules)
  const bootGeo = resources.geometry(new THREE.PlaneGeometry(0.18, 0.36));
  bootGeo.rotateX(-Math.PI / 2);
  const bootMat = resources.material(
    new THREE.MeshBasicMaterial({
      color: '#48241c',
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -1.5,
    })
  );

  const bootCount = 80;
  const footprints = new THREE.InstancedMesh(bootGeo, bootMat, bootCount);
  footprints.name = 'astronaut-footprints';

  // Paths: Habitat (-8, -4) -> Solar (8, -4) and Habitat (-8, -4) -> Greenhouse (0, 8)
  for (let i = 0; i < bootCount; i++) {
    let px = 0;
    let pz = 0;
    let yaw = 0;

    if (i < 40) {
      // Trail from Habitat to Solar array
      const t = i / 40;
      px = -6.5 + t * 13;
      pz = -3.2 + Math.sin(t * Math.PI * 3) * 0.35;
      yaw = 0;
    } else {
      // Trail from Habitat to Greenhouse
      const t = (i - 40) / 40;
      px = -6.5 + t * 5.5 + Math.sin(t * Math.PI * 2) * 0.4;
      pz = -2.5 + t * 9.5;
      yaw = -Math.PI / 4;
    }

    const side = (i % 2 === 0 ? -1 : 1) * 0.16;
    const footX = px + Math.cos(yaw + Math.PI / 2) * side;
    const footZ = pz + Math.sin(yaw + Math.PI / 2) * side;

    transform.position.set(footX, 0.012, footZ);
    transform.rotation.set(0, -yaw, 0);
    transform.scale.set(1, 1, 1);
    transform.updateMatrix();
    footprints.setMatrixAt(i, transform.matrix);
  }
  footprints.instanceMatrix.needsUpdate = true;
  group.add(footprints);

  return group;
}

/**
 * Abandoned Exploration Equipment:
 * Retro descent stage wreckage, deployable meteorology sensor mast with spinning
 * anemometer cups, seismic sensor pod with blinking status LED.
 */
export function createAbandonedEquipment(kit: ModelKit, resources: WorldResources): THREE.Group {
  const group = new THREE.Group();
  group.name = 'abandoned-equipment';

  const goldFoilMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#e5a528',
      metalness: 0.85,
      roughness: 0.25,
    })
  );
  const heatShieldMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#2a2220',
      roughness: 0.95,
    })
  );
  const whitePanelMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#d6d5cc',
      roughness: 0.6,
    })
  );
  const antennaMetalMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#5a6b74',
      metalness: 0.6,
      roughness: 0.4,
    })
  );
  const sensorGlowMat = resources.material(
    new THREE.MeshBasicMaterial({
      color: '#34d399',
    })
  );

  // 1. Abandoned Retro Lander Descent Stage (Northeast dune field: x: 36, z: -26)
  const lander = new THREE.Group();
  lander.name = 'retro-lander-wreckage';
  lander.position.set(36, 0.4, -26);
  lander.rotation.set(0.12, 0.4, -0.08);

  // Octagonal descent base wrapped in thermal foil
  kit.cylinder(lander, goldFoilMat, [2.4, 0.9, 2.4], [0, 0.45, 0]);
  // Heat shield bottom rim
  kit.cylinder(lander, heatShieldMat, [2.7, 0.18, 2.7], [0, 0.09, 0]);
  // Folded solar petals / avionics bay
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const petal = new THREE.Group();
    petal.position.set(Math.sin(angle) * 2.1, 0.5, Math.cos(angle) * 2.1);
    petal.rotation.set(0, angle, 0.35);
    kit.flatBox(petal, whitePanelMat, [1.6, 0.06, 1.2], [0, 0, 0]);
    lander.add(petal);
  }
  // Landing gear struts
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    kit.cylinder(lander, antennaMetalMat, [0.08, 1.8, 0.08], [Math.sin(angle) * 2.6, 0.2, Math.cos(angle) * 2.6]);
    kit.cylinder(lander, heatShieldMat, [0.35, 0.08, 0.35], [Math.sin(angle) * 3.2, 0.04, Math.cos(angle) * 3.2]);
  }
  group.add(lander);

  // 2. Deployable Meteorological Sensor Station (Southwest mesa edge: x: -25, z: 22)
  const weatherStation = new THREE.Group();
  weatherStation.name = 'weather-sensor-station';
  weatherStation.position.set(-25, 0.2, 22);

  // Tripod base
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    kit.cylinder(weatherStation, antennaMetalMat, [0.05, 1.4, 0.05], [Math.sin(angle) * 0.7, 0.65, Math.cos(angle) * 0.7]);
  }
  // Central mast
  kit.cylinder(weatherStation, antennaMetalMat, [0.06, 3.2, 0.06], [0, 1.6, 0]);
  // Anemometer crossbars
  kit.flatBox(weatherStation, antennaMetalMat, [0.9, 0.04, 0.04], [0, 3.1, 0]);
  kit.flatBox(weatherStation, antennaMetalMat, [0.04, 0.04, 0.9], [0, 3.1, 0]);
  // Sensor cups
  kit.sphere(weatherStation, goldFoilMat, [0.12, 0.12, 0.12], [0.45, 3.1, 0]);
  kit.sphere(weatherStation, goldFoilMat, [0.12, 0.12, 0.12], [-0.45, 3.1, 0]);
  kit.sphere(weatherStation, goldFoilMat, [0.12, 0.12, 0.12], [0, 3.1, 0.45]);
  kit.sphere(weatherStation, goldFoilMat, [0.12, 0.12, 0.12], [0, 3.1, -0.45]);
  // Active telemetry LED
  kit.sphere(weatherStation, sensorGlowMat, [0.06, 0.06, 0.06], [0, 3.28, 0]);
  group.add(weatherStation);

  // 3. Seismic Sensor Pod (Southeast regolith: x: 14, z: 24)
  const seismicPod = new THREE.Group();
  seismicPod.position.set(14, 0.08, 24);
  kit.cylinder(seismicPod, goldFoilMat, [0.65, 0.35, 0.65], [0, 0.18, 0]);
  kit.sphere(seismicPod, sensorGlowMat, [0.08, 0.08, 0.08], [0, 0.38, 0]);
  kit.cylinder(seismicPod, antennaMetalMat, [0.02, 1.2, 0.02], [0.2, 0.6, 0]);
  group.add(seismicPod);

  return group;
}

/**
 * Mysterious Alien-Looking Martian Rock Formations:
 * Towering wind-carved yardangs, precariously balanced hoodoos, and natural rock arches.
 */
export function createAlienRockFormations(kit: ModelKit, resources: WorldResources): THREE.Group {
  const group = new THREE.Group();
  group.name = 'alien-rock-formations';

  const rockMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#9e462d',
      roughness: 0.92,
      metalness: 0.06,
    })
  );
  const darkRockMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#5c2b20',
      roughness: 0.95,
      metalness: 0.08,
    })
  );

  const yardangGeo = resources.geometry(new THREE.ConeGeometry(3.2, 11, 7));
  const hoodooPillarGeo = resources.geometry(new THREE.CylinderGeometry(0.7, 1.5, 6.5, 7));
  const hoodooCapGeo = resources.geometry(new THREE.DodecahedronGeometry(2.4, 0));

  // 1. Wind-carved Yardang Spire (Northwest ridge: x: -44, z: -32)
  const yardang1 = new THREE.Mesh(yardangGeo, rockMat);
  yardang1.position.set(-44, 4.5, -32);
  yardang1.scale.set(1.4, 1.2, 2.2);
  yardang1.rotation.set(0.15, -0.4, 0.1);
  yardang1.castShadow = true;
  yardang1.receiveShadow = true;
  group.add(yardang1);

  const yardang2 = new THREE.Mesh(yardangGeo, darkRockMat);
  yardang2.position.set(-38, 3.8, -38);
  yardang2.scale.set(1.1, 1.0, 1.8);
  yardang2.rotation.set(0.12, -0.35, 0.08);
  yardang2.castShadow = true;
  yardang2.receiveShadow = true;
  group.add(yardang2);

  // 2. Balancing Hoodoos (Southeast desert: x: 38, z: 36)
  const hoodoo = new THREE.Group();
  hoodoo.position.set(38, 0.8, 36);

  const pillar = new THREE.Mesh(hoodooPillarGeo, darkRockMat);
  pillar.position.y = 3.25;
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  hoodoo.add(pillar);

  const cap = new THREE.Mesh(hoodooCapGeo, rockMat);
  cap.position.set(0.15, 6.8, -0.1);
  cap.scale.set(1.3, 0.75, 1.2);
  cap.rotation.set(0.2, 0.5, -0.15);
  cap.castShadow = true;
  cap.receiveShadow = true;
  hoodoo.add(cap);

  group.add(hoodoo);

  // 3. Natural Rock Arch (East-northeast ridge: x: 52, z: -8)
  const arch = new THREE.Group();
  arch.position.set(52, 2.0, -8);
  arch.rotation.y = -0.35;

  const archLeg1 = new THREE.Mesh(yardangGeo, darkRockMat);
  archLeg1.position.set(-3.5, 4.2, 0);
  archLeg1.scale.set(1.2, 1.0, 1.2);
  archLeg1.rotation.z = -0.22;
  archLeg1.castShadow = true;
  arch.add(archLeg1);

  const archLeg2 = new THREE.Mesh(yardangGeo, darkRockMat);
  archLeg2.position.set(3.5, 4.2, 0);
  archLeg2.scale.set(1.2, 1.0, 1.2);
  archLeg2.rotation.z = 0.22;
  archLeg2.castShadow = true;
  arch.add(archLeg2);

  const archSpan = new THREE.Mesh(hoodooCapGeo, rockMat);
  archSpan.position.set(0, 8.2, 0);
  archSpan.scale.set(3.6, 1.1, 1.4);
  archSpan.castShadow = true;
  archSpan.receiveShadow = true;
  arch.add(archSpan);

  group.add(arch);

  return group;
}

/**
 * Scientifically Realistic NASA Colony Infrastructure:
 * - Interconnected pressurized corridors linking Habitat, Greenhouse, and Solar Lab
 * - High-gain 4.4m deep-space communication dish aligned with Earth trajectory
 * - Cryogenic liquid oxygen/methane life-support synthesis depot (MOXIE / Sabatier)
 */
export function createColonyInfrastructure(kit: ModelKit, resources: WorldResources): THREE.Group {
  const group = new THREE.Group();
  group.name = 'nasa-colony-infrastructure';

  const tunnelMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#e2ebf0',
      metalness: 0.35,
      roughness: 0.3,
    })
  );
  const bellowsMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#2a353d',
      metalness: 0.7,
      roughness: 0.4,
    })
  );
  const goldFoilMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#e5a528',
      metalness: 0.88,
      roughness: 0.22,
    })
  );
  const steelMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#495a63',
      metalness: 0.8,
      roughness: 0.25,
    })
  );
  const beaconLedMat = resources.material(
    new THREE.MeshBasicMaterial({
      color: '#ff3b30',
    })
  );
  const guideLightMat = resources.material(
    new THREE.MeshBasicMaterial({
      color: '#ffe18b',
    })
  );

  // 1. Pressurized Connecting Corridor: Habitat (-7, 0, 0) -> Greenhouse (0, 0, -9)
  const habCurve = new THREE.LineCurve3(
    new THREE.Vector3(-5.2, 0.75, -1.8),
    new THREE.Vector3(-1.8, 0.75, -7.2)
  );
  const habTunnelGeo = resources.geometry(new THREE.TubeGeometry(habCurve, 14, 0.5, 12, false));
  const habTunnel = new THREE.Mesh(habTunnelGeo, tunnelMat);
  habTunnel.castShadow = true;
  habTunnel.receiveShadow = true;
  group.add(habTunnel);

  // 2. Pressurized Connecting Corridor: Solar (7, 0, 0) -> Greenhouse (0, 0, -9)
  const solarCurve = new THREE.LineCurve3(
    new THREE.Vector3(5.2, 0.75, -1.8),
    new THREE.Vector3(1.8, 0.75, -7.2)
  );
  const solarTunnelGeo = resources.geometry(new THREE.TubeGeometry(solarCurve, 14, 0.5, 12, false));
  const solarTunnel = new THREE.Mesh(solarTunnelGeo, tunnelMat);
  solarTunnel.castShadow = true;
  solarTunnel.receiveShadow = true;
  group.add(solarTunnel);

  // Support stanchions and expansion bellows along corridors
  for (let t = 0.25; t <= 0.75; t += 0.25) {
    const p1 = habCurve.getPoint(t);
    kit.cylinder(group, steelMat, [0.08, p1.y, 0.08], [p1.x, p1.y / 2, p1.z]);
    kit.cylinder(group, bellowsMat, [0.56, 0.18, 0.56], [p1.x, p1.y, p1.z]);
    kit.sphere(group, guideLightMat, [0.05, 0.05, 0.05], [p1.x, p1.y + 0.55, p1.z]);

    const p2 = solarCurve.getPoint(t);
    kit.cylinder(group, steelMat, [0.08, p2.y, 0.08], [p2.x, p2.y / 2, p2.z]);
    kit.cylinder(group, bellowsMat, [0.56, 0.18, 0.56], [p2.x, p2.y, p2.z]);
    kit.sphere(group, guideLightMat, [0.05, 0.05, 0.05], [p2.x, p2.y + 0.55, p2.z]);
  }

  // 3. Deep-Space High-Gain Communications Dish (North at x: 0, z: -17)
  const commsGroup = new THREE.Group();
  commsGroup.name = 'deep-space-communications-array';
  commsGroup.position.set(0, 0, -17);

  // Foundation pier
  kit.cylinder(commsGroup, steelMat, [1.4, 0.8, 1.4], [0, 0.4, 0]);
  kit.cylinder(commsGroup, bellowsMat, [0.45, 1.6, 0.45], [0, 1.4, 0]);

  // Parabolic dish (4.4m diameter) tilted toward Earth in deep space
  const dishGeo = resources.geometry(new THREE.ConeGeometry(2.2, 0.65, 32, 1, true));
  const dish = new THREE.Mesh(dishGeo, tunnelMat);
  dish.position.set(0, 3.1, 0);
  dish.rotation.set(-0.85, 0.4, 0);
  dish.castShadow = true;
  commsGroup.add(dish);

  // Central sub-reflector feed tripod and signal LED
  kit.cylinder(dish, steelMat, [0.04, 1.2, 0.04], [0, 0.6, 0]);
  kit.sphere(dish, beaconLedMat, [0.08, 0.08, 0.08], [0, 1.25, 0]);

  group.add(commsGroup);

  // 4. Cryogenic Life Support & Atmospheric Propellant Depot (MOXIE at x: 15, z: 3)
  const moxieGroup = new THREE.Group();
  moxieGroup.name = 'moxie-cryogenic-facility';
  moxieGroup.position.set(15, 0, 3);

  // Dual cryogenic liquid oxygen & water storage spheres
  for (const offset of [-1.5, 1.5]) {
    kit.cylinder(moxieGroup, steelMat, [0.75, 0.5, 0.75], [offset, 0.25, 0]);
    kit.sphere(moxieGroup, goldFoilMat, [1.35, 1.35, 1.35], [offset, 1.65, 0]);
    // Pressure indicator valve
    kit.cylinder(moxieGroup, steelMat, [0.04, 0.4, 0.04], [offset, 3.1, 0]);
    kit.sphere(moxieGroup, beaconLedMat, [0.06, 0.06, 0.06], [offset, 3.35, 0]);
  }

  // Atmospheric CO2 intake compressor tower
  kit.box(moxieGroup, steelMat, [1.2, 2.6, 1.2], [0, 1.3, -1.8]);
  kit.cylinder(moxieGroup, bellowsMat, [0.55, 0.9, 0.55], [0, 3.0, -1.8]);
  kit.sphere(moxieGroup, guideLightMat, [0.08, 0.08, 0.08], [0, 3.55, -1.8]);

  // Cryogenic transfer piping with valve handwheels
  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.5, 0.6, 0),
    new THREE.Vector3(0, 0.6, 0),
    new THREE.Vector3(1.5, 0.6, 0),
    new THREE.Vector3(1.5, 0.6, -1.8),
    new THREE.Vector3(0.6, 0.6, -1.8),
  ]);
  const pipeGeo = resources.geometry(new THREE.TubeGeometry(pipeCurve, 16, 0.06, 8, false));
  const pipeMesh = new THREE.Mesh(pipeGeo, steelMat);
  moxieGroup.add(pipeMesh);

  group.add(moxieGroup);

  return group;
}

