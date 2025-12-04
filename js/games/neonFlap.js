import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonFlap {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.width = 800;
        this.height = 600;

        // Game State
        this.bird = { x: 100, y: 300, velocity: 0, radius: 15 };
        this.gravity = 1200; // px/s^2
        this.jumpStrength = -400; // px/s
        this.pipes = [];
        this.pipeSpawnTimer = 0;
        this.pipeSpawnRate = 1.5; // seconds
        this.pipeSpeed = 200; // px/s
        this.pipeGap = 150;

        this.score = 0;
        this.isActive = false;
        this.gameOver = false;

        this.resizeHandler = this.resize.bind(this);
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', this.resizeHandler);

        this.resetGame();
    }

    resetGame() {
        this.bird.y = this.height / 2;
        this.bird.velocity = 0;
        this.pipes = [];
        this.pipeSpawnTimer = 0;
        this.score = 0;
        this.isActive = true;
        this.gameOver = false;
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    update(dt) {
        if (!this.isActive || this.gameOver) return;

        // Input
        if (this.inputManager.isKeyDown('Space') || this.inputManager.keys['ArrowUp'] || this.inputManager.getMouse().down) {
             if (!this.wasFlapping) {
                 this.flap();
             }
             this.wasFlapping = true;
        } else {
            this.wasFlapping = false;
        }

        // Physics
        this.bird.velocity += this.gravity * dt;
        this.bird.y += this.bird.velocity * dt;

        // Pipe Spawning
        this.pipeSpawnTimer += dt;
        if (this.pipeSpawnTimer > this.pipeSpawnRate) {
            this.spawnPipe();
            this.pipeSpawnTimer = 0;
        }

        // Pipe Movement & Collision
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            let p = this.pipes[i];
            p.x -= this.pipeSpeed * dt;

            // Score
            if (!p.passed && p.x < this.bird.x) {
                this.score++;
                p.passed = true;
                this.soundManager.playSound('score');
                // Juice: Burst of particles
                this.particleSystem.emit(this.bird.x, this.bird.y, '#ffff00', 10);
            }

            // Cleanup
            if (p.x + p.width < 0) {
                this.pipes.splice(i, 1);
            }

            // Collision
            if (this.checkCollision(p)) {
                this.triggerGameOver();
            }
        }

        // Ground/Ceiling Collision
        if (this.bird.y - this.bird.radius < 0 || this.bird.y + this.bird.radius > this.height) {
            this.triggerGameOver();
        }
    }

    flap() {
        this.bird.velocity = this.jumpStrength;
        this.soundManager.playSound('jump');
        // Juice
        this.particleSystem.emit(this.bird.x, this.bird.y + this.bird.radius, '#00ffff', 5);
    }

    spawnPipe() {
        const minHeight = 50;
        const availableHeight = this.height - this.pipeGap - (minHeight * 2);
        const topHeight = Math.random() * availableHeight + minHeight;

        this.pipes.push({
            x: this.width,
            width: 60,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            passed: false
        });
    }

    checkCollision(pipe) {
        // AABB-ish collision
        const b = this.bird;
        // Check X range
        if (b.x + b.radius > pipe.x && b.x - b.radius < pipe.x + pipe.width) {
            // Check Y range (hit top pipe OR hit bottom pipe)
            if (b.y - b.radius < pipe.topHeight || b.y + b.radius > pipe.bottomY) {
                return true;
            }
        }
        return false;
    }

    triggerGameOver() {
        this.isActive = false;
        this.gameOver = true;
        this.soundManager.playSound('explosion');
        this.particleSystem.emit(this.bird.x, this.bird.y, '#ff0000', 50); // Big explosion
        this.particleSystem.shake.intensity = 10;
        this.particleSystem.shake.duration = 0.5;

        window.miniGameHub.showGameOver(this.score, () => this.resetGame());
    }

    draw() {
        // Clear
        this.ctx.fillStyle = '#0f172a'; // Slate-900
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Pipes
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#0f0';
        this.ctx.fillStyle = '#0f0';

        for (let p of this.pipes) {
            // Top Pipe
            this.ctx.fillRect(p.x, 0, p.width, p.topHeight);
            // Bottom Pipe
            this.ctx.fillRect(p.x, p.bottomY, p.width, this.height - p.bottomY);
        }

        // Draw Bird
        this.ctx.shadowColor = '#0ff';
        this.ctx.fillStyle = '#0ff';
        this.ctx.beginPath();
        this.ctx.arc(this.bird.x, this.bird.y, this.bird.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Particles
        this.particleSystem.updateAndDraw(this.ctx, 0.016); // Assuming 60fps roughly for particles

        // Score HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 40px "Courier New"';
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText(this.score, this.width / 2, 100);
    }

    shutdown() {
        window.removeEventListener('resize', this.resizeHandler);
        if (this.canvas) {
            this.canvas.remove();
        }
    }
}
