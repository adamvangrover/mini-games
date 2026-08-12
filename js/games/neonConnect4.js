import SoundManager from '../core/SoundManager.js';

export default class NeonConnect4 {
    constructor() {
        this.rows = 6;
        this.cols = 7;
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        this.currentPlayer = 'X'; // X is Player (Red/Cyan), O is AI (Yellow/Pink)
        this.gameActive = false;
        this.aiThinking = false;
        this.container = null;
        this.soundManager = SoundManager.getInstance();
    }

    async init(container) {
        this.container = container;
        this.render();
        this.startGame();
    }

    render() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full w-full select-none bg-gray-900">
                <h2 class="text-4xl font-bold text-cyan-400 neon-text mb-2">NEON CONNECT 4</h2>
                <div id="nc4-status" class="text-xl text-white mb-4 h-8">Your Turn (Cyan)</div>

                <div class="p-4 bg-blue-900 rounded-xl border-4 border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.7)]">
                    <div class="grid grid-cols-7 gap-2" id="nc4-board">
                        ${Array(this.rows * this.cols).fill(0).map((_, i) => {
                            const r = Math.floor(i / this.cols);
                            const c = i % this.cols;
                            return `<div class="nc4-cell w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-800 border-2 border-gray-700 cursor-pointer transition-all duration-300" data-row="${r}" data-col="${c}"></div>`;
                        }).join('')}
                    </div>
                </div>

                <button class="back-btn mt-8 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors border border-slate-500 hover:border-cyan-400">
                    <i class="fas fa-arrow-left mr-2"></i> Back
                </button>
            </div>
            <style>
                .neon-text { text-shadow: 0 0 10px currentColor; }
                .nc4-cell.player-x {
                    background-color: #06b6d4; /* cyan-500 */
                    border-color: #22d3ee; /* cyan-400 */
                    box-shadow: inset 0 0 10px #fff, 0 0 15px #06b6d4;
                }
                .nc4-cell.player-o {
                    background-color: #ec4899; /* pink-500 */
                    border-color: #f472b6; /* pink-400 */
                    box-shadow: inset 0 0 10px #fff, 0 0 15px #ec4899;
                }
                .nc4-cell.win-pulse {
                    animation: winPulse 1s infinite alternate;
                }
                .nc4-cell:hover:not(.player-x):not(.player-o) {
                    background-color: rgba(6, 182, 212, 0.2);
                }

                @keyframes winPulse {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.1); filter: brightness(1.5); }
                }
            </style>
        `;

        this.cells = Array.from(this.container.querySelectorAll('.nc4-cell'));

        // Add event listeners to columns
        this.cells.forEach(cell => {
            cell.addEventListener('click', () => this.handleColumnClick(parseInt(cell.dataset.col)));
        });

        this.container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });
    }

    startGame() {
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        this.cells.forEach(c => {
            c.className = 'nc4-cell w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-800 border-2 border-gray-700 cursor-pointer transition-all duration-300';
        });
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.aiThinking = false;
        this.updateStatus("Your Turn (Cyan)", "text-cyan-400");
    }

    updateStatus(msg, colorClass = "text-white") {
        const el = document.getElementById('nc4-status');
        if (el) {
            el.textContent = msg;
            el.className = `text-xl mb-4 h-8 neon-text ${colorClass}`;
        }
    }

    handleColumnClick(col) {
        if (!this.gameActive || this.aiThinking) return;

        if (this.dropPiece(col, 'X')) {
            if (!this.gameActive) return; // Game ended

            this.aiThinking = true;
            this.updateStatus("AI is thinking...", "text-pink-400");
            setTimeout(() => this.aiMove(), 800);
        }
    }

    getAvailableRow(col) {
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r][col] === null) {
                return r;
            }
        }
        return -1;
    }

    dropPiece(col, player) {
        const row = this.getAvailableRow(col);
        if (row === -1) return false; // Column is full

        this.board[row][col] = player;

        // Find the cell DOM element
        const cellIndex = row * this.cols + col;
        const cell = this.cells[cellIndex];

        // Apply styling
        cell.classList.remove('bg-gray-800', 'border-gray-700');
        cell.classList.add(player === 'X' ? 'player-x' : 'player-o');

        this.soundManager.playSound('drop', 0.5); // Fallback to a sound that might exist
        this.soundManager.playTone(player === 'X' ? 440 : 330, 'sine', 0.1);

        const winCells = this.checkWin(row, col, player);
        if (winCells) {
            this.gameActive = false;
            this.highlightWin(winCells);

            if (player === 'X') {
                this.soundManager.playSound('victory');
                this.updateStatus("YOU WIN!", "text-cyan-400");
                setTimeout(() => this.showGameOver(150), 2000);
            } else {
                this.soundManager.playTone(100, 'sawtooth', 0.5);
                this.updateStatus("AI WINS!", "text-pink-400");
                setTimeout(() => this.showGameOver(0), 2000);
            }
        } else if (this.isBoardFull()) {
            this.gameActive = false;
            this.updateStatus("DRAW!", "text-white");
            this.soundManager.playTone(300, 'square', 0.2);
            setTimeout(() => this.showGameOver(50), 2000);
        } else {
            if (player === 'O') {
                this.currentPlayer = 'X';
                this.updateStatus("Your Turn (Cyan)", "text-cyan-400");
                this.aiThinking = false;
            }
        }
        return true;
    }

    aiMove() {
        if (!this.gameActive) return;

        let bestCol = -1;

        // 1. Check for AI win
        bestCol = this.findWinningMove('O');

        // 2. Check for Player block
        if (bestCol === -1) {
            bestCol = this.findWinningMove('X');
        }

        // 3. Play center if available and no immediate threats
        if (bestCol === -1 && this.getAvailableRow(3) !== -1 && Math.random() > 0.3) {
            bestCol = 3;
        }

        // 4. Random available column (weighted towards center)
        if (bestCol === -1) {
            const availableCols = [];
            for (let c = 0; c < this.cols; c++) {
                if (this.getAvailableRow(c) !== -1) {
                    // Add center columns multiple times to weight them higher
                    const weight = c === 3 ? 4 : (c === 2 || c === 4 ? 3 : (c === 1 || c === 5 ? 2 : 1));
                    for (let i = 0; i < weight; i++) {
                        availableCols.push(c);
                    }
                }
            }
            if (availableCols.length > 0) {
                bestCol = availableCols[Math.floor(Math.random() * availableCols.length)];
            }
        }

        if (bestCol !== -1) {
            this.dropPiece(bestCol, 'O');
        }
    }

    findWinningMove(player) {
        for (let c = 0; c < this.cols; c++) {
            const r = this.getAvailableRow(c);
            if (r !== -1) {
                // Temporarily drop piece
                this.board[r][c] = player;
                const wins = this.checkWin(r, c, player);
                // Undo move
                this.board[r][c] = null;

                if (wins) return c;
            }
        }
        return -1;
    }

    checkWin(row, col, player) {
        // Directions: [dRow, dCol]
        const directions = [
            [[0, 1], [0, -1]], // Horizontal
            [[1, 0], [-1, 0]], // Vertical
            [[1, 1], [-1, -1]], // Diagonal /
            [[1, -1], [-1, 1]]  // Diagonal \
        ];

        for (const [dir1, dir2] of directions) {
            let count = 1;
            const winningCells = [{r: row, c: col}];

            // Check dir1
            let r = row + dir1[0];
            let c = col + dir1[1];
            while (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.board[r][c] === player) {
                count++;
                winningCells.push({r, c});
                r += dir1[0];
                c += dir1[1];
            }

            // Check dir2
            r = row + dir2[0];
            c = col + dir2[1];
            while (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.board[r][c] === player) {
                count++;
                winningCells.push({r, c});
                r += dir2[0];
                c += dir2[1];
            }

            if (count >= 4) {
                return winningCells;
            }
        }
        return null;
    }

    isBoardFull() {
        for (let c = 0; c < this.cols; c++) {
            if (this.board[0][c] === null) return false;
        }
        return true;
    }

    highlightWin(winningCells) {
        winningCells.forEach(({r, c}) => {
            const index = r * this.cols + c;
            this.cells[index].classList.add('win-pulse');
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
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
