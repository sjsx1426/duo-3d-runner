import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  QUALITY_TIERS,
  SCENE_PRESETS,
  disposeObject3DResources,
} from '../src/core/SceneManager.js';

describe('SceneManager presets and quality tiers', () => {
  it('defines low, medium, and high performance tiers with progressive pixel ratios', () => {
    expect(Object.keys(QUALITY_TIERS)).toEqual(['low', 'medium', 'high']);
    expect(QUALITY_TIERS.low.shadowsEnabled).toBe(false);
    expect(QUALITY_TIERS.medium.shadowsEnabled).toBe(true);
    expect(QUALITY_TIERS.high.shadowType).toBe(THREE.PCFSoftShadowMap);
    expect(QUALITY_TIERS.low.maxPixelRatio).toBeLessThan(QUALITY_TIERS.medium.maxPixelRatio);
    expect(QUALITY_TIERS.medium.maxPixelRatio).toBeLessThan(QUALITY_TIERS.high.maxPixelRatio);
  });

  it('defines complete atmosphere sky and fog presets for all biomes', () => {
    for (const key of ['neonNight', 'sunsetCanyon', 'cyberArena']) {
      const preset = SCENE_PRESETS[key];
      expect(preset).toBeDefined();
      expect(preset.fogNear).toBeLessThan(preset.fogFar);
      expect(typeof preset.topColor).toBe('number');
      expect(typeof preset.bottomColor).toBe('number');
    }
  });

  it('disposes geometries, deduplicated materials, and attached textures recursively', () => {
    const group = new THREE.Group();
    const sharedTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    const sharedMat = new THREE.MeshBasicMaterial({ map: sharedTex });
    const altMat = new THREE.MeshStandardMaterial({ emissiveMap: sharedTex });

    const meshA = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sharedMat);
    const meshB = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [sharedMat, altMat]);
    group.add(meshA, meshB);

    const counts = disposeObject3DResources(group);
    expect(counts).toEqual({ geometries: 2, materials: 2, textures: 1 });
    expect(disposeObject3DResources(null)).toEqual({ geometries: 0, materials: 0, textures: 0 });
  });
});
