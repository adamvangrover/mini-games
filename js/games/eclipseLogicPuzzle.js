import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class EclipseLogicPuzzleGame {
    constructor() {
        this.GRID_SIZE = 5;
        // 0: blank, 1: sun, 2: moon
        this.puzzleSolution = [
            [1, 2, 1, 2, 0],
            [0, 1, 0, 1, 2],
            [1, 2, 1, 0, 1],
            [2, 0, 2, 1, 2],
            [1, 2, 0, 2, 0]
        ];
        this.gridState = [];
        this.timerInterval = null;
        this.seconds = 0;
        this.hasStarted = false;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();

        // Icons
        this.sunSVG = `<svg class="w-3/4 h-3/4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 20a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zM5.636 6.364a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zm12.728 12.728a1 1 0 010-1.414l-.707-.707a1 1 0 01-1.414 1.414l.707.707a1 1 0 011.414 0zM2 12a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm20 0a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.636 17.636a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zm12.728-12.728a1 1 0 011.414 0l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0z"/></svg>`;
        this.moonSVG = `<svg class="w-3/4 h-3/4 text-indigo-500" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11.25 3.004c-3.954 0-7.313 2.122-8.995 5.253a.75.75 0 00.91 1.066 7.701 7.701 0 019.264 9.264.75.75 0 001.066.91C16.877 21.687 19 18.328 19 14.254a9.002 9.002 0 00-7.75-8.996.75.75 0 00-.25-.004z"/></svg>`;
    }

    init(container) {
        this.container = container;

        let gridCont = container.querySelector('#eclipselogic-grid-container');
        if (!gridCont) {
             container.innerHTML = `
                <div class="flex items-center gap-2 mb-6">
                    <h1 class="text-4xl font-bold text-slate-300">Eclipse Logic</h1>
                </div>

                <div id="eclipselogic-grid-container" class="grid-container aspect-square w-full max-w-sm rounded-lg p-2 bg-slate-200 mx-auto" style="display: grid; grid-template-columns: 20px 1fr; grid-template-rows: 20px 1fr; gap: 4px;">
                    <!-- Indicators and Board injected here -->
                    <div id="eclipselogic-game-board" class="game-grid rounded-md overflow-hidden bg-white" style="grid-column: 2; grid-row: 2;"></div>
                </div>

                <div class="flex items-center justify-center flex-wrap gap-3 mt-6 w-full max-w-sm mx-auto">
                    <div class="bg-white rounded-lg px-4 py-2 text-slate-700 font-semibold text-lg shadow-sm">
                        Time: <span id="eclipselogic-timer">0s</span>
                    </div>
                    <button id="eclipselogic-reset-button" class="px-5 py-2 bg-slate-400 text-white font-semibold rounded-lg shadow-md hover:bg-slate-500">Reset</button>
                    <button id="eclipselogic-check-button" class="px-5 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600">Check</button>
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
        this.gameBoard = container.querySelector('#eclipselogic-game-board');
        this.timerEl = container.querySelector('#eclipselogic-timer');
        this.messageArea = container.querySelector('#eclipselogic-message-area');

        // Bind Controls
        container.querySelector('#eclipselogic-reset-button').onclick = () => this.setupGame();
        container.querySelector('#eclipselogic-check-button').onclick = () => this.checkFinalSolution();

        this.createIndicators();
        this.setupGame();
    }

    shutdown() {
        this.stopTimer();
        if (this.gridContainer) {
             const indicators = this.gridContainer.querySelectorAll('.indicator');
             indicators.forEach(el => el.remove());
        }
        if (this.gameBoard) this.gameBoard.innerHTML = '';
        if (this.container) {
             const btns = this.container.querySelectorAll('button');
             btns.forEach(b => b.onclick = null);
        }
    }

    createIndicators() {
        // Clear old
        const old = this.gridContainer.querySelectorAll('.indicator');
        old.forEach(el => el.remove());

        for (let i = 0; i < this.GRID_SIZE; i++) {
            const colInd = document.createElement('div');
            colInd.id = `eclipselogic-col-indicator-${i}`;
            colInd.className = 'indicator col-indicator w-full h-2 bg-slate-400 rounded-full mt-auto mb-1';
            colInd.style.gridColumn = i + 1; // Relative to board if board was grid, but we have nested structure now
            // Actually, my CSS grid layout is:
            // Col 1: Row indicators (width 20px)
            // Col 2: Board (1fr)
            // Row 1: Col indicators (height 20px)
            // Row 2: Board (1fr)

            // Wait, to align indicators with board cells, the "Col 2" needs to be a grid itself?
            // Or we put everything in the main grid container.
            // Let's adjust gridContainer to be (GRID_SIZE+1) x (GRID_SIZE+1).
        }

        // Redoing layout strategy to be simpler and robust
        this.gridContainer.style.gridTemplateColumns = `20px repeat(${this.GRID_SIZE}, 1fr)`;
        this.gridContainer.style.gridTemplateRows = `20px repeat(${this.GRID_SIZE}, 1fr)`;

        // Game board is not a single div occupying space, but we append cells directly to container?
        // No, `gameBoard` is a container. Let's make `gameBoard` hidden/unused and append cells directly to `gridContainer`
        // OR better: make `gameBoard` display:contents.
        this.gameBoard.style.display = 'contents';

        for (let i = 0; i < this.GRID_SIZE; i++) {
            // Col Indicator (Top Row)
            const colInd = document.createElement('div');
            colInd.id = `eclipselogic-col-indicator-${i}`;
            colInd.className = 'indicator w-full h-2 bg-slate-400 rounded-full mt-auto mb-1 self-end';
            colInd.style.gridRow = '1';
            colInd.style.gridColumn = `${i + 2}`;
            this.gridContainer.appendChild(colInd);

            // Row Indicator (Left Col)
            const rowInd = document.createElement('div');
            rowInd.id = `eclipselogic-row-indicator-${i}`;
            rowInd.className = 'indicator h-full w-2 bg-slate-400 rounded-full ml-auto mr-1 self-center justify-self-end';
            rowInd.style.gridColumn = '1';
            rowInd.style.gridRow = `${i + 2}`;
            this.gridContainer.appendChild(rowInd);
        }
    }

    setupGame() {
        this.gridState = Array(this.GRID_SIZE).fill(0).map(() => Array(this.GRID_SIZE).fill(0));
        this.seconds = 0;
        this.hasStarted = false;
        this.stopTimer();
        this.timerEl.textContent = '0s';
        this.messageArea.textContent = '';
        this.renderBoard();
        this.validateAllRealTime();
    }

    renderBoard() {
        // Remove existing cells first (but keep indicators)
        const cells = this.gridContainer.querySelectorAll('.grid-cell');
        cells.forEach(c => c.remove());

        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell bg-white aspect-square flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors border border-slate-300';
                cell.style.gridRow = `${r + 2}`;
                cell.style.gridColumn = `${c + 2}`;
                cell.dataset.r = r;
                cell.dataset.c = c;

                // Using arrow function to bind correct 'this'
                cell.onclick = (e) => this.handleCellClick(e);

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

        this.renderBoard();
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

        for (let i = 0; i < this.GRID_SIZE; i++) {
            const cellState = (type === 'row') ? this.gridState[index][i] : this.gridState[i][index];
            if (cellState === 1) suns++;
            if (cellState === 2) moons++;
        }

        const indicatorId = `eclipselogic-${type}-indicator-${index}`;
        const indicator = this.gridContainer.querySelector('#' + indicatorId);
        if (!indicator) return;

        if (suns > 3 || moons > 3) {
            indicator.classList.remove('bg-slate-400');
            indicator.classList.add('bg-red-500');
        } else {
            indicator.classList.add('bg-slate-400');
            indicator.classList.remove('bg-red-500');
        }
    }

    checkFinalSolution() {
        this.messageArea.textContent = '';
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                if (this.gridState[r][c] !== this.puzzleSolution[r][c]) {
                    this.messageArea.textContent = 'Not quite right.';
                    this.soundManager.playTone(200, 'sawtooth', 0.1);
                    return;
                }
            }
        }
        this.stopTimer();
        this.messageArea.textContent = `Solved in ${this.seconds}s!`;
        this.soundManager.playSound('score');
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
