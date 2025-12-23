import SoundManager from '../core/SoundManager.js';

export default class SudokuGame {
    constructor() {
        this.container = null;
        this.grid = [];
        this.initialGrid = [];
        this.solution = [];
        this.selectedCell = null; // {r, c}
        this.notesMode = false;
        this.notes = Array(9).fill().map(() => Array(9).fill().map(() => new Set())); // 9x9 grid of Sets
        this.difficulty = 'medium'; // easy, medium, hard
        this.mistakes = 0;
        this.timer = 0;
        this.interval = null;
        this.isGameOver = false;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = "game-container flex flex-col items-center justify-center min-h-screen w-full bg-slate-900 text-cyan-400 font-mono select-none";

        // UI Structure
        const ui = document.createElement('div');
        ui.className = "flex flex-col items-center gap-4 w-full max-w-md p-4";
        ui.innerHTML = `
            <div class="flex justify-between w-full items-center">
                <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 neon-text">NEON SUDOKU</h1>
                <button class="back-btn text-slate-400 hover:text-white"><i class="fas fa-times"></i></button>
            </div>
            
            <div class="flex justify-between w-full text-sm">
                <div id="sudoku-timer">00:00</div>
                <div id="sudoku-mistakes">Mistakes: 0/3</div>
                <select id="sudoku-difficulty" class="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs">
                    <option value="easy">Easy</option>
                    <option value="medium" selected>Medium</option>
                    <option value="hard">Hard</option>
                </select>
                <button id="sudoku-new-game" class="px-2 py-1 bg-cyan-700 hover:bg-cyan-600 rounded text-xs text-white">New Game</button>
            </div>

            <div id="sudoku-board" class="grid grid-cols-9 gap-[1px] bg-slate-700 border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] p-[2px] w-full aspect-square">
                <!-- Cells generated here -->
            </div>

            <div class="flex justify-between w-full mt-4 gap-2">
                <button id="btn-hint" class="flex-1 py-2 bg-yellow-600/20 border border-yellow-600/50 rounded hover:bg-yellow-600/40 text-yellow-200 flex flex-col items-center justify-center">
                    <i class="fas fa-lightbulb"></i> <span class="text-[10px]">Hint (50)</span>
                </button>
                <button id="btn-notes" class="flex-1 py-2 bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 transition-colors flex flex-col items-center justify-center gap-1">
                    <i class="fas fa-pencil-alt"></i>
                    <span class="text-[10px]">Notes: OFF</span>
                </button>
                 <button id="btn-erase" class="flex-1 py-2 bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 transition-colors flex flex-col items-center justify-center gap-1">
                    <i class="fas fa-eraser"></i>
                    <span class="text-[10px]">Erase</span>
                </button>
            </div>

            <div class="grid grid-cols-9 gap-1 w-full mt-2">
                ${[1,2,3,4,5,6,7,8,9].map(n => `
                    <button class="num-btn aspect-square bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 text-xl font-bold text-cyan-300" data-num="${n}">${n}</button>
                `).join('')}
            </div>
        `;
        this.container.appendChild(ui);

        // Bind Events
        document.getElementById('sudoku-difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.startNewGame();
        });
        document.getElementById('sudoku-new-game').addEventListener('click', () => this.startNewGame());
        
        document.getElementById('btn-notes').addEventListener('click', () => this.toggleNotes());
        document.getElementById('btn-erase').addEventListener('click', () => this.handleInput(0)); // 0 for erase
        document.getElementById('btn-hint').addEventListener('click', () => this.useHint());

        this.container.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.getAttribute('data-num'));
                this.handleInput(num);
            });
        });

        // Keyboard Input
        this.handleKey = (e) => {
            if (this.isGameOver) return;
            if (e.key >= '1' && e.key <= '9') {
                this.handleInput(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                this.handleInput(0);
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                this.moveSelection(e.key);
            } else if (e.key.toLowerCase() === 'n') {
                this.toggleNotes();
            }
        };
        window.addEventListener('keydown', this.handleKey);

        this.startNewGame();
    }

    startNewGame() {
        this.mistakes = 0;
        this.timer = 0;
        this.isGameOver = false;
        this.selectedCell = null;
        this.notesMode = false;
        this.updateNotesButton();
        document.getElementById('sudoku-mistakes').textContent = `Mistakes: 0/3`;

        // Generate Board
        const generator = new SudokuGenerator();
        const { puzzle, solution } = generator.generate(this.difficulty);
        this.initialGrid = JSON.parse(JSON.stringify(puzzle)); // Deep copy
        this.grid = JSON.parse(JSON.stringify(puzzle));
        this.solution = solution;
        this.notes = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));

        this.renderBoard();

        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            if (!this.isGameOver && document.getElementById('sudoku-timer')) {
                this.timer++;
                const m = Math.floor(this.timer / 60).toString().padStart(2, '0');
                const s = (this.timer % 60).toString().padStart(2, '0');
                document.getElementById('sudoku-timer').textContent = `${m}:${s}`;
            }
        }, 1000);
    }

    renderBoard() {
        const board = document.getElementById('sudoku-board');
        board.innerHTML = '';

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                const val = this.grid[r][c];
                const isInitial = this.initialGrid[r][c] !== 0;
                
                // Styling
                let classes = "flex items-center justify-center text-lg font-bold cursor-pointer relative transition-colors duration-100 ";
                
                // Borders for 3x3 grids
                if (c % 3 === 2 && c !== 8) classes += "border-r-2 border-r-cyan-600 ";
                else if (c !== 8) classes += "border-r border-r-slate-800 "; // Normal grid line
                
                if (r % 3 === 2 && r !== 8) classes += "border-b-2 border-b-cyan-600 ";
                else if (r !== 8) classes += "border-b border-b-slate-800 "; // Normal grid line

                // Backgrounds
                if (this.selectedCell && this.selectedCell.r === r && this.selectedCell.c === c) {
                    classes += "bg-cyan-900/50 ring-2 ring-inset ring-cyan-400 "; // Selected
                } else if (this.selectedCell && val !== 0 && val === this.grid[this.selectedCell.r][this.selectedCell.c]) {
                     classes += "bg-cyan-900/30 text-cyan-200 "; // Same number highlight
                } else if (this.selectedCell && (this.selectedCell.r === r || this.selectedCell.c === c || this.getBlock(r,c) === this.getBlock(this.selectedCell.r, this.selectedCell.c))) {
                    classes += "bg-slate-800/50 "; // Row/Col/Box highlight
                } else {
                    classes += "bg-slate-900 ";
                }

                // Text Color
                if (isInitial) {
                    classes += "text-slate-400 ";
                } else if (val !== 0) {
                     // Check if error?
                     if (val !== this.solution[r][c]) classes += "text-red-500 ";
                     else classes += "text-cyan-400 ";
                } else {
                    // Empty
                }

                cell.className = classes;
                
                if (val !== 0) {
                    cell.textContent = val;
                } else {
                    // Render Notes
                    const cellNotes = this.notes[r][c];
                    if (cellNotes.size > 0) {
                        cell.innerHTML = `<div class="grid grid-cols-3 w-full h-full text-[6px] leading-none text-slate-500 pointer-events-none p-[1px]">
                            ${[1,2,3,4,5,6,7,8,9].map(n => `<div class="flex items-center justify-center">${cellNotes.has(n) ? n : ''}</div>`).join('')}
                        </div>`;
                    }
                }

                cell.onclick = () => {
                    this.selectedCell = {r, c};
                    this.renderBoard();
                    window.miniGameHub.soundManager.playSound('click');
                };

                board.appendChild(cell);
            }
        }
    }

    handleInput(num) {
        if (this.isGameOver || !this.selectedCell) return;
        const { r, c } = this.selectedCell;
        
        // Cannot edit initial cells
        if (this.initialGrid[r][c] !== 0) return;

        if (this.notesMode && num !== 0) {
            // Toggle Note
            if (this.notes[r][c].has(num)) this.notes[r][c].delete(num);
            else this.notes[r][c].add(num);
        } else {
            // Set Number
            if (num === 0) {
                this.grid[r][c] = 0;
            } else {
                if (this.grid[r][c] === num) return; // No change

                this.grid[r][c] = num;
                // Check validity immediately
                if (num !== this.solution[r][c]) {
                    this.mistakes++;
                    document.getElementById('sudoku-mistakes').textContent = `Mistakes: ${this.mistakes}/3`;
                    window.miniGameHub.soundManager.playSound('explosion'); // Error sound
                    if (this.mistakes >= 3) {
                        this.gameOver(false);
                        return;
                    }
                } else {
                    window.miniGameHub.soundManager.playSound('powerup');
                    this.checkWin();
                }
            }
        }
        this.renderBoard();
    }

    useHint() {
        if (this.isGameOver) return;
        const cost = 50;
        const saveSystem = window.miniGameHub.saveSystem;
        
        if (saveSystem.getCurrency() < cost) {
            window.miniGameHub.soundManager.playSound('explosion'); // Fail sound
            return; // Not enough money
        }

        // Find empty cell
        const empties = [];
        for(let r=0; r<9; r++) {
            for(let c=0; c<9; c++) {
                if(this.grid[r][c] === 0) empties.push({r, c});
            }
        }
        
        if (empties.length === 0) return;

        // Deduct cost
        saveSystem.spendCurrency(cost);
        window.miniGameHub.updateHubStats(); // Helper if exposed, else we rely on global update

        // Pick random
        const cell = empties[Math.floor(Math.random() * empties.length)];
        this.grid[cell.r][cell.c] = this.solution[cell.r][cell.c];
        
        // Visual
        this.selectedCell = cell;
        this.renderBoard();
        window.miniGameHub.soundManager.playSound('powerup');
        
        this.checkWin();
    }

    toggleNotes() {
        this.notesMode = !this.notesMode;
        this.updateNotesButton();
    }

    updateNotesButton() {
        const btn = document.getElementById('btn-notes');
        const span = btn.querySelector('span');
        const icon = btn.querySelector('i');
        if (this.notesMode) {
            btn.classList.add('bg-cyan-800', 'border-cyan-500', 'text-cyan-200');
            btn.classList.remove('bg-slate-800', 'border-slate-600');
            span.textContent = "Notes: ON";
        } else {
             btn.classList.remove('bg-cyan-800', 'border-cyan-500', 'text-cyan-200');
             btn.classList.add('bg-slate-800', 'border-slate-600');
             span.textContent = "Notes: OFF";
        }
    }

    moveSelection(key) {
        if (!this.selectedCell) {
            this.selectedCell = {r: 0, c: 0};
        } else {
            let {r, c} = this.selectedCell;
            if (key === 'ArrowUp') r = Math.max(0, r - 1);
            if (key === 'ArrowDown') r = Math.min(8, r + 1);
            if (key === 'ArrowLeft') c = Math.max(0, c - 1);
            if (key === 'ArrowRight') c = Math.min(8, c + 1);
            this.selectedCell = {r, c};
        }
        this.renderBoard();
    }

    getBlock(r, c) {
        return Math.floor(r / 3) * 3 + Math.floor(c / 3);
    }

    checkWin() {
        // Check if full grid matches solution
        for(let r=0; r<9; r++) {
            for(let c=0; c<9; c++) {
                if(this.grid[r][c] !== this.solution[r][c]) return;
            }
        }
        this.gameOver(true);
    }

    gameOver(win) {
        this.isGameOver = true;
        clearInterval(this.interval);
        
        if (win) {
            const score = Math.max(0, 1000 - (this.timer * 2) - (this.mistakes * 100));
            window.miniGameHub.showGameOver(score, () => this.startNewGame());
        } else {
            window.miniGameHub.showGameOver(0, () => this.startNewGame());
        }
    }

    shutdown() {
        if (this.interval) clearInterval(this.interval);
        window.removeEventListener('keydown', this.handleKey);
        this.container.innerHTML = '';
    }
}

// Minimal Sudoku Generator
class SudokuGenerator {
    generate(difficulty) {
        const solution = Array(9).fill().map(() => Array(9).fill(0));
        
        // Fill diagonal boxes
        this.fillBox(solution, 0, 0);
        this.fillBox(solution, 3, 3);
        this.fillBox(solution, 6, 6);

        // Solve the rest
        this.solveSudoku(solution);

        // Remove digits
        const puzzle = JSON.parse(JSON.stringify(solution));
        let attempts = 30;
        if (difficulty === 'medium') attempts = 40;
        if (difficulty === 'hard') attempts = 50;
        if (difficulty === 'easy') attempts = 20;

        while (attempts > 0) {
            let row = Math.floor(Math.random() * 9);
            let col = Math.floor(Math.random() * 9);
            while(puzzle[row][col] === 0) {
                 row = Math.floor(Math.random() * 9);
                 col = Math.floor(Math.random() * 9);
            }
            puzzle[row][col] = 0;
            attempts--;
        }

        return { puzzle, solution };
    }

    fillBox(grid, row, col) {
        let num;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                do {
                    num = Math.floor(Math.random() * 9) + 1;
                } while (!this.isSafeInBox(grid, row, col, num));
                grid[row + i][col + j] = num;
            }
        }
    }

    isSafeInBox(grid, rowStart, colStart, num) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[rowStart + i][colStart + j] === num) return false;
            }
        }
        return true;
    }

    isSafe(grid, row, col, num) {
        // Check row
        for (let x = 0; x < 9; x++) if (grid[row][x] === num) return false;
        // Check col
        for (let x = 0; x < 9; x++) if (grid[x][col] === num) return false;
        // Check box
        let startRow = row - row % 3;
        let startCol = col - col % 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[i + startRow][j + startCol] === num) return false;
            }
        }
        return true;
    }

    solveSudoku(grid) {
        let row = -1;
        let col = -1;
        let isEmpty = false;
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (grid[i][j] === 0) {
                    row = i;
                    col = j;
                    isEmpty = true;
                    break;
                }
            }
            if (isEmpty) break;
        }

        if (!isEmpty) return true; // Solved

        const digits = [1,2,3,4,5,6,7,8,9];
        // Randomize digits order for variety
        for(let i = digits.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            [digits[i], digits[j]] = [digits[j], digits[i]];
        }

        for (let num of digits) {
            if (this.isSafe(grid, row, col, num)) {
                grid[row][col] = num;
                if (this.solveSudoku(grid)) return true;
                grid[row][col] = 0;
            }
        }
        return false;
    }
}
