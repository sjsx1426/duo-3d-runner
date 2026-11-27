# Duo 3D Runner — 105-PR Team Roadmap

This roadmap breaks the **Duo 3D Runner / Arena** project into **105 atomic, conflict-minimized Pull Requests** (35 PRs per team member) targeting the `dev` branch.

## Team Workflow Rules

1. Always branch from an up-to-date `dev`:
   ```bash
   git checkout dev && git pull origin dev
   git checkout -b <branch-name>
   ```
2. Keep every PR scoped to **one atomic task**.
3. Verify `npm run build` and `npm run lint` (and `npm run test:run` where tests exist) pass with zero errors before pushing.
4. Commit using Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
5. Push and open a PR targeting `dev`:
   ```bash
   git push -u origin <branch-name>
   gh pr create --base dev --title "<type>: <title>" --body "<summary>"
   ```

---

## Track A (Member 1 — 35 PRs): Core 3D Engine, Characters & Controls

Focus directories: `src/core/`, `src/entities/CharacterLoader.js`, `src/entities/Player.js`, `src/systems/InputManager.js`, `src/main.js`

| ID | Branch | PR Title | Primary File(s) | Scope |
| --- | --- | --- | --- | --- |
| A-01 | `feat/scene-manager` | `feat: add SceneManager with Three.js scene and renderer` | `src/core/SceneManager.js` | Initialize `THREE.Scene`, `THREE.WebGLRenderer`, pixel ratio clamping, fog, resize listener, and `dispose()` |
| A-02 | `feat/camera-controller` | `feat: add CameraController with chase smoothing` | `src/core/CameraController.js` | Initialize `THREE.PerspectiveCamera`, damped chase follow offset, lookAt target, and aspect resize |
| A-03 | `feat/lighting-system` | `feat: add Lighting rig with sun shadows and hemisphere fill` | `src/core/Lighting.js` | Add `HemisphereLight`, shadow-casting `DirectionalLight`, rim light, and preset intensity helpers |
| A-04 | `feat/game-loop` | `feat: add GameLoop with clamped delta timing` | `src/core/GameLoop.js` | `requestAnimationFrame` loop with delta clamping, pause/resume, and update/render callbacks |
| A-05 | `feat/scene-skybox-fog` | `feat: add dynamic sky gradient and distance fog presets` | `src/core/SceneManager.js` | Support arena/runner sky background colors and fog density transitions |
| A-06 | `feat/camera-shake` | `feat: add impact camera shake and FOV boost` | `src/core/CameraController.js` | Add trauma-based camera shake on collision and dynamic FOV scaling on sprint/boost |
| A-07 | `feat/camera-modes` | `feat: add runner and arena camera presets` | `src/core/CameraController.js` | Switch smoothly between behind-the-back runner view and elevated arena view |
| A-08 | `feat/lighting-day-night` | `feat: add biome lighting themes to Lighting` | `src/core/Lighting.js` | Add Neon Night, Sunset Canyon, and Cyber Arena lighting theme switcher |
| A-09 | `feat/character-loader-base` | `feat: add CharacterLoader with GLTFLoader wrapper` | `src/entities/CharacterLoader.js` | Load `/assets/models/char1.glb` and `/assets/models/char2.glb` via Three.js `GLTFLoader` |
| A-10 | `feat/procedural-char1` | `feat: add procedural fallback avatar for Character 1` | `src/entities/CharacterLoader.js` | Build stylized cyber-runner procedural 3D mesh for Character 1 when `char1.glb` is absent |
| A-11 | `feat/procedural-char2` | `feat: add procedural fallback avatar for Character 2` | `src/entities/CharacterLoader.js` | Build distinct heavy-dasher procedural 3D mesh for Character 2 when `char2.glb` is absent |
| A-12 | `feat/character-cache` | `feat: add model caching and clone helper in CharacterLoader` | `src/entities/CharacterLoader.js` | Cache loaded GLB scenes/animations and return safe cloned instances per spawn |
| A-13 | `feat/character-normalization` | `feat: normalize loaded GLB scale, pivot, and shadows` | `src/entities/CharacterLoader.js` | Auto-fit loaded `.glb` bounding box to standard player height and enable shadow casting |
| A-14 | `feat/player-entity` | `feat: add Player entity with lane movement state` | `src/entities/Player.js` | Core `Player` class managing 3-lane X targets, velocity, bounds, and mesh attachment |
| A-15 | `feat/player-jump-gravity` | `feat: add jump physics and double-jump to Player` | `src/entities/Player.js` | Vertical jump impulse, gravity integration, coyote time, and optional double-jump |
| A-16 | `feat/player-slide-crouch` | `feat: add slide action and reduced hitbox state to Player` | `src/entities/Player.js` | Timed slide state with lowered collider height and recovery easing |
| A-17 | `feat/player-dash` | `feat: add directional dash burst with cooldown to Player` | `src/entities/Player.js` | Short invulnerability/speed dash mechanic with cooldown timer |
| A-18 | `feat/player-duo-swap` | `feat: add duo character swap and partner companion offset` | `src/entities/Player.js` | Support active-lead + trailing duo partner or instant tag-swap between Char 1 & Char 2 |
| A-19 | `feat/player-animations` | `feat: add procedural run, jump, slide, and hit animations` | `src/entities/Player.js` | Animate limbs/tilt procedurally and trigger GLTF `AnimationMixer` clips when available |
| A-20 | `feat/player-stats-profiles` | `feat: add distinct stat profiles for Character 1 and Character 2` | `src/entities/Player.js` | Differentiate speed, jump height, dash cooldown, and magnet radius per character |
| A-21 | `feat/player-invulnerability` | `feat: add shield, hit flash, and invulnerability frames` | `src/entities/Player.js` | Flicker material feedback and shield bubble toggle on damage or powerup |
| A-22 | `feat/player-trail-fx` | `feat: add speed trail mesh/particles behind Player` | `src/entities/Player.js` | Emit lightweight 3D trail ribbons/boxes during sprint, dash, and duo boost |
| A-23 | `feat/input-manager-keyboard` | `feat: add InputManager with WASD and Arrow key bindings` | `src/systems/InputManager.js` | Clean keydown/keyup listener mapping left, right, jump, slide, dash, swap, and pause |
| A-24 | `feat/input-buffer` | `feat: add input action buffering and key-repeat guard` | `src/systems/InputManager.js` | Queue jump/lane inputs slightly before landing for responsive controls |
| A-25 | `feat/input-touch-swipe` | `feat: add mobile touch swipe gestures to InputManager` | `src/systems/InputManager.js` | Detect horizontal/vertical touch swipes and double-tap dash/swap |
| A-26 | `feat/input-gamepad` | `feat: add optional Gamepad API polling to InputManager` | `src/systems/InputManager.js` | Support standard gamepad stick/d-pad and face buttons with deadzone handling |
| A-27 | `feat/input-rebind` | `feat: add custom keybinding serialization in InputManager` | `src/systems/InputManager.js` | Allow remapping controls and persisting bindings in `localStorage` |
| A-28 | `feat/duo-arena-movement` | `feat: add free-roam arena movement mode to Player` | `src/entities/Player.js` | Toggle between 3-lane endless runner movement and 360-degree arena movement |
| A-29 | `feat/camera-arena-orbit` | `feat: add smooth arena follow bounds to CameraController` | `src/core/CameraController.js` | Keep both duo characters or arena bounds framed cleanly during arena mode |
| A-30 | `feat/renderer-post-polish` | `feat: add tone mapping and shadow quality tiers to SceneManager` | `src/core/SceneManager.js` | Configure ACESFilmic tone mapping and Low/Medium/High quality toggles |
| A-31 | `feat/engine-bootstrap` | `feat: wire SceneManager, Lighting, Camera, and GameLoop in main.js` | `src/main.js` | Assemble core engine pipeline in `src/main.js` |
| A-32 | `feat/player-input-wiring` | `feat: connect InputManager and Player controller in main.js` | `src/main.js` | Bind player actions, character selection, and duo swap into main game loop |
| A-33 | `feat/debug-stats-hook` | `feat: add FPS and entity count telemetry hook to GameLoop` | `src/core/GameLoop.js` | Expose lightweight frame-time and FPS metrics for HUD/debug overlay |
| A-34 | `fix/resize-cleanup` | `fix: ensure complete WebGL resource and event listener cleanup` | `src/core/SceneManager.js` | Dispose geometries/materials and detach window listeners on teardown |
| A-35 | `docs/core-engine-guide` | `docs/core-engine-guide` (`docs: document core 3D engine and character pipeline`) | `docs/ARCHITECTURE.md` | Document `src/core/`, `CharacterLoader`, `Player`, and `.glb` replacement instructions |

---

## Track B (Member 2 — 35 PRs): World, Obstacles, Physics & Audio

Focus directories: `src/entities/Obstacle.js`, `src/entities/Collectible.js`, `src/systems/PhysicsSystem.js`, `src/systems/SpawnManager.js`, `src/systems/AudioManager.js`

| ID | Branch | PR Title | Primary File(s) | Scope |
| --- | --- | --- | --- | --- |
| B-01 | `feat/obstacle-base` | `feat: add Obstacle entity with type and bounds` | `src/entities/Obstacle.js` | Base `Obstacle` class supporting static barrier, low hurdle, overhead beam, and active flag |
| B-02 | `feat/obstacle-variants` | `feat: add procedural meshes for barrier, laser, and moving drone` | `src/entities/Obstacle.js` | Distinct 3D meshes/colors/emissive accents per obstacle variant |
| B-03 | `feat/obstacle-moving` | `feat: add lateral patrol and rotating hazard behavior` | `src/entities/Obstacle.js` | Update loop for side-to-side sweeping drones and spinning arena hazards |
| B-04 | `feat/obstacle-pooling` | `feat: add reset and object pooling support to Obstacle` | `src/entities/Obstacle.js` | Reusable `reset()` lifecycle to avoid GC spikes during endless runs |
| B-05 | `feat/collectible-base` | `feat: add Collectible entity for coins and energy orbs` | `src/entities/Collectible.js` | Base `Collectible` with bobbing/spinning animation and point value |
| B-06 | `feat/collectible-powerups` | `feat: add magnet, shield, 2x multiplier, and duo-boost pickups` | `src/entities/Collectible.js` | Distinct visual rings/colors and duration payloads for powerups |
| B-07 | `feat/collectible-magnet-pull` | `feat: add magnet attraction interpolation to Collectible` | `src/entities/Collectible.js` | Smoothly pull nearby coins toward active player when magnet powerup is active |
| B-08 | `feat/physics-aabb` | `feat: add AABB collider helpers to PhysicsSystem` | `src/systems/PhysicsSystem.js` | Compute and test axis-aligned bounding boxes with forgiving player hitbox padding |
| B-09 | `feat/physics-collisions` | `feat: add obstacle and collectible collision resolution` | `src/systems/PhysicsSystem.js` | Detect player-obstacle hits and player-collectible pickups with event callbacks |
| B-10 | `feat/physics-ground-lanes` | `feat: add lane snap constants and arena boundary clamping` | `src/systems/PhysicsSystem.js` | Shared lane coordinates (`-3, 0, +3`), floor height `y=0`, and arena wall clamping |
| B-11 | `feat/physics-knockback` | `feat: add shield deflection and arena knockback impulse` | `src/systems/PhysicsSystem.js` | Deflect obstacles on shield break or push player cleanly inside arena walls |
| B-12 | `feat/physics-spatial-cull` | `feat: add distance culling optimization in PhysicsSystem` | `src/systems/PhysicsSystem.js` | Skip AABB checks for entities outside the player Z-window |
| B-13 | `feat/spawn-track-segments` | `feat: add endless recycled track tiles in SpawnManager` | `src/systems/SpawnManager.js` | Infinite scrolling 3D runner track segments with neon lane dividers |
| B-14 | `feat/spawn-arena-platform` | `feat: add enclosed 3D Arena platform generator` | `src/systems/SpawnManager.js` | Circular/octagonal arena floor with glowing border pillars for Arena mode |
| B-15 | `feat/spawn-obstacle-patterns` | `feat: add fair lane-solvable obstacle pattern generator` | `src/systems/SpawnManager.js` | Weighted patterns guaranteeing at least one safe lane/jump/slide path |
| B-16 | `feat/spawn-coin-arcs` | `feat: add coin trails and jump-arc collectible formations` | `src/systems/SpawnManager.js` | Spawn curved coin arcs over hurdles and slalom lines across lanes |
| B-17 | `feat/spawn-powerup-schedule` | `feat: add timed powerup spawn rules in SpawnManager` | `src/systems/SpawnManager.js` | Spawn shield, magnet, multiplier, and duo-sync orbs at balanced intervals |
| B-18 | `feat/spawn-difficulty-curve` | `feat: add distance-based speed and spawn density scaling` | `src/systems/SpawnManager.js` | Gradually increase runner scroll speed and wave complexity over time |
| B-19 | `feat/spawn-arena-waves` | `feat: add Arena mode wave hazard spawner` | `src/systems/SpawnManager.js` | Spawn converging arena sweepers, shockwaves, and bonus orb clusters |
| B-20 | `feat/spawn-scenery-props` | `feat: add parallax roadside pillars and cyber arches` | `src/systems/SpawnManager.js` | Recycled environmental props flanking the track for strong sense of speed |
| B-21 | `feat/spawn-cleanup-reset` | `feat: add full world reset and pool recycling in SpawnManager` | `src/systems/SpawnManager.js` | Cleanly reset track, obstacles, collectibles, and speed on game restart |
| B-22 | `feat/audio-manager-core` | `feat: add AudioManager with Web Audio API context and mute` | `src/systems/AudioManager.js` | Unlock AudioContext on user gesture, master volume, and mute persistence |
| B-23 | `feat/audio-asset-loader` | `feat: add audio file loader for public/assets/audio clips` | `src/systems/AudioManager.js` | Load optional `.mp3`/`.wav`/`.ogg` BGM and SFX buffers gracefully |
| B-24 | `feat/audio-procedural-sfx` | `feat: add Web Audio synthesized SFX fallbacks` | `src/systems/AudioManager.js` | Synthesize crisp jump, lane-switch, coin, powerup, dash, and crash sounds |
| B-25 | `feat/audio-procedural-bgm` | `feat: add procedural synthwave bassline fallback for BGM` | `src/systems/AudioManager.js` | Play subtle rhythmic synth loop when external BGM files are not yet added |
| B-26 | `feat/audio-ducking-channels` | `feat: add separate BGM and SFX gain channels with ducking` | `src/systems/AudioManager.js` | Separate BGM/SFX volume sliders and brief ducking on crash/game over |
| B-27 | `feat/audio-combo-pitch` | `feat: add rising pitch scaling for consecutive coin pickups` | `src/systems/AudioManager.js` | Escalate pickup chime semitone pitch along active combo streaks |
| B-28 | `feat/hazard-telegraph` | `feat: add ground warning indicator before arena hazards` | `src/entities/Obstacle.js` | Show pulsing floor telegraph ring before laser/drop hazards activate |
| B-29 | `feat/collectible-duo-orb` | `feat: add Duo Sync Orb restoring partner energy and bonus` | `src/entities/Collectible.js` | Special duo collectible charging shared overdrive meter |
| B-30 | `feat/physics-overdrive-smash` | `feat: add Duo Overdrive obstacle-smash collision handling` | `src/systems/PhysicsSystem.js` | Smash through obstacles for bonus points while Duo Overdrive is active |
| B-31 | `feat/world-biome-colors` | `feat: add biome color palette cycling per 500m milestone` | `src/systems/SpawnManager.js` | Shift track accent colors smoothly as distance milestones are reached |
| B-32 | `feat/world-main-wiring` | `feat: integrate SpawnManager, PhysicsSystem, and AudioManager` | `src/main.js` | Connect world spawning, collisions, and audio triggers into `src/main.js` |
| B-33 | `fix/spawn-overlap-guard` | `fix: prevent overlapping obstacle and collectible spawns` | `src/systems/SpawnManager.js` | Enforce minimum Z-gap check before placing new obstacle/collectible rows |
| B-34 | `fix/audio-autoplay-resume` | `fix: safely resume suspended AudioContext on first input` | `src/systems/AudioManager.js` | Handle browser autoplay restrictions cleanly across click and keydown |
| B-35 | `docs/world-audio-guide` | `docs: document physics, spawning, and audio asset setup` | `docs/ARCHITECTURE.md` | Document lane specs, collision rules, and `/public/assets/audio/` conventions |

---

## Track C (Member 3 — 35 PRs): UI, Character Select, Leaderboard & Tests

Focus directories: `src/ui/`, `src/systems/ScoreManager.js`, `tests/`, `docs/`

| ID | Branch | PR Title | Primary File(s) | Scope |
| --- | --- | --- | --- | --- |
| C-01 | `feat/score-manager-core` | `feat: add ScoreManager for distance, coins, and multipliers` | `src/systems/ScoreManager.js` | Track distance, coins, combo timer, active multiplier, and final score calculation |
| C-02 | `feat/score-duo-overdrive` | `feat: add Duo Overdrive meter and streak milestones` | `src/systems/ScoreManager.js` | Accumulate overdrive charge from coins/near-misses and trigger overdrive state |
| C-03 | `feat/leaderboard-storage` | `feat: add Leaderboard localStorage persistence and sorting` | `src/ui/Leaderboard.js` | Store top-10 scores with player name, character used, mode, and date |
| C-04 | `feat/leaderboard-ui` | `feat: add Leaderboard overlay modal component` | `src/ui/Leaderboard.js` | Render ranked leaderboard table, mode filter tabs, and clear/close actions |
| C-05 | `feat/main-menu-ui` | `feat: add MainMenu overlay with Runner and Arena modes` | `src/ui/MainMenu.js` | Title screen with Play Runner, Play Arena, Character Select, Leaderboard, and Audio toggle |
| C-06 | `feat/character-select-ui` | `feat: add CharacterSelect UI for Character 1 and Character 2` | `src/ui/CharacterSelect.js` | Interactive duo character cards showing stats, abilities, and primary/partner selection |
| C-07 | `feat/character-select-3d-preview` | `feat: add live 3D turntable preview in CharacterSelect` | `src/ui/CharacterSelect.js` | Rotate selected Character 1 / Character 2 preview in the 3D scene while on select screen |
| C-08 | `feat/hud-core` | `feat: add in-game HUD for score, distance, and coins` | `src/ui/HUD.js` | Clean responsive HUD displaying score, distance, coins, and current speed |
| C-09 | `feat/hud-duo-indicators` | `feat: add active character badge, lives, and overdrive bar to HUD` | `src/ui/HUD.js` | Display active character portrait/tag, shield/powerup timers, and Duo Overdrive bar |
| C-10 | `feat/hud-combo-popups` | `feat: add floating combo and milestone toast banners to HUD` | `src/ui/HUD.js` | Animated combo badge and 500m milestone popups |
| C-11 | `feat/pause-menu-ui` | `feat: add PauseMenu with resume, restart, and volume controls` | `src/ui/PauseMenu.js` | Pause modal triggered by `Escape`/`P` with BGM/SFX sliders and main-menu exit |
| C-12 | `feat/game-over-ui` | `feat: add GameOver summary screen and name entry` | `src/ui/GameOver.js` | Show run stats, new high-score badge, player initials input, retry, and leaderboard link |
| C-13 | `feat/ui-shared-styles` | `feat: add glassmorphic arcade UI theme styles` | `src/style.css` | Cohesive responsive CSS tokens, animations, buttons, and mobile layout rules |
| C-14 | `feat/ui-mobile-controls` | `feat: add optional on-screen touch buttons for mobile` | `src/ui/HUD.js` | Touch buttons for jump, slide, dash, and character swap on touch viewports |
| C-15 | `feat/ui-settings-persistence` | `feat: persist audio, quality, and control preferences` | `src/ui/PauseMenu.js` | Save and restore user settings across browser reloads via `localStorage` |
| C-16 | `feat/ui-state-machine` | `feat: wire full UI screen transitions in main.js` | `src/main.js` | Connect Menu -> CharacterSelect -> Playing -> Paused -> GameOver -> Leaderboard flows |
| C-17 | `feat/hud-fps-toggle` | `feat: add optional FPS and debug stats pill in HUD` | `src/ui/HUD.js` | Toggleable performance badge reading `GameLoop` metrics |
| C-18 | `test/score-manager-unit` | `test: add Vitest unit tests for ScoreManager` | `tests/ScoreManager.test.js` | Test distance scoring, multipliers, combo decay, and overdrive charge |
| C-19 | `test/physics-system-unit` | `test: add Vitest unit tests for PhysicsSystem` | `tests/PhysicsSystem.test.js` | Test AABB overlap, lane bounds, shield deflection, and spatial culling |
| C-20 | `test/player-movement-unit` | `test: add Vitest unit tests for Player movement and jump` | `tests/Player.test.js` | Test lane switching, jump/gravity arc, slide timer, dash cooldown, and duo swap |
| C-21 | `test/spawn-manager-unit` | `test: add Vitest unit tests for SpawnManager` | `tests/SpawnManager.test.js` | Test solvable lane patterns, difficulty scaling, and pool reset |
| C-22 | `test/input-manager-unit` | `test: add Vitest unit tests for InputManager` | `tests/InputManager.test.js` | Test keyboard mapping, input buffering, and custom rebinding |
| C-23 | `test/leaderboard-unit` | `test: add Vitest unit tests for Leaderboard persistence` | `tests/Leaderboard.test.js` | Test score insertion, top-10 sorting, mode filtering, and storage fallback |
| C-24 | `test/character-loader-unit` | `test: add Vitest unit tests for CharacterLoader fallbacks` | `tests/CharacterLoader.test.js` | Test procedural fallback generation for `char1` and `char2` and caching |
| C-25 | `test/obstacle-collectible-unit` | `test: add Vitest unit tests for Obstacle and Collectible` | `tests/Entities.test.js` | Test obstacle reset/movement and collectible magnet attraction |
| C-26 | `test/game-loop-unit` | `test: add Vitest unit tests for GameLoop timing` | `tests/GameLoop.test.js` | Test delta clamping, pause state, and callback execution order |
| C-27 | `test/audio-manager-unit` | `test: add Vitest unit tests for AudioManager state` | `tests/AudioManager.test.js` | Test mute toggle, channel volume clamping, and safe headless fallback |
| C-28 | `test/ui-components-unit` | `test: add Vitest tests for MainMenu, HUD, and GameOver` | `tests/UI.test.js` | Test DOM rendering, button callbacks, and HUD state updates with mock DOM |
| C-29 | `chore/ci-github-actions` | `chore: add GitHub Actions CI for lint, test, and build` | `.github/workflows/ci.yml` | Run `npm ci`, `npm run lint`, `npm run test:run`, and `npm run build` on PRs to `dev` |
| C-30 | `docs/contributing-guide` | `docs: add CONTRIBUTING.md with PR and branch rules` | `docs/CONTRIBUTING.md` | Document team workflow, Conventional Commits, ESLint, and conflict avoidance |
| C-31 | `docs/architecture-overview` | `docs: add ARCHITECTURE.md system diagram and module contracts` | `docs/ARCHITECTURE.md` | Document full module boundaries, event flows, and asset guidelines |
| C-32 | `fix/ui-accessibility` | `fix: add keyboard focus states and ARIA labels to menus` | `src/ui/MainMenu.js` | Improve keyboard navigation and screen-reader labels across overlays |
| C-33 | `fix/leaderboard-xss-escape` | `fix: sanitize player names rendered in Leaderboard` | `src/ui/Leaderboard.js` | Use `textContent` escaping to prevent HTML injection in leaderboard entries |
| C-34 | `fix/mobile-viewport-layout` | `fix: refine responsive HUD and menu layout on narrow screens` | `src/style.css` | Ensure HUD and CharacterSelect fit cleanly on 360px-wide mobile screens |
| C-35 | `chore/readme-release-docs` | `docs: update README.md with setup, controls, and team credits` | `README.md` | Complete project README with local setup, controls, architecture, and `.glb` guide |

---

## Summary

- **Track A (Core 3D Engine, Characters & Controls):** 35 PRs (`A-01` – `A-35`)
- **Track B (World, Obstacles, Physics & Audio):** 35 PRs (`B-01` – `B-35`)
- **Track C (UI, Character Select, Leaderboard & Tests):** 35 PRs (`C-01` – `C-35`)
- **Total Planned Atomic PRs:** **105 PRs**
