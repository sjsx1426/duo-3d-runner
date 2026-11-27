/**
 * Default keyboard code bindings per gameplay action.
 */
export const DEFAULT_BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'ArrowUp', 'KeyW'],
  slide: ['ArrowDown', 'KeyS'],
  dash: ['ShiftLeft', 'ShiftRight'],
  swap: ['KeyQ', 'Tab'],
  pause: ['KeyP', 'Escape'],
};

/**
 * Manages keyboard input bindings, held states, and action event subscriptions.
 */
export class InputManager {
  /**
   * @param {object} [options]
   * @param {EventTarget|null} [options.target]
   * @param {EventTarget|null} [options.touchTarget]
   * @param {Record<string, string[]>} [options.bindings]
   * @param {boolean} [options.ignoreRepeat=true]
   * @param {number} [options.bufferWindow=0.14]
   * @param {string[]} [options.bufferableActions]
   * @param {number} [options.swipeThreshold=28]
   * @param {number} [options.doubleTapWindowMs=280]
   * @param {string} [options.doubleTapAction='dash']
   */
  constructor(options = {}) {
    const {
      target = typeof window !== 'undefined' ? window : null,
      touchTarget = target,
      bindings = DEFAULT_BINDINGS,
      ignoreRepeat = true,
      bufferWindow = 0.14,
      bufferableActions = ['jump', 'slide', 'left', 'right', 'dash', 'swap'],
      swipeThreshold = 28,
      doubleTapWindowMs = 280,
      doubleTapAction = 'dash',
      gamepadDeadzone = 0.45,
      getGamepads = null,
    } = options;

    this.target = target;
    this.touchTarget = touchTarget;
    this.ignoreRepeat = ignoreRepeat;
    this.bufferWindow = bufferWindow;
    this.bufferableActions = new Set(bufferableActions);
    this.swipeThreshold = swipeThreshold;
    this.doubleTapWindowMs = doubleTapWindowMs;
    this.doubleTapAction = doubleTapAction;
    this.gamepadDeadzone = gamepadDeadzone;
    this._getGamepads =
      typeof getGamepads === 'function'
        ? getGamepads
        : () =>
            typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
              ? navigator.getGamepads()
              : [];
    this.bindings = {};
    this._codeToAction = new Map();
    this._pressedCodes = new Set();
    this._pressedActions = new Set();
    this._listeners = new Map();
    this._actionBuffer = new Map();
    this._prevGamepadState = new Set();
    this._touchStart = null;
    this._swipeTriggered = false;
    this._lastTapTimeMs = 0;
    this._disposed = false;

    this.setBindings(bindings);

    this._onKeyDown = (event) => this.handleKeyDown(event);
    this._onKeyUp = (event) => this.handleKeyUp(event);
    this._onBlur = () => this.clearPressed();
    this._onTouchStart = (event) => this.handleTouchStart(event);
    this._onTouchMove = (event) => this.handleTouchMove(event);
    this._onTouchEnd = (event) => this.handleTouchEnd(event);

    if (this.target && typeof this.target.addEventListener === 'function') {
      this.target.addEventListener('keydown', this._onKeyDown);
      this.target.addEventListener('keyup', this._onKeyUp);
      this.target.addEventListener('blur', this._onBlur);
    }

    if (this.touchTarget && typeof this.touchTarget.addEventListener === 'function') {
      this.touchTarget.addEventListener('touchstart', this._onTouchStart, { passive: true });
      this.touchTarget.addEventListener('touchmove', this._onTouchMove, { passive: true });
      this.touchTarget.addEventListener('touchend', this._onTouchEnd, { passive: true });
      this.touchTarget.addEventListener('touchcancel', this._onTouchEnd, { passive: true });
    }
  }

  /**
   * Replaces active action-to-keyCode mappings.
   * @param {Record<string, string[]>} bindings
   */
  setBindings(bindings) {
    this.bindings = {};
    this._codeToAction.clear();

    for (const [action, codes] of Object.entries(bindings)) {
      const codeList = Array.isArray(codes) ? [...codes] : [];
      this.bindings[action] = codeList;
      for (const code of codeList) {
        this._codeToAction.set(code, action);
      }
    }
  }

  /**
   * Subscribes a callback to an action trigger.
   * @param {string} action
   * @param {(action: string, meta?: object) => void} handler
   * @returns {() => void} Unsubscribe function
   */
  on(action, handler) {
    if (!this._listeners.has(action)) {
      this._listeners.set(action, new Set());
    }
    this._listeners.get(action).add(handler);
    return () => this.off(action, handler);
  }

  /**
   * Unsubscribes a callback from an action.
   * @param {string} action
   * @param {Function} handler
   */
  off(action, handler) {
    this._listeners.get(action)?.delete(handler);
  }

  /**
   * Emits an action to registered subscribers and queues it in the action buffer if bufferable.
   * @param {string} action
   * @param {object} [meta]
   */
  emit(action, meta = {}) {
    if (this.bufferableActions.has(action)) {
      this.bufferAction(action);
    }
    const handlers = this._listeners.get(action);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(action, meta);
    }
  }

  /**
   * Queues an action in the short input buffer for pre-landing/cooldown responsiveness.
   * @param {string} action
   * @param {number} [ttl=this.bufferWindow]
   */
  bufferAction(action, ttl = this.bufferWindow) {
    if (ttl > 0) {
      this._actionBuffer.set(action, ttl);
    }
  }

  /**
   * Checks whether an action is currently buffered.
   * @param {string} action
   * @returns {boolean}
   */
  hasBufferedAction(action) {
    return (this._actionBuffer.get(action) || 0) > 0;
  }

  /**
   * Consumes and clears a buffered action if still within its time window.
   * @param {string} action
   * @returns {boolean}
   */
  consumeBufferedAction(action) {
    if (!this.hasBufferedAction(action)) {
      return false;
    }
    this._actionBuffer.delete(action);
    return true;
  }

  /**
   * Advances buffer timers and polls connected standard gamepads; call once per frame.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    const safeDt = Math.max(0, dt || 0);
    for (const [action, remaining] of this._actionBuffer.entries()) {
      const next = remaining - safeDt;
      if (next <= 0) {
        this._actionBuffer.delete(action);
      } else {
        this._actionBuffer.set(action, next);
      }
    }

    this.pollGamepads();
  }

  /**
   * Polls connected standard gamepads with deadzone handling and edge-triggered emits.
   */
  pollGamepads() {
    if (this._disposed) {
      return;
    }

    const pads = this._getGamepads();
    if (!pads) {
      return;
    }

    const activePad = Array.from(pads).find((pad) => pad && pad.connected);
    const current = new Set();

    if (activePad) {
      const axes = activePad.axes || [];
      const buttons = activePad.buttons || [];
      const isPressed = (idx) => Boolean(buttons[idx]?.pressed);
      const axisX = axes[0] ?? 0;
      const axisY = axes[1] ?? 0;

      if (axisX <= -this.gamepadDeadzone || isPressed(14)) {
        current.add('left');
      }
      if (axisX >= this.gamepadDeadzone || isPressed(15)) {
        current.add('right');
      }
      if (axisY <= -this.gamepadDeadzone || isPressed(0) || isPressed(12)) {
        current.add('jump');
      }
      if (axisY >= this.gamepadDeadzone || isPressed(1) || isPressed(13)) {
        current.add('slide');
      }
      if (isPressed(2) || isPressed(7)) {
        current.add('dash');
      }
      if (isPressed(3) || isPressed(5)) {
        current.add('swap');
      }
      if (isPressed(9)) {
        current.add('pause');
      }
    }

    for (const action of current) {
      if (!this._prevGamepadState.has(action)) {
        this.emit(action, { source: 'gamepad' });
      }
    }

    this._prevGamepadState = current;
  }

  /**
   * Handles keydown events and fires bound action listeners.
   * @param {{code?: string, repeat?: boolean, preventDefault?: Function}} event
   */
  handleKeyDown(event) {
    if (this._disposed || !event?.code) {
      return;
    }

    const action = this._codeToAction.get(event.code);
    if (!action) {
      return;
    }

    if (
      typeof event.preventDefault === 'function' &&
      (event.code === 'Space' || event.code === 'Tab' || event.code.startsWith('Arrow'))
    ) {
      event.preventDefault();
    }

    if (this.ignoreRepeat && event.repeat) {
      return;
    }

    this._pressedCodes.add(event.code);
    this._pressedActions.add(action);
    this.emit(action, { source: 'keyboard', code: event.code, repeat: Boolean(event.repeat) });
  }

  /**
   * Handles keyup events and updates held state.
   * @param {{code?: string}} event
   */
  handleKeyUp(event) {
    if (this._disposed || !event?.code) {
      return;
    }
    this._pressedCodes.delete(event.code);

    const action = this._codeToAction.get(event.code);
    if (!action) {
      return;
    }

    const codesForAction = this.bindings[action] || [];
    const stillHeld = codesForAction.some((code) => this._pressedCodes.has(code));
    if (!stillHeld) {
      this._pressedActions.delete(action);
    }
  }

  /**
   * Records initial touch coordinates (and triggers duo swap on two-finger tap).
   * @param {{touches?: ArrayLike<{clientX: number, clientY: number}>, timeStamp?: number}} event
   */
  handleTouchStart(event) {
    if (this._disposed || !event?.touches || event.touches.length === 0) {
      return;
    }

    if (event.touches.length === 2) {
      this._swipeTriggered = true;
      this.emit('swap', { source: 'touch-two-finger' });
      return;
    }

    const touch = event.touches[0];
    this._touchStart = {
      x: touch.clientX,
      y: touch.clientY,
      timeMs: typeof event.timeStamp === 'number' ? event.timeStamp : Date.now(),
    };
    this._swipeTriggered = false;
  }

  /**
   * Detects directional swipe gestures across horizontal/vertical thresholds.
   * @param {{touches?: ArrayLike<{clientX: number, clientY: number}>}} event
   */
  handleTouchMove(event) {
    if (
      this._disposed ||
      !this._touchStart ||
      this._swipeTriggered ||
      !event?.touches ||
      event.touches.length === 0
    ) {
      return;
    }

    const touch = event.touches[0];
    const dx = touch.clientX - this._touchStart.x;
    const dy = touch.clientY - this._touchStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < this.swipeThreshold) {
      return;
    }

    this._swipeTriggered = true;
    if (absX >= absY) {
      this.emit(dx < 0 ? 'left' : 'right', { source: 'touch-swipe', dx, dy });
    } else {
      this.emit(dy < 0 ? 'jump' : 'slide', { source: 'touch-swipe', dx, dy });
    }
  }

  /**
   * Completes touch gesture and detects double-tap dash triggers.
   * @param {{changedTouches?: ArrayLike<{clientX: number, clientY: number}>, timeStamp?: number}} event
   */
  handleTouchEnd(event) {
    if (this._disposed) {
      return;
    }

    if (this._touchStart && !this._swipeTriggered) {
      const endTouch = event?.changedTouches?.[0];
      const dx = endTouch ? endTouch.clientX - this._touchStart.x : 0;
      const dy = endTouch ? endTouch.clientY - this._touchStart.y : 0;
      const moved = Math.hypot(dx, dy);

      if (moved < 18) {
        const nowMs = typeof event?.timeStamp === 'number' ? event.timeStamp : Date.now();
        if (this._lastTapTimeMs > 0 && nowMs - this._lastTapTimeMs <= this.doubleTapWindowMs) {
          this._lastTapTimeMs = 0;
          this.emit(this.doubleTapAction, { source: 'touch-double-tap' });
        } else {
          this._lastTapTimeMs = nowMs;
        }
      }
    }

    this._touchStart = null;
    this._swipeTriggered = false;
  }

  /**
   * Returns true while any key mapped to the given action is held down.
   * @param {string} action
   * @returns {boolean}
   */
  isActionPressed(action) {
    return this._pressedActions.has(action);
  }

  /**
   * Clears all held key states and buffered actions.
   */
  clearPressed() {
    this._pressedCodes.clear();
    this._pressedActions.clear();
    this._actionBuffer.clear();
  }

  /**
   * Detaches event listeners and clears subscribers.
   */
  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;

    if (this.target && typeof this.target.removeEventListener === 'function') {
      this.target.removeEventListener('keydown', this._onKeyDown);
      this.target.removeEventListener('keyup', this._onKeyUp);
      this.target.removeEventListener('blur', this._onBlur);
    }

    if (this.touchTarget && typeof this.touchTarget.removeEventListener === 'function') {
      this.touchTarget.removeEventListener('touchstart', this._onTouchStart);
      this.touchTarget.removeEventListener('touchmove', this._onTouchMove);
      this.touchTarget.removeEventListener('touchend', this._onTouchEnd);
      this.touchTarget.removeEventListener('touchcancel', this._onTouchEnd);
    }

    this.clearPressed();
    this._listeners.clear();
  }
}

export default InputManager;
