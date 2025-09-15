const breakoutGame = {
    canvas: null,
    ctx: null,
    ballRadius: 10,
    x: 0,
    y: 0,
    dx: 2,
    dy: -2,
    paddleHeight: 10,
    paddleWidth: 75,
    paddleX: 0,
    rightPressed: false,
    leftPressed: false,
    brickRowCount: 3,
    brickColumnCount: 5,
    brickWidth: 75,
    brickHeight: 20,
    brickPadding: 10,
    brickOffsetTop: 30,
    brickOffsetLeft: 30,
    bricks: [],
    score: 0,
    interval: null,
    keydownHandler: null,
    keyupHandler: null,

    init: function() {
        this.canvas = document.getElementById("breakoutCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height - 30;
        this.paddleX = (this.canvas.width - this.paddleWidth) / 2;
        this.score = 0;
        this.createBricks();

        this.keydownHandler = (e) => this.keyDownHandler(e);
        this.keyupHandler = (e) => this.keyUpHandler(e);
        document.addEventListener("keydown", this.keydownHandler);
        document.addEventListener("keyup", this.keyupHandler);

        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.draw(), 10);
    },

    shutdown: function() {
        if (this.interval) clearInterval(this.interval);
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
        }
        if (this.keyupHandler) {
            document.removeEventListener("keyup", this.keyupHandler);
        }
    },

    createBricks: function() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                this.bricks[c][r] = { x: 0, y: 0, status: 1 };
            }
        }
    },

    keyDownHandler: function(e) {
        if (e.key == "Right" || e.key == "ArrowRight") {
            this.rightPressed = true;
        } else if (e.key == "Left" || e.key == "ArrowLeft") {
            this.leftPressed = true;
        }
    },

    keyUpHandler: function(e) {
        if (e.key == "Right" || e.key == "ArrowRight") {
            this.rightPressed = false;
        } else if (e.key == "Left" || e.key == "ArrowLeft") {
            this.leftPressed = false;
        }
    },

    collisionDetection: function() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                let b = this.bricks[c][r];
                if (b.status == 1) {
                    if (this.x > b.x && this.x < b.x + this.brickWidth && this.y > b.y && this.y < b.y + this.brickHeight) {
                        this.dy = -this.dy;
                        b.status = 0;
                        this.score++;
                        if (this.score == this.brickRowCount * this.brickColumnCount) {
                            alert("YOU WIN, CONGRATULATIONS!");
                            this.shutdown();
                            this.init();
                        }
                    }
                }
            }
        }
    },

    drawBall: function() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = "#00ffff";
        this.ctx.fill();
        this.ctx.closePath();
    },

    drawPaddle: function() {
        this.ctx.beginPath();
        this.ctx.rect(this.paddleX, this.canvas.height - this.paddleHeight, this.paddleWidth, this.paddleHeight);
        this.ctx.fillStyle = "#00ff00";
        this.ctx.fill();
        this.ctx.closePath();
    },

    drawBricks: function() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status == 1) {
                    let brickX = (c * (this.brickWidth + this.brickPadding)) + this.brickOffsetLeft;
                    let brickY = (r * (this.brickHeight + this.brickPadding)) + this.brickOffsetTop;
                    this.bricks[c][r].x = brickX;
                    this.bricks[c][r].y = brickY;
                    this.ctx.beginPath();
                    this.ctx.rect(brickX, brickY, this.brickWidth, this.brickHeight);
                    this.ctx.fillStyle = "#ff00ff";
                    this.ctx.fill();
                    this.ctx.closePath();
                }
            }
        }
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBricks();
        this.drawBall();
        this.drawPaddle();
        this.collisionDetection();

        if (this.x + this.dx > this.canvas.width - this.ballRadius || this.x + this.dx < this.ballRadius) {
            this.dx = -this.dx;
        }
        if (this.y + this.dy < this.ballRadius) {
            this.dy = -this.dy;
        } else if (this.y + this.dy > this.canvas.height - this.ballRadius) {
            if (this.x > this.paddleX && this.x < this.paddleX + this.paddleWidth) {
                this.dy = -this.dy;
            } else {
                alert("GAME OVER");
                this.shutdown();
                this.init();
            }
        }

        if (this.rightPressed && this.paddleX < this.canvas.width - this.paddleWidth) {
            this.paddleX += 7;
        } else if (this.leftPressed && this.paddleX > 0) {
            this.paddleX -= 7;
        }

        this.x += this.dx;
        this.y += this.dy;
    }
};
