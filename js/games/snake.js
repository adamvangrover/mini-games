const snakeGame = {
    canvas: null,
    ctx: null,
    tileSize: 20,
    snake: [{ x: 10, y: 10 }],
    food: { x: 5, y: 5 },
    dx: 1,
    dy: 0,
    score: 0,
    interval: null,
    keydownHandler: null,

    init: function() {
        this.canvas = document.getElementById("snakeCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.snake = [{ x: 10, y: 10 }];
        this.food = { x: 5, y: 5 };
        this.dx = 1;
        this.dy = 0;
        this.score = 0;
        document.getElementById("snake-score").textContent = this.score;

        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            this.move();
            this.draw();
        }, 150);

        this.keydownHandler = (e) => this.handleKeydown(e);
        document.addEventListener("keydown", this.keydownHandler);
    },

    shutdown: function() {
        if (this.interval) clearInterval(this.interval);
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
        }
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#00ff00";
        this.snake.forEach(segment => {
            this.ctx.fillRect(segment.x * this.tileSize, segment.y * this.tileSize, this.tileSize, this.tileSize);
        });

        this.ctx.fillStyle = "#ff4500";
        this.ctx.fillRect(this.food.x * this.tileSize, this.food.y * this.tileSize, this.tileSize, this.tileSize);
    },

    move: function() {
        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };

        if (head.x < 0 || head.y < 0 || head.x >= this.canvas.width / this.tileSize || head.y >= this.canvas.height / this.tileSize) {
            this.gameOver();
            return;
        }

        for (let i = 1; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.gameOver();
                return;
            }
        }

        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            document.getElementById("snake-score").textContent = this.score;
            this.createFood();
        } else {
            this.snake.pop();
        }
    },

    createFood: function() {
        this.food = {
            x: Math.floor(Math.random() * (this.canvas.width / this.tileSize)),
            y: Math.floor(Math.random() * (this.canvas.height / this.tileSize))
        };
    },

    gameOver: function() {
        clearInterval(this.interval);
        alert("Game Over! Your score: " + this.score);
        this.init();
    },

    handleKeydown: function(e) {
        if (e.key === "ArrowUp" && this.dy !== 1) { this.dx = 0; this.dy = -1; }
        if (e.key === "ArrowDown" && this.dy !== -1) { this.dx = 0; this.dy = 1; }
        if (e.key === "ArrowLeft" && this.dx !== 1) { this.dx = -1; this.dy = 0; }
        if (e.key === "ArrowRight" && this.dx !== -1) { this.dx = 1; this.dy = 0; }
        this.move();
        this.draw();
    }
};
