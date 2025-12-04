import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class TowerDefenseGame {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.wave = 1;
        this.money = 100;
        this.lives = 20;
        this.spawnTimer = 0;
        this.enemiesToSpawn = 0;

        this.selectedTowerType = 'basic';

        // 0: Empty, 1: Path, 2: Base, 3: Tower
        this.map = [
            [0,0,0,0,0,0,0,0,0,0],
            [1,1,1,1,0,0,0,1,1,1],
            [0,0,0,1,0,0,0,1,0,0],
            [0,0,0,1,1,1,1,1,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,1,1,1,1,1,0,0,0,0],
            [0,1,0,0,0,1,0,0,0,0],
            [0,1,1,1,0,1,1,1,2,0], // 2 is base
            [0,0,0,0,0,0,0,0,0,0]
        ];
        this.tileSize = 64;
        this.waypoints = [];

        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
    }

    init(container) {
        container.innerHTML = `
            <h2>🛡️ Neon Defense</h2>
            <div class="flex gap-4 mb-2">
                <div class="text-green-400 font-bold">Money: $<span id="td-money">0</span></div>
                <div class="text-red-400 font-bold">Lives: <span id="td-lives">0</span></div>
                <div class="text-yellow-400 font-bold">Wave: <span id="td-wave">0</span></div>
            </div>
            <div class="relative inline-block">
                <canvas id="tdCanvas" width="640" height="576" class="border border-cyan-500 bg-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></canvas>
                <div id="td-ui" class="absolute top-2 right-2 flex flex-col gap-2">
                    <button id="btn-tower-basic" class="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs border border-white/20">Basic ($50)</button>
                    <button id="btn-tower-sniper" class="p-2 bg-green-600 hover:bg-green-500 text-white rounded text-xs border border-white/20">Sniper ($120)</button>
                    <button id="btn-tower-rapid" class="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs border border-white/20">Rapid ($200)</button>
                </div>
            </div>
            <button class="back-btn mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded block">Back</button>
        `;

        this.canvas = container.querySelector('#tdCanvas');
        this.ctx = this.canvas.getContext('2d');

        container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        const updateSelection = (type) => {
            this.selectedTowerType = type;
            container.querySelectorAll('#td-ui button').forEach(b => b.classList.remove('ring-2', 'ring-white'));
            container.querySelector(`#btn-tower-${type}`).classList.add('ring-2', 'ring-white');
        };

        container.querySelector('#btn-tower-basic').onclick = () => updateSelection('basic');
        container.querySelector('#btn-tower-sniper').onclick = () => updateSelection('sniper');
        container.querySelector('#btn-tower-rapid').onclick = () => updateSelection('rapid');

        // Initial selection
        updateSelection('basic');

        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));

        this.calculatePath();
        this.resetGame();
    }

    calculatePath() {
        // Manually defining waypoints for the specific map structure
        this.waypoints = [
            {c:0, r:1}, {c:3, r:1}, {c:3, r:3}, {c:7, r:3},
            {c:7, r:5}, {c:1, r:5}, {c:1, r:7}, {c:5, r:7}, {c:5, r:7}, {c:8, r:7}
        ];
    }

    resetGame() {
        this.money = 150;
        this.lives = 20;
        this.wave = 1;
        this.enemies = [];
        this.projectiles = [];
        this.towers = [];
        // Reset map towers
        for(let r=0; r<this.map.length; r++) {
            for(let c=0; c<this.map[r].length; c++) {
                if(this.map[r][c] === 3) this.map[r][c] = 0;
            }
        }
        this.startWave();
    }

    startWave() {
        this.enemiesToSpawn = 5 + Math.floor(this.wave * 1.5);
        this.spawnTimer = 0;
    }

    update(dt) {
        if (!this.ctx) return;

        // Spawning
        if (this.enemiesToSpawn > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                this.spawnTimer = Math.max(0.2, 1.5 - this.wave * 0.05); // Faster spawning each wave
                this.enemiesToSpawn--;
            }
        } else if (this.enemies.length === 0) {
            this.wave++;
            this.startWave();
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            this.moveEnemy(e, dt);
            if (e.reachedEnd) {
                this.lives--;
                this.enemies.splice(i, 1);
                this.soundManager.playSound('hurt');
            } else if (e.hp <= 0) {
                this.money += e.reward;
                this.enemies.splice(i, 1);
                this.soundManager.playSound('coin');
                this.particleSystem.emit(e.x, e.y, { count: 5, color: '#ff0000', speed: 50 });
            }
        }

        // Towers Fire
        this.towers.forEach(t => this.updateTower(t, dt));

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            this.moveProjectile(p, dt);
            if (p.hit) {
                this.projectiles.splice(i, 1);
            }
        }

        // UI Updates
        const moneyEl = document.getElementById('td-money');
        if (moneyEl) moneyEl.textContent = this.money;
        const livesEl = document.getElementById('td-lives');
        if (livesEl) livesEl.textContent = this.lives;
        const waveEl = document.getElementById('td-wave');
        if (waveEl) waveEl.textContent = this.wave;

        if (this.lives <= 0) {
             if (window.miniGameHub && window.miniGameHub.showGameOver) {
                 this.lives = 0; // Prevent multiple calls
                 window.miniGameHub.showGameOver(this.wave, () => this.resetGame());
             }
        }
    }

    spawnEnemy() {
        const hp = 20 + this.wave * 10;
        this.enemies.push({
            x: this.waypoints[0].c * this.tileSize + 32,
            y: this.waypoints[0].r * this.tileSize + 32,
            wpIndex: 1,
            hp: hp,
            maxHp: hp,
            speed: 100 + (this.wave * 2),
            reward: 10 + this.wave,
            reachedEnd: false
        });
    }

    moveEnemy(e, dt) {
        if (e.wpIndex >= this.waypoints.length) {
            e.reachedEnd = true;
            return;
        }
        const target = this.waypoints[e.wpIndex];
        const tx = target.c * this.tileSize + 32;
        const ty = target.r * this.tileSize + 32;

        const dx = tx - e.x;
        const dy = ty - e.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 5) {
            e.wpIndex++;
        } else {
            e.x += (dx/dist) * e.speed * dt;
            e.y += (dy/dist) * e.speed * dt;
        }
    }

    updateTower(t, dt) {
        t.cooldown -= dt;
        if (t.cooldown <= 0) {
            const target = this.findTarget(t);
            if (target) {
                this.fireProjectile(t, target);
                t.cooldown = t.fireRate;
            }
        }
    }

    findTarget(t) {
        let closest = null;
        let minDist = t.range;
        this.enemies.forEach(e => {
            const d = Math.sqrt((e.x - t.x)**2 + (e.y - t.y)**2);
            if (d < minDist) {
                minDist = d;
                closest = e;
            }
        });
        return closest;
    }

    fireProjectile(t, target) {
        this.projectiles.push({
            x: t.x, y: t.y,
            target: target,
            speed: 500,
            damage: t.damage,
            hit: false
        });
        this.soundManager.playSound('shoot');
    }

    moveProjectile(p, dt) {
        // Simple homing
        if (!this.enemies.includes(p.target)) {
            p.hit = true; return;
        }
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 15) {
            p.target.hp -= p.damage;
            p.hit = true;
            this.particleSystem.emit(p.x, p.y, { color: '#ffff00', count: 3, speed: 30 });
        } else {
            p.x += (dx/dist) * p.speed * dt;
            p.y += (dy/dist) * p.speed * dt;
        }
    }

    onCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const c = Math.floor(x / this.tileSize);
        const r = Math.floor(y / this.tileSize);

        if (this.map[r] && this.map[r][c] === 0) {
            let cost = 0;
            let stats = {};
            if (this.selectedTowerType === 'basic') { cost = 50; stats = { range: 150, damage: 10, fireRate: 0.8, color: '#3b82f6' }; }
            if (this.selectedTowerType === 'sniper') { cost = 120; stats = { range: 400, damage: 50, fireRate: 2.5, color: '#22c55e' }; }
            if (this.selectedTowerType === 'rapid') { cost = 200; stats = { range: 120, damage: 4, fireRate: 0.15, color: '#a855f7' }; }

            if (this.money >= cost) {
                this.money -= cost;
                this.towers.push({
                    c, r,
                    x: c * this.tileSize + 32,
                    y: r * this.tileSize + 32,
                    ...stats,
                    cooldown: 0
                });
                this.map[r][c] = 3;
                this.soundManager.playSound('powerup');

                this.particleSystem.emit(c * this.tileSize + 32, r * this.tileSize + 32, { count: 20, color: '#ffffff', speed: 60 });
            } else {
                this.soundManager.playSound('error');
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Map
        for(let r=0; r<this.map.length; r++) {
            for(let c=0; c<this.map[r].length; c++) {
                if (this.map[r][c] === 1) {
                    ctx.fillStyle = '#334155'; // Path
                    ctx.fillRect(c*this.tileSize, r*this.tileSize, this.tileSize, this.tileSize);
                } else if (this.map[r][c] === 2) {
                    ctx.fillStyle = '#ef4444'; // Base
                    ctx.fillRect(c*this.tileSize, r*this.tileSize, this.tileSize, this.tileSize);
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(c*this.tileSize + 10, r*this.tileSize + 10, this.tileSize - 20, this.tileSize - 20);
                }
            }
        }

        // Draw Towers
        this.towers.forEach(t => {
            // Base
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(t.x, t.y, 25, 0, Math.PI*2);
            ctx.fill();

            // Turret
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 15, 0, Math.PI*2);
            ctx.fill();

            // Range (hover effect maybe? for now just draw faint ring if mouse near? Nah)
        });

        // Draw Enemies
        this.enemies.forEach(e => {
            ctx.fillStyle = '#f87171';
            ctx.beginPath();
            ctx.arc(e.x, e.y, 12, 0, Math.PI*2);
            ctx.fill();

            // Health bar
            ctx.fillStyle = '#000';
            ctx.fillRect(e.x - 10, e.y - 20, 20, 4);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(e.x - 10, e.y - 20, 20 * (e.hp / e.maxHp), 4);
        });

        // Draw Projectiles
        ctx.fillStyle = '#facc15';
        this.projectiles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
            ctx.fill();
        });
    }

    shutdown() {
        this.ctx = null;
        this.canvas = null;
    }
}
