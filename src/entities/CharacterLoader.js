import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Default asset paths for selectable duo characters.
 */
export const CHARACTER_PATHS = {
  char1: 'assets/models/char1.glb',
  char2: 'assets/models/char2.glb',
};

/**
 * Resolves a public asset path cleanly against Vite's configured BASE_URL.
 * @param {string} relativePath
 * @returns {string}
 */
function resolveAssetUrl(relativePath) {
  const cleanPath = relativePath.replace(/^\/+/, '');
  const base =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
      ? import.meta.env.BASE_URL
      : '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${cleanPath}`;
}

/**
 * Enables shadow casting and receiving across all Mesh descendants.
 * @param {THREE.Object3D} root
 */
function enableShadows(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

/**
 * Minimal neutral fallback mesh used before character-specific procedural avatars are registered.
 * @param {string} characterId
 * @returns {THREE.Group}
 */
function createMinimalFallback(characterId) {
  const group = new THREE.Group();
  group.name = `Fallback_${characterId}`;

  const color = characterId === 'char2' ? 0xf97316 : 0x38bdf8;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.9, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25 }),
  );
  body.position.y = 0.85;
  group.add(body);

  enableShadows(group);
  return group;
}

/**
 * Loads selectable .glb character models with graceful procedural fallback support.
 */
export class CharacterLoader {
  /**
   * @param {object} [options]
   * @param {GLTFLoader} [options.loader]
   * @param {Record<string, string>} [options.paths]
   * @param {(characterId: string) => THREE.Object3D} [options.fallbackBuilder]
   */
  constructor(options = {}) {
    const {
      loader = new GLTFLoader(),
      paths = CHARACTER_PATHS,
      fallbackBuilder = null,
    } = options;

    this.loader = loader;
    this.paths = { ...paths };
    this.fallbackBuilder = fallbackBuilder;
  }

  /**
   * Registers or overrides the procedural fallback builder function.
   * @param {(characterId: string) => THREE.Object3D} builder
   */
  setFallbackBuilder(builder) {
    this.fallbackBuilder = builder;
  }

  /**
   * Loads a character's GLB model or returns a procedural fallback if the file is unavailable.
   * @param {string} [characterId='char1']
   * @returns {Promise<{id: string, model: THREE.Object3D, animations: THREE.AnimationClip[], isFallback: boolean}>}
   */
  async load(characterId = 'char1') {
    const relativePath = this.paths[characterId];
    if (relativePath && typeof fetch === 'function') {
      const url = resolveAssetUrl(relativePath);
      try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers?.get('content-type') || '';
        const looksLikeHtmlFallback = contentType.includes('text/html');
        if (response.ok && !looksLikeHtmlFallback) {
          const gltf = await this.loader.loadAsync(url);
          enableShadows(gltf.scene);
          return {
            id: characterId,
            model: gltf.scene,
            animations: gltf.animations || [],
            isFallback: false,
          };
        }
      } catch {
        // Fall through to procedural fallback avatar when .glb is absent or network is offline.
      }
    }

    const fallbackModel =
      typeof this.fallbackBuilder === 'function'
        ? this.fallbackBuilder(characterId)
        : createMinimalFallback(characterId);

    enableShadows(fallbackModel);

    return {
      id: characterId,
      model: fallbackModel,
      animations: [],
      isFallback: true,
    };
  }
}

export default CharacterLoader;
