const eclipseGame = {
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