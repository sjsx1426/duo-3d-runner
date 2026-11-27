import * as THREE from 'three';

export const DEFAULT_LANES = [-3, 0, 3];
export const PLAYER_COLLIDER_DEFAULTS = {
  width: 0.85,
  height: 1.85,
  depth: 0.85,
};

/**
 * Core Player entity managing 3-lane lateral movement, velocity, bounds, and character mesh attachment.
 */
export class Player {
  /**
   * @param {object} [options]
   * @param {number[]} [options.lanes]
   * @param {number} [options.laneIndex=1]
   * @param {number} [options.laneSwitchSpeed=14]
   * @param {number} [options.forwardSpeed=14]
   * @param {{width?: number, height?: number, depth?: number}} [options.colliderSize]
   */
  constructor(options = {}) {
    const {
      lanes = DEFAULT_LANES,
      laneIndex = 1,
      laneSwitchSpeed = 14,
      forwardSpeed = 14,
      colliderSize = PLAYER_COLLIDER_DEFAULTS,
    } = options;

    this.lanes = [...lanes];
    this.laneIndex = this._clampLaneIndex(laneIndex);
    this.laneSwitchSpeed = laneSwitchSpeed;
    this.forwardSpeed = forwardSpeed;

    this.colliderSize = {
      width: colliderSize.width ?? PLAYER_COLLIDER_DEFAULTS.width,
      height: colliderSize.height ?? PLAYER_COLLIDER_DEFAULTS.height,
      depth: colliderSize.depth ?? PLAYER_COLLIDER_DEFAULTS.depth,
    };

    this.group = new THREE.Group();
    this.group.name = 'Player';
    this.group.position.set(this.getTargetX(), 0, 0);

    this.velocity = new THREE.Vector3(0, 0, 0);
    this.model = null;
  }

  /**
   * @returns {THREE.Vector3}
   */
  get position() {
    return this.group.position;
  }

  /**
   * @returns {THREE.Group}
   */
  getObject3D() {
    return this.group;
  }

  /**
   * Attaches a loaded or procedural 3D model to the player container.
   * @param {THREE.Object3D|null} model
   */
  setModel(model) {
    if (this.model && this.model.parent === this.group) {
      this.group.remove(this.model);
    }
    this.model = model || null;
    if (this.model) {
      this.group.add(this.model);
    }
  }

  /**
   * @param {number} index
   * @returns {number}
   * @private
   */
  _clampLaneIndex(index) {
    return Math.max(0, Math.min(this.lanes.length - 1, index));
  }

  /**
   * Shifts target lane one step to the left.
   * @returns {boolean} True if the lane changed
   */
  moveLeft() {
    const next = this._clampLaneIndex(this.laneIndex - 1);
    if (next === this.laneIndex) {
      return false;
    }
    this.laneIndex = next;
    return true;
  }

  /**
   * Shifts target lane one step to the right.
   * @returns {boolean} True if the lane changed
   */
  moveRight() {
    const next = this._clampLaneIndex(this.laneIndex + 1);
    if (next === this.laneIndex) {
      return false;
    }
    this.laneIndex = next;
    return true;
  }

  /**
   * Sets target lane index directly.
   * @param {number} index
   */
  setLane(index) {
    this.laneIndex = this._clampLaneIndex(index);
  }

  /**
   * @returns {number}
   */
  getLaneIndex() {
    return this.laneIndex;
  }

  /**
   * @returns {number} Target X coordinate for the active lane
   */
  getTargetX() {
    return this.lanes[this.laneIndex] ?? 0;
  }

  /**
   * Returns current axis-aligned bounding extents in world space.
   * @returns {{minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number}}
   */
  getBounds() {
    const { x, y, z } = this.group.position;
    const halfW = this.colliderSize.width * 0.5;
    const halfD = this.colliderSize.depth * 0.5;
    return {
      minX: x - halfW,
      maxX: x + halfW,
      minY: y,
      maxY: y + this.colliderSize.height,
      minZ: z - halfD,
      maxZ: z + halfD,
    };
  }

  /**
   * Advances lateral lane interpolation and banking tilt.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    const safeDt = Math.max(0, dt || 0);
    const targetX = this.getTargetX();
    const prevX = this.group.position.x;
    const alpha = 1 - Math.exp(-this.laneSwitchSpeed * safeDt);

    this.group.position.x += (targetX - prevX) * alpha;
    this.velocity.x = safeDt > 0 ? (this.group.position.x - prevX) / safeDt : 0;

    if (this.model) {
      const targetBank = THREE.MathUtils.clamp((prevX - targetX) * 0.08, -0.25, 0.25);
      this.model.rotation.z += (targetBank - this.model.rotation.z) * alpha;
    }
  }

  /**
   * Resets player position and lane state to center spawn.
   */
  reset() {
    this.laneIndex = this._clampLaneIndex(Math.floor(this.lanes.length / 2));
    this.group.position.set(this.getTargetX(), 0, 0);
    this.velocity.set(0, 0, 0);
    if (this.model) {
      this.model.rotation.z = 0;
    }
  }
}

export default Player;
