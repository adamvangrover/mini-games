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
    }
};