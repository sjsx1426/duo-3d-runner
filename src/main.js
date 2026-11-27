import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { CameraController } from './core/CameraController.js';
import { Lighting } from './core/Lighting.js';
import { GameLoop } from './core/GameLoop.js';

/**
 * Creates a starter runner floor and lane grid for the 3D scene preview.
 * @returns {THREE.Group}
 */
function createStarterStage() {
  const stage = new THREE.Group();
  stage.name = 'StarterStage';

  const groundGeometry = new THREE.PlaneGeometry(18, 120);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x11182c,
    roughness: 0.78,
    metalness: 0.18,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -35;
  ground.receiveShadow = true;

  const grid = new THREE.GridHelper(120, 40, 0x38bdf8, 0x1e293b);
  grid.position.y = 0.01;
  grid.position.z = -35;

  stage.add(ground, grid);
  return stage;
}

/**
 * Application entry point for Duo 3D Runner.
 */
export function initApp() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    return null;
  }

  const sceneManager = new SceneManager({ canvas });
  const cameraController = new CameraController();
  const lighting = new Lighting(sceneManager.getScene());

  sceneManager.setResizeCallback((width, height) => {
    cameraController.setAspect(width, height);
  });
  cameraController.setAspect(window.innerWidth, window.innerHeight);

  const stage = createStarterStage();
  sceneManager.add(stage);

  const focusAnchor = new THREE.Object3D();
  sceneManager.add(focusAnchor);
  cameraController.setTarget(focusAnchor, true);

  const loop = new GameLoop({
    onUpdate: (dt) => {
      cameraController.update(dt);
      lighting.updateFollow(focusAnchor.position);
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
    loop,
    dispose: () => {
      loop.dispose();
      lighting.dispose();
      sceneManager.dispose();
    },
  };
}

if (typeof document !== 'undefined') {
  initApp();
}
