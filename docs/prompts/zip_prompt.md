keep going keep building: Here is a comprehensive and highly detailed prompt you can copy and paste into an AI coding assistant (like Cursor, GitHub Copilot, ChatGPT, or Claude) to build this game.

This prompt is designed to instruct the AI to build a robust, scalable game with a built-in level generator so you get infinite complexity.

***

### 📋 Copy and Paste the Prompt Below:

**Act as an Expert Game Developer and Software Architect.**

**Context:**
I have an existing web-based game library repository. I want to design and add a new standalone logic puzzle game called **"Zip"**, inspired by LinkedIn's daily logic games (like Queens, Crossclimb) and classic pathfinding puzzles (like Numbrix or Flow Free).

**Core Game Concept ("Zip"):**
"Zip" is a grid-based logic puzzle. The goal is to draw a continuous path connecting numbers in sequential order (1, 2, 3... up to the max number of grid squares) while satisfying a strict condition: **the path must fill absolutely every space on the board.** **Task:**
Please generate the complete code for this game, including the UI, game logic, state management, scoring system, and an algorithmic level generator.

Please build this using **[Insert Your Tech Stack Here, e.g., React, TypeScript, and Tailwind CSS]**.

### 1. Game Mechanics & Rules:
* **The Grid:** Starts at 4x4 (Easy) and scales up to 10x10 (Expert).
* **Initial State:** The board spawns with a few numbers pre-filled (e.g., '1', '6', and '16' on a 4x4 board).
* **Gameplay:** The user clicks and drags (or taps and swipes) to draw a sequential path from 1 to the highest number.
* **Win Conditions:**
    1.  All numbers must be connected in exact sequential order.
    2.  100% of the grid tiles must be filled.
    3.  Paths cannot cross themselves or overlap.

### 2. Level Progression & Complexity:
* Do not hardcode just a few levels. Instead, write a **Procedural Level Generator algorithm**.
* The generator should create a valid Hamiltonian path on a given grid size, randomly reveal a small subset of the numbers along that path as "anchors", and clear the rest for the player to solve.
* **Difficulties:**
    * *Level 1-5:* 4x4 grid (many hints provided)
    * *Level 6-15:* 5x5 grid (moderate hints)
    * *Level 16-30:* 6x6 grid (fewer hints)
    * *Endless Mode:* Dynamically scales up to 10x10 grid.

### 3. Scoring & Timed Levels:
* Implement a **Timer Mechanism**: A countdown timer for each level.
* **Points System:** * Base points awarded for solving the puzzle.
    * Bonus points awarded based on the time remaining.
    * Penalty deductions for using a "Hint" button or clearing/resetting the board too many times.

### 4. Wordle-Style Shareable Results:
* Upon completing a daily challenge or a specific level tier, show a "Share" button.
* Generate a copy-to-clipboard string with emojis representing their gameplay.
    * *Example Output:*
        ```text
        Zip Logic Puzzle - Level 12
        Time: 1m 14s | Score: 8,450
        🟩🟩🟩🟩🟩
        🟩🟦🟦🟦🟩
        🟩🟦🟪🟦🟩
        🟩🟦🟦🟦🟩
        🟩🟩🟩🟩🟩
        Play here: [Insert URL]
        ```

### 5. Technical Architecture & File Structure:
Please provide the code broken down logically so I can drop it right into my repo. Include:
1.  **`ZipGame.tsx`** (The main game container and UI layout).
2.  **`useZipLogic.ts`** (Custom hook handling state: current path, drawing state, timer, score, undo/redo).
3.  **`LevelGenerator.ts`** (The logic/algorithm that generates valid, solvable boards of varying sizes).
4.  **`ZipBoard.tsx`** (The grid component handling touch/mouse drag events for drawing the path).
5.  **`ShareModal.tsx`** (The end-game summary and clipboard functionality).

**Specific UI Requirements:**
* Clean, minimalistic, corporate-friendly aesthetic (similar to LinkedIn/NYT games).
* Smooth CSS transitions when drawing paths (e.g., lines connecting the centers of the grid squares).
* Responsive design that works flawlessly on mobile (touch events) and desktop (mouse drag).

**Please begin by writing the `LevelGenerator.ts` to ensure the puzzle logic is mathematically sound, then proceed to the Game Hook and UI components.**

***

### 💡 Tips for Using This Prompt:
1. **Choose your Tech Stack:** Before pasting, change the `[Insert Your Tech Stack Here]` bracket to match your repo (e.g., "Vanilla HTML/JS/CSS", "Next.js and Tailwind", "Vue 3").
2. **Handle the Math:** Hamiltonian paths (filling a grid perfectly) can be mathematically intensive for an AI to generate on the fly for very large grids. The prompt asks for an algorithm, which the AI will likely solve using a *depth-first search (DFS) backtracking algorithm* to create the path, which works perfectly for grids up to 8x8 or 10x10.
3. **Mobile First:** Because drawing paths requires dragging, making sure the AI implements touch events (`onTouchStart`, `onTouchMove`) alongside mouse events is critical—this is already handled in the prompt's instructions!
