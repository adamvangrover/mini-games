
import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonTap {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.targets = [];
        this.score = 0;
        this.lives = 3;
        this.spawnRate = 1.0;
        this.spawnTimer = 0;
        this.difficulty = 1.0;

        this.COLORS = ['#ff0055', '#00ffff', '#ffff00', '#00ff00'];
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

        // Input
        this.canvas.addEventListener('mousedown', e => this.handleTap(e.clientX, e.clientY));
        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            this.handleTap(e.touches[0].clientX, e.touches[0].clientY);
        }, {passive: false});

        // Add back button
        const backBtn = document.createElement('button');
        backBtn.className = "absolute top-4 left-4 glass-panel px-4 py-2 rounded text-white z-50 hover:bg-white/10";
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
        backBtn.onclick = () => window.miniGameHub.goBack();
        this.container.appendChild(backBtn);

        this.resetGame();
        this.isActive = true;
        this.animate();
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    resetGame() {
        this.targets = [];
        this.score = 0;
        this.lives = 3;
        this.spawnRate = 1.0;
        this.difficulty = 1.0;
    }

    update(dt) {
        if (!this.isActive) return;

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTarget();
            this.spawnTimer = this.spawnRate;
            this.spawnRate = Math.max(0.3, this.spawnRate * 0.99); // Increase speed
        }

        // Update Targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.life -= dt;
            t.radius = 30 + Math.sin(t.life * 5) * 5;

            if (t.life <= 0) {
                this.targets.splice(i, 1);
                this.lives--;
                this.soundManager.playTone(100, 'sawtooth', 0.1);
                if (this.lives <= 0) this.gameOver();
            }
        }

        this.particleSystem.update(dt);
    }

    spawnTarget() {
        const padding = 50;
        const x = padding + Math.random() * (this.canvas.width - padding * 2);
        const y = padding + Math.random() * (this.canvas.height - padding * 2);
        const color = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];

        this.targets.push({
            x, y,
            radius: 30,
            life: 2.0, // Seconds to tap
            maxLife: 2.0,
            color
        });
    }

    handleTap(cx, cy) {
        if (!this.isActive) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = cx - rect.left;
        const y = cy - rect.top;

        let hit = false;
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            const dist = Math.hypot(t.x - x, t.y - y);
            if (dist < t.radius + 10) { // Generous hit box
                this.targets.splice(i, 1);
                this.score += 10;
                this.soundManager.playSound('score');
                this.particleSystem.emit(t.x, t.y, t.color, 15);
                hit = true;
                break; // One tap per target
            }
        }

        if (!hit) {
            // Penalty? No, just visual miss
            this.particleSystem.emit(x, y, '#ffffff', 5);
        }
    }

    gameOver() {
        this.isActive = false;
        if (window.miniGameHub && window.miniGameHub.showGameOver) {
            window.miniGameHub.showGameOver(this.score, () => {
                this.resetGame();
                this.isActive = true;
                this.animate();
            });
        }
    }

    animate() {
        if (!this.isActive) return;
        requestAnimationFrame(() => this.animate());
        this.update(0.016);
        this.draw();
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, w, h);

        // Targets
        this.targets.forEach(t => {
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = t.color;
            this.ctx.shadowColor = t.color;
            this.ctx.shadowBlur = 15;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

            // Life Ring
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, t.radius + 5, 0, (t.life / t.maxLife) * Math.PI * 2);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });

        this.particleSystem.draw(this.ctx);

        // HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px "Press Start 2P"';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);

        // Lives
        for(let i=0; i<3; i++) {
            this.ctx.fillStyle = i < this.lives ? '#f00' : '#333';
            this.ctx.beginPath();
            this.ctx.arc(w - 30 - i*30, 30, 10, 0, Math.PI*2);
            this.ctx.fill();
        }
    }

    shutdown() {
        this.isActive = false;
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.canvas) this.canvas.remove();
        const btn = this.container.querySelector('button');
        if(btn) btn.remove();
    }
}
