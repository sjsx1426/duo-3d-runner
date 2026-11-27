import * as THREE from 'three';

export const DEFAULT_LANES = [-3, 0, 3];
export const PLAYER_COLLIDER_DEFAULTS = {
  width: 0.85,
  height: 1.85,
  depth: 0.85,
};

/**
 * Distinct gameplay stat profiles for Character 1 and Character 2.
 */
export const CHARACTER_PROFILES = {
  char1: {
    id: 'char1',
    name: 'Volt Runner',
    role: 'Agile Acrobat',
    forwardSpeed: 14.5,
    laneSwitchSpeed: 16,
    jumpForce: 12.2,
    doubleJumpForce: 10.6,
    dashCooldown: 1.6,
    dashSpeedMultiplier: 1.85,
    magnetRadius: 3.2,
  },
  char2: {
    id: 'char2',
    name: 'Blaze Dasher',
    role: 'Heavy Striker',
    forwardSpeed: 15.2,
    laneSwitchSpeed: 13,
    jumpForce: 11.2,
    doubleJumpForce: 9.8,
    dashCooldown: 1.1,
    dashSpeedMultiplier: 2.15,
    magnetRadius: 2.4,
  },
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
      dashDuration = 0.25,
      dashCooldown = 1.6,
      dashSpeedMultiplier = 1.85,
      activeCharacterId = 'char1',
      partnerOffset = { x: 1.15, y: 0, z: 1.5 },
      swapCooldown = 0.35,
      maxLives = 3,
      invulnerabilityDuration = 1.5,
      movementMode = 'runner',
      arenaRadius = 14,
      arenaMoveSpeed = 10,
      onLand = null,
      onSwap = null,
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
    this.dashDuration = dashDuration;
    this.dashCooldown = dashCooldown;
    this.dashSpeedMultiplier = dashSpeedMultiplier;
    this.swapCooldown = swapCooldown;
    this.maxLives = maxLives;
    this.lives = maxLives;
    this.invulnerabilityDuration = invulnerabilityDuration;
    this.movementMode = movementMode === 'arena' ? 'arena' : 'runner';
    this.arenaRadius = arenaRadius;
    this.arenaMoveSpeed = arenaMoveSpeed;
    this._arenaInput = new THREE.Vector2(0, 0);
    this.onLand = onLand;
    this.onSwap = onSwap;

    this.isGrounded = true;
    this.jumpsUsed = 0;
    this._coyoteTimer = 0;
    this.isSliding = false;
    this._slideTimer = 0;
    this._pendingSlideOnLand = false;
    this.isDashing = false;
    this._dashTimer = 0;
    this._dashCooldownTimer = 0;
    this._swapCooldownTimer = 0;
    this.hasShield = false;
    this._shieldTimer = 0;
    this._invulnTimer = 0;

    this._baseColliderHeight = colliderSize.height ?? PLAYER_COLLIDER_DEFAULTS.height;
    this.colliderSize = {
      width: colliderSize.width ?? PLAYER_COLLIDER_DEFAULTS.width,
      height: this._baseColliderHeight,
      depth: colliderSize.depth ?? PLAYER_COLLIDER_DEFAULTS.depth,
    };

    this.group = new THREE.Group();
    this.group.name = 'Player';
    this.group.position.set(this.getTargetX(), 0, 0);

    this.partnerOffset = new THREE.Vector3(
      partnerOffset.x ?? 1.15,
      partnerOffset.y ?? 0,
      partnerOffset.z ?? 1.5,
    );
    this.partnerGroup = new THREE.Group();
    this.partnerGroup.name = 'DuoPartner';
    this.partnerGroup.position.copy(this.partnerOffset);
    this.partnerGroup.scale.setScalar(0.88);
    this.group.add(this.partnerGroup);

    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 20, 14),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.28,
        wireframe: true,
      }),
    );
    this.shieldMesh.name = 'PlayerShield';
    this.shieldMesh.position.y = 0.95;
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    this.duoBoostActive = false;
    this.trailGroup = new THREE.Group();
    this.trailGroup.name = 'PlayerTrailFX';
    this.group.add(this.trailGroup);
    this._trailPool = [];
    this._trailSpawnTimer = 0;
    const trailGeo = new THREE.BoxGeometry(0.14, 0.14, 0.5);
    for (let i = 0; i < 14; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
      });
      const mesh = new THREE.Mesh(trailGeo, mat);
      mesh.visible = false;
      this.trailGroup.add(mesh);
      this._trailPool.push({ mesh, life: 0, maxLife: 0.35, vx: 0, vy: 0 });
    }

    this.velocity = new THREE.Vector3(0, 0, 0);
    this.model = null;
    this.partnerModel = null;
    this.activeCharacterId = activeCharacterId;
    this.partnerCharacterId = activeCharacterId === 'char1' ? 'char2' : 'char1';
    this.magnetRadius = CHARACTER_PROFILES[activeCharacterId]?.magnetRadius ?? 2.5;
    this._customOverrides = {
      forwardSpeed: options.forwardSpeed,
      laneSwitchSpeed: options.laneSwitchSpeed,
      jumpForce: options.jumpForce,
      doubleJumpForce: options.doubleJumpForce,
      dashCooldown: options.dashCooldown,
      dashSpeedMultiplier: options.dashSpeedMultiplier,
    };
    this._duoModels = {};
    this._duoAnimations = {};
    this._mixer = null;
    this._partnerMixer = null;
    this._activeClipName = null;
    this._animTime = 0;
    this._hitAnimTimer = 0;

    this.applyCharacterProfile(this.activeCharacterId);
  }

  /**
   * Applies the stat profile for the given character ID while respecting explicit constructor overrides.
   * @param {string} characterId
   */
  applyCharacterProfile(characterId) {
    const profile = CHARACTER_PROFILES[characterId] || CHARACTER_PROFILES.char1;
    this.forwardSpeed = this._customOverrides?.forwardSpeed ?? profile.forwardSpeed;
    this.laneSwitchSpeed = this._customOverrides?.laneSwitchSpeed ?? profile.laneSwitchSpeed;
    this.jumpForce = this._customOverrides?.jumpForce ?? profile.jumpForce;
    this.doubleJumpForce = this._customOverrides?.doubleJumpForce ?? profile.doubleJumpForce;
    this.dashCooldown = this._customOverrides?.dashCooldown ?? profile.dashCooldown;
    this.dashSpeedMultiplier =
      this._customOverrides?.dashSpeedMultiplier ?? profile.dashSpeedMultiplier;
    this.magnetRadius = profile.magnetRadius;
  }

  /**
   * @returns {object}
   */
  getActiveProfile() {
    return CHARACTER_PROFILES[this.activeCharacterId] || CHARACTER_PROFILES.char1;
  }

  /**
   * @returns {number}
   */
  getMagnetRadius() {
    return this.magnetRadius;
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
   * Attaches a loaded or procedural 3D model and optional animation clips to the active lead player.
   * @param {THREE.Object3D|null} model
   * @param {THREE.AnimationClip[]} [animations=[]]
   */
  setModel(model, animations = []) {
    if (this._mixer) {
      this._mixer.stopAllAction();
      this._mixer = null;
      this._activeClipName = null;
    }
    if (this.model && this.model.parent === this.group) {
      this.group.remove(this.model);
    }
    this.model = model || null;
    if (this.model) {
      this.model.position.set(0, 0, 0);
      this.model.rotation.set(0, 0, 0);
      this.model.scale.set(1, 1, 1);
      this.group.add(this.model);
      if (Array.isArray(animations) && animations.length > 0) {
        this._mixer = new THREE.AnimationMixer(this.model);
      }
    }
  }

  /**
   * Attaches the duo partner companion model inside the trailing partner group.
   * @param {THREE.Object3D|null} model
   * @param {THREE.AnimationClip[]} [animations=[]]
   */
  setPartnerModel(model, animations = []) {
    if (this._partnerMixer) {
      this._partnerMixer.stopAllAction();
      this._partnerMixer = null;
    }
    if (this.partnerModel && this.partnerModel.parent === this.partnerGroup) {
      this.partnerGroup.remove(this.partnerModel);
    }
    this.partnerModel = model || null;
    if (this.partnerModel) {
      this.partnerModel.position.set(0, 0, 0);
      this.partnerModel.rotation.set(0, 0, 0);
      this.partnerModel.scale.set(1, 1, 1);
      this.partnerGroup.add(this.partnerModel);
      if (Array.isArray(animations) && animations.length > 0) {
        this._partnerMixer = new THREE.AnimationMixer(this.partnerModel);
        const runClip = animations[0];
        if (runClip) {
          this._partnerMixer.clipAction(runClip).play();
        }
      }
    }
  }

  /**
   * Registers both duo character models (and optional animation clip arrays) and mounts lead + partner.
   * @param {{char1?: THREE.Object3D, char2?: THREE.Object3D}} models
   * @param {string} [primaryId='char1']
   * @param {{char1?: THREE.AnimationClip[], char2?: THREE.AnimationClip[]}} [animationsMap={}]
   */
  setDuoModels(models = {}, primaryId = 'char1', animationsMap = {}) {
    this._duoModels = { ...models };
    this._duoAnimations = { ...animationsMap };
    const ids = Object.keys(this._duoModels).filter((id) => Boolean(this._duoModels[id]));
    if (ids.length === 0) {
      return;
    }

    const activeId = this._duoModels[primaryId] ? primaryId : ids[0];
    const partnerId = ids.find((id) => id !== activeId) || null;

    this.activeCharacterId = activeId;
    this.partnerCharacterId = partnerId;
    this.applyCharacterProfile(activeId);
    this.setModel(this._duoModels[activeId] || null, this._duoAnimations[activeId] || []);
    this.setPartnerModel(
      partnerId ? this._duoModels[partnerId] : null,
      partnerId ? this._duoAnimations[partnerId] || [] : [],
    );
  }

  /**
   * Swaps the active lead character with the trailing duo partner.
   * @returns {boolean} True if swap occurred
   */
  swapCharacter() {
    if (this._swapCooldownTimer > 0 || !this.partnerCharacterId) {
      return false;
    }
    const nextLeadModel = this._duoModels[this.partnerCharacterId];
    const nextPartnerModel = this._duoModels[this.activeCharacterId];
    if (!nextLeadModel || !nextPartnerModel) {
      return false;
    }

    const prevActive = this.activeCharacterId;
    this.activeCharacterId = this.partnerCharacterId;
    this.partnerCharacterId = prevActive;

    this.applyCharacterProfile(this.activeCharacterId);
    this.setModel(nextLeadModel, this._duoAnimations[this.activeCharacterId] || []);
    this.setPartnerModel(nextPartnerModel, this._duoAnimations[this.partnerCharacterId] || []);
    this._swapCooldownTimer = this.swapCooldown;

    if (typeof this.onSwap === 'function') {
      this.onSwap(this.activeCharacterId, this.partnerCharacterId);
    }
    return true;
  }

  /**
   * Activates a protective energy shield bubble for the specified duration.
   * @param {number} [duration=10]
   */
  grantShield(duration = 10) {
    this.hasShield = true;
    this._shieldTimer = Math.max(this._shieldTimer, duration);
    this.shieldMesh.visible = true;
  }

  /**
   * Consumes any active shield.
   */
  clearShield() {
    this.hasShield = false;
    this._shieldTimer = 0;
    this.shieldMesh.visible = false;
  }

  /**
   * Grants temporary invulnerability frames with flicker feedback.
   * @param {number} [duration=this.invulnerabilityDuration]
   */
  setInvulnerable(duration = this.invulnerabilityDuration) {
    this._invulnTimer = Math.max(this._invulnTimer, duration);
  }

  /**
   * @returns {boolean}
   */
  isInvulnerable() {
    return this._invulnTimer > 0 || this.isDashing;
  }

  /**
   * Processes incoming obstacle damage, prioritizing invulnerability and shield absorption.
   * @param {number} [amount=1]
   * @returns {{damaged: boolean, shielded: boolean, remainingLives: number}}
   */
  takeDamage(amount = 1) {
    if (this.isInvulnerable()) {
      return { damaged: false, shielded: false, remainingLives: this.lives };
    }

    if (this.hasShield) {
      this.clearShield();
      this.setInvulnerable(1.2);
      this.triggerHitAnimation(0.25);
      return { damaged: false, shielded: true, remainingLives: this.lives };
    }

    this.lives = Math.max(0, this.lives - Math.max(1, amount));
    this.setInvulnerable(this.invulnerabilityDuration);
    this.triggerHitAnimation(0.35);
    return { damaged: true, shielded: false, remainingLives: this.lives };
  }

  /**
   * Toggles Duo Boost trail intensity.
   * @param {boolean} active
   */
  setDuoBoost(active) {
    this.duoBoostActive = Boolean(active);
  }

  /**
   * Returns count of currently visible speed trail particles.
   * @returns {number}
   */
  getActiveTrailCount() {
    let count = 0;
    for (const item of this._trailPool) {
      if (item.mesh.visible) {
        count += 1;
      }
    }
    return count;
  }

  /**
   * @param {number} dt
   * @private
   */
  _updateTrailFx(dt) {
    const isBoosted = this.isDashing || this.duoBoostActive;
    const spawnInterval = isBoosted ? 0.025 : 0.075;
    const trailColor = this.activeCharacterId === 'char2' ? 0xf97316 : 0x38bdf8;

    this._trailSpawnTimer += dt;
    if (this._trailSpawnTimer >= spawnInterval) {
      this._trailSpawnTimer = 0;
      const slot = this._trailPool.find((p) => !p.mesh.visible);
      if (slot) {
        slot.life = isBoosted ? 0.42 : 0.26;
        slot.maxLife = slot.life;
        slot.vx = (Math.random() - 0.5) * 0.6;
        slot.vy = Math.random() * 0.4;
        slot.mesh.visible = true;
        slot.mesh.material.color.setHex(trailColor);
        slot.mesh.position.set((Math.random() - 0.5) * 0.42, 0.45 + Math.random() * 0.75, 0.35);
        slot.mesh.scale.set(1, 1, isBoosted ? 1.8 : 1);
      }
    }

    const driftSpeed = this.getEffectiveForwardSpeed() * 0.7;
    for (const item of this._trailPool) {
      if (!item.mesh.visible) {
        continue;
      }
      item.life -= dt;
      if (item.life <= 0) {
        item.mesh.visible = false;
        continue;
      }
      const ratio = item.life / item.maxLife;
      item.mesh.position.x += item.vx * dt;
      item.mesh.position.y += item.vy * dt;
      item.mesh.position.z += driftSpeed * dt;
      item.mesh.material.opacity = ratio * (isBoosted ? 0.85 : 0.45);
      item.mesh.scale.x = ratio;
      item.mesh.scale.y = ratio;
    }
  }

  /**
   * Triggers a brief hit recoil animation state.
   * @param {number} [duration=0.35]
   */
  triggerHitAnimation(duration = 0.35) {
    this._hitAnimTimer = Math.max(this._hitAnimTimer, duration);
  }

  /**
   * Returns current semantic animation state.
   * @returns {'hit'|'slide'|'jump'|'dash'|'run'}
   */
  getAnimationState() {
    if (this._hitAnimTimer > 0) {
      return 'hit';
    }
    if (this.isSliding) {
      return 'slide';
    }
    if (!this.isGrounded) {
      return 'jump';
    }
    if (this.isDashing) {
      return 'dash';
    }
    return 'run';
  }

  /**
   * @returns {string}
   */
  getActiveCharacterId() {
    return this.activeCharacterId;
  }

  /**
   * @returns {string|null}
   */
  getPartnerCharacterId() {
    return this.partnerCharacterId;
  }

  /**
   * @returns {THREE.Object3D|null}
   */
  getPartnerModel() {
    return this.partnerModel;
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
   * Triggers a short speed/invulnerability dash burst, optionally shifting a lane.
   * @param {number} [direction=0] Negative for left lane dash, positive for right, 0 for forward dash
   * @returns {boolean} True if dash triggered
   */
  dash(direction = 0) {
    if (this.isDashing || this._dashCooldownTimer > 0) {
      return false;
    }

    if (direction < 0) {
      this.moveLeft();
    } else if (direction > 0) {
      this.moveRight();
    }

    this.isDashing = true;
    this._dashTimer = this.dashDuration;
    this._dashCooldownTimer = this.dashCooldown;
    return true;
  }

  /**
   * Returns current forward speed factoring in any active dash burst.
   * @returns {number}
   */
  getEffectiveForwardSpeed() {
    return this.isDashing
      ? this.forwardSpeed * this.dashSpeedMultiplier
      : this.forwardSpeed;
  }

  /**
   * Returns normalized dash readiness from 0 (just used) to 1 (ready).
   * @returns {number}
   */
  getDashCooldownProgress() {
    if (this.dashCooldown <= 0) {
      return 1;
    }
    return 1 - Math.max(0, Math.min(1, this._dashCooldownTimer / this.dashCooldown));
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
   * Switches between 3-lane endless runner movement and 360-degree arena movement.
   * @param {'runner'|'arena'} mode
   */
  setMovementMode(mode) {
    this.movementMode = mode === 'arena' ? 'arena' : 'runner';
    if (this.movementMode === 'runner') {
      this._arenaInput.set(0, 0);
      this.group.position.z = 0;
      this.group.rotation.y = 0;
      this.velocity.z = 0;
    }
  }

  /**
   * @returns {'runner'|'arena'}
   */
  getMovementMode() {
    return this.movementMode;
  }

  /**
   * Sets the circular boundary radius used in arena movement mode.
   * @param {number} radius
   */
  setArenaBounds(radius) {
    this.arenaRadius = Math.max(2, radius);
  }

  /**
   * Sets normalized 2D free-roam input vector for arena movement (x: right, z: backward/forward).
   * @param {number} x
   * @param {number} z
   */
  setMoveInput(x = 0, z = 0) {
    this._arenaInput.set(x, z);
    if (this._arenaInput.lengthSq() > 1) {
      this._arenaInput.normalize();
    }
  }

  /**
   * Advances lateral/arena movement, jump gravity, slide timer, dash burst, and banking tilt.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    const safeDt = Math.max(0, dt || 0);
    const targetX = this.getTargetX();
    const prevX = this.group.position.x;
    const laneSpeed = this.isDashing ? this.laneSwitchSpeed * 1.5 : this.laneSwitchSpeed;
    const alpha = 1 - Math.exp(-laneSpeed * safeDt);

    if (this.movementMode === 'arena') {
      const moveSpeed =
        this.arenaMoveSpeed * (this.isDashing ? this.dashSpeedMultiplier * 0.85 : 1);
      const vx = this._arenaInput.x * moveSpeed;
      const vz = this._arenaInput.y * moveSpeed;

      this.group.position.x += vx * safeDt;
      this.group.position.z += vz * safeDt;
      this.velocity.x = vx;
      this.velocity.z = vz;

      const distSq =
        this.group.position.x * this.group.position.x +
        this.group.position.z * this.group.position.z;
      const maxR = Math.max(1, this.arenaRadius - this.colliderSize.width * 0.5);
      if (distSq > maxR * maxR) {
        const dist = Math.sqrt(distSq);
        this.group.position.x = (this.group.position.x / dist) * maxR;
        this.group.position.z = (this.group.position.z / dist) * maxR;
      }

      if (this._arenaInput.lengthSq() > 0.01) {
        const targetYaw = Math.atan2(-vx, -vz);
        let deltaYaw = targetYaw - this.group.rotation.y;
        while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
        while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
        this.group.rotation.y += deltaYaw * Math.min(1, safeDt * 12);
      }
    } else {
      this.group.position.x += (targetX - prevX) * alpha;
      this.velocity.x = safeDt > 0 ? (this.group.position.x - prevX) / safeDt : 0;
      this.velocity.z = 0;
    }

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

    if (this.isDashing) {
      this._dashTimer -= safeDt;
      if (this._dashTimer <= 0) {
        this.isDashing = false;
        this._dashTimer = 0;
      }
    }
    if (this._dashCooldownTimer > 0) {
      this._dashCooldownTimer = Math.max(0, this._dashCooldownTimer - safeDt);
    }
    if (this._swapCooldownTimer > 0) {
      this._swapCooldownTimer = Math.max(0, this._swapCooldownTimer - safeDt);
    }
    if (this._hitAnimTimer > 0) {
      this._hitAnimTimer = Math.max(0, this._hitAnimTimer - safeDt);
    }

    if (this.hasShield) {
      this._shieldTimer -= safeDt;
      if (this._shieldTimer <= 0) {
        this.clearShield();
      } else {
        this.shieldMesh.rotation.y += safeDt * 1.6;
        const pulse = 1 + Math.sin(this._animTime * 5) * 0.04;
        this.shieldMesh.scale.setScalar(pulse);
      }
    }

    if (this._invulnTimer > 0) {
      this._invulnTimer = Math.max(0, this._invulnTimer - safeDt);
      if (this.model) {
        this.model.visible = this._invulnTimer === 0 || Math.floor(this._invulnTimer * 16) % 2 === 0;
      }
    } else if (this.model && !this.model.visible) {
      this.model.visible = true;
    }

    this._animTime += safeDt * (this.isDashing ? 1.55 : 1);
    this._updateAnimations(safeDt, prevX, targetX, alpha);
    this._updateTrailFx(safeDt);

    if (this.partnerModel) {
      const targetPartnerX =
        (this.group.position.x > 1.5 ? -Math.abs(this.partnerOffset.x) : this.partnerOffset.x) +
        (prevX - targetX) * 0.15;
      const partnerAlpha = 1 - Math.exp(-9 * safeDt);
      this.partnerGroup.position.x += (targetPartnerX - this.partnerGroup.position.x) * partnerAlpha;
      this.partnerGroup.position.y +=
        (this.partnerOffset.y - this.group.position.y * 0.25 - this.partnerGroup.position.y) *
        partnerAlpha;
      this.partnerGroup.position.z = this.partnerOffset.z;
    }
  }

  /**
   * Drives GLTF AnimationMixer clips when present or procedural joint animations otherwise.
   * @param {number} dt
   * @param {number} prevX
   * @param {number} targetX
   * @param {number} alpha
   * @private
   */
  _updateAnimations(dt, prevX, targetX, alpha) {
    const animState = this.getAnimationState();

    if (this._mixer) {
      const clips = this._duoAnimations[this.activeCharacterId] || [];
      if (clips.length > 0 && this._activeClipName !== animState) {
        const clip =
          THREE.AnimationClip.findByName(clips, animState) ||
          THREE.AnimationClip.findByName(clips, 'run') ||
          clips[0];
        if (clip) {
          this._mixer.stopAllAction();
          this._mixer.clipAction(clip).play();
          this._activeClipName = animState;
        }
      }
      this._mixer.update(dt);
    }
    if (this._partnerMixer) {
      this._partnerMixer.update(dt);
    }

    if (this.model) {
      const targetBank = THREE.MathUtils.clamp((prevX - targetX) * 0.08, -0.25, 0.25);
      this.model.rotation.z += (targetBank - this.model.rotation.z) * alpha;
      const targetPitch = animState === 'hit' ? 0.35 : this.isDashing ? -0.22 : 0;
      this.model.rotation.x += (targetPitch - this.model.rotation.x) * Math.min(1, dt * 16);
      const targetScaleY = this.isSliding ? 0.55 : 1;
      this.model.scale.y += (targetScaleY - this.model.scale.y) * Math.min(1, dt * 18);

      this._animateProceduralJoints(this.model, animState, 0);
    }

    if (this.partnerModel) {
      this._animateProceduralJoints(this.partnerModel, 'run', 0.85);
    }
  }

  /**
   * Applies pose/stride rotations to procedural avatar joints.
   * @param {THREE.Object3D} model
   * @param {'hit'|'slide'|'jump'|'dash'|'run'} state
   * @param {number} phaseOffset
   * @private
   */
  _animateProceduralJoints(model, state, phaseOffset) {
    const joints = model?.userData?.joints;
    if (!joints) {
      return;
    }

    if (state === 'jump') {
      joints.leftLeg.rotation.x = 0.55;
      joints.rightLeg.rotation.x = -0.35;
      joints.leftArm.rotation.x = -0.8;
      joints.rightArm.rotation.x = -0.65;
      joints.torso.rotation.x = -0.1;
      return;
    }

    if (state === 'slide') {
      joints.leftLeg.rotation.x = -1.1;
      joints.rightLeg.rotation.x = -0.85;
      joints.leftArm.rotation.x = 0.65;
      joints.rightArm.rotation.x = 0.65;
      joints.torso.rotation.x = 0.45;
      return;
    }

    if (state === 'hit') {
      joints.torso.rotation.x = 0.35;
      joints.leftArm.rotation.x = -0.9;
      joints.rightArm.rotation.x = -0.9;
      return;
    }

    const stride = Math.sin(this._animTime * 12 + phaseOffset);
    joints.leftLeg.rotation.x = stride * 0.78;
    joints.rightLeg.rotation.x = -stride * 0.78;
    joints.leftArm.rotation.x = -stride * 0.68;
    joints.rightArm.rotation.x = stride * 0.68;
    joints.torso.rotation.x = state === 'dash' ? -0.18 : -0.05;
    joints.torso.position.y = 1.05 + Math.abs(Math.cos(this._animTime * 12 + phaseOffset)) * 0.06;
  }

  /**
   * Resets player position, jump, slide, dash, and animation state to center spawn.
   */
  reset() {
    this.laneIndex = this._clampLaneIndex(Math.floor(this.lanes.length / 2));
    this.group.position.set(this.movementMode === 'arena' ? 0 : this.getTargetX(), this.groundY, 0);
    this.group.rotation.y = 0;
    this._arenaInput.set(0, 0);
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    this.jumpsUsed = 0;
    this._coyoteTimer = this.coyoteTime;
    this.isDashing = false;
    this._dashTimer = 0;
    this._dashCooldownTimer = 0;
    this._swapCooldownTimer = 0;
    this._hitAnimTimer = 0;
    this._animTime = 0;
    this.lives = this.maxLives;
    this._invulnTimer = 0;
    this.duoBoostActive = false;
    this._trailSpawnTimer = 0;
    for (const item of this._trailPool) {
      item.life = 0;
      item.mesh.visible = false;
    }
    this.clearShield();
    this.partnerGroup.position.copy(this.partnerOffset);
    this._endSlide();
    if (this.model) {
      this.model.visible = true;
      this.model.rotation.set(0, 0, 0);
      this.model.scale.y = 1;
    }
  }
}

export default Player;
