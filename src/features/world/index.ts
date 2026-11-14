import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import type { StationId, WorldAdapter } from '../../contracts';

export function createWorld(host: HTMLElement, onInteract: (station: StationId) => void): WorldAdapter {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#261c26');
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 150);
  camera.position.set(15, 18, 23);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight('#ffdfb0', '#4c2c31', 3));
  const sunlight = new THREE.DirectionalLight('#fff0cf', 3);
  sunlight.position.set(8, 15, 5);
  scene.add(sunlight);
  const ground = new THREE.Mesh(new THREE.BoxGeometry(40, .2, 40), new THREE.MeshStandardMaterial({ color: '#a45139', roughness: 1 }));
  ground.position.y = -.1;
  scene.add(ground);
  const stationMeshes: THREE.Mesh[] = [];
  STATIONS.forEach((station, index) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshStandardMaterial({ color: ['#c4d3dd', '#315f92', '#568368'][index] }));
    mesh.position.copy(station.position);
    mesh.userData.stationId = station.id;
    scene.add(mesh);
    stationMeshes.push(mesh);
  });
  const player = new THREE.Mesh(new THREE.CapsuleGeometry(.3, 1), new THREE.MeshStandardMaterial({ color: '#ffca62' }));
  player.position.set(0, .8, 5);
  scene.add(player);
  const raycaster = new THREE.Raycaster();
  const click = (event: MouseEvent) => {
    const bounds = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
    const hit = raycaster.intersectObjects(stationMeshes)[0];
    if (hit) onInteract(hit.object.userData.stationId as StationId);
  };
  renderer.domElement.addEventListener('click', click);
  const resize = () => {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return {
    setPlayerPose(pose) { player.position.copy(pose); },
    setState(_state) { /* Himamshu: visualize outpost status without mutating it. */ },
    render() { renderer.render(scene, camera); },
    dispose() {
      observer.disconnect();
      renderer.domElement.removeEventListener('click', click);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
