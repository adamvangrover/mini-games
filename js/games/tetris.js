const tetrisGame = {
    canvas: null,
    ctx: null,
    scoreElement: null,
    cols: 10,
    rows: 20,
    blockSize: 20,
    board: [],
    currentPiece: null,
    score: 0,
    isGameOver: false,
    interval: null,
    keydownHandler: null,

    shapes: [
        [[1,1,1,1]],
        [[1,1],[1,1]],
        [[0,1,0],[1,1,1]],
        [[1,1,0],[0,1,1]],
        [[0,1,1],[1,1,0]],
        [[1,0,0],[1,1,1]],
        [[0,0,1],[1,1,1]]
    ],

    colors: [
        '#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff4500', '#0000ff', '#ff1493'
    ],

    init: function() {
        this.canvas = document.getElementById('tetrisCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('tetris-score');
        this.ctx.scale(this.blockSize, this.blockSize);
        this.board = this.createBoard();
        this.reset();

        this.keydownHandler = e => this.handleKeydown(e);
        document.addEventListener('keydown', this.keydownHandler);

        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.gameLoop(), 500);
    },

    shutdown: function() {
        if (this.interval) clearInterval(this.interval);
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        // Reset the scale
        this.ctx.scale(1/this.blockSize, 1/this.blockSize);
    },

    createBoard: function() {
        return Array.from({length: this.rows}, () => Array(this.cols).fill(0));
    },

    newPiece: function() {
        const typeId = Math.floor(Math.random() * this.shapes.length);
        const piece = this.shapes[typeId];
        this.currentPiece = {
            x: Math.floor(this.cols / 2) - Math.floor(piece[0].length / 2),
            y: 0,
            shape: piece,
            color: this.colors[typeId]
        };
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBoard();
        this.drawPiece();
    },

    drawBoard: function() {
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.ctx.fillStyle = this.colors[value - 1];
                    this.ctx.fillRect(x, y, 1, 1);
                }
            });
        });
    },

    drawPiece: function() {
        this.ctx.fillStyle = this.currentPiece.color;
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.ctx.fillRect(this.currentPiece.x + x, this.currentPiece.y + y, 1, 1);
                }
            });
        });
    },

    move: function(dir) {
        this.currentPiece.x += dir;
        if (this.collides()) {
            this.currentPiece.x -= dir;
        }
    },

    drop: function() {
        this.currentPiece.y++;
        if (this.collides()) {
            this.currentPiece.y--;
            this.solidify();
        }
    },

    rotate: function() {
        const shape = this.currentPiece.shape;
        const newShape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex])).reverse();
        const oldShape = this.currentPiece.shape;
        this.currentPiece.shape = newShape;
        if (this.collides()) {
            this.currentPiece.shape = oldShape;
        }
    },

    collides: function() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x] > 0) {
                    let newX = this.currentPiece.x + x;
                    let newY = this.currentPiece.y + y;
                    if (newX < 0 || newX >= this.cols || newY >= this.rows || (this.board[newY] && this.board[newY][newX] > 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    },

    solidify: function() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.board[this.currentPiece.y + y][this.currentPiece.x + x] = this.colors.indexOf(this.currentPiece.color) + 1;
                }
            });
        });
        this.clearLines();
        this.newPiece();
        if (this.collides()) {
            this.isGameOver = true;
        }
    },

    clearLines: function() {
        let linesCleared = 0;
        outer: for (let y = this.rows - 1; y >= 0; y--) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x] === 0) {
                    continue outer;
                }
            }
            const row = this.board.splice(y, 1)[0].fill(0);
            this.board.unshift(row);
            y++;
            linesCleared++;
        }
        if (linesCleared > 0) {
            this.score += linesCleared * 10;
            this.scoreElement.textContent = this.score;
        }
    },

    reset: function() {
        this.board.forEach(row => row.fill(0));
        this.score = 0;
        this.scoreElement.textContent = this.score;
        this.isGameOver = false;
        this.newPiece();
    },

    gameLoop: function() {
        if (!this.isGameOver) {
            this.drop();
            this.draw();
        } else {
            this.shutdown();
            alert("Game Over! Score: " + this.score);
            this.init();
        }
    },

    handleKeydown: function(e) {
        if (this.isGameOver) return;
        if (e.key === "ArrowLeft") this.move(-1);
        if (e.key === "ArrowRight") this.move(1);
        if (e.key === "ArrowDown") this.drop();
        if (e.key === "ArrowUp") this.rotate();
        this.draw();
    }
};
