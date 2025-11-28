export default {
    canvas: null,
    ctx: null,
    tileSize: 20,
    snake: [{ x: 10, y: 10 }],
    food: { x: 5, y: 5 },
    dx: 1,
    dy: 0,
    score: 0,
    interval: null,
    animationFrameId: null,
    keydownHandler: null,
    particles: [],

    init: function() {
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

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
    }

    init(container) {
        this.canvas = document.getElementById("snakeCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.resetGame();
    }

    resetGame() {
        this.snake = [{ x: 10, y: 10 }];
        this.createFood();
        this.dx = 1;
        this.dy = 0;
        this.score = 0;
        this.particles = [];
        document.getElementById("snake-score").textContent = this.score;

        if (this.interval) clearInterval(this.interval);
        // Game Logic Loop (Movement)
        this.interval = setInterval(() => {
            this.move();
        }, 100);

        // Rendering Loop (Visuals)
        this.loop();
        this.timeSinceLastMove = 0;
        this.updateScoreUI();
    }

    shutdown() { }

    update(dt) {
        // Input Handling
        if (this.inputManager.isKeyDown("ArrowUp") && this.dy !== 1) { this.dx = 0; this.dy = -1; }
        else if (this.inputManager.isKeyDown("ArrowDown") && this.dy !== -1) { this.dx = 0; this.dy = 1; }
        else if (this.inputManager.isKeyDown("ArrowLeft") && this.dx !== 1) { this.dx = -1; this.dy = 0; }
        else if (this.inputManager.isKeyDown("ArrowRight") && this.dx !== -1) { this.dx = 1; this.dy = 0; }

    shutdown: function() {
        if (this.interval) clearInterval(this.interval);
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
        }
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Darker BG for Neon Contrast (if transparent, main css bg shows, which is dark)
        // this.ctx.fillStyle = "rgba(0,0,0,0.5)";
        // this.ctx.fillRect(0,0,400,400);

        // Draw Snake
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#22c55e";
        this.ctx.fillStyle = "#22c55e";
        this.snake.forEach((segment, index) => {
            // Gradient or slight variation for head
            if (index === 0) this.ctx.fillStyle = "#4ade80";
            else this.ctx.fillStyle = "#22c55e";

            this.ctx.fillRect(segment.x * this.tileSize, segment.y * this.tileSize, this.tileSize - 2, this.tileSize - 2);
        });
        this.ctx.shadowBlur = 0;

        // Draw Food
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = "#ef4444";
        this.ctx.fillStyle = "#ef4444";
        this.ctx.beginPath();
        const fx = this.food.x * this.tileSize + this.tileSize/2;
        const fy = this.food.y * this.tileSize + this.tileSize/2;
        this.ctx.arc(fx, fy, this.tileSize/3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Particles
        this.drawParticles();
    },

    drawParticles: function() {
        for(let i=this.particles.length-1; i>=0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;

            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
            this.ctx.globalAlpha = 1.0;

            if(p.life <= 0) this.particles.splice(i, 1);
        }
    },

    spawnParticles: function(x, y, color) {
        for(let i=0; i<10; i++) {
            this.particles.push({
                x: x * this.tileSize + this.tileSize/2,
                y: y * this.tileSize + this.tileSize/2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    },
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
            document.getElementById("snake-score").textContent = this.score;
            if(window.soundManager) window.soundManager.playSound('score');
            this.spawnParticles(this.food.x, this.food.y, "#ef4444");
            this.soundManager.playSound('score');
            this.updateScoreUI();
            this.createFood();
            // Don't pop tail, so we grow
        } else {
            this.snake.pop();
        }
    }

    loop: function() {
        this.draw();
        this.animationFrameId = requestAnimationFrame(() => this.loop());
    },

    createFood: function() {
    createFood() {
        const gridW = this.canvas.width / this.tileSize;
        const gridH = this.canvas.height / this.tileSize;
        this.food = {
            x: Math.floor(Math.random() * gridW),
            y: Math.floor(Math.random() * gridH)
        };
    }

    gameOver: function() {
        clearInterval(this.interval);
        cancelAnimationFrame(this.animationFrameId);
        if(window.soundManager) window.soundManager.playSound('gameover');
        alert("Game Over! Your score: " + this.score);
        this.init();
    },

    handleKeydown: function(e) {
        if (e.key === "ArrowUp" && this.dy !== 1) { this.dx = 0; this.dy = -1; e.preventDefault(); }
        if (e.key === "ArrowDown" && this.dy !== -1) { this.dx = 0; this.dy = 1; e.preventDefault(); }
        if (e.key === "ArrowLeft" && this.dx !== 1) { this.dx = -1; this.dy = 0; e.preventDefault(); }
        if (e.key === "ArrowRight" && this.dx !== -1) { this.dx = 1; this.dy = 0; e.preventDefault(); }
    gameOver() {
        this.soundManager.playSound('explosion');
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

        this.ctx.fillStyle = "#00ff00";
        this.snake.forEach((segment, index) => {
            // Head is slightly brighter
            this.ctx.fillStyle = index === 0 ? "#ccffcc" : "#00ff00";
            this.ctx.fillRect(segment.x * this.tileSize, segment.y * this.tileSize, this.tileSize, this.tileSize);
        });

        // Food Pulse
        this.ctx.shadowColor = "#ff4500";
        this.ctx.shadowBlur = 15 + Math.sin(this.foodPulse) * 5;
        this.ctx.fillStyle = "#ff4500";
        this.ctx.fillRect(this.food.x * this.tileSize, this.food.y * this.tileSize, this.tileSize, this.tileSize);

        // Reset Shadow
        this.ctx.shadowBlur = 0;
    }
}
