import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class PongGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.paddleHeight = 80;
        this.paddleWidth = 10;
        this.player1 = { x: 10, y: 0, score: 0 };
        this.player2 = { x: 0, y: 0, score: 0 };
        this.ball = { x: 0, y: 0, radius: 10, dx: 5, dy: 5 };
        this.active = false;

        // Juice: Particles
        this.particles = [];
        this.trail = [];

        // Juice: Screen Shake
        this.shakeTimer = 0;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
    }

    init(container) {
        this.canvas = container.querySelector("canvas");
        if (!this.canvas) {
            // Fallback for legacy
            this.canvas = document.getElementById("pongCanvas");
        }
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext("2d");

        this.player1 = { x: 10, y: this.canvas.height / 2 - this.paddleHeight / 2, score: 0 };
        this.player2 = { x: this.canvas.width - 20, y: this.canvas.height / 2 - this.paddleHeight / 2, score: 0 };
        this.ball = { x: this.canvas.width / 2, y: this.canvas.height / 2, radius: 10, dx: 300, dy: 300 };
        this.trail = [];
        this.updateScore();
        this.active = true;

        container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });
    }

    shutdown() {
        this.active = false;
        this.particles = [];
    }

    update(dt) {
        if (!this.active) return;
        const speed = 400 * dt;

        // Input
        if (this.inputManager.isKeyDown("KeyW") || this.inputManager.isKeyDown("w")) this.player1.y -= speed;
        if (this.inputManager.isKeyDown("KeyS") || this.inputManager.isKeyDown("s")) this.player1.y += speed;
        if (this.inputManager.isKeyDown("ArrowUp")) this.player2.y -= speed;
        if (this.inputManager.isKeyDown("ArrowDown")) this.player2.y += speed;

        this.player1.y = Math.max(0, Math.min(this.player1.y, this.canvas.height - this.paddleHeight));
        this.player2.y = Math.max(0, Math.min(this.player2.y, this.canvas.height - this.paddleHeight));

        // Trail Logic
        this.trail.push({x: this.ball.x, y: this.ball.y, alpha: 1.0});
        if (this.trail.length > 20) this.trail.shift();
        this.trail.forEach(t => t.alpha -= dt * 2);

        // Movement
        this.ball.x += this.ball.dx * dt;
        this.ball.y += this.ball.dy * dt;

        // Wall collisions
        if (this.ball.y + this.ball.radius > this.canvas.height || this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
            this.soundManager.playSound('click');
            this.particleSystem.emit(this.ctx, this.ball.x, this.ball.y, '#00ffff', 5);
        }

        // Paddle Collisions
        if (
            (this.ball.x - this.ball.radius < this.player1.x + this.paddleWidth && this.ball.y > this.player1.y && this.ball.y < this.player1.y + this.paddleHeight) ||
            (this.ball.x + this.ball.radius > this.player2.x && this.ball.y > this.player2.y && this.ball.y < this.player2.y + this.paddleHeight)
        ) {
            this.ball.dx = -this.ball.dx * 1.05; // Speed up
            this.ball.dx = Math.sign(this.ball.dx) * Math.min(Math.abs(this.ball.dx), 800); // Cap speed
            this.soundManager.playSound('click');
            this.particleSystem.emit(this.ctx, this.ball.x, this.ball.y, '#ff00ff', 10);
            this.shakeTimer = 0.2;
        }

        // Scoring
        if (this.ball.x - this.ball.radius < 0) {
            this.player2.score++;
            this.soundManager.playSound('score');
            this.resetBall();
            this.shakeTimer = 0.5;
        }

        if (this.ball.x + this.ball.radius > this.canvas.width) {
            this.player1.score++;
            this.soundManager.playSound('score');
            this.resetBall();
            this.shakeTimer = 0.5;
        }

        if (this.shakeTimer > 0) this.shakeTimer -= dt;

        this.updateScore();
        this.particleSystem.update(dt);
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.dx = -this.ball.dx;
        this.ball.dy = (Math.random() > 0.5 ? 300 : -300);
        this.trail = [];
    }

    updateScore() {
        const scoreEl = document.getElementById("pong-score");
        if (scoreEl) {
            scoreEl.innerText = `${this.player1.score} - ${this.player2.score}`;
        }
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

        // Draw Trail
        this.trail.forEach(t => {
            if (t.alpha <= 0) return;
            this.ctx.globalAlpha = t.alpha * 0.5;
            this.ctx.fillStyle = "#00ffff";
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, this.ball.radius * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        // Draw Paddles
        this.ctx.fillStyle = "#ff00ff";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#ff00ff";
        this.ctx.fillRect(this.player1.x, this.player1.y, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(this.player2.x, this.player2.y, this.paddleWidth, this.paddleHeight);
        this.ctx.shadowBlur = 0;

        // Draw Ball
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = "#00ffff";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#00ffff";
        this.ctx.fill();
        this.ctx.closePath();
        this.ctx.shadowBlur = 0;

        // Particles
        this.particleSystem.draw(this.ctx);

        this.ctx.restore();
    }
}
