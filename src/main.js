import * as THREE from 'three';
import { SceneManager, SCENE_PRESETS } from './core/SceneManager.js';
import { CameraController, CAMERA_MODES } from './core/CameraController.js';
import { Lighting } from './core/Lighting.js';
import { GameLoop } from './core/GameLoop.js';
import { CharacterLoader } from './entities/CharacterLoader.js';
import { Player } from './entities/Player.js';
import { InputManager } from './systems/InputManager.js';

const THEME_NAMES = Object.keys(SCENE_PRESETS);
const CAMERA_MODE_NAMES = Object.keys(CAMERA_MODES);

/**
 * Creates a starter 3-lane neon runner stage for the live 3D scene preview.
 * @returns {{ group: THREE.Group, grid: THREE.GridHelper }}
 */
function createStarterStage() {
  const group = new THREE.Group();
  group.name = 'StarterStage';

  const groundGeometry = new THREE.PlaneGeometry(14, 140);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.78,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -45;
  ground.receiveShadow = true;

  const grid = new THREE.GridHelper(140, 46, 0x38bdf8, 0x1e293b);
  grid.position.y = 0.015;
  grid.position.z = -45;

  const railGeo = new THREE.BoxGeometry(0.18, 0.14, 140);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.9,
  });

  for (const edgeX of [-5.2, 5.2]) {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(edgeX, 0.07, -45);
    group.add(rail);
  }

  group.add(ground, grid);
  return { group, grid };
}

/**
 * Application entry point for Duo 3D Runner.
 */
export function initApp() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    return null;
  }

  const sceneManager = new SceneManager({ canvas, preset: 'neonNight' });
  const cameraController = new CameraController({ mode: 'runner' });
  const lighting = new Lighting(sceneManager.getScene(), { theme: 'neonNight' });
  const characterLoader = new CharacterLoader();
  const inputManager = new InputManager();

  sceneManager.setResizeCallback((width, height) => {
    cameraController.setAspect(width, height);
  });
  cameraController.setAspect(window.innerWidth, window.innerHeight);

  const stage = createStarterStage();
  sceneManager.add(stage.group);

  const player = new Player({
    onLand: (impactVelocity) => {
      if (impactVelocity > 6) {
        cameraController.addShake(0.2);
      }
    },
    onSwap: () => {
      cameraController.addShake(0.12);
    },
  });

  sceneManager.add(player.getObject3D());
  cameraController.setTarget(player.getObject3D(), true);

  let themeIndex = 0;
  let modeIndex = 0;
  let gridOffset = 0;

  characterLoader.preloadAll(['char1', 'char2']).then(([char1Entry, char2Entry]) => {
    if (sceneManager._disposed) {
      return;
    }
    player.setDuoModels(
      {
        char1: char1Entry.model,
        char2: char2Entry.model,
      },
      'char1',
      {
        char1: char1Entry.animations,
        char2: char2Entry.animations,
      },
    );
  });

  inputManager.on('left', () => player.moveLeft());
  inputManager.on('right', () => player.moveRight());
  inputManager.on('jump', () => {
    if (player.jump()) {
      inputManager.consumeBufferedAction('jump');
    }
  });
  inputManager.on('slide', () => player.slide());
  inputManager.on('dash', () => player.dash());
  inputManager.on('swap', () => player.swapCharacter());
  inputManager.on('pause', () => loop.togglePause());

  const handlePreviewKeys = (event) => {
    if (event.repeat) {
      return;
    }
    if (event.code === 'KeyT') {
      themeIndex = (themeIndex + 1) % THEME_NAMES.length;
      const nextTheme = THEME_NAMES[themeIndex];
      sceneManager.setAtmospherePreset(nextTheme, 0.8);
      lighting.setTheme(nextTheme);
    } else if (event.code === 'KeyC') {
      modeIndex = (modeIndex + 1) % CAMERA_MODE_NAMES.length;
      cameraController.setMode(CAMERA_MODE_NAMES[modeIndex]);
    } else if (event.code === 'KeyB') {
      if (player.hasShield) {
        player.clearShield();
      } else {
        player.grantShield(8);
      }
    }
  };

  window.addEventListener('keydown', handlePreviewKeys);

  const loop = new GameLoop({
    onUpdate: (dt) => {
      inputManager.update(dt);

      if (player.isGrounded && inputManager.consumeBufferedAction('jump')) {
        player.jump();
      }

      player.update(dt);

      const activeSpeed = player.getEffectiveForwardSpeed();
      const gridStep = 140 / 46;
      gridOffset = (gridOffset + activeSpeed * dt) % gridStep;
      stage.grid.position.z = -45 + gridOffset;

      const fovBoost = player.isDashing ? 10 : player.isGrounded ? 0 : 4;
      cameraController.setFovBoost(fovBoost);

      sceneManager.updateAtmosphere(dt);
      cameraController.update(dt);
      lighting.updateFollow(player.position);
    },
    onRender: () => {
      sceneManager.render(cameraController.getCamera());
    },
  });

  loop.start();

  return {
    canvas,
    sceneManager,
    cameraController,
    lighting,
    characterLoader,
    inputManager,
    player,
    loop,
    dispose: () => {
      window.removeEventListener('keydown', handlePreviewKeys);
      inputManager.dispose();
      loop.dispose();
      lighting.dispose();
      sceneManager.dispose();
    },
  };
}

if (typeof document !== 'undefined') {
  initApp();
}
