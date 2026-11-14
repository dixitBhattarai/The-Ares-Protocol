import * as THREE from 'three';
import { SAMPLE_SITE } from '../../contracts/exploration';
import type { ModelKit, WorldResources } from './resources';

export type ExpeditionSiteStage = 'empty' | 'digging' | 'collected' | 'researched';

/** A small authored sampling plot, not a reconstruction of a NASA landing site. */
export function createExpeditionSite(kit: ModelKit, resources: WorldResources) {
  const group = new THREE.Group();
  group.name = 'regolith-sampling-site';
  group.position.set(SAMPLE_SITE.x, 0, SAMPLE_SITE.z);

  const basalt = resources.material(new THREE.MeshStandardMaterial({ color: '#493b37', roughness: 1 }));
  const sand = resources.material(new THREE.MeshStandardMaterial({ color: '#a46d4d', roughness: 1 }));
  const cutSand = resources.material(new THREE.MeshStandardMaterial({ color: '#785140', roughness: 1 }));
  const brushed = resources.material(new THREE.MeshStandardMaterial({ color: '#748a87', metalness: .55, roughness: .48 }));
  const chalk = resources.material(new THREE.MeshStandardMaterial({ color: '#e3d1ae', roughness: .86 }));
  const amber = resources.material(new THREE.MeshStandardMaterial({
    color: '#e9ae65', emissive: '#a7652e', emissiveIntensity: .35, roughness: .65,
  }));
  const mint = resources.material(new THREE.MeshStandardMaterial({
    color: '#a5d6c7', emissive: '#4e9b89', emissiveIntensity: .45, roughness: .5,
  }));

  // The astronaut works from local (0, 0, 0). Everything solid remains beyond
  // the approach and the bed is a shallow, walkable surface detail.
  const bed = new THREE.Group();
  bed.name = 'sample-trench';
  bed.position.z = .72;
  group.add(bed);
  kit.flatBox(bed, cutSand, [1.55, .025, 1.05], [0, .018, 0]);
  const soil = kit.flatBox(bed, sand, [1.48, .05, .98], [0, .045, 0]);
  soil.name = 'sample-soil-surface';
  for (const x of [-.82, .82]) kit.box(bed, brushed, [.045, .075, 1.2], [x, .05, 0]);
  for (const z of [-.58, .58]) kit.box(bed, brushed, [1.68, .075, .045], [0, .05, z]);

  // A restrained survey grid and numbered-in-geometry scale bar make the area
  // read as an experiment, rather than a glowing collectible pile.
  for (const x of [-.49, 0, .49]) {
    const line = kit.flatBox(bed, chalk, [.009, .003, .98], [x, .075, 0]);
    line.name = 'survey-grid';
  }
  for (const z of [-.33, 0, .33]) kit.flatBox(bed, chalk, [1.48, .003, .009], [0, .075, z]);
  for (let i = 0; i < 10; i++) {
    kit.flatBox(bed, i % 2 ? basalt : chalk, [.08, .008, .11], [-.4 + i * .08, .085, .68]);
  }

  // Small local grains are deterministic and share their geometry/material.
  const grainGeometry = resources.geometry(new THREE.IcosahedronGeometry(1, 0));
  for (let i = 0; i < 20; i++) {
    const grain = new THREE.Mesh(grainGeometry, i % 3 ? sand : basalt);
    grain.position.set(Math.sin(i * 4.13) * .6, .08, .72 + Math.cos(i * 7.71) * .4);
    grain.scale.setScalar(.018 + (i % 4) * .009);
    grain.rotation.set(i * .34, i * .77, i * .19);
    group.add(grain);
  }

  const core = new THREE.Group();
  core.name = 'exposed-regolith-core';
  core.position.set(.08, .07, .77);
  group.add(core);
  for (let i = 0; i < 5; i++) {
    kit.cylinder(core, i % 2 ? cutSand : sand, [.065, .032, .065], [0, i * .032, 0]);
  }
  const sample = new THREE.Group();
  sample.name = 'sealed-field-sample';
  sample.position.set(1.16, .18, .42);
  group.add(sample);
  const vial = kit.cylinder(sample, brushed, [.07, .23, .07], [0, .04, 0]);
  vial.name = 'sample-canister';
  for (const y of [-.08, .16]) kit.cylinder(sample, chalk, [.078, .025, .078], [0, y, 0]);
  kit.box(sample, mint, [.04, .09, .015], [0, .05, .073]);

  // Low sample tray; no obstacle is added to the standing position.
  kit.flatBox(group, basalt, [.5, .035, .66], [1.16, .035, .42]);
  kit.flatBox(group, brushed, [.46, .025, .62], [1.16, .065, .42]);
  for (const x of [.94, 1.38]) kit.flatBox(group, chalk, [.025, .045, .62], [x, .085, .42]);

  // Survey stakes mark the edge without enclosing the astronaut in a cage.
  for (const x of [-1.08, 1.08]) {
    for (const z of [.04, 1.4]) {
      kit.cylinder(group, brushed, [.018, .4, .018], [x, .2, z]);
      kit.box(group, amber, [.16, .09, .025], [x + .065, .38, z]);
    }
  }
  const marker = new THREE.Group();
  marker.name = 'fieldwork-status-marker';
  marker.position.set(-1.1, .52, .58);
  group.add(marker);
  const ring = new THREE.Mesh(resources.geometry(new THREE.TorusGeometry(.095, .018, 6, 20)), amber);
  marker.add(ring);
  const check = new THREE.Group();
  check.name = 'sample-analysis-check';
  check.position.set(-1.1, .52, .58);
  group.add(check);
  const checkShort = kit.flatBox(check, mint, [.08, .025, .025], [-.025, -.01, 0]);
  checkShort.rotation.z = -.7;
  const checkLong = kit.flatBox(check, mint, [.15, .025, .025], [.055, .017, 0]);
  checkLong.rotation.z = .75;

  // Ballistic near-tool grains: low counts and short arcs suit thin-air Mars;
  // this deliberately avoids a terrestrial, billowing dust cloud.
  const count = 28;
  const positions = new Float32Array(count * 3);
  const dustGeometry = resources.geometry(new THREE.BufferGeometry());
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMaterial = resources.material(new THREE.PointsMaterial({
    color: '#c7966b', size: .028, transparent: true, opacity: .8, depthWrite: false,
  }));
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.name = 'ballistic-sampling-grains';
  dust.frustumCulled = false;
  group.add(dust);
  let clock = 0;

  const update = (stage: ExpeditionSiteStage, progress: number, seconds: number, active: boolean, reduced: boolean) => {
    const amount = Number.isFinite(progress) ? THREE.MathUtils.clamp(progress, 0, 1) : 0;
    if (active && !reduced && Number.isFinite(seconds)) clock += THREE.MathUtils.clamp(seconds, 0, .1);
    const finished = stage === 'collected' || stage === 'researched';
    soil.scale.y = .05 * (stage === 'digging' ? 1 - amount * .7 : finished ? .3 : 1);
    soil.position.y = stage === 'digging' ? .045 - amount * .02 : finished ? .025 : .045;
    core.visible = stage === 'digging' && amount > .2;
    core.scale.y = Math.max(.1, amount);
    sample.visible = finished;
    marker.visible = stage !== 'researched';
    check.visible = stage === 'researched';
    ring.material = finished ? mint : amber;
    // Freeze visible particles on pause. Reduced motion removes transient grains.
    dust.visible = stage === 'digging' && amount > 0 && amount < 1 && !reduced;
    if (dust.visible && active) {
      for (let i = 0; i < count; i++) {
        const phase = (clock * 1.15 + i / count) % 1;
        const angle = i * 2.39996;
        const radius = phase * (.1 + (i % 5) * .065);
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = .08 + Math.sin(phase * Math.PI) * (.12 + (i % 4) * .045);
        positions[i * 3 + 2] = .6 + Math.sin(angle) * radius;
      }
      dustGeometry.attributes.position.needsUpdate = true;
    }
  };
  update('empty', 0, 0, false, true);
  return { group, update };
}
