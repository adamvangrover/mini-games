import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class RunnerGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.player = { x: 50, y: 150, width: 20, height: 20, velocityY: 0, isJumping: false };
        this.gravity = 1200; // Adjusted for dt
        this.obstacles = [];
        this.gameSpeed = 200; // pixels per second
        this.score = 0;
        this.isGameOver = false;

        this.obstacleTimer = 0;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        this.canvas = document.getElementById("runnerCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.resetGame();
    }

    resetGame() {
        this.player = { x: 50, y: 150, width: 20, height: 20, velocityY: 0, isJumping: false };
        this.obstacles = [];
        this.gameSpeed = 200;
        this.score = 0;
        this.isGameOver = false;
        this.obstacleTimer = 0;
        this.updateScoreUI();
    }

    shutdown() { }

    update(dt) {
        if (this.isGameOver) return;

        // Input
        if (this.inputManager.isKeyDown("Space")) {
            this.jump();
        }

        // Obstacle Spawning
        this.obstacleTimer += dt;
        if (this.obstacleTimer > 1.5) {
            this.createObstacle();
            this.obstacleTimer = 0;
        }

        // Physics
        this.player.velocityY += this.gravity * dt;
        this.player.y += this.player.velocityY * dt;

        if (this.player.y >= 150) {
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

        // Score
        this.score += 10 * dt;
        this.gameSpeed += 5 * dt;
        this.updateScoreUI();
    }

    jump() {
        if (!this.player.isJumping) {
            this.player.velocityY = -500;
            this.player.isJumping = true;
            this.soundManager.playSound('jump');
        }
    }

    createObstacle() {
        let height = Math.random() * 30 + 20;
        this.obstacles.push({ x: 600, y: 170 - height, width: 20, height: height }); // Floor is ~170 in canvas space
    }

    gameOver() {
        this.isGameOver = true;
        this.soundManager.playSound('explosion');
        this.saveSystem.setHighScore('runner-game', Math.floor(this.score));

        // Simple restart logic delay or UI
        setTimeout(() => {
            alert("Game Over! Score: " + Math.floor(this.score));
            this.resetGame();
        }, 100);
    }

    updateScoreUI() {
        const el = document.getElementById("runner-score");
        if(el) el.textContent = Math.floor(this.score);
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.isGameOver) {
            this.ctx.fillStyle = "#ff4500";
            this.ctx.font = "30px 'Press Start 2P'";
            this.ctx.fillText("Game Over!", this.canvas.width / 2 - 120, this.canvas.height / 2);
            return;
        }

        // Floor
        this.ctx.strokeStyle = "#00ffff";
        this.ctx.beginPath();
        this.ctx.moveTo(0, 170);
        this.ctx.lineTo(600, 170);
        this.ctx.stroke();

        // Player
        this.ctx.fillStyle = "#00ff00";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#00ff00";
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        this.ctx.shadowBlur = 0;

        // Obstacles
        this.ctx.fillStyle = "#ff4500";
        this.obstacles.forEach(obstacle => {
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
    }
}
