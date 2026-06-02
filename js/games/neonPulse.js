import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonPulse {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.score = 0;
        this.highScore = this.saveSystem.getHighScore('neon-pulse') || 0;
        this.pulseRadius = 10;
        this.targetRadius = 150;
        this.growing = true;
        this.baseSpeed = 100; // pixels per second
        this.currentSpeed = this.baseSpeed;
        this.message = "CLICK WHEN CIRCLES ALIGN";
        this.messageTimer = 0;

        this.boundResize = this.resize.bind(this);
        this.boundInput = this.handleInput.bind(this);
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
        this.canvas.addEventListener('mousedown', this.boundInput);
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.isActive) this.handleInput();
        });

        this.resize();
        this.isActive = true;
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.targetRadius = Math.min(this.canvas.width, this.canvas.height) * 0.3;
    }

    handleInput() {
        const diff = Math.abs(this.pulseRadius - this.targetRadius);
        const tolerance = 15 + (this.targetRadius * 0.05); // slightly forgiving

        if (diff < tolerance) {
            this.score++;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.saveSystem.setHighScore('neon-pulse', this.highScore);
            }
            this.soundManager.playSound('coin');
            this.message = "PERFECT!";
            this.currentSpeed += 20; // Increase difficulty

            // Visual feedback
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.score = 0;
            this.currentSpeed = this.baseSpeed;
            this.soundManager.playSound('hit');
            this.message = "MISS!";

            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.messageTimer = 1.0;
        this.pulseRadius = 10;
        this.growing = true;
    }

    loop(timestamp) {
        if (!this.isActive) return;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.messageTimer > 0) {
            this.messageTimer -= dt;
        }

        const maxRadius = this.targetRadius * 1.5;

        if (this.growing) {
            this.pulseRadius += this.currentSpeed * dt;
            if (this.pulseRadius >= maxRadius) {
                this.growing = false;
            }
        } else {
            this.pulseRadius -= this.currentSpeed * dt;
            if (this.pulseRadius <= 10) {
                this.growing = true;
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, w, h);

        // Draw Target Circle
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, this.targetRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, this.targetRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 10]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw Pulse Circle
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, this.pulseRadius, 0, Math.PI * 2);

        const diff = Math.abs(this.pulseRadius - this.targetRadius);
        if (diff < 15) {
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#00ffff';
        } else {
            this.ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#ff00ff';
        }

        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
        this.ctx.fillText(`BEST: ${this.highScore}`, 20, 70);

        if (this.messageTimer > 0) {
             this.ctx.textAlign = 'center';
             this.ctx.fillStyle = this.message === "PERFECT!" ? '#00ffff' : '#ff0000';
             this.ctx.font = 'bold 36px monospace';
             this.ctx.fillText(this.message, cx, cy - this.targetRadius - 50);
        } else if (this.score === 0) {
             this.ctx.textAlign = 'center';
             this.ctx.fillStyle = '#888';
             this.ctx.font = '16px monospace';
             this.ctx.fillText(this.message, cx, cy - this.targetRadius - 50);
        }
    }

    async shutdown() {
        this.isActive = false;
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);

        window.removeEventListener('resize', this.boundResize);
        if(this.canvas) this.canvas.removeEventListener('mousedown', this.boundInput);

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
