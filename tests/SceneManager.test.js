import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { QUALITY_TIERS, SCENE_PRESETS } from '../src/core/SceneManager.js';

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
});
