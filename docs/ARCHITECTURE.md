# Duo 3D Runner — Architecture Guide

This document describes the core 3D engine, character asset pipeline, player controller, and input architecture implemented across Track A (`src/core/`, `src/entities/CharacterLoader.js`, `src/entities/Player.js`, `src/systems/InputManager.js`, and `src/main.js`).

---

## 1. Core 3D Engine (`src/core/`)

### `SceneManager` (`src/core/SceneManager.js`)
- Owns the `THREE.Scene`, `THREE.WebGLRenderer`, procedural vertical-gradient `SkyDome`, and distance `THREE.Fog`.
- **Atmosphere Presets (`SCENE_PRESETS`):** `neonNight`, `sunsetCanyon`, and `cyberArena` with smooth interpolation via `setAtmospherePreset(name, duration)` and `updateAtmosphere(dt)`.
- **Quality Tiers (`QUALITY_TIERS`):** `low`, `medium`, and `high` controlling `maxPixelRatio`, shadow map enablement/filtering, and `ACESFilmicToneMapping` exposure.
- **Resource Cleanup:** `dispose()` detaches `resize` listeners, runs `disposeObject3DResources(this.scene)` to free geometries/materials/textures, clears `renderLists`, and disposes the WebGL context.

### `CameraController` (`src/core/CameraController.js`)
- Wraps `THREE.PerspectiveCamera` with exponential-damped chase following (`setTarget`, `snapTo`, `update`).
- **Camera Modes (`CAMERA_MODES`):** `runner` (behind-the-back chase), `arena` (elevated tactical view), and `showcase` (close character preview).
- **Juice & Framing:** Trauma-based screen shake (`addShake`), dynamic speed FOV boost (`setFovBoost`), midpoint framing (`setSecondaryTarget`), and circular arena follow clamping + yaw rotation (`setArenaFollowBounds`, `rotateOrbit`).

### `Lighting` (`src/core/Lighting.js`)
- Creates a `LightingRig` group containing `HemisphereLight`, a shadow-casting directional key light, and a cool rim light.
- **Themes (`LIGHTING_THEMES`):** `neonNight`, `sunsetCanyon`, and `cyberArena` synchronized with `SceneManager` presets via `setTheme(name)`.
- `updateFollow(position)` moves key/rim lights and shadow frustum alongside the player.

### `GameLoop` (`src/core/GameLoop.js`)
- Manages `requestAnimationFrame` with delta clamping (`maxDelta = 0.05s`), pause/resume (`pause`, `resume`, `togglePause`), and deterministic headless stepping (`step(nowMs)`).
- Tracks rolling telemetry (`fps`, `frameTimeMs`, `elapsed`, `frameCount`, `entityCount`) via `getMetrics()` and optional `onMetrics` callback.

---

## 2. Character Pipeline (`src/entities/CharacterLoader.js`)

### Drop-in `.glb` Replacement Workflow
1. Place custom character models at:
   - `public/assets/models/char1.glb`
   - `public/assets/models/char2.glb`
2. `CharacterLoader` checks for each `.glb` file via `HEAD` (ignoring SPA `text/html` fallback responses).
3. When found, `GLTFLoader` loads the asset and `normalizeCharacterModel(scene, 1.85)` automatically:
   - Uniformly scales the model bounding box to `1.85m` tall
   - Centers X/Z and aligns the lowest vertex (`min.y`) to `y = 0`
   - Enables `castShadow` and `receiveShadow` on every mesh
4. **Procedural Fallbacks:** Whenever `.glb` files are absent, `CharacterLoader` builds stylized articulated 3D avatars (`createProceduralChar1()` and `createProceduralChar2()`) exposing `userData.joints` (`torso`, `head`, `leftArm`, `rightArm`, `leftLeg`, `rightLeg`).
5. **Caching & Cloning:** Loaded templates are cached in memory and cloned safely with Three.js `SkeletonUtils.clone` (`cloneCharacter`) so `SkinnedMesh` rigs and procedural hierarchies remain independent per instance.

### Recommended `.glb` Animation Clip Names
`Player` looks up `THREE.AnimationClip` names in the following order when `.glb` animations exist:
- `run` (default locomotion)
- `jump`
- `slide`
- `dash`
- `hit`

---

## 3. Player Controller (`src/entities/Player.js`)

- **Movement Modes:**
  - `'runner'`: 3-lane (`[-3, 0, 3]`) smooth lateral interpolation with banking tilt.
  - `'arena'`: 360-degree free-roam (`setMoveInput(x, z)`) clamped inside circular `arenaRadius` with smooth movement-facing yaw rotation.
- **Actions:** `jump()` (coyote time + double jump), `slide()` (timed crouch with reduced collider height + airborne fast-fall-to-slide), `dash()` (speed burst + cooldown), and `swapCharacter()` (active lead + trailing duo companion).
- **Character Profiles (`CHARACTER_PROFILES`):**
  - `char1` (**Volt Runner**): higher jump (`12.2`), faster lane switching (`16`), wider magnet radius (`3.2`).
  - `char2` (**Blaze Dasher**): faster dash cooldown (`1.1s`), stronger dash multiplier (`2.15x`), higher base speed (`15.2`).
- **Defense & FX:** Energy shield bubble (`grantShield`, `takeDamage`), invulnerability flicker frames, and pooled 3D speed trail particles (`_trailPool`).

---

## 4. Input System (`src/systems/InputManager.js`)

- **Keyboard:** `WASD` / `Arrows` / `Space` / `Shift` / `Q` / `Tab` / `P` / `Escape` with key-repeat guard.
- **Action Buffering:** Timed input buffer (`0.14s`) for pre-landing jumps and responsive action queuing.
- **Mobile Touch:** Directional swipe detection (`left`, `right`, `jump`, `slide`), double-tap `dash`, and two-finger tap `swap`.
- **Gamepad & Rebinding:** Edge-triggered Gamepad API polling with deadzone (`0.45`) and `localStorage` keybinding persistence (`rebindAction`, `resetBindings`).

---

## 5. Engine Bootstrap & Preview Controls (`src/main.js`)

`createEngine()` and `bindPlayerControls()` assemble the core loop and player controls. Current preview bindings:
- **Move / Lanes:** `A`/`D` or `Left`/`Right` (plus `W`/`S` in Arena mode)
- **Jump / Double-Jump:** `Space` / `W` / `Up`
- **Slide / Fast-Fall:** `S` / `Down`
- **Dash:** `Shift`
- **Duo Character Swap:** `Q` or `Tab`
- **Toggle Runner / Arena Mode:** `M`
- **Cycle Camera Mode:** `C`
- **Cycle Biome Theme:** `T`
- **Cycle Quality Tier:** `G`
- **Toggle Shield Preview:** `B`
- **Pause:** `P` or `Escape`

---

## 6. Verification & Automated Unit Tests (`tests/`)

Run the full quality gate locally before opening or merging PRs:

```bash
npm run lint
npm run test:run
npm run build
```

Current Track A Vitest suites (`tests/`):
- `tests/SceneManager.test.js` — quality tiers, atmosphere presets, and recursive WebGL resource disposal
- `tests/CameraController.test.js` — camera modes, trauma shake, FOV boost, and arena follow clamping
- `tests/GameLoop.test.js` — delta clamping, pause/resume, and rolling FPS/entity telemetry
- `tests/Player.test.js` — 3-lane runner physics, jump/double-jump, slide hitbox, dash cooldown, duo swap, shield i-frames, and 360° arena movement
- `tests/InputManager.test.js` — keyboard rebinding, persistence, repeat guard, action buffering, touch swipes, and gamepad polling
- `tests/EngineBootstrap.test.js` — `createEngine` bootstrap, headless DOM guard, `CharacterLoader` caching, and GLB normalization
- `tests/PlayerControls.test.js` — `bindPlayerControls` wiring across Runner and Arena modes

