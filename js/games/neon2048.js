import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class Neon2048 {
    constructor() {
        this.grid = [];
        this.size = 4;
        this.score = 0;
        this.container = null;
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.gameOver = false;
        this.hasWon = false;
        this.moveLock = false; // Prevent rapid firing

        // Input handling
        this.keyDownHandler = this.handleInput.bind(this);
    }

    async init(container) {
        this.container = container;
        this.score = 0;
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.gameOver = false;
        this.hasWon = false;

        this.renderLayout();
        this.addRandomTile();
        this.addRandomTile();
        this.updateView();

        window.addEventListener('keydown', this.keyDownHandler);
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full w-full select-none font-mono">
                <div class="mb-4 text-center">
                    <h2 class="text-4xl font-bold text-cyan-400 neon-text mb-2">NEON 2048</h2>
                    <div class="text-xl text-white">Score: <span id="n2048-score" class="text-yellow-400">0</span></div>
                    <div class="text-xs text-slate-400 mt-2">Use Arrow Keys or WASD to Move</div>
                </div>

                <div id="n2048-grid" class="relative bg-slate-900 border-4 border-cyan-800 rounded-lg p-2"
                     style="width: 340px; height: 340px; display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); gap: 10px;">
                    <!-- Cells generated via JS -->
                </div>
            </div>
            <style>
                .n2048-tile {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 24px;
                    font-weight: bold;
                    border-radius: 4px;
                    transition: all 0.15s ease-in-out;
                    color: #fff;
                    box-shadow: 0 0 5px currentColor;
                }
                .tile-0 { background: rgba(255, 255, 255, 0.05); box-shadow: none; color: transparent; }
                .tile-2 { background: #eee4da; color: #776e65; box-shadow: 0 0 10px #eee4da; }
                .tile-4 { background: #ede0c8; color: #776e65; box-shadow: 0 0 10px #ede0c8; }
                .tile-8 { background: #f2b179; color: #f9f6f2; box-shadow: 0 0 15px #f2b179; }
                .tile-16 { background: #f59563; color: #f9f6f2; box-shadow: 0 0 15px #f59563; }
                .tile-32 { background: #f67c5f; color: #f9f6f2; box-shadow: 0 0 20px #f67c5f; }
                .tile-64 { background: #f65e3b; color: #f9f6f2; box-shadow: 0 0 20px #f65e3b; }
                .tile-128 { background: #edcf72; color: #f9f6f2; box-shadow: 0 0 25px #edcf72; font-size: 20px; }
                .tile-256 { background: #edcc61; color: #f9f6f2; box-shadow: 0 0 25px #edcc61; font-size: 20px; }
                .tile-512 { background: #edc850; color: #f9f6f2; box-shadow: 0 0 30px #edc850; font-size: 20px; }
                .tile-1024 { background: #edc53f; color: #f9f6f2; box-shadow: 0 0 30px #edc53f; font-size: 16px; }
                .tile-2048 { background: #edc22e; color: #f9f6f2; box-shadow: 0 0 40px #edc22e; font-size: 16px; }

                /* Neon Cyberpunk Overrides */
                .tile-2 { background: transparent; border: 2px solid #0ff; color: #0ff; box-shadow: 0 0 5px #0ff; }
                .tile-4 { background: transparent; border: 2px solid #0f0; color: #0f0; box-shadow: 0 0 5px #0f0; }
                .tile-8 { background: transparent; border: 2px solid #ff0; color: #ff0; box-shadow: 0 0 10px #ff0; }
                .tile-16 { background: transparent; border: 2px solid #f0f; color: #f0f; box-shadow: 0 0 10px #f0f; }
                .tile-32 { background: transparent; border: 2px solid #f00; color: #f00; box-shadow: 0 0 15px #f00; }
                .tile-64 { background: rgba(255, 0, 0, 0.2); border: 2px solid #f00; color: #fff; box-shadow: 0 0 20px #f00; }
                .tile-128 { background: rgba(0, 255, 255, 0.2); border: 2px solid #0ff; color: #fff; box-shadow: 0 0 20px #0ff; }
                /* And so on... simplified for now */
            </style>
        `;
    }

    updateView() {
        const gridEl = document.getElementById('n2048-grid');
        if (!gridEl) return;

        gridEl.innerHTML = '';
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const val = this.grid[r][c];
                const tile = document.createElement('div');
                tile.className = `n2048-tile tile-${val}`;
                tile.textContent = val > 0 ? val : '';
                gridEl.appendChild(tile);
            }
        }

        const scoreEl = document.getElementById('n2048-score');
        if (scoreEl) scoreEl.textContent = this.score;
    }

    addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) emptyCells.push({r, c});
            }
        }

        if (emptyCells.length > 0) {
            const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    handleInput(e) {
        if (this.gameOver || this.moveLock) return;

        let moved = false;
        const key = e.key;

        if (key === 'ArrowUp' || key.toLowerCase() === 'w') moved = this.moveUp();
        else if (key === 'ArrowDown' || key.toLowerCase() === 's') moved = this.moveDown();
        else if (key === 'ArrowLeft' || key.toLowerCase() === 'a') moved = this.moveLeft();
        else if (key === 'ArrowRight' || key.toLowerCase() === 'd') moved = this.moveRight();

        if (moved) {
            this.soundManager.playSound('click'); // Or a custom slide sound
            this.addRandomTile();
            this.updateView();
            this.checkStatus();

            // Debounce
            this.moveLock = true;
            setTimeout(() => this.moveLock = false, 100);
        }
    }

    // Logic for sliding/merging
    moveLeft() {
        let moved = false;
        for (let r = 0; r < this.size; r++) {
            let row = this.grid[r].filter(val => val !== 0);
            for (let i = 0; i < row.length - 1; i++) {
                if (row[i] === row[i + 1]) {
                    row[i] *= 2;
                    this.score += row[i];
                    row.splice(i + 1, 1);
                    this.soundManager.playSound('score');
                    moved = true; // Merge counts as move
                }
            }
            while (row.length < this.size) row.push(0);
            if (row.join(',') !== this.grid[r].join(',')) moved = true;
            this.grid[r] = row;
        }
        return moved;
    }

    moveRight() {
        let moved = false;
        for (let r = 0; r < this.size; r++) {
            let row = this.grid[r].filter(val => val !== 0);
            for (let i = row.length - 1; i > 0; i--) {
                if (row[i] === row[i - 1]) {
                    row[i] *= 2;
                    this.score += row[i];
                    row.splice(i - 1, 1);
                    this.soundManager.playSound('score');
                    moved = true;
                    i--; // Skip next since we just merged into it
                }
            }
            while (row.length < this.size) row.unshift(0);
            if (row.join(',') !== this.grid[r].join(',')) moved = true;
            this.grid[r] = row;
        }
        return moved;
    }

    moveUp() {
        let moved = false;
        for (let c = 0; c < this.size; c++) {
            let col = [];
            for (let r = 0; r < this.size; r++) col.push(this.grid[r][c]);

            let original = [...col];
            col = col.filter(val => val !== 0);

            for (let i = 0; i < col.length - 1; i++) {
                if (col[i] === col[i+1]) {
                    col[i] *= 2;
                    this.score += col[i];
                    col.splice(i+1, 1);
                    this.soundManager.playSound('score');
                    moved = true;
                }
            }
            while (col.length < this.size) col.push(0);

            for (let r = 0; r < this.size; r++) this.grid[r][c] = col[r];
            if (original.join(',') !== col.join(',')) moved = true;
        }
        return moved;
    }

    moveDown() {
        let moved = false;
        for (let c = 0; c < this.size; c++) {
            let col = [];
            for (let r = 0; r < this.size; r++) col.push(this.grid[r][c]);

            let original = [...col];
            col = col.filter(val => val !== 0);

            for (let i = col.length - 1; i > 0; i--) {
                if (col[i] === col[i-1]) {
                    col[i] *= 2;
                    this.score += col[i];
                    col.splice(i-1, 1);
                    this.soundManager.playSound('score');
                    moved = true;
                    i--;
                }
            }
            while (col.length < this.size) col.unshift(0);

            for (let r = 0; r < this.size; r++) this.grid[r][c] = col[r];
            if (original.join(',') !== col.join(',')) moved = true;
        }
        return moved;
    }

    checkStatus() {
        // Check for 2048
        if (!this.hasWon) {
            for (let r = 0; r < this.size; r++) {
                for (let c = 0; c < this.size; c++) {
                    if (this.grid[r][c] === 2048) {
                        this.hasWon = true;
                        this.soundManager.playSound('jump'); // Victory sound placeholder
                    }
                }
            }
        }

        // Check for Game Over (Full and no moves)
        let empty = 0;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) empty++;
            }
        }

        if (empty === 0) {
            // Check if any merges are possible
            let canMove = false;
            // Check rows
            for (let r = 0; r < this.size; r++) {
                for (let c = 0; c < this.size - 1; c++) {
                    if (this.grid[r][c] === this.grid[r][c+1]) canMove = true;
                }
            }
            // Check cols
            for (let c = 0; c < this.size; c++) {
                for (let r = 0; r < this.size - 1; r++) {
                    if (this.grid[r][c] === this.grid[r+1][c]) canMove = true;
                }
            }

            if (!canMove) {
                this.gameOver = true;
                this.soundManager.playSound('gameover');
                window.miniGameHub.showGameOver(this.score, () => this.init(this.container));
            }
        }
    }

    update(dt) {
        // No real-time updates needed for 2048
    }

    draw() {
        // Handled by DOM updates in handleInput
    }

    shutdown() {
        window.removeEventListener('keydown', this.keyDownHandler);
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
