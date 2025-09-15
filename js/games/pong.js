const pongGame = {
    canvas: null,
    ctx: null,
    paddleHeight: 80,
    paddleWidth: 10,
    player1: { x: 10, y: 0, score: 0 },
    player2: { x: 0, y: 0, score: 0 },
    ball: { x: 0, y: 0, radius: 10, dx: 5, dy: 5 },
    interval: null,
    keydownHandler: null,

    init: function() {
        this.canvas = document.getElementById("pongCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.player1 = { x: 10, y: this.canvas.height / 2 - this.paddleHeight / 2, score: 0 };
        this.player2 = { x: this.canvas.width - 20, y: this.canvas.height / 2 - this.paddleHeight / 2, score: 0 };
        this.ball = { x: this.canvas.width / 2, y: this.canvas.height / 2, radius: 10, dx: 5, dy: 5 };
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
        this.ctx.fillRect(this.player1.x, this.player1.y, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(this.player2.x, this.player2.y, this.paddleWidth, this.paddleHeight);
    },

    drawBall: function() {
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = "#00ffff";
        this.ctx.fill();
        this.ctx.closePath();
    },

    moveBall: function() {
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        if (this.ball.y + this.ball.radius > this.canvas.height || this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
        }

        if (
            (this.ball.x - this.ball.radius < this.player1.x + this.paddleWidth && this.ball.y > this.player1.y && this.ball.y < this.player1.y + this.paddleHeight) ||
            (this.ball.x + this.ball.radius > this.player2.x && this.ball.y > this.player2.y && this.ball.y < this.player2.y + this.paddleHeight)
        ) {
            this.ball.dx = -this.ball.dx;
        }

        if (this.ball.x - this.ball.radius < 0) {
            this.player2.score++;
            this.resetBall();
        }

        if (this.ball.x + this.ball.radius > this.canvas.width) {
            this.player1.score++;
            this.resetBall();
        }

        this.updateScore();
    },

    resetBall: function() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.dx = -this.ball.dx;
        this.ball.dy = 5;
    },

    updateScore: function() {
        document.getElementById("pong-score").innerText = `${this.player1.score} - ${this.player2.score}`;
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawPaddles();
        this.drawBall();
        this.moveBall();
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
