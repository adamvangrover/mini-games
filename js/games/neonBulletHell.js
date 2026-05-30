import InputManager from '../core/InputManager.js';
import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonBulletHell {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.input = InputManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();

        this.lastTime = 0;
        this.boundResize = this.resize.bind(this);
        this.boundLoop = this.loop.bind(this);

        // Object Pool for Bullets
        this.bullets = []; // Active bullets
        this.bulletPool = []; // Inactive bullets
        this.MAX_BULLETS = 3000;
        this.initPool();

        // Game State
        this.player = {
            x: 0,
            y: 0,
            radius: 4,      // Hitbox
            grazeRadius: 25, // Graze box
            speed: 300,
            color: '#00ffff'
        };

        this.score = 0;
        this.grazeCount = 0;
        this.highScore = this.saveSystem.getHighScore('neon-bullet-hell') || 0;
        this.isGameOver = false;

        // Spawner state
        this.timeElapsed = 0;
        this.patternTimer = 0;
        this.currentPattern = 0;
    }

    initPool() {
        for (let i = 0; i < this.MAX_BULLETS; i++) {
            this.bulletPool.push({
                active: false,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                radius: 3,
                color: '#ff00ff'
            });
        }
    }

    spawnBullet(x, y, vx, vy, radius, color) {
        if (this.bulletPool.length === 0) return; // Pool empty

        const b = this.bulletPool.pop();
        b.active = true;
        b.x = x;
        b.y = y;
        b.vx = vx;
        b.vy = vy;
        b.radius = radius;
        b.color = color;

        this.bullets.push(b);
    }

    freeBullet(index) {
        const b = this.bullets[index];
        b.active = false;
        this.bulletPool.push(b);
        // Remove from active list efficiently
        this.bullets[index] = this.bullets[this.bullets.length - 1];
        this.bullets.pop();
    }

    async init(container) {
        this.container = container;

        // Setup UI and Canvas
        this.container.innerHTML = `
            <div class="relative w-full h-full bg-slate-900 overflow-hidden font-mono select-none" id="neon-bullet-hell-ui">
                <canvas id="bullet-hell-canvas" class="absolute inset-0 block"></canvas>

                <div class="absolute top-4 left-4 text-white z-10 pointer-events-none">
                    <div class="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">SCORE: <span id="bh-score">0</span></div>
                    <div class="text-sm text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)]">GRAZE: <span id="bh-graze">0</span></div>
                    <div class="text-xs text-slate-400 mt-2">HI: <span id="bh-hiscore">0</span></div>
                </div>

                <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded font-bold z-20 shadow-[0_0_10px_rgba(220,38,38,0.5)] border border-red-400 transition-colors pointer-events-auto">BACK</button>
            </div>
        `;

        this.canvas = this.container.querySelector('#bullet-hell-canvas');
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        this.resize();

        // Init player position
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 100;

        document.getElementById('bh-hiscore').innerText = this.highScore;

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    loop(timestamp) {
        if (!this.canvas) return; // Ensure canvas still exists

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap dt to prevent massive jumps when tab is inactive
        this.update(Math.min(dt, 0.1));
        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
        if (this.isGameOver) return;

        this.timeElapsed += dt;

        // 1. Update Player Movement
        let dx = 0;
        let dy = 0;

        if (this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('KeyA')) dx -= 1;
        if (this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('KeyD')) dx += 1;
        if (this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW')) dy -= 1;
        if (this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS')) dy += 1;

        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
            dx *= Math.SQRT1_2;
            dy *= Math.SQRT1_2;
        }

        // Shift key for focus mode (slower movement)
        const speed = (this.input.isKeyDown('ShiftLeft') || this.input.isKeyDown('ShiftRight')) ? this.player.speed * 0.4 : this.player.speed;

        this.player.x += dx * speed * dt;
        this.player.y += dy * speed * dt;

        // Constrain player
        this.player.x = Math.max(10, Math.min(this.canvas.width - 10, this.player.x));
        this.player.y = Math.max(10, Math.min(this.canvas.height - 10, this.player.y));

        // 2. Spawn Bullets (Patterns)
        this.updateSpawner(dt);

        // 3. Update Bullets & Collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            // Out of bounds check
            if (b.x < -50 || b.x > this.canvas.width + 50 ||
                b.y < -50 || b.y > this.canvas.height + 50) {
                this.freeBullet(i);
                continue;
            }

            // Collision detection
            // Use distance squared for performance
            const distSq = (this.player.x - b.x) * (this.player.x - b.x) +
                           (this.player.y - b.y) * (this.player.y - b.y);

            // Hit Hitbox
            if (distSq < (this.player.radius + b.radius) * (this.player.radius + b.radius)) {
                this.gameOver();
                return;
            }

            // Graze
            if (!b.grazed && distSq < (this.player.grazeRadius + b.radius) * (this.player.grazeRadius + b.radius)) {
                b.grazed = true;
                this.grazeCount++;
                this.score += 100;
                document.getElementById('bh-graze').innerText = this.grazeCount;
                if (this.grazeCount % 10 === 0) {
                    this.soundManager.playSound('click'); // subtle graze sound
                }
            }
        }

        // Passive score
        this.score += dt * 10;
        document.getElementById('bh-score').innerText = Math.floor(this.score);
    }

    updateSpawner(dt) {
        this.patternTimer -= dt;
        if (this.patternTimer > 0) return;

        const cx = this.canvas.width / 2;
        const cy = 100;

        // Alternate patterns based on time
        const phase = Math.floor(this.timeElapsed / 10) % 3;

        if (phase === 0) {
            // Spiral
            this.patternTimer = 0.05; // very fast
            const angle = this.timeElapsed * 3; // rotation speed
            const speed = 150;
            this.spawnBullet(
                cx, cy,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                4, '#ff0055'
            );
            this.spawnBullet(
                cx, cy,
                Math.cos(angle + Math.PI) * speed, Math.sin(angle + Math.PI) * speed,
                4, '#ff0055'
            );
        } else if (phase === 1) {
            // Ring burst
            this.patternTimer = 0.8;
            const bulletsInRing = 20;
            const speed = 100;
            for (let i = 0; i < bulletsInRing; i++) {
                const angle = (i / bulletsInRing) * Math.PI * 2 + (this.timeElapsed * 0.5);
                this.spawnBullet(
                    cx, cy,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    5, '#a855f7'
                );
            }
            this.soundManager.playSound('laser');
        } else if (phase === 2) {
            // Wave aimed at player
            this.patternTimer = 0.3;
            const dx = this.player.x - cx;
            const dy = this.player.y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const dirX = dx/dist;
            const dirY = dy/dist;
            const speed = 200;

            // 3-way spread
            for (let angleOff of [-0.2, 0, 0.2]) {
                const nx = dirX * Math.cos(angleOff) - dirY * Math.sin(angleOff);
                const ny = dirX * Math.sin(angleOff) + dirY * Math.cos(angleOff);
                this.spawnBullet(cx, cy, nx * speed, ny * speed, 4, '#eab308');
            }
            this.soundManager.playSound('laser');
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.soundManager.playSound('explosion');

        // Screen shake effect
        this.canvas.style.transform = 'translate(10px, 10px)';
        setTimeout(() => this.canvas.style.transform = 'translate(-10px, -10px)', 50);
        setTimeout(() => this.canvas.style.transform = 'translate(10px, -10px)', 100);
        setTimeout(() => this.canvas.style.transform = 'translate(0, 0)', 150);

        const finalScore = Math.floor(this.score);
        if (finalScore > this.highScore) {
            this.saveSystem.setHighScore('neon-bullet-hell', finalScore);
        }

        setTimeout(() => {
            if (window.miniGameHub && window.miniGameHub.showGameOver) {
                window.miniGameHub.showGameOver(finalScore, () => this.resetGame());
            }
        }, 1000);
    }

    resetGame() {
        this.isGameOver = false;
        this.score = 0;
        this.grazeCount = 0;
        this.timeElapsed = 0;
        this.patternTimer = 0;

        // Clear bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.freeBullet(i);
        }

        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 100;

        document.getElementById('bh-score').innerText = '0';
        document.getElementById('bh-graze').innerText = '0';

        this.highScore = this.saveSystem.getHighScore('neon-bullet-hell') || 0;
        document.getElementById('bh-hiscore').innerText = this.highScore;

        this.lastTime = performance.now();
    }

    draw() {
        if (!this.ctx) return;

        // Clear background with trail effect
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.3)'; // slate-900 with alpha for trails
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw player
        if (!this.isGameOver) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';

            // Graze radius (faint)
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.grazeRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Core
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius + 2, 0, Math.PI * 2);
            this.ctx.fillStyle = this.player.color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = this.player.color;
            this.ctx.fill();

            // Hitbox (White dot in center)
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius - 1, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowBlur = 0;
            this.ctx.fill();

            this.ctx.restore();
        }

        // Draw bullets
        this.ctx.save();
        // Use composite operation for glow effect (can be heavy, test performance)
        this.ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < this.bullets.length; i++) {
            const b = this.bullets[i];

            this.ctx.fillStyle = b.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = b.color;

            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.boundResize);
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
