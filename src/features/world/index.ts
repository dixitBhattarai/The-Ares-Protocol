import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import type { GameState, StationId, Vec3, WorldAdapter } from '../../contracts';
import { frameOutpost } from './camera';
import { createAstronaut, createStation, createTerrain, STATION_NAMES } from './models';
import { createModelKit, WorldResources } from './resources';
import { pickStationAt } from './picking';
import { applyStationStatus, getStationStatus } from './status';
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
    hint.setAttribute('role', 'status');
    container.appendChild(hint);
    const phaseBadge = document.createElement('span');
    phaseBadge.className = 'ares-world__phase';
    phaseBadge.textContent = 'BRIEFING';
    container.appendChild(phaseBadge);
    const playerMarker = document.createElement('span');
    playerMarker.className = 'ares-world__you';
    playerMarker.textContent = 'YOU';
    playerMarker.setAttribute('aria-hidden', 'true');
    playerMarker.hidden = true;
    container.appendChild(playerMarker);
    let selected: StationId | undefined;
    let hovered: StationId | undefined;
    let lastState: Readonly<GameState> | undefined;
    const stations = STATIONS.map(station => {
      const visual = createStation(station.id, kit, resources);
      visual.group.position.copy(station.position);
      visual.selection.position.copy(station.position);
      scene.add(visual.group, visual.selection);
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'ares-world__label';
      label.dataset.station = station.id;
      label.setAttribute('aria-pressed', 'false');
      const name = document.createElement('span');
      name.textContent = STATION_NAMES[station.id];
      const readout = document.createElement('span');
      readout.className = 'ares-world__readout';
      label.append(name, readout);
      const select = () => selectStation(station.id);
      const enter = () => { hovered = station.id; updateHighlights(); };
      const leave = () => { hovered = undefined; updateHighlights(); };
      label.addEventListener('click', select);
      label.addEventListener('pointerenter', enter);
      label.addEventListener('pointerleave', leave);
      label.addEventListener('focus', enter);
      label.addEventListener('blur', leave);
      cleanups.push(() => {
        label.removeEventListener('click', select);
        label.removeEventListener('pointerenter', enter);
        label.removeEventListener('pointerleave', leave);
        label.removeEventListener('focus', enter);
        label.removeEventListener('blur', leave);
      });
      container.appendChild(label);
      return { ...station, visual, label, readout };
    });
    function updateHint(): void {
      hint.textContent = selected
        ? `${STATION_NAMES[selected]} selected · ${lastState ? getStationStatus(selected, lastState).description : 'Use the mission buttons to make decisions.'}`
        : 'Select a base module · WASD / arrows to walk after starting';
    }
    function updateHighlights(): void {
      stations.forEach(station => {
        station.visual.selection.visible = station.id === selected || station.id === hovered;
        station.visual.selection.material.color.set(station.id === selected ? '#ffe0a2' : '#e5f6ff');
        station.label.setAttribute('aria-pressed', String(station.id === selected));
      });
    }
    function selectStation(id: StationId): void {
      if (disposed) return;
      selected = id;
      updateHighlights();
      updateHint();
      onInteract(id);
    }
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const stationAt = (event: MouseEvent): StationId | undefined => {
      const rect = renderer!.domElement.getBoundingClientRect();
      if (disposed || !rect.width || !rect.height) return;
      if (cameraDirty) updateCamera();
      scene.updateMatrixWorld(true);
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      return pickStationAt(pointer, camera, stationGroups, raycaster);
    };
    const stationGroups = stations.map(station => station.visual.group);
    const click = (event: MouseEvent) => { const id = stationAt(event); if (id) selectStation(id); };
    const move = (event: PointerEvent) => {
      const id = stationAt(event);
      if (id === hovered) return;
      hovered = id;
      renderer!.domElement.style.cursor = id ? 'pointer' : '';
      updateHighlights();
    };
    const leave = () => { hovered = undefined; renderer!.domElement.style.cursor = ''; updateHighlights(); };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { selected = undefined; hovered = undefined; updateHighlights(); updateHint(); }
    };
    renderer.domElement.addEventListener('click', click);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerleave', leave);
    container.addEventListener('keydown', key);
    cleanups.push(() => {
      renderer!.domElement.removeEventListener('click', click);
      renderer!.domElement.removeEventListener('pointermove', move);
      renderer!.domElement.removeEventListener('pointerleave', leave);
      container.removeEventListener('keydown', key);
    });
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
    function updateCamera(): void {
      frameOutpost(camera, width / height, playerPose);
      const labels = stations.map(station => {
        projected.set(station.position.x, 2.6, station.position.z).project(camera);
        return {
          station,
          x: Math.max(67, Math.min(width - 67, (projected.x + 1) * width / 2)),
          y: Math.max(96, Math.min(height - 58, (1 - projected.y) * height / 2)),
        };
      });
      // At map edges a wider camera can cluster labels. Use a readable legend row.
      const compact = width < 250 || height < 260 || labels.some((a, i) => labels.some((b, j) => i < j && Math.abs(a.x - b.x) < 140 && Math.abs(a.y - b.y) < 65));
      container.classList.toggle('ares-world--compact-labels', compact);
      if (compact) frameOutpost(camera, width / height, playerPose, { top: 106 / height, bottom: 48 / height });
      labels.forEach(({ station, x, y }, index) => {
        station.label.style.left = `${compact ? (index + .5) * width / 3 : x}px`;
        station.label.style.top = `${compact ? 96 : y}px`;
      });
      playerMarker.hidden = Math.hypot(playerPose.x, playerPose.z) < 12;
      if (!playerMarker.hidden) {
        projected.set(playerPose.x, playerPose.y + 1, playerPose.z).project(camera);
        playerMarker.style.left = `${(projected.x + 1) * width / 2}px`;
        playerMarker.style.top = `${(1 - projected.y) * height / 2}px`;
      }
      cameraDirty = false;
    }
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
      setState(state) {
        if (disposed || state === lastState) return;
        lastState = state;
        stations.forEach(station => {
          const status = getStationStatus(station.id, state);
          station.readout.textContent = status.readout;
          station.label.dataset.level = status.level;
          station.label.setAttribute('aria-label', `Select ${STATION_NAMES[station.id]}. ${status.description}`);
          applyStationStatus(station.visual, status, state.resources.power, state.shielding);
        });
        const phaseNames = { ready: 'BRIEFING', running: 'MISSION ACTIVE', paused: 'PAUSED', won: 'MISSION COMPLETE', lost: 'TRY ANOTHER PLAN' };
        phaseBadge.textContent = phaseNames[state.phase];
        phaseBadge.dataset.phase = state.phase;
        if (state.phase === 'ready') { selected = undefined; hovered = undefined; updateHighlights(); }
        updateHint();
        cameraDirty = true;
      },
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
