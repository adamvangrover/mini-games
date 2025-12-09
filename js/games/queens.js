import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class QueensGame {
    constructor() {
        this.GRID_SIZE = 8;
        this.grid = []; // Stores user state: 0=Empty, 1=Queen, 2=Cross
        this.regions = []; // Stores region ID for each cell (0 to N-1)
        this.solution = []; // Stores true positions (optional, for hint)
        this.regionColors = [];
        this.timerInterval = null;
        this.startTime = 0;
        this.isLevelComplete = false;
        this.currentLevel = 1;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        this.container = container;
        this.renderUI();
        this.startLevel(1);
    }

    renderUI() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center h-full max-w-4xl mx-auto p-4">
                <div class="flex justify-between items-center w-full mb-4">
                    <h2 class="text-3xl font-bold text-fuchsia-400 font-display">👑 Neon Queens</h2>
                    <div class="flex gap-4 items-center">
                        <div class="bg-slate-800 px-4 py-2 rounded border border-slate-600">
                            <span class="text-slate-400 text-xs uppercase">Level</span>
                            <span id="queens-level" class="block text-xl font-bold text-white leading-none">1</span>
                        </div>
                        <div class="bg-slate-800 px-4 py-2 rounded border border-slate-600">
                            <span class="text-slate-400 text-xs uppercase">Time</span>
                            <span id="queens-timer" class="block text-xl font-bold text-white leading-none font-mono">0s</span>
                        </div>
                    </div>
                </div>

                <div class="relative bg-slate-800 p-1 rounded-lg shadow-2xl shadow-fuchsia-500/20 border border-slate-700">
                    <div id="queens-grid" class="grid gap-0 select-none">
                        <!-- Cells injected here -->
                    </div>
                </div>

                <div class="flex gap-4 mt-6">
                    <button id="queens-undo-btn" class="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-colors">
                        <i class="fas fa-undo"></i> Undo
                    </button>
                    <button id="queens-check-btn" class="px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded font-bold transition-colors shadow-lg shadow-fuchsia-600/30">
                        Check Solution
                    </button>
                    <button id="queens-next-btn" class="hidden px-6 py-2 bg-green-500 hover:bg-green-400 text-white rounded font-bold transition-colors shadow-lg shadow-green-500/30 animate-pulse">
                        Next Level <i class="fas fa-arrow-right"></i>
                    </button>
                </div>

                <p class="mt-4 text-slate-400 text-sm max-w-lg text-center">
                    Rule: Place one Crown 👑 in each Row, Column, and Color Region. Crowns cannot touch, not even diagonally. Right-click to mark empty (X).
                </p>
                <button class="back-btn mt-4 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm rounded">Back to Menu</button>
            </div>
        `;

        this.gridElement = this.container.querySelector('#queens-grid');
        this.timerElement = this.container.querySelector('#queens-timer');
        this.levelElement = this.container.querySelector('#queens-level');
        this.nextBtn = this.container.querySelector('#queens-next-btn');
        this.checkBtn = this.container.querySelector('#queens-check-btn');

        this.checkBtn.onclick = () => this.checkWinCondition(true);
        this.nextBtn.onclick = () => this.startLevel(this.currentLevel + 1);
        this.container.querySelector('#queens-undo-btn').onclick = () => this.resetBoard(); // Actually Reset for now
        
        // Back Button
        this.container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        // Prevent Context Menu on Grid
        this.gridElement.addEventListener('contextmenu', e => e.preventDefault());
    }

    startLevel(level) {
        this.currentLevel = level;
        this.levelElement.textContent = level;
        this.GRID_SIZE = Math.min(8 + Math.floor((level - 1) / 5), 12); // Increase size every 5 levels
        
        this.generateLevel();
        this.drawGrid();
        this.startTimer();
        this.isLevelComplete = false;
        this.checkBtn.classList.remove('hidden');
        this.nextBtn.classList.add('hidden');
    }

    generateLevel() {
        // Attempt to generate a valid board
        // 1. Place N queens validly
        let attempts = 0;
        let success = false;
        
        while (!success && attempts < 1000) {
            attempts++;
            this.solution = this.generateValidQueensPlacement();
            if (this.solution) {
                // 2. Grow regions
                this.regions = this.generateRegions(this.solution);
                if (this.regions) success = true;
            }
        }

        if (!success) {
            console.error("Failed to generate Queens level");
            // Fallback to a simple diagonal (trivial, but failsafe)
            this.solution = Array(this.GRID_SIZE * this.GRID_SIZE).fill(0);
            this.regions = Array(this.GRID_SIZE * this.GRID_SIZE).fill(0);
            for(let i=0; i<this.GRID_SIZE; i++) {
                this.solution[i*this.GRID_SIZE + i] = 1;
                this.regions[i*this.GRID_SIZE + i] = i;
            }
        }

        // Initialize User Grid
        this.grid = Array(this.GRID_SIZE * this.GRID_SIZE).fill(0);

        // Generate Region Colors (distinct neon palette)
        this.regionColors = [];
        for(let i=0; i<this.GRID_SIZE; i++) {
            // HSL hue rotation
            const hue = Math.floor((360 / this.GRID_SIZE) * i);
            this.regionColors.push(`hsla(${hue}, 70%, 25%, 0.6)`);
        }
    }

    generateValidQueensPlacement() {
        const size = this.GRID_SIZE;
        const board = Array(size * size).fill(0);
        const rows = Array(size).fill(false);
        const cols = Array(size).fill(false);
        
        // Backtracking or randomized placement
        // Let's try randomized construction with backtracking for speed
        
        const placeRow = (r) => {
            if (r === size) return true;
            
            const startCol = Math.floor(Math.random() * size);
            for (let i = 0; i < size; i++) {
                const c = (startCol + i) % size;
                
                if (cols[c]) continue;
                
                // Check neighbors/diagonal check
                // Standard Queens: diagonals. Star Battle: kings move (touching)
                // "No queens touching, not even diagonally"
                
                let touching = false;
                // Check previous row
                if (r > 0) {
                    if (board[(r-1)*size + c] === 1) touching = true; // Up
                    if (c > 0 && board[(r-1)*size + (c-1)] === 1) touching = true; // Up-Left
                    if (c < size-1 && board[(r-1)*size + (c+1)] === 1) touching = true; // Up-Right
                }
                
                if (!touching) {
                    board[r*size + c] = 1;
                    cols[c] = true;
                    if (placeRow(r + 1)) return true;
                    cols[c] = false;
                    board[r*size + c] = 0;
                }
            }
            return false;
        };

        if (placeRow(0)) return board;
        return null;
    }

    generateRegions(queensBoard) {
        const size = this.GRID_SIZE;
        const regions = Array(size * size).fill(-1);
        const queue = [];

        // Seed regions at queens
        for(let i=0; i<size*size; i++) {
            if (queensBoard[i] === 1) {
                // Determine region ID based on... well, we need N regions.
                // We have N queens. So each queen starts a region.
                // We assign IDs 0 to N-1 sequentially based on finding order?
                // No, we need to track them.
                // Let's assign IDs as we find them.
            }
        }

        let regionCount = 0;
        for(let r=0; r<size; r++) {
            for(let c=0; c<size; c++) {
                if (queensBoard[r*size+c] === 1) {
                    regions[r*size+c] = regionCount;
                    queue.push({r, c, id: regionCount});
                    regionCount++;
                }
            }
        }
        
        // Grow
        // Randomize queue pull or shuffle neighbors
        
        while(queue.length > 0) {
            // Pick a random element from queue to ensure organic growth
            const idx = Math.floor(Math.random() * queue.length);
            const {r, c, id} = queue.splice(idx, 1)[0];

            const neighbors = [
                {r: r-1, c}, {r: r+1, c}, {r, c: c-1}, {r, c: c+1}
            ];

            for (const n of neighbors) {
                if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
                    const nIdx = n.r * size + n.c;
                    if (regions[nIdx] === -1) {
                        regions[nIdx] = id;
                        queue.push({r: n.r, c: n.c, id});
                    }
                }
            }
        }

        // Check if any -1 left (should not happen if connected)
        // If there are disconnected pockets (unlikely with this flood fill), handle them
        // Just fill with random neighbor
        for(let i=0; i<size*size; i++) {
            if (regions[i] === -1) {
                // Just assign to neighbor
                const r = Math.floor(i / size);
                const c = i % size;
                if (r > 0) regions[i] = regions[(r-1)*size+c];
                else if (c > 0) regions[i] = regions[r*size+(c-1)];
                else regions[i] = 0; // Fallback
            }
        }
        
        return regions;
    }

    drawGrid() {
        this.gridElement.style.gridTemplateColumns = `repeat(${this.GRID_SIZE}, 48px)`;
        this.gridElement.innerHTML = '';

        // Border Logic:
        // We want thick borders between different regions.
        // Since we are using CSS Grid gaps, we can't easily draw lines *between* cells unless we use borders on cells.
        // We will use borders on cells.

        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                const idx = r * this.GRID_SIZE + c;
                const regionId = this.regions[idx];
                const cell = document.createElement('div');
                
                // Base styles
                // Explicit Sizing for robustness
                cell.className = "flex items-center justify-center cursor-pointer text-2xl transition-all relative";
                cell.style.width = "48px";
                cell.style.height = "48px";
                
                // Region Background
                cell.style.backgroundColor = this.regionColors[regionId];

                // Borders for Region Separation
                // Check Right
                if (c < this.GRID_SIZE - 1 && this.regions[r * this.GRID_SIZE + c + 1] !== regionId) {
                    cell.style.borderRight = "2px solid rgba(255,255,255,0.8)";
                } else {
                    cell.style.borderRight = "1px solid rgba(255,255,255,0.1)";
                }
                
                // Check Bottom
                if (r < this.GRID_SIZE - 1 && this.regions[(r + 1) * this.GRID_SIZE + c] !== regionId) {
                    cell.style.borderBottom = "2px solid rgba(255,255,255,0.8)";
                } else {
                    cell.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
                }

                // Check Left (for outer border consistency)
                if (c === 0) cell.style.borderLeft = "2px solid rgba(255,255,255,0.8)";
                // Check Top
                if (r === 0) cell.style.borderTop = "2px solid rgba(255,255,255,0.8)";
                // Check Right Edge
                if (c === this.GRID_SIZE - 1) cell.style.borderRight = "2px solid rgba(255,255,255,0.8)";
                // Check Bottom Edge
                if (r === this.GRID_SIZE - 1) cell.style.borderBottom = "2px solid rgba(255,255,255,0.8)";


                cell.dataset.idx = idx;
                cell.addEventListener('mousedown', (e) => this.handleInput(e, idx));

                this.gridElement.appendChild(cell);
            }
        }
        this.updateBoardVisuals();
    }

    updateCellVisual(cell, value) {
        if (value === 1) {
            cell.innerHTML = '<i class="fas fa-crown text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]"></i>';
            cell.classList.add('scale-110');
        } else if (value === 2) {
            cell.innerHTML = '<i class="fas fa-times text-slate-500/50 text-xl"></i>';
            cell.classList.remove('scale-110');
        } else {
            cell.innerHTML = '';
            cell.classList.remove('scale-110');
        }
    }

    handleInput(e, idx) {
        if (this.isLevelComplete) return;
        e.preventDefault();

        const current = this.grid[idx];
        let nextState = current;
        
        // Cycle: Empty (0) -> X (2) -> Queen (1) -> Empty (0)
        
        if (e.button === 0) { // Left Click
            if (current === 0) nextState = 2;       // Empty -> X
            else if (current === 2) nextState = 1;  // X -> Queen
            else if (current === 1) nextState = 0;  // Queen -> Empty
            
            this.grid[idx] = nextState;
            this.soundManager.playSound('click');

            // Auto-fill X around Queen if requested
            if (nextState === 1) {
                this.autoFillNeighbors(idx);
            }
        } else if (e.button === 2) { // Right Click (Shortcut for X)
            if (current === 2) nextState = 0;
            else nextState = 2;
            this.grid[idx] = nextState;
             this.soundManager.playTone(200, 'sine', 0.05);
        }

        this.updateBoardVisuals();
        this.clearErrors();
    }

    autoFillNeighbors(idx) {
        const r = Math.floor(idx / this.GRID_SIZE);
        const c = idx % this.GRID_SIZE;
        const size = this.GRID_SIZE;
        const neighbors = [
            {r: r-1, c}, {r: r+1, c}, {r, c: c-1}, {r, c: c+1},
            {r: r-1, c: c-1}, {r: r-1, c: c+1}, {r: r+1, c: c-1}, {r: r+1, c: c+1}
        ];

        for (const n of neighbors) {
            if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
                const nIdx = n.r * size + n.c;
                if (this.grid[nIdx] === 0) { // Only fill empty cells
                    this.grid[nIdx] = 2; // Mark as X
                }
            }
        }
    }

    updateBoardVisuals() {
        const size = this.GRID_SIZE;
        const rowComplete = Array(size).fill(false);
        const colComplete = Array(size).fill(false);
        const regionComplete = Array(size).fill(false);

        // Check completion
        for (let i = 0; i < size; i++) {
             const rowQueens = this.grid.slice(i*size, (i+1)*size).filter(v => v === 1).length;
             if (rowQueens === 1) rowComplete[i] = true;

             let colQueens = 0;
             for(let r=0; r<size; r++) if(this.grid[r*size+i] === 1) colQueens++;
             if (colQueens === 1) colComplete[i] = true;

             let regionQueens = 0;
             for(let x=0; x<size*size; x++) if(this.regions[x] === i && this.grid[x] === 1) regionQueens++;
             if (regionQueens === 1) regionComplete[i] = true;
        }

        for (let i = 0; i < size * size; i++) {
            const cell = this.gridElement.children[i];
            const r = Math.floor(i / size);
            const c = i % size;
            const region = this.regions[i];
            const val = this.grid[i];

            this.updateCellVisual(cell, val);

            // Dim cells that are in completed sets but are NOT the queen
            // This visual effect highlights the "solved" parts
            if ((rowComplete[r] || colComplete[c] || regionComplete[region]) && val !== 1) {
                cell.style.opacity = '0.3';
            } else {
                cell.style.opacity = '1';
            }
        }
    }

    checkWinCondition(manualCheck = false) {
        if (this.isLevelComplete) return;

        let isValid = true;
        const size = this.GRID_SIZE;
        const errors = new Set(); // indices of bad cells

        // Helper to add error
        const addError = (idx) => {
            isValid = false;
            errors.add(idx);
        };

        // 1. Check Rows
        for (let r = 0; r < size; r++) {
            let count = 0;
            let lastIdx = -1;
            for (let c = 0; c < size; c++) {
                const idx = r * size + c;
                if (this.grid[idx] === 1) {
                    count++;
                    lastIdx = idx;
                }
            }
            if (count !== 1) {
                // Mark row as error?
                // If manual check, yes.
                if (count > 1) {
                     for (let c = 0; c < size; c++) if (this.grid[r*size+c] === 1) addError(r*size+c);
                }
                if (count === 0 && manualCheck) isValid = false; // Missing queen
            }
        }

        // 2. Check Cols
        for (let c = 0; c < size; c++) {
            let count = 0;
            for (let r = 0; r < size; r++) {
                const idx = r * size + c;
                if (this.grid[idx] === 1) count++;
            }
            if (count !== 1) {
                if (count > 1) {
                     for (let r = 0; r < size; r++) if (this.grid[r*size+c] === 1) addError(r*size+c);
                }
                if (count === 0 && manualCheck) isValid = false;
            }
        }

        // 3. Check Regions
        for (let i = 0; i < size; i++) { // Region IDs are 0 to size-1
            let count = 0;
            const regionCells = [];
            for (let idx = 0; idx < size * size; idx++) {
                if (this.regions[idx] === i) {
                    regionCells.push(idx);
                    if (this.grid[idx] === 1) count++;
                }
            }
            if (count !== 1) {
                if (count > 1) {
                    regionCells.forEach(idx => { if(this.grid[idx] === 1) addError(idx); });
                }
                if (count === 0 && manualCheck) isValid = false;
            }
        }

        // 4. Check Touching (Orthogonal + Diagonal)
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const idx = r * size + c;
                if (this.grid[idx] === 1) {
                    // Check neighbors
                    const neighbors = [
                        {r: r-1, c}, {r: r+1, c}, {r, c: c-1}, {r, c: c+1},
                        {r: r-1, c: c-1}, {r: r-1, c: c+1}, {r: r+1, c: c-1}, {r: r+1, c: c+1}
                    ];
                    for (const n of neighbors) {
                        if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
                            const nIdx = n.r * size + n.c;
                            if (this.grid[nIdx] === 1) {
                                addError(idx);
                                addError(nIdx);
                            }
                        }
                    }
                }
            }
        }

        // Apply visual feedback
        if (manualCheck) {
            this.clearErrors();
            errors.forEach(idx => {
                const cell = this.gridElement.children[idx];
                cell.classList.add('animate-pulse');
                cell.style.boxShadow = 'inset 0 0 0 4px red';
            });
            
            if (errors.size > 0) {
                 this.soundManager.playTone(150, 'sawtooth', 0.2);
            }
        }

        if (manualCheck && isValid && errors.size === 0) {
            // Check if we actually have N queens (implicit by row/col checks but safe to be sure)
            const totalQueens = this.grid.filter(v => v === 1).length;
            if (totalQueens === size) {
                this.levelComplete();
            } else {
                // Missing queens somewhere if row/col checks didn't catch it (e.g. empty row AND empty col)
                 this.soundManager.playTone(150, 'sawtooth', 0.2);
            }
        }
    }

    clearErrors() {
        Array.from(this.gridElement.children).forEach(cell => {
            cell.classList.remove('animate-pulse');
            cell.style.boxShadow = 'none';
        });
    }

    levelComplete() {
        this.isLevelComplete = true;
        this.stopTimer();
        this.soundManager.playSound('score');
        
        // Award prize
        const prize = 50 * this.currentLevel;
        this.saveSystem.addCurrency(prize);
        
        this.checkBtn.classList.add('hidden');
        this.nextBtn.classList.remove('hidden');
        
        // Confetti?
        // Reuse particle system if available or simple effect
    }

    resetBoard() {
        this.grid = Array(this.GRID_SIZE * this.GRID_SIZE).fill(0);
        this.drawGrid(); // Re-render to clear visuals
        this.clearErrors();
    }

    startTimer() {
        this.stopTimer();
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            if (this.timerElement) this.timerElement.textContent = elapsed + 's';
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    shutdown() {
        this.stopTimer();
    }
}
