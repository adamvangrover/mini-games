import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class EclipseGame {
    constructor() {
        this.GRID_SIZE = 6;
        this.SYMBOLS = { BLANK: 0, SUN: 1, MOON: 2 };
        this.grid = [];
        this.solution = [];
        this.initialClues = [];
        this.timerInterval = null;
        this.startTime = 0;
        this.messageTimeout = null;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        this.container = container;

        // Inject UI if needed
        let gridEl = container.querySelector('#eclipse-grid');
        if (!gridEl) {
             container.innerHTML = `
                <h2 class="text-3xl font-bold mb-4 text-yellow-400">☀️ Eclipse</h2>
                <div id="eclipse-grid" class="grid gap-1 mx-auto bg-slate-700 p-2 rounded max-w-[300px]"></div>

                <div id="eclipse-info" class="flex justify-between items-center max-w-[300px] mx-auto mt-4 text-slate-300">
                    <p>Time: <span id="eclipse-timer" class="font-mono text-white">0</span>s</p>
                    <div class="space-x-2">
                        <button id="eclipse-hint-btn" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm">Hint</button>
                        <button id="eclipse-share-btn" class="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm" disabled>Share</button>
                    </div>
                </div>

                <div id="eclipse-message" class="h-6 mt-2 font-bold text-center"></div>
                <button class="back-btn mt-6 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Back</button>
             `;
             gridEl = container.querySelector('#eclipse-grid');
             container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.gridElement = gridEl;
        this.timerElement = container.querySelector('#eclipse-timer');
        this.hintButton = container.querySelector('#eclipse-hint-btn');
        this.shareButton = container.querySelector('#eclipse-share-btn');
        this.messageElement = container.querySelector('#eclipse-message');

        // Handlers (bound)
        this.cellClickHandler = (e) => this.handleCellClick(e);
        this.hintHandler = () => this.giveHint();
        this.shareHandler = () => this.shareResult();

        this.gridElement.addEventListener('click', this.cellClickHandler);
        this.hintButton.addEventListener('click', this.hintHandler);
        this.shareButton.addEventListener('click', this.shareHandler);
        this.shareButton.disabled = true;

        this.resetGame();
    }

    resetGame() {
        this.generatePuzzle();
        this.createGrid();
        this.startTimer();
    }

    shutdown() {
        this.stopTimer();
        if (this.gridElement) {
             this.gridElement.removeEventListener('click', this.cellClickHandler);
        }
        if (this.hintButton) this.hintButton.removeEventListener('click', this.hintHandler);
        if (this.shareButton) this.shareButton.removeEventListener('click', this.shareHandler);
        clearTimeout(this.messageTimeout);
    }

    // Puzzle Generation & Solving
    isValid(grid, row, col, symbol) {
        const tempGrid = grid.map(r => [...r]);
        tempGrid[row][col] = symbol;
        const halfGrid = this.GRID_SIZE / 2;
        if (col > 1 && tempGrid[row][col - 1] === symbol && tempGrid[row][col - 2] === symbol) return false;
        if (col < this.GRID_SIZE - 2 && tempGrid[row][col + 1] === symbol && tempGrid[row][col + 2] === symbol) return false;
        if (col > 0 && col < this.GRID_SIZE - 1 && tempGrid[row][col - 1] === symbol && tempGrid[row][col + 1] === symbol) return false;
        if (row > 1 && tempGrid[row - 1][col] === symbol && tempGrid[row - 2][col] === symbol) return false;
        if (row < this.GRID_SIZE - 2 && tempGrid[row + 1][col] === symbol && tempGrid[row + 2][col] === symbol) return false;
        if (row > 0 && row < this.GRID_SIZE - 1 && tempGrid[row - 1][col] === symbol && tempGrid[row + 1][col] === symbol) return false;
        let sunsInRow = 0, moonsInRow = 0, sunsInCol = 0, moonsInCol = 0;
        for (let i = 0; i < this.GRID_SIZE; i++) {
            if (tempGrid[row][i] === this.SYMBOLS.SUN) sunsInRow++;
            if (tempGrid[row][i] === this.SYMBOLS.MOON) moonsInRow++;
            if (tempGrid[i][col] === this.SYMBOLS.SUN) sunsInCol++;
            if (tempGrid[i][col] === this.SYMBOLS.MOON) moonsInCol++;
        }
        if (sunsInRow > halfGrid || moonsInRow > halfGrid || sunsInCol > halfGrid || moonsInCol > halfGrid) return false;
        return true;
    }

    solve(grid) {
        let solutions = [];
        const findSolutions = (currentGrid) => {
            if (solutions.length > 1) return;
            const findEmpty = () => {
                for (let r = 0; r < this.GRID_SIZE; r++) for (let c = 0; c < this.GRID_SIZE; c++) if (currentGrid[r][c] === this.SYMBOLS.BLANK) return [r, c];
                return null;
            };
            const empty = findEmpty();
            if (!empty) {
                solutions.push(currentGrid.map(r => [...r]));
                return;
            }
            const [row, col] = empty;
            const symbolsToTry = [this.SYMBOLS.SUN, this.SYMBOLS.MOON].sort(() => Math.random() - 0.5);
            for (const symbol of symbolsToTry) {
                if (this.isValid(currentGrid, row, col, symbol)) {
                    currentGrid[row][col] = symbol;
                    findSolutions(currentGrid);
                    currentGrid[row][col] = this.SYMBOLS.BLANK;
                }
            }
        };
        findSolutions(grid.map(r => [...r]));
        return solutions;
    }

    generatePuzzle() {
        this.solution = Array(this.GRID_SIZE).fill(0).map(() => Array(this.GRID_SIZE).fill(this.SYMBOLS.BLANK));
        const solved = this.solve(this.solution);
        if (solved.length > 0) this.solution = solved[0];
        else {
             this.solution = Array(this.GRID_SIZE).fill(0).map(() => Array(this.GRID_SIZE).fill(this.SYMBOLS.SUN));
        }
        let puzzle = this.solution.map(r => [...r]);
        let cells = [];
        for(let r=0; r<this.GRID_SIZE; r++) for(let c=0; c<this.GRID_SIZE; c++) cells.push([r,c]);
        cells.sort(() => Math.random() - 0.5);
        for(const [r, c] of cells) {
            const temp = puzzle[r][c];
            puzzle[r][c] = this.SYMBOLS.BLANK;
            if (this.solve(puzzle).length !== 1) {
                puzzle[r][c] = temp;
            }
        }
        this.grid = puzzle;
        this.initialClues = [];
        for (let r = 0; r < this.GRID_SIZE; r++) for (let c = 0; c < this.GRID_SIZE; c++) if (this.grid[r][c] !== this.SYMBOLS.BLANK) this.initialClues.push({r, c});
    }

    // UI & Game Logic
    isClue(row, col) { return this.initialClues.some(clue => clue.r === row && clue.c === col); }

    createGrid() {
        this.gridElement.innerHTML = '';
        this.gridElement.style.gridTemplateColumns = `repeat(${this.GRID_SIZE}, 1fr)`;
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = "w-10 h-10 bg-slate-800 border border-slate-600 flex items-center justify-center text-xl cursor-pointer hover:bg-slate-600 transition-colors select-none";
                cell.dataset.row = r;
                cell.dataset.col = c;
                if (this.isClue(r, c)) {
                    cell.classList.add('bg-slate-900', 'cursor-default');
                    cell.classList.remove('cursor-pointer', 'hover:bg-slate-600');
                }
                this.updateCell(cell, this.grid[r][c]);
                this.gridElement.appendChild(cell);
            }
        }
    }

    updateCell(cellElement, symbol) {
        const symbolMap = { [this.SYMBOLS.BLANK]: '', [this.SYMBOLS.SUN]: '☀️', [this.SYMBOLS.MOON]: '🌑' };
        cellElement.textContent = symbolMap[symbol];
    }

    handleCellClick(event) {
        const cell = event.target.closest('div');
        if (!cell || !cell.dataset.row || this.isClue(parseInt(cell.dataset.row), parseInt(cell.dataset.col))) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.grid[row][col] = (this.grid[row][col] + 1) % 3;
        this.updateCell(cell, this.grid[row][col]);
        this.soundManager.playTone(400 + (this.grid[row][col] * 100), 'sine', 0.05);
        this.validateAndFeedback();
        this.checkWinCondition();
    }

    getCell(row, col) { return this.gridElement.querySelector(`[data-row='${row}'][data-col='${col}']`); }

    validateAndFeedback() {
        this.gridElement.querySelectorAll('.bg-red-500').forEach(cell => cell.classList.remove('bg-red-500'));
        const halfGrid = this.GRID_SIZE / 2;
        for (let i = 0; i < this.GRID_SIZE; i++) {
            let rS = 0, rM = 0, cS = 0, cM = 0;
            for (let j = 0; j < this.GRID_SIZE; j++) {
                if (this.grid[i][j] === this.SYMBOLS.SUN) rS++; if (this.grid[i][j] === this.SYMBOLS.MOON) rM++;
                if (this.grid[j][i] === this.SYMBOLS.SUN) cS++; if (this.grid[j][i] === this.SYMBOLS.MOON) cM++;
            }
            if (rS > halfGrid || rM > halfGrid) for (let j = 0; j < this.GRID_SIZE; j++) if(this.grid[i][j]!==0) this.getCell(i,j).classList.add('bg-red-500');
            if (cS > halfGrid || cM > halfGrid) for (let j = 0; j < this.GRID_SIZE; j++) if(this.grid[j][i]!==0) this.getCell(j,i).classList.add('bg-red-500');
        }
        for (let r = 0; r < this.GRID_SIZE; r++) for (let c = 0; c < this.GRID_SIZE - 2; c++) {
            const s = this.grid[r][c]; if (s !== 0 && s === this.grid[r][c+1] && s === this.grid[r][c+2]) [0,1,2].forEach(i=>this.getCell(r,c+i).classList.add('bg-red-500'));
        }
        for (let c = 0; c < this.GRID_SIZE; c++) for (let r = 0; r < this.GRID_SIZE - 2; r++) {
            const s = this.grid[r][c]; if (s !== 0 && s === this.grid[r+1][c] && s === this.grid[r+2][c]) [0,1,2].forEach(i=>this.getCell(r+i,c).classList.add('bg-red-500'));
        }
    }

    checkWinCondition() {
        const isComplete = !this.grid.flat().some(s => s === this.SYMBOLS.BLANK);
        const hasErrors = this.gridElement.querySelector('.bg-red-500');
        if (isComplete && !hasErrors) {
            this.stopTimer();
            this.shareButton.disabled = false;
            this.showMessage(`You solved it in ${this.timerElement.textContent}s!`);
            this.soundManager.playSound('score');
        }
    }

    giveHint() {
        const emptyCells = [];
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                if (this.grid[r][c] === this.SYMBOLS.BLANK) {
                    emptyCells.push({r, c});
                }
            }
        }
        if (emptyCells.length === 0) return;
        const hintCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const { r, c } = hintCell;
        const correctSymbol = this.solution[r][c];
        this.grid[r][c] = correctSymbol;
        this.updateCell(this.getCell(r, c), correctSymbol);
        this.validateAndFeedback();
        this.checkWinCondition();
        this.soundManager.playSound('click');
    }

    shareResult() {
        const time = this.timerElement.textContent;
        const symbolMap = { [this.SYMBOLS.SUN]: '☀️', [this.SYMBOLS.MOON]: '🌑' };
        let gridString = `Eclipse Puzzle - Solved in ${time}s!\n\n`;
        this.grid.forEach(row => {
            gridString += row.map(cell => symbolMap[cell]).join('') + '\n';
        });
        navigator.clipboard.writeText(gridString).then(() => {
            this.showMessage('Copied to clipboard!');
        }).catch(() => {
            this.showMessage('Failed to copy!', true);
        });
    }

    showMessage(msg, isError = false) {
        clearTimeout(this.messageTimeout);
        this.messageElement.textContent = msg;
        this.messageElement.className = `h-6 mt-2 font-bold text-center ${isError ? 'text-red-500' : 'text-green-400'}`;
        this.messageTimeout = setTimeout(() => {
            this.messageElement.textContent = '';
        }, 3000);
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.timerElement.textContent = elapsedTime;
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }
}
