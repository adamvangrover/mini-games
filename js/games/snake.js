import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';

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

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
    }

    init(container) {
        this.canvas = document.getElementById("snakeCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.active = true;
        this.resetGame();

        container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });
    }

    resetGame() {
        this.snake = [{ x: 10, y: 10 }];
        this.createFood();
        this.dx = 1;
        this.dy = 0;
        this.score = 0;
        this.timeSinceLastMove = 0;
        this.updateScoreUI();
    }

    shutdown() {
        this.active = false;
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
        this.soundManager.playSound('explosion');
        // Simple alert for now, could be better UI
        alert("Game Over! Your score: " + this.score);
        this.resetGame();
    }

    updateScoreUI() {
        const el = document.getElementById("snake-score");
        if(el) el.textContent = this.score;
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
    }
}
