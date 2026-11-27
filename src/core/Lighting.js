import * as THREE from 'three';

/**
 * Sets up hemisphere fill, shadow-casting key sunlight, and rim lighting for the 3D runner.
 */
export class Lighting {
  /**
   * @param {THREE.Scene} [scene]
   * @param {object} [options]
   * @param {number} [options.skyColor=0x9bc4ff]
   * @param {number} [options.groundColor=0x1b2238]
   * @param {number} [options.hemisphereIntensity=0.85]
   * @param {number} [options.keyColor=0xffffff]
   * @param {number} [options.keyIntensity=1.8]
   * @param {number} [options.rimColor=0x38bdf8]
   * @param {number} [options.rimIntensity=0.9]
   * @param {number} [options.shadowMapSize=2048]
   */
  constructor(scene = null, options = {}) {
    const {
      skyColor = 0x9bc4ff,
      groundColor = 0x1b2238,
      hemisphereIntensity = 0.85,
      keyColor = 0xffffff,
      keyIntensity = 1.8,
      rimColor = 0x38bdf8,
      rimIntensity = 0.9,
      shadowMapSize = 2048,
    } = options;

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
