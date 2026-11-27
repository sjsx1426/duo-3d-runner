/**
 * Fixed-clamp requestAnimationFrame loop with pause/resume and update/render callbacks.
 */
export class GameLoop {
  /**
   * @param {object} [options]
   * @param {(dt: number, elapsed: number) => void} [options.onUpdate]
   * @param {(dt: number, elapsed: number) => void} [options.onRender]
   * @param {(metrics: object) => void} [options.onMetrics]
   * @param {() => number} [options.getEntityCount]
   * @param {number} [options.maxDelta=0.05] Maximum clamped frame delta in seconds
   * @param {number} [options.metricsInterval=0.5] Telemetry sample window in seconds
   */
  constructor(options = {}) {
    const {
      onUpdate = null,
      onRender = null,
      onMetrics = null,
      getEntityCount = null,
      maxDelta = 0.05,
      metricsInterval = 0.5,
    } = options;

    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this.onMetrics = onMetrics;
    this.getEntityCount = getEntityCount;
    this.maxDelta = maxDelta;
    this.metricsInterval = metricsInterval;

    this._running = false;
    this._paused = false;
    this._rafId = null;
    this._lastTimeMs = null;
    this._elapsed = 0;
    this._frameCount = 0;
    this._fps = 0;
    this._frameTimeMs = 0;
    this._sampleFrames = 0;
    this._sampleTime = 0;

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

    this._frameCount += 1;
    this._frameTimeMs = Math.max(0, rawDt * 1000);
    this._sampleFrames += 1;
    this._sampleTime += Math.max(0, rawDt);

    if (this._sampleTime >= this.metricsInterval && this._sampleTime > 0) {
      this._fps = Math.round(this._sampleFrames / this._sampleTime);
      this._sampleFrames = 0;
      this._sampleTime = 0;
      if (typeof this.onMetrics === 'function') {
        this.onMetrics(this.getMetrics());
      }
    }

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
   * Returns current frame-rate, frame-time, and entity count telemetry.
   * @returns {{fps: number, frameTimeMs: number, elapsed: number, frameCount: number, entityCount: number, paused: boolean}}
   */
  getMetrics() {
    const entityCount =
      typeof this.getEntityCount === 'function' ? this.getEntityCount() : 0;
    return {
      fps: this._fps,
      frameTimeMs: Number(this._frameTimeMs.toFixed(2)),
      elapsed: Number(this._elapsed.toFixed(2)),
      frameCount: this._frameCount,
      entityCount,
      paused: this._paused,
    };
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
    this.onMetrics = null;
    this.getEntityCount = null;
  }
}

export default GameLoop;
