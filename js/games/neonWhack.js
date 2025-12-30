import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonWhack {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        this.container = null;
        this.ctx = null;

        this.gridSize = 3;
        this.holes = []; // {x, y, radius, state, timer}
        // State: 0=Empty, 1=Rising, 2=Up, 3=Hit, 4=Lowering

        this.score = 0;
        this.timeLeft = 60;
        this.isActive = false;

        this.spawnTimer = 0;
        this.spawnInterval = 1.0; // Seconds between spawns, decreases over time

        this.canvas = null;
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth || window.innerWidth;
        this.canvas.height = container.clientHeight || window.innerHeight;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.initGrid();

        this.isActive = true;
        this.score = 0;
        this.timeLeft = 60;
        this.spawnInterval = 1.0;

        // Input
        this.boundHandleClick = this.handleClick.bind(this);
        this.canvas.addEventListener('mousedown', this.boundHandleClick);
        this.canvas.addEventListener('touchstart', this.boundHandleClick, {passive: false});

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.container) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.initGrid();
    }

    initGrid() {
        this.holes = [];
        const margin = 50;
        const availableW = this.canvas.width - margin * 2;
        const availableH = this.canvas.height - 150; // Reserve top for HUD

        const cellW = availableW / this.gridSize;
        const cellH = availableH / this.gridSize;
        const radius = Math.min(cellW, cellH) * 0.35;

        const startY = 150;

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                this.holes.push({
                    x: margin + c * cellW + cellW / 2,
                    y: startY + r * cellH + cellH / 2,
                    radius: radius,
                    state: 0,
                    height: 0, // 0 to 1
                    type: 'normal' // normal, bomb, gold
                });
            }
        }
    }

    update(dt) {
        if (!this.isActive) return;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.gameOver();
            return;
        }

        // Spawning
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnMole();
            this.spawnTimer = this.spawnInterval;
            if (this.spawnInterval > 0.4) this.spawnInterval -= 0.01;
        }

        // Update holes
        this.holes.forEach(hole => {
            if (hole.state === 1) { // Rising
                hole.height += dt * 5;
                if (hole.height >= 1) {
                    hole.height = 1;
                    hole.state = 2;
                    hole.timer = 1.0; // Stay up for 1s
                }
            } else if (hole.state === 2) { // Up
                hole.timer -= dt;
                if (hole.timer <= 0) {
                    hole.state = 4; // Lower
                }
            } else if (hole.state === 4) { // Lowering
                hole.height -= dt * 5;
                if (hole.height <= 0) {
                    hole.height = 0;
                    hole.state = 0;
                }
            } else if (hole.state === 3) { // Hit
                hole.height -= dt * 10; // Drop fast
                if (hole.height <= 0) {
                    hole.height = 0;
                    hole.state = 0;
                }
            }
        });

        this.particleSystem.update(dt);
    }

    spawnMole() {
        // Find empty holes
        const empty = this.holes.filter(h => h.state === 0);
        if (empty.length === 0) return;

        const hole = empty[Math.floor(Math.random() * empty.length)];
        hole.state = 1; // Rising
        hole.height = 0;

        // Random type
        const rand = Math.random();
        if (rand < 0.1) hole.type = 'bomb';
        else if (rand < 0.2) hole.type = 'gold';
        else hole.type = 'normal';
    }

    handleClick(e) {
        if (!this.isActive) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX) - rect.left;
        const y = (e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY) - rect.top;

        const cx = x * scaleX;
        const cy = y * scaleY;

        this.holes.forEach(hole => {
            // Hitbox is the circle
            const dx = cx - hole.x;
            const dy = cy - hole.y;
            if (dx*dx + dy*dy < hole.radius*hole.radius) {
                if (hole.state === 1 || hole.state === 2) {
                    this.hitMole(hole);
                }
            }
        });
    }

    hitMole(hole) {
        hole.state = 3;

        if (hole.type === 'bomb') {
            this.score -= 50;
            if (this.score < 0) this.score = 0;
            this.soundManager.playSound('explosion'); // Need explosion sound? Or low tone
            this.particleSystem.emit(hole.x, hole.y, '#ef4444', 20);
            this.timeLeft -= 5;
        } else if (hole.type === 'gold') {
            this.score += 50;
            this.soundManager.playSound('powerup');
            this.particleSystem.emit(hole.x, hole.y, '#eab308', 30);
        } else {
            this.score += 10;
            this.soundManager.playSound('hit'); // Need hit sound? Or click
            this.particleSystem.emit(hole.x, hole.y, '#22d3ee', 15);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background Grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        // ... grid drawing ...

        // HUD
        ctx.fillStyle = 'white';
        ctx.font = '30px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 50);

        ctx.textAlign = 'right';
        ctx.fillStyle = this.timeLeft < 10 ? '#ef4444' : '#22c55e';
        ctx.fillText(`TIME: ${Math.ceil(this.timeLeft)}`, this.canvas.width - 20, 50);

        // Holes
        this.holes.forEach(hole => {
            // Draw Hole
            ctx.beginPath();
            ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Draw Mole (Clipped by hole?)
            // Simple way: Draw mole relative to y, but clip rect
            if (hole.height > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
                ctx.clip();

                const moleY = hole.y + hole.radius - (hole.radius * 2 * hole.height);

                // Color based on type
                let color = '#22d3ee'; // Cyan
                if (hole.type === 'bomb') color = '#ef4444'; // Red
                if (hole.type === 'gold') color = '#eab308'; // Gold

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(hole.x, moleY, hole.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();

                // Eyes
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(hole.x - 10, moleY - 10, 5, 0, Math.PI * 2);
                ctx.arc(hole.x + 10, moleY - 10, 5, 0, Math.PI * 2);
                ctx.fill();

                // Glow
                ctx.shadowBlur = 20;
                ctx.shadowColor = color;
                ctx.stroke(); // Stroke mole for glow

                ctx.restore();
            }
        });

        this.particleSystem.draw(ctx);
    }

    gameOver() {
        this.isActive = false;
        window.miniGameHub.showGameOver(this.score, () => this.init(this.container));
    }

    shutdown() {
        this.isActive = false;
        this.canvas.remove();
    }
}
