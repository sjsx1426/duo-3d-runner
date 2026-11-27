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
 * Builds a stylized cyber-runner procedural 3D avatar for Character 1 when char1.glb is absent.
 * Feet rest at y = 0 and articulated joints are exposed via group.userData.joints.
 * @returns {THREE.Group}
 */
export function createProceduralChar1() {
  const root = new THREE.Group();
  root.name = 'Procedural_char1';

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.35,
    metalness: 0.45,
  });
  const suitMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.65,
    metalness: 0.2,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.1,
  });

  const torso = new THREE.Group();
  torso.position.y = 1.05;

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.32), armorMat);
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.35), visorMat);
  core.position.y = 0.06;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, 0.16), suitMat);
  pack.position.set(0, 0.04, 0.22);
  const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.14, 12), visorMat);
  thruster.rotation.x = Math.PI / 2;
  thruster.position.set(0, -0.05, 0.31);
  torso.add(chest, core, pack, thruster);

  const head = new THREE.Group();
  head.position.y = 0.48;
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), armorMat);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), visorMat);
  visor.position.set(0, 0.02, -0.17);
  head.add(helmet, visor);
  torso.add(head);

  const createLimb = (width, height, depth, material, pivotOffsetY) => {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.y = pivotOffsetY;
    pivot.add(mesh);
    return pivot;
  };

  const leftArm = createLimb(0.16, 0.52, 0.16, suitMat, -0.22);
  leftArm.position.set(-0.39, 0.22, 0);
  const rightArm = createLimb(0.16, 0.52, 0.16, suitMat, -0.22);
  rightArm.position.set(0.39, 0.22, 0);
  torso.add(leftArm, rightArm);

  const leftLeg = createLimb(0.2, 0.68, 0.22, suitMat, -0.34);
  leftLeg.position.set(-0.15, 0.72, 0);
  const rightLeg = createLimb(0.2, 0.68, 0.22, suitMat, -0.34);
  rightLeg.position.set(0.15, 0.72, 0);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.32), armorMat);
  leftBoot.position.set(0, -0.65, -0.04);
  leftLeg.add(leftBoot);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.32), armorMat);
  rightBoot.position.set(0, -0.65, -0.04);
  rightLeg.add(rightBoot);

  root.add(torso, leftLeg, rightLeg);
  root.userData.joints = { torso, head, leftArm, rightArm, leftLeg, rightLeg };

  enableShadows(root);
  return root;
}

/**
 * Minimal neutral fallback mesh used before character-specific procedural avatars are registered.
 * @param {string} characterId
 * @returns {THREE.Group}
 */
function createMinimalFallback(characterId) {
  if (characterId === 'char1') {
    return createProceduralChar1();
  }

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
