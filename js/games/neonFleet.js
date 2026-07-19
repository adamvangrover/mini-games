import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonFleet {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        this.container = null;
        this.ctx = null;
        this.canvas = null;

        this.isActive = false;
        this.gridSize = 10;
        this.cellSize = 30;

        // State: 'placement', 'playing', 'gameover'
        this.state = 'placement';

        this.playerGrid = [];
        this.enemyGrid = [];
        this.playerShips = [];
        this.enemyShips = [];

        this.shipLengths = [5, 4, 3, 3, 2];
        this.currentShipIndex = 0;
        this.isHorizontal = true;

        this.score = 0;
        this.message = "PLACE YOUR SHIPS (R to Rotate)";
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth || window.innerWidth;
        this.canvas.height = container.clientHeight || window.innerHeight;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.isActive = true;

        // Init grids
        for (let i = 0; i < this.gridSize; i++) {
            this.playerGrid[i] = new Array(this.gridSize).fill(0); // 0=empty, 1=ship, 2=miss, 3=hit
            this.enemyGrid[i] = new Array(this.gridSize).fill(0);
        }

        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleKey = this.handleKey.bind(this);
        this.canvas.addEventListener('mousedown', this.boundHandleClick);
        this.canvas.addEventListener('touchstart', this.boundHandleClick, {passive: false});
        window.addEventListener('keydown', this.boundHandleKey);

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        if (!this.container) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;

        // Calculate cell size based on screen
        const maxW = (this.canvas.width * 0.9) / 2 / this.gridSize;
        const maxH = (this.canvas.height * 0.7) / this.gridSize;
        this.cellSize = Math.min(maxW, maxH, 40);
    }

    handleKey(e) {
        if (!this.isActive) return;
        if ((e.key === 'r' || e.key === 'R') && this.state === 'placement') {
            this.isHorizontal = !this.isHorizontal;
            this.soundManager.playSound('hover');
        }
    }

    canPlace(grid, x, y, length, isHoriz) {
        if (isHoriz) {
            if (x + length > this.gridSize) return false;
            for (let i = 0; i < length; i++) {
                if (grid[y][x + i] !== 0) return false;
            }
        } else {
            if (y + length > this.gridSize) return false;
            for (let i = 0; i < length; i++) {
                if (grid[y + i][x] !== 0) return false;
            }
        }
        return true;
    }

    placeShip(grid, x, y, length, isHoriz, shipArr) {
        const coords = [];
        if (isHoriz) {
            for (let i = 0; i < length; i++) {
                grid[y][x + i] = 1;
                coords.push({x: x+i, y: y});
            }
        } else {
            for (let i = 0; i < length; i++) {
                grid[y + i][x] = 1;
                coords.push({x: x, y: y+i});
            }
        }
        shipArr.push({length, isHoriz, coords, hits: 0});
    }

    setupEnemy() {
        this.shipLengths.forEach(len => {
            let placed = false;
            while(!placed) {
                const isHoriz = Math.random() < 0.5;
                const x = Math.floor(Math.random() * this.gridSize);
                const y = Math.floor(Math.random() * this.gridSize);
                if (this.canPlace(this.enemyGrid, x, y, len, isHoriz)) {
                    this.placeShip(this.enemyGrid, x, y, len, isHoriz, this.enemyShips);
                    placed = true;
                }
            }
        });
    }

    handleClick(e) {
        if (!this.isActive) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const cx = (e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX) - rect.left;
        const cy = (e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY) - rect.top;

        const x = cx * scaleX;
        const y = cy * scaleY;

        // Player grid offset
        const pGridX = this.canvas.width / 4 - (this.gridSize * this.cellSize) / 2;
        const pGridY = this.canvas.height / 2 - (this.gridSize * this.cellSize) / 2 + 50;

        // Enemy grid offset
        const eGridX = (this.canvas.width / 4) * 3 - (this.gridSize * this.cellSize) / 2;
        const eGridY = pGridY;

        if (this.state === 'placement') {
            const gx = Math.floor((x - pGridX) / this.cellSize);
            const gy = Math.floor((y - pGridY) / this.cellSize);

            if (gx >= 0 && gx < this.gridSize && gy >= 0 && gy < this.gridSize) {
                const len = this.shipLengths[this.currentShipIndex];
                if (this.canPlace(this.playerGrid, gx, gy, len, this.isHorizontal)) {
                    this.placeShip(this.playerGrid, gx, gy, len, this.isHorizontal, this.playerShips);
                    this.soundManager.playSound('click');
                    this.currentShipIndex++;

                    if (this.currentShipIndex >= this.shipLengths.length) {
                        this.setupEnemy();
                        this.state = 'playing';
                        this.message = "ATTACK ENEMY GRID";
                    }
                } else {
                    this.soundManager.playSound('error');
                }
            }
        } else if (this.state === 'playing') {
            const gx = Math.floor((x - eGridX) / this.cellSize);
            const gy = Math.floor((y - eGridY) / this.cellSize);

            if (gx >= 0 && gx < this.gridSize && gy >= 0 && gy < this.gridSize) {
                if (this.enemyGrid[gy][gx] === 0 || this.enemyGrid[gy][gx] === 1) {
                    this.playerTurn(gx, gy);
                }
            }
        }
    }

    playerTurn(x, y) {
        if (this.enemyGrid[y][x] === 1) {
            this.enemyGrid[y][x] = 3; // Hit
            this.soundManager.playSound('explosion');
            this.particleSystem.emit(
                (this.canvas.width / 4) * 3 - (this.gridSize * this.cellSize) / 2 + x * this.cellSize + this.cellSize/2,
                this.canvas.height / 2 - (this.gridSize * this.cellSize) / 2 + 50 + y * this.cellSize + this.cellSize/2,
                '#ef4444', 15
            );
            this.score += 100;
            this.checkWinCondition();
        } else if (this.enemyGrid[y][x] === 0) {
            this.enemyGrid[y][x] = 2; // Miss
            this.soundManager.playSound('hit');
            this.particleSystem.emit(
                (this.canvas.width / 4) * 3 - (this.gridSize * this.cellSize) / 2 + x * this.cellSize + this.cellSize/2,
                this.canvas.height / 2 - (this.gridSize * this.cellSize) / 2 + 50 + y * this.cellSize + this.cellSize/2,
                '#22d3ee', 5
            );
        }

        if (this.state === 'playing') {
            setTimeout(() => this.enemyTurn(), 500);
        }
    }

    enemyTurn() {
        let placed = false;
        while (!placed && this.state === 'playing') {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);

            if (this.playerGrid[y][x] === 0 || this.playerGrid[y][x] === 1) {
                placed = true;
                if (this.playerGrid[y][x] === 1) {
                    this.playerGrid[y][x] = 3; // Hit
                    this.soundManager.playSound('explosion');
                    this.particleSystem.emit(
                        this.canvas.width / 4 - (this.gridSize * this.cellSize) / 2 + x * this.cellSize + this.cellSize/2,
                        this.canvas.height / 2 - (this.gridSize * this.cellSize) / 2 + 50 + y * this.cellSize + this.cellSize/2,
                        '#ef4444', 15
                    );
                    this.checkWinCondition();
                } else {
                    this.playerGrid[y][x] = 2; // Miss
                    this.soundManager.playSound('hit');
                }
            }
        }
    }

    checkWinCondition() {
        let playerWon = true;
        for (let r=0; r<this.gridSize; r++) {
            for (let c=0; c<this.gridSize; c++) {
                if (this.enemyGrid[r][c] === 1) playerWon = false;
            }
        }

        let enemyWon = true;
        for (let r=0; r<this.gridSize; r++) {
            for (let c=0; c<this.gridSize; c++) {
                if (this.playerGrid[r][c] === 1) enemyWon = false;
            }
        }

        if (playerWon) {
            this.message = "VICTORY";
            this.state = 'gameover';
            this.score += 1000;
            setTimeout(() => this.gameOver(), 2000);
        } else if (enemyWon) {
            this.message = "DEFEAT";
            this.state = 'gameover';
            setTimeout(() => this.gameOver(), 2000);
        }
    }

    update(dt) {
        if (!this.isActive) return;
        this.particleSystem.update(dt);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Header
        ctx.fillStyle = '#0ff';
        ctx.font = '30px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("NEON FLEET", this.canvas.width / 2, 50);

        ctx.font = '16px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(this.message, this.canvas.width / 2, 90);

        ctx.fillStyle = '#ff0';
        ctx.fillText(`SCORE: ${this.score}`, this.canvas.width / 2, 120);

        const pGridX = this.canvas.width / 4 - (this.gridSize * this.cellSize) / 2;
        const pGridY = this.canvas.height / 2 - (this.gridSize * this.cellSize) / 2 + 50;

        const eGridX = (this.canvas.width / 4) * 3 - (this.gridSize * this.cellSize) / 2;
        const eGridY = pGridY;

        ctx.fillStyle = '#0ff';
        ctx.fillText("YOUR FLEET", this.canvas.width / 4, pGridY - 20);
        ctx.fillStyle = '#f0f';
        ctx.fillText("ENEMY FLEET", (this.canvas.width / 4) * 3, eGridY - 20);

        this.drawGrid(ctx, pGridX, pGridY, this.playerGrid, true);
        this.drawGrid(ctx, eGridX, eGridY, this.enemyGrid, false);

        this.particleSystem.draw(ctx);
    }

    drawGrid(ctx, startX, startY, grid, showShips) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#1e293b';

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = startX + c * this.cellSize;
                const y = startY + r * this.cellSize;

                ctx.beginPath();
                ctx.rect(x, y, this.cellSize, this.cellSize);
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.stroke();

                const state = grid[r][c];
                if (state === 1 && showShips) {
                    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                    ctx.fillRect(x+2, y+2, this.cellSize-4, this.cellSize-4);
                } else if (state === 2) {
                    // Miss
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.beginPath();
                    ctx.arc(x + this.cellSize/2, y + this.cellSize/2, this.cellSize/4, 0, Math.PI*2);
                    ctx.fill();
                } else if (state === 3) {
                    // Hit
                    ctx.fillStyle = '#ef4444';
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(x + this.cellSize/2, y + this.cellSize/2, this.cellSize/4, 0, Math.PI*2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }
    }

    gameOver() {
        this.isActive = false;
        if (window.miniGameHub && window.miniGameHub.showGameOver) {
            window.miniGameHub.showGameOver(this.score, () => this.init(this.container));
        } else {
            // Standalone fallback
            alert(`GAME OVER! Score: ${this.score}`);
            this.score = 0;
            this.state = 'placement';
            this.currentShipIndex = 0;
            this.init(this.container);
        }
    }

    shutdown() {
        this.isActive = false;
        this.canvas.remove();
        window.removeEventListener('keydown', this.boundHandleKey);
    }
}
