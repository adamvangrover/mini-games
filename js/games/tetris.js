import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class TetrisGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.cols = 10;
        this.rows = 20;
        this.blockSize = 20;
        this.board = [];
        this.currentPiece = null;
        this.score = 0;
        this.isGameOver = false;

        this.dropTimer = 0;
        this.dropInterval = 0.5; // seconds
        this.inputCooldown = 0;

        this.locking = false;
        this.lockTimer = 0;
        this.lockDelay = 0.5; // Time before locking in place

        this.shapes = [
            [[1,1,1,1]],
            [[1,1],[1,1]],
            [[0,1,0],[1,1,1]],
            [[1,1,0],[0,1,1]],
            [[0,1,1],[1,1,0]],
            [[1,0,0],[1,1,1]],
            [[0,0,1],[1,1,1]]
        ];

        this.colors = [
            '#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff4500', '#0000ff', '#ff1493'
        ];

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        let canvas = container.querySelector('#tetrisCanvas');
        if (!canvas) {
            container.innerHTML = `
                <h2 class="text-xl md:text-2xl mb-2">🧱 Tetris</h2>
                <div class="relative flex justify-center items-center w-full h-[60vh] md:h-[70vh]">
                    <canvas id="tetrisCanvas" class="border-2 border-cyan-500 rounded-lg bg-black block max-w-full max-h-full"></canvas>
                    <div class="absolute top-2 left-2 text-white font-mono text-sm bg-black/50 px-2 rounded pointer-events-none">
                        Score: <span id="tetris-score">0</span>
                    </div>
                </div>
                <p class="mt-2 text-slate-300 text-sm">Arrows to Move/Rotate. Space to Drop.</p>
                <button class="back-btn mt-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Back</button>
            `;
            canvas = container.querySelector('#tetrisCanvas');
            container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        
        // Handle Resizing
        this.resize();
        this._resizeHandler = () => this.resize();
        window.addEventListener('resize', this._resizeHandler);

        this.resetGame();
    }

    resize() {
        if(!this.canvas) return;
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        
        // Aspect ratio 10:20 (1:2)
        let w = rect.width;
        let h = rect.height;
        
        if (w / h > 0.5) {
            w = h * 0.5;
        } else {
            h = w * 2;
        }

        this.canvas.width = w;
        this.canvas.height = h;
        this.blockSize = this.canvas.width / this.cols;
        
        // Redraw if game is active or paused
        if(this.board) this.draw();
    }

    resetGame() {
        this.board = this.createBoard();
        this.score = 0;
        this.isGameOver = false;
        this.dropTimer = 0;
        this.locking = false;
        this.lockTimer = 0;
        this.newPiece();
        this.updateScoreUI();
    }

    shutdown() {
        if(this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
    }

    createBoard() {
        return Array.from({length: this.rows}, () => Array(this.cols).fill(0));
    }

    newPiece() {
        const typeId = Math.floor(Math.random() * this.shapes.length);
        const piece = this.shapes[typeId];
        this.currentPiece = {
            x: Math.floor(this.cols / 2) - Math.floor(piece[0].length / 2),
            y: 0,
            shape: piece,
            color: this.colors[typeId],
            typeId: typeId // For color lookup
        };
    }

    update(dt) {
        if (this.isGameOver) return;

        // Input
        if (this.inputCooldown > 0) this.inputCooldown -= dt;
        else {
            let moved = false;
            if (this.inputManager.isKeyDown("ArrowLeft")) { this.move(-1); moved = true; }
            else if (this.inputManager.isKeyDown("ArrowRight")) { this.move(1); moved = true; }
            else if (this.inputManager.isKeyDown("ArrowDown")) { this.drop(); moved = true; }
            else if (this.inputManager.isKeyDown("ArrowUp")) { this.rotate(); moved = true; }
            else if (this.inputManager.isKeyDown("Space")) { this.hardDrop(); moved = true; }

            if (moved) this.inputCooldown = 0.1; // 100ms cooldown
        }

        // Auto Drop
        this.dropTimer += dt;
        if (this.dropTimer > this.dropInterval) {
            this.drop();
            this.dropTimer = 0;
        }

        // Lock Logic
        if (this.locking) {
            this.lockTimer += dt;
            if (this.lockTimer > this.lockDelay) {
                this.solidify();
            }
        }
    }

    move(dir) {
        this.currentPiece.x += dir;
        if (this.collides()) {
            this.currentPiece.x -= dir;
        } else {
            this.soundManager.playSound('click');
            if (this.locking) {
                this.lockTimer = 0; // Reset lock timer on move (classic "infinite spin" behavior allowed)
            }
        }
    }

    drop() {
        this.currentPiece.y++;
        if (this.collides()) {
            this.currentPiece.y--;
            // Collision detected, start locking phase
            if (!this.locking) {
                this.locking = true;
                this.lockTimer = 0;
                this.soundManager.playSound('click'); // landing sound
            }
        } else {
            // Successfully dropped, reset locking if we were in air or moved to free space
            this.locking = false;
        }
    }

    hardDrop() {
        while(!this.collides()) {
            this.currentPiece.y++;
        }
        this.currentPiece.y--;
        this.solidify();
        this.soundManager.playTone(150, 'sawtooth', 0.1, true);
    }

    rotate() {
        const shape = this.currentPiece.shape;
        const newShape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex])).reverse();
        const oldShape = this.currentPiece.shape;
        this.currentPiece.shape = newShape;
        if (this.collides()) {
            this.currentPiece.shape = oldShape;
        } else {
            this.soundManager.playSound('click');
            if (this.locking) {
                this.lockTimer = 0; // Reset lock timer on rotation
            }
        }
    }

    collides() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x] > 0) {
                    let newX = this.currentPiece.x + x;
                    let newY = this.currentPiece.y + y;
                    if (newX < 0 || newX >= this.cols || newY >= this.rows || (this.board[newY] && this.board[newY][newX] > 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    solidify() {
        this.locking = false;
        this.lockTimer = 0;

        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    if (this.board[this.currentPiece.y + y]) {
                        this.board[this.currentPiece.y + y][this.currentPiece.x + x] = this.currentPiece.typeId + 1;
                    }
                }
            });
        });
        this.clearLines();
        this.newPiece();
        if (this.collides()) {
            this.gameOver();
        }
    }

    clearLines() {
        let linesCleared = 0;
        outer: for (let y = this.rows - 1; y >= 0; y--) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x] === 0) {
                    continue outer;
                }
            }
            const row = this.board.splice(y, 1)[0].fill(0);
            this.board.unshift(row);
            y++;
            linesCleared++;
        }
        if (linesCleared > 0) {
            this.score += linesCleared * 10 * linesCleared; // Bonus for multi-line
            this.updateScoreUI();
            this.soundManager.playSound('score');
        }
    }

    updateScoreUI() {
        const el = document.getElementById('tetris-score');
        if (el) el.textContent = this.score;
    }

    gameOver() {
        this.isGameOver = true;
        this.soundManager.playSound('explosion');
        this.saveSystem.setHighScore('tetris-game', this.score);
        if(window.miniGameHub && window.miniGameHub.showGameOver) {
            window.miniGameHub.showGameOver(this.score, () => this.resetGame());
        }
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.scale(this.blockSize, this.blockSize);

        this.drawBoard();
        this.drawPiece();

        this.ctx.restore();
    }

    drawBoard() {
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.ctx.fillStyle = this.colors[value - 1];
                    this.ctx.fillRect(x, y, 1, 1);
                    this.ctx.lineWidth = 0.05;
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                    this.ctx.strokeRect(x, y, 1, 1);

                    // Highlight
                    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    this.ctx.fillRect(x, y, 1, 0.2);
                }
            });
        });
    }

    drawPiece() {
        if (!this.currentPiece) return;
        this.ctx.fillStyle = this.currentPiece.color;
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    const px = this.currentPiece.x + x;
                    const py = this.currentPiece.y + y;
                    this.ctx.fillRect(px, py, 1, 1);
                    this.ctx.lineWidth = 0.05;
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                    this.ctx.strokeRect(px, py, 1, 1);

                     // Highlight
                    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    this.ctx.fillRect(px, py, 1, 0.2);
                    this.ctx.fillStyle = this.currentPiece.color;
                }
            });
        });
    }
}
