import * as THREE from 'three';
import { SceneManager, SCENE_PRESETS } from './core/SceneManager.js';
import { CameraController, CAMERA_MODES } from './core/CameraController.js';
import { Lighting } from './core/Lighting.js';
import { GameLoop } from './core/GameLoop.js';
import { CharacterLoader } from './entities/CharacterLoader.js';

const LANE_POSITIONS = [-3, 0, 3];
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
 * Animates procedural character limbs to preview running and jumping motion.
 * @param {THREE.Object3D|null} model
 * @param {number} elapsed
 * @param {boolean} isGrounded
 */
function animateCharacterPreview(model, elapsed, isGrounded) {
  const joints = model?.userData?.joints;
  if (!joints) {
    return;
  }

  const stride = isGrounded ? Math.sin(elapsed * 12) : 0.45;
  joints.leftLeg.rotation.x = stride * 0.75;
  joints.rightLeg.rotation.x = -stride * 0.75;
  joints.leftArm.rotation.x = -stride * 0.65;
  joints.rightArm.rotation.x = stride * 0.65;
  joints.torso.position.y = 1.05 + Math.abs(Math.cos(elapsed * 12)) * (isGrounded ? 0.06 : 0.02);
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

  sceneManager.setResizeCallback((width, height) => {
    cameraController.setAspect(width, height);
  });
  cameraController.setAspect(window.innerWidth, window.innerHeight);

  const stage = createStarterStage();
  sceneManager.add(stage.group);

  const playerRig = new THREE.Group();
  playerRig.name = 'PreviewPlayerRig';
  sceneManager.add(playerRig);
  cameraController.setTarget(playerRig, true);

  let activeModel = null;
  let laneIndex = 1;
  let verticalVelocity = 0;
  let isGrounded = true;
  let themeIndex = 0;
  let modeIndex = 0;
  const runSpeed = 14;

  characterLoader.load('char1').then((loaded) => {
    if (sceneManager._disposed) {
      return;
    }
    activeModel = loaded.model;
    playerRig.add(activeModel);
  });

  const handleKeyDown = (event) => {
    const code = event.code;
    if (code === 'ArrowLeft' || code === 'KeyA') {
      laneIndex = Math.max(0, laneIndex - 1);
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      laneIndex = Math.min(LANE_POSITIONS.length - 1, laneIndex + 1);
    } else if ((code === 'Space' || code === 'ArrowUp' || code === 'KeyW') && isGrounded) {
      verticalVelocity = 9.5;
      isGrounded = false;
      cameraController.setFovBoost(5);
    } else if (code === 'KeyT') {
      themeIndex = (themeIndex + 1) % THEME_NAMES.length;
      const nextTheme = THEME_NAMES[themeIndex];
      sceneManager.setAtmospherePreset(nextTheme, 0.8);
      lighting.setTheme(nextTheme);
    } else if (code === 'KeyC') {
      modeIndex = (modeIndex + 1) % CAMERA_MODE_NAMES.length;
      cameraController.setMode(CAMERA_MODE_NAMES[modeIndex]);
    } else if (code === 'KeyP' || code === 'Escape') {
      loop.togglePause();
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  const loop = new GameLoop({
    onUpdate: (dt, elapsed) => {
      const targetX = LANE_POSITIONS[laneIndex];
      playerRig.position.x += (targetX - playerRig.position.x) * Math.min(1, dt * 14);

      if (!isGrounded) {
        verticalVelocity -= 24 * dt;
        playerRig.position.y += verticalVelocity * dt;
        if (playerRig.position.y <= 0) {
          playerRig.position.y = 0;
          verticalVelocity = 0;
          isGrounded = true;
          cameraController.setFovBoost(0);
          cameraController.addShake(0.18);
        }
      }

      const gridStep = 140 / 46;
      stage.grid.position.z = -45 + ((elapsed * runSpeed) % gridStep);

      animateCharacterPreview(activeModel, elapsed, isGrounded);
      sceneManager.updateAtmosphere(dt);
      cameraController.update(dt);
      lighting.updateFollow(playerRig.position);
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
    loop,
    dispose: () => {
      window.removeEventListener('keydown', handleKeyDown);
      loop.dispose();
      lighting.dispose();
      sceneManager.dispose();
    },
  };
}

if (typeof document !== 'undefined') {
  initApp();
}
