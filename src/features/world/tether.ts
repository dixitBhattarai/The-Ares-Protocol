import * as THREE from 'three';
import { STATIONS, type Vec3 } from '../../contracts';
import type { WorldResources } from './resources';

export interface EvaStatus {
  attached: boolean;
  length: number;
  maxLength: number;
  tension: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
  suitSafety: number;
  oxygenLevel: number;
  warningMessage: string | null;
}

export interface EvaTether {
  update(delta: number, playerPose: Vec3, isOutside: boolean, reduceMotion: boolean, hasHazard?: boolean): EvaStatus;
  dispose(): void;
  getGroup(): THREE.Group;
  getStatus(): EvaStatus;
}

/**
 * Scientifically realistic NASA-style EVA Safety Tether Rope & Life-Support System:
 * - Automatically anchors to the Habitat airlock exterior winch box at (-8.0, 1.25, -1.0)
 * - Attaches to the astronaut's life-support backpack harness
 * - Simulates 16-node Verlet rope physics under Mars low gravity (-3.71 m/s²) with ground collision
 * - Monitors tether extension (max 30m), tension, and outdoor suit safety / oxygen levels
 * - Fully recovers suit safety and replenishes oxygen when the astronaut re-enters the pressurized airlock
 */
export function createEvaTether(scene: THREE.Scene, resources: WorldResources): EvaTether {
  const group = new THREE.Group();
  group.name = 'eva-safety-tether-system';
  scene.add(group);

  // Habitat airlock tether winch anchor position
  const habitatStation = STATIONS.find(s => s.id === 'habitat');
  const hx = habitatStation ? habitatStation.position.x : -8;
  const hz = habitatStation ? habitatStation.position.z : -4;
  const ANCHOR = new THREE.Vector3(hx, 1.25, hz + 3.0); // Exactly at airlock front portal

  // 16-node Verlet particle rope
  const NODE_COUNT = 16;
  const MAX_LENGTH = 30.0;
  const positions: THREE.Vector3[] = [];
  const oldPositions: THREE.Vector3[] = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    const t = i / (NODE_COUNT - 1);
    const p = new THREE.Vector3().lerpVectors(ANCHOR, new THREE.Vector3(hx, 0.8, hz + 4.5), t);
    positions.push(p);
    oldPositions.push(p.clone());
  }

  // Tether rope geometry: dynamic BufferAttribute
  const posArray = new Float32Array(NODE_COUNT * 3);
  const tetherGeo = resources.geometry(new THREE.BufferGeometry());
  tetherGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

  // Luminous high-visibility braided safety-orange tether material
  const tetherMat = resources.material(
    new THREE.LineBasicMaterial({
      color: '#ff8800',
      linewidth: 2,
      depthWrite: false,
    })
  );

  const tetherLine = new THREE.Line(tetherGeo, tetherMat);
  tetherLine.name = 'tether-line';
  group.add(tetherLine);

  // Metal carabiner clip at astronaut harness
  const clipGeo = resources.geometry(new THREE.TorusGeometry(0.06, 0.018, 6, 12));
  const clipMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#d0d8dc',
      metalness: 0.9,
      roughness: 0.2,
    })
  );
  const carabiner = new THREE.Mesh(clipGeo, clipMat);
  carabiner.name = 'tether-carabiner';
  group.add(carabiner);

  // Tether Winch Box mounted on Habitat airlock exterior
  const winchBox = new THREE.Group();
  winchBox.name = 'airlock-tether-winch';
  winchBox.position.copy(ANCHOR);

  const winchHousingMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#d67d28',
      metalness: 0.6,
      roughness: 0.35,
    })
  );
  const drumMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#2a3138',
      metalness: 0.8,
      roughness: 0.25,
    })
  );
  const statusLedMat = resources.material(
    new THREE.MeshBasicMaterial({
      color: '#44ff66',
    })
  );

  // Housing box
  const housing = new THREE.Mesh(resources.geometry(new THREE.BoxGeometry(0.32, 0.42, 0.22)), winchHousingMat);
  winchBox.add(housing);

  // Cable spool drum
  const drum = new THREE.Mesh(resources.geometry(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 16)), drumMat);
  drum.rotation.z = Math.PI / 2;
  winchBox.add(drum);

  // Status indicator LED
  const led = new THREE.Mesh(resources.geometry(new THREE.SphereGeometry(0.04, 12, 8)), statusLedMat);
  led.position.set(0, 0.16, 0.12);
  winchBox.add(led);

  group.add(winchBox);

  // Life-support suit status state
  let suitSafety = 100.0;
  let oxygenLevel = 100.0;
  let attached = false;
  let currentTension = 0;
  let currentLength = 0;
  let phaseTime = 0;

  const status: EvaStatus = {
    attached: false,
    length: 0,
    maxLength: MAX_LENGTH,
    tension: 0,
    isNearLimit: false,
    isOverLimit: false,
    suitSafety: 100,
    oxygenLevel: 100,
    warningMessage: null,
  };

  return {
    update(seconds: number, playerPose: Vec3, isOutside: boolean, reduceMotion: boolean, hasHazard = false): EvaStatus {
      const dt = Math.min(0.08, Math.max(0, seconds));
      phaseTime += dt;

      attached = isOutside;
      group.visible = true;
      tetherLine.visible = attached;
      carabiner.visible = attached;

      const targetPos = new THREE.Vector3(playerPose.x, playerPose.y + 0.65, playerPose.z);

      if (attached) {
        // Astronaut is outside on Mars: safety tether is deployed
        currentLength = ANCHOR.distanceTo(targetPos);
        currentTension = Math.min(1.0, currentLength / MAX_LENGTH);

        status.attached = true;
        status.length = Math.round(currentLength * 10) / 10;
        status.tension = currentTension;
        status.isNearLimit = currentLength >= MAX_LENGTH * 0.85;
        status.isOverLimit = currentLength >= MAX_LENGTH;

        // Dynamic rope color based on tension:
        // Green/Orange normal -> Vivid Red when tension critical
        if (status.isOverLimit) {
          tetherMat.color.set('#ff2200');
          statusLedMat.color.set('#ff2200');
        } else if (status.isNearLimit) {
          tetherMat.color.set('#ffbb00');
          statusLedMat.color.set('#ffbb00');
        } else {
          tetherMat.color.set('#ff8800');
          statusLedMat.color.set('#44ff66');
        }

        // 1. Verlet integration for realistic low-gravity rope physics
        positions[0].copy(ANCHOR);
        positions[NODE_COUNT - 1].copy(targetPos);
        carabiner.position.copy(targetPos);

        const segmentTarget = currentLength / (NODE_COUNT - 1);
        const gravityMars = -3.71; // Mars surface gravity m/s²
        const windSway = Math.sin(phaseTime * 2.2) * 0.04;

        if (!reduceMotion && dt > 0) {
          for (let i = 1; i < NODE_COUNT - 1; i++) {
            const pos = positions[i];
            const old = oldPositions[i];
            const vx = (pos.x - old.x) * 0.94;
            const vy = (pos.y - old.y) * 0.94;
            const vz = (pos.z - old.z) * 0.94;

            old.copy(pos);

            // Apply low gravity + wind
            pos.x += vx + windSway * dt;
            pos.y += vy + gravityMars * dt * dt * 0.55;
            pos.z += vz;

            // Ground collision constraint: rope rests on terrain at Y >= 0.04m
            if (pos.y < 0.04) {
              pos.y = 0.04;
            }
          }

          // Relaxation constraints (preserve segment lengths)
          for (let iter = 0; iter < 4; iter++) {
            positions[0].copy(ANCHOR);
            positions[NODE_COUNT - 1].copy(targetPos);

            for (let i = 0; i < NODE_COUNT - 1; i++) {
              const p1 = positions[i];
              const p2 = positions[i + 1];
              const diff = new THREE.Vector3().subVectors(p2, p1);
              const d = diff.length();
              if (d > 0.0001) {
                const error = (d - segmentTarget) / d;
                const correction = diff.multiplyScalar(0.5 * error);
                if (i !== 0) p1.add(correction);
                if (i + 1 !== NODE_COUNT - 1) p2.sub(correction);
              }
            }
          }
        } else {
          // Direct catenary interpolation when paused or reduced motion
          for (let i = 1; i < NODE_COUNT - 1; i++) {
            const t = i / (NODE_COUNT - 1);
            positions[i].lerpVectors(ANCHOR, targetPos, t);
            // Sag downwards based on low gravity and slack
            const sag = Math.sin(t * Math.PI) * Math.max(0, 0.4 - currentTension * 0.35);
            positions[i].y = Math.max(0.04, positions[i].y - sag);
          }
        }

        // 2. Suit health and oxygen depletion during outdoor exploration
        const decayRate = (hasHazard ? 1.5 : 0.35) * dt;
        suitSafety = Math.max(0, suitSafety - decayRate);
        oxygenLevel = Math.max(0, oxygenLevel - 0.28 * dt);

        // 3. Clear situational HUD warning messages
        if (status.isOverLimit) {
          status.warningMessage = `TETHER LIMIT REACHED (${MAX_LENGTH}m) · Return toward airlock`;
        } else if (status.isNearLimit) {
          status.warningMessage = `TETHER CAUTION: ${status.length}m / ${MAX_LENGTH}m extended`;
        } else if (suitSafety < 30) {
          status.warningMessage = `CRITICAL SUIT INTEGRITY (${Math.round(suitSafety)}%) · Return to Habitat airlock`;
        } else if (suitSafety < 55) {
          status.warningMessage = `WARNING: Suit exposed to Mars cold/radiation (${Math.round(suitSafety)}%)`;
        } else {
          status.warningMessage = null;
        }
      } else {
        // Astronaut is safely inside a station: life support recovering
        status.attached = false;
        status.length = 0;
        status.tension = 0;
        status.isNearLimit = false;
        status.isOverLimit = false;
        statusLedMat.color.set('#44ff66');

        // Recover suit safety and oxygen rapidly in pressurized environment
        if (suitSafety < 100) {
          suitSafety = Math.min(100, suitSafety + 18.0 * dt);
        }
        if (oxygenLevel < 100) {
          oxygenLevel = Math.min(100, oxygenLevel + 20.0 * dt);
        }

        status.warningMessage = suitSafety < 98
          ? `Airlock Secured: Pressurized environment · Suit integrity restoring (${Math.round(suitSafety)}%)`
          : null;
      }

      status.suitSafety = Math.round(suitSafety);
      status.oxygenLevel = Math.round(oxygenLevel);

      // Upload rope buffer data
      const attr = tetherGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < NODE_COUNT; i++) {
        attr.setXYZ(i, positions[i].x, positions[i].y, positions[i].z);
      }
      attr.needsUpdate = true;

      return status;
    },

    dispose() {
      scene.remove(group);
      group.clear();
    },

    getGroup() {
      return group;
    },

    getStatus() {
      return status;
    },
  };
}
