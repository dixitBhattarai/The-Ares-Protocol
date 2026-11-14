import * as THREE from 'three';
import { BUILDING_HALF_SIZE, type StationId } from '../../contracts';
import type { StationVisual } from './models';
import type { ModelKit, WorldResources } from './resources';
import { createSlidingDoor } from './doors';
import { dressRoom, furnishRoom } from './interiors';
import { createWorkMachines } from './work-machines';

/**
 * Futuristic, scientifically realistic NASA-style colony modules:
 * - HABITAT: Pressurized cylindrical module with rounded aerodynamic bulkheads, titanium rib rings,
 *   airlock chamber vestibule, illuminated portholes, and micrometeoroid radiation canopy.
 * - GREENHOUSE: Beautiful faceted Geodesic Biodome with transparent polymer glass panels, glowing
 *   photosynthetic pink/magenta LED grow-lights, hydroponic farming carousels, and climate ducts.
 * - SOLAR: High-tech clean-room research laboratory with expansive deployable photovoltaic wings,
 *   lithium-sulfur energy storage nacelles, cryogenic radiator fins, and laser spectrometer.
 *
 * All hollow station models strictly stay within documented building envelopes (x, z in [-3.3, 3.3], y in [-1.1, 2.3]).
 */
export function createBuilding(id: StationId, kit: ModelKit, resources: WorldResources, work = true): StationVisual {
  const group = new THREE.Group();
  group.name = id;
  group.userData.stationId = id;

  const room = new THREE.Group();
  room.position.y = -1;
  group.add(room);

  // Materials & Aesthetics
  const windows = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#96dcca',
      emissive: '#76c5cf',
      emissiveIntensity: 0.25,
      roughness: 0.25,
      metalness: 0.15,
    })
  );
  const indicator = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#bce9b3',
      emissive: '#8ab982',
      emissiveIntensity: 0.35,
    })
  );
  const beacon = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#91d0a3',
      emissive: '#91d0a3',
      emissiveIntensity: 0.3,
    })
  );

  // High-tech aerospace materials
  const titaniumRibMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#42515a',
      metalness: 0.8,
      roughness: 0.25,
    })
  );
  const domeGlassMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#8fe8d0',
      transparent: true,
      opacity: 0.38,
      roughness: 0.15,
      metalness: 0.2,
      side: THREE.DoubleSide,
    })
  );
  const growLightMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#ff55aa',
      emissive: '#ff3388',
      emissiveIntensity: 0.75,
      roughness: 0.2,
    })
  );
  const cyanAccentMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#38d9d9',
      emissive: '#20b2aa',
      emissiveIntensity: 0.6,
      roughness: 0.2,
    })
  );
  const airlockFrameMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#2a343d',
      metalness: 0.85,
      roughness: 0.3,
    })
  );

  const h = BUILDING_HALF_SIZE;
  const walls: THREE.Mesh[] = [];

  // Interior surfaces must render and obstruct follow camera from either side
  kit.materials.ivory.side = THREE.DoubleSide;
  kit.materials.trim.side = THREE.DoubleSide;

  // Solid pressurized foundation base
  kit.flatBox(room, kit.materials.trim, [6.5, 0.1, 6.5], [0, -0.05, 0]);

  // Wall enclosure: transparent geodesic biodome walls for greenhouse, composite ivory for habitat/solar
  const wallMaterial = id === 'greenhouse' ? domeGlassMat : kit.materials.ivory;

  // Hollow building perimeter walls with front doorway opening
  for (const x of [-h + 0.1, h - 0.1]) {
    walls.push(kit.flatBox(room, wallMaterial, [0.2, 2.6, h * 2], [x, 1.3, 0]));
  }
  walls.push(kit.flatBox(room, wallMaterial, [h * 2, 2.6, 0.2], [0, 1.3, -h + 0.1]));
  for (const x of [-2, 2]) {
    walls.push(kit.flatBox(room, kit.materials.ivory, [2.4, 2.6, 0.2], [x, 1.3, h - 0.1]));
  }
  kit.box(room, kit.materials.trim, [1.6, 0.35, 0.2], [0, 2.42, h - 0.1]);

  // =========================================================================
  // 1. FUTURISTIC ARCHITECTURAL FEATURES PER STATION TYPE
  // =========================================================================

  if (id === 'habitat') {
    // Structural titanium reinforcement rings encircling pressurized cylindrical hull
    for (const z of [-2.4, -1.2, 0, 1.2]) {
      kit.box(room, titaniumRibMat, [6.52, 0.08, 0.14], [0, 1.3, z]);
      kit.box(room, titaniumRibMat, [6.52, 0.08, 0.14], [0, 2.58, z]);
    }
    // Lateral observation portholes with subtle cyan interior glow
    for (const z of [-1.8, 0.6]) {
      kit.box(room, windows, [0.06, 0.65, 0.85], [-h + 0.08, 1.6, z]);
      kit.box(room, windows, [0.06, 0.65, 0.85], [h - 0.08, 1.6, z]);
    }
    // Airlock portal collar at front entrance
    kit.box(room, airlockFrameMat, [1.88, 2.2, 0.18], [0, 1.15, h - 0.02]);
    // Decompression indicator bezel above airlock
    kit.box(room, cyanAccentMat, [0.65, 0.08, 0.06], [0, 2.32, h + 0.06]);
  } else if (id === 'greenhouse') {
    // Geodesic Biodome strut framework & vertical hydroponic grow towers
    for (const x of [-2.4, 0, 2.4]) {
      kit.box(room, titaniumRibMat, [0.08, 2.6, 0.08], [x, 1.3, -h + 0.1]);
    }
    for (const z of [-1.8, 0.6]) {
      kit.box(room, titaniumRibMat, [0.08, 2.6, 0.08], [-h + 0.1, 1.3, z]);
      kit.box(room, titaniumRibMat, [0.08, 2.6, 0.08], [h - 0.1, 1.3, z]);
    }
    // Photosynthetic LED grow-light overhead arrays (pink/magenta wavelengths)
    for (const x of [-1.6, 1.6]) {
      kit.flatBox(room, growLightMat, [0.15, 0.04, 4.8], [x, 2.55, 0]);
      kit.flatBox(room, cyanAccentMat, [0.06, 0.03, 4.8], [x + (x > 0 ? -0.18 : 0.18), 2.55, 0]);
    }
  } else if (id === 'solar') {
    // High-tech research laboratory: clean-room bevels, energy nacelles & conduit trays
    for (const z of [-2.2, -0.6, 1.0]) {
      kit.box(room, titaniumRibMat, [6.52, 0.06, 0.12], [0, 1.3, z]);
    }
    // High-capacity lithium-sulfur energy storage pods on outer flanks
    for (const x of [-h + 0.05, h - 0.05]) {
      kit.box(room, kit.materials.dark, [0.12, 1.4, 1.8], [x, 0.9, -0.8]);
      kit.box(room, indicator, [0.14, 0.08, 1.5], [x, 1.65, -0.8]);
    }
    // Laser spectrograph sample analysis window
    kit.box(room, windows, [0.06, 0.5, 1.2], [-h + 0.08, 1.6, 0.8]);
  }

  // Furnish interiors and add work machines
  const { steel } = dressRoom(room, kit, resources);

  const screens = [0, 1, 2].map(() =>
    resources.material(
      new THREE.MeshStandardMaterial({
        color: '#80cbda',
        emissive: '#18374e',
        emissiveIntensity: 0.5,
      })
    )
  );

  screens.forEach((screen, index) => {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#153743';
      context.fillRect(0, 0, 256, 128);
      context.fillStyle = '#d7fff2';
      context.textAlign = 'center';
      context.font = 'bold 58px sans-serif';
      context.fillText(String(index + 1), 128, 72);
      context.font = '18px sans-serif';
      context.fillText(id.toUpperCase(), 128, 108);
      const texture = resources.texture(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      screen.map = texture;
    }
  });

  const equipment = new THREE.Group();
  room.add(equipment);
  furnishRoom(equipment, id, kit, screens, steel);

  if (work) createWorkMachines(id, room, kit, resources);

  const accent = { habitat: '#ffbd78', solar: '#a8dfff', greenhouse: '#94edac' }[id];
  const practical = new THREE.PointLight(accent, 7, 7, 2);
  practical.position.set(0, 2.2, 0.4);
  room.add(practical);

  const lamp = resources.material(new THREE.MeshBasicMaterial({ color: accent }));
  for (const x of [-2.4, 2.4]) {
    kit.flatBox(room, lamp, [0.08, 0.05, 5.2], [x, 2.36, 0]);
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#162b36';
      ctx.fillRect(0, 0, 512, 96);
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = accent;
      ctx.fillText(
        { habitat: '01  HABITAT', solar: '02  SOLAR LAB', greenhouse: '03  GREENHOUSE' }[id],
        256,
        62
      );
      const texture = resources.texture(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      kit.flatBox(room, resources.material(new THREE.MeshBasicMaterial({ map: texture })), [2.8, 0.48, 0.035], [0, 2.45, h + 0.025]);
    }
  }

  // =========================================================================
  // 2. ROOF STRUCTURES: GEODESIC DOME, SOLAR WINGS & HABITAT CANOPY
  // =========================================================================
  const roof = new THREE.Group();
  room.add(roof);

  kit.flatBox(roof, kit.materials.trim, [6.45, 0.16, 6.45], [0, 2.7, 0]);

  const panelMaterial = id === 'solar'
    ? resources.material(new THREE.MeshStandardMaterial({ color: '#1a3348', metalness: 0.82, roughness: 0.2 }))
    : kit.materials.blue;

  if (id === 'solar') {
    // Expansive deployable photovoltaic wing panels with silver interconnects
    for (const x of [-1.6, 1.6]) {
      kit.box(roof, panelMaterial, [2.8, 0.08, 5.7], [x, 2.83, 0]);
      for (let z = -2.5; z < 2.6; z += 0.6) {
        kit.flatBox(roof, windows, [2.65, 0.02, 0.48], [x, 2.89, z]);
      }
    }
    // High-gain communications microwave feed horn & laser spectrograph turret
    kit.cylinder(roof, titaniumRibMat, [0.06, 0.25, 0.06], [0, 2.92, -1.8]);
    kit.sphere(roof, indicator, [0.09, 0.09, 0.09], [0, 3.1, -1.8]);
  } else if (id === 'greenhouse') {
    // Transparent Geodesic Biodome Canopy spanning the greenhouse roof (height-constrained to envelope)
    const domeMesh = kit.sphere(roof, domeGlassMat, [2.85, 0.42, 2.85], [0, 2.84, 0]);

    // Geodesic structural rib rings
    const ring1 = new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(2.1, 0.035, 6, 24)), titaniumRibMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.set(0, 2.96, 0);
    roof.add(ring1);

    const ring2 = new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(1.2, 0.035, 6, 20)), titaniumRibMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.set(0, 3.14, 0);
    roof.add(ring2);
  } else if (id === 'habitat') {
    // Micrometeoroid impact shield canopy & communications dish
    kit.box(roof, titaniumRibMat, [5.8, 0.06, 5.8], [0, 2.81, 0]);
    // Satellite dish mount (strictly within envelope bounds <= 2.3 in group coords)
    kit.cylinder(roof, titaniumRibMat, [0.05, 0.12, 0.05], [-1.8, 2.87, -1.8]);
    const dish = new THREE.Mesh(resources.geometry(new THREE.ConeGeometry(0.24, 0.1, 16)), titaniumRibMat);
    dish.position.set(-1.8, 2.95, -1.8);
    dish.rotation.x = 0.3;
    roof.add(dish);
  }

  // Storm shelter protective window shutters
  const shelterPanels: THREE.Mesh[] = [];
  for (const x of [-2, 2]) {
    kit.box(room, windows, [1.45, 0.65, 0.04], [x, 1.6, h + 0.01]);
    const panel = kit.box(room, kit.materials.blue, [1.5, 0.7, 0.03], [x, 1.6, h + 0.04]);
    panel.scale.y = 0.01;
    shelterPanels.push(panel);
  }

  kit.box(room, indicator, [0.5, 0.09, 0.04], [0, 2.55, h + 0.04]);
  kit.sphere(room, beacon, [0.1, 0.1, 0.1], [h - 0.3, 2.9, h - 0.3]);

  // Sliding pressure airlock door
  const door = createSlidingDoor(kit, id, false);
  door.group.position.set(0, 1.12, h - 0.03);
  door.group.scale.set(1.15, 1.2, 1);
  room.add(door.group);

  const envelope = resources.geometry(new THREE.BoxGeometry(6.7, 3.3, 6.7));
  const selection = new THREE.LineSegments(
    resources.geometry(new THREE.EdgesGeometry(envelope)),
    resources.material(new THREE.LineBasicMaterial({ color: '#ffe0a2' }))
  );
  selection.position.y = 0.5;
  selection.visible = false;

  return { group, windows, indicator, beacon, shelterPanels, selection, door, screens, roof, walls };
}

