import { describe, expect, it } from 'vitest';
import { initApp, createEngine } from '../src/main.js';
import { CharacterLoader, normalizeCharacterModel } from '../src/entities/CharacterLoader.js';
import * as THREE from 'three';

describe('Engine bootstrap and CharacterLoader', () => {
  it('exports createEngine and handles missing document cleanly in initApp', () => {
    expect(typeof createEngine).toBe('function');
    expect(typeof initApp).toBe('function');
    if (typeof document === 'undefined') {
      expect(() => initApp()).not.toThrow();
    }
  });

  it('preloads procedural char1 and char2 avatars with caching and distinct clones', async () => {
    const loader = new CharacterLoader();
    const [char1A, char2] = await loader.preloadAll(['char1', 'char2']);
    const char1B = await loader.load('char1');

    expect(loader.hasCached('char1')).toBe(true);
    expect(loader.hasCached('char2')).toBe(true);
    expect(char1A.model).not.toBe(char1B.model);
    expect(char1A.model.name).toBe('Procedural_char1');
    expect(char2.model.name).toBe('Procedural_char2');
  });

  it('normalizes arbitrary meshes to target height resting at y = 0', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2));
    mesh.position.set(4, 12, -3);
    const normalized = normalizeCharacterModel(mesh, 1.85);
    const box = new THREE.Box3().setFromObject(normalized);
    const size = new THREE.Vector3();
    box.getSize(size);

    expect(size.y).toBeCloseTo(1.85, 2);
    expect(box.min.y).toBeCloseTo(0, 2);
    expect(mesh.castShadow).toBe(true);
  });
});
