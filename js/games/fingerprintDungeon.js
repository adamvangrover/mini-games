import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';

export default class FingerprintDungeon {
    constructor() {
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        // Configuration
        this.fontSize = 20;
        this.fontFamily = 'monospace';
        this.cols = 0;
        this.rows = 0;

        // Game State
        this.seed = 0;
        this.map = []; // 2D array: 0=Wall, 1=Floor
        this.entities = []; // Array of objects {x, y, type, hp, ...}
        this.player = { x: 0, y: 0, hp: 100, maxHp: 100, level: 1, xp: 0 };
        this.level = 1;
        this.theme = { bg: '#000', fg: '#fff', dim: '#444' };

        // Loop
        this.lastInputTime = 0;
        this.inputDelay = 150; // ms between moves
    }

    async init(container) {
        this.container = container;
        this.isActive = true;
        this.entities = [];
        this.level = 1;

        // Setup UI
        this.container.innerHTML = `
            <div class="relative w-full h-full bg-black overflow-hidden flex flex-col items-center justify-center">
                <!-- Canvas Layer -->
                <canvas id="fp-canvas" class="absolute inset-0 z-0"></canvas>

                <!-- HUD Overlay -->
                <div class="absolute top-4 left-4 z-10 font-mono text-white text-sm bg-black/80 p-2 border border-slate-700 rounded pointer-events-none select-none">
                    <div class="font-bold text-green-400">IDENTITY: <span id="fp-identity" class="text-white">...</span></div>
                    <div class="mt-2">HP: <span id="fp-hp" class="text-red-400">100/100</span></div>
                    <div>LVL: <span id="fp-lvl" class="text-yellow-400">1</span></div>
                    <div>FLOOR: <span id="fp-floor" class="text-cyan-400">1</span></div>
                </div>

                <!-- Controls Hint -->
                <div class="absolute bottom-4 right-4 z-10 font-mono text-slate-500 text-xs pointer-events-none select-none">
                    WASD / ARROWS to Move
                </div>
            </div>
        `;

        this.canvas = this.container.querySelector('#fp-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Generate Identity
        this.seed = this.generateIdentitySeed();
        this.setupTheme();

        // Initial Resize & Gen
        this.handleResize();
        window.addEventListener('resize', this.handleResizeBound = () => this.handleResize());

        // Start Loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    generateIdentitySeed() {
        const ua = navigator.userAgent;
        const lang = navigator.language;
        const cores = navigator.hardwareConcurrency || 2;
        const str = `${ua}-${lang}-${cores}`;

        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }

        const identityEl = document.getElementById('fp-identity');
        if (identityEl) {
            identityEl.textContent = `0x${Math.abs(hash).toString(16).toUpperCase()}`;
        }

        return Math.abs(hash);
    }

    setupTheme() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 18) {
            // Day Theme (Terminal Green)
            this.theme = { bg: '#0d1117', fg: '#4ade80', dim: '#14532d', enemy: '#ef4444' };
        } else {
            // Night Theme (Cyber Blue/Purple)
            this.theme = { bg: '#020617', fg: '#a855f7', dim: '#3b0764', enemy: '#f59e0b' };
        }

        // Battery Check (Async) - Affects brightness/fog?
        if (navigator.getBattery) {
            navigator.getBattery().then(bat => {
                if (bat.level < 0.2) {
                    this.theme.dim = '#000'; // Hard mode visibility
                }
            });
        }
    }

    handleResize() {
        if (!this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;

        this.cols = Math.floor(this.canvas.width / (this.fontSize * 0.6)); // Width of monospace char is approx 0.6em
        this.rows = Math.floor(this.canvas.height / this.fontSize);

        this.generateLevel();
    }

    // Pseudo-random based on seed
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    generateLevel() {
        // Reset Map
        this.map = Array(this.rows).fill().map(() => Array(this.cols).fill(0)); // 0 = Wall
        this.entities = [];

        // Simple Random Walk / Digger
        let x = Math.floor(this.cols / 2);
        let y = Math.floor(this.rows / 2);
        this.player.x = x;
        this.player.y = y;

        let floors = 0;
        const targetFloors = Math.floor(this.cols * this.rows * 0.4); // 40% fill

        // "Digger" logic
        let diggerSeed = this.seed + this.level * 1000; // Vary per level
        const random = () => {
            diggerSeed = (diggerSeed * 9301 + 49297) % 233280;
            return diggerSeed / 233280;
        };

        let steps = 0;
        const maxSteps = targetFloors * 5;

        while (floors < targetFloors && steps < maxSteps) {
            steps++;
            // Carve
            if (this.map[y][x] === 0) {
                this.map[y][x] = 1;
                floors++;
            }

            // Move Digger
            const dir = Math.floor(random() * 4);
            if (dir === 0 && y > 1) y--;
            else if (dir === 1 && y < this.rows - 2) y++;
            else if (dir === 2 && x > 1) x--;
            else if (dir === 3 && x < this.cols - 2) x++;
        }

        // Place Exit
        let placedExit = false;
        while (!placedExit) {
            const ex = Math.floor(random() * this.cols);
            const ey = Math.floor(random() * this.rows);
            if (this.map[ey][ex] === 1 && (Math.abs(ex - this.player.x) > 10 || Math.abs(ey - this.player.y) > 10)) {
                this.entities.push({ x: ex, y: ey, type: 'exit', char: '>' });
                placedExit = true;
            }
        }

        // Place Enemies
        // Count depends on Hardware Concurrency (More cores = More enemies)
        const enemyCount = (navigator.hardwareConcurrency || 2) * 2 + this.level;
        const isChrome = navigator.userAgent.indexOf("Chrome") > -1;
        const enemyChar = isChrome ? 'R' : 'E'; // Robot or Entity
        const enemyName = isChrome ? 'Chrome Bot' : 'Wild Process';

        for (let i = 0; i < enemyCount; i++) {
            const ex = Math.floor(random() * this.cols);
            const ey = Math.floor(random() * this.rows);
            if (this.map[ey][ex] === 1 && (ex !== this.player.x || ey !== this.player.y)) {
                this.entities.push({
                    x: ex, y: ey,
                    type: 'enemy',
                    char: enemyChar,
                    name: enemyName,
                    hp: 20 + (this.level * 5),
                    maxHp: 20 + (this.level * 5)
                });
            }
        }

        // Place Loot (Memory Segments)
        const lootCount = 5;
        for (let i = 0; i < lootCount; i++) {
            const lx = Math.floor(random() * this.cols);
            const ly = Math.floor(random() * this.rows);
            if (this.map[ly][lx] === 1) {
                this.entities.push({ x: lx, y: ly, type: 'loot', char: '$' });
            }
        }

        this.draw();
        this.updateHUD();
    }

    gameLoop(timestamp) {
        if (!this.isActive) return;

        // Input Handling
        if (timestamp - this.lastInputTime > this.inputDelay) {
            let dx = 0;
            let dy = 0;

            if (this.inputManager.isKeyDown('ArrowUp') || this.inputManager.isKeyDown('KeyW')) dy = -1;
            else if (this.inputManager.isKeyDown('ArrowDown') || this.inputManager.isKeyDown('KeyS')) dy = 1;
            else if (this.inputManager.isKeyDown('ArrowLeft') || this.inputManager.isKeyDown('KeyA')) dx = -1;
            else if (this.inputManager.isKeyDown('ArrowRight') || this.inputManager.isKeyDown('KeyD')) dx = 1;

            if (dx !== 0 || dy !== 0) {
                this.handleMove(dx, dy);
                this.lastInputTime = timestamp;
            }
        }

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleMove(dx, dy) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        // Bounds Check
        if (newX < 0 || newX >= this.cols || newY < 0 || newY >= this.rows) return;

        // Wall Check
        if (this.map[newY][newX] === 0) {
            this.soundManager.playSound('click'); // Bump sound
            return;
        }

        // Entity Check
        const targetEntity = this.entities.find(e => e.x === newX && e.y === newY);
        if (targetEntity) {
            if (targetEntity.type === 'enemy') {
                this.combat(targetEntity);
                return; // Attack consumes turn, don't move
            } else if (targetEntity.type === 'loot') {
                this.soundManager.playSound('coin');
                this.entities = this.entities.filter(e => e !== targetEntity);
                this.player.xp += 10;
                // Add score/cash via SaveSystem
                // this.saveSystem.addCurrency(5);
            } else if (targetEntity.type === 'exit') {
                this.nextLevel();
                return;
            }
        }

        // Move
        this.player.x = newX;
        this.player.y = newY;
        this.draw();

        // Enemy Turn
        this.processEnemies();
    }

    combat(enemy) {
        const dmg = Math.floor(Math.random() * 5) + 5;
        enemy.hp -= dmg;
        this.soundManager.playSound('hit'); // Need hit sound, using click fallback or explosion

        // Floating text effect on canvas? Maybe later.

        if (enemy.hp <= 0) {
            this.entities = this.entities.filter(e => e !== enemy);
            this.player.xp += 20;
            this.soundManager.playSound('score');
        } else {
            // Enemy counter-attack immediately?
            // Usually enemies move/attack on their turn.
        }

        this.draw();
        this.processEnemies();
        this.updateHUD();
    }

    processEnemies() {
        this.entities.forEach(e => {
            if (e.type !== 'enemy') return;

            // Simple tracking
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.abs(dx) + Math.abs(dy);

            if (dist === 1) {
                // Attack Player
                const dmg = Math.floor(Math.random() * 3) + 1;
                this.player.hp -= dmg;
                this.soundManager.playSound('explosion'); // Hit sound
                if (this.player.hp <= 0) {
                    this.gameOver();
                }
            } else if (dist < 10) {
                // Move towards
                const moveX = dx !== 0 ? (dx > 0 ? 1 : -1) : 0;
                const moveY = dy !== 0 ? (dy > 0 ? 1 : -1) : 0;

                // Try X first
                if (moveX !== 0 && this.map[e.y][e.x + moveX] === 1 && !this.isOccupied(e.x + moveX, e.y)) {
                    e.x += moveX;
                } else if (moveY !== 0 && this.map[e.y + moveY][e.x] === 1 && !this.isOccupied(e.x, e.y + moveY)) {
                    e.y += moveY;
                }
            }
        });

        this.updateHUD();
        this.draw();
    }

    isOccupied(x, y) {
        if (x === this.player.x && y === this.player.y) return true;
        return this.entities.some(e => e.x === x && e.y === y);
    }

    nextLevel() {
        this.level++;
        this.soundManager.playSound('ui_unlock');
        this.generateLevel();
        this.updateHUD();
    }

    updateHUD() {
        if (!this.container) return;
        this.container.querySelector('#fp-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
        this.container.querySelector('#fp-lvl').textContent = this.level;
        this.container.querySelector('#fp-floor').textContent = this.level; // Same as level for now
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const charW = this.fontSize * 0.6;
        const charH = this.fontSize;

        // Clear
        ctx.fillStyle = this.theme.bg;
        ctx.fillRect(0, 0, w, h);

        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textBaseline = 'top';

        // Visibility / Fog (Simple distance check)
        // Optimization: Only iterate visible range
        const range = 15;
        const startX = Math.max(0, this.player.x - range);
        const endX = Math.min(this.cols, this.player.x + range);
        const startY = Math.max(0, this.player.y - range);
        const endY = Math.min(this.rows, this.player.y + range);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const dist = Math.sqrt((x - this.player.x)**2 + (y - this.player.y)**2);
                if (dist > range) continue;

                // Draw Floor/Wall
                if (this.map[y][x] === 1) {
                    ctx.fillStyle = this.theme.dim;
                    ctx.fillText('.', x * charW, y * charH);
                } else if (this.map[y][x] === 0) {
                    // Only draw visible walls (neighbors floor)
                    // Optimization skipped for brevity, drawing all walls in range
                    ctx.fillStyle = '#333';
                    ctx.fillText('#', x * charW, y * charH);
                }
            }
        }

        // Entities
        this.entities.forEach(e => {
            const dist = Math.sqrt((e.x - this.player.x)**2 + (e.y - this.player.y)**2);
            if (dist > range) return;

            if (e.type === 'enemy') ctx.fillStyle = this.theme.enemy;
            else if (e.type === 'loot') ctx.fillStyle = '#fbbf24'; // Gold
            else if (e.type === 'exit') ctx.fillStyle = '#fff';

            ctx.fillText(e.char, e.x * charW, e.y * charH);
        });

        // Player
        ctx.fillStyle = '#fff';
        ctx.fillText('@', this.player.x * charW, this.player.y * charH);
    }

    gameOver() {
        this.isActive = false;
        if (window.miniGameHub) {
            window.miniGameHub.showGameOver(this.level * 100 + this.player.xp, () => this.init(this.container));
        }
    }

    shutdown() {
        this.isActive = false;
        if (this.handleResizeBound) window.removeEventListener('resize', this.handleResizeBound);
        this.container.innerHTML = '';
    }
}
