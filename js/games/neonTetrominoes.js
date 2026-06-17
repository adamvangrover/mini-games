import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';

const SHAPES = [
    [],
    [[1, 1, 1, 1]], // I
    [[2, 2], [2, 2]], // O
    [[0, 3, 0], [3, 3, 3]], // T
    [[0, 4, 4], [4, 4, 0]], // S
    [[5, 5, 0], [0, 5, 5]], // Z
    [[6, 0, 0], [6, 6, 6]], // J
    [[0, 0, 7], [7, 7, 7]]  // L
];

const COLORS = [
    null,
    '#00ffff', // I - Cyan
    '#ffff00', // O - Yellow
    '#800080', // T - Purple
    '#00ff00', // S - Green
    '#ff0000', // Z - Red
    '#0000ff', // J - Blue
    '#ffa500'  // L - Orange
];

export default class NeonTetrominoes {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.boundResize = this.resize.bind(this);
        this.boundKeydown = this.handleKeydown.bind(this);

        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();

        this.cols = 10;
        this.rows = 20;
        this.grid = this.createGrid(this.rows, this.cols);

        this.piece = null;
        this.nextPieceType = this.randomPieceType();
        this.score = 0;
        this.level = 1;
        this.lines = 0;

        this.dropTimer = 0;
        this.dropInterval = 1000;
        this.fastDrop = false;

        this.particles = [];
        this.gameOver = false;

        this.spawnPiece();
    }

    createGrid(r, c) {
        let grid = [];
        for (let y = 0; y < r; y++) {
            grid[y] = new Array(c).fill(0);
        }
        return grid;
    }

    randomPieceType() {
        return Math.floor(Math.random() * 7) + 1;
    }

    spawnPiece() {
        let type = this.nextPieceType;
        this.nextPieceType = this.randomPieceType();

        this.piece = {
            shape: SHAPES[type],
            type: type,
            x: Math.floor(this.cols / 2) - Math.ceil(SHAPES[type][0].length / 2),
            y: 0
        };

        if (this.checkCollision(this.piece.x, this.piece.y, this.piece.shape)) {
            this.gameOver = true;
            this.soundManager.playSound('gameover');
            let hiScore = this.saveSystem.getGameConfig('neon-tetrominoes-score') || 0;
            if (this.score > hiScore) {
                this.saveSystem.setGameConfig('neon-tetrominoes-score', this.score);
            }
        }
    }

    checkCollision(px, py, shape) {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    let nx = px + x;
                    let ny = py + y;

                    if (nx < 0 || nx >= this.cols || ny >= this.rows || (ny >= 0 && this.grid[ny][nx])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    lockPiece() {
        for (let y = 0; y < this.piece.shape.length; y++) {
            for (let x = 0; x < this.piece.shape[y].length; x++) {
                if (this.piece.shape[y][x]) {
                    if (this.piece.y + y < 0) {
                        this.gameOver = true;
                        return;
                    }
                    this.grid[this.piece.y + y][this.piece.x + x] = this.piece.type;
                }
            }
        }
        this.soundManager.playSound('hover');
        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;
        for (let y = this.rows - 1; y >= 0; y--) {
            let full = true;
            for (let x = 0; x < this.cols; x++) {
                if (!this.grid[y][x]) {
                    full = false;
                    break;
                }
            }

            if (full) {
                linesCleared++;
                this.createExplosion(y);
                this.grid.splice(y, 1);
                this.grid.unshift(new Array(this.cols).fill(0));
                y++; // Check the row that just fell down
            }
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;
            let pnts = [0, 40, 100, 300, 1200];
            this.score += pnts[linesCleared] * this.level;

            // Level up every 10 lines
            if (this.lines >= this.level * 10) {
                this.level++;
                this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            }

            this.soundManager.playSound('score');

            let hiScore = this.saveSystem.getGameConfig('neon-tetrominoes-score') || 0;
            if (this.score > hiScore) {
                 this.saveSystem.setGameConfig('neon-tetrominoes-score', this.score);
            }
        }
    }

    createExplosion(row) {
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * this.cols,
                y: row,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: '#fff'
            });
        }
    }

    rotatePiece() {
        let shape = this.piece.shape;
        let r = shape.length;
        let c = shape[0].length;
        let rotated = this.createGrid(c, r);

        for (let y = 0; y < r; y++) {
            for (let x = 0; x < c; x++) {
                rotated[x][r - 1 - y] = shape[y][x];
            }
        }

        if (!this.checkCollision(this.piece.x, this.piece.y, rotated)) {
            this.piece.shape = rotated;
            this.soundManager.playSound('click');
        } else {
            // Wall kick simple
            if (!this.checkCollision(this.piece.x - 1, this.piece.y, rotated)) {
                 this.piece.x--;
                 this.piece.shape = rotated;
                 this.soundManager.playSound('click');
            } else if (!this.checkCollision(this.piece.x + 1, this.piece.y, rotated)) {
                 this.piece.x++;
                 this.piece.shape = rotated;
                 this.soundManager.playSound('click');
            }
        }
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = ''; // Ensure clean

        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);

        // Setup Back Button
        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
        btn.className = "absolute top-4 left-4 px-6 py-2 bg-slate-800/80 hover:bg-fuchsia-600 text-white font-bold rounded-full border border-slate-600 hover:border-fuchsia-400 transition-all z-50 pointer-events-auto backdrop-blur-sm";
        btn.onclick = () => {
            if(window.miniGameHub) window.miniGameHub.goBack();
        };
        this.container.appendChild(btn);

        this.ctx = this.canvas.getContext('2d');
        window.addEventListener('resize', this.boundResize);
        window.addEventListener('keydown', this.boundKeydown);

        this.resize();

        // Try starting audio context
        if (this.soundManager.audioCtx.state === 'suspended') {
            this.soundManager.audioCtx.resume();
        }
    }

    handleKeydown(e) {
        if (this.gameOver) return;

        if (e.key === 'ArrowLeft' || e.key === 'a') {
            if (!this.checkCollision(this.piece.x - 1, this.piece.y, this.piece.shape)) {
                this.piece.x--;
                this.soundManager.playSound('click');
            }
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            if (!this.checkCollision(this.piece.x + 1, this.piece.y, this.piece.shape)) {
                this.piece.x++;
                this.soundManager.playSound('click');
            }
        } else if (e.key === 'ArrowUp' || e.key === 'w') {
            this.rotatePiece();
        } else if (e.key === 'ArrowDown' || e.key === 's') {
            this.fastDrop = true;
        } else if (e.code === 'Space') {
            // Hard Drop
            while (!this.checkCollision(this.piece.x, this.piece.y + 1, this.piece.shape)) {
                this.piece.y++;
            }
            this.lockPiece();
        }
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    update(dt) {
        if (this.gameOver) return;

        // Process Input Manager for holds
        if (this.inputManager.isKeyDown('ArrowDown') || this.inputManager.isKeyDown('KeyS')) {
            this.fastDrop = true;
        } else {
            this.fastDrop = false;
        }

        let interval = this.fastDrop ? this.dropInterval / 10 : this.dropInterval;

        this.dropTimer += dt * 1000;

        if (this.dropTimer >= interval) {
            this.dropTimer = 0;
            if (!this.checkCollision(this.piece.x, this.piece.y + 1, this.piece.shape)) {
                this.piece.y++;
            } else {
                this.lockPiece();
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                // Swap and pop
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
            }
        }
    }

    draw() {
        if (!this.ctx) return;

        let cw = this.canvas.width;
        let ch = this.canvas.height;
        let ctx = this.ctx;

        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, cw, ch);

        let bs = Math.floor(Math.min(cw / (this.cols + 10), ch / (this.rows + 2)));
        let xo = Math.floor((cw - (this.cols * bs)) / 2);
        let yo = Math.floor((ch - (this.rows * bs)) / 2);

        // Grid Background
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let r = 0; r <= this.rows; r++) {
            ctx.beginPath();
            ctx.moveTo(xo, yo + r * bs);
            ctx.lineTo(xo + this.cols * bs, yo + r * bs);
            ctx.stroke();
        }
        for (let c = 0; c <= this.cols; c++) {
            ctx.beginPath();
            ctx.moveTo(xo + c * bs, yo);
            ctx.lineTo(xo + c * bs, yo + this.rows * bs);
            ctx.stroke();
        }

        // Border
        ctx.strokeStyle = '#f0f';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f0f';
        ctx.strokeRect(xo, yo, this.cols * bs, this.rows * bs);
        ctx.shadowBlur = 0;

        // Draw Locked Grid
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c]) {
                    this.drawBlock(xo + c * bs, yo + r * bs, bs, COLORS[this.grid[r][c]]);
                }
            }
        }

        // Ghost Piece
        if (this.piece && !this.gameOver) {
            let ghostY = this.piece.y;
            while (!this.checkCollision(this.piece.x, ghostY + 1, this.piece.shape)) {
                ghostY++;
            }

            for (let r = 0; r < this.piece.shape.length; r++) {
                for (let c = 0; c < this.piece.shape[r].length; c++) {
                    if (this.piece.shape[r][c]) {
                        this.drawBlock(xo + (this.piece.x + c) * bs, yo + (ghostY + r) * bs, bs, 'rgba(255,255,255,0.2)', false);
                    }
                }
            }

            // Draw Active Piece
            for (let r = 0; r < this.piece.shape.length; r++) {
                for (let c = 0; c < this.piece.shape[r].length; c++) {
                    if (this.piece.shape[r][c]) {
                        this.drawBlock(xo + (this.piece.x + c) * bs, yo + (this.piece.y + r) * bs, bs, COLORS[this.piece.type]);
                    }
                }
            }
        }

        // Particles
        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect((xo + p.x * bs) | 0, (yo + p.y * bs) | 0, 4, 4);
        }
        ctx.globalAlpha = 1.0;

        // UI
        ctx.fillStyle = '#0ff';
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#0ff';

        let textX = xo + this.cols * bs + 20;
        ctx.fillText(`SCORE`, textX, yo + 30);
        ctx.fillText(`${this.score}`, textX, yo + 60);

        ctx.fillText(`LEVEL`, textX, yo + 120);
        ctx.fillText(`${this.level}`, textX, yo + 150);

        ctx.fillText(`LINES`, textX, yo + 210);
        ctx.fillText(`${this.lines}`, textX, yo + 240);

        ctx.shadowBlur = 0;

        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(xo, yo, this.cols * bs, this.rows * bs);

            ctx.fillStyle = '#f00';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#f00';
            ctx.fillText('GAME OVER', xo + (this.cols * bs)/2, yo + (this.rows * bs)/2);
            ctx.shadowBlur = 0;
        }
    }

    drawBlock(x, y, s, color, glow = true) {
        x = x | 0;
        y = y | 0;
        let pad = 1;

        this.ctx.fillStyle = color;
        if (glow) {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
        }
        this.ctx.fillRect(x + pad, y + pad, s - pad * 2, s - pad * 2);

        if (glow) {
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
            this.ctx.fillRect(x + pad, y + pad, s - pad * 2, 2);
            this.ctx.fillRect(x + pad, y + pad, 2, s - pad * 2);
        }
    }

    async shutdown() {
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundKeydown);
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.canvas = null;
        this.ctx = null;
    }
}
