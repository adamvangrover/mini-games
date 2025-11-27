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

        // Juice: Screen Shake
        this.shake = 0;
    }

    init(container) {
        this.canvas = container.querySelector("canvas");
        if (!this.canvas) {
            console.error("Pong canvas not found in container");
            return;
        }
        this.ctx = this.canvas.getContext("2d");
        this.player1 = { x: 10, y: this.canvas.height / 2 - this.paddleHeight / 2, score: 0 };
        this.player2 = { x: this.canvas.width - 20, y: this.canvas.height / 2 - this.paddleHeight / 2, score: 0 };
        this.ball = { x: this.canvas.width / 2, y: this.canvas.height / 2, radius: 10, dx: 200, dy: 200 }; // Speed in pixels/sec

        this.updateScore();
        this.active = true;
    }

    shutdown() {
        this.active = false;
        this.particles = [];
    }

    update(deltaTime) {
        if (!this.active) return;

        const speed = 400 * deltaTime;

        // Update Screen Shake
        if (this.shake > 0) {
            this.shake -= 30 * deltaTime;
            if (this.shake < 0) this.shake = 0;
        }

        if (window.inputManager) {
            if (window.inputManager.isKeyDown('KeyW')) this.player1.y -= speed;
            if (window.inputManager.isKeyDown('KeyS')) this.player1.y += speed;
            if (window.inputManager.isKeyDown('ArrowUp')) this.player2.y -= speed;
            if (window.inputManager.isKeyDown('ArrowDown')) this.player2.y += speed;
        }

        // Clamp positions
        this.player1.y = Math.max(0, Math.min(this.player1.y, this.canvas.height - this.paddleHeight));
        this.player2.y = Math.max(0, Math.min(this.player2.y, this.canvas.height - this.paddleHeight));

        // Ball Movement
        this.ball.x += this.ball.dx * deltaTime;
        this.ball.y += this.ball.dy * deltaTime;

        // Trail Particles
        if (Math.random() > 0.5) {
            this.spawnParticle(this.ball.x, this.ball.y, '#00ffff');
        }

        // Wall Collisions
        if (this.ball.y + this.ball.radius > this.canvas.height || this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
            window.soundManager.playSound('click');
            this.spawnExplosion(this.ball.x, this.ball.y, 5, '#00ffff');
        }

        // Paddle Collisions
        if (
            (this.ball.x - this.ball.radius < this.player1.x + this.paddleWidth && this.ball.y > this.player1.y && this.ball.y < this.player1.y + this.paddleHeight) ||
            (this.ball.x + this.ball.radius > this.player2.x && this.ball.y > this.player2.y && this.ball.y < this.player2.y + this.paddleHeight)
        ) {
            this.ball.dx = -this.ball.dx * 1.05; // Speed up slightly
            this.ball.dx = Math.sign(this.ball.dx) * Math.min(Math.abs(this.ball.dx), 800); // Cap speed
            window.soundManager.playSound('click');
            this.spawnExplosion(this.ball.x, this.ball.y, 10, '#ff00ff');
            this.shake = 5;
        }

        // Scoring
        if (this.ball.x - this.ball.radius < 0) {
            this.player2.score++;
            window.soundManager.playSound('score');
            this.resetBall();
            this.shake = 10;
        }

        if (this.ball.x + this.ball.radius > this.canvas.width) {
            this.player1.score++;
            window.soundManager.playSound('score');
            this.resetBall();
            this.shake = 10;
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= deltaTime;
            p.alpha = p.life / p.maxLife;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    spawnParticle(x, y, color) {
        this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 50,
            vy: (Math.random() - 0.5) * 50,
            life: 0.5,
            maxLife: 0.5,
            color: color,
            size: Math.random() * 3 + 1
        });
    }

    spawnExplosion(x, y, count, color) {
        for (let i = 0; i < count; i++) {
             this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 0.8,
                maxLife: 0.8,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }

    draw() {
        if (!this.ctx) return;

        // Shake offset
        const dx = (Math.random() - 0.5) * this.shake;
        const dy = (Math.random() - 0.5) * this.shake;

        this.ctx.save();
        this.ctx.translate(dx, dy);

        // Clear
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)"; // Trail effect
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Particles
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;

        // Draw Paddles
        this.ctx.fillStyle = "#ff00ff";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#ff00ff";
        this.ctx.fillRect(this.player1.x, this.player1.y, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(this.player2.x, this.player2.y, this.paddleWidth, this.paddleHeight);

        // Draw Ball
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = "#00ffff";
        this.ctx.shadowColor = "#00ffff";
        this.ctx.fill();
        this.ctx.closePath();

        this.ctx.shadowBlur = 0; // Reset shadow
        this.ctx.restore();
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.dx = -this.ball.dx;
        this.ball.dy = (Math.random() > 0.5 ? 200 : -200);
        this.updateScore();
    }

    updateScore() {
        const scoreEl = document.getElementById("pong-score");
        if (scoreEl) {
            scoreEl.innerText = `${this.player1.score} - ${this.player2.score}`;
        }
    }
}
