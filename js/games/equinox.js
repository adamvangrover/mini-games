export default class EquinoxGame {
    constructor() {
        this.container = null;
        this.boardEl = null;

        // Game State
        this.gridSize = 6;
        this.grid = []; // 0: empty, 1: sun, 2: moon
        this.horizontalEdges = []; // = or x
        this.verticalEdges = []; // = or x

        // Settings
        this.states = ['EMPTY', 'SUN', 'MOON'];
        this.symbols = {
            1: '<i class="fas fa-sun text-yellow-400"></i>',
            2: '<i class="fas fa-moon text-blue-400"></i>'
        };
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col bg-black text-green-500 font-mono relative overflow-hidden items-center justify-center crt-effect';

        // Header
        const header = document.createElement('div');
        header.className = "absolute top-4 left-0 w-full flex justify-between items-center px-4 z-50";
        header.innerHTML = `
            <button id="eq-back" class="px-4 py-2 bg-transparent text-green-500 font-bold border border-green-500 hover:bg-green-500 hover:text-black transition-colors uppercase text-xs tracking-widest"><i class="fas fa-arrow-left"></i> DISCONNECT</button>
            <h1 class="text-xl font-bold tracking-widest uppercase glitch-text" data-text="EQUINOX">EQUINOX</h1>
            <div class="px-4 py-2 opacity-0">spacer</div>
        `;
        this.container.appendChild(header);
        document.getElementById('eq-back').onclick = () => window.miniGameHub.goBack();

        // Board Container
        this.boardContainer = document.createElement('div');
        this.boardContainer.className = "relative w-full max-w-md aspect-square p-4 border-2 border-green-500 bg-black shadow-[0_0_15px_rgba(0,255,0,0.3)]";
        this.container.appendChild(this.boardContainer);

        this.boardEl = document.createElement('div');
        // We use a custom grid layout to account for edges
        this.boardEl.style.display = "grid";
        this.boardEl.style.gridTemplateColumns = `repeat(${this.gridSize * 2 - 1}, 1fr)`;
        this.boardEl.style.gridTemplateRows = `repeat(${this.gridSize * 2 - 1}, 1fr)`;
        this.boardEl.style.width = "100%";
        this.boardEl.style.height = "100%";
        this.boardEl.style.gap = "2px";
        this.boardContainer.appendChild(this.boardEl);

        this.generateLevel();
        this.renderGrid();
    }

    generateLevel() {
        this.grid = new Array(this.gridSize * this.gridSize).fill(0);

        // Pre-fill some cells for the puzzle
        this.grid[0] = 1;
        this.grid[5] = 2;
        this.grid[30] = 2;
        this.grid[35] = 1;

        // Generate edges (horizontal between cols, vertical between rows)
        // For 6x6, we have 6 rows of 5 horizontal edges, and 5 rows of 6 vertical edges
        this.horizontalEdges = new Array(this.gridSize * (this.gridSize - 1)).fill('');
        this.verticalEdges = new Array((this.gridSize - 1) * this.gridSize).fill('');

        // Add some constraint clues
        this.horizontalEdges[2] = '='; // Row 0, between col 2 and 3
        this.horizontalEdges[10] = 'x'; // Row 2, between col 0 and 1
        this.verticalEdges[3] = '=';  // Col 3, between row 0 and 1
        this.verticalEdges[15] = 'x'; // Col 3, between row 2 and 3
    }

    renderGrid() {
        this.boardEl.innerHTML = '';

        for (let r = 0; r < this.gridSize * 2 - 1; r++) {
            for (let c = 0; c < this.gridSize * 2 - 1; c++) {
                const cell = document.createElement('div');

                // Determine if this is a main cell, horizontal edge, vertical edge, or corner (empty)
                const isMainCell = (r % 2 === 0) && (c % 2 === 0);
                const isHorizEdge = (r % 2 === 0) && (c % 2 !== 0);
                const isVertEdge = (r % 2 !== 0) && (c % 2 === 0);

                if (isMainCell) {
                    const gridR = r / 2;
                    const gridC = c / 2;
                    const idx = gridR * this.gridSize + gridC;

                    cell.dataset.index = idx;
                    cell.className = "cell-main flex items-center justify-center text-2xl font-bold cursor-pointer border border-green-900 hover:bg-green-900/30 transition-colors";
                    cell.onclick = () => this.handleCellClick(idx);

                    if (this.grid[idx] === 1) cell.innerHTML = this.symbols[1];
                    else if (this.grid[idx] === 2) cell.innerHTML = this.symbols[2];

                } else if (isHorizEdge) {
                    const edgeR = r / 2;
                    const edgeC = Math.floor(c / 2);
                    const idx = edgeR * (this.gridSize - 1) + edgeC;

                    cell.className = "flex items-center justify-center text-green-500 font-bold text-xs";
                    cell.textContent = this.horizontalEdges[idx];

                } else if (isVertEdge) {
                    const edgeR = Math.floor(r / 2);
                    const edgeC = c / 2;
                    const idx = edgeR * this.gridSize + edgeC;

                    cell.className = "flex items-center justify-center text-green-500 font-bold text-xs";
                    cell.textContent = this.verticalEdges[idx];
                }

                this.boardEl.appendChild(cell);
            }
        }
    }

    handleCellClick(index) {
        // Cycle states: 0 -> 1 -> 2 -> 0
        this.grid[index] = (this.grid[index] + 1) % 3;

        const cell = this.boardEl.querySelector(`[data-index="${index}"]`);
        if (cell) {
            if (this.grid[index] === 0) cell.innerHTML = '';
            else cell.innerHTML = this.symbols[this.grid[index]];
        }

        this.checkWinCondition();
    }

    checkWinCondition() {
        if (this.grid.includes(0)) return; // Not full

        let valid = true;

        // Check rows
        for (let r = 0; r < this.gridSize; r++) {
            let suns = 0, moons = 0;
            for (let c = 0; c < this.gridSize; c++) {
                const val = this.grid[r * this.gridSize + c];
                if (val === 1) suns++;
                if (val === 2) moons++;

                // Check consecutive 3
                if (c >= 2) {
                    const v1 = this.grid[r * this.gridSize + c - 2];
                    const v2 = this.grid[r * this.gridSize + c - 1];
                    if (val === v1 && val === v2) valid = false;
                }
            }
            if (suns !== 3 || moons !== 3) valid = false;
        }

        // Check columns
        for (let c = 0; c < this.gridSize; c++) {
            let suns = 0, moons = 0;
            for (let r = 0; r < this.gridSize; r++) {
                const val = this.grid[r * this.gridSize + c];
                if (val === 1) suns++;
                if (val === 2) moons++;

                // Check consecutive 3
                if (r >= 2) {
                    const v1 = this.grid[(r - 2) * this.gridSize + c];
                    const v2 = this.grid[(r - 1) * this.gridSize + c];
                    if (val === v1 && val === v2) valid = false;
                }
            }
            if (suns !== 3 || moons !== 3) valid = false;
        }

        // Check horizontal edges
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize - 1; c++) {
                const edge = this.horizontalEdges[r * (this.gridSize - 1) + c];
                if (edge) {
                    const v1 = this.grid[r * this.gridSize + c];
                    const v2 = this.grid[r * this.gridSize + c + 1];
                    if (edge === '=' && v1 !== v2) valid = false;
                    if (edge === 'x' && v1 === v2) valid = false;
                }
            }
        }

        // Check vertical edges
        for (let r = 0; r < this.gridSize - 1; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const edge = this.verticalEdges[r * this.gridSize + c];
                if (edge) {
                    const v1 = this.grid[r * this.gridSize + c];
                    const v2 = this.grid[(r + 1) * this.gridSize + c];
                    if (edge === '=' && v1 !== v2) valid = false;
                    if (edge === 'x' && v1 === v2) valid = false;
                }
            }
        }

        if (valid) {
            setTimeout(() => {
                alert("SEQUENCE ACCEPTED.");
                this.boardContainer.style.boxShadow = "0 0 30px rgba(0, 255, 0, 0.8)";
            }, 100);
        }
    }

    cleanup() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = 'game-container hidden';
        }
    }
}
