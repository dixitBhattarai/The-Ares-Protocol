import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import type { StationId, Vec3, WorldAdapter } from '../../contracts';
import { frameOutpost } from './camera';
import { createAstronaut, createStation, createTerrain, STATION_NAMES } from './models';
import { createModelKit, WorldResources } from './resources';
import './world.css';

export function createWorld(host: HTMLElement, onInteract: (station: StationId) => void): WorldAdapter {
  const resources = new WorldResources();
  const container = document.createElement('div');
  container.className = 'ares-world';
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 7, -7, .1, 220);
  const playerPose = new THREE.Vector3(0, .8, 5);
  const cleanups: Array<() => void> = [];
  let renderer: THREE.WebGLRenderer | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cleanups.forEach(cleanup => cleanup());
    scene.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
    resources.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    scene.clear();
    container.remove();
  };

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);
    host.appendChild(container);
    scene.background = new THREE.Color('#67413c');
    scene.fog = new THREE.Fog('#67413c', 60, 140);
    scene.add(new THREE.HemisphereLight('#f7dfbd', '#663e38', 2.6));
    const sun = new THREE.DirectionalLight('#ffe3b3', 3.2);
    sun.position.set(-12, 20, 10);
    scene.add(sun);
    const kit = createModelKit(resources);
    scene.add(createTerrain(kit, resources));
    const astronaut = createAstronaut(kit);
    astronaut.position.copy(playerPose);
    scene.add(astronaut);
    const heading = document.createElement('p');
    heading.className = 'ares-world__heading';
    heading.textContent = 'ARES / OUTPOST 01';
    const subtitle = document.createElement('span');
    subtitle.textContent = 'A small base. Big decisions.';
    heading.appendChild(subtitle);
    container.appendChild(heading);
    const hint = document.createElement('p');
    hint.className = 'ares-world__hint';
    hint.textContent = 'Select a base module · WASD / arrows to walk after starting';
    container.appendChild(hint);
    const stations = STATIONS.map(station => {
      const visual = createStation(station.id, kit, resources);
      visual.group.position.copy(station.position);
      visual.selection.position.copy(station.position);
      scene.add(visual.group, visual.selection);
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'ares-world__label';
      label.textContent = STATION_NAMES[station.id];
      label.dataset.station = station.id;
      const select = () => onInteract(station.id);
      label.addEventListener('click', select);
      cleanups.push(() => label.removeEventListener('click', select));
      container.appendChild(label);
      return { ...station, visual, label };
    });
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const click = (event: MouseEvent) => {
      const rect = renderer!.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(stations.map(station => station.visual.group), true)[0];
      let object: THREE.Object3D | null = hit?.object ?? null;
      while (object && !object.userData.stationId) object = object.parent;
      if (object) onInteract(object.userData.stationId as StationId);
    };
    renderer.domElement.addEventListener('click', click);
    cleanups.push(() => renderer!.domElement.removeEventListener('click', click));
    let width = 1;
    let height = 1;
    let cameraDirty = true;
    const resize = () => {
      if (disposed) return;
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      renderer!.setSize(width, height, false);
      cameraDirty = true;
    };
    const observer = new ResizeObserver(resize);
    cleanups.push(() => observer.disconnect());
    observer.observe(host);
    resize();
    const projected = new THREE.Vector3();
    const updateCamera = () => {
      frameOutpost(camera, width / height, playerPose);
      stations.forEach(station => {
        projected.set(station.position.x, 2.6, station.position.z).project(camera);
        station.label.style.left = `${Math.max(55, Math.min(width - 55, (projected.x + 1) * width / 2))}px`;
        station.label.style.top = `${Math.max(70, Math.min(height - 38, (1 - projected.y) * height / 2))}px`;
      });
      cameraDirty = false;
    };
    updateCamera();
    return {
      setPlayerPose(pose: Vec3) {
        if (disposed || ![pose.x, pose.y, pose.z].every(Number.isFinite)) return;
        const dx = pose.x - playerPose.x;
        const dz = pose.z - playerPose.z;
        if (Math.hypot(dx, dz) > .0001) astronaut.rotation.y = Math.atan2(dx, dz);
        if (playerPose.x !== pose.x || playerPose.y !== pose.y || playerPose.z !== pose.z) cameraDirty = true;
        playerPose.copy(pose);
        astronaut.position.copy(pose);
      },
      setState(_state) { /* Milestone 2: read-only station status and shelter visuals. */ },
      render() {
        if (disposed) return;
        if (cameraDirty) updateCamera();
        renderer!.render(scene, camera);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
