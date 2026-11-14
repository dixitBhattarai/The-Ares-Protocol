import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import { WorldResources, type ModelKit } from './resources';

/** High-detail procedural Martian dust & regolith texture with micro-ripples and iron-oxide grains. */
export function createDustTexture(resources: WorldResources): THREE.DataTexture {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 703;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain = (seed >>> 24) / 255;
      const ripple = Math.sin(x * 0.19 + Math.sin(y * 0.08) * 2) * 3;
      const duneWave = Math.sin(x * 0.05 + y * 0.03) * 6;
      const i = (y * size + x) * 4;
      pixels[i] = Math.min(255, 175 + grain * 26 + ripple + duneWave);
      pixels[i + 1] = Math.min(255, 96 + grain * 18 + ripple * 0.8 + duneWave * 0.6);
      pixels[i + 2] = Math.min(255, 68 + grain * 14 + ripple * 0.6 + duneWave * 0.4);
      pixels[i + 3] = 255;
    }
  }
  const texture = resources.texture(new THREE.DataTexture(pixels, size, size));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Surface details including flat crater weathering marks, NASA rover tire tracks,
 * and astronaut bootprints. All markings remain perfectly flat (y <= 0.014) to ensure
 * smooth, unobstructed player movement.
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
      opacity: 0.08,
      depthWrite: false,
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
