/**
 * Application entry point for Duo 3D Runner.
 * Bootstraps core engine, systems, entities, and UI modules as they are implemented.
 */
export function initApp() {
  const canvas = document.getElementById('game-canvas');
  return { canvas };
}

if (typeof document !== 'undefined') {
  initApp();
}
