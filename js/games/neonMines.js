import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonMinesGame {
    constructor() {
        this.GRID_SIZE = 10;
        this.MINES_COUNT = 15;
        this.grid = []; // Objects: { isMine, isOpen, isFlagged, neighborCount }
        this.gameOver = false;
        this.level = 1;
        this.timerInterval = null;
        this.startTime = 0;
        
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        this.container = container;
        this.setupUI();
        this.startLevel(1);
    }

    setupUI() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center max-w-lg mx-auto p-4 bg-slate-900/50 rounded-xl backdrop-blur-md border border-slate-700">
                <div class="flex justify-between w-full mb-4 items-end">
                    <h2 class="text-3xl font-bold text-cyan-400 font-display shadow-cyan-500/50 drop-shadow-md">💣 Neon Mines</h2>
                    <div class="text-right">
                        <div class="text-xs text-slate-400 uppercase tracking-widest">Level</div>
                        <div id="mines-level" class="text-2xl font-bold text-white leading-none">1</div>
                    </div>
                </div>

                <div class="flex justify-between w-full mb-4 px-2">
                    <div class="bg-slate-800 px-3 py-1 rounded border border-slate-600 text-red-400 font-mono">
                        <i class="fas fa-bomb"></i> <span id="mines-count">00</span>
                    </div>
                    <div class="bg-slate-800 px-3 py-1 rounded border border-slate-600 text-green-400 font-mono">
                        <i class="fas fa-clock"></i> <span id="mines-timer">000</span>
                    </div>
                </div>

                <div id="mines-grid" class="grid gap-1 bg-slate-800 p-1 rounded shadow-inner shadow-black/50 select-none">
                    <!-- Grid Injected Here -->
                </div>

                <div class="mt-6 flex gap-4">
                    <button id="mines-restart-btn" class="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded shadow transition-colors">Restart</button>
                    <button id="mines-next-btn" class="hidden px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow shadow-cyan-500/20 animate-pulse">Next Level</button>
                </div>
                
                <p class="mt-4 text-xs text-slate-500">Left Click: Reveal | Right Click: Flag</p>
                <button class="back-btn mt-2 text-sm text-red-400 hover:text-red-300 underline">Exit Game</button>
            </div>
        `;

        this.gridElement = this.container.querySelector('#mines-grid');
        this.levelDisplay = this.container.querySelector('#mines-level');
        this.mineCounter = this.container.querySelector('#mines-count');
        this.timerDisplay = this.container.querySelector('#mines-timer');
        this.restartBtn = this.container.querySelector('#mines-restart-btn');
        this.nextBtn = this.container.querySelector('#mines-next-btn');

        this.restartBtn.onclick = () => this.startLevel(this.level);
        this.nextBtn.onclick = () => this.startLevel(this.level + 1);
        
        this.container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        // Disable Context Menu
        this.gridElement.addEventListener('contextmenu', e => e.preventDefault());
    }

    startLevel(level) {
        this.level = level;
        this.gameOver = false;
        this.nextBtn.classList.add('hidden');
        this.levelDisplay.textContent = level;
        
        // Difficulty Scaling
        // Level 1: 8x8, 10 mines
        // Level 2: 10x10, 15 mines
        // Level 3: 12x12, 25 mines
        // Level 5: 16x16, 40 mines
        
        if (level === 1) { this.GRID_SIZE = 8; this.MINES_COUNT = 10; }
        else if (level === 2) { this.GRID_SIZE = 10; this.MINES_COUNT = 15; }
        else if (level <= 4) { this.GRID_SIZE = 12; this.MINES_COUNT = 25; }
        else { this.GRID_SIZE = 16; this.MINES_COUNT = 40 + (level-5)*5; }

        this.mineCounter.textContent = this.MINES_COUNT;
        
        this.initGrid();
        this.renderGrid();
        this.startTimer();
    }

    initGrid() {
        const size = this.GRID_SIZE;
        this.grid = Array(size * size).fill(null).map(() => ({
            isMine: false,
            isOpen: false,
            isFlagged: false,
            neighborCount: 0
        }));

        // Place Mines
        let minesPlaced = 0;
        while (minesPlaced < this.MINES_COUNT) {
            const idx = Math.floor(Math.random() * (size * size));
            if (!this.grid[idx].isMine) {
                this.grid[idx].isMine = true;
                minesPlaced++;
            }
        }

        // Calculate Neighbors
        for (let i = 0; i < size * size; i++) {
            if (this.grid[i].isMine) continue;
            
            const neighbors = this.getNeighbors(i);
            let count = 0;
            neighbors.forEach(nIdx => {
                if (this.grid[nIdx].isMine) count++;
            });
            this.grid[i].neighborCount = count;
        }
    }

    getNeighbors(idx) {
        const size = this.GRID_SIZE;
        const r = Math.floor(idx / size);
        const c = idx % size;
        const neighbors = [];
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    neighbors.push(nr * size + nc);
                }
            }
        }
        return neighbors;
    }

    renderGrid() {
        this.gridElement.style.gridTemplateColumns = `repeat(${this.GRID_SIZE}, 1fr)`;
        this.gridElement.innerHTML = '';
        
        this.grid.forEach((cell, i) => {
            const cellEl = document.createElement('div');
            // Base Style
            let classes = "aspect-square flex items-center justify-center text-sm font-bold cursor-pointer transition-all duration-100 rounded-sm ";
            
            if (cell.isOpen) {
                if (cell.isMine) {
                    classes += "bg-red-600/80 text-white shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]";
                    cellEl.innerHTML = '<i class="fas fa-bomb animate-pulse"></i>';
                } else {
                    classes += "bg-slate-800/50 shadow-inner";
                    if (cell.neighborCount > 0) {
                        const colors = ['text-blue-400', 'text-green-400', 'text-red-400', 'text-purple-400', 'text-yellow-400', 'text-pink-400', 'text-orange-400', 'text-white'];
                        classes += ` ${colors[cell.neighborCount-1]}`;
                        cellEl.textContent = cell.neighborCount;
                    }
                }
            } else {
                // Closed
                classes += "bg-slate-700 hover:bg-slate-600 border-t border-l border-slate-600 border-b border-r border-slate-800 shadow-md active:bg-slate-800";
                if (cell.isFlagged) {
                    cellEl.innerHTML = '<i class="fas fa-flag text-red-500 text-xs"></i>';
                }
            }
            
            cellEl.className = classes;
            
            cellEl.onmousedown = (e) => this.handleInput(e, i);
            this.gridElement.appendChild(cellEl);
        });
    }

    handleInput(e, idx) {
        if (this.gameOver) return;
        
        const cell = this.grid[idx];
        
        if (e.button === 2) { // Right Click - Flag
            if (!cell.isOpen) {
                cell.isFlagged = !cell.isFlagged;
                this.soundManager.playTone(600, 'sine', 0.05);
                this.updateCellVisual(idx);
                this.updateMineCounter();
            }
        } else if (e.button === 0) { // Left Click - Reveal or Chord
            if (cell.isFlagged) return;
            
            // First Click Safety: If this is the very first click on the board, ensure it's not a mine.
            const openedCount = this.grid.filter(c => c.isOpen).length;
            if (openedCount === 0 && !cell.isOpen) {
                if (cell.isMine) {
                    this.relocateMine(idx);
                }
            }

            if (cell.isOpen) {
                // Chording: If cell is already open, try to clear neighbors
                if (cell.neighborCount > 0) {
                    const neighbors = this.getNeighbors(idx);
                    const flaggedCount = neighbors.filter(nIdx => this.grid[nIdx].isFlagged).length;
                    
                    if (flaggedCount === cell.neighborCount) {
                        let chordRevealed = false;
                        neighbors.forEach(nIdx => {
                            const neighbor = this.grid[nIdx];
                            if (!neighbor.isOpen && !neighbor.isFlagged) {
                                if (neighbor.isMine) this.explode(nIdx);
                                else this.reveal(nIdx);
                                chordRevealed = true;
                            }
                        });
                        if (chordRevealed) {
                             this.soundManager.playTone(400, 'square', 0.1);
                             this.checkWin();
                        }
                    }
                }
            } else {
                // Normal Reveal
                if (cell.isMine) {
                    this.explode(idx);
                } else {
                    this.reveal(idx);
                    this.soundManager.playTone(300 + (Math.random()*100), 'triangle', 0.05);
                    this.checkWin();
                }
            }
        }
    }

    relocateMine(safeIdx) {
        // Move mine from safeIdx to first available non-mine spot
        this.grid[safeIdx].isMine = false;
        
        // Find new spot
        let moved = false;
        const size = this.GRID_SIZE;
        // Try random spots first
        let attempts = 0;
        while (!moved && attempts < 100) {
            const newIdx = Math.floor(Math.random() * (size * size));
            if (newIdx !== safeIdx && !this.grid[newIdx].isMine) {
                this.grid[newIdx].isMine = true;
                moved = true;
            }
            attempts++;
        }
        
        // Fallback linear scan
        if (!moved) {
            for(let i=0; i<size*size; i++) {
                if (i !== safeIdx && !this.grid[i].isMine) {
                    this.grid[i].isMine = true;
                    moved = true;
                    break;
                }
            }
        }

        // Re-calculate neighbor counts for the whole board
        // This is expensive but happens only once on first click
        for (let i = 0; i < size * size; i++) {
            if (this.grid[i].isMine) continue;
            
            const neighbors = this.getNeighbors(i);
            let count = 0;
            neighbors.forEach(nIdx => {
                if (this.grid[nIdx].isMine) count++;
            });
            this.grid[i].neighborCount = count;
        }
    }

    reveal(idx) {
        const cell = this.grid[idx];
        if (cell.isOpen || cell.isFlagged) return;
        
        cell.isOpen = true;
        this.updateCellVisual(idx);
        
        if (cell.neighborCount === 0) {
            // Flood fill
            const neighbors = this.getNeighbors(idx);
            setTimeout(() => {
                neighbors.forEach(nIdx => this.reveal(nIdx));
            }, 10);
        }
    }

    explode(idx) {
        this.gameOver = true;
        this.stopTimer();
        this.grid[idx].isOpen = true; // Reveal clicked mine
        this.updateCellVisual(idx);
        
        this.soundManager.playSound('explosion'); // Need explosion sound or tone
        this.soundManager.playTone(100, 'sawtooth', 0.5);
        
        // Reveal all mines
        this.grid.forEach((c, i) => {
            if (c.isMine) {
                setTimeout(() => {
                    c.isOpen = true;
                    this.updateCellVisual(i);
                }, Math.random() * 500);
            }
        });
        
        this.container.querySelector('#mines-level').innerHTML += ' <span class="text-red-500 text-sm">(FAILED)</span>';
    }

    checkWin() {
        const totalSafe = (this.GRID_SIZE * this.GRID_SIZE) - this.MINES_COUNT;
        const openedSafe = this.grid.filter(c => c.isOpen && !c.isMine).length;
        
        if (openedSafe === totalSafe) {
            this.gameOver = true;
            this.stopTimer();
            this.soundManager.playSound('score');
            this.saveSystem.addCurrency(20 * this.level);
            this.nextBtn.classList.remove('hidden');
            
            // Flag remaining mines
            this.grid.forEach((c, i) => {
                if (c.isMine && !c.isFlagged) {
                    c.isFlagged = true;
                    this.updateCellVisual(i);
                }
            });
            this.updateMineCounter();
        }
    }

    updateCellVisual(idx) {
        const cell = this.grid[idx];
        const cellEl = this.gridElement.children[idx];
        
        // Base Style
        let classes = "aspect-square flex items-center justify-center text-sm font-bold cursor-pointer transition-all duration-100 rounded-sm ";
        cellEl.innerHTML = '';
        
        if (cell.isOpen) {
            if (cell.isMine) {
                classes += "bg-red-600/80 text-white shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]";
                cellEl.innerHTML = '<i class="fas fa-bomb animate-pulse"></i>';
            } else {
                classes += "bg-slate-800/50 shadow-inner";
                if (cell.neighborCount > 0) {
                    const colors = ['text-blue-400', 'text-green-400', 'text-red-400', 'text-purple-400', 'text-yellow-400', 'text-pink-400', 'text-orange-400', 'text-white'];
                    classes += ` ${colors[cell.neighborCount-1]}`;
                    cellEl.textContent = cell.neighborCount;
                }
            }
        } else {
            classes += "bg-slate-700 hover:bg-slate-600 border-t border-l border-slate-600 border-b border-r border-slate-800 shadow-md active:bg-slate-800";
            if (cell.isFlagged) {
                cellEl.innerHTML = '<i class="fas fa-flag text-red-500 text-xs"></i>';
            }
        }
        cellEl.className = classes;
    }

    updateMineCounter() {
        const flagged = this.grid.filter(c => c.isFlagged).length;
        this.mineCounter.textContent = Math.max(0, this.MINES_COUNT - flagged);
    }

    startTimer() {
        this.stopTimer();
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.timerDisplay.textContent = elapsed.toString().padStart(3, '0');
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    shutdown() {
        this.stopTimer();
    }
}
