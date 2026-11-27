import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

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
 * Normalizes a loaded character model so it stands upright at y = 0, centered on X/Z,
 * scaled uniformly to targetHeight, with shadows enabled on all meshes.
 * @param {THREE.Object3D} model
 * @param {number} [targetHeight=1.85]
 * @returns {THREE.Group}
 */
export function normalizeCharacterModel(model, targetHeight = 1.85) {
  const wrapper = new THREE.Group();
  wrapper.name = model.name ? `Normalized_${model.name}` : 'NormalizedCharacter';

  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  if (size.y > 0.0001 && Number.isFinite(size.y)) {
    const scaleFactor = targetHeight / size.y;
    model.scale.multiplyScalar(scaleFactor);
    model.updateMatrixWorld(true);
    box.setFromObject(model);
    box.getCenter(center);
  }

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;

  wrapper.add(model);
  if (model.userData?.joints) {
    wrapper.userData.joints = model.userData.joints;
  }
  wrapper.userData.normalizedHeight = targetHeight;

  enableShadows(wrapper);
  return wrapper;
}

/**
 * Creates an articulated limb group with mesh offset from its pivot.
 * @param {number} width
 * @param {number} height
 * @param {number} depth
 * @param {THREE.Material} material
 * @param {number} pivotOffsetY
 * @returns {THREE.Group}
 */
function createLimb(width, height, depth, material, pivotOffsetY) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.y = pivotOffsetY;
  pivot.add(mesh);
  return pivot;
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
  torso.name = 'torso';
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
  head.name = 'head';
  head.position.y = 0.48;
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), armorMat);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), visorMat);
  visor.position.set(0, 0.02, -0.17);
  head.add(helmet, visor);
  torso.add(head);

  const leftArm = createLimb(0.16, 0.52, 0.16, suitMat, -0.22);
  leftArm.name = 'leftArm';
  leftArm.position.set(-0.39, 0.22, 0);
  const rightArm = createLimb(0.16, 0.52, 0.16, suitMat, -0.22);
  rightArm.name = 'rightArm';
  rightArm.position.set(0.39, 0.22, 0);
  torso.add(leftArm, rightArm);

  const leftLeg = createLimb(0.2, 0.68, 0.22, suitMat, -0.34);
  leftLeg.name = 'leftLeg';
  leftLeg.position.set(-0.15, 0.72, 0);
  const rightLeg = createLimb(0.2, 0.68, 0.22, suitMat, -0.34);
  rightLeg.name = 'rightLeg';
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
 * Builds a heavy-dasher procedural 3D avatar for Character 2 when char2.glb is absent.
 * Shares the same joint rig contract with distinct armored silhouette and amber-orange accents.
 * @returns {THREE.Group}
 */
export function createProceduralChar2() {
  const root = new THREE.Group();
  root.name = 'Procedural_char2';

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.38,
    metalness: 0.5,
  });
  const suitMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b2e,
    roughness: 0.62,
    metalness: 0.25,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.35,
    roughness: 0.2,
    metalness: 0.15,
  });

  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.y = 1.08;

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.66, 0.38), armorMat);
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.42), accentMat);
  chestPlate.position.y = 0.12;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.2), suitMat);
  pack.position.set(0, 0.04, 0.26);

  for (const offsetX of [-0.14, 0.14]) {
    const booster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 0.16, 12),
      accentMat,
    );
    booster.rotation.x = Math.PI / 2;
    booster.position.set(offsetX, -0.04, 0.36);
    torso.add(booster);
  }
  torso.add(chest, chestPlate, pack);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.y = 0.51;
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.38), suitMat);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.42), armorMat);
  crest.position.y = 0.18;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.08), accentMat);
  visor.position.set(0, 0.02, -0.18);
  head.add(helmet, crest, visor);
  torso.add(head);

  const leftArm = createLimb(0.2, 0.54, 0.2, suitMat, -0.24);
  leftArm.name = 'leftArm';
  leftArm.position.set(-0.46, 0.22, 0);
  const leftPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.28), armorMat);
  leftPauldron.position.y = 0.02;
  leftArm.add(leftPauldron);

  const rightArm = createLimb(0.2, 0.54, 0.2, suitMat, -0.24);
  rightArm.name = 'rightArm';
  rightArm.position.set(0.46, 0.22, 0);
  const rightPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.28), armorMat);
  rightPauldron.position.y = 0.02;
  rightArm.add(rightPauldron);

  torso.add(leftArm, rightArm);

  const leftLeg = createLimb(0.23, 0.7, 0.25, suitMat, -0.35);
  leftLeg.name = 'leftLeg';
  leftLeg.position.set(-0.18, 0.74, 0);
  const rightLeg = createLimb(0.23, 0.7, 0.25, suitMat, -0.35);
  rightLeg.name = 'rightLeg';
  rightLeg.position.set(0.18, 0.74, 0);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.36), armorMat);
  leftBoot.position.set(0, -0.66, -0.05);
  leftLeg.add(leftBoot);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.36), armorMat);
  rightBoot.position.set(0, -0.66, -0.05);
  rightLeg.add(rightBoot);

  root.add(torso, leftLeg, rightLeg);
  root.userData.joints = { torso, head, leftArm, rightArm, leftLeg, rightLeg };

  enableShadows(root);
  return root;
}

/**
 * Minimal neutral fallback mesh used when an unknown character ID is requested.
 * @param {string} characterId
 * @returns {THREE.Group}
 */
function createMinimalFallback(characterId) {
  if (characterId === 'char1') {
    return createProceduralChar1();
  }
  if (characterId === 'char2') {
    return createProceduralChar2();
  }

  const group = new THREE.Group();
  group.name = `Fallback_${characterId}`;

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.9, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.45, metalness: 0.25 }),
  );
  body.position.y = 0.85;
  group.add(body);

  enableShadows(group);
  return group;
}

/**
 * Re-binds named procedural joints after cloning a character template.
 * @param {THREE.Object3D} root
 */
function rebindJoints(root) {
  const jointNames = ['torso', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
  const joints = {};
  for (const name of jointNames) {
    const node = root.getObjectByName(name);
    if (node) {
      joints[name] = node;
    }
  }
  if (Object.keys(joints).length > 0) {
    root.userData.joints = joints;
  }
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
   * @param {number} [options.targetHeight=1.85]
   */
  constructor(options = {}) {
    const {
      loader = new GLTFLoader(),
      paths = CHARACTER_PATHS,
      fallbackBuilder = null,
      targetHeight = 1.85,
    } = options;

    this.loader = loader;
    this.paths = { ...paths };
    this.fallbackBuilder = fallbackBuilder;
    this.targetHeight = targetHeight;
    this._cache = new Map();
    this._pendingLoads = new Map();
  }

  /**
   * Registers or overrides the procedural fallback builder function.
   * @param {(characterId: string) => THREE.Object3D} builder
   */
  setFallbackBuilder(builder) {
    this.fallbackBuilder = builder;
  }

  /**
   * Clones a cached character entry safely (preserving skeletons and procedural joints).
   * @param {{id: string, template: THREE.Object3D, animations: THREE.AnimationClip[], isFallback: boolean}} entry
   * @returns {{id: string, model: THREE.Object3D, animations: THREE.AnimationClip[], isFallback: boolean}}
   */
  cloneCharacter(entry) {
    const clonedModel = cloneSkeleton(entry.template);
    rebindJoints(clonedModel);
    enableShadows(clonedModel);

    return {
      id: entry.id,
      model: clonedModel,
      animations: entry.animations,
      isFallback: entry.isFallback,
    };
  }

  /**
   * Returns true when a character template is already cached.
   * @param {string} characterId
   * @returns {boolean}
   */
  hasCached(characterId) {
    return this._cache.has(characterId);
  }

  /**
   * Clears cached character templates.
   */
  clearCache() {
    this._cache.clear();
  }

  /**
   * Preloads a list of character IDs into the template cache.
   * @param {string[]} [characterIds=['char1', 'char2']]
   * @returns {Promise<Array>}
   */
  async preloadAll(characterIds = ['char1', 'char2']) {
    return Promise.all(characterIds.map((id) => this.load(id)));
  }

  /**
   * Loads a character's GLB model or procedural fallback, using cache and returning a fresh clone.
   * @param {string} [characterId='char1']
   * @returns {Promise<{id: string, model: THREE.Object3D, animations: THREE.AnimationClip[], isFallback: boolean}>}
   */
  async load(characterId = 'char1') {
    if (this._cache.has(characterId)) {
      return this.cloneCharacter(this._cache.get(characterId));
    }

    if (!this._pendingLoads.has(characterId)) {
      const loadPromise = this._fetchOrBuildTemplate(characterId)
        .then((entry) => {
          this._cache.set(characterId, entry);
          return entry;
        })
        .finally(() => {
          this._pendingLoads.delete(characterId);
        });
      this._pendingLoads.set(characterId, loadPromise);
    }

    const entry = await this._pendingLoads.get(characterId);
    return this.cloneCharacter(entry);
  }

  /**
   * Resolves the template model from GLB or procedural fallback.
   * @param {string} characterId
   * @returns {Promise<{id: string, template: THREE.Object3D, animations: THREE.AnimationClip[], isFallback: boolean}>}
   * @private
   */
  async _fetchOrBuildTemplate(characterId) {
    const relativePath = this.paths[characterId];
    if (relativePath && typeof fetch === 'function') {
      const url = resolveAssetUrl(relativePath);
      try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers?.get('content-type') || '';
        const looksLikeHtmlFallback = contentType.includes('text/html');
        if (response.ok && !looksLikeHtmlFallback) {
          const gltf = await this.loader.loadAsync(url);
          const normalized = normalizeCharacterModel(gltf.scene, this.targetHeight);
          return {
            id: characterId,
            template: normalized,
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
      template: fallbackModel,
      animations: [],
      isFallback: true,
    };
  }
}

export default CharacterLoader;
