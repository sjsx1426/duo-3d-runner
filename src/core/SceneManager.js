import * as THREE from 'three';

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
    } = options;

    this.maxPixelRatio = maxPixelRatio;
    this.onResizeCallback = onResize;
    this._disposed = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(backgroundColor);
    this.scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

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
   * Renders the scene from the provided camera.
   * @param {THREE.Camera} camera
   */
  render(camera) {
    if (this._disposed || !camera) {
      return;
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

    this.renderer.dispose();
  }
}

export default SceneManager;
