import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonGridStrike {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;

        // Grid parameters
        this.gridSize = 10;
        this.cellSize = 30; // base size, can scale

        // Game State
        // phase: 'placement', 'player-turn', 'enemy-turn', 'game-over'
        this.phase = 'placement';

        // Ship definitions: sizes
        this.shipSizes = [5, 4, 3, 3, 2];
        this.currentShipIndex = 0;
        this.isHorizontal = true;

        // Grids: 0=empty, 1=ship, 2=hit, 3=miss
        this.playerGrid = Array(100).fill(0);
        this.enemyGrid = Array(100).fill(0);

        this.playerShips = []; // { cells: [], hits: 0, size: number }
        this.enemyShips = [];

        this.playerHits = 0;
        this.enemyHits = 0;
        this.totalShipCells = this.shipSizes.reduce((a, b) => a + b, 0);

        // Elements
        this.playerGridEl = null;
        this.enemyGridEl = null;
        this.messageEl = null;
    }

    async init(container) {
        this.container = container;
        this.renderLayout();
        this.bindEvents();
        this.startGame();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full w-full font-mono text-slate-300 relative select-none">
                <h2 class="text-4xl font-bold text-cyan-400 neon-text mb-4">NEON GRID STRIKE</h2>

                <div id="ngs-message" class="text-xl text-yellow-400 mb-6 h-8 text-center px-4 py-1 bg-slate-800 rounded border border-yellow-500/50">
                    Deploy your fleet! Use 'R' or Right-Click to rotate.
                </div>

                <div class="flex flex-col md:flex-row gap-8 items-center">
                    <!-- Player Fleet -->
                    <div class="flex flex-col items-center">
                        <h3 class="text-lg text-fuchsia-400 mb-2">RADAR: ALLIED FLEET</h3>
                        <div id="ngs-player-grid" class="grid grid-cols-10 gap-1 bg-slate-800 p-2 rounded border-2 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
                            <!-- Cells injected here -->
                        </div>
                    </div>

                    <!-- Divider/Info -->
                    <div class="flex flex-col items-center justify-center">
                        <button id="ngs-rotate-btn" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-500 transition-colors mb-4 block md:hidden">
                            <i class="fas fa-rotate"></i> Rotate
                        </button>
                    </div>

                    <!-- Enemy Fleet -->
                    <div class="flex flex-col items-center">
                        <h3 class="text-lg text-red-400 mb-2">RADAR: HOSTILE SECTOR</h3>
                        <div id="ngs-enemy-grid" class="grid grid-cols-10 gap-1 bg-slate-800 p-2 rounded border-2 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] opacity-50 pointer-events-none transition-opacity duration-500">
                            <!-- Cells injected here -->
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .ngs-cell {
                    width: 30px;
                    height: 30px;
                    background-color: rgba(15, 23, 42, 0.8);
                    border: 1px solid rgba(56, 189, 248, 0.2);
                    cursor: crosshair;
                    transition: all 0.2s;
                }
                .ngs-cell:hover {
                    background-color: rgba(56, 189, 248, 0.4);
                }

                .ngs-cell.ship { background-color: rgba(217, 70, 239, 0.6); border-color: rgb(217, 70, 239); }
                .ngs-cell.ship-preview { background-color: rgba(217, 70, 239, 0.4); }
                .ngs-cell.ship-invalid { background-color: rgba(239, 68, 68, 0.4); cursor: not-allowed; }

                .ngs-cell.hit {
                    background-color: rgba(239, 68, 68, 0.8);
                    border-color: rgb(239, 68, 68);
                    position: relative;
                }
                .ngs-cell.hit::after {
                    content: '✕';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                }

                .ngs-cell.miss {
                    background-color: rgba(148, 163, 184, 0.5);
                    border-color: rgb(148, 163, 184);
                    position: relative;
                }
                .ngs-cell.miss::after {
                    content: '•';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: rgba(255,255,255,0.5);
                    font-size: 24px;
                }

                @media (max-width: 768px) {
                    .ngs-cell { width: 22px; height: 22px; }
                }
            </style>
        `;

        this.playerGridEl = document.getElementById('ngs-player-grid');
        this.enemyGridEl = document.getElementById('ngs-enemy-grid');
        this.messageEl = document.getElementById('ngs-message');

        this.initGridDOM(this.playerGridEl, 'player');
        this.initGridDOM(this.enemyGridEl, 'enemy');
    }

    initGridDOM(containerEl, side) {
        containerEl.innerHTML = '';
        for (let i = 0; i < 100; i++) {
            const cell = document.createElement('div');
            cell.className = 'ngs-cell';
            cell.dataset.index = i;
            cell.dataset.side = side;
            containerEl.appendChild(cell);
        }
    }

    bindEvents() {
        // Keyboard rotation
        window.addEventListener('keydown', this.handleKeyDown);

        // Mobile button rotation
        const rotateBtn = document.getElementById('ngs-rotate-btn');
        if (rotateBtn) {
            rotateBtn.addEventListener('click', () => {
                this.isHorizontal = !this.isHorizontal;
                this.soundManager.playSound('click');
            });
        }

        // Grid Interaction
        this.playerGridEl.addEventListener('mouseover', (e) => this.handleMouseOver(e, 'player'));
        this.playerGridEl.addEventListener('mouseout', () => this.clearPreview());
        this.playerGridEl.addEventListener('click', (e) => this.handleClick(e, 'player'));

        this.enemyGridEl.addEventListener('click', (e) => this.handleClick(e, 'enemy'));

        // Prevent context menu on right click to allow rotation
        this.playerGridEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.phase === 'placement') {
                this.isHorizontal = !this.isHorizontal;
                this.soundManager.playSound('click');
                this.handleMouseOver(e, 'player'); // Refresh preview
            }
        });
    }

    handleKeyDown = (e) => {
        if (this.phase === 'placement' && (e.key === 'r' || e.key === 'R')) {
            this.isHorizontal = !this.isHorizontal;
            this.soundManager.playSound('click');
        }
    }

    startGame() {
        this.phase = 'placement';
        this.currentShipIndex = 0;
        this.isHorizontal = true;
        this.playerGrid.fill(0);
        this.enemyGrid.fill(0);
        this.playerShips = [];
        this.enemyShips = [];
        this.playerHits = 0;
        this.enemyHits = 0;

        // Reset DOM
        Array.from(this.playerGridEl.children).forEach(c => c.className = 'ngs-cell');
        Array.from(this.enemyGridEl.children).forEach(c => c.className = 'ngs-cell');

        this.enemyGridEl.classList.add('opacity-50', 'pointer-events-none');

        this.updateMessage();
    }

    updateMessage() {
        if (this.phase === 'placement') {
            const size = this.shipSizes[this.currentShipIndex];
            this.messageEl.textContent = `Deploying Ship: Size ${size}. 'R' or Right-Click to rotate.`;
            this.messageEl.className = "text-xl text-yellow-400 mb-6 h-8 text-center px-4 py-1 bg-slate-800 rounded border border-yellow-500/50";
        }
    }

    getShipCells(startIndex, size, horizontal) {
        const cells = [];
        const startX = startIndex % this.gridSize;
        const startY = Math.floor(startIndex / this.gridSize);

        for (let i = 0; i < size; i++) {
            let x = startX + (horizontal ? i : 0);
            let y = startY + (horizontal ? 0 : i);

            if (x >= this.gridSize || y >= this.gridSize) return null; // Out of bounds

            const idx = y * this.gridSize + x;
            if (this.playerGrid[idx] !== 0) return null; // Collision

            cells.push(idx);
        }
        return cells;
    }

    clearPreview() {
        Array.from(this.playerGridEl.children).forEach(cell => {
            cell.classList.remove('ship-preview', 'ship-invalid');
        });
    }

    handleMouseOver(e, side) {
        if (this.phase !== 'placement' || side !== 'player') return;
        if (!e.target.classList.contains('ngs-cell')) return;

        this.clearPreview();
        const index = parseInt(e.target.dataset.index);
        const size = this.shipSizes[this.currentShipIndex];

        const cells = this.getShipCells(index, size, this.isHorizontal);

        if (cells) {
            cells.forEach(idx => this.playerGridEl.children[idx].classList.add('ship-preview'));
        } else {
            // Draw invalid preview
            const startX = index % this.gridSize;
            const startY = Math.floor(index / this.gridSize);
            for (let i = 0; i < size; i++) {
                let x = startX + (this.isHorizontal ? i : 0);
                let y = startY + (this.isHorizontal ? 0 : i);
                if (x < this.gridSize && y < this.gridSize) {
                    this.playerGridEl.children[y * this.gridSize + x].classList.add('ship-invalid');
                }
            }
        }
    }

    handleClick(e, side) {
        if (!e.target.classList.contains('ngs-cell')) return;
        const index = parseInt(e.target.dataset.index);

        if (this.phase === 'placement' && side === 'player') {
            this.placePlayerShip(index);
        } else if (this.phase === 'player-turn' && side === 'enemy') {
            this.fireAtEnemy(index);
        }
    }

    placePlayerShip(index) {
        const size = this.shipSizes[this.currentShipIndex];
        const cells = this.getShipCells(index, size, this.isHorizontal);

        if (cells) {
            this.soundManager.playSound('click');
            // Mark grid and DOM
            cells.forEach(idx => {
                this.playerGrid[idx] = 1;
                this.playerGridEl.children[idx].classList.add('ship');
                this.playerGridEl.children[idx].classList.remove('ship-preview');
            });

            this.playerShips.push({ cells, hits: 0, size });
            this.currentShipIndex++;

            if (this.currentShipIndex >= this.shipSizes.length) {
                this.finishPlacement();
            } else {
                this.updateMessage();
            }
        } else {
            this.soundManager.playSound('error');
        }
    }

    finishPlacement() {
        this.clearPreview();
        this.phase = 'player-turn';
        this.messageEl.textContent = "HOSTILES DETECTED. AWAITING FIRING COORDINATES.";
        this.messageEl.className = "text-xl text-red-400 mb-6 h-8 text-center px-4 py-1 bg-slate-800 rounded border border-red-500/50 animate-pulse";

        const rotateBtn = document.getElementById('ngs-rotate-btn');
        if (rotateBtn) rotateBtn.style.display = 'none';

        this.enemyGridEl.classList.remove('opacity-50', 'pointer-events-none');

        this.generateEnemyShips();
    }

    generateEnemyShips() {
        // Simple random placement
        for (const size of this.shipSizes) {
            let placed = false;
            while (!placed) {
                const horizontal = Math.random() > 0.5;
                const startIndex = Math.floor(Math.random() * 100);

                // Temporary check function similar to getShipCells but for enemy grid
                const cells = [];
                const startX = startIndex % this.gridSize;
                const startY = Math.floor(startIndex / this.gridSize);
                let valid = true;

                for (let i = 0; i < size; i++) {
                    let x = startX + (horizontal ? i : 0);
                    let y = startY + (horizontal ? 0 : i);

                    if (x >= this.gridSize || y >= this.gridSize) { valid = false; break; }

                    const idx = y * this.gridSize + x;
                    if (this.enemyGrid[idx] !== 0) { valid = false; break; }

                    cells.push(idx);
                }

                if (valid) {
                    cells.forEach(idx => this.enemyGrid[idx] = 1);
                    this.enemyShips.push({ cells, hits: 0, size });
                    placed = true;
                }
            }
        }
    }

    fireAtEnemy(index) {
        // Check if already fired here
        if (this.enemyGrid[index] > 1 || this.phase !== 'player-turn') return;

        // Hit or Miss
        if (this.enemyGrid[index] === 1) {
            this.enemyGrid[index] = 2; // Hit
            this.enemyGridEl.children[index].classList.add('hit');
            this.soundManager.playSound('explosion');
            this.playerHits++;

            // Check for ship sunk
            this.checkShipSunk(this.enemyShips, index, 'ENEMY');

            this.messageEl.textContent = "TARGET HIT. ENEMY TURN.";
            this.messageEl.className = "text-xl text-green-400 mb-6 h-8 text-center px-4 py-1 bg-slate-800 rounded border border-green-500/50";
        } else {
            this.enemyGrid[index] = 3; // Miss
            this.enemyGridEl.children[index].classList.add('miss');
            this.soundManager.playSound('shoot'); // using generic shoot as splash sound
            this.messageEl.textContent = "SPLASH. NO TARGET HIT. ENEMY TURN.";
            this.messageEl.className = "text-xl text-slate-400 mb-6 h-8 text-center px-4 py-1 bg-slate-800 rounded border border-slate-500/50";
        }

        this.checkWinLoss();

        if (this.phase !== 'game-over') {
            this.phase = 'enemy-turn';
            this.enemyGridEl.classList.add('opacity-50', 'pointer-events-none');

            // Schedule Enemy turn
            setTimeout(() => this.enemyTurn(), 1000);
        }
    }

    enemyTurn() {
        if (this.phase === 'game-over') return;

        // Basic AI: Random firing (could be improved with hunt/target logic)
        let index;
        let valid = false;
        while (!valid) {
            index = Math.floor(Math.random() * 100);
            if (this.playerGrid[index] < 2) valid = true; // 0 or 1
        }

        if (this.playerGrid[index] === 1) {
            this.playerGrid[index] = 2; // Hit
            this.playerGridEl.children[index].classList.add('hit');
            this.soundManager.playSound('explosion');
            this.enemyHits++;

            this.checkShipSunk(this.playerShips, index, 'ALLIED');

            this.messageEl.textContent = "WARNING: ALLIED VESSEL HIT. YOUR TURN.";
            this.messageEl.className = "text-xl text-red-500 mb-6 h-8 text-center px-4 py-1 bg-slate-800 rounded border border-red-500/50 animate-pulse";
        } else {
            this.playerGrid[index] = 3; // Miss
            this.playerGridEl.children[index].classList.add('miss');
            this.soundManager.playSound('shoot');

            this.messageEl.textContent = "ENEMY MISSED. YOUR TURN.";
            this.messageEl.className = "text-xl text-fuchsia-400 mb-6 h-8 text-center px-4 py-1 bg-slate-800 rounded border border-fuchsia-500/50";
        }

        this.checkWinLoss();

        if (this.phase !== 'game-over') {
            this.phase = 'player-turn';
            this.enemyGridEl.classList.remove('opacity-50', 'pointer-events-none');
        }
    }

    checkWinLoss() {
        if (this.playerHits >= this.totalShipCells) {
            this.gameOver(true);
        } else if (this.enemyHits >= this.totalShipCells) {
            this.gameOver(false);
        }
    }

    gameOver(playerWon) {
        this.phase = 'game-over';
        this.enemyGridEl.classList.add('opacity-50', 'pointer-events-none');

        if (playerWon) {
            this.messageEl.textContent = "VICTORY. ALL HOSTILE TARGETS DESTROYED.";
            this.messageEl.className = "text-xl text-green-400 mb-6 h-8 text-center px-4 py-1 bg-slate-800 rounded border border-green-500/50";
            this.soundManager.playSound('win');

            // Calculate score based on remaining ships/hits
            const score = Math.max(100, 1000 - (this.enemyHits * 50));

            setTimeout(() => {
                window.miniGameHub.showGameOver(score, () => this.startGame());
            }, 2000);
        } else {
            this.messageEl.textContent = "DEFEAT. ALLIED FLEET DESTROYED.";
            this.messageEl.className = "text-xl text-red-500 mb-6 h-8 text-center px-4 py-1 bg-slate-800 rounded border border-red-500/50";
            this.soundManager.playSound('gameover');

            setTimeout(() => {
                window.miniGameHub.showGameOver(0, () => this.startGame());
            }, 2000);
        }
    }

    checkShipSunk(fleet, hitIndex, sideName) {
        for (let ship of fleet) {
            if (ship.cells.includes(hitIndex)) {
                ship.hits++;
                if (ship.hits >= ship.size) {
                    // Sunk
                    setTimeout(() => {
                        window.miniGameHub.showToast(`${sideName} SHIP SUNK!`);
                        this.soundManager.playSound('score');
                    }, 200);
                }
                break;
            }
        }
    }

    update(dt) {}
    draw() {}

    shutdown() {
        window.removeEventListener('keydown', this.handleKeyDown);
        this.container.innerHTML = '';
    }
}