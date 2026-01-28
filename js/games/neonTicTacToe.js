import SoundManager from '../core/SoundManager.js';

export default class NeonTicTacToe {
    constructor() {
        this.container = null;
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X'; // Player is always X
        this.gameActive = false;
        this.aiThinking = false;

        this.soundManager = SoundManager.getInstance();

        this.winningConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
    }

    async init(container) {
        this.container = container;
        this.render();
        this.startGame();
    }

    render() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full w-full select-none">
                <h2 class="text-4xl font-bold text-cyan-400 neon-text mb-2">TIC TAC TOE</h2>
                <div id="ntt-status" class="text-xl text-white mb-6 h-8">Your Turn (X)</div>

                <div class="grid grid-cols-3 gap-2 p-2 bg-slate-800 rounded-xl border border-slate-600 shadow-lg">
                    ${this.board.map((_, i) => `
                        <div class="ntt-cell w-24 h-24 bg-slate-900 rounded cursor-pointer flex items-center justify-center text-5xl font-bold transition-all duration-200 hover:bg-slate-700" data-index="${i}"></div>
                    `).join('')}
                </div>

                <button class="back-btn mt-8 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">
                    <i class="fas fa-arrow-left mr-2"></i> Back
                </button>
            </div>
            <style>
                .ntt-cell.x { color: #22d3ee; text-shadow: 0 0 10px #22d3ee; } /* Cyan */
                .ntt-cell.o { color: #f472b6; text-shadow: 0 0 10px #f472b6; } /* Pink */
                .ntt-cell.win { background-color: #064e3b; animation: pulse 1s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
            </style>
        `;

        this.cells = Array.from(this.container.querySelectorAll('.ntt-cell'));

        this.cells.forEach(cell => {
            cell.addEventListener('click', () => this.handleCellClick(cell));
        });

        this.container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });
    }

    startGame() {
        this.board.fill(null);
        this.cells.forEach(c => {
            c.textContent = '';
            c.className = 'ntt-cell w-24 h-24 bg-slate-900 rounded cursor-pointer flex items-center justify-center text-5xl font-bold transition-all duration-200 hover:bg-slate-700';
        });
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.aiThinking = false;
        this.updateStatus("Your Turn (X)");
    }

    updateStatus(msg) {
        const el = document.getElementById('ntt-status');
        if (el) el.textContent = msg;
    }

    handleCellClick(cell) {
        const idx = parseInt(cell.dataset.index);

        if (!this.gameActive || this.board[idx] || this.aiThinking) return;

        // Player Move
        this.makeMove(idx, 'X');

        if (this.gameActive) {
            this.aiThinking = true;
            this.updateStatus("AI is thinking...");
            setTimeout(() => this.aiMove(), 600);
        }
    }

    makeMove(idx, player) {
        this.board[idx] = player;
        this.cells[idx].textContent = player;
        this.cells[idx].classList.add(player.toLowerCase());
        this.soundManager.playSound('click');

        if (this.checkWin(player)) {
            this.gameActive = false;
            this.highlightWin();
            if (player === 'X') {
                this.soundManager.playSound('victory');
                this.updateStatus("YOU WIN!");
                setTimeout(() => this.showGameOver(100), 1000);
            } else {
                this.soundManager.playTone(100, 'sawtooth', 0.5);
                this.updateStatus("AI WINS!");
                setTimeout(() => this.showGameOver(0), 1000);
            }
        } else if (this.board.every(cell => cell !== null)) {
            this.gameActive = false;
            this.updateStatus("DRAW!");
            this.soundManager.playTone(300, 'square', 0.2);
            setTimeout(() => this.showGameOver(50), 1000);
        } else {
            // Switch turn logic handled by flow (Player -> AI -> Player)
            if (player === 'O') {
                this.currentPlayer = 'X';
                this.updateStatus("Your Turn (X)");
                this.aiThinking = false;
            }
        }
    }

    aiMove() {
        if (!this.gameActive) return;

        // 1. Try to Win
        let move = this.findBestMove('O');
        // 2. Block Player
        if (move === -1) move = this.findBestMove('X');
        // 3. Center
        if (move === -1 && !this.board[4]) move = 4;
        // 4. Random Corner
        if (move === -1) {
            const corners = [0, 2, 6, 8].filter(i => !this.board[i]);
            if (corners.length > 0) move = corners[Math.floor(Math.random() * corners.length)];
        }
        // 5. Random Available
        if (move === -1) {
            const available = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
            if (available.length > 0) move = available[Math.floor(Math.random() * available.length)];
        }

        if (move !== -1) {
            this.makeMove(move, 'O');
        }
    }

    findBestMove(player) {
        for (let i = 0; i < this.winningConditions.length; i++) {
            const [a, b, c] = this.winningConditions[i];
            const vals = [this.board[a], this.board[b], this.board[c]];

            // Check if 2 match player and 1 is empty
            if (vals.filter(v => v === player).length === 2 && vals.includes(null)) {
                if (!this.board[a]) return a;
                if (!this.board[b]) return b;
                if (!this.board[c]) return c;
            }
        }
        return -1;
    }

    checkWin(player) {
        return this.winningConditions.some(combination => {
            return combination.every(index => {
                return this.board[index] === player;
            });
        });
    }

    highlightWin() {
        // Find winning combo
        this.winningConditions.forEach(combination => {
            const [a, b, c] = combination;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                this.cells[a].classList.add('win');
                this.cells[b].classList.add('win');
                this.cells[c].classList.add('win');
            }
        });
    }

    showGameOver(score) {
        if (window.miniGameHub) {
            window.miniGameHub.showGameOver(score, () => this.startGame());
        }
    }

    update(dt) {}
    draw() {}
    shutdown() {
        this.container.innerHTML = '';
    }
}
