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
   * @param {Record<string, string[]>} [options.bindings]
   */
  constructor(options = {}) {
    const {
      target = typeof window !== 'undefined' ? window : null,
      bindings = DEFAULT_BINDINGS,
    } = options;

    this.target = target;
    this.bindings = {};
    this._codeToAction = new Map();
    this._pressedCodes = new Set();
    this._pressedActions = new Set();
    this._listeners = new Map();
    this._disposed = false;

    this.setBindings(bindings);

    this._onKeyDown = (event) => this.handleKeyDown(event);
    this._onKeyUp = (event) => this.handleKeyUp(event);
    this._onBlur = () => this.clearPressed();

    if (this.target && typeof this.target.addEventListener === 'function') {
      this.target.addEventListener('keydown', this._onKeyDown);
      this.target.addEventListener('keyup', this._onKeyUp);
      this.target.addEventListener('blur', this._onBlur);
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
   * Emits an action to registered subscribers.
   * @param {string} action
   * @param {object} [meta]
   */
  emit(action, meta = {}) {
    const handlers = this._listeners.get(action);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(action, meta);
    }
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
   * Returns true while any key mapped to the given action is held down.
   * @param {string} action
   * @returns {boolean}
   */
  isActionPressed(action) {
    return this._pressedActions.has(action);
  }

  /**
   * Clears all held key states (e.g. on window blur).
   */
  clearPressed() {
    this._pressedCodes.clear();
    this._pressedActions.clear();
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

    this.clearPressed();
    this._listeners.clear();
  }
}

export default InputManager;
