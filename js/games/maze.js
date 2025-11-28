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
import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';

export default class MazeGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.tileSize = 40;
        this.rows = 10;
        this.cols = 10;
        this.maze = [];
        this.player = { x: 0, y: 0 };
        this.goal = { x: 9, y: 9 };
        this.enemies = [];
        this.enemyMoveTimer = 0;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
    }

    init(container) {
        this.canvas = document.getElementById("mazeCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.resetGame();
    }

    resetGame() {
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
        this.enemyMoveTimer = 0;
    }

    shutdown() { }

    generateMaze() {
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
        };
        this.maze[0][0] = 0;
        this.maze[9][9] = 0;
        carvePath(0, 0);
    }

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
    update(dt) {
        // Player Input (Simple debounce or single press check needed)
        // Since update runs every frame, we need a way to move only once per keypress
        // But InputManager just says "isKeyDown".
        // Let's use a simple cooldown for movement
        if (!this.inputCooldown) this.inputCooldown = 0;

        if (this.inputCooldown <= 0) {
            let moved = false;
            if (this.inputManager.isKeyDown("ArrowUp")) { this.movePlayer(0, -1); moved = true; }
            else if (this.inputManager.isKeyDown("ArrowDown")) { this.movePlayer(0, 1); moved = true; }
            else if (this.inputManager.isKeyDown("ArrowLeft")) { this.movePlayer(-1, 0); moved = true; }
            else if (this.inputManager.isKeyDown("ArrowRight")) { this.movePlayer(1, 0); moved = true; }

            if (moved) this.inputCooldown = 0.15; // 150ms cooldown
        } else {
            this.inputCooldown -= dt;
        }

        // Enemy Movement
        this.enemyMoveTimer += dt;
        if (this.enemyMoveTimer > 1.0) {
            this.moveEnemies();
            this.enemyMoveTimer = 0;
        }
    }

    movePlayer(dx, dy) {
        let nx = this.player.x + dx, ny = this.player.y + dy;
        if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.maze[ny][nx] === 0) {
            this.player.x = nx;
            this.player.y = ny;
            if(window.soundManager) window.soundManager.playSound('click');

            if (this.player.x === this.goal.x && this.player.y === this.goal.y) {
                if(window.soundManager) window.soundManager.playTone(800, 'sine', 0.5, true);
                alert("🏆 You Won!");
                this.init();
            this.soundManager.playSound('click');

            if (this.player.x === this.goal.x && this.player.y === this.goal.y) {
                this.soundManager.playSound('score');
                alert("🏆 You Won!"); // Replace with better UI? For now, stick to simple.
                this.resetGame();
            }
        } else {
            // Wall hit
            if(window.soundManager) window.soundManager.playTone(150, 'sawtooth', 0.1);
        }
    }

    moveEnemies() {
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
            let directions = [[0,1], [0,-1], [1,0], [-1,0]];
            let dir = directions[Math.floor(Math.random() * directions.length)];
            let nx = enemy.x + dir[0], ny = enemy.y + dir[1];

            if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.maze[ny][nx] === 0) {
                enemy.x = nx;
                enemy.y = ny;
            }

            if (enemy.x === this.player.x && enemy.y === this.player.y) {
                if(window.soundManager) window.soundManager.playSound('gameover');
                alert("💀 You Got Caught! Try Again.");
                this.init();
                this.soundManager.playSound('explosion');
                alert("💀 You Got Caught!");
                this.resetGame();
            }
        });
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    handleKeydown: function(e) {
        if (e.key === "ArrowUp") { this.movePlayer(0, -1); e.preventDefault(); }
        if (e.key === "ArrowDown") { this.movePlayer(0, 1); e.preventDefault(); }
        if (e.key === "ArrowLeft") { this.movePlayer(-1, 0); e.preventDefault(); }
        if (e.key === "ArrowRight") { this.movePlayer(1, 0); e.preventDefault(); }
        // Draw Maze
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.maze[y][x] === 1) {
                    this.ctx.shadowBlur = 5;
                    this.ctx.shadowColor = '#ff00ff';
                    this.ctx.fillStyle = '#ff00ff';
                    this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                    this.ctx.shadowBlur = 0;
                }
            }
        }

        // Goal
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillRect(this.goal.x * this.tileSize, this.goal.y * this.tileSize, this.tileSize, this.tileSize);

        // Player
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(this.player.x * this.tileSize + 5, this.player.y * this.tileSize + 5, this.tileSize - 10, this.tileSize - 10);

        // Enemies
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = '#ff4500';
            this.ctx.fillRect(enemy.x * this.tileSize + 5, enemy.y * this.tileSize + 5, this.tileSize - 10, this.tileSize - 10);
        });
    }
}
