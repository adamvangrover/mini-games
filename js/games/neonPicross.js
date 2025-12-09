import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonPicrossGame {
    constructor() {
        this.GRID_SIZE = 5;
        this.grid = []; // Stores user state: 0=Empty, 1=Filled, 2=Marked(X)
        this.solution = []; // 0=Empty, 1=Filled
        this.rowClues = [];
        this.colClues = [];
        this.isLevelComplete = false;
        this.currentLevel = 1;
        this.timerInterval = null;
        this.startTime = 0;

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
            <div class="flex flex-col items-center h-full max-w-4xl mx-auto p-4 select-none">
                <div class="flex justify-between items-center w-full mb-4">
                    <h2 class="text-3xl font-bold text-cyan-400 font-display shadow-cyan-500/50 drop-shadow-md">🧩 Neon Picross</h2>
                    <div class="flex gap-4">
                        <div class="bg-slate-800 px-4 py-2 rounded border border-slate-600">
                            <span class="text-slate-400 text-xs uppercase">Level</span>
                            <span id="picross-level" class="block text-xl font-bold text-white leading-none">1</span>
                        </div>
                        <div class="bg-slate-800 px-4 py-2 rounded border border-slate-600">
                            <span class="text-slate-400 text-xs uppercase">Time</span>
                            <span id="picross-timer" class="block text-xl font-bold text-white leading-none font-mono">0s</span>
                        </div>
                    </div>
                </div>

                <div class="relative bg-slate-900/80 p-4 rounded-xl shadow-2xl border border-slate-700 flex flex-col items-center">
                    
                    <!-- Game Board Container (Flex for Clues) -->
                    <div class="flex">
                        <!-- Left Clues (Rows) -->
                        <div id="picross-row-clues" class="flex flex-col justify-around text-right pr-2 text-slate-300 font-mono text-sm leading-none pt-[var(--cell-size)]" style="padding-top: 0;">
                            <!-- Injected -->
                        </div>

                        <div class="flex flex-col">
                            <!-- Top Clues (Cols) -->
                            <div id="picross-col-clues" class="flex justify-around text-center pb-2 text-slate-300 font-mono text-sm leading-none pl-[var(--cell-size)]" style="padding-left: 0;">
                                <!-- Injected -->
                            </div>
                            
                            <!-- The Grid -->
                            <div id="picross-grid" class="grid gap-px bg-slate-600 border border-slate-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                                <!-- Cells Injected -->
                            </div>
                        </div>
                    </div>

                </div>

                <div class="flex gap-4 mt-6">
                    <button id="picross-reset-btn" class="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-colors">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                    <button id="picross-next-btn" class="hidden px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded font-bold transition-colors shadow-lg shadow-cyan-500/30 animate-pulse">
                        Next Level <i class="fas fa-arrow-right"></i>
                    </button>
                </div>

                <p class="mt-4 text-slate-400 text-sm max-w-lg text-center">
                    Left Click: Fill ⬛ | Right Click: Mark X ❌ <br>
                    Use the numbers to deduce which cells to fill.
                </p>
                <button class="back-btn mt-4 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm rounded">Back to Menu</button>
            </div>
        `;

        this.gridElement = this.container.querySelector('#picross-grid');
        this.rowCluesElement = this.container.querySelector('#picross-row-clues');
        this.colCluesElement = this.container.querySelector('#picross-col-clues');
        this.levelElement = this.container.querySelector('#picross-level');
        this.timerElement = this.container.querySelector('#picross-timer');
        this.nextBtn = this.container.querySelector('#picross-next-btn');

        this.nextBtn.onclick = () => this.startLevel(this.currentLevel + 1);
        this.container.querySelector('#picross-reset-btn').onclick = () => this.resetBoard();
        
        this.container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        this.gridElement.addEventListener('contextmenu', e => e.preventDefault());
    }

    startLevel(level) {
        this.currentLevel = level;
        this.levelElement.textContent = level;
        this.isLevelComplete = false;
        this.nextBtn.classList.add('hidden');
        
        // Difficulty
        if (level <= 2) this.GRID_SIZE = 5;
        else if (level <= 5) this.GRID_SIZE = 10;
        else this.GRID_SIZE = 15;
        
        this.generateLevel();
        this.drawBoard();
        this.startTimer();
    }

    generateLevel() {
        const size = this.GRID_SIZE;
        this.solution = Array(size * size).fill(0);
        
        // Randomly fill grid (approx 50-60% fill rate for interesting puzzles)
        for(let i=0; i<size*size; i++) {
            this.solution[i] = Math.random() < 0.55 ? 1 : 0;
        }

        // Calculate Clues
        this.rowClues = [];
        this.colClues = [];

        // Rows
        for(let r=0; r<size; r++) {
            const row = [];
            let count = 0;
            for(let c=0; c<size; c++) {
                if(this.solution[r*size+c] === 1) count++;
                else if(count > 0) { row.push(count); count = 0; }
            }
            if(count > 0) row.push(count);
            if(row.length === 0) row.push(0);
            this.rowClues.push(row);
        }

        // Cols
        for(let c=0; c<size; c++) {
            const col = [];
            let count = 0;
            for(let r=0; r<size; r++) {
                if(this.solution[r*size+c] === 1) count++;
                else if(count > 0) { col.push(count); count = 0; }
            }
            if(count > 0) col.push(count);
            if(col.length === 0) col.push(0);
            this.colClues.push(col);
        }

        // Reset User Grid
        this.grid = Array(size * size).fill(0);
    }

    drawBoard() {
        const size = this.GRID_SIZE;
        const cellSize = size === 15 ? 24 : (size === 10 ? 32 : 48); // Adaptive sizing
        
        this.gridElement.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
        this.gridElement.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
        this.gridElement.innerHTML = '';

        // Draw Cells
        for(let i=0; i<size*size; i++) {
            const cell = document.createElement('div');
            cell.className = "bg-slate-800 border-r border-b border-slate-700 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-700 transition-colors";
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            
            // Thick borders every 5 cells
            const r = Math.floor(i / size);
            const c = i % size;
            if (c > 0 && c % 5 === 0) cell.style.borderLeft = "2px solid #94a3b8";
            if (r > 0 && r % 5 === 0) cell.style.borderTop = "2px solid #94a3b8";

            cell.addEventListener('mousedown', (e) => this.handleInput(e, i));
            cell.addEventListener('mouseenter', (e) => {
                if(e.buttons === 1) this.handleInput(e, i, 0); // Drag Fill
                if(e.buttons === 2) this.handleInput(e, i, 2); // Drag Cross
            });
            
            this.gridElement.appendChild(cell);
        }

        // Draw Clues
        this.rowCluesElement.innerHTML = '';
        this.rowCluesElement.style.paddingTop = `${cellSize}px`; // ? No, grid alignment
        // Actually, flex alignment handles this if we structure it right.
        // We need row clues to match row heights.
        
        this.rowCluesElement.innerHTML = this.rowClues.map(clue => 
            `<div class="flex items-center justify-end gap-1 pr-2" style="height: ${cellSize}px;">
                ${clue.map(n => `<span class="${n===0?'text-slate-600':''}">${n}</span>`).join(' ')}
             </div>`
        ).join('');

        this.colCluesElement.innerHTML = this.colClues.map((clue, idx) => 
            `<div class="flex flex-col items-center justify-end gap-0 pb-1" style="width: ${cellSize}px; ${idx>0&&idx%5==0?'border-left: 1px solid transparent':''}">
                ${clue.map(n => `<span class="${n===0?'text-slate-600':''}">${n}</span>`).join('')}
             </div>`
        ).join('');
        
        // Visual Update
        this.updateVisuals();
    }

    handleInput(e, idx, forcedType = null) {
        if (this.isLevelComplete) return;
        e.preventDefault(); // Stop context menu

        let type = forcedType;
        if (type === null) {
            if (e.button === 0) type = 0; // Fill intent
            else if (e.button === 2) type = 2; // Cross intent
        }

        const current = this.grid[idx];
        
        // Logic:
        // Left Click (0): Empty -> Fill (1), Fill -> Empty (0), Cross -> Fill (1) ? Usually Cross blocks fill.
        // Right Click (2): Empty -> Cross (2), Cross -> Empty (0), Fill -> Cross (2)?
        
        // Simple Toggle for single clicks
        if (forcedType === null) {
            if (e.button === 0) {
                 if (current === 1) this.grid[idx] = 0;
                 else this.grid[idx] = 1;
                 this.soundManager.playSound('click');
            } else if (e.button === 2) {
                 if (current === 2) this.grid[idx] = 0;
                 else this.grid[idx] = 2;
                 this.soundManager.playTone(200, 'sine', 0.05);
            }
        } else {
            // Drag logic: Apply specific state
            if (forcedType === 0) { // Drag Fill
                // Only fill if empty? Or overwrite cross?
                // Usually drag fill is "paint".
                this.grid[idx] = 1;
            } else if (forcedType === 2) { // Drag Cross
                this.grid[idx] = 2;
            }
        }

        this.updateVisuals();
        this.checkWin();
    }

    updateVisuals() {
        const cells = this.gridElement.children;
        for(let i=0; i<cells.length; i++) {
            const val = this.grid[i];
            const cell = cells[i];
            
            if (val === 1) { // Filled
                cell.className = "bg-cyan-500 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] border-r border-b border-cyan-600 flex items-center justify-center transition-colors";
                cell.innerHTML = '';
            } else if (val === 2) { // Cross
                cell.className = "bg-slate-800 border-r border-b border-slate-700 flex items-center justify-center text-slate-600 text-lg transition-colors";
                cell.innerHTML = '×';
            } else { // Empty
                cell.className = "bg-slate-800 border-r border-b border-slate-700 flex items-center justify-center text-transparent hover:bg-slate-700 transition-colors";
                cell.innerHTML = '';
            }
            
            // Re-apply layout styles
            const size = this.GRID_SIZE;
            const cellSize = size === 15 ? 24 : (size === 10 ? 32 : 48);
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            
             const r = Math.floor(i / size);
            const c = i % size;
            if (c > 0 && c % 5 === 0) cell.style.borderLeft = "2px solid #64748b";
            if (r > 0 && r % 5 === 0) cell.style.borderTop = "2px solid #64748b";
        }
    }

    checkWin() {
        // Compare grid (1s) with solution (1s)
        // 2s (Crosses) don't matter for win, only 1s match
        let isWin = true;
        for(let i=0; i<this.grid.length; i++) {
            const userVal = this.grid[i] === 1 ? 1 : 0;
            if (userVal !== this.solution[i]) {
                isWin = false;
                break;
            }
        }

        if (isWin) {
            this.isLevelComplete = true;
            this.stopTimer();
            this.soundManager.playSound('score');
            this.saveSystem.addCurrency(50 * this.currentLevel);
            this.nextBtn.classList.remove('hidden');
            
            // Auto-fill remaining Xs for polish
            for(let i=0; i<this.grid.length; i++) {
                if (this.grid[i] === 0) this.grid[i] = 2;
            }
            this.updateVisuals();
        }
    }

    resetBoard() {
        this.grid = Array(this.GRID_SIZE * this.GRID_SIZE).fill(0);
        this.updateVisuals();
    }

    startTimer() {
        this.stopTimer();
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            if(this.timerElement) this.timerElement.textContent = elapsed + 's';
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    shutdown() {
        this.stopTimer();
    }
}
