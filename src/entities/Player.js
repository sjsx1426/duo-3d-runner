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
      jumpForce = 11.5,
      doubleJumpForce = 10,
      gravity = 28,
      maxJumps = 2,
      coyoteTime = 0.1,
      groundY = 0,
      slideDuration = 0.6,
      slideHeightRatio = 0.48,
      fastFallVelocity = -18,
      onLand = null,
      colliderSize = PLAYER_COLLIDER_DEFAULTS,
    } = options;

    this.lanes = [...lanes];
    this.laneIndex = this._clampLaneIndex(laneIndex);
    this.laneSwitchSpeed = laneSwitchSpeed;
    this.forwardSpeed = forwardSpeed;
    this.jumpForce = jumpForce;
    this.doubleJumpForce = doubleJumpForce;
    this.gravity = gravity;
    this.maxJumps = maxJumps;
    this.coyoteTime = coyoteTime;
    this.groundY = groundY;
    this.slideDuration = slideDuration;
    this.slideHeightRatio = slideHeightRatio;
    this.fastFallVelocity = fastFallVelocity;
    this.onLand = onLand;

    this.isGrounded = true;
    this.jumpsUsed = 0;
    this._coyoteTimer = 0;
    this.isSliding = false;
    this._slideTimer = 0;
    this._pendingSlideOnLand = false;

    this._baseColliderHeight = colliderSize.height ?? PLAYER_COLLIDER_DEFAULTS.height;
    this.colliderSize = {
      width: colliderSize.width ?? PLAYER_COLLIDER_DEFAULTS.width,
      height: this._baseColliderHeight,
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
   * Triggers a primary jump (including coyote window) or an aerial double-jump.
   * Cancels any active slide state for responsive jump-out-of-slide control.
   * @returns {boolean} True if a jump was executed
   */
  jump() {
    const canCoyoteJump = !this.isGrounded && this.jumpsUsed === 0 && this._coyoteTimer > 0;
    if (this.isGrounded || canCoyoteJump) {
      this._endSlide();
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      this.jumpsUsed = 1;
      this._coyoteTimer = 0;
      return true;
    }

    if (this.jumpsUsed < this.maxJumps) {
      this._endSlide();
      this.velocity.y = this.doubleJumpForce;
      this.jumpsUsed += 1;
      return true;
    }

    return false;
  }

  /**
   * Initiates a timed slide with lowered collider height, or a fast-fall into slide if airborne.
   * @returns {boolean} True if slide or fast-fall began
   */
  slide() {
    if (this.isGrounded) {
      this.isSliding = true;
      this._slideTimer = this.slideDuration;
      this.colliderSize.height = this._baseColliderHeight * this.slideHeightRatio;
      return true;
    }

    this._pendingSlideOnLand = true;
    if (this.velocity.y > this.fastFallVelocity) {
      this.velocity.y = this.fastFallVelocity;
    }
    return true;
  }

  /**
   * @private
   */
  _endSlide() {
    this.isSliding = false;
    this._slideTimer = 0;
    this._pendingSlideOnLand = false;
    this.colliderSize.height = this._baseColliderHeight;
  }

  /**
   * Advances lateral lane interpolation, jump gravity, slide timer, and banking tilt.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    const safeDt = Math.max(0, dt || 0);
    const targetX = this.getTargetX();
    const prevX = this.group.position.x;
    const alpha = 1 - Math.exp(-this.laneSwitchSpeed * safeDt);

    this.group.position.x += (targetX - prevX) * alpha;
    this.velocity.x = safeDt > 0 ? (this.group.position.x - prevX) / safeDt : 0;

    if (this.isGrounded) {
      this._coyoteTimer = this.coyoteTime;
    } else {
      this._coyoteTimer = Math.max(0, this._coyoteTimer - safeDt);
      this.velocity.y -= this.gravity * safeDt;
      this.group.position.y += this.velocity.y * safeDt;

      if (this.group.position.y <= this.groundY) {
        this.group.position.y = this.groundY;
        const impactVelocity = Math.abs(this.velocity.y);
        this.velocity.y = 0;
        this.isGrounded = true;
        this.jumpsUsed = 0;
        this._coyoteTimer = this.coyoteTime;
        if (this._pendingSlideOnLand) {
          this._pendingSlideOnLand = false;
          this.slide();
        }
        if (typeof this.onLand === 'function') {
          this.onLand(impactVelocity);
        }
      }
    }

    if (this.isSliding) {
      this._slideTimer -= safeDt;
      if (this._slideTimer <= 0) {
        this._endSlide();
      }
    }

    if (this.model) {
      const targetBank = THREE.MathUtils.clamp((prevX - targetX) * 0.08, -0.25, 0.25);
      this.model.rotation.z += (targetBank - this.model.rotation.z) * alpha;
      const targetScaleY = this.isSliding ? 0.55 : 1;
      this.model.scale.y += (targetScaleY - this.model.scale.y) * Math.min(1, safeDt * 18);
    }
  }

  /**
   * Resets player position, jump state, slide state, and lane state to center spawn.
   */
  reset() {
    this.laneIndex = this._clampLaneIndex(Math.floor(this.lanes.length / 2));
    this.group.position.set(this.getTargetX(), this.groundY, 0);
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    this.jumpsUsed = 0;
    this._coyoteTimer = this.coyoteTime;
    this._endSlide();
    if (this.model) {
      this.model.rotation.z = 0;
      this.model.scale.y = 1;
    }
  }
}

export default Player;
