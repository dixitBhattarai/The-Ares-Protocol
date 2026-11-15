import * as THREE from 'three';
import { type StationId, type Vec3, STATIONS } from '../../contracts';
import { doorApproach } from './doors';
import type { ModelKit, WorldResources } from './resources';

export interface EmergencyPathOptions {
  emergency?: boolean;
  label?: string;
  color?: string;
}

export interface EmergencyPathTrailer {
  readonly group: THREE.Group;
  setRoute(from: Vec3, to: StationId | Vec3 | null, options?: EmergencyPathOptions): void;
  update(delta: number, active: boolean, reduceMotion: boolean): void;
  getDistance(): number;
  getTarget(): Vec3 | null;
  isActive(): boolean;
  dispose(): void;
}

const MAX_MARKERS = 36;
const MARKER_SPACING = 1.05;

/** Creates a sharp, holographic chevron shape pointing in the +Z direction on XZ plane. */
function createChevronGeometry(resources: WorldResources): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const w = 0.28;
  const l = 0.22;
  const indent = 0.12;
  shape.moveTo(0, l);
  shape.lineTo(w, -l);
  shape.lineTo(w * 0.55, -l + indent);
  shape.lineTo(0, 0.04);
  shape.lineTo(-w * 0.55, -l + indent);
  shape.lineTo(-w, -l);
  shape.closePath();
  const geom = resources.geometry(new THREE.ShapeGeometry(shape));
  geom.rotateX(-Math.PI / 2);
  return geom;
}

/**
 * High-tech holographic emergency path trailer that projects animated directional
 * chevrons and a destination beacon directly onto the Martian terrain to guide the
 * player to safety or station airlocks during hazards.
 */
export function createEmergencyPath(kit: ModelKit, resources: WorldResources): EmergencyPathTrailer {
  const group = new THREE.Group();
  group.name = 'emergency-path-trailer';
  group.visible = false;

  let currentTarget: Vec3 | null = null;
  let currentFrom: Vec3 = { x: 0, y: 0, z: 0 };
  let currentDistance = 0;
  let isEmergencyMode = true;
  let isPathActive = false;
  let animationClock = 0;
  let activeMarkerCount = 0;

  // Primary holographic materials
  const chevronGeometry = createChevronGeometry(resources);
  const outerRingGeometry = resources.geometry(new THREE.RingGeometry(0.85, 1.05, 36));
  outerRingGeometry.rotateX(-Math.PI / 2);

  const innerRingGeometry = resources.geometry(new THREE.RingGeometry(0.38, 0.5, 24));
  innerRingGeometry.rotateX(-Math.PI / 2);

  const beaconBeamGeometry = resources.geometry(new THREE.CylinderGeometry(0.38, 0.45, 2.6, 16, 1, true));
  const diamondGeometry = resources.geometry(new THREE.OctahedronGeometry(0.22, 0));

  // Pre-create chevron waypoint markers pool
  interface MarkerItem {
    group: THREE.Group;
    chevronMesh: THREE.Mesh;
    chevronMaterial: THREE.MeshBasicMaterial;
    leftTick: THREE.Mesh;
    rightTick: THREE.Mesh;
    tickMaterial: THREE.MeshBasicMaterial;
  }

  const markers: MarkerItem[] = [];
  const markersContainer = new THREE.Group();
  markersContainer.name = 'path-markers-container';
  group.add(markersContainer);

  for (let i = 0; i < MAX_MARKERS; i++) {
    const markerGroup = new THREE.Group();
    markerGroup.name = `emergency-marker-${i}`;
    markerGroup.visible = false;

    const chevronMat = resources.material(new THREE.MeshBasicMaterial({
      color: '#ffaa00',
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));

    const tickMat = resources.material(new THREE.MeshBasicMaterial({
      color: '#ffe57f',
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));

    const chevronMesh = new THREE.Mesh(chevronGeometry, chevronMat);
    markerGroup.add(chevronMesh);

    // Flanking holographic runway ticks
    const leftTick = kit.flatBox(markerGroup, tickMat, [0.12, 0.006, 0.035], [-0.44, 0, 0]);
    const rightTick = kit.flatBox(markerGroup, tickMat, [0.12, 0.006, 0.035], [0.44, 0, 0]);

    markersContainer.add(markerGroup);
    markers.push({
      group: markerGroup,
      chevronMesh,
      chevronMaterial: chevronMat,
      leftTick,
      rightTick,
      tickMaterial: tickMat,
    });
  }

  // Destination Beacon Group
  const beaconGroup = new THREE.Group();
  beaconGroup.name = 'emergency-destination-beacon';
  beaconGroup.visible = false;
  group.add(beaconGroup);

  const outerRingMaterial = resources.material(new THREE.MeshBasicMaterial({
    color: '#ffaa00',
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
  outerRing.position.y = 0.002;
  beaconGroup.add(outerRing);

  const innerRingMaterial = resources.material(new THREE.MeshBasicMaterial({
    color: '#ffe57f',
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
  innerRing.position.y = 0.004;
  beaconGroup.add(innerRing);

  // 4 Cardinal bracket ticks around the outer landing ring
  const bracketMaterial = resources.material(new THREE.MeshBasicMaterial({
    color: '#ffe57f',
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  }));
  for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const bracket = kit.flatBox(beaconGroup, bracketMaterial, [0.08, 0.006, 0.18], [
      Math.sin(angle) * 1.15,
      0.006,
      Math.cos(angle) * 1.15,
    ]);
    bracket.rotation.y = angle;
  }

  // Translucent vertical emergency light column
  const beamMaterial = resources.material(new THREE.MeshBasicMaterial({
    color: '#ff9800',
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  const beaconBeam = new THREE.Mesh(beaconBeamGeometry, beamMaterial);
  beaconBeam.position.y = 1.3;
  beaconGroup.add(beaconBeam);

  // Floating rotating emergency diamond / octahedron icon
  const diamondMaterial = resources.material(new THREE.MeshBasicMaterial({
    color: '#ffe082',
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  }));
  const diamond = new THREE.Mesh(diamondGeometry, diamondMaterial);
  diamond.position.y = 1.95;
  beaconGroup.add(diamond);

  function resolveTargetCoord(target: StationId | Vec3 | null): Vec3 | null {
    if (!target) return null;
    if (typeof target === 'string') {
      const station = STATIONS.find(s => s.id === target);
      if (!station) return null;
      return doorApproach(target);
    }
    return target;
  }

  function applyColors(emergency: boolean, customColor?: string) {
    const primary = customColor ?? (emergency ? '#ffaa00' : '#00e5ff');
    const accent = emergency ? '#ffe57f' : '#84ffff';
    const beam = emergency ? '#ff9800' : '#00b4d8';

    markers.forEach(m => {
      m.chevronMaterial.color.set(primary);
      m.tickMaterial.color.set(accent);
    });
    outerRingMaterial.color.set(primary);
    innerRingMaterial.color.set(accent);
    bracketMaterial.color.set(accent);
    beamMaterial.color.set(beam);
    diamondMaterial.color.set(accent);
  }

  function layoutRoute() {
    if (!currentTarget || !isPathActive) {
      group.visible = false;
      return;
    }

    group.visible = true;
    const dx = currentTarget.x - currentFrom.x;
    const dz = currentTarget.z - currentFrom.z;
    currentDistance = Math.hypot(dx, dz);

    // Place target beacon
    beaconGroup.position.set(currentTarget.x, 0.046, currentTarget.z);
    beaconGroup.visible = true;

    // Direct yaw angle pointing from astronaut to destination
    const yaw = Math.atan2(dx, dz);

    if (currentDistance < 0.75) {
      // Arrived at the doorway approach threshold
      markers.forEach(m => { m.group.visible = false; });
      activeMarkerCount = 0;
      return;
    }

    // Distribute chevron markers along the trajectory
    const availableSpan = currentDistance - 0.7; // leave space before the beacon ring
    activeMarkerCount = Math.max(0, Math.min(MAX_MARKERS, Math.floor(availableSpan / MARKER_SPACING)));

    for (let i = 0; i < MAX_MARKERS; i++) {
      const marker = markers[i];
      if (i < activeMarkerCount) {
        const t = (0.5 + i * MARKER_SPACING) / currentDistance;
        const px = currentFrom.x + dx * t;
        const pz = currentFrom.z + dz * t;
        marker.group.position.set(px, 0.048, pz);
        marker.group.rotation.y = yaw;
        marker.group.visible = true;
      } else {
        marker.group.visible = false;
      }
    }
  }

  return {
    group,
    setRoute(from: Vec3, to: StationId | Vec3 | null, options?: EmergencyPathOptions) {
      const resolved = resolveTargetCoord(to);
      currentFrom = from;
      currentTarget = resolved;
      isPathActive = resolved !== null;
      isEmergencyMode = options?.emergency ?? true;

      applyColors(isEmergencyMode, options?.color);
      layoutRoute();
    },
    update(delta: number, active: boolean, reduceMotion: boolean) {
      if (!isPathActive || !group.visible) return;

      const step = Number.isFinite(delta) ? Math.max(0, Math.min(0.1, delta)) : 0;
      if (active && !reduceMotion) {
        animationClock += step;
      }

      if (reduceMotion) {
        markers.forEach(m => {
          m.chevronMaterial.opacity = 0.8;
          m.tickMaterial.opacity = 0.75;
        });
        outerRing.scale.setScalar(1);
        innerRing.scale.setScalar(1);
        beamMaterial.opacity = 0.28;
        diamond.position.y = 1.95;
        return;
      }

      // Animated traveling wave along chevrons towards destination
      for (let i = 0; i < activeMarkerCount; i++) {
        const marker = markers[i];
        const wave = ((animationClock * 2.4 - (i / Math.max(1, activeMarkerCount)) * 4) % 1 + 1) % 1;
        const pulse = 0.35 + 0.65 * Math.pow(Math.sin(wave * Math.PI), 2);
        marker.chevronMaterial.opacity = pulse;
        marker.tickMaterial.opacity = Math.max(0.4, pulse * 0.9);
      }

      // Beacon animations: pulsing rings, rotating diamond, breathing light beam
      const ringPulse = 1 + 0.07 * Math.sin(animationClock * 3.6);
      outerRing.scale.set(ringPulse, 1, ringPulse);

      const innerPulse = 1 + 0.1 * Math.cos(animationClock * 3.6);
      innerRing.scale.set(innerPulse, 1, innerPulse);

      beamMaterial.opacity = 0.22 + 0.14 * Math.sin(animationClock * 2.8);
      diamond.rotation.y = animationClock * 1.6;
      diamond.position.y = 1.95 + Math.sin(animationClock * 3.2) * 0.12;
    },
    getDistance() {
      return currentDistance;
    },
    getTarget() {
      return currentTarget;
    },
    isActive() {
      return isPathActive && group.visible;
    },
    dispose() {
      markers.forEach(m => {
        m.group.clear();
      });
      beaconGroup.clear();
      group.clear();
    },
  };
}
