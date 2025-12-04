import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

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
        this.inputCooldown = 0;
        this.active = false;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
    }

    init(container) {
        let canvas = container.querySelector('#mazeCanvas');
        if (!canvas) {
            container.innerHTML = `
                <h2>🌀 Maze Game</h2>
                <div class="relative">
                    <canvas id="mazeCanvas" width="400" height="400" class="border-2 border-fuchsia-500 rounded-lg bg-black"></canvas>
                </div>
                <p class="mt-4 text-slate-300">Use <b>Arrow Keys</b> to navigate. Avoid red enemies.</p>
                <button class="back-btn mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Back</button>
            `;
            canvas = container.querySelector('#mazeCanvas');
             container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.active = true;
        this.resetGame();
    }

    resetGame() {
        this.player = { x: 0, y: 0 };
        this.goal = { x: 9, y: 9 };
        this.enemies = [{ x: 4, y: 4 }, { x: 6, y: 2 }];
        this.generateMaze();
        this.enemyMoveTimer = 0;
        this.active = true;
    }

    shutdown() {
        this.active = false;
    }

    generateMaze() {
        this.maze = Array.from({ length: this.rows }, () => Array(this.cols).fill(1));
        const stack = [{x: 0, y: 0}];
        this.maze[0][0] = 0;

        const carvePath = (x, y) => {
            const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]].sort(() => Math.random() - 0.5);
            for (let [dx, dy] of directions) {
                const nx = x + dx * 2, ny = y + dy * 2;
                if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && this.maze[ny][nx] === 1) {
                    this.maze[y + dy][x + dx] = 0;
                    this.maze[ny][nx] = 0;
                    carvePath(nx, ny);
                }
            }
        };

        this.maze[0][0] = 0;
        carvePath(0, 0);
        this.maze[9][9] = 0;

        if (this.maze[8][9] === 1 && this.maze[9][8] === 1) {
            this.maze[8][9] = 0;
        }
    }

    update(dt) {
        if (!this.active) return;

        if (this.inputCooldown > 0) this.inputCooldown -= dt;
        else {
            let moved = false;
            if (this.inputManager.isKeyDown("ArrowUp")) { this.movePlayer(0, -1); moved = true; }
            else if (this.inputManager.isKeyDown("ArrowDown")) { this.movePlayer(0, 1); moved = true; }
            else if (this.inputManager.isKeyDown("ArrowLeft")) { this.movePlayer(-1, 0); moved = true; }
            else if (this.inputManager.isKeyDown("ArrowRight")) { this.movePlayer(1, 0); moved = true; }

            if (moved) this.inputCooldown = 0.15;
        }

        this.enemyMoveTimer += dt;
        if (this.enemyMoveTimer > 0.5) {
            this.moveEnemies();
            this.enemyMoveTimer = 0;
        }

        this.particleSystem.update(dt);
    }

    movePlayer(dx, dy) {
        let nx = this.player.x + dx, ny = this.player.y + dy;
        if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.maze[ny][nx] === 0) {
            this.player.x = nx;
            this.player.y = ny;
            this.soundManager.playSound('click');
            this.particleSystem.emit(this.player.x * this.tileSize + 20, this.player.y * this.tileSize + 20, '#00ffff', 5);

            if (this.player.x === this.goal.x && this.player.y === this.goal.y) {
                this.winGame();
            }
        }
    }

    moveEnemies() {
        this.enemies.forEach(enemy => {
            let directions = [[0,1], [0,-1], [1,0], [-1,0]];
            let valid = directions.filter(([dx, dy]) => {
                let nx = enemy.x + dx, ny = enemy.y + dy;
                return nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && this.maze[ny][nx] === 0;
            });

            if (valid.length > 0) {
                let dir = valid[Math.floor(Math.random() * valid.length)];
                enemy.x += dir[0];
                enemy.y += dir[1];
            }

            if (enemy.x === this.player.x && enemy.y === this.player.y) {
                this.loseGame();
            }
        });
    }

    winGame() {
        this.soundManager.playSound('score');
        this.particleSystem.emit(this.goal.x * this.tileSize + 20, this.goal.y * this.tileSize + 20, '#fbbf24', 50);
        this.active = false;

        setTimeout(() => {
             if (window.miniGameHub && window.miniGameHub.showGameOver) {
                // Show a "Success" overlay by hacking score display or just creating a generic showGameOver with score
                window.miniGameHub.showGameOver(100, () => this.resetGame());
            }
        }, 500);
    }

    loseGame() {
        this.soundManager.playSound('explosion');
        this.particleSystem.emit(this.player.x * this.tileSize + 20, this.player.y * this.tileSize + 20, '#ff0000', 30);
        this.active = false;

         setTimeout(() => {
             if (window.miniGameHub && window.miniGameHub.showGameOver) {
                window.miniGameHub.showGameOver(0, () => this.resetGame());
            }
        }, 500);
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.maze[y][x] === 1) {
                    this.ctx.fillStyle = '#c026d3';
                    this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);

                    this.ctx.lineWidth = 2;
                    this.ctx.strokeStyle = '#e879f9';
                    this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                }
            }
        }

        // Goal
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.fillRect(this.goal.x * this.tileSize + 10, this.goal.y * this.tileSize + 10, this.tileSize - 20, this.tileSize - 20);

        // Player
        this.ctx.shadowColor = '#00ffff';
        this.ctx.fillStyle = '#00ffff';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x * this.tileSize + this.tileSize/2, this.player.y * this.tileSize + this.tileSize/2, this.tileSize/3, 0, Math.PI*2);
        this.ctx.fill();

        // Enemies
        this.ctx.shadowColor = '#ef4444';
        this.ctx.fillStyle = '#ef4444';
        this.enemies.forEach(enemy => {
            this.ctx.beginPath();
            this.ctx.arc(enemy.x * this.tileSize + this.tileSize/2, enemy.y * this.tileSize + this.tileSize/2, this.tileSize/3, 0, Math.PI*2);
            this.ctx.fill();
        });

        this.ctx.shadowBlur = 0;

        this.particleSystem.draw(this.ctx);
    }
}
