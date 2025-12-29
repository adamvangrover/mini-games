# Neon Arcade Hub

A high-performance, immersive "Arcade Hub" web application featuring over 40 games, a persistent economy, and a 3D interface.

## 🚀 Getting Started

This application uses ES6 Modules, which requires a local server to run due to CORS security policies in modern browsers.

### Quick Start (Recommended)

1.  **Install Python** (if not already installed).
2.  Open a terminal in the project folder.
3.  Run:
    ```bash
    python3 -m http.server 8000
    ```
4.  Open your browser and navigate to: `http://localhost:8000`

### Alternative (Node.js)

1.  Install `serve`:
    ```bash
    npx serve
    ```
2.  Navigate to the URL provided (usually `http://localhost:3000`).

## 🎮 Features

*   **3D Arcade Hub**: Explore a virtual arcade cabinet hall using Three.js (wasd/drag controls).
*   **Persistent Economy**: Earn coins and XP across all games. Data is saved to your browser's LocalStorage.
*   **Store System**: Buy new Avatars, UI Themes, and Cabinet Styles.
*   **Trophy Room**: View your unlocked achievements in a dedicated 3D space.
*   **Daily Challenges**: Earn 2x coins on specific games each day.
*   **Mobile Support**: Fully responsive with touch controls and virtual joysticks.

## 🕹️ Game Collection

The repository includes a diverse collection of games:

*   **Action**: Neon Shooter (FPS), Neon Jump, Neon Slice, Neon Galaga.
*   **Puzzle**: Neon Mines (Minesweeper), Sudoku, Neon Zip, Eclipse (Strategy).
*   **Classics**: Snake, Pong, Tetris, Breakout, Space Shooter - all with a Neon twist.
*   **Simulation**: The Grind 98 (Life Sim), Neon Life, Zen Garden.
*   **Physics**: Physics Stacker, Neon Golf, Neon Hoops.
*   **3D Worlds**: Alpine Adventure, Neon City (Open World), Aetheria (Floating Islands).

## 🛠️ Development

*   **Tech Stack**: Vanilla JavaScript (ES6), TailwindCSS (CDN), Three.js (CDN).
*   **Structure**:
    *   `js/main.js`: Core entry point and state management.
    *   `js/core/`: System modules (Save, Audio, Input, Store).
    *   `js/games/`: Individual game modules.
    *   `css/`: Stylesheets.

## ⚠️ Notes

*   **Browser Compatibility**: Requires a modern browser with WebGL support for the 3D Hub.
*   **Performance**: If the 3D Hub is slow, the application will automatically fallback to a high-performance "Grid View" (2D Mode).
