export default {
    canvas: null,
    ctx: null,
    tileSize: 40,
    rows: 10,
    cols: 10,
    maze: [],
    player: { x: 0, y: 0 },
    goal: { x: 9, y: 9 },
    enemies: [],
    interval: null,
    keydownHandler: null,

    init: function() {
        this.canvas = document.getElementById("mazeCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.player = { x: 0, y: 0 };
        this.goal = { x: 9, y: 9 };
        this.enemies = [{ x: 4, y: 4, dx: 1, dy: 0 }, { x: 6, y: 2, dx: 0, dy: 1 }];
        this.generateMaze();
        this.draw();

        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            this.moveEnemies();
            this.draw();
        }, 500); // Faster enemies

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

        // Draw BG
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(0,0,400,400);

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.maze[y][x] === 1) {
                    this.ctx.fillStyle = '#64748b'; // Wall color
                    this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);

                    // Highlight
                    this.ctx.strokeStyle = '#94a3b8';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                }
            }
        }

        // Goal
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.fillRect(this.goal.x * this.tileSize + 5, this.goal.y * this.tileSize + 5, this.tileSize - 10, this.tileSize - 10);

        // Player
        this.ctx.fillStyle = '#3b82f6';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x * this.tileSize + this.tileSize/2, this.player.y * this.tileSize + this.tileSize/2, this.tileSize/3, 0, Math.PI*2);
        this.ctx.fill();

        // Enemies
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = '#ef4444';
            this.ctx.beginPath();
            this.ctx.arc(enemy.x * this.tileSize + this.tileSize/2, enemy.y * this.tileSize + this.tileSize/2, this.tileSize/3, 0, Math.PI*2);
            this.ctx.fill();
        });
    },

    movePlayer: function(dx, dy) {
        let nx = this.player.x + dx, ny = this.player.y + dy;
        if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.maze[ny][nx] === 0) {
            this.player.x = nx;
            this.player.y = ny;
            if(window.soundManager) window.soundManager.playSound('click');

            if (this.player.x === this.goal.x && this.player.y === this.goal.y) {
                if(window.soundManager) window.soundManager.playTone(800, 'sine', 0.5, true);
                alert("🏆 You Won!");
                this.init();
            }
        } else {
            // Wall hit
            if(window.soundManager) window.soundManager.playTone(150, 'sawtooth', 0.1);
        }
    },

    moveEnemies: function() {
        this.enemies.forEach(enemy => {
            // Simple random movement
            let dirs = [[0,1], [0,-1], [1,0], [-1,0]];
            let validDirs = dirs.filter(([dx, dy]) => {
                let nx = enemy.x + dx, ny = enemy.y + dy;
                return nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.maze[ny][nx] === 0;
            });

            if (validDirs.length > 0) {
                let [dx, dy] = validDirs[Math.floor(Math.random() * validDirs.length)];
                enemy.x += dx;
                enemy.y += dy;
            }

            if (enemy.x === this.player.x && enemy.y === this.player.y) {
                if(window.soundManager) window.soundManager.playSound('gameover');
                alert("💀 You Got Caught! Try Again.");
                this.init();
            }
        });
    },

    handleKeydown: function(e) {
        if (e.key === "ArrowUp") { this.movePlayer(0, -1); e.preventDefault(); }
        if (e.key === "ArrowDown") { this.movePlayer(0, 1); e.preventDefault(); }
        if (e.key === "ArrowLeft") { this.movePlayer(-1, 0); e.preventDefault(); }
        if (e.key === "ArrowRight") { this.movePlayer(1, 0); e.preventDefault(); }
    }
};
