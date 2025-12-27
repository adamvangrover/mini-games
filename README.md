# Neon Arcade Hub

**A Modular, 3D Web-Based Arcade Platform.**

This repository hosts a collection of over 40 mini-games within a unified, persistent "Neon Arcade" environment. It features a 3D hub, a robust economy system, and persistent player progression.

## 🚀 Getting Started

**Important: This application requires a local web server.**

Due to the use of modern ES6 Modules (`import`/`export`), you cannot simply double-click `index.html`. Browsers block module requests over the `file://` protocol for security reasons (CORS).

### Setup Instructions

1.  **Install Node.js** (Optional, but recommended)
    - If you have Node.js installed, you can use `npx`:
    ```bash
    npx serve
    ```
    - Open `http://localhost:3000` in your browser.

2.  **Using Python**
    - Every macOS/Linux machine (and many Windows setups) has Python installed.
    ```bash
    # Python 3
    python3 -m http.server 8000
    ```
    - Open `http://localhost:8000` in your browser.

3.  **Using VS Code**
    - Install the **Live Server** extension.
    - Right-click `index.html` and select "Open with Live Server".

## 🎮 Features

### Core Systems
*   **3D Arcade Hub**: Explore a virtual arcade cabinet room built with Three.js.
*   **Fault-Tolerant Loading**: Games load dynamically. If a module is missing, the hub continues to function with a placeholder.
*   **Save System**: LocalStorage persistence for:
    *   High Scores
    *   Currency (Coins) & Inventory
    *   Achievements
    *   Game Settings (Volume, Ads, CRT Effect)
*   **Economy**: Earn coins by playing games. Spend them in the **Shop** to buy cabinet styles, themes, and avatars.
*   **Tech Tree**: Upgrade global stats like "Coin Multiplier" and "XP Boost".

### Game Library
The arcade includes over 40 titles across various genres:

*   **3D Immersive**: Neon City (Open World), Matterhorn (Climbing), Aetheria (Flying), Lumina (FPS), Prism Realms (FPS).
*   **Action**: Neon Shooter (FPS), Neon Jump, Neon Slice, Neon Galaga.
*   **Puzzle**: Sudoku, Minesweeper, Picross, Queens, Neon Flow, 2048.
*   **Arcade Classics**: Snake, Pong, Tetris, Breakout, Space Shooter (Remastered).
*   **Simulation**: The Grind 98, Life Sim, Zen Garden.
*   **Sports**: Neon Golf, Neon Hoops.

## 🛠 Architecture

*   **Modular Design**: Each game is a standalone ES6 module exporting a class with `init()`, `update()`, and `shutdown()`.
*   **Dynamic Imports**: `js/main.js` lazy-loads games to ensure fast initial startup time.
*   **Fallback Handling**:
    *   If WebGL is unavailable, the app automatically switches to a high-fidelity **2D Grid View**.
    *   On Mobile, the interface adapts with touch controls and optimized layouts.

## 🤝 Contributing

To add a new game:
1.  Create a class file in `js/games/`.
2.  Implement the `init(container)` and `shutdown()` methods.
3.  Register the game in `js/main.js` inside the `gameRegistry` object using the dynamic import pattern:
    ```javascript
    'my-new-game': {
        name: 'My Game',
        // ... metadata
        importFn: () => import('./games/myNewGame.js')
    }
    ```

## 📜 License

MIT License.
