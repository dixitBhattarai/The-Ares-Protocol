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
  scene.fog = new THREE.Fog('#bfe1f0', 45, 175);
  scene.background = new THREE.Color('#98d1ea');

  const skyRadius = 190;
  const skyGeo = resources.geometry(new THREE.SphereGeometry(skyRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5));
  const skyHeight = 128;
  const skyData = new Uint8Array(4 * skyHeight);
  for (let i = 0; i < skyHeight; i++) {
    const t = i / (skyHeight - 1);
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

  function getElevation(x: number, z: number): number {
    const dist = Math.hypot(x, z);

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

    const hillFactor = Math.sin(x * 0.055) * Math.cos(z * 0.055) * 2.8 + Math.sin(x * 0.1 + z * 0.08) * 1.4;

    if (dist < 60) {
      const t = (dist - 22) / 38;
      return Math.max(-1.8, t * t * hillFactor - waterDepression);
    }

    const mountainT = (dist - 60) / 65;
    const mountainNoise =
      Math.sin(x * 0.04) * Math.cos(z * 0.04) * 18 +
      Math.sin(x * 0.08 + 1.2) * Math.cos(z * 0.08 + 0.8) * 12 +
      Math.sin(x * 0.16) * Math.sin(z * 0.16) * 6;

    const baseElevation = 5 + Math.pow(Math.min(1.6, mountainT), 1.8) * 28 + mountainNoise;
    return Math.max(0, baseElevation - waterDepression);
  }

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

    if (y < -0.2) {
      tempColor.copy(colorDirtShore);
    } else if (y > 32) {
      const snowMix = Math.min(1, (y - 32) / 10);
      tempColor.copy(colorRockCliff).lerp(colorSnow, snowMix);
    } else if (y > 14) {
      tempColor.copy(colorGrassMeadow).lerp(colorRockCliff, Math.min(1, (y - 14) / 12));
    } else {
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

  const riverGeo = resources.geometry(new THREE.PlaneGeometry(12, 54, 8, 24));
  riverGeo.rotateX(-Math.PI / 2);
  const riverMesh = new THREE.Mesh(riverGeo, waterMat);
  riverMesh.position.set(28, -0.19, 0);
  riverMesh.rotation.y = -0.15;
  waterGroup.add(riverMesh);

  const bridge = new THREE.Group();
  bridge.position.set(27.5, 0.08, 0);
  bridge.rotation.y = -0.15;
  scene.add(bridge);

  const bridgeWoodMat = resources.material(new THREE.MeshStandardMaterial({ color: '#7c5333', roughness: 0.8 }));
  const bridgeRailingMat = resources.material(new THREE.MeshStandardMaterial({ color: '#573820', roughness: 0.7 }));

  kit.flatBox(bridge, bridgeWoodMat, [4.2, 0.15, 12], [0, 0, 0]);
  for (const z of [-5.5, -2.5, 0.5, 3.5, 5.5]) {
    kit.cylinder(bridge, bridgeRailingMat, [0.08, 1.1, 0.08], [-2.0, 0.55, z]);
    kit.cylinder(bridge, bridgeRailingMat, [0.08, 1.1, 0.08], [2.0, 0.55, z]);
  }
  kit.flatBox(bridge, bridgeRailingMat, [0.12, 0.1, 11.8], [-2.0, 1.05, 0]);
  kit.flatBox(bridge, bridgeRailingMat, [0.12, 0.1, 11.8], [2.0, 1.05, 0]);

  // =========================================================================
  // 4. PAVED PATHWAYS & CAMPUS OVERLOOK
  // =========================================================================
  const pathMat = resources.material(new THREE.MeshStandardMaterial({ color: '#c4baa2', roughness: 0.95 }));
  const stoneBorderMat = resources.material(new THREE.MeshStandardMaterial({ color: '#7a766c', roughness: 0.9 }));

  kit.flatBox(scene, pathMat, [18, 0.03, 2.8], [0, 0.015, 2]);
  kit.flatBox(scene, pathMat, [2.8, 0.03, 16], [-3, 0.015, -4]);
  kit.flatBox(scene, pathMat, [14, 0.03, 2.4], [9, 0.015, -10]);
  kit.flatBox(scene, pathMat, [16, 0.03, 2.2], [18, 0.015, 0]);

  kit.flatBox(scene, stoneBorderMat, [18.2, 0.06, 0.25], [0, 0.02, 3.45]);
  kit.flatBox(scene, stoneBorderMat, [18.2, 0.06, 0.25], [0, 0.02, 0.55]);

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
  // 6. REALISTIC MULTI-SPECIES FORESTS (Procedural Textures + Organic Geometry)
  // =========================================================================
  function createBarkTexture(baseHex: string, streakHex: string, isBirch = false): THREE.DataTexture {
    const w = 64;
    const h = 128;
    const data = new Uint8Array(w * h * 4);
    const cBase = new THREE.Color(baseHex);
    const cStreak = new THREE.Color(streakHex);
    const tmp = new THREE.Color();

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let n = 0;
        if (isBirch) {
          const band = Math.sin(y * 0.9 + Math.sin(x * 0.25) * 2.0);
          const dash = Math.sin(x * 0.45 + y * 1.7);
          n = band > 0.78 && dash > 0.2 ? 0.85 : Math.abs(Math.sin(x * 0.3 + y * 0.1)) * 0.12;
        } else {
          const ridge = Math.sin(x * 0.65 + Math.sin(y * 0.12) * 1.8) * 0.5 + 0.5;
          const grain = Math.sin(x * 1.9 + y * 0.4) * 0.25 + 0.25;
          n = ridge * 0.7 + grain * 0.3;
        }
        tmp.copy(cBase).lerp(cStreak, n);
        const idx = (y * w + x) * 4;
        data[idx] = Math.round(tmp.r * 255);
        data[idx + 1] = Math.round(tmp.g * 255);
        data[idx + 2] = Math.round(tmp.b * 255);
        data[idx + 3] = 255;
      }
    }
    const tex = resources.texture(new THREE.DataTexture(data, w, h, THREE.RGBAFormat));
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 3);
    tex.needsUpdate = true;
    return tex;
  }

  function createFoliageTexture(darkHex: string, lightHex: string): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    const cDark = new THREE.Color(darkHex);
    const cLight = new THREE.Color(lightHex);
    const tmp = new THREE.Color();

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const leafCluster =
          Math.sin(x * 0.55) * Math.cos(y * 0.55) * 0.35 +
          Math.sin((x + y) * 0.9) * 0.25 +
          0.5;
        tmp.copy(cDark).lerp(cLight, Math.max(0, Math.min(1, leafCluster)));
        const idx = (y * size + x) * 4;
        data[idx] = Math.round(tmp.r * 255);
        data[idx + 1] = Math.round(tmp.g * 255);
        data[idx + 2] = Math.round(tmp.b * 255);
        data[idx + 3] = 255;
      }
    }
    const tex = resources.texture(new THREE.DataTexture(data, size, size, THREE.RGBAFormat));
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.needsUpdate = true;
    return tex;
  }

  function organicDisplace(geo: THREE.BufferGeometry, amp: number, freq: number): THREE.BufferGeometry {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const disp =
        1 +
        amp *
          (Math.sin(vx * freq + vy * freq * 0.8) * 0.5 +
            Math.cos(vz * freq * 1.1 - vy * freq * 0.7) * 0.5);
      pos.setXYZ(i, vx * disp, vy * disp, vz * disp);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function createFlaredTrunkGeo(topR: number, botR: number, height: number): THREE.BufferGeometry {
    const geo = new THREE.CylinderGeometry(topR, botR, height, 10, 6);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const t = (vy + height * 0.5) / height;
      const angle = Math.atan2(vz, vx);
      const rootFlare = Math.pow(1 - t, 3) * (0.35 + 0.25 * Math.sin(angle * 5));
      const bendX = Math.sin(t * Math.PI) * 0.08;
      pos.setXYZ(i, vx * (1 + rootFlare) + bendX, vy, vz * (1 + rootFlare));
    }
    geo.computeVertexNormals();
    return resources.geometry(geo);
  }

  const oakBarkTex = createBarkTexture('#4e3624', '#2b1c11', false);
  const pineBarkTex = createBarkTexture('#583726', '#331d13', false);
  const birchBarkTex = createBarkTexture('#ecebe4', '#2c2c28', true);

  const treeTrunkMat = resources.material(
    new THREE.MeshStandardMaterial({ map: oakBarkTex, roughness: 0.92, bumpMap: oakBarkTex, bumpScale: 0.04 })
  );
  const pineTrunkMat = resources.material(
    new THREE.MeshStandardMaterial({ map: pineBarkTex, roughness: 0.94, bumpMap: pineBarkTex, bumpScale: 0.05 })
  );
  const birchTrunkMat = resources.material(
    new THREE.MeshStandardMaterial({ map: birchBarkTex, roughness: 0.78, bumpMap: birchBarkTex, bumpScale: 0.02 })
  );

  const pineNeedleTex = createFoliageTexture('#16381b', '#2b5e32');
  const oakLeafTex = createFoliageTexture('#33661d', '#5d9e38');
  const birchLeafTex = createFoliageTexture('#4c8527', '#86bd42');

  const pineNeedleMat1 = resources.material(new THREE.MeshStandardMaterial({ map: pineNeedleTex, roughness: 0.85 }));
  const pineNeedleMat2 = resources.material(
    new THREE.MeshStandardMaterial({ map: pineNeedleTex, color: '#a8d5a2', roughness: 0.82 })
  );
  const oakFoliageMat1 = resources.material(new THREE.MeshStandardMaterial({ map: oakLeafTex, roughness: 0.78 }));
  const oakFoliageMat2 = resources.material(
    new THREE.MeshStandardMaterial({ map: oakLeafTex, color: '#d8e89e', roughness: 0.75 })
  );
  const birchFoliageMat = resources.material(new THREE.MeshStandardMaterial({ map: birchLeafTex, roughness: 0.74 }));

  const pineTrunkGeo = createFlaredTrunkGeo(0.14, 0.36, 3.2);
  const pineBoughGeo = resources.geometry(organicDisplace(new THREE.ConeGeometry(1.65, 2.1, 10, 3), 0.16, 2.4));
  const oakTrunkGeo = createFlaredTrunkGeo(0.26, 0.52, 3.1);
  const branchGeo = resources.geometry(new THREE.CylinderGeometry(0.08, 0.16, 1.5, 6));
  const foliageLobeGeo = resources.geometry(organicDisplace(new THREE.IcosahedronGeometry(1.25, 2), 0.18, 2.1));

  const treePositions: { x: number; z: number; type: 'pine' | 'oak' | 'birch'; scale: number; rotY: number }[] = [];

  for (let i = 0; i < 160; i++) {
    const angle = (i / 160) * Math.PI * 2 + Math.sin(i * 1.5) * 0.15;
    const rad = 34 + (i % 7) * 7.5 + Math.sin(i * 3) * 4;
    const x = Math.sin(angle) * rad;
    const z = Math.cos(angle) * rad;

    if (Math.hypot(x, z) > 24 && !(x > 30 && x < 55 && z > 30 && z < 60)) {
      const type = i % 3 === 0 ? 'oak' : i % 3 === 1 ? 'pine' : 'birch';
      const scale = 0.85 + (i % 5) * 0.15;
      treePositions.push({ x, z, type, scale, rotY: (i * 2.399) % (Math.PI * 2) });
    }
  }

  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const rad = 23 + (i % 4) * 3.5;
    const x = Math.sin(angle) * rad;
    const z = Math.cos(angle) * rad;
    if (Math.hypot(x - 12, z - -14) > 8 && Math.hypot(x - -8, z - -4) > 6 && Math.hypot(x, z - 8) > 6) {
      const type = i % 2 === 0 ? 'oak' : 'birch';
      treePositions.push({ x, z, type, scale: 0.9 + (i % 3) * 0.16, rotY: (i * 1.7) % (Math.PI * 2) });
    }
  }

  const forestGroup = new THREE.Group();
  forestGroup.name = 'earth-forest';
  scene.add(forestGroup);

  const treeCanopies: { group: THREE.Group; phase: number }[] = [];

  for (let idx = 0; idx < treePositions.length; idx++) {
    const t = treePositions[idx];
    const treeGroup = new THREE.Group();
    const groundY = getElevation(t.x, t.z);
    treeGroup.position.set(t.x, groundY - 0.08, t.z);
    treeGroup.rotation.y = t.rotY;
    treeGroup.scale.setScalar(t.scale);

    const crownGroup = new THREE.Group();
    treeGroup.add(crownGroup);
    treeCanopies.push({ group: crownGroup, phase: idx * 0.7 });

    if (t.type === 'pine') {
      const trunk = new THREE.Mesh(pineTrunkGeo, pineTrunkMat);
      trunk.position.y = 1.6;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      treeGroup.add(trunk);

      const tiers = [
        { y: 2.3, sx: 1.35, sy: 0.95, mat: pineNeedleMat1, ry: 0.2 },
        { y: 3.3, sx: 1.15, sy: 0.95, mat: pineNeedleMat2, ry: 1.1 },
        { y: 4.25, sx: 0.92, sy: 0.9, mat: pineNeedleMat1, ry: 2.3 },
        { y: 5.1, sx: 0.68, sy: 0.85, mat: pineNeedleMat2, ry: 0.7 },
        { y: 5.85, sx: 0.42, sy: 0.8, mat: pineNeedleMat1, ry: 1.9 },
      ];
      for (const tier of tiers) {
        const bough = new THREE.Mesh(pineBoughGeo, tier.mat);
        bough.position.y = tier.y;
        bough.rotation.y = tier.ry;
        bough.scale.set(tier.sx, tier.sy, tier.sx);
        bough.castShadow = true;
        bough.receiveShadow = true;
        crownGroup.add(bough);
      }
    } else {
      const isBirch = t.type === 'birch';
      const barkMat = isBirch ? birchTrunkMat : treeTrunkMat;
      const trunk = new THREE.Mesh(oakTrunkGeo, barkMat);
      trunk.position.y = 1.55;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      treeGroup.add(trunk);

      const limbs = isBirch
        ? [
            { pos: [0.22, 2.8, 0.12], rot: [0.15, 0, -0.35], scale: 0.85 },
            { pos: [-0.2, 2.9, -0.15], rot: [-0.18, 0, 0.32], scale: 0.8 },
          ]
        : [
            { pos: [0.42, 2.75, 0.2], rot: [0.25, 0.3, -0.58], scale: 1.0 },
            { pos: [-0.45, 2.65, 0.15], rot: [0.2, -0.2, 0.62], scale: 0.95 },
            { pos: [0.05, 2.85, -0.42], rot: [-0.55, 0.1, -0.12], scale: 0.9 },
          ];

      for (const l of limbs) {
        const branch = new THREE.Mesh(branchGeo, barkMat);
        branch.position.set(l.pos[0], l.pos[1], l.pos[2]);
        branch.rotation.set(l.rot[0], l.rot[1], l.rot[2]);
        branch.scale.setScalar(l.scale);
        branch.castShadow = true;
        treeGroup.add(branch);
      }

      const lobes = isBirch
        ? [
            { pos: [0, 4.4, 0], scale: [1.05, 1.35, 1.05], mat: birchFoliageMat },
            { pos: [0.65, 3.7, 0.35], scale: [0.85, 1.0, 0.85], mat: birchFoliageMat },
            { pos: [-0.6, 3.85, -0.3], scale: [0.8, 1.05, 0.8], mat: birchFoliageMat },
            { pos: [0.1, 5.1, -0.15], scale: [0.72, 0.9, 0.72], mat: birchFoliageMat },
          ]
        : [
            { pos: [0, 4.25, 0], scale: [1.35, 1.15, 1.35], mat: oakFoliageMat1 },
            { pos: [1.05, 3.65, 0.45], scale: [1.05, 0.92, 1.0], mat: oakFoliageMat2 },
            { pos: [-1.0, 3.55, 0.35], scale: [1.0, 0.9, 1.05], mat: oakFoliageMat1 },
            { pos: [0.15, 3.75, -0.95], scale: [1.05, 0.95, 0.95], mat: oakFoliageMat2 },
            { pos: [-0.2, 4.75, 0.2], scale: [0.95, 0.85, 0.95], mat: oakFoliageMat2 },
          ];

      for (const lobe of lobes) {
        const mesh = new THREE.Mesh(foliageLobeGeo, lobe.mat);
        mesh.position.set(lobe.pos[0], lobe.pos[1], lobe.pos[2]);
        mesh.scale.set(lobe.scale[0], lobe.scale[1], lobe.scale[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        crownGroup.add(mesh);
      }
    }

    forestGroup.add(treeGroup);
  }

  // =========================================================================
  // 7. LAYERED SHRUBS, BOTANICAL WILDFLOWERS & WEATHERED MOSS ROCKS
  // =========================================================================
  const floraGroup = new THREE.Group();
  floraGroup.name = 'earth-flora-and-rocks';
  scene.add(floraGroup);

  const bushMat1 = resources.material(new THREE.MeshStandardMaterial({ map: oakLeafTex, roughness: 0.85 }));
  const bushMat2 = resources.material(
    new THREE.MeshStandardMaterial({ map: birchLeafTex, color: '#9ed17b', roughness: 0.8 })
  );
  const bushLobeGeo = resources.geometry(organicDisplace(new THREE.IcosahedronGeometry(0.65, 2), 0.2, 2.6));

  for (let i = 0; i < 35; i++) {
    const angle = (i / 35) * Math.PI * 2;
    const rad = 14 + (i % 5) * 2.2;
    const x = Math.sin(angle) * rad;
    const z = Math.cos(angle) * rad;
    const groundY = getElevation(x, z);

    const shrub = new THREE.Group();
    shrub.position.set(x, groundY, z);
    shrub.rotation.y = i * 1.1;

    const mainMat = i % 2 === 0 ? bushMat1 : bushMat2;
    const mainLobe = new THREE.Mesh(bushLobeGeo, mainMat);
    mainLobe.position.y = 0.42;
    mainLobe.scale.set(1.15, 0.85, 1.05);
    mainLobe.castShadow = true;
    mainLobe.receiveShadow = true;
    shrub.add(mainLobe);

    const sideLobe1 = new THREE.Mesh(bushLobeGeo, bushMat2);
    sideLobe1.position.set(0.45, 0.32, 0.25);
    sideLobe1.scale.set(0.75, 0.65, 0.75);
    sideLobe1.castShadow = true;
    shrub.add(sideLobe1);

    const sideLobe2 = new THREE.Mesh(bushLobeGeo, bushMat1);
    sideLobe2.position.set(-0.4, 0.3, -0.2);
    sideLobe2.scale.set(0.7, 0.6, 0.7);
    sideLobe2.castShadow = true;
    shrub.add(sideLobe2);

    floraGroup.add(shrub);
  }

  const stemGeo = resources.geometry(new THREE.CylinderGeometry(0.012, 0.018, 0.42, 5));
  stemGeo.translate(0, 0.21, 0);

  const leafBladeGeo = resources.geometry(new THREE.ConeGeometry(0.055, 0.22, 4));
  leafBladeGeo.scale(1, 1, 0.22);
  leafBladeGeo.rotateX(0.65);
  leafBladeGeo.translate(0, 0.08, 0.06);

  const blossomGeo = resources.geometry(new THREE.CylinderGeometry(0.13, 0.03, 0.07, 7, 1, true));
  blossomGeo.translate(0, 0.42, 0);

  const stamenGeo = resources.geometry(new THREE.SphereGeometry(0.035, 6, 5));
  stamenGeo.translate(0, 0.425, 0);

  const stemMat = resources.material(new THREE.MeshStandardMaterial({ color: '#3b7322', roughness: 0.75 }));
  const stamenMat = resources.material(
    new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.5, emissive: '#78350f', emissiveIntensity: 0.15 })
  );

  const flowerPalette = [
    new THREE.Color('#facc15'),
    new THREE.Color('#c084fc'),
    new THREE.Color('#f8fafc'),
    new THREE.Color('#f43f5e'),
    new THREE.Color('#60a5fa'),
  ];

  const blossomMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.45,
      side: THREE.DoubleSide,
    })
  );

  const flowerInstances: { x: number; y: number; z: number; scale: number; rotY: number; tilt: number; color: THREE.Color }[] = [];

  for (let patch = 0; patch < 28; patch++) {
    const angle = (patch / 28) * Math.PI * 2 + 0.3;
    const rad = 11 + (patch % 5) * 3.2;
    const patchX = Math.sin(angle) * rad;
    const patchZ = Math.cos(angle) * rad;

    if (Math.hypot(patchX - 12, patchZ - -14) < 7) continue;
    if (Math.abs(patchZ - 2) < 2.2 && Math.abs(patchX) < 10) continue;

    const primaryColor = flowerPalette[patch % flowerPalette.length];
    const secondaryColor = flowerPalette[(patch + 2) % flowerPalette.length];

    for (let f = 0; f < 14; f++) {
      const rOffset = 0.25 + ((f * 0.37) % 1.8);
      const theta = f * 2.39996;
      const fx = patchX + Math.cos(theta) * rOffset;
      const fz = patchZ + Math.sin(theta) * rOffset;
      const fy = getElevation(fx, fz);

      if (fy < -0.05) continue;

      flowerInstances.push({
        x: fx,
        y: fy,
        z: fz,
        scale: 0.75 + ((patch + f) % 5) * 0.14,
        rotY: theta,
        tilt: 0.08 + (f % 3) * 0.06,
        color: f % 4 === 0 ? secondaryColor : primaryColor,
      });
    }
  }

  const dummy = new THREE.Object3D();
  const totalFlowers = flowerInstances.length;
  if (totalFlowers > 0) {
    const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, totalFlowers);
    const leafInstA = new THREE.InstancedMesh(leafBladeGeo, stemMat, totalFlowers);
    const leafInstB = new THREE.InstancedMesh(leafBladeGeo, stemMat, totalFlowers);
    const blossomInst = new THREE.InstancedMesh(blossomGeo, blossomMat, totalFlowers);
    const stamenInst = new THREE.InstancedMesh(stamenGeo, stamenMat, totalFlowers);

    for (let i = 0; i < totalFlowers; i++) {
      const fl = flowerInstances[i];
      dummy.position.set(fl.x, fl.y, fl.z);
      dummy.rotation.set(Math.sin(fl.rotY) * fl.tilt, fl.rotY, Math.cos(fl.rotY) * fl.tilt);
      dummy.scale.setScalar(fl.scale);
      dummy.updateMatrix();

      stemInst.setMatrixAt(i, dummy.matrix);
      leafInstA.setMatrixAt(i, dummy.matrix);
      blossomInst.setMatrixAt(i, dummy.matrix);
      blossomInst.setColorAt(i, fl.color);
      stamenInst.setMatrixAt(i, dummy.matrix);

      dummy.rotateY(2.45);
      dummy.updateMatrix();
      leafInstB.setMatrixAt(i, dummy.matrix);
    }

    stemInst.instanceMatrix.needsUpdate = true;
    leafInstA.instanceMatrix.needsUpdate = true;
    leafInstB.instanceMatrix.needsUpdate = true;
    blossomInst.instanceMatrix.needsUpdate = true;
    if (blossomInst.instanceColor) blossomInst.instanceColor.needsUpdate = true;
    stamenInst.instanceMatrix.needsUpdate = true;

    floraGroup.add(stemInst, leafInstA, leafInstB, blossomInst, stamenInst);
  }

  const rockMat = resources.material(new THREE.MeshStandardMaterial({ color: '#687278', roughness: 0.95 }));
  const rockGeo = resources.geometry(organicDisplace(new THREE.DodecahedronGeometry(1.15, 1), 0.18, 2.2));

  for (let r = 0; r < 24; r++) {
    const rx = Math.sin(r * 2.7) * (26 + (r % 4) * 8);
    const rz = Math.cos(r * 2.7) * (26 + (r % 4) * 8);
    const ry = getElevation(rx, rz);

    const rock = new THREE.Mesh(rockGeo, rockMat);
    const rScale = 0.6 + (r % 5) * 0.3;
    rock.position.set(rx, ry + rScale * 0.42, rz);
    rock.scale.set(rScale * 1.3, rScale * 0.78, rScale);
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
    const cx = ((c % 4) - 1.5) * 60 + Math.sin(c) * 15;
    const cz = (Math.floor(c / 4) - 1) * 60 + Math.cos(c) * 15;
    const cy = 48 + (c % 3) * 6;
    cloud.position.set(cx, cy, cz);

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

  for (const x of [-2.2, 2.2]) kit.cylinder(launchPad, kit.materials.trim, [0.16, 10, 0.16], [x, 5, 0]);
  kit.flatBox(launchPad, kit.materials.trim, [4.6, 0.22, 0.3], [-0.2, 7.3, 0]);
  kit.flatBox(launchPad, kit.materials.trim, [0.22, 5, 0.3], [-2.25, 4.8, 0]);

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

  let elapsed = 0;
  function update(delta: number, reduceMotion = false) {
    if (reduceMotion) return;
    const d = Math.min(0.1, delta);
    elapsed += d;

    for (const c of clouds) {
      c.group.position.x += c.speedX * d;
      c.group.position.z += c.speedZ * d;
      if (c.group.position.x > 120) c.group.position.x = -120;
      if (c.group.position.z > 120) c.group.position.z = -120;
    }

    for (const canopy of treeCanopies) {
      canopy.group.rotation.z = Math.sin(elapsed * 1.3 + canopy.phase) * 0.018;
      canopy.group.rotation.x = Math.cos(elapsed * 1.1 + canopy.phase) * 0.014;
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