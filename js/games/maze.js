const mazeGame = {
    canvas: null,
    ctx: null,
    tileSize: 40,
    rows: 10,
    cols: 10,
    maze: [],
    player: { x: 0, y: 0 },
    goal: { x: 9, y: 9 },
    enemies: [{ x: 4, y: 4, dx: 1, dy: 0 }],
    interval: null,
    keydownHandler: null,

    init: function() {
        this.canvas = document.getElementById("mazeCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.player = { x: 0, y: 0 };
        this.goal = { x: 9, y: 9 };
        this.enemies = [{ x: 4, y: 4, dx: 1, dy: 0 }];
        this.generateMaze();
        this.draw();

        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            this.moveEnemies();
            this.draw();
        }, 1000);

        this.keydownHandler = (e) => this.handleKeydown(e);
        document.addEventListener("keydown", this.keydownHandler);
    },

    shutdown: function() {
        if (this.interval) clearInterval(this.interval);
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
        }
    },

    generateMaze: function() {
        this.maze = Array.from({ length: this.rows }, () => Array(this.cols).fill(1));
        const carvePath = (x, y) => {
            let directions = [[0, -1], [0, 1], [-1, 0], [1, 0]].sort(() => Math.random() - 0.5);
            for (let [dx, dy] of directions) {
                let nx = x + dx * 2, ny = y + dy * 2;
                if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.maze[ny][nx] === 1) {
                    this.maze[y + dy][x + dx] = 0;
                    this.maze[ny][nx] = 0;
                    carvePath(nx, ny);
                }
            }
        }
        this.maze[0][0] = 0;
        this.maze[9][9] = 0;
        carvePath(0, 0);
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.ctx.fillStyle = this.maze[y][x] === 1 ? '#ff00ff' : 'black';
                this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
            }
        }
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillRect(this.goal.x * this.tileSize, this.goal.y * this.tileSize, this.tileSize, this.tileSize);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(this.player.x * this.tileSize, this.player.y * this.tileSize, this.tileSize, this.tileSize);
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = '#ff4500';
            this.ctx.fillRect(enemy.x * this.tileSize, enemy.y * this.tileSize, this.tileSize, this.tileSize);
        });
    },

    movePlayer: function(dx, dy) {
        let nx = this.player.x + dx, ny = this.player.y + dy;
        if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.maze[ny][nx] === 0) {
            this.player.x = nx;
            this.player.y = ny;
            if (this.player.x === this.goal.x && this.player.y === this.goal.y) {
                alert("🏆 You Won!");
                this.init();
            }
        }
    },

    moveEnemies: function() {
        this.enemies.forEach(enemy => {
            let direction = Math.random() > 0.5 ? [1, 0] : [0, 1];
            let nx = enemy.x + direction[0], ny = enemy.y + direction[1];
            if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.maze[ny][nx] === 0) {
                enemy.x = nx;
                enemy.y = ny;
            }
            if (enemy.x === this.player.x && enemy.y === this.player.y) {
                alert("💀 You Got Caught! Try Again.");
                this.init();
            }
        });
    },

    handleKeydown: function(e) {
        if (e.key === "ArrowUp") this.movePlayer(0, -1);
        if (e.key === "ArrowDown") this.movePlayer(0, 1);
        if (e.key === "ArrowLeft") this.movePlayer(-1, 0);
        if (e.key === "ArrowRight") this.movePlayer(1, 0);
    }
};
