import * as THREE from 'three';

const TEXTURE_KEYS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'aoMap',
  'alphaMap',
];

/**
 * Recursively disposes geometries, materials, and textures owned by an Object3D subtree.
 * @param {THREE.Object3D} root
 * @returns {{ geometries: number, materials: number, textures: number }}
 */
export function disposeObject3DResources(root) {
  const counts = { geometries: 0, materials: 0, textures: 0 };
  if (!root || typeof root.traverse !== 'function') {
    return counts;
  }

  const disposedMaterials = new Set();
  const disposedTextures = new Set();

  root.traverse((child) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
      counts.geometries += 1;
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : child.material
        ? [child.material]
        : [];

    for (const mat of materials) {
      if (!mat || disposedMaterials.has(mat)) {
        continue;
      }
      disposedMaterials.add(mat);

      for (const key of TEXTURE_KEYS) {
        const tex = mat[key];
        if (tex && !disposedTextures.has(tex) && typeof tex.dispose === 'function') {
          disposedTextures.add(tex);
          tex.dispose();
          counts.textures += 1;
        }
      }

      if (typeof mat.dispose === 'function') {
        mat.dispose();
        counts.materials += 1;
      }
    }
  });

  return counts;
}

/**
 * Renderer quality presets for Low/Medium/High performance tiers.
 */
export const QUALITY_TIERS = {
  low: {
    maxPixelRatio: 1,
    shadowsEnabled: false,
    shadowType: THREE.BasicShadowMap,
    toneMappingExposure: 1.0,
  },
  medium: {
    maxPixelRatio: 1.5,
    shadowsEnabled: true,
    shadowType: THREE.PCFShadowMap,
    toneMappingExposure: 1.05,
  },
  high: {
    maxPixelRatio: 2,
    shadowsEnabled: true,
    shadowType: THREE.PCFSoftShadowMap,
    toneMappingExposure: 1.08,
  },
};

/**
 * Atmosphere presets combining sky gradient colors and distance fog parameters.
 */
export const SCENE_PRESETS = {
  neonNight: {
    topColor: 0x050816,
    bottomColor: 0x16224a,
    fogColor: 0x0b1020,
    fogNear: 25,
    fogFar: 110,
  },
  sunsetCanyon: {
    topColor: 0x1f1135,
    bottomColor: 0xe96443,
    fogColor: 0x5c2745,
    fogNear: 28,
    fogFar: 120,
  },
  cyberArena: {
    topColor: 0x041b2d,
    bottomColor: 0x0e7490,
    fogColor: 0x082f49,
    fogNear: 30,
    fogFar: 125,
  },
};

/**
 * Creates a lightweight sky dome mesh with a vertical gradient shader.
 * @param {number} topColor
 * @param {number} bottomColor
 * @returns {THREE.Mesh}
 */
function createSkyDome(topColor, bottomColor) {
  const geometry = new THREE.SphereGeometry(180, 24, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(topColor) },
      uBottomColor: { value: new THREE.Color(bottomColor) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(uBottomColor, uTopColor, smoothstep(0.35, 0.9, t)), 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'SkyDome';
  mesh.renderOrder = -1;
  return mesh;
}

/**
 * Manages the Three.js Scene, WebGLRenderer, fog/background, and viewport resizing.
 */
export class SceneManager {
  /**
   * @param {object} [options]
   * @param {HTMLCanvasElement} [options.canvas]
   * @param {HTMLElement} [options.container]
   * @param {boolean} [options.antialias=true]
   * @param {number} [options.backgroundColor=0x0b1020]
   * @param {number} [options.fogColor=0x0b1020]
   * @param {number} [options.fogNear=25]
   * @param {number} [options.fogFar=110]
   * @param {number} [options.maxPixelRatio=2]
   * @param {(width: number, height: number) => void} [options.onResize]
   * @param {string} [options.preset='neonNight']
   * @param {string} [options.quality='high']
   */
  constructor(options = {}) {
    const {
      canvas = null,
      container = null,
      antialias = true,
      backgroundColor = 0x0b1020,
      fogColor = 0x0b1020,
      fogNear = 25,
      fogFar = 110,
      maxPixelRatio = 2,
      onResize = null,
      preset = 'neonNight',
      quality = 'high',
    } = options;

    this.maxPixelRatio = maxPixelRatio;
    this.onResizeCallback = onResize;
    this._qualityTier = QUALITY_TIERS[quality] ? quality : 'high';
    this._mountedInContainer = false;
    this._disposed = false;

    const initialPreset = SCENE_PRESETS[preset] || SCENE_PRESETS.neonNight;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(backgroundColor);
    this.scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

    this.skyDome = createSkyDome(initialPreset.topColor, initialPreset.bottomColor);
    this.scene.add(this.skyDome);

    this._atmosphereTarget = {
      topColor: new THREE.Color(initialPreset.topColor),
      bottomColor: new THREE.Color(initialPreset.bottomColor),
      fogColor: new THREE.Color(fogColor),
      fogNear,
      fogFar,
    };
    this._atmosphereTransitionSpeed = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas || undefined,
      antialias,
      powerPreference: 'high-performance',
    });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.setQualityTier(this._qualityTier);

    if (!canvas && container && this.renderer.domElement) {
      container.appendChild(this.renderer.domElement);
      this._mountedInContainer = true;
    }

    this._handleWindowResize = () => {
      this.resize();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._handleWindowResize);
      this.resize(window.innerWidth, window.innerHeight);
    }
  }

  /**
   * Updates renderer dimensions and pixel ratio, then notifies any resize listener.
   * @param {number} [width]
   * @param {number} [height]
   */
  resize(width, height) {
    if (this._disposed) {
      return;
    }

    const targetWidth =
      typeof width === 'number'
        ? width
        : typeof window !== 'undefined'
          ? window.innerWidth
          : 1280;
    const targetHeight =
      typeof height === 'number'
        ? height
        : typeof window !== 'undefined'
          ? window.innerHeight
          : 720;

    const safeWidth = Math.max(1, targetWidth);
    const safeHeight = Math.max(1, targetHeight);
    const pixelRatio =
      typeof window !== 'undefined'
        ? Math.min(window.devicePixelRatio || 1, this.maxPixelRatio)
        : 1;

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(safeWidth, safeHeight, false);

    if (typeof this.onResizeCallback === 'function') {
      this.onResizeCallback(safeWidth, safeHeight);
    }
  }

  /**
   * Registers a callback invoked whenever the viewport resizes.
   * @param {(width: number, height: number) => void} callback
   */
  setResizeCallback(callback) {
    this.onResizeCallback = callback;
  }

  /**
   * Applies a performance quality tier ('low', 'medium', 'high') for shadows, pixel ratio, and exposure.
   * @param {string} tierName
   */
  setQualityTier(tierName) {
    const tier = QUALITY_TIERS[tierName];
    if (!tier || this._disposed) {
      return;
    }

    this._qualityTier = tierName;
    this.maxPixelRatio = tier.maxPixelRatio;
    this.renderer.shadowMap.enabled = tier.shadowsEnabled;
    this.renderer.shadowMap.type = tier.shadowType;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMappingExposure = tier.toneMappingExposure;

    if (typeof window !== 'undefined') {
      this.resize(window.innerWidth, window.innerHeight);
    }
  }

  /**
   * @returns {string} Active quality tier name
   */
  getQualityTier() {
    return this._qualityTier;
  }

  /**
   * Updates ACESFilmic tone mapping exposure directly.
   * @param {number} exposure
   */
  setToneMappingExposure(exposure) {
    if (this._disposed || typeof exposure !== 'number') {
      return;
    }
    this.renderer.toneMappingExposure = Math.max(0.2, Math.min(2.5, exposure));
  }

  /**
   * Adds one or more Object3D instances to the scene.
   * @param {...THREE.Object3D} objects
   */
  add(...objects) {
    this.scene.add(...objects);
  }

  /**
   * Removes one or more Object3D instances from the scene.
   * @param {...THREE.Object3D} objects
   */
  remove(...objects) {
    this.scene.remove(...objects);
  }

  /**
   * Applies a named sky/fog atmosphere preset, immediately or over transitionDuration seconds.
   * @param {string} presetName
   * @param {number} [transitionDuration=0]
   */
  setAtmospherePreset(presetName, transitionDuration = 0) {
    const preset = SCENE_PRESETS[presetName];
    if (!preset) {
      return;
    }
    this.setAtmosphere(preset, transitionDuration);
  }

  /**
   * Configures sky gradient and distance fog parameters.
   * @param {object} config
   * @param {number} [config.topColor]
   * @param {number} [config.bottomColor]
   * @param {number} [config.fogColor]
   * @param {number} [config.fogNear]
   * @param {number} [config.fogFar]
   * @param {number} [transitionDuration=0]
   */
  setAtmosphere(config = {}, transitionDuration = 0) {
    const { topColor, bottomColor, fogColor, fogNear, fogFar } = config;

    if (topColor !== undefined) {
      this._atmosphereTarget.topColor.set(topColor);
    }
    if (bottomColor !== undefined) {
      this._atmosphereTarget.bottomColor.set(bottomColor);
    }
    if (fogColor !== undefined) {
      this._atmosphereTarget.fogColor.set(fogColor);
    }
    if (typeof fogNear === 'number') {
      this._atmosphereTarget.fogNear = fogNear;
    }
    if (typeof fogFar === 'number') {
      this._atmosphereTarget.fogFar = fogFar;
    }

    if (transitionDuration <= 0) {
      this._atmosphereTransitionSpeed = 0;
      this.skyDome.material.uniforms.uTopColor.value.copy(this._atmosphereTarget.topColor);
      this.skyDome.material.uniforms.uBottomColor.value.copy(this._atmosphereTarget.bottomColor);
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.copy(this._atmosphereTarget.fogColor);
      }
      if (this.scene.fog instanceof THREE.Fog) {
        this.scene.fog.color.copy(this._atmosphereTarget.fogColor);
        this.scene.fog.near = this._atmosphereTarget.fogNear;
        this.scene.fog.far = this._atmosphereTarget.fogFar;
      }
      return;
    }

    this._atmosphereTransitionSpeed = 1 / transitionDuration;
  }

  /**
   * Smoothly advances any active sky/fog atmosphere transition.
   * @param {number} dt Delta time in seconds
   */
  updateAtmosphere(dt) {
    if (this._atmosphereTransitionSpeed <= 0) {
      return;
    }
    const alpha = Math.min(1, Math.max(0, dt || 0) * this._atmosphereTransitionSpeed * 3);
    const { uTopColor, uBottomColor } = this.skyDome.material.uniforms;

    uTopColor.value.lerp(this._atmosphereTarget.topColor, alpha);
    uBottomColor.value.lerp(this._atmosphereTarget.bottomColor, alpha);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(this._atmosphereTarget.fogColor, alpha);
    }
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.lerp(this._atmosphereTarget.fogColor, alpha);
      this.scene.fog.near += (this._atmosphereTarget.fogNear - this.scene.fog.near) * alpha;
      this.scene.fog.far += (this._atmosphereTarget.fogFar - this.scene.fog.far) * alpha;
    }
  }

  /**
   * Renders the scene from the provided camera.
   * @param {THREE.Camera} camera
   */
  render(camera) {
    if (this._disposed || !camera) {
      return;
    }
    if (this.skyDome) {
      this.skyDome.position.copy(camera.position);
    }
    this.renderer.render(this.scene, camera);
  }

  /**
   * @returns {THREE.Scene}
   */
  getScene() {
    return this.scene;
  }

  /**
   * @returns {THREE.WebGLRenderer}
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * Cleans up event listeners, scene geometries/materials/textures, and WebGL resources.
   */
  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this.onResizeCallback = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._handleWindowResize);
    }

    disposeObject3DResources(this.scene);
    this.scene.clear();

    if (this._mountedInContainer && this.renderer.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    this.renderer.renderLists?.dispose();
    this.renderer.dispose();
  }
}

export default SceneManager;
