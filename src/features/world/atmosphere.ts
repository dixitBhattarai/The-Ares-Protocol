import * as THREE from 'three';
import { STATIONS } from '../../contracts';
import type { WorldResources } from './resources';

export function glowTexture(resources: WorldResources): THREE.Texture {
  const side = 64;
  const data = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const r = Math.hypot((x + 0.5) / side * 2 - 1, (y + 0.5) / side * 2 - 1);
      const i = (y * side + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.max(0, Math.round(Math.pow(Math.max(0, 1 - r), 3) * 190));
    }
  }
  const texture = resources.texture(new THREE.DataTexture(data, side, side));
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates the cinematic Martian atmosphere:
 * - Reddish-pink to dusty mauve atmospheric sky with genuine blue sunset glow around the sun
 * - Both Martian moons visible in orbit: Phobos (irregular asteroid potato) & Deimos
 * - Shimmering distant starfield
 * - Swirling dust storms & flying dust particles
 */
export function createMarsAtmosphere(scene: THREE.Scene, resources: WorldResources) {
  // Rich reddish-orange atmospheric distance fog
  scene.fog = new THREE.FogExp2('#b87d69', 0.0095);

  const cleanupObjects: THREE.Object3D[] = [];

  // =========================================================================
  // 1. MARTIAN SKY WITH BLUE SUNSET GLOW SHADER
  // =========================================================================
  const skyGeo = resources.geometry(new THREE.SphereGeometry(180, 32, 16));
  const sunDir = new THREE.Vector3(-0.35, 0.28, -0.89).normalize();

  const skyMat = resources.material(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        zenith: { value: new THREE.Color('#4c323c') }, // Deep dusty twilight violet
        horizon: { value: new THREE.Color('#e0987c') }, // Warm Martian peach/butterscotch
        nadir: { value: new THREE.Color('#944e3d') }, // Dark rust ground reflection
        sunDirection: { value: sunDir },
        sunBlueGlow: { value: new THREE.Color('#7ec3ed') }, // Authentic NASA blue sunset Rayleigh scatter
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 zenith, horizon, nadir, sunBlueGlow, sunDirection;
        varying vec3 vDirection;
        void main() {
          vec3 dir = normalize(vDirection);
          // Vertical sky gradient
          vec3 c = mix(horizon, zenith, smoothstep(-0.02, 0.42, dir.y));
          c = mix(c, nadir, smoothstep(0.0, 0.55, -dir.y));

          // Blue twilight glow around the Martian Sun
          float sunDot = max(0.0, dot(dir, sunDirection));
          float blueHalo = pow(sunDot, 18.0) * 0.75 + pow(sunDot, 6.0) * 0.35;
          c = mix(c, sunBlueGlow, clamp(blueHalo, 0.0, 0.85));

          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
  );

  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'mars-gradient-sky';
  scene.add(sky);
  cleanupObjects.push(sky);

  // =========================================================================
  // 2. MARTIAN SUN & SOLAR TWILIGHT HALO
  // =========================================================================
  const sunHalo = new THREE.Sprite(
    resources.material(
      new THREE.SpriteMaterial({
        map: glowTexture(resources),
        color: '#9ad0f5', // Blue scattering halo
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    )
  );
  sunHalo.position.set(-45, 36, -114);
  sunHalo.scale.set(42, 42, 1);
  scene.add(sunHalo);
  cleanupObjects.push(sunHalo);

  const sunMesh = new THREE.Mesh(
    resources.geometry(new THREE.SphereGeometry(2.0, 16, 12)),
    resources.material(
      new THREE.MeshBasicMaterial({
        color: '#fffbf0',
        fog: false,
        toneMapped: false,
      })
    )
  );
  sunMesh.name = 'mars-sun';
  sunMesh.position.copy(sunHalo.position);
  scene.add(sunMesh);
  cleanupObjects.push(sunMesh);

  // =========================================================================
  // 3. MARTIAN MOONS: PHOBOS & DEIMOS
  // =========================================================================
  const moonMat = resources.material(
    new THREE.MeshStandardMaterial({
      color: '#948a82',
      roughness: 0.95,
      metalness: 0.05,
      fog: false,
    })
  );

  // Phobos: Irregular asteroid potato moon with impact cratering
  const phobosGroup = new THREE.Group();
  phobosGroup.name = 'mars-moon-phobos';
  phobosGroup.position.set(-52, 85, -88);

  const phobosGeo = resources.geometry(new THREE.DodecahedronGeometry(3.6, 1));
  // Deform slightly to give irregular asteroid shape
  const phobosPos = phobosGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < phobosPos.count; i++) {
    const vx = phobosPos.getX(i);
    const vy = phobosPos.getY(i);
    const vz = phobosPos.getZ(i);
    const deform = 1 + Math.sin(vx * 1.5) * 0.12 + Math.cos(vz * 1.2) * 0.15;
    phobosPos.setXYZ(i, vx * deform * 1.2, vy * deform * 0.9, vz * deform * 1.05);
  }
  phobosGeo.computeVertexNormals();

  const phobosMesh = new THREE.Mesh(phobosGeo, moonMat);
  phobosGroup.add(phobosMesh);

  // Stickney crater indentation on Phobos
  const craterGeo = resources.geometry(new THREE.RingGeometry(0.8, 1.4, 16));
  const craterMat = resources.material(
    new THREE.MeshBasicMaterial({
      color: '#5e5652',
      side: THREE.DoubleSide,
    })
  );
  const stickneyCrater = new THREE.Mesh(craterGeo, craterMat);
  stickneyCrater.position.set(2.8, 0.4, 1.2);
  stickneyCrater.rotation.set(0.4, 0.8, 0);
  phobosGroup.add(stickneyCrater);

  scene.add(phobosGroup);
  cleanupObjects.push(phobosGroup);

  // Deimos: Smaller, distant brighter moon
  const deimosMesh = new THREE.Mesh(
    resources.geometry(new THREE.DodecahedronGeometry(1.4, 0)),
    moonMat
  );
  deimosMesh.name = 'mars-moon-deimos';
  deimosMesh.position.set(65, 96, -110);
  scene.add(deimosMesh);
  cleanupObjects.push(deimosMesh);

  // Faint celestial stars
  const starPoints: number[] = [];
  for (let i = 0; i < 180; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * (Math.PI * 0.42); // Upper sky only
    const r = 175;
    starPoints.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) + 10,
      r * Math.sin(phi) * Math.sin(theta)
    );
  }
  const starGeo = resources.geometry(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPoints, 3)));
  const starMat = resources.material(
    new THREE.PointsMaterial({
      color: '#ffedd5',
      size: 0.65,
      transparent: true,
      opacity: 0.65,
      fog: false,
    })
  );
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  cleanupObjects.push(stars);

  // =========================================================================
  // 4. FLYING DUST PARTICLES & DUST STORM WIND
  // =========================================================================
  const dustCount = 140;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustVelocities: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < dustCount; i++) {
    const idx = i * 3;
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.random() * 45;
    dustPositions[idx] = Math.cos(angle) * rad;
    dustPositions[idx + 1] = 0.2 + Math.random() * 4.5;
    dustPositions[idx + 2] = Math.sin(angle) * rad;

    dustVelocities.push({
      x: 0.8 + Math.random() * 1.2,
      y: (Math.random() - 0.5) * 0.2,
      z: 0.4 + Math.random() * 0.8,
    });
  }

  const dustGeo = resources.geometry(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  );
  const dustMat = resources.material(
    new THREE.PointsMaterial({
      map: glowTexture(resources),
      color: '#bc9c7a',
      size: 0.065,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
  );

  const dust = new THREE.Points(dustGeo, dustMat);
  dust.name = 'low-ground-dust';
  scene.add(dust);
  cleanupObjects.push(dust);

  let phase = 0;

  return {
    update(seconds: number, active: boolean, reduced: boolean) {
      if (!active || reduced) return;
      const d = Math.min(0.08, Math.max(0, seconds));
      phase += d;

      // Animate Phobos slow celestial orbit
      phobosGroup.rotation.y += d * 0.015;
      phobosGroup.position.x = -52 + Math.sin(phase * 0.05) * 4;

      // Animate flying dust particle drift
      const pos = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dustCount; i++) {
        let px = pos.getX(i);
        let py = pos.getY(i);
        let pz = pos.getZ(i);
        const vel = dustVelocities[i];

        px += vel.x * d * 2.5;
        py += Math.sin(phase * 2 + i) * 0.01;
        pz += vel.z * d * 1.8;

        // Wrap around landscape bounds
        if (px > 45) px = -45;
        if (pz > 45) pz = -45;

        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;
    },
    dispose() {
      for (const obj of cleanupObjects) {
        scene.remove(obj);
      }
    },
  };
}
