export default {
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

    // Ghost Piece
    ghostPiece: null,

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
        '#22d3ee', // Cyan
        '#c084fc', // Purple
        '#4ade80', // Green
        '#facc15', // Yellow
        '#fb923c', // Orange
        '#3b82f6', // Blue
        '#f472b6'  // Pink
    ],

    init: function() {
        this.canvas = document.getElementById('tetrisCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('tetris-score');

        // Reset scale in case it was left over
        this.ctx.resetTransform();
        this.ctx.scale(this.blockSize, this.blockSize);

        this.board = this.createBoard();
        this.reset();

        this.keydownHandler = e => this.handleKeydown(e);
        document.addEventListener('keydown', this.keydownHandler);

        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.gameLoop(), 500);

        this.draw(); // Initial draw
    },

    shutdown: function() {
        if (this.interval) clearInterval(this.interval);
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        // Reset the scale
        if (this.ctx) this.ctx.resetTransform();
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
        this.updateGhostPiece();
    },

    updateGhostPiece: function() {
        if (!this.currentPiece) return;
        this.ghostPiece = {
            ...this.currentPiece,
            y: this.currentPiece.y
        };

        while(!this.collides(this.ghostPiece)) {
            this.ghostPiece.y++;
        }
        this.ghostPiece.y--;
    },

    draw: function() {
        // Clear logic for scaled context
        this.ctx.fillStyle = '#0f172a'; // BG color
        this.ctx.fillRect(0, 0, this.cols, this.rows);

        this.drawBoard();
        if (this.currentPiece) {
            this.drawGhostPiece();
            this.drawPiece();
        }
    },

    drawBoard: function() {
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawBlock(x, y, this.colors[value - 1]);
                }
            });
        });
    },

    drawPiece: function() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawBlock(this.currentPiece.x + x, this.currentPiece.y + y, this.currentPiece.color);
                }
            });
        });
    },

    drawGhostPiece: function() {
        this.ctx.globalAlpha = 0.2;
        this.ghostPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.ctx.fillStyle = this.ghostPiece.color;
                    this.ctx.fillRect(this.ghostPiece.x + x, this.ghostPiece.y + y, 1, 1);
                }
            });
        });
        this.ctx.globalAlpha = 1.0;
    },

    drawBlock: function(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, 1, 1);

        // Bevel Effect
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.fillRect(x, y, 1, 0.1);
        this.ctx.fillRect(x, y, 0.1, 1);

        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(x + 0.9, y, 0.1, 1);
        this.ctx.fillRect(x, y + 0.9, 1, 0.1);
    },

    move: function(dir) {
        this.currentPiece.x += dir;
        if (this.collides(this.currentPiece)) {
            this.currentPiece.x -= dir;
        } else {
            if(window.soundManager) window.soundManager.playTone(100, 'square', 0.05);
            this.updateGhostPiece();
        }
    },

    drop: function() {
        this.currentPiece.y++;
        if (this.collides(this.currentPiece)) {
            this.currentPiece.y--;
            this.solidify();
            if(window.soundManager) window.soundManager.playSound('click');
        }
    },

    hardDrop: function() {
        while(!this.collides(this.currentPiece)) {
            this.currentPiece.y++;
        }
        this.currentPiece.y--;
        this.solidify();
        if(window.soundManager) window.soundManager.playTone(150, 'sawtooth', 0.1, true); // Thud

        // Screen Shake Effect (simulated by offsetting canvas context briefly?)
        // Hard to do with current setup, requires persistent shake state in loop.
        // Let's just flash the background?
        this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this.ctx.fillRect(0,0,this.cols,this.rows);
    },

    rotate: function() {
        const shape = this.currentPiece.shape;
        const newShape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex])).reverse();
        const oldShape = this.currentPiece.shape;
        this.currentPiece.shape = newShape;
        if (this.collides(this.currentPiece)) {
            this.currentPiece.shape = oldShape;
        } else {
             if(window.soundManager) window.soundManager.playTone(200, 'sine', 0.05);
             this.updateGhostPiece();
        }
    },

    collides: function(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x] > 0) {
                    let newX = piece.x + x;
                    let newY = piece.y + y;
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
        if (this.collides(this.currentPiece)) {
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
            this.score += linesCleared * 10 * linesCleared; // Bonus for multi-line
            this.scoreElement.textContent = this.score;
            if(window.soundManager) window.soundManager.playSound('score');
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
            if(window.soundManager) window.soundManager.playSound('gameover');
            alert("Game Over! Score: " + this.score);
            this.init();
        }
    },

    handleKeydown: function(e) {
        if (this.isGameOver) return;
        if (e.key === "ArrowLeft") { this.move(-1); e.preventDefault(); }
        if (e.key === "ArrowRight") { this.move(1); e.preventDefault(); }
        if (e.key === "ArrowDown") { this.drop(); e.preventDefault(); }
        if (e.key === "ArrowUp") { this.rotate(); e.preventDefault(); }
        if (e.key === " " || e.code === "Space") { this.hardDrop(); e.preventDefault(); this.draw(); }
        this.draw();
    }
};
