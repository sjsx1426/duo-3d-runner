/**
 * Fixed-clamp requestAnimationFrame loop with pause/resume and update/render callbacks.
 */
export class GameLoop {
  /**
   * @param {object} [options]
   * @param {(dt: number, elapsed: number) => void} [options.onUpdate]
   * @param {(dt: number, elapsed: number) => void} [options.onRender]
   * @param {number} [options.maxDelta=0.05] Maximum clamped frame delta in seconds
   */
  constructor(options = {}) {
    const { onUpdate = null, onRender = null, maxDelta = 0.05 } = options;

    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this.maxDelta = maxDelta;

    this._running = false;
    this._paused = false;
    this._rafId = null;
    this._lastTimeMs = null;
    this._elapsed = 0;

    this._tick = (nowMs) => {
      if (!this._running) {
        return;
      }
      this.step(nowMs);
      if (this._running && typeof requestAnimationFrame === 'function') {
        this._rafId = requestAnimationFrame(this._tick);
      }
    };
  }

  /**
   * Starts the animation loop.
   */
  start() {
    if (this._running) {
      return;
    }
    this._running = true;
    this._paused = false;
    this._lastTimeMs = null;

    if (typeof requestAnimationFrame === 'function') {
      this._rafId = requestAnimationFrame(this._tick);
    }
  }

  /**
   * Stops the animation loop and cancels any pending animation frame.
   */
  stop() {
    this._running = false;
    this._lastTimeMs = null;
    if (this._rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._rafId);
    }
    this._rafId = null;
  }

  /**
   * Pauses simulation updates while continuing to render the scene.
   */
  pause() {
    this._paused = true;
  }

  /**
   * Resumes simulation updates cleanly without a large delta spike.
   */
  resume() {
    this._paused = false;
    this._lastTimeMs = null;
  }

  /**
   * Toggles paused state.
   * @returns {boolean} Current paused state
   */
  togglePause() {
    if (this._paused) {
      this.resume();
    } else {
      this.pause();
    }
    return this._paused;
  }

  /**
   * Advances one frame given a timestamp in milliseconds.
   * Exposed for deterministic testing and headless stepping.
   * @param {number} nowMs
   * @returns {number} Clamped delta time in seconds
   */
  step(nowMs) {
    if (this._lastTimeMs === null) {
      this._lastTimeMs = nowMs;
      if (typeof this.onRender === 'function') {
        this.onRender(0, this._elapsed);
      }
      return 0;
    }

    const rawDt = (nowMs - this._lastTimeMs) / 1000;
    this._lastTimeMs = nowMs;
    const dt = Math.min(this.maxDelta, Math.max(0, rawDt));

    if (!this._paused) {
      this._elapsed += dt;
      if (typeof this.onUpdate === 'function') {
        this.onUpdate(dt, this._elapsed);
      }
    }

    if (typeof this.onRender === 'function') {
      this.onRender(this._paused ? 0 : dt, this._elapsed);
    }

    return dt;
  }

  /**
   * @returns {boolean}
   */
  isRunning() {
    return this._running;
  }

  /**
   * @returns {boolean}
   */
  isPaused() {
    return this._paused;
  }

  /**
   * @returns {number} Total unpaused elapsed time in seconds
   */
  getElapsed() {
    return this._elapsed;
  }

  /**
   * Stops the loop and clears callbacks.
   */
  dispose() {
    this.stop();
    this.onUpdate = null;
    this.onRender = null;
  }
}

export default GameLoop;
