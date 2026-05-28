# Phase 1 Architecture Audit Results
# Phase 1: Deep Repository Architecture Audit

## 1. Core Backbone
The repository's structural foundation is anchored by `js/main.js`, which manages the global state machine (`AppState`: MENU, IN_GAME, PAUSED, TRANSITIONING, TROPHY_ROOM) and the high-level game loop (`mainLoop` via `requestAnimationFrame`). Modules are instantiated dynamically through the `gameRegistry` map.

Critical `js/core/` systems operate primarily as singletons accessed globally or imported locally:
* **`SaveSystem.js`**: Centralized manager for persistent state (`localStorage`), handling currency, high scores, achievements, and upgrades.
* **`SoundManager.js`**: Wraps the Web Audio API to provide background music and sound effects playback, preventing multiple overlapping audio contexts.
* **`ArcadeHub.js` & `BackgroundShader.js`**: Provide the primary rendering context for the menu. `ArcadeHub.js` uses Three.js for the 3D 1st-person arcade interface, managing raycasting and collision, while falling back to a grid view if WebGL isn't supported.
* **`BossMode.js`**: An overlay OS simulation triggered by a hotkey, rendering mock productivity apps to hide gameplay.

## 2. Game Logic & State Patterns
Games in the `js/games/` directory are designed as self-contained ES6 classes.
* **Gameplay Complexity**: Ranges from simple DOM-based games (e.g. `Clicker`) to 2D Canvas games (e.g. `Neon Bounce`), and complex 3D WebGL experiences (e.g. `Matterhorn`, `Alpine Adventure`).
* **Rendering & Division of Labor**: DOM manipulation is frequently used for UI layers and overlays on top of the `<canvas>` elements. For 2D/3D games, the game class manages its own rendering context (`CanvasRenderingContext2D` or `WebGLRenderingContext`/Three.js renderer).
* **Event Propagation & Lifecycle**: The `main.js` script delegates control. Games must expose an `async init(container)` method to mount themselves into a provided `<div id="{game-id}">`. The main hub then calls the game's `update(dt)` and `draw()` methods if they exist. Critically, games must implement an `async shutdown()` method to clean up all intervals, event listeners, and WebGL contexts before the hub unmounts them and transitions back to `AppState.MENU`.

## 3. Synthesis & Integration Protocol
To integrate seamlessly into the main hub without polluting the global namespace, a new or overhauled game must adhere to the following rules:
1. **Module Export & Registration**: The game must be exported as a default class (e.g., `export default class GameName`) and registered dynamically within the `gameRegistry` in `js/main.js`.
2. **Resource Encapsulation**: The game must strictly utilize the `js/core/SaveSystem.js` singleton for all state persistence (avoiding raw `localStorage`) and `js/core/SoundManager.js` for audio contexts.
3. **Lifecycle Management**: The module must implement an `init(container)` hook for mounting, manage its internal update loops efficiently, and ensure exhaustive cleanup of all event listeners, intervals, and rendering contexts when dismantled.

## Strict Integration Protocol for New/Overhauled Games

1. **Lifecycle & Registration Encapsulation:** Modules must be implemented as self-contained ES6 classes implementing the standard lifecycle hooks (`async init(container)`, `update(dt)`, `draw()`, and `async shutdown()`). They must be dynamically registered in `js/main.js` and their designated DOM container (`<div id='{game-id}' class='hidden game-container'></div>`) explicitly added to `index.html`.
2. **Resource & Global State Governance:** Games are strictly prohibited from using raw `localStorage` or creating detached AudioContexts. They must exclusively interface with the provided singletons: `js/core/SaveSystem.js` (using `.getHighScore()` and `.setHighScore()`) for persistence, and `js/core/SoundManager.js` for audio, to avoid global namespace pollution and state collisions.
3. **Rigorous DOM & Event Cleanup:** To protect the main hub from memory leaks, modules must ensure absolute teardown within their `shutdown()` hook. This includes unmounting custom UI overlays (`this.container.innerHTML = '';`), clearing intervals/timeouts, and removing event listeners using explicit bound references (e.g., `this.boundResize`) rather than anonymous arrow functions.
To seamlessly plug a new or overhauled game into the main hub without polluting the global namespace or causing memory leaks, these strict integration requirements must be met:

* **Self-Contained Encapsulation & Registration**: The game must be built as a modular ES6 class, managing its own scope and exposing only `init(container)`, `update(dt)`, `draw()`, and `shutdown()` methods, and it must be registered in the `js/main.js` `gameRegistry`.
* **Resource and State Centralization**: The game must strictly utilize the `js/core/SaveSystem.js` singleton for any data persistence (e.g., `saveSystem.setHighScore(gameId, score)`) and `js/core/SoundManager.js` for audio, avoiding raw `localStorage` calls or creating separate audio contexts.
* **Rigorous Lifecycle Cleanup**: The `shutdown()` hook must exhaustively remove all DOM elements added to the container, clear all `setInterval`/`requestAnimationFrame` loops, unbind all specific window/document event listeners, and dispose of WebGL geometries/materials to ensure zero performance regressions in the hub.
