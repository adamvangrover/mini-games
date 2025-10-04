const eclipseGame = {
    GRID_SIZE: 6,
    SYMBOLS: {
        BLANK: 0,
        SUN: 1,
        MOON: 2
    },
    grid: [],
    solution: [],
    initialClues: [],
    timerInterval: null,
    startTime: 0,
    messageTimeout: null,

    init: function() {
        this.gridElement = document.getElementById('eclipse-grid');
        this.timerElement = document.getElementById('eclipse-timer');
        this.hintButton = document.getElementById('eclipse-hint-btn');
        this.shareButton = document.getElementById('eclipse-share-btn');
        this.messageElement = document.getElementById('eclipse-message');

        this.generatePuzzle();
        this.createGrid();
        this.startTimer();

        this.gridElement.addEventListener('click', this.handleCellClick.bind(this));
        this.hintButton.addEventListener('click', this.giveHint.bind(this));
        this.shareButton.addEventListener('click', this.shareResult.bind(this));
        this.shareButton.disabled = true;
    },

    shutdown: function() {
        this.stopTimer();
        this.gridElement.innerHTML = '';
        if (this.gridElement) {
            this.gridElement.removeEventListener('click', this.handleCellClick.bind(this));
        }
        if (this.hintButton) this.hintButton.removeEventListener('click', this.giveHint.bind(this));
        if (this.shareButton) this.shareButton.removeEventListener('click', this.shareResult.bind(this));
        clearTimeout(this.messageTimeout);
    },

    // Puzzle Generation & Solving (Omitted for brevity)
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
    },
    solve: function(grid) {
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
    },
    generatePuzzle: function() {
        this.solution = Array(this.GRID_SIZE).fill(0).map(() => Array(this.GRID_SIZE).fill(this.SYMBOLS.BLANK));
        this.solution = this.solve(this.solution)[0];
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
    },

    // UI & Game Logic
    isClue: function(row, col) { return this.initialClues.some(clue => clue.r === row && clue.c === col); },
    createGrid: function() {
        this.gridElement.innerHTML = '';
        this.gridElement.style.gridTemplateColumns = `repeat(${this.GRID_SIZE}, 1fr)`;
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                if (this.isClue(r, c)) cell.classList.add('clue');
                this.updateCell(cell, this.grid[r][c]);
                this.gridElement.appendChild(cell);
            }
        }
    },
    updateCell: function(cellElement, symbol) {
        const symbolMap = { [this.SYMBOLS.BLANK]: '', [this.SYMBOLS.SUN]: '☀️', [this.SYMBOLS.MOON]: '🌑' };
        cellElement.textContent = symbolMap[symbol];
    },
    handleCellClick: function(event) {
        const cell = event.target.closest('.cell');
        if (!cell || cell.classList.contains('clue')) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.grid[row][col] = (this.grid[row][col] + 1) % 3;
        this.updateCell(cell, this.grid[row][col]);
        this.validateAndFeedback();
        this.checkWinCondition();
    },
    getCell: function(row, col) { return this.gridElement.querySelector(`[data-row='${row}'][data-col='${col}']`); },
    validateAndFeedback: function() {
        this.gridElement.querySelectorAll('.cell.error').forEach(cell => cell.classList.remove('error'));
        const halfGrid = this.GRID_SIZE / 2;
        for (let i = 0; i < this.GRID_SIZE; i++) {
            let rS = 0, rM = 0, cS = 0, cM = 0;
            for (let j = 0; j < this.GRID_SIZE; j++) {
                if (this.grid[i][j] === this.SYMBOLS.SUN) rS++; if (this.grid[i][j] === this.SYMBOLS.MOON) rM++;
                if (this.grid[j][i] === this.SYMBOLS.SUN) cS++; if (this.grid[j][i] === this.SYMBOLS.MOON) cM++;
            }
            if (rS > halfGrid || rM > halfGrid) for (let j = 0; j < this.GRID_SIZE; j++) if(this.grid[i][j]!==0) this.getCell(i,j).classList.add('error');
            if (cS > halfGrid || cM > halfGrid) for (let j = 0; j < this.GRID_SIZE; j++) if(this.grid[j][i]!==0) this.getCell(j,i).classList.add('error');
        }
        for (let r = 0; r < this.GRID_SIZE; r++) for (let c = 0; c < this.GRID_SIZE - 2; c++) {
            const s = this.grid[r][c]; if (s !== 0 && s === this.grid[r][c+1] && s === this.grid[r][c+2]) [0,1,2].forEach(i=>this.getCell(r,c+i).classList.add('error'));
        }
        for (let c = 0; c < this.GRID_SIZE; c++) for (let r = 0; r < this.GRID_SIZE - 2; r++) {
            const s = this.grid[r][c]; if (s !== 0 && s === this.grid[r+1][c] && s === this.grid[r+2][c]) [0,1,2].forEach(i=>this.getCell(r+i,c).classList.add('error'));
        }
    },
    checkWinCondition: function() {
        const isComplete = !this.grid.flat().some(s => s === this.SYMBOLS.BLANK);
        const hasErrors = this.gridElement.querySelector('.cell.error');
        if (isComplete && !hasErrors) {
            this.stopTimer();
            this.shareButton.disabled = false;
            this.showMessage(`You solved it in ${this.timerElement.textContent}s!`);
        }
    },
    giveHint: function() {
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
    },
    shareResult: function() {
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
    },
    showMessage: function(msg, isError = false) {
        clearTimeout(this.messageTimeout);
        this.messageElement.textContent = msg;
        this.messageElement.style.color = isError ? '#ff0000' : '#39ff14';
        this.messageElement.classList.add('visible');
        this.messageTimeout = setTimeout(() => {
            this.messageElement.classList.remove('visible');
        }, 3000);
    },
    startTimer: function() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.timerElement.textContent = elapsedTime;
        }, 1000);
    },
    stopTimer: function() {
        clearInterval(this.timerInterval);
    grid: [],
    initialGrid: [],
    solution: [],
    clues: [],
    isGameWon: false,
    time: 0,
    timerInterval: null,

    // --- Puzzle Generation Logic ---
    mulberry32: (seed) => () => {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    },

    checkBalance: function(grid) {
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
    },

    checkNeighbors: function(grid) {
        const size = grid.length;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (grid[i][j] === 0) continue;
                if (j < size - 2 && grid[i][j] === grid[i][j + 1] && grid[i][j] === grid[i][j + 2]) return false;
                if (i < size - 2 && grid[i][j] === grid[i + 1][j] && grid[i][j] === grid[i + 2][j]) return false;
            }
        }
        return true;
    },

    fillGrid: function(grid, random) {
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
    },

    generateDailyPuzzle: function() {
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
    },

    // --- Puzzle Validation Logic ---
    validateSolution: function(grid) {
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
    },

    init: function() {
        this.generateDailyPuzzle();
        this.renderGrid();
        this.renderClues();
        this.startTimer();

        this.validateBtn = document.getElementById('eclipse-validate-btn');
        this.resetBtn = document.getElementById('eclipse-reset-btn');

        this.validateHandler = () => this.handleValidate();
        this.resetHandler = () => this.handleReset();

        this.validateBtn.addEventListener('click', this.validateHandler);
        this.resetBtn.addEventListener('click', this.resetHandler);
    },

    shutdown: function() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.validateBtn.removeEventListener('click', this.validateHandler);
        this.resetBtn.removeEventListener('click', this.resetHandler);

        const grid = document.getElementById('eclipse-grid');
        const clues = document.getElementById('eclipse-clue-layer');
        grid.innerHTML = '';
        clues.innerHTML = '';
    },

    renderGrid: function() {
        const gridEl = document.getElementById('eclipse-grid');
        gridEl.innerHTML = '';
        this.grid.forEach((row, r) => {
            row.forEach((cellValue, c) => {
                const cell = document.createElement('div');
                cell.className = 'eclipse-cell';
                if (this.initialGrid[r][c] !== 0) {
                    cell.classList.add('initial');
                }
                cell.dataset.r = r;
                cell.dataset.c = c;
                this.updateCellContent(cell, cellValue);
                cell.addEventListener('click', () => this.handleCellClick(r, c));
                gridEl.appendChild(cell);
            });
        });
    },

    renderClues: function() {
        const clueLayer = document.getElementById('eclipse-clue-layer');
        clueLayer.innerHTML = '';
        this.clues.forEach((clue, index) => {
            const [cell1, cell2] = clue.cells;
            const isHorizontal = cell1.r === cell2.r;
            const clueEl = document.createElement('div');
            clueEl.className = 'eclipse-clue';
            clueEl.textContent = clue.type;
            clueEl.style.position = 'absolute';
            clueEl.style.top = `calc(${Math.min(cell1.r, cell2.r) * 16.66}% + ${isHorizontal ? '8.33%' : '16.66%'} - 10px)`;
            clueEl.style.left = `calc(${Math.min(cell1.c, cell2.c) * 16.66}% + ${isHorizontal ? '16.66%' : '8.33%'} - 10px)`;
            if (!isHorizontal) {
                clueEl.style.transform = 'rotate(90deg)';
            }
            clueLayer.appendChild(clueEl);
        });
    },

    updateCellContent: function(cellElement, value) {
        if (value === 1) {
            cellElement.innerHTML = '☀️';
            cellElement.style.color = 'var(--sun-color)';
        } else if (value === 2) {
            cellElement.innerHTML = '🌑';
            cellElement.style.color = 'var(--moon-color)';
        } else {
            cellElement.innerHTML = '';
        }
    },

    handleCellClick: function(row, col) {
        if (this.isGameWon || this.initialGrid[row][col] !== 0) return;

        const newGrid = this.grid.map(r => [...r]);
        newGrid[row][col] = (newGrid[row][col] + 1) % 3; // 0 -> 1 -> 2 -> 0
        this.grid = newGrid;

        const cellEl = document.querySelector(`.eclipse-cell[data-r='${row}'][data-c='${col}']`);
        this.updateCellContent(cellEl, this.grid[row][col]);
    },

    handleValidate: function() {
        if (this.validateSolution(this.grid)) {
            this.isGameWon = true;
            if (this.timerInterval) clearInterval(this.timerInterval);
            alert(`Congratulations! You solved it in ${this.time} seconds!`);
        } else {
            alert('Not quite right. Keep trying!');
        }
    },

    handleReset: function() {
        this.grid = this.initialGrid.map(row => [...row]);
        this.isGameWon = false;
        this.time = 0;
        this.renderGrid();
        this.startTimer();
    },

    startTimer: function() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.time = 0;
        const timerEl = document.getElementById('eclipse-timer');
        this.timerInterval = setInterval(() => {
            this.time++;
            timerEl.textContent = `Time: ${this.time}s`;
        }, 1000);
    }
};