import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class TowerDefenseGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gridSize = 40;
        this.map = [];
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.wave = 1;
        this.money = 100;
        this.lives = 10;
        this.spawnTimer = 0;
        this.enemiesToSpawn = 0;

        this.path = [
            {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}, {x: 3, y: 2},
            {x: 3, y: 3}, {x: 3, y: 4}, {x: 4, y: 4}, {x: 5, y: 4},
            {x: 6, y: 4}, {x: 6, y: 3}, {x: 6, y: 2}, {x: 6, y: 1},
            {x: 7, y: 1}, {x: 8, y: 1}, {x: 9, y: 1}, {x: 9, y: 2},
            {x: 9, y: 3}, {x: 9, y: 4}, {x: 9, y: 5}, {x: 10, y: 5}
        ];

        this.selectedTowerType = 'archer'; // archer, cannon, ice

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
    }

    init(container) {
        // Create UI and Canvas dynamically or expect it in container
        // For simplicity, we'll create elements here if container is provided
        container.innerHTML = `
            <h2>🏰 Tower Defense Lite</h2>
            <canvas id="tdCanvas" width="600" height="400"></canvas>
            <div id="td-ui" style="color: white; font-family: monospace; margin-top: 10px;">
                <span>Lives: <span id="td-lives">10</span></span> |
                <span>Money: $<span id="td-money">100</span></span> |
                <span>Wave: <span id="td-wave">1</span></span>
            </div>
            <div id="td-controls" style="margin-top: 10px;">
                <button id="btn-archer" class="td-btn selected">Archer ($50)</button>
                <button id="btn-cannon" class="td-btn">Cannon ($100)</button>
                <button id="btn-ice" class="td-btn">Ice ($75)</button>
                <button id="btn-next-wave" class="td-btn" style="background: #2ecc71;">Start Wave</button>
            </div>
            <button class="back-btn">Back</button>
        `;

        // Add style for buttons locally if not in global CSS
        const style = document.createElement('style');
        style.textContent = `
            .td-btn { background: #333; color: white; border: 1px solid #555; padding: 5px 10px; cursor: pointer; }
            .td-btn.selected { border-color: #00ffff; color: #00ffff; }
        `;
        container.appendChild(style);

        this.canvas = document.getElementById("tdCanvas");
        this.ctx = this.canvas.getContext("2d");

        // Bind UI
        document.getElementById('btn-archer').onclick = () => this.selectTower('archer');
        document.getElementById('btn-cannon').onclick = () => this.selectTower('cannon');
        document.getElementById('btn-ice').onclick = () => this.selectTower('ice');
        document.getElementById('btn-next-wave').onclick = () => this.startWave();

        container.querySelector('.back-btn').addEventListener('click', () => {
             // Logic handled by main.js but we need to propagate or ensure it bubbles
             window.miniGameHub.goBack();
        });

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        this.resetGame();
    }

    resetGame() {
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.wave = 1;
        this.money = 150;
        this.lives = 10;
        this.enemiesToSpawn = 0;
        this.updateUI();
    }

    selectTower(type) {
        this.selectedTowerType = type;
        document.querySelectorAll('.td-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById(`btn-${type}`).classList.add('selected');
    }

    startWave() {
        if (this.enemiesToSpawn > 0 || this.enemies.length > 0) return; // Wave in progress
        this.enemiesToSpawn = 5 + this.wave * 2;
        this.spawnTimer = 0;
        this.wave++;
        this.updateUI();
    }

    shutdown() {
        // Cleanup listeners if added to window
    }

    update(dt) {
        // Spawning
        if (this.enemiesToSpawn > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                this.spawnTimer = 1.0; // Spawn every second
                this.enemiesToSpawn--;
            }
        }

        // Update Enemies
        this.enemies.forEach(e => {
            // Move along path
            const target = this.path[e.pathIndex];
            const tx = target.x * this.gridSize + this.gridSize/2;
            const ty = target.y * this.gridSize + this.gridSize/2;

            const dx = tx - e.x;
            const dy = ty - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Apply speed (affected by slow)
            const speed = e.speed * (e.frozen > 0 ? 0.5 : 1);
            if (e.frozen > 0) e.frozen -= dt;

            if (dist < speed * dt) {
                e.x = tx;
                e.y = ty;
                e.pathIndex++;
                if (e.pathIndex >= this.path.length) {
                    e.reachedEnd = true;
                    this.lives--;
                    this.soundManager.playSound('explosion'); // life lost sound
                    this.updateUI();
                }
            } else {
                e.x += (dx / dist) * speed * dt;
                e.y += (dy / dist) * speed * dt;
            }
        });

        this.enemies = this.enemies.filter(e => !e.reachedEnd && e.hp > 0);
        if (this.lives <= 0) {
            alert("Game Over!");
            this.resetGame();
        }

        // Towers Fire
        this.towers.forEach(t => {
            t.cooldown -= dt;
            if (t.cooldown <= 0) {
                const target = this.findTarget(t);
                if (target) {
                    this.fireProjectile(t, target);
                    t.cooldown = t.fireRate;
                }
            }
        });

        // Projectiles
        this.projectiles.forEach(p => {
            const dx = p.target.x - p.x;
            const dy = p.target.y - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < p.speed * dt) {
                this.hitEnemy(p.target, p);
                p.active = false;
            } else {
                p.x += (dx / dist) * p.speed * dt;
                p.y += (dy / dist) * p.speed * dt;
            }
        });
        this.projectiles = this.projectiles.filter(p => p.active && p.target.hp > 0); // Remove if target dead or hit

        this.particleSystem.update(dt);
    }

    spawnEnemy() {
        // Logic for stronger enemies based on wave
        const hp = 20 + (this.wave * 5);
        this.enemies.push({
            x: this.path[0].x * this.gridSize + this.gridSize/2,
            y: this.path[0].y * this.gridSize + this.gridSize/2,
            pathIndex: 1,
            hp: hp,
            maxHp: hp,
            speed: 60,
            frozen: 0,
            color: '#e74c3c'
        });
    }

    findTarget(tower) {
        // Find closest enemy in range
        let closest = null;
        let minDist = tower.range;

        this.enemies.forEach(e => {
            const dx = e.x - tower.x;
            const dy = e.y - tower.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist) {
                closest = e;
                minDist = dist;
            }
        });
        return closest;
    }

    fireProjectile(tower, target) {
        this.projectiles.push({
            x: tower.x,
            y: tower.y,
            target: target,
            speed: 300,
            damage: tower.damage,
            type: tower.type,
            active: true
        });
        this.soundManager.playSound('shoot');
    }

    hitEnemy(enemy, projectile) {
        enemy.hp -= projectile.damage;
        if (projectile.type === 'ice') {
            enemy.frozen = 2.0; // Slow for 2s
        }
        if (projectile.type === 'cannon') {
            // AOE Logic could go here
            this.particleSystem.emit(this.ctx, enemy.x, enemy.y, '#ffaa00', 5);
        } else {
            this.particleSystem.emit(this.ctx, enemy.x, enemy.y, '#ffffff', 3);
        }

        if (enemy.hp <= 0) {
            this.money += 10;
            this.soundManager.playSound('score');
            this.updateUI();
        }
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const gx = Math.floor(mx / this.gridSize);
        const gy = Math.floor(my / this.gridSize);

        // Check bounds
        if (gx < 0 || gx >= 15 || gy < 0 || gy >= 10) return;

        // Check path collision
        // (Simple check: is this grid cell in the path?)
        const onPath = this.path.some(p => p.x === gx && p.y === gy);
        if (onPath) return;

        // Check existing tower
        const existing = this.towers.find(t => t.gx === gx && t.gy === gy);
        if (existing) return;

        // Buy Tower
        const costs = { 'archer': 50, 'cannon': 100, 'ice': 75 };
        const cost = costs[this.selectedTowerType];

        if (this.money >= cost) {
            this.money -= cost;
            this.updateUI();
            this.addTower(gx, gy, this.selectedTowerType);
        } else {
            // Not enough money feedback
        }
    }

    addTower(gx, gy, type) {
        const stats = {
            'archer': { range: 100, fireRate: 0.5, damage: 10, color: '#3498db' },
            'cannon': { range: 100, fireRate: 1.5, damage: 30, color: '#2c3e50' },
            'ice': { range: 80, fireRate: 1.0, damage: 5, color: '#74b9ff' }
        };

        this.towers.push({
            gx: gx, gy: gy,
            x: gx * this.gridSize + this.gridSize/2,
            y: gy * this.gridSize + this.gridSize/2,
            type: type,
            ...stats[type],
            cooldown: 0
        });
        this.soundManager.playSound('click');
        this.particleSystem.emit(this.ctx, gx*this.gridSize + this.gridSize/2, gy*this.gridSize + this.gridSize/2, '#ffffff', 10);
    }

    updateUI() {
        document.getElementById('td-lives').textContent = this.lives;
        document.getElementById('td-money').textContent = this.money;
        document.getElementById('td-wave').textContent = this.wave - 1;
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        for(let i=0; i<this.canvas.width; i+=this.gridSize) {
            this.ctx.beginPath(); this.ctx.moveTo(i,0); this.ctx.lineTo(i, this.canvas.height); this.ctx.stroke();
        }
        for(let i=0; i<this.canvas.height; i+=this.gridSize) {
            this.ctx.beginPath(); this.ctx.moveTo(0,i); this.ctx.lineTo(this.canvas.width, i); this.ctx.stroke();
        }

        // Path
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.path.forEach(p => {
            this.ctx.fillRect(p.x * this.gridSize, p.y * this.gridSize, this.gridSize, this.gridSize);
        });

        // Towers
        this.towers.forEach(t => {
            this.ctx.fillStyle = t.color;
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, 15, 0, Math.PI*2);
            this.ctx.fill();
            // Turret barrel
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(t.x, t.y);
            // Ideally point to target, for now fixed
            this.ctx.lineTo(t.x, t.y - 20);
            this.ctx.stroke();
        });

        // Enemies
        this.enemies.forEach(e => {
            this.ctx.fillStyle = e.color;
            if (e.frozen > 0) this.ctx.fillStyle = '#74b9ff';
            this.ctx.beginPath();
            this.ctx.arc(e.x, e.y, 10, 0, Math.PI*2);
            this.ctx.fill();

            // HP Bar
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(e.x - 10, e.y - 15, 20, 4);
            this.ctx.fillStyle = 'green';
            this.ctx.fillRect(e.x - 10, e.y - 15, 20 * (e.hp / e.maxHp), 4);
        });

        // Projectiles
        this.projectiles.forEach(p => {
            this.ctx.fillStyle = 'yellow';
            if (p.type === 'ice') this.ctx.fillStyle = 'cyan';
            if (p.type === 'cannon') this.ctx.fillStyle = 'black';
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
            this.ctx.fill();
        });

        this.particleSystem.draw(this.ctx);
    }
}
