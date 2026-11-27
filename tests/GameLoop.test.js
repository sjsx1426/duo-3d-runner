import { describe, expect, it } from 'vitest';
import { GameLoop } from '../src/core/GameLoop.js';

describe('GameLoop', () => {
  it('clamps large delta spikes and skips update callbacks while paused', () => {
    const deltas = [];
    let renders = 0;
    const loop = new GameLoop({
      maxDelta: 0.05,
      onUpdate: (dt) => deltas.push(dt),
      onRender: () => {
        renders += 1;
      },
    });

    loop.step(0);
    loop.step(200);
    expect(deltas).toEqual([0.05]);

    loop.pause();
    loop.step(216);
    expect(deltas.length).toBe(1);
    expect(renders).toBe(3);

    loop.resume();
    loop.step(500);
    loop.step(516);
    expect(deltas[1]).toBeCloseTo(0.016, 3);
  });

  it('tracks rolling FPS, frame time, and entity count telemetry', () => {
    let lastReport = null;
    const loop = new GameLoop({
      metricsInterval: 0.2,
      getEntityCount: () => 27,
      onMetrics: (metrics) => {
        lastReport = metrics;
      },
    });

    for (let t = 0; t <= 400; t += 16.67) {
      loop.step(t);
    }

    const snapshot = lastReport || loop.getMetrics();
    expect(snapshot.fps).toBeGreaterThanOrEqual(55);
    expect(snapshot.entityCount).toBe(27);
    expect(snapshot.frameCount).toBeGreaterThan(10);
    expect(snapshot.paused).toBe(false);
  });
});
