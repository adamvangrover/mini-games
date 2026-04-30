Here is a comprehensive meta-prompt you can feed into an AI coding assistant (like Cursor, Aider, or Claude) to execute this repository review and overhaul. It is structured to first map the existing architecture, and then inject a highly specific, atmospheric, and mechanically deep vision into the codebase.

***

### Copy and Paste the Prompt Below:

**Role:** You are an elite software architect and creative game developer. Your objective is to thoroughly audit the provided repository and then execute a massive overhaul of an existing module or introduce a sophisticated new one.

**Phase 1: Deep Repository Audit**
1. **Core Architecture:** Review the structural backbone of the repo, specifically targeting `js/core/` (e.g., `AIHub.js`, `ArcadeHub.js`, `BossMode.js`, `BackgroundShader.js`). Understand how games are instantiated, state is managed, and how assets/shaders are applied.
2. **Game Logic Patterns:** Analyze the directory `js/games/` to understand the current baseline for gameplay complexity, DOM manipulation vs. Canvas rendering, and event handling.
3. **Synthesis:** Output a brief, 3-bullet summary of the current integration requirements for a new or overhauled game to seamlessly plug into the main hub.

**Phase 2: The Execution Directive**
Once the audit is complete, proceed with ONE of the following paths based on which offers the highest potential for mechanical depth and visual storytelling:

**Path A: The Glitch-Poetic Overhaul (Recommended Target: `byteBroker` or `neon_broker`)**
Completely re-engineer the selected game to deepen its mechanics and visual identity.
* **Aesthetics & Visuals:** Strip away standard UIs and implement a heavy cyberpunk noir / hacker aesthetic. Introduce custom shaders for CRT scanlines, chromatic aberration, and glitch-text rendering. The interface should feel like an illicit, high-stakes terminal.
* **Gameplay Depth:** Evolve the mechanics beyond simple loops. Introduce complex risk-assessment variables simulating real-time credit market dynamics, distressed debt volatility, or high-yield underwriting pressure.
* **Narrative Interactivity:** Frame the game's levels or escalating difficulty around a specific, high-stakes geopolitical market scenario—code-named "Operation Absolute Resolve." The player must monitor and execute actions before the market collapses.

**Path B: New Game Creation ("WhaleScanner Protocol")**
If overhauling an existing game is too restrictive, build a completely new game from scratch.
* **Core Loop:** Design a puzzle/strategy simulation where the player acts as an analyst triaging a flood of raw SEC EDGAR filings and institutional data to find hidden market catalysts.
* **Interactivity:** The player must deploy autonomous "agents" to parse different data streams, balancing processing power against a ticking clock.
* **Visuals:** Utilize a dark, minimalist terminal visualization with data-nodes connected by glowing, glitchy networking layers. Use Canvas/WebGL to map out the institutional connections dynamically.

**Phase 3: Implementation Rules**
* **Self-Contained:** Ensure the new/overhauled game logic is encapsulated but properly registers with `GameManager.ts` or `AIHub.js`.
* **Performance:** Optimize any new WebGL/Canvas loops to prevent frame drops in the main hub.
* **Immersion:** UI elements should not look like standard web buttons. Use ASCII art borders, monospaced typography, and terminal cursor blink effects.

**Action:** Begin with Phase 1 and pause for my confirmation on your architectural understanding before writing the code for Phase 2.

***

### Why this structure works for your repository:
* **Safety First:** It forces the AI to read the `js/core` files first. With systems like `BossModeOS` and `AIHub` dictating the environment, a blind drop of a new game will likely break routing or state management.
* **Thematic Alignment:** It pushes the AI away from generic "arcade" styles and forces it to build the specific noir, terminal-driven visualizations that pair perfectly with complex logic and data streams.
* **Scalability:** By anchoring the prompt in the concept of autonomous agents or high-stakes underwriting loops, the generated code will naturally lean toward robust, multi-layered class structures rather than simple flat scripts.
