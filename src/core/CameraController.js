import * as THREE from 'three';

/**
 * Named camera view presets for Runner, Arena, and Character Showcase views.
 */
export const CAMERA_MODES = {
  runner: {
    offset: { x: 0, y: 5.5, z: 10 },
    lookOffset: { x: 0, y: 1.5, z: -6 },
    fov: 60,
    followDamping: 8,
  },
  arena: {
    offset: { x: 0, y: 12.5, z: 14 },
    lookOffset: { x: 0, y: 0.8, z: 0 },
    fov: 55,
    followDamping: 6,
  },
  showcase: {
    offset: { x: 0, y: 2.3, z: 5.2 },
    lookOffset: { x: 0, y: 1.1, z: 0 },
    fov: 46,
    followDamping: 8,
  },
};

/**
 * Controls the PerspectiveCamera with smooth damped chase-following and resize handling.
 */
export class CameraController {
  /**
   * @param {object} [options]
   * @param {number} [options.fov=60]
   * @param {number} [options.aspect=16/9]
   * @param {number} [options.near=0.1]
   * @param {number} [options.far=250]
   * @param {THREE.Vector3|{x:number,y:number,z:number}} [options.offset]
   * @param {THREE.Vector3|{x:number,y:number,z:number}} [options.lookOffset]
   * @param {number} [options.followDamping=8]
   * @param {string} [options.mode='runner']
   */
  constructor(options = {}) {
    const modePreset = CAMERA_MODES[options.mode] || CAMERA_MODES.runner;
    const {
      fov = modePreset.fov,
      aspect = typeof window !== 'undefined' && window.innerHeight > 0
        ? window.innerWidth / window.innerHeight
        : 16 / 9,
      near = 0.1,
      far = 250,
      offset = modePreset.offset,
      lookOffset = modePreset.lookOffset,
      followDamping = modePreset.followDamping,
      mode = 'runner',
    } = options;

    this._mode = CAMERA_MODES[mode] ? mode : 'runner';
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.offset = new THREE.Vector3(offset.x, offset.y, offset.z);
    this.lookOffset = new THREE.Vector3(lookOffset.x, lookOffset.y, lookOffset.z);
    this._targetOffset = new THREE.Vector3().copy(this.offset);
    this._targetLookOffset = new THREE.Vector3().copy(this.lookOffset);
    this.followDamping = followDamping;

    this._basePosition = new THREE.Vector3().copy(this.offset);
    this._desiredPosition = new THREE.Vector3();
    this._currentLookAt = new THREE.Vector3();
    this._desiredLookAt = new THREE.Vector3();
    this._target = null;

    this._trauma = 0;
    this._shakeDecay = 2.4;
    this._maxShakeOffset = 0.65;
    this._shakeTime = 0;

    this._baseFov = fov;
    this._fovBoost = 0;
    this._fovDamping = 7;

    this.camera.position.copy(this.offset);
    this._currentLookAt.copy(this.lookOffset);
    this.camera.lookAt(this._currentLookAt);
  }

  /**
   * Sets the target object or position holder to follow.
   * @param {THREE.Object3D|{position: THREE.Vector3}|null} target
   * @param {boolean} [snap=false]
   */
  setTarget(target, snap = false) {
    this._target = target;
    if (snap && target) {
      this.snapTo(target);
    }
  }

  /**
   * Immediately snaps the camera and lookAt target to the given target without damping.
   * @param {THREE.Object3D|{position: THREE.Vector3}} [target=this._target]
   */
  snapTo(target = this._target) {
    const pos = target?.position;
    if (!pos) {
      return;
    }

    this._basePosition.set(
      pos.x + this.offset.x,
      pos.y + this.offset.y,
      pos.z + this.offset.z,
    );
    this.camera.position.copy(this._basePosition);
    this._currentLookAt.set(
      pos.x + this.lookOffset.x,
      pos.y + this.lookOffset.y,
      pos.z + this.lookOffset.z,
    );
    this.camera.lookAt(this._currentLookAt);
  }

  /**
   * Adds trauma-based camera shake in the [0, 1] range.
   * @param {number} amount
   */
  addShake(amount = 0.5) {
    this._trauma = Math.min(1, Math.max(0, this._trauma + amount));
  }

  /**
   * Sets the baseline field of view in degrees.
   * @param {number} fov
   */
  setBaseFov(fov) {
    this._baseFov = Math.max(30, Math.min(110, fov));
  }

  /**
   * Sets an additional temporary FOV boost in degrees (e.g. during sprint or dash).
   * @param {number} boost
   */
  setFovBoost(boost = 0) {
    this._fovBoost = Math.max(-15, Math.min(30, boost));
  }

  /**
   * Smoothly updates camera position, trauma shake, FOV boost, and orientation.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    const pos = this._target?.position;
    if (!pos) {
      return;
    }

    const safeDt = Math.max(0, dt || 0);
    const alpha = 1 - Math.exp(-this.followDamping * safeDt);

    this.offset.lerp(this._targetOffset, alpha);
    this.lookOffset.lerp(this._targetLookOffset, alpha);

    this._desiredPosition.set(
      pos.x + this.offset.x,
      pos.y + this.offset.y,
      pos.z + this.offset.z,
    );
    this._desiredLookAt.set(
      pos.x + this.lookOffset.x,
      pos.y + this.lookOffset.y,
      pos.z + this.lookOffset.z,
    );

    this._basePosition.lerp(this._desiredPosition, alpha);
    this._currentLookAt.lerp(this._desiredLookAt, alpha);

    this.camera.position.copy(this._basePosition);
    if (this._trauma > 0) {
      this._shakeTime += safeDt * 45;
      const shakePower = this._trauma * this._trauma * this._maxShakeOffset;
      this.camera.position.x += Math.sin(this._shakeTime * 1.3) * shakePower;
      this.camera.position.y += Math.cos(this._shakeTime * 1.9) * shakePower * 0.8;
      this._trauma = Math.max(0, this._trauma - this._shakeDecay * safeDt);
    }

    const targetFov = this._baseFov + this._fovBoost;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      const fovAlpha = 1 - Math.exp(-this._fovDamping * safeDt);
      this.camera.fov += (targetFov - this.camera.fov) * fovAlpha;
      this.camera.updateProjectionMatrix();
    }

    this.camera.lookAt(this._currentLookAt);
  }

  /**
   * Updates the camera projection matrix when viewport dimensions change.
   * @param {number} width
   * @param {number} height
   */
  setAspect(width, height) {
    if (!height || height <= 0) {
      return;
    }
    this.camera.aspect = Math.max(1, width) / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Switches between named camera presets ('runner', 'arena', 'showcase').
   * @param {string} modeName
   * @param {boolean} [snap=false]
   */
  setMode(modeName, snap = false) {
    const preset = CAMERA_MODES[modeName];
    if (!preset) {
      return;
    }

    this._mode = modeName;
    this._targetOffset.set(preset.offset.x, preset.offset.y, preset.offset.z);
    this._targetLookOffset.set(
      preset.lookOffset.x,
      preset.lookOffset.y,
      preset.lookOffset.z,
    );
    this.followDamping = preset.followDamping;
    this.setBaseFov(preset.fov);

    if (snap) {
      this.offset.copy(this._targetOffset);
      this.lookOffset.copy(this._targetLookOffset);
      this.camera.fov = this._baseFov + this._fovBoost;
      this.camera.updateProjectionMatrix();
      this.snapTo();
    }
  }

  /**
   * @returns {string} Active camera mode name
   */
  getMode() {
    return this._mode;
  }

  /**
   * Updates follow offsets at runtime.
   * @param {{x:number,y:number,z:number}} offset
   * @param {{x:number,y:number,z:number}} [lookOffset]
   */
  setOffsets(offset, lookOffset) {
    if (offset) {
      this.offset.set(offset.x, offset.y, offset.z);
      this._targetOffset.copy(this.offset);
    }
    if (lookOffset) {
      this.lookOffset.set(lookOffset.x, lookOffset.y, lookOffset.z);
      this._targetLookOffset.copy(this.lookOffset);
    }
  }

  /**
   * @returns {THREE.PerspectiveCamera}
   */
  getCamera() {
    return this.camera;
  }
}

export default CameraController;
