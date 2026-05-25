# Phase 1: Deep Repository Architecture Audit

## 1. Core Backbone
The repository is orchestrated through a central entry point (`js/main.js`), which maintains the core game loop (`mainLoop`), manages global state via `AppState` (MENU, IN_GAME, PAUSED, TRANSITIONING), and houses the dynamic import registry (`gameRegistry`). Crucial global systems reside in `js/core/` and are utilized as singletons:
* **`SaveSystem.js`**: Handles all local state persistence, achievement unlocking, and currency.
* **`SoundManager.js`**: Centralized Web Audio API context management for background music and sound effects.
* **`ArcadeHub.js`**: Orchestrates the 3D interactive hub environment using Three.js, managing collision, raycast interactions, and transitions to individual game states.

## 2. Game Logic & State Patterns
Individual games are structured as self-contained ES6 modules under `js/games/`. They encapsulate their own rendering methods (often utilizing custom Canvas/WebGL contexts or DOM manipulation).
* **Lifecycle**: Games are instantiated via the hub and mount themselves to a dedicated DOM container provided through an `init(container)` hook.
* **Update Loop**: While `main.js` exposes global `update(deltaTime)` and `draw()` hooks that games can plug into, complex games often manage their own internal `requestAnimationFrame` loops.
* **Cleanup**: Games are responsible for tearing down their logic, ensuring event listeners and timers are cleanly removed when the state transitions away from `IN_GAME`.

## 3. Synthesis & Integration Protocol
To integrate seamlessly into the main hub without polluting the global namespace, a new or overhauled game must adhere to the following rules:
1. **Module Export & Registration**: The game must be exported as a default class (e.g., `export default class GameName`) and registered dynamically within the `gameRegistry` in `js/main.js`.
2. **Resource Encapsulation**: The game must strictly utilize the `js/core/SaveSystem.js` singleton for all state persistence (avoiding raw `localStorage`) and `js/core/SoundManager.js` for audio contexts.
3. **Lifecycle Management**: The module must implement an `init(container)` hook for mounting, manage its internal update loops efficiently, and ensure exhaustive cleanup of all event listeners, intervals, and rendering contexts when dismantled.

## Strict Integration Protocol for New/Overhauled Games

1. **Lifecycle & Registration Encapsulation:** Modules must be implemented as self-contained ES6 classes implementing the standard lifecycle hooks (`async init(container)`, `update(dt)`, `draw()`, and `async shutdown()`). They must be dynamically registered in `js/main.js` and their designated DOM container (`<div id='{game-id}' class='hidden game-container'></div>`) explicitly added to `index.html`.
2. **Resource & Global State Governance:** Games are strictly prohibited from using raw `localStorage` or creating detached AudioContexts. They must exclusively interface with the provided singletons: `js/core/SaveSystem.js` (using `.getHighScore()` and `.setHighScore()`) for persistence, and `js/core/SoundManager.js` for audio, to avoid global namespace pollution and state collisions.
3. **Rigorous DOM & Event Cleanup:** To protect the main hub from memory leaks, modules must ensure absolute teardown within their `shutdown()` hook. This includes unmounting custom UI overlays (`this.container.innerHTML = '';`), clearing intervals/timeouts, and removing event listeners using explicit bound references (e.g., `this.boundResize`) rather than anonymous arrow functions.
