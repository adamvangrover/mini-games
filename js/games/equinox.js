export default class EquinoxGame {
    constructor() {
        this.container = null;
        this.gridSize = 6;
        this.board = []; // 0: empty, 1: sun, 2: moon
        this.horizontalEdges = []; // = or x
        this.verticalEdges = []; // = or x
        this.isComplete = false;

        this.boundOnClick = this.onClick.bind(this);
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col bg-black text-green-500 font-mono relative overflow-hidden items-center justify-center';

        // CRT CSS
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes scanline {
                0% { transform: translateY(0); }
                100% { transform: translateY(100vh); }
            }
            .crt::before {
                content: " ";
                display: block;
                position: absolute;
                top: 0; left: 0; bottom: 0; right: 0;
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                z-index: 2;
                background-size: 100% 2px, 3px 100%;
                pointer-events: none;
            }
            .crt::after {
                content: " ";
                display: block;
                position: absolute;
                top: 0; left: 0; bottom: 0; right: 0;
                background: rgba(0,0,0,0.1);
                z-index: 2;
                animation: scanline 10s linear infinite;
                pointer-events: none;
            }
            .glow { text-shadow: 0 0 5px #0f0, 0 0 10px #0f0; }
            .glow-red { text-shadow: 0 0 5px #f00, 0 0 10px #f00; color: #f55; }
        `;
        document.head.appendChild(style);
        this.container.classList.add('crt');

        // Header
        const header = document.createElement('div');
        header.className = "absolute top-4 left-0 w-full flex justify-between items-center px-4 z-50";
        header.innerHTML = `
            <button id="eq-back" class="px-4 py-2 bg-black text-green-500 border border-green-500 hover:bg-green-900 transition-colors uppercase tracking-widest pointer-events-auto">[ EXIT ]</button>
            <h1 class="text-2xl font-bold tracking-widest uppercase glow">EQUINOX.EXE</h1>
            <div class="px-4 py-2 opacity-0">spacer</div>
        `;
        this.container.appendChild(header);
        document.getElementById('eq-back').onclick = () => window.miniGameHub && window.miniGameHub.goBack();

        this.statusText = document.createElement('div');
        this.statusText.className = "mb-4 text-xl glow h-8";
        this.statusText.innerText = "SYSTEM_READY";
        this.container.appendChild(this.statusText);

        this.boardContainer = document.createElement('div');
        // CSS Grid for 6x6 cells + edges.
        // 6 cells = 6 cols, 5 gaps between cols. Total 11 cols/rows.
        this.boardContainer.className = "grid gap-1 p-4 border-2 border-green-500 rounded relative z-10 bg-black/80";
        this.boardContainer.style.gridTemplateColumns = `repeat(6, 40px)`;
        this.boardContainer.style.gridTemplateRows = `repeat(6, 40px)`;
        this.container.appendChild(this.boardContainer);

        this.generateLevel();
        this.renderGrid();
    }

    generateLevel() {
        this.isComplete = false;
        this.board = new Array(this.gridSize * this.gridSize).fill(0);

        // Generate edges randomly for now (placeholder for real generation)
        this.horizontalEdges = new Array(this.gridSize * (this.gridSize - 1)).fill(' ');
        this.verticalEdges = new Array((this.gridSize - 1) * this.gridSize).fill(' ');

        for (let i = 0; i < this.horizontalEdges.length; i++) {
            if (Math.random() < 0.3) this.horizontalEdges[i] = Math.random() < 0.5 ? '=' : 'x';
        }
        for (let i = 0; i < this.verticalEdges.length; i++) {
            if (Math.random() < 0.3) this.verticalEdges[i] = Math.random() < 0.5 ? '=' : 'x';
        }
    }

    renderGrid() {
        this.boardContainer.innerHTML = '';

        // Render 11x11 visual grid logic, simplified to 6x6 with absolute positioned edges
        this.boardContainer.style.position = 'relative';

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = "w-10 h-10 border border-green-800 flex items-center justify-center text-2xl cursor-pointer hover:bg-green-900/50 transition-colors select-none";
                cell.dataset.index = y * this.gridSize + x;
                cell.onclick = this.boundOnClick;

                const val = this.board[y * this.gridSize + x];
                if (val === 1) { cell.innerText = '☀'; cell.classList.add('text-yellow-400'); }
                if (val === 2) { cell.innerText = '☾'; cell.classList.add('text-blue-400'); }

                this.boardContainer.appendChild(cell);

                // Draw Horizontal Edge (right of cell)
                if (x < this.gridSize - 1) {
                    const edgeIdx = y * (this.gridSize - 1) + x;
                    const op = this.horizontalEdges[edgeIdx];
                    if (op !== ' ') {
                        const edge = document.createElement('div');
                        edge.className = "absolute text-xs font-bold pointer-events-none flex items-center justify-center z-20 text-white bg-black";
                        edge.style.width = "20px";
                        edge.style.height = "20px";
                        edge.style.left = `${(x+1) * 44 - 6}px`; // approximate calc based on 40px cell + 4px gap
                        edge.style.top = `${y * 44 + 14}px`;
                        edge.innerText = op;
                        this.boardContainer.appendChild(edge);
                    }
                }

                // Draw Vertical Edge (bottom of cell)
                if (y < this.gridSize - 1) {
                    const edgeIdx = y * this.gridSize + x;
                    const op = this.verticalEdges[edgeIdx];
                    if (op !== ' ') {
                        const edge = document.createElement('div');
                        edge.className = "absolute text-xs font-bold pointer-events-none flex items-center justify-center z-20 text-white bg-black";
                        edge.style.width = "20px";
                        edge.style.height = "20px";
                        edge.style.left = `${x * 44 + 14}px`;
                        edge.style.top = `${(y+1) * 44 - 6}px`;
                        edge.innerText = op;
                        this.boardContainer.appendChild(edge);
                    }
                }
            }
        }
    }

    onClick(e) {
        if (this.isComplete) return;
        const idx = parseInt(e.currentTarget.dataset.index);
        this.board[idx] = (this.board[idx] + 1) % 3;
        this.renderGrid();
        this.checkWin();
    }

    checkWin() {
        let valid = true;
        let isFull = true;
        let errorMsg = "SYSTEM_READY";

        // Check if full
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i] === 0) isFull = false;
        }

        // Rule 1: No more than 2 consecutive
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize - 2; j++) {
                // Rows
                let r1 = this.board[i * this.gridSize + j];
                let r2 = this.board[i * this.gridSize + j + 1];
                let r3 = this.board[i * this.gridSize + j + 2];
                if (r1 !== 0 && r1 === r2 && r2 === r3) { valid = false; errorMsg = "ERR_CONSECUTIVE"; }

                // Cols
                let c1 = this.board[j * this.gridSize + i];
                let c2 = this.board[(j+1) * this.gridSize + i];
                let c3 = this.board[(j+2) * this.gridSize + i];
                if (c1 !== 0 && c1 === c2 && c2 === c3) { valid = false; errorMsg = "ERR_CONSECUTIVE"; }
            }
        }

        // Rule 2: Parity (3 of each)
        if (isFull && valid) {
            for (let i = 0; i < this.gridSize; i++) {
                let rSun = 0, rMoon = 0, cSun = 0, cMoon = 0;
                for (let j = 0; j < this.gridSize; j++) {
                    if (this.board[i * this.gridSize + j] === 1) rSun++;
                    if (this.board[i * this.gridSize + j] === 2) rMoon++;
                    if (this.board[j * this.gridSize + i] === 1) cSun++;
                    if (this.board[j * this.gridSize + i] === 2) cMoon++;
                }
                if (rSun !== 3 || rMoon !== 3 || cSun !== 3 || cMoon !== 3) {
                    valid = false; errorMsg = "ERR_PARITY";
                }
            }
        }

        // Rule 3: Edges
        if (valid) {
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize - 1; x++) {
                    let op = this.horizontalEdges[y * (this.gridSize - 1) + x];
                    if (op !== ' ') {
                        let c1 = this.board[y * this.gridSize + x];
                        let c2 = this.board[y * this.gridSize + x + 1];
                        if (c1 !== 0 && c2 !== 0) {
                            if (op === '=' && c1 !== c2) { valid = false; errorMsg = "ERR_CONSTRAINT"; }
                            if (op === 'x' && c1 === c2) { valid = false; errorMsg = "ERR_CONSTRAINT"; }
                        }
                    }
                }
            }
            for (let y = 0; y < this.gridSize - 1; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    let op = this.verticalEdges[y * this.gridSize + x];
                    if (op !== ' ') {
                        let c1 = this.board[y * this.gridSize + x];
                        let c2 = this.board[(y+1) * this.gridSize + x];
                        if (c1 !== 0 && c2 !== 0) {
                            if (op === '=' && c1 !== c2) { valid = false; errorMsg = "ERR_CONSTRAINT"; }
                            if (op === 'x' && c1 === c2) { valid = false; errorMsg = "ERR_CONSTRAINT"; }
                        }
                    }
                }
            }
        }

        if (!valid && isFull) {
            this.statusText.innerText = errorMsg;
            this.statusText.classList.remove('glow');
            this.statusText.classList.add('glow-red');
        } else if (valid && isFull) {
            this.statusText.innerText = "ACCESS_GRANTED";
            this.statusText.classList.remove('glow-red');
            this.statusText.classList.add('glow');
            this.isComplete = true;
            this.boardContainer.classList.add('animate-pulse');
            setTimeout(() => {
                this.generateLevel();
                this.boardContainer.classList.remove('animate-pulse');
                this.renderGrid();
                this.statusText.innerText = "SYSTEM_READY";
            }, 2000);
        } else {
            this.statusText.innerText = "SYSTEM_READY";
            this.statusText.classList.remove('glow-red');
            this.statusText.classList.add('glow');
        }
    }

    shutdown() {
        if (this.container) this.container.innerHTML = '';
        const styles = document.head.querySelectorAll('style');
        styles.forEach(s => {
            if (s.innerHTML.includes('scanline')) s.remove();
        });
    }
}