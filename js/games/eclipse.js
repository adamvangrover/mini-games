import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class EclipseGame {
    constructor() {
        // Game Configuration
        this.GRID_SIZE = 6; // Default, changes with level
        this.SYMBOLS = { BLANK: 0, SUN: 1, MOON: 2 };
        
        // State
        this.grid = [];
        this.solution = [];
        this.initialClues = [];
        this.level = 1;
        
        // Timing & Intervals
        this.timerInterval = null;
        this.startTime = 0;
        this.messageTimeout = null;
        this.feedbackTimeout = null;

        // Managers
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        this.container = container;

        // Inject UI
        let gridEl = container.querySelector('#eclipse-grid');
        if (!gridEl) {
             container.innerHTML = `
                <div class="flex flex-col items-center w-full max-w-md mx-auto">
                    <h2 class="text-3xl font-bold mb-2 text-yellow-400">☀️ Eclipse</h2>
                    
                    <div class="flex gap-4 mb-4 w-full justify-center">
                        <div class="bg-slate-800 px-3 py-1 rounded text-white text-sm border border-slate-600">
                            Level: <span id="eclipse-level" class="font-bold text-yellow-300">1</span>
                        </div>
                        <div class="bg-slate-800 px-3 py-1 rounded text-white text-sm border border-slate-600">
                            Time: <span id="eclipse-timer" class="font-mono text-white">0</span>s
                        </div>
                    </div>

                    <div id="eclipse-grid" class="grid gap-1 mx-auto bg-slate-700 p-2 rounded shadow-lg shadow-yellow-500/10 transition-all duration-300"></div>

                    <div class="flex gap-4 mt-4">
                        <button id="eclipse-hint-btn" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold shadow transition-colors">Hint</button>
                        <button id="eclipse-share-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-bold shadow transition-colors" disabled>Share</button>
                    </div>

                    <button id="eclipse-next-level-btn" class="hidden mt-4 bg-green-500 hover:bg-green-400 text-white px-6 py-2 rounded font-bold shadow-lg shadow-green-500/20 animate-pulse transition-all">
                        Next Level <i class="fas fa-arrow-right ml-2"></i>
                    </button>

                    <div id="eclipse-message" class="h-6 mt-2 font-bold text-center text-sm"></div>
                    
                    <button class="back-btn mt-6 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors">Back</button>
                </div>
             `;
             
             gridEl = container.querySelector('#eclipse-grid');
             container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        // DOM Elements
        this.gridElement = gridEl;
        this.timerElement = container.querySelector('#eclipse-timer');
        this.levelElement = container.querySelector('#eclipse-level');
        this.hintButton = container.querySelector('#eclipse-hint-btn');
        this.shareButton = container.querySelector('#eclipse-share-btn');
        this.nextLevelButton = container.querySelector('#eclipse-next-level-btn');
        this.messageElement = container.querySelector('#eclipse-message');

        // Event Handlers (bound)
        this.cellClickHandler = (e) => this.handleCellClick(e);
        this.hintHandler = () => this.giveHint();
        this.shareHandler = () => this.shareResult();
        this.nextLevelHandler = () => this.startLevel(this.level + 1);

        // Attach Listeners
        this.gridElement.addEventListener('click', this.cellClickHandler);
        this.hintButton.addEventListener('click', this.hintHandler);
        this.shareButton.addEventListener('click', this.shareHandler);
        this.nextLevelButton.addEventListener('click', this.nextLevelHandler);
        
        // Start Game
        this.startLevel(1);
    }

    startLevel(level) {
        this.level = level;
        this.levelElement.textContent = level;
        this.nextLevelButton.classList.add('hidden');
        this.shareButton.disabled = true;
        this.hintButton.disabled = false;
        this.clearValidationFeedback();
        
        // Adjust grid size based on level progression
        if (level === 1) this.GRID_SIZE = 4;       // Tutorial size
        else if (level <= 4) this.GRID_SIZE = 6;   // Standard
        else if (level <= 8) this.GRID_SIZE = 8;   // Hard
        else this.GRID_SIZE = 10;                  // Expert

        this.generatePuzzle();
        this.createGrid();
        this.startTimer();
        this.showMessage(`Level ${level} Start!`, false);
    }

    shutdown() {
        this.stopTimer();
        if (this.gridElement) {
             this.gridElement.removeEventListener('click', this.cellClickHandler);
        }
        if (this.hintButton) this.hintButton.removeEventListener('click', this.hintHandler);
        if (this.shareButton) this.shareButton.removeEventListener('click', this.shareHandler);
        if (this.nextLevelButton) this.nextLevelButton.removeEventListener('click', this.nextLevelHandler);
        
        clearTimeout(this.messageTimeout);
        clearTimeout(this.feedbackTimeout);
    }

    // ==========================================
    // Puzzle Logic (Generation & Solving)
    // ==========================================

    isValid(grid, row, col, symbol) {
        const tempGrid = grid.map(r => [...r]);
        tempGrid[row][col] = symbol;
        const halfGrid = this.GRID_SIZE / 2;

        // 1. No more than two of the same symbol adjacent
        // Check Row
        if (col > 1 && tempGrid[row][col - 1] === symbol && tempGrid[row][col - 2] === symbol) return false;
        if (col < this.GRID_SIZE - 2 && tempGrid[row][col + 1] === symbol && tempGrid[row][col + 2] === symbol) return false;
        if (col > 0 && col < this.GRID_SIZE - 1 && tempGrid[row][col - 1] === symbol && tempGrid[row][col + 1] === symbol) return false;
        
        // Check Col
        if (row > 1 && tempGrid[row - 1][col] === symbol && tempGrid[row - 2][col] === symbol) return false;
        if (row < this.GRID_SIZE - 2 && tempGrid[row + 1][col] === symbol && tempGrid[row + 2][col] === symbol) return false;
        if (row > 0 && row < this.GRID_SIZE - 1 && tempGrid[row - 1][col] === symbol && tempGrid[row + 1][col] === symbol) return false;

        // 2. Equal number of Suns and Moons per row/col
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
            if (solutions.length > 1) return; // Optimization: stop if we found more than 1 (uniqueness check)
            
            const findEmpty = () => {
                for (let r = 0; r < this.GRID_SIZE; r++) 
                    for (let c = 0; c < this.GRID_SIZE; c++) 
                        if (currentGrid[r][c] === this.SYMBOLS.BLANK) return [r, c];
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
        // Start with blank grid
        this.solution = Array(this.GRID_SIZE).fill(0).map(() => Array(this.GRID_SIZE).fill(this.SYMBOLS.BLANK));
        
        // Generate a valid full grid
        const solved = this.solve(this.solution);
        if (solved.length > 0) this.solution = solved[0];
        else {
             // Fallback (should rarely happen with valid logic)
             this.solution = Array(this.GRID_SIZE).fill(0).map(() => Array(this.GRID_SIZE).fill(this.SYMBOLS.SUN));
        }

        // Punch holes to create puzzle
        let puzzle = this.solution.map(r => [...r]);
        let cells = [];
        for(let r=0; r<this.GRID_SIZE; r++) for(let c=0; c<this.GRID_SIZE; c++) cells.push([r,c]);
        cells.sort(() => Math.random() - 0.5);

        for(const [r, c] of cells) {
            const temp = puzzle[r][c];
            puzzle[r][c] = this.SYMBOLS.BLANK;
            
            // If removing this creates multiple solutions, put it back
            if (this.solve(puzzle).length !== 1) {
                puzzle[r][c] = temp;
            }
        }

        this.grid = puzzle;
        this.initialClues = [];
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                if (this.grid[r][c] !== this.SYMBOLS.BLANK) this.initialClues.push({r, c});
            }
        }
    }

    // ==========================================
    // DOM & Interaction
    // ==========================================

    isClue(row, col) { return this.initialClues.some(clue => clue.r === row && clue.c === col); }
    getCell(row, col) { return this.gridElement.querySelector(`[data-row='${row}'][data-col='${col}']`); }

    createGrid() {
        this.gridElement.innerHTML = '';
        this.gridElement.style.gridTemplateColumns = `repeat(${this.GRID_SIZE}, 1fr)`;
        // Limit width for larger grids to avoid overflow, scale cells for smaller grids
        this.gridElement.style.maxWidth = `${Math.max(300, this.GRID_SIZE * 50)}px`;
        
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = "aspect-square w-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xl cursor-pointer hover:bg-slate-600 transition-all select-none rounded-sm";
                cell.dataset.row = r;
                cell.dataset.col = c;

                if (this.isClue(r, c)) {
                    cell.classList.add('bg-slate-900', 'cursor-default');
                    cell.classList.remove('cursor-pointer', 'hover:bg-slate-600');
                    cell.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.5)';
                }
                
                this.updateCell(cell, this.grid[r][c]);
                this.gridElement.appendChild(cell);
            }
        }
    }

    updateCell(cellElement, symbol) {
        const symbolMap = { [this.SYMBOLS.BLANK]: '', [this.SYMBOLS.SUN]: '☀️', [this.SYMBOLS.MOON]: '🌑' };
        cellElement.textContent = symbolMap[symbol];
        
        // Add subtle glow to symbols
        if (symbol === this.SYMBOLS.SUN) cellElement.style.textShadow = '0 0 5px #fde047';
        else if (symbol === this.SYMBOLS.MOON) cellElement.style.textShadow = '0 0 5px #60a5fa';
        else cellElement.style.textShadow = 'none';
    }

    handleCellClick(event) {
        // Prevent interaction if level is done
        if (this.nextLevelButton && !this.nextLevelButton.classList.contains('hidden')) return;

        const cell = event.target.closest('div');
        if (!cell || !cell.dataset.row || this.isClue(parseInt(cell.dataset.row), parseInt(cell.dataset.col))) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        // Cycle: Blank -> Sun -> Moon -> Blank
        this.grid[row][col] = (this.grid[row][col] + 1) % 3;
        this.updateCell(cell, this.grid[row][col]);

        // Play Tone (pitch varies slightly by symbol)
        this.soundManager.playTone(400 + (this.grid[row][col] * 100), 'sine', 0.05);
        
        // Remove old error highlights immediately on interaction
        this.clearValidationFeedback();
        
        // Debounce validation: wait 800ms before checking errors
        // This prevents the grid from flashing red while the user is just toggling through
        if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
        this.feedbackTimeout = setTimeout(() => {
            this.validateAndFeedback();
            this.checkWinCondition();
        }, 800);
    }

    clearValidationFeedback() {
        this.gridElement.querySelectorAll('.bg-red-500').forEach(cell => {
            cell.classList.remove('bg-red-500');
            // Restore proper bg based on whether it is a clue or not
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            if (this.isClue(r, c)) {
                cell.classList.add('bg-slate-900');
            } else {
                cell.classList.add('bg-slate-800');
            }
        });
    }

    markError(r, c) {
        const cell = this.getCell(r, c);
        if(cell) {
             cell.classList.remove('bg-slate-800', 'bg-slate-900');
             cell.classList.add('bg-red-500');
        }
    }

    validateAndFeedback() {
        this.clearValidationFeedback();
        const halfGrid = this.GRID_SIZE / 2;
        let hasErrors = false;

        // Check Row/Col Counts
        for (let i = 0; i < this.GRID_SIZE; i++) {
            let rS = 0, rM = 0, cS = 0, cM = 0;
            for (let j = 0; j < this.GRID_SIZE; j++) {
                if (this.grid[i][j] === this.SYMBOLS.SUN) rS++; if (this.grid[i][j] === this.SYMBOLS.MOON) rM++;
                if (this.grid[j][i] === this.SYMBOLS.SUN) cS++; if (this.grid[j][i] === this.SYMBOLS.MOON) cM++;
            }
            // If row exceeds count, highlight non-empty cells in row
            if (rS > halfGrid || rM > halfGrid) {
                for (let j = 0; j < this.GRID_SIZE; j++) if(this.grid[i][j]!==0) { this.markError(i,j); hasErrors=true; }
            }
            // If col exceeds count
            if (cS > halfGrid || cM > halfGrid) {
                for (let j = 0; j < this.GRID_SIZE; j++) if(this.grid[j][i]!==0) { this.markError(j,i); hasErrors=true; }
            }
        }

        // Check 3-in-a-row constraint (Horizontal)
        for (let r = 0; r < this.GRID_SIZE; r++) for (let c = 0; c < this.GRID_SIZE - 2; c++) {
            const s = this.grid[r][c]; 
            if (s !== 0 && s === this.grid[r][c+1] && s === this.grid[r][c+2]) { 
                [0,1,2].forEach(i=>this.markError(r,c+i)); 
                hasErrors=true; 
            }
        }

        // Check 3-in-a-row constraint (Vertical)
        for (let c = 0; c < this.GRID_SIZE; c++) for (let r = 0; r < this.GRID_SIZE - 2; r++) {
            const s = this.grid[r][c]; 
            if (s !== 0 && s === this.grid[r+1][c] && s === this.grid[r+2][c]) { 
                [0,1,2].forEach(i=>this.markError(r+i,c)); 
                hasErrors=true; 
            }
        }

        if (hasErrors) {
             this.soundManager.playTone(150, 'sawtooth', 0.1);
        }
    }

    checkWinCondition() {
        const isComplete = !this.grid.flat().some(s => s === this.SYMBOLS.BLANK);
        const hasErrors = this.gridElement.querySelector('.bg-red-500');
        
        if (isComplete && !hasErrors) {
            this.stopTimer();
            this.shareButton.disabled = false;
            this.hintButton.disabled = true;
            this.showMessage(`Level ${this.level} Complete!`, false);
            this.soundManager.playSound('score');
            this.nextLevelButton.classList.remove('hidden');
            
            // Award Prize
            const prize = 10 * this.level;
            this.saveSystem.addCurrency(prize);
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
        
        // Pick random empty cell
        const hintCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const { r, c } = hintCell;
        
        // Reveal
        const correctSymbol = this.solution[r][c];
        this.grid[r][c] = correctSymbol;
        this.updateCell(this.getCell(r, c), correctSymbol);
        
        this.clearValidationFeedback(); 
        this.checkWinCondition();
        this.soundManager.playSound('click');
    }

    shareResult() {
        const time = this.timerElement.textContent;
        const symbolMap = { [this.SYMBOLS.SUN]: '☀️', [this.SYMBOLS.MOON]: '🌑' };
        let gridString = `Eclipse Level ${this.level} - Solved in ${time}s!\n\n`;
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
        this.messageElement.className = `h-6 mt-2 font-bold text-center text-sm ${isError ? 'text-red-500' : 'text-green-400'}`;
        this.messageTimeout = setTimeout(() => {
            this.messageElement.textContent = '';
        }, 3000);
    }

    startTimer() {
        this.stopTimer();
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.timerElement.textContent = elapsedTime;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
    }
}
