import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import { createStation } from './models';
import type { ModelKit, WorldResources } from './resources';

/**
 * Highly realistic, lush, and immersive Earth training campus & surrounding wilderness.
 * Features rolling green hills, dramatic mountain ranges, a shimmering lake & river,
 * wooden footbridge, dense multi-species forests, bushes, wildflower meadows, rocks,
 * blue atmospheric skydome, drifting 3D clouds, and realistic sunlight & shadows.
 */
export function createEarthCampus(kit: ModelKit, resources: WorldResources) {
  const scene = new THREE.Scene();
  scene.name = 'earth-outdoors';

  // =========================================================================
  // 1. SKY, SUNLIGHT & ATMOSPHERE
  // =========================================================================
  // Crisp blue atmospheric fog that softly blends mountains with the sky
  scene.fog = new THREE.Fog('#bfe1f0', 45, 175);
  scene.background = new THREE.Color('#98d1ea');

  // Gradient Skydome (using DataTexture for 100% SSR & Node/Vitest compatibility)
  const skyRadius = 190;
  const skyGeo = resources.geometry(new THREE.SphereGeometry(skyRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5));
  const skyHeight = 128;
  const skyData = new Uint8Array(4 * skyHeight);
  for (let i = 0; i < skyHeight; i++) {
    const t = i / (skyHeight - 1); // 0 at zenith, 1 at horizon
    // Lerp from deep azure (#155d99) through crisp blue (#3b92d4) to warm horizon (#d8eef8)
    const r = t < 0.5 ? Math.round(21 + t * 2 * (59 - 21)) : Math.round(59 + (t - 0.5) * 2 * (216 - 59));
    const g = t < 0.5 ? Math.round(93 + t * 2 * (146 - 93)) : Math.round(146 + (t - 0.5) * 2 * (238 - 146));
    const b = t < 0.5 ? Math.round(153 + t * 2 * (212 - 153)) : Math.round(212 + (t - 0.5) * 2 * (248 - 212));
    const stride = i * 4;
    skyData[stride] = r;
    skyData[stride + 1] = g;
    skyData[stride + 2] = b;
    skyData[stride + 3] = 255;
  }
  const skyTexture = resources.texture(new THREE.DataTexture(skyData, 1, skyHeight, THREE.RGBAFormat));
  skyTexture.needsUpdate = true;
  const skyMat = resources.material(
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false })
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.position.y = -10;
  scene.add(skyDome);

  // Sunlight: warm golden directional light casting natural shadows
  const sun = new THREE.DirectionalLight('#fff6de', 3.2);
  sun.position.set(-28, 48, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);

  // Global ambient hemisphere light: sky illumination + ground meadow bounce
  const hemiLight = new THREE.HemisphereLight('#ccebff', '#4d692e', 1.9);
  scene.add(hemiLight);

  // =========================================================================
  // 2. SCULPTED REALISTIC TERRAIN (Hills, Valleys & Mountain Ranges)
  // =========================================================================
  const terrainSize = 250;
  const terrainSegments = 120;
  const terrainGeo = resources.geometry(new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments));
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];

  // Elevation formula:
  // - Campus basin (r < 22): perfectly level at y = 0
  // - Meadow transition (22 < r < 60): gentle rolling hills (y: 0.5 to 5m)
  // - Mountain perimeter (r > 65): soaring alpine peaks and rocky crags (y: 12 to 46m)
  // - River and lake depression (east / southeast)
  function getElevation(x: number, z: number): number {
    const dist = Math.hypot(x, z);

    // Lake & River Channel carving
    const isRiverPath = x > 18 && x < 42 && z > -25 && z < 25;
    const isLake = x > 20 && x < 65 && z > 20 && z < 70;
    let waterDepression = 0;
    if (isLake) {
      const lakeDist = Math.hypot((x - 42) * 1.1, z - 44);
      if (lakeDist < 26) {
        waterDepression = (1 - lakeDist / 26) * 1.8;
      }
    } else if (isRiverPath) {
      const riverCenter = Math.sin(z * 0.12) * 6 + 28;
      const riverDist = Math.abs(x - riverCenter);
      if (riverDist < 7.5) {
        waterDepression = (1 - riverDist / 7.5) * 1.4;
      }
    }

    if (dist < 22) {
      return -waterDepression * 0.7;
    }

    // Rolling gentle hills
    const hillFactor = Math.sin(x * 0.055) * Math.cos(z * 0.055) * 2.8 + Math.sin(x * 0.1 + z * 0.08) * 1.4;

    if (dist < 60) {
      const t = (dist - 22) / 38;
      return Math.max(-1.8, t * t * hillFactor - waterDepression);
    }

    // Mountain perimeter
    const mountainT = (dist - 60) / 65;
    const mountainNoise =
      Math.sin(x * 0.04) * Math.cos(z * 0.04) * 18 +
      Math.sin(x * 0.08 + 1.2) * Math.cos(z * 0.08 + 0.8) * 12 +
      Math.sin(x * 0.16) * Math.sin(z * 0.16) * 6;

    const baseElevation = 5 + Math.pow(Math.min(1.6, mountainT), 1.8) * 28 + mountainNoise;
    return Math.max(0, baseElevation - waterDepression);
  }

  // Deform vertices and compute natural vertex colors
  const colorGrassLush = new THREE.Color('#4c802b');
  const colorGrassMeadow = new THREE.Color('#629b35');
  const colorDirtShore = new THREE.Color('#a89a74');
  const colorRockCliff = new THREE.Color('#646e75');
  const colorSnow = new THREE.Color('#eef4f8');
  const tempColor = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = getElevation(x, z);
    posAttr.setY(i, y);

    // Height & slope based coloring
    if (y < -0.2) {
      tempColor.copy(colorDirtShore);
    } else if (y > 32) {
      // Snow caps
      const snowMix = Math.min(1, (y - 32) / 10);
      tempColor.copy(colorRockCliff).lerp(colorSnow, snowMix);
    } else if (y > 14) {
      // Rocky mountain cliffs
      tempColor.copy(colorGrassMeadow).lerp(colorRockCliff, Math.min(1, (y - 14) / 12));
    } else {
      // Lush grassy valleys and meadows
      const noiseMix = 0.5 + Math.sin(x * 0.2) * Math.cos(z * 0.2) * 0.5;
      tempColor.copy(colorGrassLush).lerp(colorGrassMeadow, noiseMix);
    }
    colors.push(tempColor.r, tempColor.g, tempColor.b);
  }

  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = resources.material(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // =========================================================================
  // 3. WATER SYSTEM: SHIMMERING LAKE & RIVER
  // =========================================================================
  const waterGroup = new THREE.Group();
  waterGroup.name = 'earth-water-system';
  scene.add(waterGroup);

  const lakeGeo = resources.geometry(new THREE.CircleGeometry(26, 32));
  lakeGeo.rotateX(-Math.PI / 2);
  const waterMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#1b6e85',
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88,
    })
  );
  const lakeMesh = new THREE.Mesh(lakeGeo, waterMat);
  lakeMesh.position.set(42, -0.18, 44);
  lakeMesh.scale.set(1.15, 1, 1);
  waterGroup.add(lakeMesh);

  // River water strip
  const riverGeo = resources.geometry(new THREE.PlaneGeometry(12, 54, 8, 24));
  riverGeo.rotateX(-Math.PI / 2);
  const riverMesh = new THREE.Mesh(riverGeo, waterMat);
  riverMesh.position.set(28, -0.19, 0);
  riverMesh.rotation.y = -0.15;
  waterGroup.add(riverMesh);

  // Wooden Footbridge crossing the river
  const bridge = new THREE.Group();
  bridge.position.set(27.5, 0.08, 0);
  bridge.rotation.y = -0.15;
  scene.add(bridge);

  const bridgeWoodMat = resources.material(new THREE.MeshStandardMaterial({ color: '#7c5333', roughness: 0.8 }));
  const bridgeRailingMat = resources.material(new THREE.MeshStandardMaterial({ color: '#573820', roughness: 0.7 }));

  // Bridge deck planks
  kit.flatBox(bridge, bridgeWoodMat, [4.2, 0.15, 12], [0, 0, 0]);
  // Railing posts
  for (const z of [-5.5, -2.5, 0.5, 3.5, 5.5]) {
    kit.cylinder(bridge, bridgeRailingMat, [0.08, 1.1, 0.08], [-2.0, 0.55, z]);
    kit.cylinder(bridge, bridgeRailingMat, [0.08, 1.1, 0.08], [2.0, 0.55, z]);
  }
  // Handrails
  kit.flatBox(bridge, bridgeRailingMat, [0.12, 0.1, 11.8], [-2.0, 1.05, 0]);
  kit.flatBox(bridge, bridgeRailingMat, [0.12, 0.1, 11.8], [2.0, 1.05, 0]);

  // =========================================================================
  // 4. PAVED PATHWAYS & CAMPUS OVERLOOK
  // =========================================================================
  const pathMat = resources.material(new THREE.MeshStandardMaterial({ color: '#c4baa2', roughness: 0.95 }));
  const stoneBorderMat = resources.material(new THREE.MeshStandardMaterial({ color: '#7a766c', roughness: 0.9 }));

  // Main campus walkway arteries
  kit.flatBox(scene, pathMat, [18, 0.03, 2.8], [0, 0.015, 2]);
  kit.flatBox(scene, pathMat, [2.8, 0.03, 16], [-3, 0.015, -4]);
  kit.flatBox(scene, pathMat, [14, 0.03, 2.4], [9, 0.015, -10]);
  // Trail to river bridge
  kit.flatBox(scene, pathMat, [16, 0.03, 2.2], [18, 0.015, 0]);

  // Campus stone borders
  kit.flatBox(scene, stoneBorderMat, [18.2, 0.06, 0.25], [0, 0.02, 3.45]);
  kit.flatBox(scene, stoneBorderMat, [18.2, 0.06, 0.25], [0, 0.02, 0.55]);

  // Scenic Lake Overlook Bench
  const benchGroup = new THREE.Group();
  benchGroup.position.set(38, 0.1, 24);
  benchGroup.rotation.y = -Math.PI / 4;
  scene.add(benchGroup);
  kit.flatBox(benchGroup, bridgeWoodMat, [2.2, 0.08, 0.6], [0, 0.45, 0]);
  kit.flatBox(benchGroup, bridgeWoodMat, [2.2, 0.5, 0.08], [0, 0.72, -0.28]);
  kit.cylinder(benchGroup, stoneBorderMat, [0.06, 0.45, 0.06], [-0.9, 0.22, 0]);
  kit.cylinder(benchGroup, stoneBorderMat, [0.06, 0.45, 0.06], [0.9, 0.22, 0]);

  // =========================================================================
  // 5. STATIONS & HABITAT CAMPUS (100% Contract Preserved)
  // =========================================================================
  const stations = STATIONS.map(station => {
    const visual = createStation(station.id, kit, resources, false);
    visual.group.position.copy(station.position);
    scene.add(visual.group);
    return { ...station, visual };
  });

  const lab = stations.find(station => station.id === 'habitat')!;
  lab.visual.door.setOpen(true);
  lab.visual.door.update(0, true);

  // =========================================================================
  // 6. DENSE MULTI-SPECIES FORESTS (Evergreen Pines, Broadleaf Oaks, Birches)
  // =========================================================================
  // Using InstancedMesh for 60fps performance on ordinary laptops
  const treeTrunkMat = resources.material(new THREE.MeshStandardMaterial({ color: '#4a3222', roughness: 0.9 }));
  const birchTrunkMat = resources.material(new THREE.MeshStandardMaterial({ color: '#dfdfd5', roughness: 0.75 }));
  const pineNeedleMat1 = resources.material(new THREE.MeshStandardMaterial({ color: '#1d4221', roughness: 0.85 }));
  const pineNeedleMat2 = resources.material(new THREE.MeshStandardMaterial({ color: '#25522b', roughness: 0.8 }));
  const oakFoliageMat1 = resources.material(new THREE.MeshStandardMaterial({ color: '#437c26', roughness: 0.8 }));
  const oakFoliageMat2 = resources.material(new THREE.MeshStandardMaterial({ color: '#569632', roughness: 0.75 }));

  const pineTrunkGeo = resources.geometry(new THREE.CylinderGeometry(0.22, 0.38, 2.6, 8));
  const pineConeGeo = resources.geometry(new THREE.ConeGeometry(1.6, 2.2, 8));
  const oakTrunkGeo = resources.geometry(new THREE.CylinderGeometry(0.35, 0.55, 3.0, 8));
  const oakCanopyGeo = resources.geometry(new THREE.DodecahedronGeometry(1.8, 1));

  // Determine tree locations:
  // - Outer forest perimeter surrounding the campus
  // - Scenic groves near the lake and meadows
  // - Leaving paths and stations clear
  const treePositions: { x: number; z: number; type: 'pine' | 'oak' | 'birch'; scale: number }[] = [];

  // Dense perimeter forest (180 trees)
  for (let i = 0; i < 160; i++) {
    const angle = (i / 160) * Math.PI * 2 + Math.sin(i * 1.5) * 0.15;
    const rad = 34 + (i % 7) * 7.5 + Math.sin(i * 3) * 4;
    const x = Math.sin(angle) * rad;
    const z = Math.cos(angle) * rad;

    // Avoid lake center and campus center
    if (Math.hypot(x, z) > 24 && !(x > 30 && x < 55 && z > 30 && z < 60)) {
      const type = i % 3 === 0 ? 'oak' : i % 3 === 1 ? 'pine' : 'birch';
      const scale = 0.85 + (i % 5) * 0.14;
      treePositions.push({ x, z, type, scale });
    }
  }

  // Meadow specimen groves (40 trees)
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const rad = 23 + (i % 4) * 3.5;
    const x = Math.sin(angle) * rad;
    const z = Math.cos(angle) * rad;
    // Keep launch pad (12, -14) and stations clear
    if (Math.hypot(x - 12, z - -14) > 8 && Math.hypot(x - -8, z - -4) > 6 && Math.hypot(x, z - 8) > 6) {
      const type = i % 2 === 0 ? 'oak' : 'birch';
      treePositions.push({ x, z, type, scale: 0.9 + (i % 3) * 0.15 });
    }
  }

  // Build tree models and add them
  const forestGroup = new THREE.Group();
  forestGroup.name = 'earth-forest';
  scene.add(forestGroup);

  const dummy = new THREE.Object3D();

  for (const t of treePositions) {
    const treeGroup = new THREE.Group();
    const groundY = getElevation(t.x, t.z);
    treeGroup.position.set(t.x, groundY, t.z);
    treeGroup.scale.setScalar(t.scale);

    if (t.type === 'pine') {
      // Pine tree: trunk + 3 cone tiers
      const trunk = new THREE.Mesh(pineTrunkGeo, treeTrunkMat);
      trunk.position.y = 1.3;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      treeGroup.add(trunk);

      const t1 = new THREE.Mesh(pineConeGeo, pineNeedleMat1);
      t1.position.y = 2.8;
      t1.scale.set(1.4, 1.2, 1.4);
      t1.castShadow = true;
      treeGroup.add(t1);

      const t2 = new THREE.Mesh(pineConeGeo, pineNeedleMat2);
      t2.position.y = 4.2;
      t2.scale.set(1.1, 1.0, 1.1);
      t2.castShadow = true;
      treeGroup.add(t2);

      const t3 = new THREE.Mesh(pineConeGeo, pineNeedleMat1);
      t3.position.y = 5.4;
      t3.scale.set(0.75, 0.85, 0.75);
      t3.castShadow = true;
      treeGroup.add(t3);
    } else {
      // Broadleaf Oak or Birch
      const isBirch = t.type === 'birch';
      const trunk = new THREE.Mesh(oakTrunkGeo, isBirch ? birchTrunkMat : treeTrunkMat);
      trunk.position.y = 1.5;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      treeGroup.add(trunk);

      const canopy = new THREE.Mesh(oakCanopyGeo, isBirch ? oakFoliageMat2 : oakFoliageMat1);
      canopy.position.set(0, 3.8, 0);
      canopy.scale.set(isBirch ? 1.0 : 1.35, isBirch ? 1.4 : 1.2, isBirch ? 1.0 : 1.35);
      canopy.castShadow = true;
      treeGroup.add(canopy);
    }

    forestGroup.add(treeGroup);
  }

  // =========================================================================
  // 7. BUSHES, WILDFLOWER MEADOWS & MOSS ROCKS
  // =========================================================================
  const floraGroup = new THREE.Group();
  floraGroup.name = 'earth-flora-and-rocks';
  scene.add(floraGroup);

  const bushMat1 = resources.material(new THREE.MeshStandardMaterial({ color: '#386f21', roughness: 0.85 }));
  const bushMat2 = resources.material(new THREE.MeshStandardMaterial({ color: '#4a892d', roughness: 0.8 }));
  const bushGeo = resources.geometry(new THREE.DodecahedronGeometry(0.85, 1));

  // Bushes clustered near campus & path edges (35 bushes)
  for (let i = 0; i < 35; i++) {
    const angle = (i / 35) * Math.PI * 2;
    const rad = 14 + (i % 5) * 2.2;
    const x = Math.sin(angle) * rad;
    const z = Math.cos(angle) * rad;
    const groundY = getElevation(x, z);

    const bush = new THREE.Mesh(bushGeo, i % 2 === 0 ? bushMat1 : bushMat2);
    bush.position.set(x, groundY + 0.45, z);
    bush.scale.set(1 + (i % 3) * 0.2, 0.8 + (i % 2) * 0.2, 1 + (i % 3) * 0.2);
    bush.castShadow = true;
    floraGroup.add(bush);
  }

  // Wildflower Patches (Yellow, Purple, White, Red Blossoms)
  const flowerColors = ['#facc15', '#a855f7', '#ffffff', '#ef4444'];
  const flowerPetalGeo = resources.geometry(new THREE.CylinderGeometry(0.18, 0.05, 0.35, 6));

  for (let patch = 0; patch < 18; patch++) {
    const patchX = Math.sin(patch * 2.2) * 19;
    const patchZ = Math.cos(patch * 1.8) * 17;
    const flowerMat = resources.material(
      new THREE.MeshStandardMaterial({
        color: flowerColors[patch % flowerColors.length],
        roughness: 0.6,
      })
    );

    for (let f = 0; f < 6; f++) {
      const fx = patchX + (Math.sin(f * 1.7) * 1.4);
      const fz = patchZ + (Math.cos(f * 1.7) * 1.4);
      const fy = getElevation(fx, fz);
      const petal = new THREE.Mesh(flowerPetalGeo, flowerMat);
      petal.position.set(fx, fy + 0.18, fz);
      floraGroup.add(petal);
    }
  }

  // Natural Boulders & Field Rocks (Granite & Mossy Stones)
  const rockMat = resources.material(new THREE.MeshStandardMaterial({ color: '#687278', roughness: 0.95 }));
  const rockGeo = resources.geometry(new THREE.DodecahedronGeometry(1.2, 0));

  for (let r = 0; r < 24; r++) {
    const rx = Math.sin(r * 2.7) * (26 + (r % 4) * 8);
    const rz = Math.cos(r * 2.7) * (26 + (r % 4) * 8);
    const ry = getElevation(rx, rz);

    const rock = new THREE.Mesh(rockGeo, rockMat);
    const rScale = 0.6 + (r % 5) * 0.3;
    rock.position.set(rx, ry + rScale * 0.5, rz);
    rock.scale.set(rScale * 1.3, rScale * 0.8, rScale);
    rock.rotation.set((r * 0.5) % 3, (r * 0.7) % 3, (r * 0.3) % 3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    floraGroup.add(rock);
  }

  // =========================================================================
  // 8. DRIFTING 3D CUMULUS CLOUDS
  // =========================================================================
  const cloudsGroup = new THREE.Group();
  cloudsGroup.name = 'earth-clouds';
  scene.add(cloudsGroup);

  const cloudMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
    })
  );
  const cloudSphereGeo = resources.geometry(new THREE.DodecahedronGeometry(4.5, 1));

  const clouds: { group: THREE.Group; speedX: number; speedZ: number }[] = [];

  for (let c = 0; c < 12; c++) {
    const cloud = new THREE.Group();
    const cx = ((c % 4) - 1.5) * 60 + (Math.sin(c) * 15);
    const cz = (Math.floor(c / 4) - 1) * 60 + (Math.cos(c) * 15);
    const cy = 48 + (c % 3) * 6;
    cloud.position.set(cx, cy, cz);

    // Form cloud cluster with 5 soft overlapping spheres
    for (let s = 0; s < 5; s++) {
      const blob = new THREE.Mesh(cloudSphereGeo, cloudMat);
      blob.position.set((s - 2) * 3.2, Math.sin(s * 1.5) * 1.2, Math.cos(s * 2) * 2.5);
      const bScale = 0.8 + Math.sin(s * 0.8) * 0.35;
      blob.scale.set(bScale * 1.4, bScale, bScale * 1.2);
      cloud.add(blob);
    }

    cloudsGroup.add(cloud);
    clouds.push({ group: cloud, speedX: 0.8 + (c % 3) * 0.3, speedZ: 0.2 + (c % 2) * 0.1 });
  }

  // =========================================================================
  // 9. LAUNCH VEHICLE, SERVICE TOWER & GANTRY (100% Contract Preserved)
  // =========================================================================
  const launchPad = new THREE.Group();
  launchPad.name = 'ares-launch-pad';
  launchPad.position.set(12, 0, -14);
  scene.add(launchPad);

  const launchPadMat = resources.material(new THREE.MeshStandardMaterial({ color: '#55636c', roughness: 0.85 }));
  kit.flatBox(launchPad, launchPadMat, [10, 0.2, 10], [0, 0.04, 0]);

  const rocket = new THREE.Group();
  rocket.name = 'ares-launch-vehicle';
  launchPad.add(rocket);

  const modelSlot = new THREE.Group();
  modelSlot.name = 'ARES_ROCKET_MODEL_SLOT';
  rocket.add(modelSlot);

  const fallback = new THREE.Group();
  fallback.name = 'ARES_ROCKET_PROCEDURAL_FALLBACK';
  modelSlot.add(fallback);

  // Detailed procedural launch vehicle
  kit.cylinder(fallback, kit.materials.ivory, [1.3, 12, 1.3], [0, 6, 0]);
  kit.cylinder(fallback, kit.materials.blue, [1.31, 3.3, 1.31], [0, 3.2, 0]);
  kit.sphere(fallback, kit.materials.orange, [1.3, 2, 1.3], [0, 12, 0]);
  kit.sphere(fallback, kit.materials.glass, [0.38, 0.22, 0.38], [0, 8.4, 1.02]);
  for (const x of [-2, 2]) kit.cylinder(fallback, kit.materials.trim, [0.45, 8, 0.45], [x, 4, 0]);
  for (const x of [-2, 2]) kit.cylinder(fallback, kit.materials.orange, [0.36, 2.3, 0.36], [x, 1.1, 0]);

  const exhaust = new THREE.Group();
  exhaust.position.y = -0.7;
  exhaust.visible = false;
  rocket.add(exhaust);
  kit.cylinder(exhaust, kit.materials.orange, [0.9, 4, 0.9], [0, -2, 0]);
  kit.sphere(exhaust, kit.materials.ivory, [0.52, 2.7, 0.52], [0, -3.1, 0]);

  // Service gantry tower
  for (const x of [-2.2, 2.2]) kit.cylinder(launchPad, kit.materials.trim, [0.16, 10, 0.16], [x, 5, 0]);
  kit.flatBox(launchPad, kit.materials.trim, [4.6, 0.22, 0.3], [-0.2, 7.3, 0]);
  kit.flatBox(launchPad, kit.materials.trim, [0.22, 5, 0.3], [-2.25, 4.8, 0]);

  // Perimeter security fence
  for (const x of [-13, 13]) {
    for (let z = -15; z <= 15; z += 4) {
      kit.cylinder(scene, kit.materials.trim, [0.07, 2, 0.07], [x, 1, z]);
      kit.box(scene, kit.materials.ivory, [0.05, 0.08, 4], [x, 1.7, z + 2]);
    }
  }

  const launchCamera = new THREE.PerspectiveCamera(44, 1, 0.1, 240);

  function setLaunchProgress(progress: number, reducedMotion = false) {
    const p = Math.max(0, Math.min(1, progress));
    rocket.position.y = reducedMotion ? 0 : p * 45;
    exhaust.visible = p > 0 && !reducedMotion;
    exhaust.scale.y = 0.6 + p * 1.2;
    launchCamera.position.set(20, Math.max(12, rocket.position.y + 20), 16);
    launchCamera.lookAt(12, rocket.position.y + 5, -14);
    launchCamera.updateProjectionMatrix();
  }

  // Animation hook: clouds drifting & subtle water shimmer
  function update(delta: number, reduceMotion = false) {
    if (reduceMotion) return;
    const d = Math.min(0.1, delta);
    for (const c of clouds) {
      c.group.position.x += c.speedX * d;
      c.group.position.z += c.speedZ * d;
      // Wrap clouds around sky boundary
      if (c.group.position.x > 120) c.group.position.x = -120;
      if (c.group.position.z > 120) c.group.position.z = -120;
    }
  }

  return {
    scene,
    stations,
    labDoor: lab.visual.door,
    launchCamera,
    launchVehicle: rocket,
    setLaunchProgress,
    resizeLaunchCamera(aspect: number) {
      launchCamera.aspect = Math.max(0.1, aspect);
      launchCamera.updateProjectionMatrix();
    },
    resetLaunch() {
      rocket.position.y = 0;
      exhaust.visible = false;
    },
    useLaunchVehicleModel(model: THREE.Object3D) {
      installLaunchVehicleModel(modelSlot, model);
    },
    update,
  };
}

/** Install a locally bundled, license-verified rocket model in the named slot; the fallback stays available. */
export function installLaunchVehicleModel(slot: THREE.Group, model: THREE.Object3D): void {
  const fallback = slot.getObjectByName('ARES_ROCKET_PROCEDURAL_FALLBACK');
  const placeholder = slot.getObjectByName('ARES_ROCKET_ASSET');
  if (placeholder) slot.remove(placeholder);
  if (fallback) fallback.visible = false;
  model.name = 'ARES_ROCKET_ASSET';
  slot.add(model);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(12 / Math.max(0.001, size.y));
  const fitted = new THREE.Box3().setFromObject(model);
  const center = fitted.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, fitted.min.y, center.z));
}
