
import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonZip {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.GRID_SIZE = 5;
        this.CELL_SIZE = 60;
        this.grid = [];
        this.paths = [];
        this.colors = ['#ff0055', '#00ffff', '#ffff00', '#00ff00'];
        this.selectedPath = null;
        this.level = 1;
        this.score = 0;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = ''; // Clear previous
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);

        this.bindEvents();
        this.resetGame();
        this.isActive = true;
        this.animate();

        // Add back button
        const backBtn = document.createElement('button');
        backBtn.className = "absolute top-4 left-4 glass-panel px-4 py-2 rounded text-white z-50 hover:bg-white/10";
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
        backBtn.onclick = () => window.miniGameHub.goBack();
        this.container.appendChild(backBtn);
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.CELL_SIZE = Math.min(this.canvas.width, this.canvas.height) / (this.GRID_SIZE + 2);
    }

    bindEvents() {
        const start = (x, y) => this.handleInputStart(x, y);
        const move = (x, y) => this.handleInputMove(x, y);
        const end = () => this.handleInputEnd();

        this.canvas.addEventListener('mousedown', e => start(e.clientX, e.clientY));
        this.canvas.addEventListener('touchstart', e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});

        window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
        window.addEventListener('touchmove', e => { if(this.selectedPath) e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});

        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    }

    resetGame() {
        this.grid = [];
        this.paths = [];
        // Procedurally generate pairs
        // For simplicity: Hardcoded logic for demo, ideally uses backtracking to gen valid puzzle
        this.generateLevel();
    }

    generateLevel() {
        // Clear Grid
        for(let y=0; y<this.GRID_SIZE; y++) {
            this.grid[y] = [];
            for(let x=0; x<this.GRID_SIZE; x++) {
                this.grid[y][x] = null; // { color, type: 'endpoint' | 'path' }
            }
        }

        // Place Endpoints (Simple Random Pairs)
        this.colors.forEach(color => {
            let placed = 0;
            while(placed < 2) {
                const x = Math.floor(Math.random() * this.GRID_SIZE);
                const y = Math.floor(Math.random() * this.GRID_SIZE);
                if (!this.grid[y][x]) {
                    this.grid[y][x] = { color, type: 'endpoint', id: color };
                    placed++;
                }
            }
            this.paths.push({ color, points: [], completed: false });
        });
    }

    handleInputStart(cx, cy) {
        if (!this.isActive) return;
        const {x, y} = this.getGridPos(cx, cy);

        if (this.isValidPos(x, y) && this.grid[y][x] && this.grid[y][x].type === 'endpoint') {
            const color = this.grid[y][x].color;
            const path = this.paths.find(p => p.color === color);

            // Start new path
            path.points = [{x, y}];
            path.completed = false;
            this.selectedPath = path;
            this.soundManager.playSound('click');
        }
    }

    handleInputMove(cx, cy) {
        if (!this.selectedPath || !this.isActive) return;
        const {x, y} = this.getGridPos(cx, cy);

        if (this.isValidPos(x, y)) {
            const last = this.selectedPath.points[this.selectedPath.points.length - 1];

            // Check adjacency (no diagonal)
            if (Math.abs(x - last.x) + Math.abs(y - last.y) === 1) {
                // Check collision with self
                if (this.selectedPath.points.some(p => p.x === x && p.y === y)) {
                    // Backtracking logic could go here
                    return;
                }

                // Check if endpoint
                if (this.grid[y][x] && this.grid[y][x].type === 'endpoint') {
                    if (this.grid[y][x].color === this.selectedPath.color) {
                        this.selectedPath.points.push({x, y});
                        this.selectedPath.completed = true;
                        this.selectedPath = null; // Finish stroke
                        this.soundManager.playSound('score');
                        this.particleSystem.emit(cx, cy, this.grid[y][x].color, 10);
                        this.checkWin();
                    }
                    return;
                }

                // Check if empty or existing path (overwrite?)
                // Simple version: Allow overlap for now visually, but valid logic requires check.
                // We'll just add point.
                this.selectedPath.points.push({x, y});
            }
        }
    }

    handleInputEnd() {
        this.selectedPath = null;
    }

    getGridPos(cx, cy) {
        const rect = this.canvas.getBoundingClientRect();
        const offsetX = (this.canvas.width - this.GRID_SIZE * this.CELL_SIZE) / 2;
        const offsetY = (this.canvas.height - this.GRID_SIZE * this.CELL_SIZE) / 2;

        const x = Math.floor((cx - rect.left - offsetX) / this.CELL_SIZE);
        const y = Math.floor((cy - rect.top - offsetY) / this.CELL_SIZE);
        return {x, y};
    }

    isValidPos(x, y) {
        return x >= 0 && x < this.GRID_SIZE && y >= 0 && y < this.GRID_SIZE;
    }

    checkWin() {
        if (this.paths.every(p => p.completed)) {
            // Level Up
            this.soundManager.playSound('powerup');
            setTimeout(() => {
                this.level++;
                this.resetGame();
            }, 1000);
        }
    }

    animate() {
        if (!this.isActive) return;
        requestAnimationFrame(() => this.animate());
        this.draw();
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, w, h);

        const offsetX = (w - this.GRID_SIZE * this.CELL_SIZE) / 2;
        const offsetY = (h - this.GRID_SIZE * this.CELL_SIZE) / 2;

        // Grid
        this.ctx.strokeStyle = '#334155';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for(let i=0; i<=this.GRID_SIZE; i++) {
            this.ctx.moveTo(offsetX + i*this.CELL_SIZE, offsetY);
            this.ctx.lineTo(offsetX + i*this.CELL_SIZE, offsetY + this.GRID_SIZE*this.CELL_SIZE);
            this.ctx.moveTo(offsetX, offsetY + i*this.CELL_SIZE);
            this.ctx.lineTo(offsetX + this.GRID_SIZE*this.CELL_SIZE, offsetY + i*this.CELL_SIZE);
        }
        this.ctx.stroke();

        // Endpoints
        for(let y=0; y<this.GRID_SIZE; y++) {
            for(let x=0; x<this.GRID_SIZE; x++) {
                if (this.grid[y][x]) {
                    this.ctx.fillStyle = this.grid[y][x].color;
                    this.ctx.shadowColor = this.grid[y][x].color;
                    this.ctx.shadowBlur = 10;
                    this.ctx.beginPath();
                    this.ctx.arc(offsetX + x*this.CELL_SIZE + this.CELL_SIZE/2, offsetY + y*this.CELL_SIZE + this.CELL_SIZE/2, this.CELL_SIZE/3, 0, Math.PI*2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                }
            }
        }

        // Paths
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.paths.forEach(p => {
            if (p.points.length > 0) {
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = this.CELL_SIZE / 3;
                this.ctx.shadowColor = p.color;
                this.ctx.shadowBlur = 15;

                this.ctx.beginPath();
                p.points.forEach((pt, i) => {
                    const px = offsetX + pt.x*this.CELL_SIZE + this.CELL_SIZE/2;
                    const py = offsetY + pt.y*this.CELL_SIZE + this.CELL_SIZE/2;
                    if (i===0) this.ctx.moveTo(px, py);
                    else this.ctx.lineTo(px, py);
                });
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }
        });
    }

    shutdown() {
        this.isActive = false;
        if(this.resizeObserver) this.resizeObserver.disconnect();
        if(this.canvas) this.canvas.remove();
        // Remove button
        const btn = this.container.querySelector('button');
        if(btn) btn.remove();
    }
}
