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

export function createTerrain(kit: ModelKit, resources: WorldResources): THREE.Group {
  const terrain = new THREE.Group();
  terrain.name = 'martian-landscape';

  const dustTex = createDustTexture(resources);
  const dust = resources.material(new THREE.MeshStandardMaterial({ map: dustTex, color: '#d5b4a0', roughness: 1 }));
  const desert = resources.material(new THREE.MeshStandardMaterial({ color: '#985039', roughness: 0.95 }));
  const darkBasalt = resources.material(new THREE.MeshStandardMaterial({ color: '#52251a', roughness: 0.97 }));
  const path = resources.material(new THREE.MeshStandardMaterial({ color: '#495351', roughness: 0.95 }));
  const paint = resources.material(new THREE.MeshBasicMaterial({ color: '#e5cfaa', transparent: true, opacity: 0.65 }));

  // =========================================================================
  // 1. PLAYABLE BASE PLAZA (PERFECTLY FLAT AT Y = 0 FOR COLLIDERS & DOORS)
  // =========================================================================
  kit.flatBox(terrain, dust, [38, 0.2, 38], [0, -0.1, 0]);

  // =========================================================================
  // 2. VAST SCULPTED MARTIAN DESERT, DUNES, CRATERS & MOUNTAIN CALDERAS
  // =========================================================================
  const terrainGeo = resources.geometry(new THREE.PlaneGeometry(320, 320, 80, 80));
  terrainGeo.rotateX(-Math.PI / 2);

  const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
  const vertCount = pos.count;
  const colors = new Float32Array(vertCount * 3);

  const cRed = new THREE.Color('#b44d32');
  const cDune = new THREE.Color('#d68656');
  const cBasalt = new THREE.Color('#46221a');
  const cRidge = new THREE.Color('#783827');
  const tempColor = new THREE.Color();

  for (let i = 0; i < vertCount; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);

    if (r < 18) {
      pos.setY(i, 0);
      cRed.toArray(colors, i * 3);
    } else {
      const blend = Math.min(1, (r - 18) / 14);

      // Procedural barchan sand dunes
      const dunes = (
        Math.sin(x * 0.08 + z * 0.04) * 1.5 +
        Math.cos(x * 0.04 - z * 0.07) * 1.3 +
        Math.sin((x + z) * 0.05) * 0.9
      ) * blend;

      // Primary impact crater at (-42, 36)
      const cd1 = Math.hypot(x - (-42), z - 36);
      let crater1 = 0;
      if (cd1 < 24) {
        crater1 = cd1 < 16
          ? -Math.cos((cd1 / 16) * Math.PI * 0.5) * 4.8
          : Math.sin(((cd1 - 16) / 8) * Math.PI) * 2.4;
      }

      // Secondary impact crater at (46, -34)
      const cd2 = Math.hypot(x - 46, z - (-34));
      let crater2 = 0;
      if (cd2 < 18) {
        crater2 = cd2 < 11
          ? -Math.cos((cd2 / 11) * Math.PI * 0.5) * 3.2
          : Math.sin(((cd2 - 11) / 7) * Math.PI) * 1.6;
      }

      // Dramatic mountain ridges and caldera walls for r > 50
      let mountains = 0;
      if (r > 50) {
        const mDist = (r - 50) / 45;
        const crags = (
          Math.sin(x * 0.038) * Math.cos(z * 0.038) * 18 +
          Math.cos(x * 0.075 + 1.2) * Math.sin(z * 0.068 - 0.7) * 9 +
          Math.abs(Math.sin(x * 0.024 + z * 0.024)) * 14
        );
        mountains = Math.max(0, crags * mDist);
      }

      const elev = (dunes + crater1 + crater2 + mountains) * blend;
      pos.setY(i, Math.max(-6.5, elev));

      // Vertex color blending
      if (elev < -1.0) {
        tempColor.copy(cBasalt);
      } else if (elev > 8.0) {
        tempColor.copy(cRidge);
      } else if (elev > 1.2) {
        tempColor.lerpColors(cRed, cDune, Math.min(1, (elev - 1.2) / 3));
      } else {
        tempColor.copy(cRed);
      }
      tempColor.toArray(colors, i * 3);
    }
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const sculptedMat = resources.material(
    new THREE.MeshStandardMaterial({
      map: dustTex,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.06,
    })
  );

  const sculptedTerrain = new THREE.Mesh(terrainGeo, sculptedMat);
  sculptedTerrain.name = 'sculpted-martian-terrain';
  sculptedTerrain.receiveShadow = true;
  terrain.add(sculptedTerrain);

  // =========================================================================
  // 3. RESEARCH STATIONS PADS & CONNECTING WALKWAYS
  // =========================================================================
  kit.box(terrain, path, [12, 0.008, 2.1], [0, 0.004, 0]);
  kit.box(terrain, path, [2.1, 0.008, 11.8], [0, 0.004, -0.1]);

  const padGeometry = resources.geometry(new THREE.CircleGeometry(4.5, 48));
  const rimGeometry = resources.geometry(new THREE.RingGeometry(4.4, 4.45, 48));
  const rimMaterial = resources.material(new THREE.MeshBasicMaterial({ color: '#b9c9bd' }));

  for (const station of STATIONS) {
    const pad = new THREE.Mesh(padGeometry, path);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(station.position.x, 0.009, station.position.z);
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(station.position.x, 0.012, station.position.z);
    terrain.add(pad, rim);
  }

  // Painted walkway guides stay flat and outside the station collision boxes
  for (const x of [-1.02, 1.02]) {
    for (let z = -4.2; z <= 4; z += 0.7) {
      kit.box(terrain, paint, [0.045, 0.002, 0.3], [x, 0.01, z]);
    }
  }
  for (const z of [-1.02, 1.02]) {
    for (const x of [-3, -2.3, -1.6, 1.6, 2.3, 3]) {
      kit.box(terrain, paint, [0.3, 0.002, 0.045], [x, 0.01, z]);
    }
  }

  const ring = resources.geometry(new THREE.RingGeometry(1.25, 1.35, 40));
  const landing = new THREE.Mesh(ring, resources.material(new THREE.MeshBasicMaterial({ color: '#e9c794', side: THREE.DoubleSide })));
  landing.rotation.x = -Math.PI / 2;
  landing.position.set(0, 0.012, 5);
  terrain.add(landing);

  for (const x of [-18.8, 18.8]) {
    for (let z = -18.8; z <= 18.8; z += 4.7) kit.box(terrain, path, [0.12, 0.01, 0.65], [x, 0.01, z]);
  }
  for (const z of [-18.8, 18.8]) {
    for (let x = -18.8; x <= 18.8; x += 4.7) kit.box(terrain, path, [0.65, 0.01, 0.12], [x, 0.01, z]);
  }

  // =========================================================================
  // 4. SURFACE DETAILS, ABANDONED EQUIPMENT & ALIEN ROCK FORMATIONS
  // =========================================================================
  terrain.add(createSurfaceDetails(resources));
  terrain.add(createAbandonedEquipment(kit, resources));
  terrain.add(createAlienRockFormations(kit, resources));

  // =========================================================================
  // 5. DETAILED SCATTERED BOULDERS & BASALT ROCKS
  // =========================================================================
  const rockGeometry = resources.geometry(new THREE.IcosahedronGeometry(1, 0));
  const darkRockGeometry = resources.geometry(new THREE.DodecahedronGeometry(1, 0));

  const rockCount = 100;
  const rocks = new THREE.InstancedMesh(rockGeometry, desert, rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;

  const darkRockCount = 50;
  const darkRocks = new THREE.InstancedMesh(darkRockGeometry, darkBasalt, darkRockCount);
  darkRocks.castShadow = true;
  darkRocks.receiveShadow = true;

  const transform = new THREE.Object3D();

  // Rust-orange oxidized boulders outside central base area
  for (let i = 0; i < rockCount; i++) {
    const angle = i * 2.399963;
    const radius = 22 + ((i * 19) % 45);
    const size = 0.28 + ((i * 13) % 11) * 0.16;
    transform.position.set(Math.cos(angle) * radius, -0.02, Math.sin(angle) * radius);
    transform.scale.set(size * 1.4, size * 0.7, size * 1.1);
    transform.rotation.set(i * 0.2, i * 1.1, 0.1);
    transform.updateMatrix();
    rocks.setMatrixAt(i, transform.matrix);
  }
  terrain.add(rocks);

  // Deep dark basalt rocks around ridges and craters
  for (let i = 0; i < darkRockCount; i++) {
    const angle = (i + 0.5) * 2.51327;
    const radius = 26 + ((i * 23) % 40);
    const size = 0.35 + ((i * 17) % 7) * 0.22;
    transform.position.set(Math.cos(angle) * radius, 0.05, Math.sin(angle) * radius);
    transform.scale.set(size * 1.2, size * 0.85, size * 1.3);
    transform.rotation.set(i * 0.3, i * 0.8, -0.2);
    transform.updateMatrix();
    darkRocks.setMatrixAt(i, transform.matrix);
  }
  terrain.add(darkRocks);

  return terrain;
}
