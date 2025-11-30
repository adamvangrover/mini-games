import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class EclipsePuzzleGame {
    constructor() {
        this.grid = [];
        this.initialGrid = [];
        this.solution = [];
        this.clues = [];
        this.isGameWon = false;
        this.time = 0;
        this.timerInterval = null;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        this.container = container;

        // Inject UI if missing
        let gridEl = container.querySelector('#eclipse-puzzle-grid');
        if (!gridEl) {
             container.innerHTML = `
                <h2 class="text-3xl font-bold mb-4 text-cyan-400">🧩 Eclipse Puzzle</h2>
                <p class="text-slate-400 text-sm mb-4">Rule: 3 Suns/Moons per row/col. No 3 same adjacent.</p>
                <div class="relative w-[300px] h-[300px] mx-auto mb-4">
                     <div id="eclipse-puzzle-grid" class="absolute inset-0 grid grid-cols-6 gap-1 bg-slate-700 p-1 rounded"></div>
                     <div id="eclipse-puzzle-clue-layer" class="absolute inset-0 pointer-events-none"></div>
                </div>

                <div class="flex justify-between items-center max-w-[300px] mx-auto mb-4 text-slate-300">
                    <div id="eclipse-puzzle-timer" class="font-mono text-white">Time: 0s</div>
                    <div class="space-x-2">
                        <button id="eclipse-puzzle-validate-btn" class="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm">Validate</button>
                        <button id="eclipse-puzzle-reset-btn" class="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-sm">Reset</button>
                    </div>
                </div>

                <div id="ep-message" class="h-6 font-bold text-center"></div>
                <button class="back-btn mt-6 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Back</button>
             `;
             gridEl = container.querySelector('#eclipse-puzzle-grid');
             container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.gridElement = gridEl;
        this.clueLayer = container.querySelector('#eclipse-puzzle-clue-layer');
        this.timerElement = container.querySelector('#eclipse-puzzle-timer');
        this.messageElement = container.querySelector('#ep-message');

        this.validateBtn = container.querySelector('#eclipse-puzzle-validate-btn');
        this.resetBtn = container.querySelector('#eclipse-puzzle-reset-btn');

        this.validateBtn.onclick = () => this.handleValidate();
        this.resetBtn.onclick = () => this.handleReset();

        this.generateDailyPuzzle();
        this.renderGrid();
        this.renderClues();
        this.startTimer();
    }

    shutdown() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (this.validateBtn) this.validateBtn.onclick = null;
        if (this.resetBtn) this.resetBtn.onclick = null;
    }

    // --- Puzzle Generation Logic ---
    mulberry32(seed) {
        return () => {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    checkBalance(grid) {
        const size = grid.length;
        const half = size / 2;
        for (let i = 0; i < size; i++) {
            let rowSunCount = 0;
            let colSunCount = 0;
            for (let j = 0; j < size; j++) {
                if (grid[i][j] === 1) rowSunCount++;
                if (grid[j][i] === 1) colSunCount++;
            }
            if (rowSunCount > half || colSunCount > half) return false;
        }
        return true;
    }

    checkNeighbors(grid) {
        const size = grid.length;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (grid[i][j] === 0) continue;
                if (j < size - 2 && grid[i][j] === grid[i][j + 1] && grid[i][j] === grid[i][j + 2]) return false;
                if (i < size - 2 && grid[i][j] === grid[i + 1][j] && grid[i][j] === grid[i + 2][j]) return false;
            }
        }
        return true;
    }

    fillGrid(grid, random) {
        const size = grid.length;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (grid[i][j] === 0) {
                    const numbers = random() > 0.5 ? [1, 2] : [2, 1];
                    for (const num of numbers) {
                        grid[i][j] = num;
                        if (this.checkBalance(grid) && this.checkNeighbors(grid)) {
                            if (this.fillGrid(grid, random)) {
                                return true;
                            }
                        }
                    }
                    grid[i][j] = 0;
                    return false;
                }
            }
        }
        return true;
    }

    generateDailyPuzzle() {
        const dateString = new Date().toISOString().slice(0, 10);
        const seed = dateString.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0);
        const random = this.mulberry32(seed);
        const size = 6;

        let solution = Array(size).fill(0).map(() => Array(size).fill(0));
        this.fillGrid(solution, random);

        let puzzle = solution.map(row => [...row]);
        const cells = [];
        for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) cells.push({ r: i, c: j });

        for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }

        let removedCount = 0;
        for (const cell of cells) {
            if (removedCount > 20) break;
            puzzle[cell.r][cell.c] = 0;
            removedCount++;
        }

        this.clues = [
            { type: '=', cells: [{r:0, c:1}, {r:0, c:2}] },
            { type: '×', cells: [{r:1, c:4}, {r:2, c:4}] },
            { type: '=', cells: [{r:5, c:0}, {r:5, c:1}] },
        ];
        this.solution = solution;
        this.grid = puzzle.map(row => [...row]);
        this.initialGrid = puzzle.map(row => [...row]);
    }

    validateSolution(grid) {
        const size = grid.length;
        const half = size / 2;

        if (grid.flat().some(cell => cell === 0)) return false;

        for (let i = 0; i < size; i++) {
            if (grid[i].filter(c => c === 1).length !== half) return false;
            if (grid.map(row => row[i]).filter(c => c === 1).length !== half) return false;
        }

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (c < size - 2 && grid[r][c] === grid[r][c+1] && grid[r][c] === grid[r][c+2]) return false;
                if (r < size - 2 && grid[r][c] === grid[r+1][c] && grid[r][c] === grid[r+2][c]) return false;
            }
        }

        for(const clue of this.clues) {
            const [cell1, cell2] = clue.cells;
            const val1 = grid[cell1.r][cell1.c];
            const val2 = grid[cell2.r][cell2.c];
            if (clue.type === '=' && val1 !== val2) return false;
            if (clue.type === '×' && val1 === val2) return false;
        }

        return true;
    }

    renderGrid() {
        this.gridElement.innerHTML = '';
        this.grid.forEach((row, r) => {
            row.forEach((cellValue, c) => {
                const cell = document.createElement('div');
                cell.className = 'w-full h-full bg-slate-800 border border-slate-600 flex items-center justify-center text-2xl cursor-pointer hover:bg-slate-600 transition-colors select-none';
                if (this.initialGrid[r][c] !== 0) {
                    cell.classList.add('bg-slate-900', 'cursor-default');
                    cell.classList.remove('cursor-pointer', 'hover:bg-slate-600');
                }
                cell.dataset.r = r;
                cell.dataset.c = c;
                this.updateCellContent(cell, cellValue);
                cell.addEventListener('click', () => this.handleCellClick(r, c));
                this.gridElement.appendChild(cell);
            });
        });
    }

    renderClues() {
        this.clueLayer.innerHTML = '';
        this.clues.forEach((clue) => {
            const [cell1, cell2] = clue.cells;
            const isHorizontal = cell1.r === cell2.r;
            const clueEl = document.createElement('div');
            clueEl.className = 'flex items-center justify-center bg-slate-800 text-white text-xs font-bold w-4 h-4 rounded-full border border-slate-500 z-10';
            clueEl.textContent = clue.type;
            clueEl.style.position = 'absolute';
            // Simple percentage positioning
            const row = Math.min(cell1.r, cell2.r);
            const col = Math.min(cell1.c, cell2.c);

            if (isHorizontal) {
                clueEl.style.top = `calc(${(row + 0.5) * 16.66}% - 8px)`;
                clueEl.style.left = `calc(${(col + 1) * 16.66}% - 8px)`; // Middle of two cells
            } else {
                clueEl.style.top = `calc(${(row + 1) * 16.66}% - 8px)`;
                clueEl.style.left = `calc(${(col + 0.5) * 16.66}% - 8px)`;
            }

            this.clueLayer.appendChild(clueEl);
        });
    }

    updateCellContent(cellElement, value) {
        if (value === 1) {
            cellElement.innerHTML = '☀️';
            cellElement.style.color = '#f59e0b';
        } else if (value === 2) {
            cellElement.innerHTML = '🌑';
            cellElement.style.color = '#3b82f6';
        } else {
            cellElement.innerHTML = '';
        }
    }

    handleCellClick(row, col) {
        if (this.isGameWon || this.initialGrid[row][col] !== 0) return;

        const newGrid = this.grid.map(r => [...r]);
        newGrid[row][col] = (newGrid[row][col] + 1) % 3; // 0 -> 1 -> 2 -> 0
        this.grid = newGrid;

        const cellEl = this.gridElement.querySelector(`div[data-r='${row}'][data-c='${col}']`);
        this.updateCellContent(cellEl, this.grid[row][col]);
        this.soundManager.playTone(400 + (this.grid[row][col] * 100), 'sine', 0.05);
    }

    handleValidate() {
        if (this.validateSolution(this.grid)) {
            this.isGameWon = true;
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.soundManager.playSound('score');
            this.showMessage(`Solved in ${this.time}s!`, false);
        } else {
            this.soundManager.playTone(200, 'sawtooth', 0.1);
            this.showMessage('Not quite right.', true);
        }
    }

    showMessage(msg, isError) {
        this.messageElement.textContent = msg;
        this.messageElement.className = `h-6 font-bold text-center ${isError ? 'text-red-500' : 'text-green-400'}`;
        setTimeout(() => this.messageElement.textContent = '', 3000);
    }

    handleReset() {
        this.grid = this.initialGrid.map(row => [...row]);
        this.isGameWon = false;
        this.time = 0;
        this.renderGrid();
        this.startTimer();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.time = 0;
        this.timerElement.textContent = `Time: 0s`;
        this.timerInterval = setInterval(() => {
            this.time++;
            this.timerElement.textContent = `Time: ${this.time}s`;
        }, 1000);
    }
}
