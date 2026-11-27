import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bindPlayerControls } from '../src/main.js';
import { InputManager } from '../src/systems/InputManager.js';
import { Player } from '../src/entities/Player.js';
import { GameLoop } from '../src/core/GameLoop.js';
import { CameraController } from '../src/core/CameraController.js';

describe('bindPlayerControls', () => {
  it('wires runner lane, jump, dash, swap, and pause actions through InputManager', () => {
    const inputManager = new InputManager({ target: null });
    const player = new Player();
    player.setDuoModels({ char1: new THREE.Group(), char2: new THREE.Group() }, 'char1');
    const loop = new GameLoop();
    const cameraController = new CameraController();

    const controls = bindPlayerControls({
      inputManager,
      player,
      loop,
      cameraController,
    });

    inputManager.handleKeyDown({ code: 'KeyA' });
    expect(player.getLaneIndex()).toBe(0);

    inputManager.handleKeyDown({ code: 'Space' });
    expect(player.isGrounded).toBe(false);

    inputManager.handleKeyDown({ code: 'ShiftLeft' });
    expect(player.isDashing).toBe(true);

    controls.update(0.05);
    expect(cameraController._fovBoost).toBe(10);

    inputManager.handleKeyDown({ code: 'KeyQ' });
    expect(player.getActiveCharacterId()).toBe('char2');

    inputManager.handleKeyDown({ code: 'KeyP' });
    expect(loop.isPaused()).toBe(true);

    controls.unbind();
    inputManager.handleKeyDown({ code: 'KeyD' });
    expect(player.getLaneIndex()).toBe(0);
  });

  it('forwards continuous directional input in arena movement mode', () => {
    const inputManager = new InputManager({ target: null });
    const player = new Player({ movementMode: 'arena', arenaRadius: 12 });
    const loop = new GameLoop();
    const cameraController = new CameraController({ mode: 'arena' });

    const controls = bindPlayerControls({
      inputManager,
      player,
      loop,
      cameraController,
    });

    inputManager.handleKeyDown({ code: 'KeyD' });
    inputManager.handleKeyDown({ code: 'KeyW' });
    controls.update(0.1);

    expect(player.position.x).toBeGreaterThan(0);
    expect(player.position.z).toBeLessThan(0);

    controls.unbind();
  });
});
