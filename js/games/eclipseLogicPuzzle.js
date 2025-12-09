import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class EclipseLogicPuzzleGame {
    constructor() {
        this.GRID_SIZE = 6;
        this.SYMBOLS = { BLANK: 0, SUN: 1, MOON: 2 };
        this.gridState = [];
        this.solution = [];
        this.timerInterval = null;
        this.seconds = 0;
        this.hasStarted = false;
        this.level = 1;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();

        // Icons
        this.sunSVG = `<svg class="w-3/4 h-3/4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 20a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zM5.636 6.364a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zm12.728 12.728a1 1 0 010-1.414l-.707-.707a1 1 0 01-1.414 1.414l.707.707a1 1 0 011.414 0zM2 12a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm20 0a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.636 17.636a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zm12.728-12.728a1 1 0 011.414 0l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0z"/></svg>`;
        this.moonSVG = `<svg class="w-3/4 h-3/4 text-indigo-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11.25 3.004c-3.954 0-7.313 2.122-8.995 5.253a.75.75 0 00.91 1.066 7.701 7.701 0 019.264 9.264.75.75 0 001.066.91C16.877 21.687 19 18.328 19 14.254a9.002 9.002 0 00-7.75-8.996.75.75 0 00-.25-.004z"/></svg>`;
    }

    init(container) {
        this.container = container;

        let gridCont = container.querySelector('#eclipselogic-grid-container');
        if (!gridCont) {
             container.innerHTML = `
                <div class="flex items-center justify-between mb-4 w-full max-w-sm mx-auto">
                    <h1 class="text-3xl font-bold text-slate-300">Eclipse Logic</h1>
                    <div class="bg-slate-700 px-3 py-1 rounded text-white text-sm">Level <span id="eclipselogic-level">1</span></div>
                </div>

                <div id="eclipselogic-grid-container" class="grid-container aspect-square w-full max-w-sm rounded-lg p-2 bg-slate-200 mx-auto" style="display: grid; gap: 4px;">
                    <!-- Indicators and Board injected here -->
                </div>

                <div class="flex items-center justify-center flex-wrap gap-3 mt-6 w-full max-w-sm mx-auto">
                    <div class="bg-white rounded-lg px-4 py-2 text-slate-700 font-semibold text-lg shadow-sm">
                        Time: <span id="eclipselogic-timer">0s</span>
                    </div>
                    <button id="eclipselogic-reset-button" class="px-5 py-2 bg-slate-400 text-white font-semibold rounded-lg shadow-md hover:bg-slate-500">Reset</button>
                    <button id="eclipselogic-check-button" class="px-5 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600">Check</button>
                    <button id="eclipselogic-next-button" class="hidden px-5 py-2 bg-fuchsia-600 text-white font-semibold rounded-lg shadow-md hover:bg-fuchsia-500 animate-pulse">Next</button>
                </div>

                <div id="eclipselogic-message-area" class="mt-4 text-center h-6 font-semibold text-white"></div>
                <button class="back-btn mt-6 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Back</button>
             `;
             gridCont = container.querySelector('#eclipselogic-grid-container');
             container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.gridContainer = gridCont;
        this.timerEl = container.querySelector('#eclipselogic-timer');
        this.messageArea = container.querySelector('#eclipselogic-message-area');
        this.nextButton = container.querySelector('#eclipselogic-next-button');
        this.levelLabel = container.querySelector('#eclipselogic-level');

        // Bind Controls
        container.querySelector('#eclipselogic-reset-button').onclick = () => this.setupGame(this.level);
        container.querySelector('#eclipselogic-check-button').onclick = () => this.checkFinalSolution();
        this.nextButton.onclick = () => this.setupGame(this.level + 1);

        this.setupGame(1);
    }

    // Logic Generation (Reused from EclipseGame to make it procedural)
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
        // Try to generate a valid full grid
        const solved = this.solve(this.solution);
        if (solved.length > 0) this.solution = solved[0];
        else {
             // Fallback
             this.solution = Array(this.GRID_SIZE).fill(0).map((_,r) => Array(this.GRID_SIZE).fill(0).map((_,c) => (r+c)%2 ? 1 : 2));
        }
        
        // Remove cells to create puzzle
        // Logic Puzzle: Starts Empty or sparse?
        // Let's make it start EMPTY for this "Logic" variant, so it's a "Fill from scratch" challenge.
        // Wait, standard Takuzu needs clues to be solvable.
        // We will leave X cells as clues.
        
        let puzzle = this.solution.map(r => [...r]);
        let cells = [];
        for(let r=0; r<this.GRID_SIZE; r++) for(let c=0; c<this.GRID_SIZE; c++) cells.push([r,c]);
        cells.sort(() => Math.random() - 0.5);
        
        // Difficulty control: How many clues to remove?
        // Easy (Lvl 1): Remove few (leave many clues)
        // Hard (Lvl 10): Remove many (leave minimum for unique solution)
        
        // Actually, we need to check uniqueness.
        for(const [r, c] of cells) {
            const temp = puzzle[r][c];
            puzzle[r][c] = this.SYMBOLS.BLANK;
            
            // Check if still unique solution (computationally expensive for real time generation on large grids, but ok for 6x6)
            if (this.solve(puzzle).length !== 1) {
                puzzle[r][c] = temp; // Put it back if it makes it ambiguous
            }
        }
        return puzzle;
    }

    setupGame(level) {
        this.level = level;
        this.levelLabel.textContent = level;
        this.nextButton.classList.add('hidden');
        
        // Difficulty Scaling
        if (level === 1) this.GRID_SIZE = 4;
        else if (level <= 5) this.GRID_SIZE = 6;
        else this.GRID_SIZE = 8;
        
        this.initialGrid = this.generatePuzzle();
        this.gridState = this.initialGrid.map(r => [...r]);
        
        this.createIndicators();
        this.renderBoard();
        
        this.seconds = 0;
        this.hasStarted = false;
        this.stopTimer();
        this.timerEl.textContent = '0s';
        this.messageArea.textContent = '';
        this.validateAllRealTime();
    }

    shutdown() {
        this.stopTimer();
    }

    createIndicators() {
        // Setup Grid Container Layout
        // Grid Template: [20px] [1fr...1fr]
        this.gridContainer.innerHTML = '';
        this.gridContainer.style.gridTemplateColumns = `20px repeat(${this.GRID_SIZE}, 1fr)`;
        this.gridContainer.style.gridTemplateRows = `20px repeat(${this.GRID_SIZE}, 1fr)`;

        // Top Row Indicators (Cols)
        for (let i = 0; i < this.GRID_SIZE; i++) {
            const colInd = document.createElement('div');
            colInd.id = `eclipselogic-col-indicator-${i}`;
            colInd.className = 'indicator w-full h-2 bg-slate-400 rounded-full mt-auto mb-1 self-end';
            colInd.style.gridRow = '1';
            colInd.style.gridColumn = `${i + 2}`;
            this.gridContainer.appendChild(colInd);
        }

        // Left Col Indicators (Rows)
        for (let i = 0; i < this.GRID_SIZE; i++) {
            const rowInd = document.createElement('div');
            rowInd.id = `eclipselogic-row-indicator-${i}`;
            rowInd.className = 'indicator h-full w-2 bg-slate-400 rounded-full ml-auto mr-1 self-center justify-self-end';
            rowInd.style.gridColumn = '1';
            rowInd.style.gridRow = `${i + 2}`;
            this.gridContainer.appendChild(rowInd);
        }
    }

    renderBoard() {
        // Clear cells only (not indicators)
        const existingCells = this.gridContainer.querySelectorAll('.grid-cell');
        existingCells.forEach(c => c.remove());

        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell bg-white aspect-square flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors border border-slate-300 rounded-sm';
                cell.style.gridRow = `${r + 2}`;
                cell.style.gridColumn = `${c + 2}`;
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                // If it was a clue in initial grid
                if (this.initialGrid[r][c] !== this.SYMBOLS.BLANK) {
                    cell.classList.add('bg-slate-200', 'cursor-default');
                    cell.classList.remove('cursor-pointer', 'hover:bg-slate-100', 'bg-white');
                    cell.style.pointerEvents = 'none';
                } else {
                    cell.onclick = (e) => this.handleCellClick(e);
                }

                if(this.gridState[r][c] === 1) cell.innerHTML = this.sunSVG;
                if(this.gridState[r][c] === 2) cell.innerHTML = this.moonSVG;

                this.gridContainer.appendChild(cell);
            }
        }
    }

    handleCellClick(e) {
        if (!this.hasStarted) this.startTimer();
        const r = parseInt(e.currentTarget.dataset.r);
        const c = parseInt(e.currentTarget.dataset.c);

        this.gridState[r][c] = (this.gridState[r][c] + 1) % 3;
        this.soundManager.playTone(400 + (this.gridState[r][c] * 100), 'sine', 0.05);

        // Update just this cell visually to save perf? No, renderBoard is cheap enough for now
        // Actually, let's just update content
        if(this.gridState[r][c] === 1) e.currentTarget.innerHTML = this.sunSVG;
        else if(this.gridState[r][c] === 2) e.currentTarget.innerHTML = this.moonSVG;
        else e.currentTarget.innerHTML = '';

        this.validateAllRealTime();
    }

    validateAllRealTime() {
         for (let i = 0; i < this.GRID_SIZE; i++) {
            this.validateRealTime(i, 'row');
            this.validateRealTime(i, 'col');
         }
    }

    validateRealTime(index, type) {
        let suns = 0;
        let moons = 0;
        const half = this.GRID_SIZE / 2;

        for (let i = 0; i < this.GRID_SIZE; i++) {
            const cellState = (type === 'row') ? this.gridState[index][i] : this.gridState[i][index];
            if (cellState === 1) suns++;
            if (cellState === 2) moons++;
        }

        const indicatorId = `eclipselogic-${type}-indicator-${index}`;
        const indicator = this.gridContainer.querySelector('#' + indicatorId);
        if (!indicator) return;

        // Visual Feedback for "Full/Done" vs "Error"
        if (suns > half || moons > half) {
            indicator.classList.remove('bg-slate-400', 'bg-green-500');
            indicator.classList.add('bg-red-500');
        } else if (suns === half && moons === half) {
            indicator.classList.remove('bg-slate-400', 'bg-red-500');
            indicator.classList.add('bg-green-500');
        } else {
            indicator.classList.add('bg-slate-400');
            indicator.classList.remove('bg-red-500', 'bg-green-500');
        }
    }

    checkFinalSolution() {
        this.messageArea.textContent = '';
        
        // Check if matches procedural solution OR valid by rules
        // Since we allow multiple solutions (though we try to avoid), we should validate by rules.
        
        let isValid = true;
        // 1. Full Board
        if (this.gridState.flat().includes(0)) isValid = false;

        // 2. Rules
        // Row/Col counts
        const half = this.GRID_SIZE / 2;
        for(let i=0; i<this.GRID_SIZE; i++) {
             let rS=0, rM=0, cS=0, cM=0;
             for(let j=0; j<this.GRID_SIZE; j++) {
                 if(this.gridState[i][j]===1) rS++; else if(this.gridState[i][j]===2) rM++;
                 if(this.gridState[j][i]===1) cS++; else if(this.gridState[j][i]===2) cM++;
             }
             if(rS!==half || rM!==half || cS!==half || cM!==half) isValid = false;
        }
        
        // 3 in a row
        for(let r=0; r<this.GRID_SIZE; r++) for(let c=0; c<this.GRID_SIZE-2; c++) {
            if(this.gridState[r][c]!==0 && this.gridState[r][c]===this.gridState[r][c+1] && this.gridState[r][c]===this.gridState[r][c+2]) isValid=false;
        }
        for(let c=0; c<this.GRID_SIZE; c++) for(let r=0; r<this.GRID_SIZE-2; r++) {
            if(this.gridState[r][c]!==0 && this.gridState[r][c]===this.gridState[r+1][c] && this.gridState[r][c]===this.gridState[r+2][c]) isValid=false;
        }

        // 3. Unique Rows/Cols? (Standard Takuzu rule: no two rows/cols identical)
        // Ignoring for now to be lenient, or should I add?
        
        if (isValid) {
            this.stopTimer();
            this.messageArea.textContent = `Solved in ${this.seconds}s!`;
            this.messageArea.className = "mt-4 text-center h-6 font-semibold text-green-400";
            this.soundManager.playSound('score');
            this.saveSystem.addCurrency(15 * this.level);
            this.nextButton.classList.remove('hidden');
        } else {
            this.messageArea.textContent = 'Not quite right.';
            this.messageArea.className = "mt-4 text-center h-6 font-semibold text-red-500";
            this.soundManager.playTone(200, 'sawtooth', 0.1);
        }
    }

    startTimer() {
        if (this.timerInterval) return;
        this.hasStarted = true;
        this.timerInterval = setInterval(() => {
            this.seconds++;
            this.timerEl.textContent = `${this.seconds}s`;
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
    }
}
