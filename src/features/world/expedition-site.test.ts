import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SAMPLE_SITE } from '../../contracts/exploration';
import { createModelKit, WorldResources } from './resources';
import { createExpeditionSite } from './expedition-site';
import { createVisualUpgrade } from './visual-upgrade';

function createSite() {
  const resources = new WorldResources();
  const site = createExpeditionSite(createModelKit(resources), resources);
  return { resources, site };
}

describe('regolith fieldwork presentation', () => {
  it('reveals a core while digging, seals the sample on completion and resets without stale effects', () => {
    const { resources, site } = createSite();
    const core = site.group.getObjectByName('exposed-regolith-core')!;
    const sample = site.group.getObjectByName('sealed-field-sample')!;
    const soil = site.group.getObjectByName('sample-soil-surface')!;
    expect(core.visible).toBe(false);
    expect(sample.visible).toBe(false);
    site.update('digging', .5, .1, true, false);
    expect(core.visible).toBe(true);
    expect(soil.scale.y).toBeLessThan(1);
    site.update('collected', 1, .1, true, false);
    expect(core.visible).toBe(false);
    expect(sample.visible).toBe(true);
    site.update('researched', 1, .1, true, false);
    expect(site.group.getObjectByName('sample-analysis-check')!.visible).toBe(true);
    site.update('empty', 0, 0, false, true);
    expect(core.visible).toBe(false);
    expect(sample.visible).toBe(false);
    expect(soil.scale.y).toBe(1);
    expect(site.group.getObjectByName('sample-analysis-check')!.visible).toBe(false);
    resources.dispose();
  });

  it('freezes ballistic particles on pause, hides them for reduced motion and rejects invalid time/progress', () => {
    const { resources, site } = createSite();
    const dust = site.group.getObjectByName('ballistic-sampling-grains') as THREE.Points;
    site.update('digging', .5, .1, true, false);
    const positions = Array.from(dust.geometry.attributes.position.array);
    site.update('digging', .5, 8, false, false);
    expect(Array.from(dust.geometry.attributes.position.array)).toEqual(positions);
    site.update('digging', .5, .1, true, true);
    expect(dust.visible).toBe(false);
    site.update('digging', Number.NaN, Number.NaN, true, false);
    expect(dust.visible).toBe(false);
    site.group.traverse(object => {
      expect(object.position.toArray().every(Number.isFinite)).toBe(true);
      expect(object.scale.toArray().every(Number.isFinite)).toBe(true);
    });
    resources.dispose();
  });

  it('keeps the physical plot within the existing map and leaves the astronaut approach clear', () => {
    const { resources, site } = createSite();
    expect(site.group.position.toArray()).toEqual([SAMPLE_SITE.x, 0, SAMPLE_SITE.z]);
    const bounds = new THREE.Box3().setFromObject(site.group);
    expect(bounds.max.z).toBeLessThan(18);
    expect(bounds.max.x).toBeLessThan(18);
    expect(bounds.min.x).toBeGreaterThan(-18);
    const bed = site.group.getObjectByName('sample-trench')!;
    expect(bed.position.z).toBeGreaterThan(.5);
    expect(bounds.min.z).toBeGreaterThan(SAMPLE_SITE.z - .2);
    resources.dispose();
  });
});

it('keeps wayfinding lights stable on pause and reduced motion without adding light or shadow passes', () => {
  const resources = new WorldResources();
  const visual = createVisualUpgrade(createModelKit(resources), resources);
  const lights: THREE.Light[] = [];
  visual.group.traverse(node => { if (node instanceof THREE.Light) lights.push(node); });
  expect(lights).toHaveLength(0);
  const beacon = visual.group.getObjectByName('outpost-status-beacon')!;
  const lens = beacon.children[2] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  visual.update(.1, true, false);
  const glow = lens.material.emissiveIntensity;
  visual.update(20, false, false);
  expect(lens.material.emissiveIntensity).toBe(glow);
  visual.update(.1, true, true);
  expect(lens.material.emissiveIntensity).toBe(.6);
  visual.update(Number.NaN, true, false);
  expect(Number.isFinite(lens.material.emissiveIntensity)).toBe(true);
  resources.dispose();
});
