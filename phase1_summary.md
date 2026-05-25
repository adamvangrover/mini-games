# Phase 1: Deep Repository Architecture Audit

## 1. Core Backbone
* **Module Instantiation:** Game modules are primarily dynamically imported (lazy-loaded) via a global `gameRegistry` defined in `js/main.js` (e.g., `importFn: () => import('./games/...')`). This registry maps string IDs to object definitions containing metadata and the import function. The main loop in `js/main.js` manages state transitions (e.g., `transitionToState(AppState.IN_GAME)`), instantiates the imported class, and calls its `init(container)` method, passing in the DOM container element.
* **Global State Governance:** Global state is managed by singletons located in `js/core/`. Key managers include `SaveSystem.js` for data persistence (scores, settings, achievements), `SoundManager.js` for audio contexts and playback, `InputManager.js` for global input tracking, and singletons for specific systems like `AIHub.js` and `SyncManager.js`. The `ArcadeHub.js` acts as the 3D hub environment manager. `window.miniGameHub` is exposed as a global API for debugging and inter-module communication (e.g., returning to menu via `goBack()`).
* **Rendering Contexts:** The application uses a hybrid approach. The main hub (`ArcadeHub.js`) heavily utilizes Three.js (WebGL) for a 3D environment. Individual mini-games typically create their own HTML5 `<canvas>` elements within the provided DOM container, using standard Canvas 2D contexts (`ctx.getContext('2d')`) or sometimes WebGL/Three.js. CSS/DOM elements overlay these canvases for UI, although games are expected to manage their own specific UI.

## 2. Game Logic & State Patterns
* **Gameplay Complexity:** The baseline complexity in `js/games/` ranges from simple arcade clones (e.g., Pong, Breakout) to logic puzzles and basic action games. They are generally self-contained prototypes focused on core loops rather than deep progression or visual polish.
* **Division of Labor:**
    *   **DOM Manipulation:** Modules receive a container DOM element and are responsible for injecting their own canvas and UI elements. They must cleanly remove these upon exit.
    *   **Rendering:** Games handle their own rendering logic within an `update(dt)` and `draw()` loop or a combined `requestAnimationFrame` loop initiated within their `init()` or `start()` methods.
* **Event Propagation:** Games attach their own event listeners (keyboard, mouse/touch) to the `window` or their specific canvas. The `InputManager` in core provides some shared input state, but many games handle inputs locally. Crucially, games must implement a shutdown mechanism (e.g., `async shutdown()`) to unbind these listeners and halt their loops to prevent memory leaks and conflicts with the main hub.

## 3. Synthesis & Integration Protocol
To seamlessly plug a new or overhauled game into the main hub without polluting the global namespace, the module must strictly adhere to the following protocol:

*   **Self-Contained Lifecycle Hook Implementation:** The module must be an ES6 class implementing `async init(container)`, a managed update/render loop, and `async shutdown()` to explicitly clean up all DOM nodes, intervals, and event listeners. Avoid anonymous arrow functions for event listeners to ensure they can be cleanly removed.
*   **Centralized Resource Management:** The game must not use raw `localStorage` or create standalone `AudioContext` instances. It must exclusively use `window.miniGameHub.saveSystem` (or the imported `SaveSystem` singleton) for state persistence and `window.miniGameHub.soundManager` for audio.
*   **Explicit Registry and DOM Configuration:** The game must be registered in `js/main.js`'s `gameRegistry` with an appropriate ID and metadata. Additionally, its corresponding container (`<div id='{game-id}' class='hidden game-container'></div>`) must be explicitly added to `index.html`.
