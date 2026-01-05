
import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonRhythm {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.LANES = 4;
        this.KEYS = ['D', 'F', 'J', 'K'];
        this.COLORS = ['#ff0055', '#00ffff', '#ffff00', '#00ff00'];
        this.notes = [];
        this.score = 0;
        this.combo = 0;
        this.health = 100;

        this.speed = 400; // Pixels per sec
        this.spawnRate = 1.0;
        this.spawnTimer = 0;

        this.hitY = 0; // Set in resize
    }

    async init(container) {
        try {
            this.container = container;
            this.container.innerHTML = ''; // Clear previous
            this.canvas = document.createElement('canvas');
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.container.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');

            // Resize
            this.resizeObserver = new ResizeObserver(() => this.resize());
            this.resizeObserver.observe(container);
            this.resize();

            // Touch Input
            this.canvas.addEventListener('touchstart', e => this.handleTouch(e), {passive: false});

            this.resetGame();
            this.isActive = true;

            // Add back button
            const backBtn = document.createElement('button');
            backBtn.className = "absolute top-4 left-4 glass-panel px-4 py-2 rounded text-white z-50 hover:bg-white/10";
            backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
            backBtn.onclick = () => window.miniGameHub.goBack();
            this.container.appendChild(backBtn);

            this.animate();
        } catch (e) {
            console.error("NeonRhythm init error:", e);
            // Don't re-throw to avoid Placeholder fallback if we at least have a canvas
        }
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.laneWidth = this.canvas.width / this.LANES;
        this.hitY = this.canvas.height - 100;
    }

    resetGame() {
        this.notes = [];
        this.score = 0;
        this.combo = 0;
        this.health = 100;
        this.speed = 400;
    }

    update(dt) {
        if (!this.isActive) return;

        // Spawn
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            const lane = Math.floor(Math.random() * this.LANES);
            this.notes.push({ lane, y: -50, active: true });
            this.spawnTimer = 0.5 + Math.random() * 0.5; // Random interval
        }

        // Move
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            note.y += this.speed * dt;

            // Missed
            if (note.active && note.y > this.canvas.height) {
                note.active = false;
                this.health -= 10;
                this.combo = 0;
                this.soundManager.playTone(100, 'sawtooth', 0.1);
                if (this.health <= 0) this.gameOver();
            }

            // Cleanup
            if (note.y > this.canvas.height + 50) {
                this.notes.splice(i, 1);
            }
        }

        // Input Check
        this.KEYS.forEach((key, lane) => {
            if (this.inputManager.isKeyPressed('Key' + key)) {
                this.checkHit(lane);
            }
        });

        // Particles
        this.particleSystem.update(dt);
    }

    handleTouch(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const rect = this.canvas.getBoundingClientRect();
            const x = t.clientX - rect.left;
            const lane = Math.floor(x / this.laneWidth);
            if (lane >= 0 && lane < this.LANES) {
                this.checkHit(lane);
            }
        }
    }

    checkHit(lane) {
        // Find active note in lane near hitY
        const hitWindow = 60;
        let hit = false;

        for (let note of this.notes) {
            if (note.active && note.lane === lane && Math.abs(note.y - this.hitY) < hitWindow) {
                note.active = false;
                hit = true;
                this.score += 10 + this.combo;
                this.combo++;
                this.soundManager.playSound('score');
                // Particles
                const x = lane * this.laneWidth + this.laneWidth/2;
                this.particleSystem.emit(x, this.hitY, this.COLORS[lane], 10);
                break;
            }
        }

        if (!hit) {
            this.combo = 0;
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
        // Calculate dt roughly
        this.update(0.016);
        this.draw();
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, w, h);

        // Lanes
        this.ctx.lineWidth = 2;
        for (let i = 0; i < this.LANES; i++) {
            const x = i * this.laneWidth;
            this.ctx.strokeStyle = '#333';
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();

            // Hit Marker
            this.ctx.strokeStyle = this.COLORS[i];
            this.ctx.strokeRect(x + 10, this.hitY - 20, this.laneWidth - 20, 40);

            // Key Label
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.KEYS[i], x + this.laneWidth/2, h - 20);
        }

        // Notes
        this.notes.forEach(note => {
            if (note.active) {
                const x = note.lane * this.laneWidth + 10;
                const width = this.laneWidth - 20;

                this.ctx.fillStyle = this.COLORS[note.lane];
                this.ctx.shadowColor = this.COLORS[note.lane];
                this.ctx.shadowBlur = 10;
                this.ctx.fillRect(x, note.y - 10, width, 20);
                this.ctx.shadowBlur = 0;
            }
        });

        // HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px "Press Start 2P"';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`COMBO: ${this.combo}`, w - 20, 40);

        // Health Bar
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(20, 60, 200, 10);
        this.ctx.fillStyle = this.health > 30 ? '#0f0' : '#f00';
        this.ctx.fillRect(20, 60, 2 * this.health, 10);

        this.particleSystem.draw(this.ctx);
    }

    shutdown() {
        this.isActive = false;
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.canvas) this.canvas.remove();
        // Remove buttons
        const btn = this.container.querySelector('button');
        if(btn) btn.remove();
    }
}
