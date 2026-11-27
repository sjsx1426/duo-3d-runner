import * as THREE from 'three';

/**
 * Biome lighting themes paired with SceneManager atmosphere presets.
 */
export const LIGHTING_THEMES = {
  neonNight: {
    skyColor: 0x9bc4ff,
    groundColor: 0x1b2238,
    hemisphereIntensity: 0.85,
    keyColor: 0xffffff,
    keyIntensity: 1.8,
    rimColor: 0x38bdf8,
    rimIntensity: 0.9,
  },
  sunsetCanyon: {
    skyColor: 0xffb38a,
    groundColor: 0x3b1d2e,
    hemisphereIntensity: 0.95,
    keyColor: 0xffd2a6,
    keyIntensity: 2.0,
    rimColor: 0xf472b6,
    rimIntensity: 1.0,
  },
  cyberArena: {
    skyColor: 0x67e8f9,
    groundColor: 0x0f172a,
    hemisphereIntensity: 0.9,
    keyColor: 0xe0f2fe,
    keyIntensity: 1.85,
    rimColor: 0x22d3ee,
    rimIntensity: 1.15,
  },
};

/**
 * Sets up hemisphere fill, shadow-casting key sunlight, and rim lighting for the 3D runner.
 */
export class Lighting {
  /**
   * @param {THREE.Scene} [scene]
   * @param {object} [options]
   * @param {string} [options.theme='neonNight']
   * @param {number} [options.skyColor]
   * @param {number} [options.groundColor]
   * @param {number} [options.hemisphereIntensity]
   * @param {number} [options.keyColor]
   * @param {number} [options.keyIntensity]
   * @param {number} [options.rimColor]
   * @param {number} [options.rimIntensity]
   * @param {number} [options.shadowMapSize=2048]
   */
  constructor(scene = null, options = {}) {
    const themeName = LIGHTING_THEMES[options.theme] ? options.theme : 'neonNight';
    const baseTheme = LIGHTING_THEMES[themeName];

    const {
      skyColor = baseTheme.skyColor,
      groundColor = baseTheme.groundColor,
      hemisphereIntensity = baseTheme.hemisphereIntensity,
      keyColor = baseTheme.keyColor,
      keyIntensity = baseTheme.keyIntensity,
      rimColor = baseTheme.rimColor,
      rimIntensity = baseTheme.rimIntensity,
      shadowMapSize = 2048,
    } = options;

    this._theme = themeName;
    this.group = new THREE.Group();
    this.group.name = 'LightingRig';

    this.hemisphereLight = new THREE.HemisphereLight(
      skyColor,
      groundColor,
      hemisphereIntensity,
    );

    this.keyLight = new THREE.DirectionalLight(keyColor, keyIntensity);
    this._keyOffset = new THREE.Vector3(14, 24, 12);
    this.keyLight.position.copy(this._keyOffset);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 90;
    this.keyLight.shadow.camera.left = -22;
    this.keyLight.shadow.camera.right = 22;
    this.keyLight.shadow.camera.top = 22;
    this.keyLight.shadow.camera.bottom = -22;
    this.keyLight.shadow.bias = -0.0005;

    this.rimLight = new THREE.DirectionalLight(rimColor, rimIntensity);
    this._rimOffset = new THREE.Vector3(-12, 10, -18);
    this.rimLight.position.copy(this._rimOffset);

    this.group.add(
      this.hemisphereLight,
      this.keyLight,
      this.keyLight.target,
      this.rimLight,
      this.rimLight.target,
    );

    if (scene) {
      scene.add(this.group);
    }
  }

  /**
   * Moves the directional lights and shadow frustum with the runner's world position.
   * @param {THREE.Vector3|{x:number,y:number,z:number}} targetPosition
   */
  updateFollow(targetPosition) {
    if (!targetPosition) {
      return;
    }

    const { x = 0, y = 0, z = 0 } = targetPosition;
    this.keyLight.position.set(
      x + this._keyOffset.x,
      y + this._keyOffset.y,
      z + this._keyOffset.z,
    );
    this.keyLight.target.position.set(x, y, z);

    this.rimLight.position.set(
      x + this._rimOffset.x,
      y + this._rimOffset.y,
      z + this._rimOffset.z,
    );
    this.rimLight.target.position.set(x, y, z);
  }

  /**
   * Applies a named biome lighting theme ('neonNight', 'sunsetCanyon', 'cyberArena').
   * @param {string} themeName
   */
  setTheme(themeName) {
    const theme = LIGHTING_THEMES[themeName];
    if (!theme) {
      return;
    }

    this._theme = themeName;
    this.hemisphereLight.color.setHex(theme.skyColor);
    this.hemisphereLight.groundColor.setHex(theme.groundColor);
    this.keyLight.color.setHex(theme.keyColor);
    this.rimLight.color.setHex(theme.rimColor);
    this.setIntensities({
      hemisphere: theme.hemisphereIntensity,
      key: theme.keyIntensity,
      rim: theme.rimIntensity,
    });
  }

  /**
   * @returns {string}
   */
  getTheme() {
    return this._theme;
  }

  /**
   * Adjusts light intensities cleanly.
   * @param {{hemisphere?: number, key?: number, rim?: number}} intensities
   */
  setIntensities({ hemisphere, key, rim } = {}) {
    if (typeof hemisphere === 'number') {
      this.hemisphereLight.intensity = hemisphere;
    }
    if (typeof key === 'number') {
      this.keyLight.intensity = key;
    }
    if (typeof rim === 'number') {
      this.rimLight.intensity = rim;
    }
  }

  /**
   * @returns {THREE.Group}
   */
  getGroup() {
    return this.group;
  }

  /**
   * Detaches the lighting rig and disposes shadow maps if allocated.
   */
  dispose() {
    if (this.keyLight.shadow.map) {
      this.keyLight.shadow.map.dispose();
    }
    this.group.removeFromParent();
  }
}

export default Lighting;
