### Phase 1: Architecture Audit Summary

Based on reviewing `js/main.js`, `js/core/ArcadeHub.js`, `js/core/SaveSystem.js`, and `js/games/PlaceholderGame.js`, here are the strict integration requirements for a new game to plug seamlessly into the main hub without polluting the global namespace:

1.  **Self-Contained Module with Standard Interface**: The game must be exported as a default ES6 class (e.g., `export default class MyGame`). It must implement a specific interface matching the hub's game loop: `async init(container)`, `update(dt)`, `draw()`, and `async shutdown()`. The module should not rely on global variables and should append its UI/Canvas to the provided `container` DOM element.

2.  **Explicit Registration in main.js and index.html**: The new game must be registered within the `gameRegistry` object in `js/main.js`, defining its ID, metadata, and dynamic import path (e.g., `'my-new-game': { name: '...', ..., importFn: () => import('./games/myNewGame.js') }`). Additionally, a corresponding container `div` must be added to `index.html` (e.g., `<div id='my-new-game' class='hidden game-container'></div>`).

3.  **Strict Use of Core Singleton Systems**: The game must absolutely avoid raw `localStorage` or native `AudioContext` creation. It must retrieve and persist state (like scores or achievements) strictly through `SaveSystem.getInstance()`, handle audio through `SoundManager.getInstance()`, and (optionally) manage input via `InputManager.getInstance()`. It should trigger the end-state natively using `window.miniGameHub.showGameOver(score)`.

Please review this summary. I am pausing execution to await your confirmation before proceeding to Phase 2 (Game Creation/Overhaul).
