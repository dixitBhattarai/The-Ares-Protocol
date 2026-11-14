import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import type { GameState, StationId, Vec3, WorldAdapter } from '../../contracts';
import { frameOutpost } from './camera';
import { createGroundShadow, createStation, createTerrain, STATION_NAMES } from './models';
import { applyAstronautGait, createAstronaut, updateAstronautAnimation } from './astronaut';
import { createModelKit, WorldResources } from './resources';
import { pickStationAt } from './picking';
import { applyStationStatus, getStationStatus, getWorldEventNotice } from './status';
import './world.css';
import { createExpeditionViews } from './expedition';
import { createNasaLoader } from './nasa-assets';

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
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);
    host.appendChild(container);
    scene.background = new THREE.Color('#76635f');
    scene.fog = new THREE.Fog('#76635f', 40, 95);
    scene.add(new THREE.HemisphereLight('#d7e8ef', '#59423a', 1.8));
    const sun = new THREE.DirectionalLight('#ffe1b9', 3);
    sun.position.set(-10, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: .5, far: 65 });
    sun.shadow.normalBias = .035;
    sun.shadow.bias = -.00015;
    cleanups.push(() => sun.shadow.dispose());
    scene.add(sun);
    const kit = createModelKit(resources);
    const nasa = createNasaLoader(resources);
    cleanups.push(() => nasa.dispose());
    const expedition = createExpeditionViews(kit, resources, nasa);
    cleanups.push(() => expedition.dispose());
    let interior: StationId | null = null;
    let journey: number | null = null;
    let level: 'earth' | 'space' | null = null;
    let consoleHandler: ((index: number) => void) | null = null;
    const terrain = createTerrain(kit, resources);
    terrain.traverse(object => { if (object instanceof THREE.Mesh) object.receiveShadow = true; });
    scene.add(terrain);
    const astronaut = createAstronaut(kit);
    const suit = new THREE.Group(); suit.position.y = -.8; astronaut.group.add(suit);
    void nasa.attach(suit, 'astronaut', 1.55, astronaut.fallback);
    astronaut.group.position.copy(playerPose);
    scene.add(astronaut.group);
    astronaut.group.traverse(object => { if (object instanceof THREE.Mesh) object.castShadow = true; });
    const playerShadow = createGroundShadow(resources, .42, .32);
    playerShadow.name = 'astronaut-shadow';
    playerShadow.position.set(playerPose.x, .014, playerPose.z);
    scene.add(playerShadow);
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = motionPreference.matches;
    let walkCycle = 0;
    let gaitWasMoving = false;
    const motionChanged = () => {
      reduceMotion = motionPreference.matches;
      if (reduceMotion) applyAstronautGait(astronaut, 0, false);
    };
    motionPreference.addEventListener('change', motionChanged);
    cleanups.push(() => motionPreference.removeEventListener('change', motionChanged));
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
    const sceneStatus = document.createElement('div');
    sceneStatus.className = 'ares-world__status';
    sceneStatus.appendChild(phaseBadge);
    container.appendChild(sceneStatus);
    const eventReport = document.createElement('details');
    eventReport.className = 'ares-world__event';
    eventReport.hidden = true;
    const eventSummary = document.createElement('summary');
    eventSummary.textContent = 'EVENT';
    eventSummary.setAttribute('aria-label', 'Read this shift’s event report');
    const eventText = document.createElement('p');
    eventReport.append(eventSummary, eventText);
    sceneStatus.appendChild(eventReport);
    // Let the native summary operate without sending game/movement shortcuts.
    const reportKey = (event: KeyboardEvent) => event.stopPropagation();
    eventReport.addEventListener('keydown', reportKey);
    cleanups.push(() => eventReport.removeEventListener('keydown', reportKey));
    const playerMarker = document.createElement('span');
    playerMarker.className = 'ares-world__you';
    playerMarker.textContent = 'YOU';
    playerMarker.setAttribute('aria-hidden', 'true');
    playerMarker.hidden = true;
    container.appendChild(playerMarker);
    let selected: StationId | undefined;
    let hovered: StationId | undefined;
    let lastState: Readonly<GameState> | undefined;
    let eventNotice = '';
    const stations = STATIONS.map(station => {
      const visual = createStation(station.id, kit, resources);
      visual.group.position.copy(station.position);
      visual.group.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = !object.material.transparent;
          object.receiveShadow = true;
        }
      });
      visual.selection.position.copy(station.position);
      scene.add(visual.group, visual.selection);
      const shadow = createGroundShadow(resources, 1.8, 1.5);
      shadow.name = `${station.id}-shadow`;
      shadow.position.set(station.position.x, .014, station.position.z);
      scene.add(shadow);
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
        station.visual.selection.visible = station.id === selected || station.id === hovered || Boolean(eventNotice);
        station.visual.selection.material.color.set(station.id === selected ? '#ffe0a2' : station.id === hovered ? '#e5f6ff' : '#efbd7d');
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
    const click = (event: MouseEvent) => {
      if (interior || level) {
        const rect = renderer!.domElement.getBoundingClientRect();
        pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
        const control = expedition.pickControl(pointer);
        if (control !== undefined) consoleHandler?.(control);
        return;
      }
      const id = stationAt(event); if (id) selectStation(id);
    };
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
      container.style.setProperty('--ares-world-width', `${width}px`);
      container.style.setProperty('--ares-world-height', `${height}px`);
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
    let previousAnimationTime = performance.now();
    return {
      setConsoleHandler(handler) { if (!disposed) consoleHandler = handler; },
      setLevel(id) {
        if (disposed || level === id) return;
        level = id;
        if (id) expedition.interior(id);
        container.classList.toggle('ares-world--interior', Boolean(id || interior));
        heading.childNodes[0].textContent = id === 'earth' ? 'EARTH / FLIGHT OPERATIONS' : id === 'space' ? 'ORBIT / TRANSFER CABIN' : 'ARES / OUTPOST 01';
        subtitle.textContent = id ? 'Prepare the expedition. Complete the checks.' : 'A small base. Big decisions.';
        hint.textContent = id ? 'WASD / arrows · walk to the numbered console screens' : 'Select a base module · WASD / arrows to walk';
      },
      setActivityProgress(progress) { if (!disposed) expedition.progress(progress); },
      setInterior(id) {
        if (disposed || interior === id) return;
        interior = id;
        if (id) expedition.interior(id);
        container.classList.toggle('ares-world--interior', Boolean(id));
        heading.childNodes[0].textContent = id ? `ARES / ${STATION_NAMES[id].toUpperCase()} INTERIOR` : 'ARES / OUTPOST 01';
        hint.textContent = id ? `Inside ${STATION_NAMES[id]} · operate the task console in the mission panel` : 'Select a base module · WASD / arrows to walk';
      },
      setJourney(progress) {
        if (disposed) return;
        journey = progress !== null && Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : null;
        container.classList.toggle('ares-world--journey', journey !== null);
      },
      setObjective(id) {
        if (disposed || selected === (id ?? undefined)) return;
        selected = id ?? undefined; updateHighlights(); updateHint();
      },
      setPlayerPose(pose: Vec3) {
        if (disposed || ![pose.x, pose.y, pose.z].every(Number.isFinite)) return;
        const dx = pose.x - playerPose.x;
        const dz = pose.z - playerPose.z;
        const distance = Math.hypot(dx, dz);
        const moving = distance > .0001 && distance < 1 && (lastState?.phase === 'running' || level !== null) && !reduceMotion;
        const redrawShadow = distance > .0001 || pose.y !== playerPose.y || gaitWasMoving;
        gaitWasMoving = moving;
        if (distance > .0001) astronaut.group.rotation.y = Math.atan2(dx, dz);
        if (moving) walkCycle = (walkCycle + distance * Math.PI * 2 / .9) % (Math.PI * 2);
        if (distance >= 1) walkCycle = 0; // A reset/teleport is not a walking stride.
        applyAstronautGait(astronaut, walkCycle, moving);
        expedition.pose(pose, moving);
        if (playerPose.x !== pose.x || playerPose.y !== pose.y || playerPose.z !== pose.z) cameraDirty = true;
        playerPose.copy(pose);
        astronaut.group.position.copy(pose);
        playerShadow.position.set(pose.x, .014, pose.z);
        if (redrawShadow) renderer!.shadowMap.needsUpdate = true;
      },
      setState(state) {
        if (disposed || state === lastState) return;
        const notice = getWorldEventNotice(state);
        if (notice !== eventNotice || state.turn !== lastState?.turn) eventReport.open = false;
        eventNotice = notice;
        lastState = state;
        eventReport.hidden = !eventNotice;
        eventText.textContent = eventNotice;
        eventSummary.title = eventNotice;
        container.dataset.event = eventNotice ? 'active' : 'none';
        if (state.phase !== 'running') applyAstronautGait(astronaut, 0, false);
        if (state.phase === 'ready') walkCycle = 0;
        stations.forEach(station => {
          const status = getStationStatus(station.id, state);
          station.readout.textContent = status.readout;
          station.label.dataset.level = status.level;
          station.label.setAttribute('aria-label', `Select ${STATION_NAMES[station.id]}. ${status.description}`);
          applyStationStatus(station.visual, status, state.resources.power, state.shielding, Boolean(eventNotice));
        });
        const phaseNames = { ready: 'BRIEFING', running: 'MISSION ACTIVE', paused: 'PAUSED', won: 'MISSION COMPLETE', lost: 'TRY ANOTHER PLAN' };
        phaseBadge.textContent = phaseNames[state.phase];
        phaseBadge.dataset.phase = state.phase;
        if (state.phase === 'ready') { selected = undefined; hovered = undefined; }
        updateHighlights();
        updateHint();
        renderer!.shadowMap.needsUpdate = true;
        cameraDirty = true;
      },
      render() {
        if (disposed) return;
        const now = performance.now();
        const delta = (now - previousAnimationTime) / 1000;
        previousAnimationTime = now;
        const active = !document.hidden && lastState?.phase !== 'paused' && lastState?.phase !== 'won' && lastState?.phase !== 'lost';
        expedition.resize(width / height);
        if (journey !== null) { expedition.journey(journey); renderer!.render(expedition.flight, expedition.camera); return; }
        if (interior || level) { expedition.animate(delta, active, reduceMotion); expedition.roomCamera(); renderer!.render(expedition.room, expedition.camera); return; }
        updateAstronautAnimation(astronaut, delta, active, reduceMotion);
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
