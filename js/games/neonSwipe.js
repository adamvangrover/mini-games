
import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonSwipe {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.sequence = [];
        this.playerSequence = [];
        this.state = 'WATCH'; // WATCH, PLAY, GAME_OVER
        this.score = 0;
        this.timer = 0;

        this.DIRECTIONS = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
        this.COLORS = { 'UP': '#ff0055', 'RIGHT': '#00ffff', 'DOWN': '#ffff00', 'LEFT': '#00ff00' };

        this.flash = null; // { dir, time }

        this.touchStart = null;
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

        // Start after delay
        setTimeout(() => this.nextRound(), 1000);
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    bindEvents() {
        // Keyboard
        window.addEventListener('keydown', e => {
            if (this.state !== 'PLAY') return;
            if (e.key === 'ArrowUp') this.handleInput('UP');
            if (e.key === 'ArrowRight') this.handleInput('RIGHT');
            if (e.key === 'ArrowDown') this.handleInput('DOWN');
            if (e.key === 'ArrowLeft') this.handleInput('LEFT');
        });

        // Swipe
        this.canvas.addEventListener('touchstart', e => {
            if (e.touches.length > 0) this.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, {passive: false});

        this.canvas.addEventListener('touchend', e => {
            if (!this.touchStart || this.state !== 'PLAY') return;
            const dx = e.changedTouches[0].clientX - this.touchStart.x;
            const dy = e.changedTouches[0].clientY - this.touchStart.y;

            if (Math.abs(dx) > 50 || Math.abs(dy) > 50) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.handleInput(dx > 0 ? 'RIGHT' : 'LEFT');
                } else {
                    this.handleInput(dy > 0 ? 'DOWN' : 'UP');
                }
            }
            this.touchStart = null;
        });
    }

    resetGame() {
        this.sequence = [];
        this.playerSequence = [];
        this.score = 0;
        this.state = 'WATCH';
    }

    nextRound() {
        this.state = 'WATCH';
        this.playerSequence = [];
        const dir = this.DIRECTIONS[Math.floor(Math.random() * 4)];
        this.sequence.push(dir);
        this.playSequence();
    }

    async playSequence() {
        for (let dir of this.sequence) {
            await new Promise(r => setTimeout(r, 500));
            this.flash = { dir, time: 0.4 };
            this.soundManager.playTone(200 + this.DIRECTIONS.indexOf(dir)*100, 'sine', 0.2);
            await new Promise(r => setTimeout(r, 400));
        }
        this.state = 'PLAY';
    }

    handleInput(dir) {
        this.flash = { dir, time: 0.2 };
        this.soundManager.playTone(200 + this.DIRECTIONS.indexOf(dir)*100, 'triangle', 0.1);
        this.particleSystem.emit(this.canvas.width/2, this.canvas.height/2, this.COLORS[dir], 20);

        const target = this.sequence[this.playerSequence.length];
        if (dir === target) {
            this.playerSequence.push(dir);
            if (this.playerSequence.length === this.sequence.length) {
                this.score++;
                this.soundManager.playSound('score');
                setTimeout(() => this.nextRound(), 1000);
            }
        } else {
            this.gameOver();
        }
    }

    gameOver() {
        this.state = 'GAME_OVER';
        this.isActive = false;
        this.soundManager.playSound('explosion');
        if (window.miniGameHub && window.miniGameHub.showGameOver) {
            window.miniGameHub.showGameOver(this.score, () => {
                this.resetGame();
                this.isActive = true;
                this.animate();
                setTimeout(() => this.nextRound(), 1000);
            });
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
        const cx = w/2;
        const cy = h/2;

        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, w, h);

        // Draw Arrows
        const size = 60;
        const offset = 100;

        this.drawArrow(cx, cy - offset, 'UP', size);
        this.drawArrow(cx + offset, cy, 'RIGHT', size);
        this.drawArrow(cx, cy + offset, 'DOWN', size);
        this.drawArrow(cx - offset, cy, 'LEFT', size);

        // Flash
        if (this.flash) {
            this.flash.time -= 0.016;
            if (this.flash.time <= 0) this.flash = null;
        }

        this.particleSystem.draw(this.ctx);

        // HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        if (this.state === 'WATCH') {
            this.ctx.fillText("WATCH", cx, 50);
        } else if (this.state === 'PLAY') {
            this.ctx.fillText("REPEAT", cx, 50);
        }
        this.ctx.fillText(`SCORE: ${this.score}`, cx, h - 50);
    }

    drawArrow(x, y, dir, size) {
        const active = this.flash && this.flash.dir === dir;
        const color = active ? '#ffffff' : this.COLORS[dir];

        this.ctx.save();
        this.ctx.translate(x, y);
        if (dir === 'RIGHT') this.ctx.rotate(Math.PI/2);
        if (dir === 'DOWN') this.ctx.rotate(Math.PI);
        if (dir === 'LEFT') this.ctx.rotate(-Math.PI/2);

        this.ctx.fillStyle = color;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = active ? 30 : 10;

        this.ctx.beginPath();
        this.ctx.moveTo(0, -size/2);
        this.ctx.lineTo(size/2, size/2);
        this.ctx.lineTo(-size/2, size/2);
        this.ctx.fill();

        this.ctx.restore();
    }

    shutdown() {
        this.isActive = false;
        if(this.resizeObserver) this.resizeObserver.disconnect();
        if(this.canvas) this.canvas.remove();
        const btn = this.container.querySelector('button');
        if(btn) btn.remove();
    }
}
