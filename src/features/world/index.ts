import * as THREE from 'three';
import { createExpeditionSite } from './expedition-site';
import { createVisualUpgrade } from './visual-upgrade';
import type { FieldSample } from '../../contracts/exploration';
import { createHabitatDome } from './habitat';
import { createAvatarTools } from './avatar-tools';
import { SAMPLE_SITE } from '../../contracts/exploration';
import type { AvatarActivity, PlayerMotion } from '../../contracts/exploration';
import { createEvaEquipment } from './eva-suit';
import { freshHabitatAccess } from '../../contracts/habitat';
import { STATIONS } from '../../contracts';
import type { FlightStage, LaunchFlightSnapshot, LandingFlightSnapshot, GameState, StationId, Vec3, WorldAdapter } from '../../contracts';
import { createLaunchView } from './launch-view';
import { frameOutpost } from './camera';
import { createGroundShadow, createStation, createTerrain, STATION_NAMES } from './models';
import { setAstronautMotion, setAstronautActivity, resetAstronautActions, applyAstronautGait, createAstronaut, updateAstronautAnimation } from './astronaut';
import { createModelKit, WorldResources } from './resources';
import { pickStationAt } from './picking';
import { applyStationStatus, getStationStatus, getWorldEventNotice } from './status';
import './world.css';
import { createExpeditionViews } from './expedition';
import { createNasaLoader } from './nasa-assets';
import { createFollowCamera } from './follow-camera';
import { createEarthCampus } from './earth';
import { createMarsAtmosphere } from './atmosphere';
import { createWorkInteraction, createWorkPrompt, WORK_MACHINES, type WorkWorldAdapter, type MachineId } from './interactables';

export function createWorld(host: HTMLElement, onInteract: (station: StationId) => void): WorldAdapter & WorkWorldAdapter {
  const resources = new WorldResources();
  const container = document.createElement('div');
  container.className = 'ares-world';
  const scene = new THREE.Scene();
  scene.name = 'mars-outpost';
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
    renderer.domElement.tabIndex = -1;
    container.appendChild(renderer.domElement);
    host.appendChild(container);
    scene.background = new THREE.Color('#b87d69');
    const atmosphere=createMarsAtmosphere(scene,resources);cleanups.push(()=>atmosphere.dispose());
    scene.add(new THREE.HemisphereLight('#c3d9dc', '#64504a', 2.05));
    const sun = new THREE.DirectionalLight('#fff2de', 2.8);
    sun.position.set(-18,10,-35);sun.shadow.radius=2.5;
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: .5, far: 65 });
    sun.shadow.normalBias = .02;
    sun.shadow.bias = -.0003;
    cleanups.push(() => sun.shadow.dispose());
    scene.add(sun);
    const kit = createModelKit(resources);
    const earth = createEarthCampus(kit, resources);
    cleanups.push(() => earth.dispose());
    const follow = createFollowCamera(renderer.domElement);
    cleanups.push(() => follow.dispose());
    let cameraMode: 'follow' | 'overview' = 'follow';
    let earthOutside = false;
    const nasa = createNasaLoader(resources);
    cleanups.push(() => nasa.dispose());
    // Scenic references stay outside the walkable boundary: no invisible indoor obstacles.
    const rover = new THREE.Group(); rover.position.set(21, 0, 7); rover.rotation.y = -Math.PI / 3; scene.add(rover);
    void nasa.attach(rover, 'curiosity', 3.2, undefined, true);
    const volcano = new THREE.Group(); volcano.position.set(0, -4.5, -58); scene.add(volcano);
    void nasa.attach(volcano, 'olympus', 58, undefined, true);
    const expedition = createExpeditionViews(kit, resources, nasa);
    cleanups.push(() => expedition.dispose());
    const launchView=createLaunchView(kit,resources,nasa);cleanups.push(()=>launchView.dispose());
    let launchSnapshot:Readonly<LaunchFlightSnapshot>|null=null;
    let landingSnapshot:Readonly<LandingFlightSnapshot>|null=null;
    let interior: StationId | null = null;
    let journey: number | null = null;
    let flightStage: FlightStage | null = null;
    let flightProgress = 0;
    let level: 'earth' | 'space' | null = null;
    let motionPaused = false;
    const doorStates: Record<StationId, boolean> = { habitat: false, solar: false, greenhouse: false };
    let consoleHandler: ((index: number) => void) | null = null;
    const terrain = createTerrain(kit, resources);
    terrain.traverse(object => { if (object instanceof THREE.Mesh) object.receiveShadow = true; });
    scene.add(terrain);
    const dome=createHabitatDome(kit,resources);scene.add(dome.group);
    let habitatAccess=freshHabitatAccess();
    const sampleSite=createExpeditionSite(kit,resources),wayfinding=createVisualUpgrade(kit,resources);scene.add(sampleSite.group,wayfinding.group);
    let sampleStage:FieldSample['stage']|'empty'='empty',sampleProgress=0;
    const astronaut = createAstronaut(kit);
    const suit = new THREE.Group(); suit.position.y = -.8; astronaut.group.add(suit);
    void nasa.attach(suit, 'astronaut', 1.55, astronaut.fallback);
    astronaut.group.position.copy(playerPose);
    scene.add(astronaut.group);
    const avatarTools=createAvatarTools(kit);astronaut.group.add(avatarTools.group);
    let avatarActivity:AvatarActivity={action:'none',progress:0};
    let avatarMotion:PlayerMotion={grounded:true,verticalSpeed:0,body:'mars'};
    const eva=createEvaEquipment(kit);astronaut.group.add(eva.helmet,eva.pack);
    const carriedSample=new THREE.Group();carriedSample.name='sealed-regolith-sample';astronaut.group.add(carriedSample);carriedSample.position.set(.28,-.3,-.02);
    kit.cylinder(carriedSample,kit.materials.ivory,[.065,.22,.065],[0,0,0]);kit.cylinder(carriedSample,kit.materials.orange,[.075,.035,.075],[0,.12,0]);kit.box(carriedSample,kit.materials.glass,[.07,.09,.01],[0,0,.065]);carriedSample.visible=false;
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
    let taskOfferId = '', taskStationsKey = '', taskNoticeRemaining = 0;
    const taskToast = document.createElement('div'); taskToast.className = 'ares-world__task-toast'; taskToast.hidden = true; taskToast.setAttribute('role', 'status'); taskToast.setAttribute('aria-live', 'polite');
    const taskToastText = document.createElement('span');
    const dismissTaskToast = document.createElement('button'); dismissTaskToast.type='button'; dismissTaskToast.textContent='×'; dismissTaskToast.setAttribute('aria-label','Dismiss task notice');
    const dismissTask = () => { taskNoticeRemaining=0;taskToast.hidden=true; };
    dismissTaskToast.addEventListener('click',dismissTask); cleanups.push(()=>dismissTaskToast.removeEventListener('click',dismissTask));
    taskToast.append(taskToastText,dismissTaskToast);container.appendChild(taskToast);
    const interaction=createWorkInteraction();cleanups.push(()=>interaction.dispose());
    const workPrompt=createWorkPrompt(container,()=>{const item=interaction.list().find(item=>item.id===hoveredMachine)??interaction.list()[0];if(item)activateWork(item.id);});cleanups.push(()=>workPrompt.dispose());
    let hoveredMachine:MachineId|undefined;
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
      const shadow = createGroundShadow(resources, 3.5, 3.4);
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
      const taskBadge = document.createElement('span'); taskBadge.className = 'ares-world__task-badge'; taskBadge.textContent = '!'; taskBadge.hidden = true; taskBadge.setAttribute('aria-label', 'Task available');
      label.style.animationDelay = `${STATIONS.indexOf(station) * -.8}s`;
      label.append(name, readout, taskBadge);
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
      return { ...station, visual, label, readout, taskBadge };
    });
    const machineGroups=WORK_MACHINES.map(item=>scene.getObjectByName('work-'+item.id)!).filter(Boolean);
    const markerMaterial=resources.material(new THREE.SpriteMaterial({color:'#fff0bd',transparent:true,depthTest:false,sizeAttenuation:false}));
    const machineMarker=new THREE.Sprite(markerMaterial);machineMarker.name='nearest-work-hint';machineMarker.scale.set(.14,.035,1);machineMarker.visible=false;scene.add(machineMarker);
    let markerId='';
    const markerCanvas=document.createElement('canvas');markerCanvas.width=256;markerCanvas.height=64;
    markerMaterial.map=resources.texture(new THREE.CanvasTexture(markerCanvas));markerMaterial.map.colorSpace=THREE.SRGBColorSpace;
    function updateWorkVisuals(){
      const valid=interaction.list();
      for(const group of machineGroups){const id=group.userData.machineId as MachineId;group.userData.usable=valid.some(item=>item.id===id);const material=group.userData.highlightMaterial as THREE.MeshStandardMaterial;material.emissiveIntensity=group.userData.usable?(hoveredMachine===id?1.8:.9):.3;}
      const nearest=valid.find(item=>item.id===hoveredMachine)??valid[0];machineMarker.visible=!!nearest&&cameraMode==='follow';workPrompt.setEnabled(!!nearest);
      if(nearest){machineMarker.position.set(nearest.position.x,2.05,nearest.position.z);
        if(markerId!==nearest.id){markerId=nearest.id;const c=markerCanvas.getContext('2d');if(c){c.fillStyle='#143340';c.fillRect(0,0,256,64);c.strokeStyle='#ffe3a0';c.lineWidth=3;c.strokeRect(2,2,252,60);c.fillStyle='#fff4d0';c.font='bold 26px sans-serif';c.textAlign='center';c.fillText('E · '+nearest.id.toUpperCase(),128,42);markerMaterial.map!.needsUpdate=true;}}
      }
    }
    // One grounded suit lives at the actual equip point; no unrelated suit in the solar lab.
    void nasa.attach(dome.suitMount,'spaceMan',1.8,dome.suitFallback);
    function activateWork(id:MachineId){
      if(!interaction.activate(id))return false;
      const group=machineGroups.find(group=>group.userData.machineId===id);if(group)group.userData.pressRemaining=.18;
      if(isLocked())unlockMouse();workPrompt.setEnabled(false);return true;
    }
    function updateHint(): void {
      hint.textContent = selected
        ? `${STATION_NAMES[selected]} selected · ${lastState ? getStationStatus(selected, lastState).description : 'Use the mission buttons to make decisions.'}`
        : 'WASD to walk · Drag to look · E to use';
    }
    function updateHighlights(): void {
      stations.forEach(station => {
        station.visual.selection.visible = station.id === selected || station.id === hovered;
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

    let width = 1;
    let height = 1;
    let cameraDirty = true;
    const cameraChanged = () => { cameraDirty = true; };
    follow.controls.addEventListener('change', cameraChanged);
    cleanups.push(() => follow.controls.removeEventListener('change', cameraChanged));
    const cameraBar = document.createElement('div'); cameraBar.className = 'ares-world__camera-controls'; cameraBar.setAttribute('aria-label', 'Camera controls');
    const modeButton = document.createElement('button');
    const viewButton = document.createElement('button');

    // ============================================================================
    // MOUSE LOCK & CAMERA LOOK CONTROLLER
    // ============================================================================
    let firstPerson = false;
    let virtualLock = false;
    let hasLastCursor = false;
    const lookLast = new THREE.Vector2();

    const isNativeLocked = () =>
      Boolean(document.pointerLockElement) &&
      (document.pointerLockElement === renderer!.domElement ||
        document.pointerLockElement === container ||
        document.pointerLockElement === host ||
        document.pointerLockElement === document.body);

    const isLocked = () => isNativeLocked() || virtualLock;

    const crosshair = document.createElement('span');
    crosshair.className = 'ares-world__crosshair';
    crosshair.setAttribute('aria-hidden', 'true');
    const lookHint = document.createElement('p');
    lookHint.className = 'ares-world__look-hint';
    lookHint.setAttribute('role', 'status');
    container.append(crosshair, lookHint);

    const updateLookUI = () => {
      const lockedState = isLocked();
      container.classList.toggle('ares-world--locked', lockedState);
      renderer!.domElement.style.cursor = lockedState ? 'none' : '';
      container.style.cursor = lockedState ? 'none' : '';
      if (lockedState) {
        lookHint.textContent = 'Mouse locked · move mouse to look · Right-click or Esc to unlock · V switches view';
      } else {
        lookHint.textContent = 'Mouse unlocked · Right-click (or click in 1st person) to lock mouse · V switches view';
      }
      cameraDirty = true;
    };
    updateLookUI();

    const tryNativePointerLock = () => {
      const targetEl = renderer!.domElement;
      if (typeof targetEl.requestPointerLock !== 'function') return;
      try {
        // Disable OrbitControls BEFORE requesting pointer lock so it doesn't hold pointer capture
        follow.controls.enabled = false;
        const result = targetEl.requestPointerLock() as unknown;
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => {
            // Native lock rejected (e.g., sandboxed iframe or keyboard gesture); virtualLock remains active
            updateLookUI();
          });
        }
      } catch {
        updateLookUI();
      }
    };

    const lockMouse = () => {
      if (disposed || motionPaused || lastState?.phase==='paused' || journey !== null || flightStage !== null) return;
      if (cameraMode !== 'follow') {
        cameraMode = 'follow';
        modeButton.textContent = 'Overview';
        modeButton.setAttribute('aria-label', 'Overview');
        follow.reset();
      }
      virtualLock = true;
      hasLastCursor = false;
      follow.controls.enabled = false;
      if (!isNativeLocked()) {
        tryNativePointerLock();
      }
      updateLookUI();
    };

    const unlockMouse = () => {
      virtualLock = false;
      hasLastCursor = false;
      if (isNativeLocked() && typeof document.exitPointerLock === 'function') {
        try {
          document.exitPointerLock();
        } catch {
          // Ignore if already unlocked
        }
      }
      follow.controls.enabled = cameraMode === 'follow' && journey === null && !firstPerson;
      updateLookUI();
    };

    const setFirstPerson = (next: boolean, fromUserGesture = false) => {
      if (disposed || firstPerson === next || flightStage !== null) return;
      if (next && cameraMode !== 'follow') {
        cameraMode = 'follow';
        modeButton.textContent = 'Overview';
        modeButton.setAttribute('aria-label', 'Overview');
        follow.reset();
      }
      firstPerson = next;
      follow.setFirstPerson(next);
      viewButton.textContent = next ? 'Third person' : 'First person';
      viewButton.setAttribute('aria-label', next ? 'Switch to third person view' : 'Switch to first person view');
      container.classList.toggle('ares-world--first', next);
      astronaut.group.visible = !next;
      expedition.setAvatarVisible(!next);

      if (next && journey === null) {
        virtualLock = true;
        follow.controls.enabled = false;
        if (fromUserGesture) {
          tryNativePointerLock();
        }
      } else if (!next) {
        unlockMouse();
      }
      updateLookUI();
    };

    const isSceneElement = (target: EventTarget | null): boolean => {
      if (!(target instanceof Node)) return false;
      if (target === renderer!.domElement) return true;
      if (!container.contains(target)) return false;
      if (
        target instanceof Element &&
        target.closest('button, summary, details, input, select, textarea, a, .ares-world__camera-controls, .ares-world__label, .ares-world__task-toast')
      ) {
        return false;
      }
      return true;
    };

    const applyCameraDelta = (dx: number, dy: number) => {
      if (dx === 0 && dy === 0) return;
      if (firstPerson) {
        follow.look(dx, dy);
      } else {
        follow.orbitLook(dx, dy);
      }
      cameraDirty = true;
    };

    const onPointerOrMouseMove = (event: MouseEvent | PointerEvent) => {
      if (disposed || motionPaused || lastState?.phase==='paused' || journey !== null || flightStage !== null) return;

      // Case 1: Browser native pointer lock is active
      if (isNativeLocked()) {
        const dx = event.movementX || 0;
        const dy = event.movementY || 0;
        applyCameraDelta(dx, dy);
        return;
      }

      // Case 2: Virtual lock is active OR right-button drag in first-person
      const rightButtonHeld = (event.buttons & 2) !== 0;
      if (!virtualLock && !(firstPerson && rightButtonHeld)) {
        hasLastCursor = false;
        return;
      }

      let dx = event.movementX;
      let dy = event.movementY;
      // Fallback to clientX/clientY delta if movementX/Y is 0 or unsupported outside native lock
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) {
        if (hasLastCursor) {
          dx = event.clientX - lookLast.x;
          dy = event.clientY - lookLast.y;
        } else {
          dx = 0;
          dy = 0;
        }
      }
      lookLast.set(event.clientX, event.clientY);
      hasLastCursor = true;
      applyCameraDelta(dx, dy);
    };

    // Capture-phase pointerdown runs BEFORE Three.js OrbitControls can call preventDefault() or setPointerCapture()
    const onCapturePointerDown = (event: PointerEvent) => {
      if (disposed || motionPaused || lastState?.phase==='paused' || journey !== null || flightStage !== null) return;
      const onScene = isSceneElement(event.target);

      // Right-click (button === 2) toggles mouse lock on/off in Follow or First-Person mode
      if (event.button === 2 && (onScene || isLocked())) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (isLocked()) {
          unlockMouse();
        } else {
          lookLast.set(event.clientX, event.clientY);
          hasLastCursor = true;
          lockMouse();
        }
        return;
      }

      // Left-click (button === 0) on the scene when in First-Person (or already virtually locked) engages native pointer lock
      if (event.button === 0 && onScene && (firstPerson || virtualLock) && !isNativeLocked()) {
        lookLast.set(event.clientX, event.clientY);
        hasLastCursor = true;
        lockMouse();
      }
    };

    const onPointerLockChange = () => {
      if(motionPaused && isNativeLocked()){unlockMouse();return;}
      if (isNativeLocked()) {
        virtualLock = true;
        follow.controls.enabled = false;
      } else {
        // User pressed Esc to exit native pointer lock
        virtualLock = false;
        follow.controls.enabled = cameraMode === 'follow' && journey === null && !firstPerson;
      }
      hasLastCursor = false;
      updateLookUI();
    };

    const onPointerLockError = () => {
      // Keep virtualLock working even if browser denied native pointer lock
      updateLookUI();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isLocked()) {
        unlockMouse();
        return;
      }
      if(motionPaused || lastState?.phase==='paused')return;
      if (event.code !== 'KeyV' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || journey !== null || flightStage !== null) return;
      if ((event.target as HTMLElement | null)?.closest?.('button, input, textarea, select, [contenteditable]')) return;
      setFirstPerson(!firstPerson, false);
    };

    const onContextMenu = (event: Event) => {
      if (isLocked() || isSceneElement(event.target)) {
        event.preventDefault();
      }
    };

    // With the mouse locked, interaction aims from the screen centre (the crosshair).
    const pointer = new THREE.Vector2();
    const aim = (event: MouseEvent, rect: DOMRect) => {
      if (isLocked()) pointer.set(0, 0);
      else pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    };

    const raycaster = new THREE.Raycaster();
    const pickCamera = () => cameraMode === 'follow' ? follow.camera : level === 'space' ? expedition.camera : camera;
    const pointerStart = new THREE.Vector2();
    let dragged = false;
    const startDrag = (event: PointerEvent) => {
      pointerStart.set(event.clientX, event.clientY);
      lookLast.set(event.clientX, event.clientY);
      hasLastCursor = true;
      dragged = false;
    };
    const trackDrag = (event: PointerEvent) => {
      if (!isLocked() && event.buttons && pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 6) {
        dragged = true;
      }
    };
    const stationAt = (event: MouseEvent): StationId | undefined => {
      const rect = renderer!.domElement.getBoundingClientRect();
      if (disposed || !rect.width || !rect.height) return;
      if (cameraDirty) updateCamera();
      scene.updateMatrixWorld(true);
      aim(event, rect);
      return pickStationAt(pointer, pickCamera(), stationGroups, raycaster);
    };
    const stationGroups = stations.map(station => station.visual.group);
    const machineAt=(event:MouseEvent|PointerEvent):MachineId|undefined=>{
      const rect=renderer!.domElement.getBoundingClientRect();aim(event,rect);
      scene.updateMatrixWorld(true);raycaster.setFromCamera(pointer,pickCamera());
      const hit=raycaster.intersectObjects(stationGroups,true).find(hit=>{let object:THREE.Object3D|null=hit.object;while(object){if(!object.visible)return false;object=object.parent;}return true;});
      const id=hit?.object.userData.machineId as MachineId|undefined;
      return interaction.list().some(item=>item.id===id)?id:undefined;
    };
    const workKey=(event:KeyboardEvent)=>{
      if(event.code!=='KeyE'||event.repeat||event.defaultPrevented||(event.target as HTMLElement|null)?.closest('input,textarea,select,[contenteditable],.command-panel'))return;
      const nearest=interaction.list().find(item=>item.id===hoveredMachine)??interaction.list()[0];if(nearest&&activateWork(nearest.id)){event.preventDefault();workPrompt.setEnabled(false);}
    };
    window.addEventListener('keydown',workKey);cleanups.push(()=>window.removeEventListener('keydown',workKey));
    const click = (event: MouseEvent) => {
      if (firstPerson && !isNativeLocked() && isSceneElement(event.target)) {
        tryNativePointerLock();
      }
      if (dragged) { dragged = false; return; }
      if(interior&&!level){const id=machineAt(event);if(id){activateWork(id);}return;}
      if (interior || level) {
        const rect = renderer!.domElement.getBoundingClientRect();
        aim(event, rect);
        let control: number | undefined;
        if (level === 'space') control = expedition.pickControl(pointer, pickCamera());
        else {
          raycaster.setFromCamera(pointer, pickCamera());
          const groups = level === 'earth' ? earth.stations.map(station => station.visual.group) : stationGroups;
          control = raycaster.intersectObjects(groups, true)[0]?.object.userData.controlIndex;
        }
        if (control !== undefined) consoleHandler?.(control);
        return;
      }
      const id = stationAt(event); if (id) selectStation(id);
    };
    const move = (event: PointerEvent) => {
      if(interior&&!level){hoveredMachine=machineAt(event);renderer!.domElement.style.cursor=hoveredMachine?'pointer':'';updateWorkVisuals();return;}
      if (interior || level) return;
      const id = stationAt(event);
      if (id === hovered) return;
      hovered = id;
      if (!isLocked()) {
        renderer!.domElement.style.cursor = id ? 'pointer' : '';
      }
      updateHighlights();
    };
    const leave = () => {
      hoveredMachine=undefined;updateWorkVisuals();
      hovered = undefined;
      hasLastCursor = false;
      if (!isLocked()) renderer!.domElement.style.cursor = '';
      updateHighlights();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { selected = undefined; hovered = undefined; updateHighlights(); updateHint(); }
    };

    window.addEventListener('pointerdown', onCapturePointerDown, true);
    document.addEventListener('mousemove', onPointerOrMouseMove, true);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('contextmenu', onContextMenu, true);

    renderer.domElement.addEventListener('click', click);
    renderer.domElement.addEventListener('pointerdown', startDrag);
    renderer.domElement.addEventListener('pointermove', trackDrag);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerleave', leave);
    container.addEventListener('keydown', key);

    cleanups.push(() => {
      unlockMouse();
      window.removeEventListener('pointerdown', onCapturePointerDown, true);
      document.removeEventListener('mousemove', onPointerOrMouseMove, true);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('pointerlockerror', onPointerLockError);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('contextmenu', onContextMenu, true);

      renderer!.domElement.removeEventListener('click', click);
      renderer!.domElement.removeEventListener('pointerdown', startDrag);
      renderer!.domElement.removeEventListener('pointermove', trackDrag);
      renderer!.domElement.removeEventListener('pointermove', move);
      renderer!.domElement.removeEventListener('pointerleave', leave);
      container.removeEventListener('keydown', key);
    });

    const buttons: [HTMLButtonElement, string, () => void][] = [
      [viewButton, 'First person', () => { setFirstPerson(!firstPerson, true); viewButton.blur(); }],
      [modeButton, 'Overview', () => { if (firstPerson) setFirstPerson(false, true); if (isLocked()) unlockMouse(); cameraMode = cameraMode === 'follow' ? 'overview' : 'follow'; modeButton.textContent = cameraMode === 'follow' ? 'Overview' : 'Follow camera'; modeButton.setAttribute('aria-label', modeButton.textContent); follow.reset(); cameraDirty = true; }],
      [document.createElement('button'), 'Rotate left', () => follow.rotate(.35)],
      [document.createElement('button'), 'Rotate right', () => follow.rotate(-.35)],
      [document.createElement('button'), 'Zoom in', () => follow.zoom(true)],
      [document.createElement('button'), 'Zoom out', () => follow.zoom(false)],
      [document.createElement('button'), 'Reset camera', () => follow.reset()],
    ];
    const cameraMenu=document.createElement('details');const cameraSummary=document.createElement('summary');cameraSummary.textContent='Camera';cameraMenu.appendChild(cameraSummary);
    const cameraKey=(event:KeyboardEvent)=>event.stopPropagation();cameraMenu.addEventListener('keydown',cameraKey);cleanups.push(()=>cameraMenu.removeEventListener('keydown',cameraKey));
    const cameraOptions=document.createElement('div');cameraOptions.className='ares-world__camera-options';cameraMenu.appendChild(cameraOptions);cameraBar.appendChild(cameraMenu);
    for(const [button,label,action] of buttons) {
      button.type='button';button.textContent=label;button.setAttribute('aria-label',label);button.addEventListener('click',action);cameraOptions.appendChild(button);cleanups.push(()=>button.removeEventListener('click',action));
    }
    container.appendChild(cameraBar);

    const cockpitFrame = document.createElement('div');
    cockpitFrame.className = 'ares-world__cockpit-frame';
    cockpitFrame.hidden = true;
    cockpitFrame.setAttribute('aria-hidden', 'true');
    const windshield = document.createElement('div'); windshield.className = 'ares-world__cockpit-windshield';
    const hud = document.createElement('div'); hud.className = 'ares-world__cockpit-hud'; hud.textContent = 'ARES  /  FORWARD FLIGHT DECK';
    const dashboard = document.createElement('div'); dashboard.className = 'ares-world__cockpit-dashboard';
    const dashboardLabel = document.createElement('span'); dashboardLabel.textContent = 'FLIGHT COMPUTER';
    const instrumentRow = document.createElement('div'); instrumentRow.className = 'ares-world__cockpit-instruments';
    for (const label of ['ATTITUDE', 'THRUST', 'GUIDANCE']) {
      const instrument = document.createElement('span'); instrument.className = 'ares-world__cockpit-instrument';
      const face = document.createElement('i'); face.setAttribute('aria-hidden', 'true');
      const caption = document.createElement('small'); caption.textContent = label;
      instrument.append(face, caption); instrumentRow.appendChild(instrument);
    }
    dashboard.append(dashboardLabel, instrumentRow);
    cockpitFrame.append(windshield, hud, dashboard);
    container.appendChild(cockpitFrame);

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
      if (cameraMode === 'overview') frameOutpost(camera, width / height, playerPose);
      const labelCamera = cameraMode === 'follow' ? follow.camera : camera;
      const labels = stations.map(station => {
        projected.set(station.position.x, 3.5, station.position.z).project(labelCamera);
        station.label.hidden = cameraMode === 'follow' && (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.15);
        return {
          station,
          x: Math.max(67, Math.min(width - 67, (projected.x + 1) * width / 2)),
          y: Math.max(112, Math.min(height - 170, (1 - projected.y) * height / 2)),
        };
      });
      // At map edges a wider camera can cluster labels. Use a readable legend row.
      const compact = width < 250 || height < 260 || labels.some((a, i) => labels.some((b, j) => i < j && Math.abs(a.x - b.x) < 140 && Math.abs(a.y - b.y) < 65));
      container.classList.toggle('ares-world--compact-labels', compact);
      if (compact && cameraMode === 'overview') frameOutpost(camera, width / height, playerPose, { top: 106 / height, bottom: 48 / height });
      labels.forEach(({ station, x, y }, index) => {
        station.label.style.left = `${compact ? (index + .5) * width / 3 : x}px`;
        station.label.style.top = `${compact ? 112 : y}px`;
      });
      playerMarker.hidden = cameraMode === 'follow' || Math.hypot(playerPose.x, playerPose.z) < 12;
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
      setInteractables(list){if(disposed)return;interaction.setInteractables(list);updateWorkVisuals();},
      onInteract(handler){if(!disposed)interaction.onInteract(handler);},
      setPrompt(text){if(!disposed){const hover=interaction.list().find(item=>item.id===hoveredMachine);workPrompt.setPrompt(hover?'E · '+hover.label:text);}},
      setAvailableTasks(ids, offerId) {
        if (disposed) return;
        const key = ids.join(',');
        if (key !== taskStationsKey) {
          taskStationsKey = key;
          stations.forEach(station => {
            const available = ids.includes(station.id);
            station.taskBadge.hidden = !available; station.label.dataset.task = String(available);
            const label = (station.label.getAttribute('aria-label') ?? STATION_NAMES[station.id]).replace(/\. Task available$/, '');
            station.label.setAttribute('aria-label', label + (available ? '. Task available' : ''));
          });
        }
        if(ids.length && offerId!==taskOfferId) {
          taskToastText.textContent='Find a glowing machine. Press E to work.';
          taskNoticeRemaining=5;
        }
        taskOfferId = offerId;
        if (!ids.length) { taskNoticeRemaining = 0; taskToast.hidden = true; }
      },
      getCameraYaw() { return cameraMode === 'follow' ? follow.yaw() : 0; },
      setEarthOutside(outside) { earthOutside = outside; },
      setMotionPaused(paused) { motionPaused = paused; if(paused && isLocked())unlockMouse(); },
      setDoorState(id, open) {
        if (disposed) return;
        doorStates[id] = open;
        if (id === 'habitat' && level === 'earth') earth.labDoor.setOpen(open);
        stations.find(station => station.id === id)?.visual.door.setOpen(open);
        renderer!.shadowMap.needsUpdate = true;
      },
      isDoorOpen(id) { return level === 'earth' && id === 'habitat' ? earth.labDoor.isOpen() : stations.find(station => station.id === id)?.visual.door.isOpen() ?? false; },
      setConsoleHandler(handler) { if (!disposed) consoleHandler = handler; },
      setPlayerMotion(motion){avatarMotion=motion;setAstronautMotion(astronaut,motion);},
      setAvatarActivity(activity){
        if(activity.action!==avatarActivity.action && activity.action!=='none'){
          if(firstPerson)setFirstPerson(false,true);cameraMode='follow';follow.reset();cameraDirty=true;
        }
        follow.setWorkFocus(activity.action);
        avatarActivity=activity;setAstronautActivity(astronaut,activity);
      },
      setSampleStage(stage,progress){sampleStage=stage;sampleProgress=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;carriedSample.visible=stage==='collected';},
      setHabitatAccess(access) { habitatAccess=access;dome.update(access); },
      setLevel(id) {
        if (disposed || level === id) return;
        level = id;
        if (id !== 'earth') earthOutside = false;
        if (id === 'space') expedition.interior(id);
        container.classList.toggle('ares-world--interior', Boolean(id || interior));
        heading.childNodes[0].textContent = id === 'earth' ? 'EARTH / FLIGHT OPERATIONS' : id === 'space' ? 'ARES / ROCKET FLIGHT CABIN' : 'ARES / OUTPOST 01';
        subtitle.textContent = id === 'space' ? 'Zero-g crew cabin. Complete the flight tasks, then return to your seat.' : id ? 'Prepare the expedition. Complete the checks.' : 'A small base. Big decisions.';
        hint.textContent = id === 'space' ? 'WASD / arrows · drift between the three flight stations' : id ? 'WASD / arrows · walk to the numbered console screens' : 'Select a base module · WASD / arrows to walk';
      },
      setCabinSeatState(state) {
        if (disposed) return;
        expedition.setCabinSeatState(state);
      },
      setActivityProgress(progress) {
        if (disposed) return;
        expedition.progress(progress);
        const collection = level === 'earth' ? earth.stations : stations;
        const id = level === 'earth' ? 'habitat' : interior;
        collection.find(station => station.id === id)?.visual.screens.forEach((screen, i) => { screen.color.set(i < progress ? '#96d8a8' : '#80cbda'); screen.emissive.set(i < progress ? '#478e60' : '#18374e'); });
      },
      setInterior(id) {
        if (disposed || interior === id) return;
        interior = id;
        container.classList.toggle('ares-world--interior', Boolean(id));
        heading.childNodes[0].textContent = id ? `ARES / ${STATION_NAMES[id].toUpperCase()} INTERIOR` : 'ARES / OUTPOST 01';
        hint.textContent = id ? `Inside ${STATION_NAMES[id]} · explore with WASD · E opens/closes the front exit` : 'Walk to a striped door · E opens/closes · walk through to enter';
      },
      setJourney(progress) {
        if (disposed) return;
        journey = progress !== null && Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : null;
        container.classList.toggle('ares-world--journey', journey !== null);
        if (journey !== null) unlockMouse();
      },
      setFlightStage(stage: FlightStage | null, progress: number) {
        if (disposed) return;
        flightStage = stage;
        flightProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
        cockpitFrame.hidden = stage === null || (!!launchSnapshot && (stage==='launch'||stage==='orbit-autopilot'));
        container.classList.toggle('ares-world--cockpit', stage !== null);
        if (stage !== null) unlockMouse();
      },
      setLaunchFlight(snapshot){
        if(disposed)return;
        launchSnapshot=snapshot;
        cockpitFrame.hidden=flightStage===null || (!!snapshot && (flightStage==='launch'||flightStage==='orbit-autopilot'));
      },
      setLandingFlight(snapshot){
        if(disposed)return;landingSnapshot=snapshot;
        if(snapshot){container.style.setProperty('--lander-pitch',`${snapshot.pitch}deg`);container.style.setProperty('--lander-thrust',`${snapshot.throttle*230-115}deg`);container.style.setProperty('--entry-heat',String(snapshot.heat*.45));}
        else{container.style.removeProperty('--lander-pitch');container.style.removeProperty('--lander-thrust');container.style.removeProperty('--entry-heat');}
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
        if (distance >= 1) {resetAstronautActions(astronaut);avatarTools.reset();walkCycle = 0;} // A reset/teleport is not a walking stride.
        applyAstronautGait(astronaut, walkCycle, moving);
        expedition.pose(pose, moving);
        if (playerPose.x !== pose.x || playerPose.y !== pose.y || playerPose.z !== pose.z) cameraDirty = true;
        playerPose.copy(pose);
        astronaut.group.position.copy(pose);
        if(avatarActivity.action==='dig')astronaut.group.rotation.y=Math.atan2(SAMPLE_SITE.x-pose.x,SAMPLE_SITE.z-pose.z);
        else if(avatarActivity.action==='research')astronaut.group.rotation.y=Math.PI;
        playerShadow.position.set(pose.x, .014, pose.z);
        if (redrawShadow) renderer!.shadowMap.needsUpdate = true;
      },
      setState(state) {
        if (disposed || state === lastState) return;
        if(state.phase==='ready'&&lastState?.phase!=='ready'){resetAstronautActions(astronaut);avatarTools.reset();}
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
          station.label.setAttribute('aria-label', `Select ${STATION_NAMES[station.id]}. ${status.description}${station.taskBadge.hidden ? '' : '. Task available'}`);
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
        const pausedOrEnded = motionPaused || document.hidden || lastState?.phase === 'paused' || lastState?.phase === 'won' || lastState?.phase === 'lost';
        const active = !pausedOrEnded;
        sampleSite.update(sampleStage==='researching'?'collected':sampleStage,sampleProgress,delta,active,reduceMotion);wayfinding.update(delta,active,reduceMotion);
        container.classList.toggle('ares-world--paused',!active);atmosphere.update(delta,active,reduceMotion);
        machineGroups.forEach(group=>{let remaining=group.userData.pressRemaining??0;if(reduceMotion)remaining=0;else if(active)remaining=Math.max(0,remaining-Math.min(.05,delta));group.userData.pressRemaining=remaining;group.scale.setScalar(1-Math.sin(remaining/.18*Math.PI)*.025);});
        if (isLocked() && (pausedOrEnded || journey !== null)) {
          unlockMouse();
        }
        if (active) taskNoticeRemaining = Math.max(0, taskNoticeRemaining - Math.min(.1, delta));
        taskToast.hidden = taskNoticeRemaining <= 0 || Boolean(level || interior) || journey !== null;
        follow.update(playerPose, width / height, level === 'earth' ? 'earth' : level === 'space' ? 'room' : 'mars', cameraMode === 'follow' && journey === null);
        follow.controls.enabled = active && cameraMode === 'follow' && journey === null && !firstPerson && !isLocked();
        cameraBar.hidden = journey !== null || flightStage !== null;
        cameraDirty ||= cameraMode === 'follow';
        stations.forEach(station => {
          const before = station.visual.door.group.userData.openProgress;
          station.visual.door.update(active ? delta : 0, reduceMotion);
          if (before !== station.visual.door.group.userData.openProgress) renderer!.shadowMap.needsUpdate = true;
        });
        expedition.resize(width / height);
        if (flightStage !== null) {
          if(launchSnapshot&&(flightStage==='launch'||flightStage==='orbit-autopilot')){
            launchView.update(launchSnapshot,width/height,delta,active,reduceMotion);
            renderer!.render(launchView.scene,launchView.camera);return;
          }
          expedition.cockpit(flightStage, flightProgress, delta, active, reduceMotion,landingSnapshot);
          renderer!.render(expedition.cockpitFlight, expedition.cockpitCamera);
          return;
        }
        if (journey !== null) { expedition.journey(journey); renderer!.render(expedition.flight, expedition.camera); return; }
        const buildings = level === 'earth' ? earth.stations : stations;
        buildings.forEach(station => {
          const inside = level === 'earth' ? !earthOutside && station.id === 'habitat' : interior === station.id;
          station.visual.roof.visible = !(inside && (cameraMode === 'overview'||avatarActivity.action==='research'));
          station.visual.walls.forEach((wall, index) => { wall.visible = !(inside && ((cameraMode === 'overview' && (index === 3 || index === 4))||(avatarActivity.action==='research'&&(index===1||index===2||index===3||index===4)))); });
        });
        if (cameraMode === 'follow' && level !== 'space' && !firstPerson) {
          buildings.forEach(station => station.visual.group.updateMatrixWorld(true));
          dome.group.updateMatrixWorld(true);
          follow.avoidOcclusion([...buildings.flatMap(station => [...station.visual.walls, station.visual.roof, station.visual.door.group]),...(level===null?dome.occluders:[])]);
        }
        if (level === 'earth') {
          if (astronaut.group.parent !== earth.scene) earth.scene.add(astronaut.group);
          earth.labDoor.update(active ? delta : 0, reduceMotion);
          earth.update(active ? delta : 0, reduceMotion);
          updateAstronautAnimation(astronaut, delta, active, reduceMotion);
          if (cameraDirty) updateCamera();
          renderer!.render(earth.scene, cameraMode === 'follow' ? follow.camera : camera); return;
        }
        if (level === 'space') { expedition.animate(delta, active, reduceMotion); expedition.roomCamera(); expedition.cutaway(cameraMode === 'follow' ? follow.camera : expedition.camera); renderer!.render(expedition.room, cameraMode === 'follow' ? follow.camera : expedition.camera); return; }
        if (astronaut.group.parent !== scene) scene.add(astronaut.group);
        updateAstronautAnimation(astronaut, delta, active, reduceMotion);
        if (cameraDirty) updateCamera();
        avatarTools.update(astronaut.group,avatarActivity,delta,active,reduceMotion);
        eva.update(astronaut.group,habitatAccess.suited);
        if(active&&(avatarActivity.action!=='none'||!avatarMotion.grounded))renderer!.shadowMap.needsUpdate=true;
        renderer!.render(scene, cameraMode === 'follow' ? follow.camera : camera);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
