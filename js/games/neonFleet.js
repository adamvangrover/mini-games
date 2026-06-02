import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonFleet {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.gridSize = 10;
        this.grid = [];
        this.ships = [5, 4, 3, 3, 2];
        this.ammo = 40;
        this.score = 0;
        this.state = 'PLAYING'; // PLAYING, WIN, LOSE

        this.initGrid();

        this.boundResize = this.resize.bind(this);
        this.boundClick = this.handleClick.bind(this);
    }

    initGrid() {
        // 0: empty, 1: ship, 2: miss, 3: hit
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.grid[y][x] = 0;
            }
        }

        // Place ships randomly (simple horizontal/vertical)
        this.ships.forEach(length => {
            let placed = false;
            while (!placed) {
                const isHoriz = Math.random() > 0.5;
                const sx = Math.floor(Math.random() * (this.gridSize - (isHoriz ? length : 0)));
                const sy = Math.floor(Math.random() * (this.gridSize - (isHoriz ? 0 : length)));

                let canPlace = true;
                for (let i = 0; i < length; i++) {
                    const x = isHoriz ? sx + i : sx;
                    const y = isHoriz ? sy : sy + i;
                    if (this.grid[y][x] !== 0) canPlace = false;
                }

                if (canPlace) {
                    for (let i = 0; i < length; i++) {
                        const x = isHoriz ? sx + i : sx;
                        const y = isHoriz ? sy : sy + i;
                        this.grid[y][x] = 1;
                    }
                    placed = true;
                }
            }
        });
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        this.canvas.addEventListener('click', this.boundClick);

        this.resize();
        this.isActive = true;
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.draw();
    }

    handleClick(e) {
        if (this.state !== 'PLAYING') {
            this.state = 'PLAYING';
            this.ammo = 40;
            this.score = 0;
            this.initGrid();
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const boardSize = Math.min(w, h) * 0.8;
        const cellSize = boardSize / this.gridSize;
        const offsetX = (w - boardSize) / 2;
        const offsetY = (h - boardSize) / 2;

        const gx = Math.floor((mx - offsetX) / cellSize);
        const gy = Math.floor((my - offsetY) / cellSize);

        if (gx >= 0 && gx < this.gridSize && gy >= 0 && gy < this.gridSize) {
            const cell = this.grid[gy][gx];
            if (cell === 0) {
                this.grid[gy][gx] = 2; // miss
                this.ammo--;
                this.soundManager.playSound('click');
            } else if (cell === 1) {
                this.grid[gy][gx] = 3; // hit
                this.ammo--;
                this.score += 100;
                this.soundManager.playSound('hit');
            }

            this.checkWinLoss();
        }
    }

    checkWinLoss() {
        let remainingShips = 0;
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x] === 1) remainingShips++;
            }
        }

        if (remainingShips === 0) {
            this.state = 'WIN';
            this.soundManager.playSound('coin');
        } else if (this.ammo <= 0) {
            this.state = 'LOSE';
            this.soundManager.playSound('error');
        }
    }

    loop(timestamp) {
        if (!this.isActive) return;
        this.draw();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.fillStyle = '#001122';
        this.ctx.fillRect(0, 0, w, h);

        const boardSize = Math.min(w, h) * 0.8;
        const cellSize = boardSize / this.gridSize;
        const offsetX = (w - boardSize) / 2;
        const offsetY = (h - boardSize) / 2;

        // Draw Grid
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const px = offsetX + x * cellSize;
                const py = offsetY + y * cellSize;

                this.ctx.strokeRect(px, py, cellSize, cellSize);

                const cell = this.grid[y][x];
                // cell === 1 is hidden ship

                if (cell === 2) { // miss
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    this.ctx.beginPath();
                    this.ctx.arc(px + cellSize/2, py + cellSize/2, cellSize*0.1, 0, Math.PI*2);
                    this.ctx.fill();
                } else if (cell === 3 || (cell === 1 && this.state !== 'PLAYING')) { // hit or reveal at end
                    this.ctx.strokeStyle = cell === 3 ? '#ff00ff' : '#00ffff';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(px + cellSize*0.2, py + cellSize*0.2);
                    this.ctx.lineTo(px + cellSize*0.8, py + cellSize*0.8);
                    this.ctx.moveTo(px + cellSize*0.8, py + cellSize*0.2);
                    this.ctx.lineTo(px + cellSize*0.2, py + cellSize*0.8);
                    this.ctx.stroke();
                }
            }
        }

        // HUD
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = '24px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`AMMO: ${this.ammo}`, 20, 40);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`SCORE: ${this.score}`, w - 20, 40);

        if (this.state === 'WIN') {
             this.ctx.textAlign = 'center';
             this.ctx.fillStyle = '#00ff00';
             this.ctx.font = 'bold 48px monospace';
             this.ctx.fillText('FLEET DESTROYED', w/2, h/2);
             this.ctx.font = '20px monospace';
             this.ctx.fillText('CLICK TO RESTART', w/2, h/2 + 40);
        } else if (this.state === 'LOSE') {
             this.ctx.textAlign = 'center';
             this.ctx.fillStyle = '#ff0000';
             this.ctx.font = 'bold 48px monospace';
             this.ctx.fillText('OUT OF AMMO', w/2, h/2);
             this.ctx.font = '20px monospace';
             this.ctx.fillText('CLICK TO RESTART', w/2, h/2 + 40);
        }
    }

    async shutdown() {
        this.isActive = false;
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);

        window.removeEventListener('resize', this.boundResize);
        if(this.canvas) this.canvas.removeEventListener('click', this.boundClick);

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
