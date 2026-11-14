import * as THREE from 'three';
import { STATIONS, type StationId } from '../../contracts';
import { WorldResources, type ModelKit } from './resources';
import { createDustTexture, createSurfaceDetails, createAbandonedEquipment, createAlienRockFormations } from './landscape';
import { createSlidingDoor } from './doors';

export interface StationVisual {
  screens: THREE.MeshStandardMaterial[];
  roof: THREE.Group;
  walls: THREE.Mesh[];
  door: ReturnType<typeof createSlidingDoor>;
  group: THREE.Group;
  windows: THREE.MeshStandardMaterial;
  indicator: THREE.MeshStandardMaterial;
  beacon: THREE.MeshStandardMaterial;
  shelterPanels: THREE.Mesh[];
  selection: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
}

export const STATION_NAMES: Record<StationId, string> = {
  habitat: 'Habitat', solar: 'Solar station', greenhouse: 'Greenhouse',
};

export { createBuilding as createStation } from './buildings';

export function createGroundShadow(resources: WorldResources, width: number, depth: number): THREE.Mesh {
  const geometry = resources.geometry(new THREE.CircleGeometry(1, 24));
  const material = resources.material(new THREE.MeshBasicMaterial({ color: '#352c32', transparent: true, opacity: .16, depthWrite: false }));
  const shadow = new THREE.Mesh(geometry, material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(width, depth, 1);
  shadow.position.y = .014;
  return shadow;
}

/** Quintic smootherstep with zero first and second derivatives at boundaries (C2 continuity). */
function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function createTerrain(kit: ModelKit, resources: WorldResources): THREE.Group {
  const terrain = new THREE.Group();
  terrain.name = 'martian-landscape';

  const dustTex = createDustTexture(resources);
  const desertMat = resources.material(new THREE.MeshStandardMaterial({ color: '#9e4e37', roughness: 0.94 }));
  const darkBasaltMat = resources.material(new THREE.MeshStandardMaterial({ color: '#4e261e', roughness: 0.97 }));
  const pathMat = resources.material(new THREE.MeshStandardMaterial({ color: '#495351', roughness: 0.95 }));
  const padMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#495351',
      roughness: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const rimMat = resources.material(
    new THREE.MeshBasicMaterial({
      color: '#b9c9bd',
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  const paintMat = resources.material(new THREE.MeshBasicMaterial({ color: '#e5cfaa', transparent: true, opacity: 0.65 }));

  // =========================================================================
  // 1. SEAMLESS SCULPTED MARTIAN TERRAIN (SINGLE UNIFIED GROUND SURFACE)
  //
  // Root cause fix for Z-fighting and overlapping geometry:
  // Instead of an overlapping flatBox at Y=0 and a terrain plane fighting for the
  // exact same space, this single continuous mesh forms the entire landscape.
  // The central station plaza (r <= 18) is mathematically level at Y=0 for
  // Rapier colliders and doorway transitions, then departs with zero initial slope
  // via quintic smootherstep into natural barchan dunes, craters, and calderas.
  // =========================================================================
  const segments = 160;
  const terrainGeo = resources.geometry(new THREE.PlaneGeometry(320, 320, segments, segments));
  terrainGeo.rotateX(-Math.PI / 2);

  const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
  const vertCount = pos.count;

  // 1A. Compute smooth continuous terrain elevations
  for (let i = 0; i < vertCount; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);

    if (r <= 18) {
      // Central research outpost plateau: strictly flat at Y=0
      pos.setY(i, 0);
    } else {
      // Quintic smootherstep departure from base plateau: zero slope at r=18 and r=36
      const blend = smootherstep(18, 36, r);

      // Barchan sand dunes: rotated along prevailing Martian wind vector (~26 degrees)
      const uDune = x * 0.07 + z * 0.035;
      const vDune = -x * 0.035 + z * 0.07;
      const dunes = (
        Math.sin(uDune) * 1.35 +
        Math.cos(vDune * 0.8) * 1.1 +
        Math.sin(uDune * 1.7 - vDune * 0.5) * 0.55
      ) * blend;

      // Primary Impact Crater at (-42, 36): smooth C1 continuous bowl and raised ejecta rim
      const d1 = Math.hypot(x - (-42), z - 36);
      let crater1 = 0;
      if (d1 < 15) {
        // Smooth parabolic bowl depression
        crater1 = -4.2 * (1 - smootherstep(0, 15, d1));
      }
      if (d1 >= 11 && d1 <= 27) {
        // Smooth raised ejecta rim with zero derivative at boundaries
        const rimPhase = (d1 - 11) / 16;
        crater1 += 1.85 * Math.pow(Math.sin(rimPhase * Math.PI), 2);
      }

      // Secondary Impact Crater at (46, -34)
      const d2 = Math.hypot(x - 46, z - (-34));
      let crater2 = 0;
      if (d2 < 11) {
        crater2 = -2.6 * (1 - smootherstep(0, 11, d2));
      }
      if (d2 >= 8 && d2 <= 20) {
        const rimPhase2 = (d2 - 8) / 12;
        crater2 += 1.25 * Math.pow(Math.sin(rimPhase2 * Math.PI), 2);
      }

      // Majestic Caldera Mountain Horizon for r > 48m
      let mountains = 0;
      if (r > 48) {
        const mDist = smootherstep(48, 125, r);
        const crags = (
          Math.sin(x * 0.032) * Math.cos(z * 0.032) * 20 +
          Math.cos(x * 0.065 + 1.2) * Math.sin(z * 0.058 - 0.7) * 9 +
          Math.abs(Math.sin(x * 0.02 + z * 0.02)) * 14
        );
        mountains = Math.max(0, crags) * mDist;
      }

      const elev = (dunes + crater1 + crater2 + mountains) * blend;
      pos.setY(i, Math.max(-6.5, elev));
    }
  }

  // 1B. Compute smooth vertex normals across the entire sculpted surface
  terrainGeo.computeVertexNormals();

  // 1C. Authentic NASA Mars photography vertex color blending
  // Eliminates uneven red patches by smoothly blending tones based on elevation and slope:
  // - Warm oxidized iron regolith (predominant Martian soil)
  // - Fine golden-ochre dust on sunlit dune crests
  // - Dark volcanic basalt in depressions and steep cliff faces
  // - Weathered basaltic bedrock on high mountain ridges
  const norm = terrainGeo.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(vertCount * 3);

  const cRegolith = new THREE.Color('#b65c3c');
  const cDune = new THREE.Color('#d37d4f');
  const cBasalt = new THREE.Color('#46241c');
  const cRidge = new THREE.Color('#723427');
  const vertCol = new THREE.Color();

  for (let i = 0; i < vertCount; i++) {
    const y = pos.getY(i);
    const ny = norm.getY(i); // 1.0 for flat ground, < 0.85 for steep slopes
    const slope = Math.max(0, 1.0 - ny);

    // Continuous elevation factor
    const elevFactor = smootherstep(-2, 12, y);

    // Base color from elevation
    if (y < 0) {
      vertCol.lerpColors(cBasalt, cRegolith, smootherstep(-4, 0, y));
    } else {
      vertCol.lerpColors(cRegolith, cRidge, elevFactor);
    }

    // Dune crest warm golden dust highlight on gentle sunlit crests
    if (y > 0.4 && y < 5.0 && slope < 0.18) {
      const duneBlend = smootherstep(0.4, 2.0, y) * (1.0 - smootherstep(0.08, 0.18, slope));
      vertCol.lerp(cDune, duneBlend * 0.55);
    }

    // Exposed dark rocky basalt on steep slopes
    if (slope > 0.12) {
      const slopeBlend = smootherstep(0.12, 0.42, slope);
      vertCol.lerp(cBasalt, slopeBlend * 0.7);
    }

    vertCol.toArray(colors, i * 3);
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const sculptedMat = resources.material(
    new THREE.MeshStandardMaterial({
      map: dustTex,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.05,
    })
  );

  const sculptedTerrain = new THREE.Mesh(terrainGeo, sculptedMat);
  sculptedTerrain.name = 'sculpted-martian-terrain';
  sculptedTerrain.receiveShadow = true;
  terrain.add(sculptedTerrain);

  // =========================================================================
  // 2. RESEARCH STATIONS PADS & CONNECTING WALKWAYS (ZERO Z-FIGHTING)
  //
  // Every layer has an explicit, non-overlapping elevation above Y=0 plus
  // hardware polygon offsets so the depth buffer resolves cleanly at all distances.
  // =========================================================================
  // Walkway paths: top surface at Y = 0.018m
  kit.box(terrain, pathMat, [12, 0.018, 2.1], [0, 0.009, 0]);
  kit.box(terrain, pathMat, [2.1, 0.018, 11.8], [0, 0.009, -0.1]);

  // Station circular pads at Y = 0.021m and protective rims at Y = 0.025m
  const padGeometry = resources.geometry(new THREE.CircleGeometry(4.5, 48));
  const rimGeometry = resources.geometry(new THREE.RingGeometry(4.4, 4.45, 48));

  for (const station of STATIONS) {
    const pad = new THREE.Mesh(padGeometry, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(station.position.x, 0.021, station.position.z);
    const rim = new THREE.Mesh(rimGeometry, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(station.position.x, 0.025, station.position.z);
    terrain.add(pad, rim);
  }

  // Painted walkway guides: top surface at Y = 0.023m
  for (const x of [-1.02, 1.02]) {
    for (let z = -4.2; z <= 4; z += 0.7) {
      kit.box(terrain, paintMat, [0.045, 0.004, 0.3], [x, 0.021, z]);
    }
  }
  for (const z of [-1.02, 1.02]) {
    for (const x of [-3, -2.3, -1.6, 1.6, 2.3, 3]) {
      kit.box(terrain, paintMat, [0.3, 0.004, 0.045], [x, 0.021, z]);
    }
  }

  // Landing circle at Y = 0.026m
  const ring = resources.geometry(new THREE.RingGeometry(1.25, 1.35, 40));
  const landingMat = resources.material(
    new THREE.MeshBasicMaterial({
      color: '#e9c794',
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  const landing = new THREE.Mesh(ring, landingMat);
  landing.rotation.x = -Math.PI / 2;
  landing.position.set(0, 0.026, 5);
  terrain.add(landing);

  // Outer perimeter survey markers at Y = 0.022m
  for (const x of [-18.8, 18.8]) {
    for (let z = -18.8; z <= 18.8; z += 4.7) kit.box(terrain, pathMat, [0.12, 0.016, 0.65], [x, 0.014, z]);
  }
  for (const z of [-18.8, 18.8]) {
    for (let x = -18.8; x <= 18.8; x += 4.7) kit.box(terrain, pathMat, [0.65, 0.016, 0.12], [x, 0.014, z]);
  }

  // =========================================================================
  // 3. SURFACE DETAILS, ABANDONED EQUIPMENT & ALIEN ROCK FORMATIONS
  // =========================================================================
  terrain.add(createSurfaceDetails(resources));
  terrain.add(createAbandonedEquipment(kit, resources));
  terrain.add(createAlienRockFormations(kit, resources));

  // =========================================================================
  // 4. SCATTERED BOULDERS & BASALT ROCKS NATURALLY EMBEDDED IN REGOLITH
  //
  // Embedded depths (-0.08m to -0.16m) ensure rocks sit naturally in sand dunes
  // without floating or harsh intersecting ground lines.
  // =========================================================================
  const rockGeometry = resources.geometry(new THREE.IcosahedronGeometry(1, 0));
  const darkRockGeometry = resources.geometry(new THREE.DodecahedronGeometry(1, 0));

  const rockCount = 100;
  const rocks = new THREE.InstancedMesh(rockGeometry, desertMat, rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;

  const darkRockCount = 50;
  const darkRocks = new THREE.InstancedMesh(darkRockGeometry, darkBasaltMat, darkRockCount);
  darkRocks.castShadow = true;
  darkRocks.receiveShadow = true;

  const transform = new THREE.Object3D();

  // Rust-orange oxidized boulders outside central base area
  for (let i = 0; i < rockCount; i++) {
    const angle = i * 2.399963;
    const radius = 22 + ((i * 19) % 45);
    const size = 0.28 + ((i * 13) % 11) * 0.16;
    // Naturally embedded into the terrain surface
    transform.position.set(Math.cos(angle) * radius, -0.09, Math.sin(angle) * radius);
    transform.scale.set(size * 1.4, size * 0.7, size * 1.1);
    transform.rotation.set(i * 0.2, i * 1.1, 0.1);
    transform.updateMatrix();
    rocks.setMatrixAt(i, transform.matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  terrain.add(rocks);

  // Deep dark basalt rocks around ridges and craters
  for (let i = 0; i < darkRockCount; i++) {
    const angle = (i + 0.5) * 2.51327;
    const radius = 26 + ((i * 23) % 40);
    const size = 0.35 + ((i * 17) % 7) * 0.22;
    transform.position.set(Math.cos(angle) * radius, -0.06, Math.sin(angle) * radius);
    transform.scale.set(size * 1.2, size * 0.85, size * 1.3);
    transform.rotation.set(i * 0.3, i * 0.8, -0.2);
    transform.updateMatrix();
    darkRocks.setMatrixAt(i, transform.matrix);
  }
  darkRocks.instanceMatrix.needsUpdate = true;
  terrain.add(darkRocks);

  return terrain;
}
