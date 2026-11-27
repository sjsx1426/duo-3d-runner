import { describe, expect, it } from 'vitest';
import { CameraController, CAMERA_MODES } from '../src/core/CameraController.js';

describe('CameraController', () => {
  it('switches camera modes and snaps immediately when requested', () => {
    const controller = new CameraController({ mode: 'runner' });
    expect(controller.getMode()).toBe('runner');

    controller.setMode('arena', true);
    expect(controller.getMode()).toBe('arena');
    expect(controller.getCamera().fov).toBe(CAMERA_MODES.arena.fov);
    expect(controller.offset.y).toBe(CAMERA_MODES.arena.offset.y);
  });

  it('applies FOV boost and trauma shake smoothly without drifting base position', () => {
    const controller = new CameraController({ mode: 'runner' });
    controller.setTarget({ position: { x: 0, y: 0, z: 0 } }, true);

    controller.setFovBoost(12);
    controller.addShake(0.8);
    for (let i = 0; i < 30; i += 1) {
      controller.update(0.05);
    }

    expect(controller.getCamera().fov).toBeGreaterThan(CAMERA_MODES.runner.fov + 10);
    expect(controller.getCamera().position.x).toBeCloseTo(0, 1);
  });

  it('clamps arena follow radius, frames midpoint, and rotates orbit offset', () => {
    const controller = new CameraController({ mode: 'arena' });
    controller.setArenaFollowBounds({ maxRadius: 5, orbitAngle: Math.PI / 2 });
    controller.setTarget({ position: { x: 20, y: 0, z: 0 } }, false);
    controller.setSecondaryTarget({ position: { x: 20, y: 0, z: 0 } });

    for (let i = 0; i < 60; i += 1) {
      controller.update(0.05);
    }

    const pos = controller.getCamera().position;
    expect(pos.x).toBeLessThan(0);
    expect(pos.z).toBeCloseTo(0, 0);
  });
});
