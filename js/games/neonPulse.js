import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonPulseGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;

        this.isRunning = false;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();

        // Game State
        this.score = 0;
        this.highScore = this.saveSystem.getHighScore('neon-pulse') || 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.health = 100;
        this.maxHealth = 100;
        this.gameOver = false;

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.cx = this.width / 2;
        this.cy = this.height / 2;

        // Time & Spawning
        this.time = 0;
        this.spawnTimer = 0;
        this.spawnRate = 2.0; // Seconds between spawns
        this.difficultyMultiplier = 1.0;

        // Entities
        this.particles = [];
        this.enemies = [];
        this.pulses = [];

        this.boundResize = this.resize.bind(this);
        this.boundClick = this.handleClick.bind(this);
        this.boundKeydown = this.handleKeydown.bind(this);
    }

    async init(container) {
        this.container = container;

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '1';
        this.canvas.style.cursor = 'crosshair';

        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        window.addEventListener('resize', this.boundResize);
        this.canvas.addEventListener('pointerdown', this.boundClick);
        window.addEventListener('keydown', this.boundKeydown);

        this.isRunning = true;
        this.resetGame();
    }

    resetGame() {
        this.score = 0;
        this.combo = 1;
        this.health = this.maxHealth;
        this.gameOver = false;
        this.enemies = [];
        this.particles = [];
        this.pulses = [];
        this.time = 0;
        this.spawnTimer = 0;
        this.spawnRate = 2.0;
        this.difficultyMultiplier = 1.0;
        this.createExplosion(this.cx, this.cy, 30, '#00ffff');
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.cx = this.width / 2;
        this.cy = this.height / 2;
        if (this.canvas) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }
    }

    handleKeydown(e) {
        if (!this.isRunning) return;
        if (e.key === 'Escape') {
            if (window.miniGameHub) {
                window.miniGameHub.transitionToState('MENU');
            }
        }
        if (this.gameOver && (e.key === 'Enter' || e.key === ' ')) {
            this.resetGame();
        }
    }

    handleClick(e) {
        if (!this.isRunning || this.gameOver) {
            if (this.gameOver) this.resetGame();
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Emit a pulse
        this.pulses.push({
            x: this.cx,
            y: this.cy,
            radius: 20,
            maxRadius: 300 + (this.combo * 10),
            speed: 600,
            color: `hsl(${this.combo * 15}, 100%, 50%)`,
            life: 1.0
        });

        // Add screenshake
        this.addScreenShake(3);

        try {
            this.soundManager.playSound('click'); // Generic zap/click
        } catch(e) {}
    }

    addScreenShake(amount) {
        // Optional screen shake implementation if we want to translate ctx in draw()
        this.shakeAmount = amount;
    }

    spawnEnemy() {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(this.width, this.height) * 0.7;
        const x = this.cx + Math.cos(angle) * dist;
        const y = this.cy + Math.sin(angle) * dist;

        const types = ['basic', 'fast', 'tank'];
        let type = 'basic';

        if (this.difficultyMultiplier > 1.5 && Math.random() < 0.3) type = 'fast';
        if (this.difficultyMultiplier > 2.0 && Math.random() < 0.2) type = 'tank';

        let speed = 50 * this.difficultyMultiplier;
        let hp = 1;
        let color = '#ff0055';
        let size = 15;

        if (type === 'fast') {
            speed = 120 * this.difficultyMultiplier;
            color = '#ffaa00';
            size = 10;
        } else if (type === 'tank') {
            speed = 30 * this.difficultyMultiplier;
            hp = 3;
            color = '#ff00ff';
            size = 25;
        }

        this.enemies.push({ x, y, speed, hp, color, size, type, maxHp: hp });
    }

    createExplosion(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color,
                size: Math.random() * 4 + 2
            });
        }
    }

    update(dt) {
        if (!this.isRunning) return;

        // Cap dt to prevent huge jumps
        if (dt > 0.1) dt = 0.1;

        if (this.gameOver) return;

        this.time += dt;
        this.difficultyMultiplier = 1.0 + (this.time / 60); // Increase over 1 min

        // Reduce screen shake
        if (this.shakeAmount > 0) {
            this.shakeAmount -= dt * 10;
            if (this.shakeAmount < 0) this.shakeAmount = 0;
        }

        // Spawning
        this.spawnTimer += dt;
        const currentSpawnRate = Math.max(0.3, this.spawnRate / this.difficultyMultiplier);
        if (this.spawnTimer >= currentSpawnRate) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // Update Pulses
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            p.radius += p.speed * dt;
            p.life -= dt * (p.speed / p.maxRadius);

            if (p.life <= 0 || p.radius >= p.maxRadius) {
                this.pulses.splice(i, 1);
            }
        }

        // Update Enemies & Collision
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];

            // Move towards center
            const dx = this.cx - e.x;
            const dy = this.cy - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 0) {
                e.x += (dx / dist) * e.speed * dt;
                e.y += (dy / dist) * e.speed * dt;
            }

            // Hit Core?
            if (dist < 40) { // Core radius
                this.health -= (e.type === 'tank' ? 20 : 10);
                this.createExplosion(e.x, e.y, 20, e.color);
                this.enemies.splice(i, 1);
                this.combo = 1; // Reset combo
                try { this.soundManager.playSound('error'); } catch(err) {}
                this.addScreenShake(10);

                if (this.health <= 0) {
                    this.health = 0;
                    this.endGame();
                }
                continue;
            }

            // Hit by Pulse?
            let hit = false;
            for (const p of this.pulses) {
                // Approximate ring collision
                if (Math.abs(dist - p.radius) < 20) {
                    hit = true;
                    break;
                }
            }

            if (hit) {
                e.hp--;
                e.x -= (dx / dist) * 30; // Knockback
                if (e.hp <= 0) {
                    this.score += 10 * this.combo;
                    this.combo++;
                    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                    this.createExplosion(e.x, e.y, 15, e.color);
                    this.enemies.splice(i, 1);
                } else {
                    this.createExplosion(e.x, e.y, 5, '#ffffff'); // Small hit
                }
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 1.5;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    endGame() {
        this.gameOver = true;
        this.createExplosion(this.cx, this.cy, 100, '#ff0000');
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveSystem.setHighScore('neon-pulse', this.highScore);
        }
    }

    draw() {
        if (!this.isRunning || !this.ctx) return;

        // Background with motion blur effect
        this.ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.save();

        // Apply Screen Shake
        if (this.shakeAmount > 0) {
            const sx = (Math.random() - 0.5) * this.shakeAmount;
            const sy = (Math.random() - 0.5) * this.shakeAmount;
            this.ctx.translate(sx, sy);
        }

        // Draw Grid
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        const offsetX = (this.cx % gridSize);
        const offsetY = (this.cy % gridSize);

        this.ctx.beginPath();
        for (let x = offsetX; x < this.width; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
        }
        for (let y = offsetY; y < this.height; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
        }
        this.ctx.stroke();

        // Draw Pulses
        for (const p of this.pulses) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = p.color;
            this.ctx.lineWidth = 5 * p.life;
            this.ctx.stroke();

            // Glow
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = p.color;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        // Draw Particles
        for (const p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        }
        this.ctx.globalAlpha = 1.0;

        // Draw Enemies
        for (const e of this.enemies) {
            this.ctx.fillStyle = e.color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = e.color;

            this.ctx.save();
            this.ctx.translate(e.x, e.y);
            // Rotate towards center
            const angle = Math.atan2(this.cy - e.y, this.cx - e.x);
            this.ctx.rotate(angle);

            if (e.type === 'tank') {
                this.ctx.fillRect(-e.size, -e.size, e.size*2, e.size*2);
            } else if (e.type === 'fast') {
                this.ctx.beginPath();
                this.ctx.moveTo(e.size, 0);
                this.ctx.lineTo(-e.size, e.size);
                this.ctx.lineTo(-e.size, -e.size);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(-e.size/2, -e.size/2, e.size, e.size);
            }
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        }

        // Draw Core
        this.ctx.beginPath();
        const coreBeat = 1 + Math.sin(this.time * 5) * 0.1;
        this.ctx.arc(this.cx, this.cy, 30 * coreBeat, 0, Math.PI * 2);

        let coreColor = '#00ffff';
        if (this.health < 30) coreColor = '#ff0000';
        else if (this.health < 60) coreColor = '#ffff00';

        this.ctx.fillStyle = coreColor;
        this.ctx.shadowBlur = 30;
        this.ctx.shadowColor = coreColor;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Inner core
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(this.cx, this.cy, 15, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();

        // UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px "Press Start 2P", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
        this.ctx.fillText(`HIGH: ${this.highScore}`, 20, 80);

        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = `hsl(${this.combo * 15}, 100%, 50%)`;
        this.ctx.fillText(`${this.combo}x COMBO`, this.width - 20, 40);

        // Health Bar
        const barWidth = 200;
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.fillRect(20, this.height - 40, barWidth, 20);
        this.ctx.fillStyle = coreColor;
        this.ctx.fillRect(20, this.height - 40, barWidth * (this.health / this.maxHealth), 20);

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff0055';
            this.ctx.textAlign = 'center';
            this.ctx.font = '48px "Press Start 2P", monospace';
            this.ctx.fillText('SYSTEM FAILURE', this.cx, this.cy - 40);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px "Press Start 2P", monospace';
            this.ctx.fillText(`FINAL SCORE: ${this.score}`, this.cx, this.cy + 20);
            this.ctx.fillText('CLICK OR PRESS SPACE TO RESTART', this.cx, this.cy + 70);
            this.ctx.fillText('ESC TO EXIT', this.cx, this.cy + 110);
        }
    }

    async shutdown() {
        this.isRunning = false;

        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundKeydown);
        if (this.canvas) {
            this.canvas.removeEventListener('pointerdown', this.boundClick);
        }

        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveSystem.setHighScore('neon-pulse', this.highScore);
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
