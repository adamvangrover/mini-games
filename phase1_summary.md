Phase 1 Summary:

1. **Core Backbone:** The game hub instantiates game modules through dynamic imports in `js/main.js` registry (e.g., `importFn: () => import('./games/mygame.js')`). Global state is managed using Singleton managers like `SaveSystem.js`, `SoundManager.js`, and `InputManager.js`. The main visual hub uses Three.js (`ArcadeHub.js`), but 2D/Canvas games handle their own rendering contexts within a provided container div.
2. **Game Logic & State Patterns:** Game modules in `js/games/` are ES6 classes. They typically encapsulate their logic, update loop (`update(dt)`), and rendering loop (`draw()`). They interact with the DOM primarily by creating a canvas inside the provided container and appending it.
3. **Synthesis & Integration Protocol:**
   - **Lifecycle Interface:** A module must implement `async init(container)`, `update(dt)`, `draw()`, and `async shutdown()` (which cleans up its container, e.g., `this.container.innerHTML = ''`).
   - **Global Manager Usage:** Use `SaveSystem.getInstance()` for state persistence (no raw `localStorage`) and `SoundManager.getInstance()` for audio.
   - **Encapsulation:** The module must not pollute the global namespace, strictly manage its own memory/event listeners, and use bounded methods (e.g., `this.boundResize`) for event cleanup.

---

## CRAFT+S Reasoning Directive Chain of Thought

1.  **Repo Review:** The repository contains a rich variety of arcade and logic games, heavily utilizing vanilla ES6, Canvas API, and Three.js for 3D elements. Games are highly modular, dynamically loaded via `js/main.js`, and heavily rely on `SaveSystem.js` for progression.
2.  **Decision:** I will be executing **Path A (The Overhaul)**, specifically overhauling an existing game module named "Byte Broker" (`byteBroker.js`). Overhauling this aligns with the instructions to introduce cutting edge visuals and drastically overhaul an existing module.
3.  **The Vision:** "Byte Broker" will receive heavily stylized terminal aesthetics to push the glitch/cyberpunk tone. Visually, it will feature CSS-driven CRT chromatic aberration effects and dynamically rendered canvas glitches. Mechanically, we will simulate "Yield Pressure" and "Distressed Debt" to destabilize the market logic and increase tension. Additionally, the entire repository will be packaged as an Electron application.
4.  **Implementation Steps:**
    *   Modify `byteBroker.js` `tickMarket` logic to introduce the Yield Pressure and Distressed Debt simulation.
    *   Update `byteBroker.js` `render` to inject CRT CSS filters on the main view.
    *   Refactor `byteBroker.js` `drawChart` to add random glitched strings to the Canvas view.
    *   Install Electron and Electron Builder, configuring `package.json` and a `main.js` runner to bundle the hub as an executable.
5.  **Verification Plan:**
    *   I will use the existing `verification/verify_byte_broker.py` to confirm the game logic handles uploads and trading securely.
    *   I will execute the new Electron launch command (`npm start`) in headless xvfb to verify it successfully opens the app.
