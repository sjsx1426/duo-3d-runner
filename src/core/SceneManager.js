import * as THREE from 'three';

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
    } = options;

    this.maxPixelRatio = maxPixelRatio;
    this.onResizeCallback = onResize;
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
    this.renderer.toneMappingExposure = 1.05;

    if (!canvas && container && this.renderer.domElement) {
      container.appendChild(this.renderer.domElement);
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
   * Cleans up event listeners and WebGL resources.
   */
  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._handleWindowResize);
    }

    if (this.skyDome) {
      this.skyDome.geometry.dispose();
      this.skyDome.material.dispose();
    }

    this.renderer.dispose();
  }
}

export default SceneManager;
