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
        if (this.collides()) {
            this.currentPiece.x -= dir;
        } else {
            this.soundManager.playSound('click');
        }
    }

    drop() {
        this.currentPiece.y++;
        if (this.collides()) {
            this.currentPiece.y--;
            this.solidify();
            this.soundManager.playSound('click'); // landing sound
        }
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
            this.score += linesCleared * 10;
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
