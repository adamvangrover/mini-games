import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import SaveSystem from '../core/SaveSystem.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class SnakeGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.tileSize = 20;
        this.snake = [{ x: 10, y: 10 }];
        this.food = { x: 5, y: 5 };
        this.dx = 1;
        this.dy = 0;
        this.score = 0;

        // Timing
        this.timeSinceLastMove = 0;
        this.moveInterval = 0.15; // 150ms
        this.baseInterval = 0.15;
        this.dashInterval = 0.05; // 50ms

        // Effects
        this.foodPulse = 0;
        this.isDashing = false;
        this.active = false;
        this.shakeTimer = 0;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
    }

    init(container) {
        // Create Canvas if it doesn't exist (clean slate)
        let canvas = container.querySelector('#snakeCanvas');
        if (!canvas) {
            container.innerHTML = `
                <h2>🐍 Snake Game</h2>
                <div class="relative">
                     <canvas id="snakeCanvas" width="400" height="400" class="border-2 border-green-500 rounded-lg bg-black"></canvas>
                     <div class="absolute top-2 left-2 text-white font-mono">
                        Score: <span id="snake-score">0</span>
                        <br>
                        High Score: <span id="snake-high-score">0</span>
                     </div>
                </div>
                <p class="mt-4 text-slate-300">Use <b>Arrow Keys</b> to move. Hold <b>Shift</b> to dash.</p>
                <button class="back-btn mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Back</button>
            `;
            canvas = container.querySelector('#snakeCanvas');

            // Re-bind back button since we overwrote innerHTML
            container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");

        // Update High Score UI
        const hs = this.saveSystem.getHighScore('snake-game');
        container.querySelector('#snake-high-score').textContent = hs;

        this.active = true;
        this.resetGame();
    }

    resetGame() {
        if (!this.canvas) return;
        this.snake = [{ x: 10, y: 10 }];
        this.createFood();
        this.dx = 1;
        this.dy = 0;
        this.score = 0;
        this.timeSinceLastMove = 0;
        this.updateScoreUI();
        this.active = true;
    }

    shutdown() {
        this.active = false;
        this.shakeTimer = 0;
    }

    update(dt) {
        if (!this.active) return;

        // Input Handling
        if (this.inputManager.isKeyDown("ArrowUp") && this.dy !== 1) { this.dx = 0; this.dy = -1; }
        else if (this.inputManager.isKeyDown("ArrowDown") && this.dy !== -1) { this.dx = 0; this.dy = 1; }
        else if (this.inputManager.isKeyDown("ArrowLeft") && this.dx !== 1) { this.dx = -1; this.dy = 0; }
        else if (this.inputManager.isKeyDown("ArrowRight") && this.dx !== -1) { this.dx = 1; this.dy = 0; }

        // Dash Check (Shift Key)
        this.isDashing = this.inputManager.isKeyDown("ShiftLeft") || this.inputManager.isKeyDown("ShiftRight");
        this.moveInterval = this.isDashing ? this.dashInterval : this.baseInterval;

        // Move Logic
        this.timeSinceLastMove += dt;
        if (this.timeSinceLastMove >= this.moveInterval) {
            this.move();
            this.timeSinceLastMove = 0;
        }

        // Pulse Effect
        this.foodPulse += dt * 5;

        // Shake decay
        if (this.shakeTimer > 0) this.shakeTimer -= dt;

        // Particle update
        this.particleSystem.update(dt);
    }

    move() {
        if (!this.canvas) return;
        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
        const gridW = this.canvas.width / this.tileSize;
        const gridH = this.canvas.height / this.tileSize;

        // Wall Collision
        if (head.x < 0 || head.y < 0 || head.x >= gridW || head.y >= gridH) {
            this.gameOver();
            return;
        }

        // Self Collision
        for (let i = 0; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.gameOver();
                return;
            }
        }

        this.snake.unshift(head);

        // Eat Food
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.soundManager.playSound('score');
            this.updateScoreUI();

            // Effect: Particles
            const px = head.x * this.tileSize + this.tileSize/2;
            const py = head.y * this.tileSize + this.tileSize/2;
            this.particleSystem.emit(px, py, '#00ff00', 10);

            this.createFood();
            // Don't pop tail, so we grow
        } else {
            this.snake.pop();
        }
    }

    createFood() {
        if (!this.canvas) return;
        const gridW = this.canvas.width / this.tileSize;
        const gridH = this.canvas.height / this.tileSize;
        this.food = {
            x: Math.floor(Math.random() * gridW),
            y: Math.floor(Math.random() * gridH)
        };
    }

    gameOver() {
        this.active = false;
        this.soundManager.playSound('explosion');
        this.shakeTimer = 0.5;
        this.saveSystem.setHighScore('snake-game', this.score);

        // Particles explosion at head
        const head = this.snake[0];
        const px = head.x * this.tileSize + this.tileSize/2;
        const py = head.y * this.tileSize + this.tileSize/2;
        this.particleSystem.emit(px, py, '#ff0000', 30);

        // Wait a bit for effect before showing overlay
        setTimeout(() => {
            if (window.miniGameHub && window.miniGameHub.showGameOver) {
                window.miniGameHub.showGameOver(this.score, () => this.resetGame());
            } else {
                this.resetGame();
            }
        }, 500);
    }

    updateScoreUI() {
        const el = document.getElementById("snake-score");
        if(el) el.textContent = this.score;
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // Screen Shake
        if (this.shakeTimer > 0) {
            const dx = (Math.random() - 0.5) * 10;
            const dy = (Math.random() - 0.5) * 10;
            this.ctx.translate(dx, dy);
        }

        // Snake Glow
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#00ff00";

        this.snake.forEach((segment, index) => {
            // Head is slightly brighter
            this.ctx.fillStyle = index === 0 ? "#ccffcc" : "#00ff00";
            this.ctx.fillRect(segment.x * this.tileSize, segment.y * this.tileSize, this.tileSize - 2, this.tileSize - 2);
        });

        // Food Pulse
        this.ctx.shadowColor = "#ff4500";
        this.ctx.shadowBlur = 15 + Math.sin(this.foodPulse) * 5;
        this.ctx.fillStyle = "#ff4500";
        this.ctx.beginPath();
        this.ctx.arc(this.food.x * this.tileSize + this.tileSize/2, this.food.y * this.tileSize + this.tileSize/2, this.tileSize/2 - 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Reset Shadow
        this.ctx.shadowBlur = 0;

        // Draw Particles
        this.particleSystem.draw(this.ctx);

        this.ctx.restore();
    }
}
