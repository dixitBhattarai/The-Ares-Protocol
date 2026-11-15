import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BUILDING_HALF_SIZE, type StationId } from '../../contracts';
import type { StationVisual } from './models';
import type { ModelKit, WorldResources } from './resources';
import { createSlidingDoor } from './doors';
import { dressRoom, furnishRoom } from './interiors';
import { createWorkMachines } from './work-machines';

const ACCENT = { habitat: '#efb16c', solar: '#85ceee', greenhouse: '#8edd9d' };

function displayTexture(resources: WorldResources, id: StationId, index: number) {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const c = canvas.getContext('2d'); if (!c) return;
  c.fillStyle = '#0b202b'; c.fillRect(0, 0, 512, 256);
  c.fillStyle = ACCENT[id]; c.fillRect(20, 22, 5, 33);
  c.font = 'bold 24px sans-serif'; c.fillText(['SYSTEM OVERVIEW', 'ENVIRONMENT', 'DIAGNOSTICS'][index], 40, 47);
  c.strokeStyle = '#274751'; c.lineWidth = 1;
  for (let x = 24; x < 490; x += 32) { c.beginPath(); c.moveTo(x, 75); c.lineTo(x, 220); c.stroke(); }
  for (let y = 78; y < 230; y += 32) { c.beginPath(); c.moveTo(24, y); c.lineTo(488, y); c.stroke(); }
  c.strokeStyle = ACCENT[id]; c.lineWidth = 4; c.beginPath();
  for (let x = 28; x < 480; x += 5) { const y = 145 + Math.sin(x * .025 + index) * 26 + Math.sin(x * .07) * 8; x === 28 ? c.moveTo(x, y) : c.lineTo(x, y); }
  c.stroke(); c.fillStyle = '#d2ebe8'; c.font = '18px monospace'; c.fillText(`ARES / ${id.toUpperCase()} / 0${index + 1}`, 26, 242);
  const texture = resources.texture(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Distinct roof silhouettes, entirely above the frozen wall/collision envelope. */
function roofEquipment(roof: THREE.Group, id: StationId, kit: ModelKit, resources: WorldResources, glass: THREE.Material) {
  const frame = kit.materials.trim;
  if (id === 'greenhouse') {
    const glazing = new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(1, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2)), glass);
    glazing.scale.set(3.08, .60, 3.08); glazing.position.y = 2.65; roof.add(glazing);
    for (const z of [-2.2, -1.1, 0, 1.1, 2.2]) {
      const r = Math.sqrt(3.08 ** 2 - z ** 2);
      const points = Array.from({ length: 25 }, (_, i) => {
        const a = i / 24 * Math.PI;
        return new THREE.Vector3(Math.cos(a) * r, 2.65 + Math.sin(a) * .60 * r / 3.08, z);
      });
      roof.add(new THREE.Mesh(resources.geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, .035, 6, false)), frame));
    }
    for (const x of [-3.12, 3.12]) kit.box(roof, frame, [.12, .14, 6.3], [x, 2.65, 0]);
    for (const z of [-3.12, 3.12]) kit.box(roof, frame, [6.3, .14, .12], [0, 2.65, z]);
    return;
  }
  const cap = new THREE.Mesh(resources.geometry(new RoundedBoxGeometry(6.4, id === 'solar' ? .18 : .38, 6.4, 4, id === 'solar' ? .08 : .16)), kit.materials.ivory);
  cap.position.y = id === 'solar' ? 2.63 : 2.69; roof.add(cap);
  if (id === 'solar') {
    const cell = resources.material(new THREE.MeshStandardMaterial({ color: '#133d65', metalness: .55, roughness: .27 }));
    const geometry = resources.geometry(new THREE.BoxGeometry(.62, .018, .64));
    for (const x of [-1.55, 1.55]) {
      const array = new THREE.Group(); array.position.set(x, 2.99, 0); array.rotation.x = -.07; roof.add(array);
      kit.box(array, frame, [2.85, .12, 5.8], [0, 0, 0]);
      const cells = new THREE.InstancedMesh(geometry, cell, 32); cells.name = 'photovoltaic-cells';
      const transform = new THREE.Object3D();
      for (let row = 0; row < 8; row++) for (let col = 0; col < 4; col++) {
        const i = row * 4 + col;
        transform.position.set((col - 1.5) * .68, .073, (row - 3.5) * .7); transform.updateMatrix(); cells.setMatrixAt(i, transform.matrix);
        cells.setColorAt(i, new THREE.Color().setHSL(.58, .5, .4 + (i % 3) * .025));
      }
      array.add(cells);
      for (const edge of [-1.37, 1.37]) kit.flatBox(array, kit.materials.ivory, [.025, .025, 5.65], [edge, .09, 0]);
    }
    return;
  }
  const hatch = kit.box(roof, frame, [1.7, .055, 2.25], [0, 2.86, -.3]); hatch.name = 'habitat-skylight';
  kit.box(roof, glass, [1.5, .025, 2.05], [0, 2.9, -.3]);
  for (const x of [-2.25, 2.25]) {
    kit.box(roof, frame, [.72, .2, 1.45], [x, 2.89, -.4]);
    for (let i = 0; i < 6; i++) kit.box(roof, kit.materials.ivory, [.64, .055, .065], [x, 3.01, -.95 + i * .21]);
  }
  for (const x of [-2.6, 2.6]) kit.cylinder(roof, frame, [.035, .55, .035], [x, 3.02, -2.5]);
}

/** Hollow furnished modules; wall order and door/collider coordinates stay compatible. */
export function createBuilding(id: StationId, kit: ModelKit, resources: WorldResources, work = true): StationVisual {
  const group = new THREE.Group(); group.name = id; group.userData.stationId = id;
  const room = new THREE.Group(); room.position.y = -1; group.add(room);
  const accent = ACCENT[id], h = BUILDING_HALF_SIZE, walls: THREE.Mesh[] = [];
  const facade = resources.material(new THREE.MeshStandardMaterial({ color: work ? '#e4e1d4' : '#c0cccd', metalness: .16, roughness: .56, side: THREE.DoubleSide, shadowSide: THREE.FrontSide }));
  const frame = resources.material(new THREE.MeshStandardMaterial({ color: '#344e58', metalness: .48, roughness: .43, side: THREE.DoubleSide }));
  const detail = resources.material(new THREE.MeshStandardMaterial({ color: accent, metalness: .22, roughness: .5 }));
  const windows = resources.material(new THREE.MeshStandardMaterial({ color: '#a7d8dc', emissive: accent, emissiveIntensity: .12, metalness: .2, transparent: true, opacity: .32, depthWrite: false, roughness: .18, side: THREE.DoubleSide }));
  const indicator = resources.material(new THREE.MeshStandardMaterial({ color: '#bce9b3', emissive: '#8ab982', emissiveIntensity: .3 }));
  const beacon = resources.material(new THREE.MeshStandardMaterial({ color: '#91d0a3', emissive: '#91d0a3', emissiveIntensity: .2 }));
  kit.flatBox(room, frame, [6.5, .1, 6.5], [0, -.05, 0]);
  const sideMaterial = work && id === 'greenhouse' ? windows : facade;
  for (const x of [-h + .1, h - .1]) walls.push(kit.flatBox(room, sideMaterial, [.2, 2.6, h * 2], [x, 1.3, 0]));
  walls.push(kit.flatBox(room, sideMaterial, [h * 2, 2.6, .2], [0, 1.3, -h + .1]));
  // Real openings replace the previous opaque window rectangles.
  const shape = new THREE.Shape(); shape.moveTo(-1.2, 0); shape.lineTo(1.2, 0); shape.lineTo(1.2, 2.6); shape.lineTo(-1.2, 2.6); shape.closePath();
  const width = work ? 1.65 : 2.25, height = work ? .85 : 1.65, centerY = work ? 1.6 : 1.35;
  const hole = new THREE.Path(); hole.moveTo(-width / 2, centerY - height / 2); hole.lineTo(-width / 2, centerY + height / 2); hole.lineTo(width / 2, centerY + height / 2); hole.lineTo(width / 2, centerY - height / 2); hole.closePath(); shape.holes.push(hole);
  const frontGeometry = resources.geometry(new THREE.ExtrudeGeometry(shape, { depth: .2, bevelEnabled: false }));
  for (const x of [-2, 2]) {
    const wall = new THREE.Mesh(frontGeometry, facade); wall.position.set(x, 0, h - .2); room.add(wall); walls.push(wall);
    kit.box(room, windows, [width, height, .015], [x, centerY, h + .012]);
    for (const y of [centerY - height / 2, centerY + height / 2]) kit.box(room, frame, [width + .12, .07, .07], [x, y, h + .018]);
    for (const edge of [-width / 2, width / 2]) kit.box(room, frame, [.07, height, .07], [x + edge, centerY, h + .018]);
    kit.box(room, frame, [2.38, .22, .23], [x, .12, h - .09]);
    kit.flatBox(room, detail, [2.35, .075, .025], [x, .32, h + .008]);
    // Recessed panel joints and lower service grilles have depth, without crossing the doorway.
    for (let i = 0; i < 5; i++) kit.flatBox(room, frame, [.3, .025, .02], [x + .55, .55 + i * .065, h + .012]);
  }
  for (const x of [-3.08, 3.08]) {
    kit.box(room, frame, [.22, 2.67, .23], [x, 1.34, h - .08]);
    kit.flatBox(room, detail, [.11, .42, .025], [x, 2.25, h + .045]);
    for (const z of [-2.8, -1.4, 0, 1.4]) {
      kit.box(room, frame, [.06, 2.45, .09], [x, 1.3, z]);
    }
  }
  kit.box(room, frame, [1.6, .35, .2], [0, 2.42, h - .1]);
  const { steel } = dressRoom(room, kit, resources);
  const screens = [0, 1, 2].map(index => {
    const texture = displayTexture(resources, id, index);
    return resources.material(new THREE.MeshStandardMaterial({ color: '#ffffff', ...(texture ? { map: texture, emissiveMap: texture } : {}), emissive: '#b0d1db', emissiveIntensity: .4, roughness: .42 }));
  });
  const equipment = new THREE.Group(); room.add(equipment); furnishRoom(equipment, id, kit, screens, steel);
  if (work) createWorkMachines(id, room, kit, resources);
  const practical = new THREE.PointLight(accent, 7, 7, 2); practical.position.set(0, 2.2, .4); room.add(practical);
  const lamp = resources.material(new THREE.MeshBasicMaterial({ color: accent }));
  for (const x of [-2.4, 2.4]) kit.flatBox(room, lamp, [.08, .05, 5.2], [x, 2.36, 0]);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96; const c = canvas.getContext('2d');
    if (c) {
      c.fillStyle = '#132e39'; c.fillRect(0, 0, 512, 96); c.fillStyle = accent; c.fillRect(0, 0, 9, 96);
      c.font = 'bold 37px sans-serif'; c.textAlign = 'center'; c.fillText(work ? { habitat: '01  HABITAT', solar: '02  SOLAR', greenhouse: '03  GREENHOUSE' }[id] : 'CREW OPERATIONS', 256, 61);
      const texture = resources.texture(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
      kit.box(room, frame, [3.04, .56, .08], [0, 2.45, h + .015]);
      kit.flatBox(room, resources.material(new THREE.MeshBasicMaterial({ map: texture })), [2.94, .48, .02], [0, 2.45, h + .065]);
    }
  }
  const roof = new THREE.Group(); roof.name = `${id}-roof`; room.add(roof);
  roofEquipment(roof, id, kit, resources, windows);
  for (const x of [-2, 2]) kit.flatBox(roof, detail, [2.4, .09, .1], [x, 2.65, h + .01]);
  const shelterPanels: THREE.Mesh[] = [];
  for (const x of [-2, 2]) {
    const panel = kit.box(room, kit.materials.blue, [1.5, .7, .03], [x, 1.6, h + .07]); panel.scale.y = .01; panel.visible = false; shelterPanels.push(panel);
  }
  kit.box(room, indicator, [.5, .075, .04], [0, 2.82, h + .08]);
  kit.sphere(room, beacon, [.075, .075, .075], [h - .3, 2.96, h - .3]);
  const door = createSlidingDoor(kit, id, false, .10); door.group.position.set(0, 1.12, h - .03); door.group.scale.set(1.15, 1.2, 1); room.add(door.group);
  const envelope = resources.geometry(new THREE.BoxGeometry(6.7, 4.1, 6.7));
  const selection = new THREE.LineSegments(resources.geometry(new THREE.EdgesGeometry(envelope)), resources.material(new THREE.LineBasicMaterial({ color: '#ffe0a2' }))); selection.position.y = .8; selection.visible = false;
  return { group, windows, indicator, beacon, shelterPanels, selection, door, screens, roof, walls };
}
