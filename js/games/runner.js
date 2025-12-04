import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import SaveSystem from '../core/SaveSystem.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class RunnerGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.player = { x: 50, y: 150, width: 20, height: 20, velocityY: 0, isJumping: false };
        this.gravity = 1200;
        this.obstacles = [];
        this.gameSpeed = 200;
        this.score = 0;
        this.active = false;
        this.obstacleTimer = 0;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
    }

    init(container) {
        let canvas = container.querySelector('#runnerCanvas');
        if (!canvas) {
            container.innerHTML = `
                <h2>🏃 Endless Runner</h2>
                <div class="relative">
                    <canvas id="runnerCanvas" width="600" height="200" class="border-2 border-fuchsia-500 rounded-lg bg-black"></canvas>
                    <div class="absolute top-2 right-2 text-white font-mono">
                        Score: <span id="runner-score">0</span>
                    </div>
                </div>
                <p class="mt-4 text-slate-300">Space to Jump!</p>
                <button class="back-btn mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Back</button>
            `;
            canvas = container.querySelector('#runnerCanvas');
             container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.active = true;
        this.resetGame();
    }

    resetGame() {
        this.player = { x: 50, y: 150, width: 20, height: 20, velocityY: 0, isJumping: false };
        this.obstacles = [];
        this.gameSpeed = 200;
        this.score = 0;
        this.active = true;
        this.obstacleTimer = 0;
        this.updateScoreUI();
    }

    shutdown() {
        this.active = false;
    }

    update(dt) {
        if (!this.active) return;

        // Input
        if (this.inputManager.isKeyDown("Space")) {
            this.jump();
        }

        // Obstacle Spawning
        this.obstacleTimer += dt;
        if (this.obstacleTimer > (1.5 - (this.gameSpeed / 1000))) { // Spawn faster as speed increases
            this.createObstacle();
            this.obstacleTimer = 0;
        }

        // Physics
        this.player.velocityY += this.gravity * dt;
        this.player.y += this.player.velocityY * dt;

        // Ground collision
        if (this.player.y >= 150) {
            if (this.player.isJumping) {
                 // Land effect
                 this.particleSystem.emit(this.player.x + 10, 170, '#00ff00', 5);
            }
            this.player.y = 150;
            this.player.isJumping = false;
            this.player.velocityY = 0;
        }

        // Move Obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.x -= this.gameSpeed * dt;
        });
        this.obstacles = this.obstacles.filter(obstacle => obstacle.x > -50);

        // Collision
        this.obstacles.forEach(obstacle => {
            if (this.player.x < obstacle.x + obstacle.width &&
                this.player.x + this.player.width > obstacle.x &&
                this.player.y < obstacle.y + obstacle.height &&
                this.player.y + this.player.height > obstacle.y) {
                this.gameOver();
            }
        });

        // Particles
        this.particleSystem.update(dt);
        if (this.player.isJumping) {
             this.particleSystem.emit(this.player.x + 10, this.player.y + 20, '#00ff00', 1);
        }

        // Score
        this.score += 10 * dt;
        this.gameSpeed += 10 * dt; // Accel
        this.updateScoreUI();
    }

    jump() {
        if (!this.player.isJumping) {
            this.player.velocityY = -500;
            this.player.isJumping = true;
            this.soundManager.playSound('jump');
            this.particleSystem.emit(this.player.x + 10, this.player.y + 20, '#ffffff', 10);
        }
    }

    createObstacle() {
        let height = Math.random() * 30 + 20;
        this.obstacles.push({ x: 600, y: 170 - height, width: 20, height: height }); // Floor is 170
    }

    gameOver() {
        this.active = false;
        this.soundManager.playSound('explosion');
        this.particleSystem.emit(this.player.x + 10, this.player.y + 10, '#ff0000', 50);
        this.saveSystem.setHighScore('runner-game', Math.floor(this.score));

        if (window.miniGameHub && window.miniGameHub.showGameOver) {
            window.miniGameHub.showGameOver(Math.floor(this.score), () => this.resetGame());
        }
    }

    updateScoreUI() {
        const el = document.getElementById("runner-score");
        if(el) el.textContent = Math.floor(this.score);
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Floor
        this.ctx.strokeStyle = "#00ffff";
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#00ffff";
        this.ctx.beginPath();
        this.ctx.moveTo(0, 170);
        this.ctx.lineTo(600, 170);
        this.ctx.stroke();

        // Player
        this.ctx.fillStyle = "#00ff00";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#00ff00";
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

        // Obstacles
        this.ctx.fillStyle = "#ff4500";
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = "#ff4500";
        this.obstacles.forEach(obstacle => {
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
        this.ctx.shadowBlur = 0;

        this.particleSystem.draw(this.ctx);
    }
}
