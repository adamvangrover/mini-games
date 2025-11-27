export default {
    canvas: null,
    ctx: null,
    paddleHeight: 80,
    paddleWidth: 10,
    player1: { x: 10, y: 0, score: 0 },
    player2: { x: 0, y: 0, score: 0 },
    ball: { x: 0, y: 0, radius: 10, dx: 5, dy: 5 },
    interval: null,
    keydownHandler: null,
    particles: [],
    shake: 0,

    init: function() {
        this.canvas = document.getElementById("pongCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.player1 = { x: 10, y: this.canvas.height / 2 - this.paddleHeight / 2, score: 0 };
        this.player2 = { x: this.canvas.width - 20, y: this.canvas.height / 2 - this.paddleHeight / 2, score: 0 };
        this.ball = { x: this.canvas.width / 2, y: this.canvas.height / 2, radius: 10, dx: 5, dy: 5 };
        this.particles = [];
        this.shake = 0;
        this.updateScore();

        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.draw(), 16);

        this.keydownHandler = (e) => this.handleKeydown(e);
        document.addEventListener("keydown", this.keydownHandler);
    },

    shutdown: function() {
        if (this.interval) clearInterval(this.interval);
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
        }
    },

    drawPaddles: function() {
        this.ctx.fillStyle = "#ff00ff";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#ff00ff";
        this.ctx.fillRect(this.player1.x, this.player1.y, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(this.player2.x, this.player2.y, this.paddleWidth, this.paddleHeight);
        this.ctx.shadowBlur = 0;
    },

    drawBall: function() {
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = "#00ffff";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#00ffff";
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        this.ctx.closePath();
    },

    moveBall: function() {
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Bounce off top/bottom
        if (this.ball.y + this.ball.radius > this.canvas.height || this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
            if(window.soundManager) window.soundManager.playTone(400, 'sine', 0.05);
        }

        // Paddle Collision
        if (
            (this.ball.x - this.ball.radius < this.player1.x + this.paddleWidth && this.ball.y > this.player1.y && this.ball.y < this.player1.y + this.paddleHeight) ||
            (this.ball.x + this.ball.radius > this.player2.x && this.ball.y > this.player2.y && this.ball.y < this.player2.y + this.paddleHeight)
        ) {
            this.ball.dx = -this.ball.dx * 1.05; // Speed up
            this.shake = 5;
            this.createParticles(this.ball.x, this.ball.y, '#00ffff');
            if(window.soundManager) window.soundManager.playTone(600, 'square', 0.05);
        }

        // Score
        if (this.ball.x - this.ball.radius < 0) {
            this.player2.score++;
            this.createParticles(0, this.ball.y, '#ff00ff');
            if(window.soundManager) window.soundManager.playSound('score');
            this.resetBall();
        }

        if (this.ball.x + this.ball.radius > this.canvas.width) {
            this.player1.score++;
            this.createParticles(this.canvas.width, this.ball.y, '#ff00ff');
            if(window.soundManager) window.soundManager.playSound('score');
            this.resetBall();
        }

        this.updateScore();
    },

    createParticles: function(x, y, color) {
        for(let i=0; i<10; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 20,
                color: color
            });
        }
    },

    drawParticles: function() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life / 20;
            this.ctx.fillRect(p.x, p.y, 3, 3);
            this.ctx.globalAlpha = 1;

            if (p.life <= 0) this.particles.splice(i, 1);
        }
    },

    resetBall: function() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5;
        this.ball.dy = (Math.random() > 0.5 ? 1 : -1) * 5;
        this.shake = 10;
    },

    updateScore: function() {
        document.getElementById("pong-score").innerText = `${this.player1.score} - ${this.player2.score}`;
    },

    draw: function() {
        this.ctx.save();

        // Screen Shake
        if (this.shake > 0) {
            const dx = (Math.random() - 0.5) * this.shake;
            const dy = (Math.random() - 0.5) * this.shake;
            this.ctx.translate(dx, dy);
            this.shake *= 0.9;
            if (this.shake < 0.5) this.shake = 0;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Trail effect
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);

        this.drawPaddles();
        this.drawBall();
        this.drawParticles();
        this.moveBall();

        this.ctx.restore();
    },

    handleKeydown: function(e) {
        if (e.key === "w" || e.key === "W") this.player1.y -= 20;
        if (e.key === "s" || e.key === "S") this.player1.y += 20;

        if (e.key === "ArrowUp") this.player2.y -= 20;
        if (e.key === "ArrowDown") this.player2.y += 20;

        this.player1.y = Math.max(0, Math.min(this.player1.y, this.canvas.height - this.paddleHeight));
        this.player2.y = Math.max(0, Math.min(this.player2.y, this.canvas.height - this.paddleHeight));
    }
};
