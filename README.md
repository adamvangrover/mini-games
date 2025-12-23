# 🎮 Neon Arcade Hub

A **robust, modular, and immersive** web application featuring over 40+ mini-games, a 3D Arcade Hub, an integrated economy, and persistent progression.

![Neon Arcade](hub_3d_v2.png)

## 🕹️ Games Included

The arcade features a massive collection of games across multiple genres:

*   **Arcade Classics:** Snake, Pong, Tetris, Space Shooter, Breakout, Pac-Man style Maze.
*   **New Neon Hits:** Neon Jump, Neon Slice, Neon Stack, Neon Flow, Neon 2048.
*   **3D Immersive:** Neon City (Open World), Aetheria (Floating Islands), Matterhorn (Climbing), Lumina (FPS), Neon Shooter.
*   **Logic & Puzzle:** Sudoku, Queens, Neon Mines (Minesweeper), Neon Picross, Eclipse.
*   **Simulation:** The Grind 98 (Life Sim), Neon Life, Zen Garden.
*   **Sports:** Neon Golf, Neon Hoops.

For detailed instructions and walkthroughs for each game, please see [GAMES.md](GAMES.md).

## 📂 How to Run

Because this project uses **ES6 Modules**, it requires a local web server to run correctly (browsers block module imports from `file://` URLs for security).

### Option 1: Python (Recommended)
If you have Python installed (Mac/Linux usually do):

1.  Open your terminal/command prompt.
2.  Navigate to the project folder.
3.  Run:
    ```bash
    python3 -m http.server 8000
    ```
4.  Open your browser and go to: `http://localhost:8000`

### Option 2: Node.js (npx)
If you have Node.js installed:

1.  Open your terminal.
2.  Run:
    ```bash
    npx serve
    ```
3.  Open the URL shown (usually `http://localhost:3000`).

### Option 3: VS Code "Live Server"
If you use Visual Studio Code:
1.  Install the "Live Server" extension.
2.  Right-click `index.html`.
3.  Select "Open with Live Server".

## 🌟 Features

*   **3D Arcade Hub:** Explore a virtual arcade cabinet room using Three.js.
*   **Save System:** Persistent progress (XP, Levels, Currency, High Scores) saved to local storage.
*   **Economy & Store:** Earn coins to buy new Avatars, Themes, and Cabinet Styles.
*   **Tech Tree:** Upgrade your stats (Coin Multiplier, XP Boost).
*   **Achievements & Trophies:** Unlock trophies in the 3D Trophy Room.
*   **Mobile Ready:** Touch controls and responsive design for phone and tablet.
*   **Neon Aesthetics:** A unified "Glassmorphism" and Cyberpunk visual style.

## 🛠️ Tech Stack

*   **HTML5 / CSS3 (Tailwind CSS)**
*   **JavaScript (ES6 Modules)**
*   **Three.js** (3D Rendering)
*   **Matter.js** (2D Physics)

## 📜 License

This project is open-source. Feel free to modify and improve it!
