export default {
    canvas: null,
    ctx: null,
    scoreElement: null,
    cols: 10,
    rows: 20,
    blockSize: 20,
    board: [],
    currentPiece: null,
    score: 0,
    isGameOver: false,
    interval: null,
    keydownHandler: null,

    // Ghost Piece
    ghostPiece: null,

    shapes: [
        [[1,1,1,1]],
        [[1,1],[1,1]],
        [[0,1,0],[1,1,1]],
        [[1,1,0],[0,1,1]],
        [[0,1,1],[1,1,0]],
        [[1,0,0],[1,1,1]],
        [[0,0,1],[1,1,1]]
    ],

    colors: [
        '#22d3ee', // Cyan
        '#c084fc', // Purple
        '#4ade80', // Green
        '#facc15', // Yellow
        '#fb923c', // Orange
        '#3b82f6', // Blue
        '#f472b6'  // Pink
    ],

    init: function() {
        this.canvas = document.getElementById('tetrisCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('tetris-score');

        // Reset scale in case it was left over
        this.ctx.resetTransform();
        this.ctx.scale(this.blockSize, this.blockSize);

        this.board = this.createBoard();
        this.reset();
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
        this.canvas = document.getElementById('tetrisCanvas');
        this.ctx = this.canvas.getContext('2d');
        // Legacy code used ctx.scale. We should probably avoid modifying context global state if possible, or reset it.
        // We will do manual scaling in draw to be safe, or save/restore.

        this.resetGame();
    }

        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.gameLoop(), 500);

        this.draw(); // Initial draw
    },

    shutdown: function() {
        if (this.interval) clearInterval(this.interval);
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        // Reset the scale
        if (this.ctx) this.ctx.resetTransform();
    },
    resetGame() {
        this.board = this.createBoard();
        this.score = 0;
        this.isGameOver = false;
        this.dropTimer = 0;
        this.newPiece();
        this.updateScoreUI();
    }

    shutdown() {}

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
        this.updateGhostPiece();
    },

    updateGhostPiece: function() {
        if (!this.currentPiece) return;
        this.ghostPiece = {
            ...this.currentPiece,
            y: this.currentPiece.y
        };

        while(!this.collides(this.ghostPiece)) {
            this.ghostPiece.y++;
        }
        this.ghostPiece.y--;
    },

    draw: function() {
        // Clear logic for scaled context
        this.ctx.fillStyle = '#0f172a'; // BG color
        this.ctx.fillRect(0, 0, this.cols, this.rows);

        this.drawBoard();
        if (this.currentPiece) {
            this.drawGhostPiece();
            this.drawPiece();
        }
    },

    drawBoard: function() {
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawBlock(x, y, this.colors[value - 1]);
                }
            });
        });
    },

    drawPiece: function() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawBlock(this.currentPiece.x + x, this.currentPiece.y + y, this.currentPiece.color);
                }
            });
        });
    },

    drawGhostPiece: function() {
        this.ctx.globalAlpha = 0.2;
        this.ghostPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.ctx.fillStyle = this.ghostPiece.color;
                    this.ctx.fillRect(this.ghostPiece.x + x, this.ghostPiece.y + y, 1, 1);
                }
            });
        });
        this.ctx.globalAlpha = 1.0;
    },

    drawBlock: function(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, 1, 1);

        // Bevel Effect
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.fillRect(x, y, 1, 0.1);
        this.ctx.fillRect(x, y, 0.1, 1);

        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(x + 0.9, y, 0.1, 1);
        this.ctx.fillRect(x, y + 0.9, 1, 0.1);
    },
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

            if (moved) this.inputCooldown = 0.1; // 100ms cooldown
        }

        // Auto Drop
        this.dropTimer += dt;
        if (this.dropTimer > this.dropInterval) {
            this.drop();
            this.dropTimer = 0;
        }
    }

    move(dir) {
        this.currentPiece.x += dir;
        if (this.collides(this.currentPiece)) {
            this.currentPiece.x -= dir;
        } else {
            if(window.soundManager) window.soundManager.playTone(100, 'square', 0.05);
            this.updateGhostPiece();
            this.soundManager.playSound('click');
        }
    }

    drop() {
        this.currentPiece.y++;
        if (this.collides(this.currentPiece)) {
            this.currentPiece.y--;
            this.solidify();
            if(window.soundManager) window.soundManager.playSound('click');
            this.soundManager.playSound('click'); // landing sound
        }
    }

    hardDrop: function() {
        while(!this.collides(this.currentPiece)) {
            this.currentPiece.y++;
        }
        this.currentPiece.y--;
        this.solidify();
        if(window.soundManager) window.soundManager.playTone(150, 'sawtooth', 0.1, true); // Thud

        // Screen Shake Effect (simulated by offsetting canvas context briefly?)
        // Hard to do with current setup, requires persistent shake state in loop.
        // Let's just flash the background?
        this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this.ctx.fillRect(0,0,this.cols,this.rows);
    },

    rotate: function() {
    rotate() {
        const shape = this.currentPiece.shape;
        const newShape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex])).reverse();
        const oldShape = this.currentPiece.shape;
        this.currentPiece.shape = newShape;
        if (this.collides(this.currentPiece)) {
            this.currentPiece.shape = oldShape;
        } else {
             if(window.soundManager) window.soundManager.playTone(200, 'sine', 0.05);
             this.updateGhostPiece();
            this.soundManager.playSound('click');
        }
    }

    collides: function(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x] > 0) {
                    let newX = piece.x + x;
                    let newY = piece.y + y;
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
        if (this.collides(this.currentPiece)) {
            this.isGameOver = true;
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
            this.scoreElement.textContent = this.score;
            if(window.soundManager) window.soundManager.playSound('score');
            this.score += linesCleared * 10;
            this.updateScoreUI();
            this.soundManager.playSound('score');
        }
    }

    updateScoreUI() {
        const el = document.getElementById('tetris-score');
        if (el) el.textContent = this.score;
    }

    gameLoop: function() {
        if (!this.isGameOver) {
            this.drop();
            this.draw();
        } else {
            this.shutdown();
            if(window.soundManager) window.soundManager.playSound('gameover');
            alert("Game Over! Score: " + this.score);
            this.init();
        }
    },

    handleKeydown: function(e) {
        if (this.isGameOver) return;
        if (e.key === "ArrowLeft") { this.move(-1); e.preventDefault(); }
        if (e.key === "ArrowRight") { this.move(1); e.preventDefault(); }
        if (e.key === "ArrowDown") { this.drop(); e.preventDefault(); }
        if (e.key === "ArrowUp") { this.rotate(); e.preventDefault(); }
        if (e.key === " " || e.code === "Space") { this.hardDrop(); e.preventDefault(); this.draw(); }
        this.draw();
    gameOver() {
        this.isGameOver = true;
        this.soundManager.playSound('explosion');
        this.saveSystem.setHighScore('tetris-game', this.score);
        alert("Game Over! Score: " + this.score);
        this.resetGame();
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
                    this.ctx.strokeStyle = 'black';
                    this.ctx.strokeRect(x, y, 1, 1);
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
                    this.ctx.fillRect(this.currentPiece.x + x, this.currentPiece.y + y, 1, 1);
                    this.ctx.lineWidth = 0.05;
                    this.ctx.strokeStyle = 'black';
                    this.ctx.strokeRect(this.currentPiece.x + x, this.currentPiece.y + y, 1, 1);
                }
            });
        });
    }
}
