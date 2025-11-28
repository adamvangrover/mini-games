// Tower Defense Lite
// A simple tower defense game with wave management and economy

let canvas, ctx;
let animationId;
let gameState = {
    wave: 1,
    lives: 20,
    gold: 100,
    enemies: [],
    towers: [],
    projectiles: [],
    particles: [],
    active: false,
    waveActive: false,
    nextWaveTime: 0,
    path: []
};

const TOWER_TYPES = {
    basic: { cost: 50, range: 100, damage: 10, rate: 30, color: '#3b82f6', type: 'basic' }, // Rate is frames per shot
    rapid: { cost: 150, range: 80, damage: 5, rate: 10, color: '#eab308', type: 'rapid' },
    sniper: { cost: 300, range: 200, damage: 50, rate: 90, color: '#ef4444', type: 'sniper' }
};

const ENEMY_TYPES = [
    { hp: 20, speed: 2, reward: 5, color: '#a3e635' }, // Wave 1
    { hp: 50, speed: 3, reward: 10, color: '#fca5a5' }, // Wave 2
    { hp: 150, speed: 1, reward: 20, color: '#c084fc' } // Wave 3
];

let selectedTower = null;

export default {
    init: function() {
        canvas = document.getElementById('tdCanvas');
        if (!canvas) return; // Should not happen if html is correct
        ctx = canvas.getContext('2d');

        this.resetGame();
        this.setupPath();
        this.bindEvents();

        gameState.active = true;
        this.loop();

        document.getElementById('td-btn-start').onclick = () => this.startWave();
        document.getElementById('td-btn-basic').onclick = () => this.selectTower('basic');
        document.getElementById('td-btn-rapid').onclick = () => this.selectTower('rapid');
        document.getElementById('td-btn-sniper').onclick = () => this.selectTower('sniper');
    },

    shutdown: function() {
        gameState.active = false;
        cancelAnimationFrame(animationId);
        // Remove event listeners if needed (canvas click is tricky to remove anon function, but we can check gameState.active)
        canvas.onclick = null;
        canvas.onmousemove = null;
    },

    resetGame: function() {
        gameState = {
            wave: 1,
            lives: 20,
            gold: 150,
            enemies: [],
            towers: [],
            projectiles: [],
            particles: [],
            active: true,
            waveActive: false,
            enemiesToSpawn: 0,
            spawnTimer: 0,
            path: []
        };
        this.updateUI();
    },

    setupPath: function() {
        // Simple winding path
        const w = canvas.width;
        const h = canvas.height;
        gameState.path = [
            {x: 0, y: h/2},
            {x: w/4, y: h/2},
            {x: w/4, y: h/4},
            {x: w/2, y: h/4},
            {x: w/2, y: h*0.75},
            {x: w*0.75, y: h*0.75},
            {x: w*0.75, y: h/2},
            {x: w, y: h/2}
        ];
    },

    bindEvents: function() {
        canvas.onclick = (e) => {
            if (!gameState.active || !selectedTower) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.canPlaceTower(x, y)) {
                this.placeTower(selectedTower, x, y);
                selectedTower = null; // Deselect after placing
                canvas.style.cursor = 'default';
            }
        };

        canvas.onmousemove = (e) => {
             if (!gameState.active) return;
             // Could show placement preview here
        };
    },

    selectTower: function(type) {
        if (gameState.gold >= TOWER_TYPES[type].cost) {
            selectedTower = type;
            canvas.style.cursor = 'crosshair';
        } else {
             // Shake UI or sound?
             if(window.soundManager) window.soundManager.playTone(200, 'sawtooth', 0.1);
        }
    },

    canPlaceTower: function(x, y) {
        // Check bounds
        if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) return false;

        // Check distance from path (radius 20)
        for (let i = 0; i < gameState.path.length - 1; i++) {
            const p1 = gameState.path[i];
            const p2 = gameState.path[i+1];
            if (this.distToSegment({x, y}, p1, p2) < 30) return false;
        }

        // Check other towers
        for (let t of gameState.towers) {
            const d = Math.hypot(t.x - x, t.y - y);
            if (d < 40) return false;
        }

        return true;
    },

    placeTower: function(type, x, y) {
        const stats = TOWER_TYPES[type];
        gameState.gold -= stats.cost;
        gameState.towers.push({
            x, y,
            ...stats,
            cooldown: 0
        });
        this.updateUI();
        if(window.soundManager) window.soundManager.playSound('click');
    },

    startWave: function() {
        if (gameState.waveActive) return;
        gameState.waveActive = true;
        gameState.enemiesToSpawn = 5 + gameState.wave * 2;
        gameState.spawnTimer = 0;
        if(window.soundManager) window.soundManager.playTone(600, 'sine', 0.5, true);
    },

    update: function() {
        if (!gameState.active) return;

        // Spawning
        if (gameState.waveActive && gameState.enemiesToSpawn > 0) {
            gameState.spawnTimer++;
            if (gameState.spawnTimer > 60) { // Spawn every second (approx)
                this.spawnEnemy();
                gameState.spawnTimer = 0;
                gameState.enemiesToSpawn--;
            }
        } else if (gameState.waveActive && gameState.enemiesToSpawn === 0 && gameState.enemies.length === 0) {
            gameState.waveActive = false;
            gameState.wave++;
            this.updateUI();
            if(window.soundManager) window.soundManager.playTone(800, 'sine', 0.5, true);
        }

        // Enemies
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            let e = gameState.enemies[i];
            this.moveEnemy(e);
            if (e.reachedEnd) {
                gameState.lives--;
                gameState.enemies.splice(i, 1);
                this.updateUI();
                if(window.soundManager) window.soundManager.playTone(100, 'sawtooth', 0.2, false, true);
            } else if (e.hp <= 0) {
                gameState.gold += e.reward;
                gameState.enemies.splice(i, 1);
                this.updateUI();
                this.createExplosion(e.x, e.y, e.color);
                if(window.soundManager) window.soundManager.playSound('explosion');
            }
        }

        if (gameState.lives <= 0) {
            this.gameOver();
        }

        // Towers
        gameState.towers.forEach(t => {
            if (t.cooldown > 0) t.cooldown--;
            else {
                const target = this.findTarget(t);
                if (target) {
                    this.fireProjectile(t, target);
                    t.cooldown = t.rate;
                }
            }
        });

        // Projectiles
        for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
            let p = gameState.projectiles[i];
            const dx = p.target.x - p.x;
            const dy = p.target.y - p.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 10 || p.target.hp <= 0) { // Hit
                if (p.target.hp > 0) {
                    p.target.hp -= p.damage;
                    this.createHitEffect(p.target.x, p.target.y);
                }
                gameState.projectiles.splice(i, 1);
            } else {
                const angle = Math.atan2(dy, dx);
                p.x += Math.cos(angle) * 10;
                p.y += Math.sin(angle) * 10;
            }
        }

        // Particles
        for (let i = gameState.particles.length - 1; i >= 0; i--) {
            let p = gameState.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) gameState.particles.splice(i, 1);
        }
    },

    draw: function() {
        // Clear
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Path
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 40;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (gameState.path.length > 0) {
            ctx.moveTo(gameState.path[0].x, gameState.path[0].y);
            for (let i = 1; i < gameState.path.length; i++) {
                ctx.lineTo(gameState.path[i].x, gameState.path[i].y);
            }
        }
        ctx.stroke();

        // Towers
        gameState.towers.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
            ctx.fill();

            // Range indicator (hover or selected)
            // ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            // ctx.beginPath();
            // ctx.arc(t.x, t.y, t.range, 0, Math.PI*2);
            // ctx.stroke();
        });

        // Enemies
        gameState.enemies.forEach(e => {
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
            ctx.fill();

            // HP Bar
            ctx.fillStyle = 'red';
            ctx.fillRect(e.x - 10, e.y - 15, 20, 4);
            ctx.fillStyle = 'lime';
            ctx.fillRect(e.x - 10, e.y - 15, 20 * (e.hp / e.maxHp), 4);
        });

        // Projectiles
        gameState.projectiles.forEach(p => {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Particles
        gameState.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 20;
            ctx.fillRect(p.x, p.y, 4, 4);
            ctx.globalAlpha = 1;
        });
    },

    loop: function() {
        if (!gameState.active) return;
        this.update();
        this.draw();
        animationId = requestAnimationFrame(() => this.loop());
    },

    spawnEnemy: function() {
        const typeIdx = Math.min(Math.floor((gameState.wave - 1) / 2), ENEMY_TYPES.length - 1);
        const type = ENEMY_TYPES[typeIdx];
        const boost = Math.max(1, gameState.wave * 0.2); // HP Scaling

        gameState.enemies.push({
            x: gameState.path[0].x,
            y: gameState.path[0].y,
            pathIdx: 0,
            hp: type.hp * boost,
            maxHp: type.hp * boost,
            speed: type.speed,
            reward: type.reward,
            color: type.color,
            reachedEnd: false
        });
    },

    moveEnemy: function(e) {
        const target = gameState.path[e.pathIdx + 1];
        if (!target) {
            e.reachedEnd = true;
            return;
        }

        const dx = target.x - e.x;
        const dy = target.y - e.y;
        const dist = Math.hypot(dx, dy);

        if (dist < e.speed) {
            e.x = target.x;
            e.y = target.y;
            e.pathIdx++;
        } else {
            e.x += (dx / dist) * e.speed;
            e.y += (dy / dist) * e.speed;
        }
    },

    findTarget: function(tower) {
        // Find closest enemy in range
        let closest = null;
        let minD = Infinity;

        for (let e of gameState.enemies) {
            const d = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (d <= tower.range && d < minD) {
                minD = d;
                closest = e;
            }
        }
        return closest;
    },

    fireProjectile: function(tower, target) {
        gameState.projectiles.push({
            x: tower.x,
            y: tower.y,
            target: target,
            damage: tower.damage
        });
        if(window.soundManager) window.soundManager.playSound('shoot');
    },

    createExplosion: function(x, y, color) {
        for(let i=0; i<8; i++) {
            gameState.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 20,
                color: color
            });
        }
    },

    createHitEffect: function(x, y) {
        for(let i=0; i<3; i++) {
            gameState.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 10,
                color: '#fff'
            });
        }
    },

    distToSegment: function(p, v, w) {
        const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
        if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    },

    updateUI: function() {
        document.getElementById('td-wave').innerText = gameState.wave;
        document.getElementById('td-lives').innerText = gameState.lives;
        document.getElementById('td-gold').innerText = gameState.gold;
    },

    gameOver: function() {
        gameState.active = false;
        alert("Game Over! Wave: " + gameState.wave);
        this.resetGame();
    }
};
export default class TowerDefense {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.active = false;

        // Game State
        this.money = 100;
        this.wave = 1;
        this.lives = 20;

        // Entities
        this.path = [];
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];

        // Configuration
        this.gridSize = 40;
        this.towerTypes = {
            'archer': { cost: 50, range: 150, damage: 10, cooldown: 0.5, color: '#2ecc71', name: 'Archer' },
            'cannon': { cost: 100, range: 100, damage: 30, cooldown: 1.5, color: '#e74c3c', name: 'Cannon' }, // Splash not impl yet
            'ice': { cost: 75, range: 120, damage: 5, cooldown: 0.8, color: '#3498db', name: 'Ice' }
        };
        this.selectedTower = null;

        // Wave Management
        this.waveActive = false;
        this.enemiesToSpawn = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 1.0;

        this.boundClick = this.handleClick.bind(this);
    }

    init(container) {
        this.canvas = container.querySelector('#tdCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.active = true;

        // Reset State
        this.money = 150;
        this.wave = 1;
        this.lives = 20;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.waveActive = false;

        // Define Path (Simple loop for now)
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.path = [
            {x: 0, y: h/2},
            {x: w*0.2, y: h/2},
            {x: w*0.2, y: h*0.2},
            {x: w*0.8, y: h*0.2},
            {x: w*0.8, y: h*0.8},
            {x: w*0.4, y: h*0.8},
            {x: w*0.4, y: h*0.5},
            {x: w, y: h*0.5}
        ];

        // Bind UI
        this.setupUI(container);

        // Input
        this.canvas.addEventListener('click', this.boundClick);

        this.updateUI();
    }

    setupUI(container) {
        container.querySelector('#td-btn-archer').onclick = () => this.selectTower('archer');
        container.querySelector('#td-btn-cannon').onclick = () => this.selectTower('cannon');
        container.querySelector('#td-btn-ice').onclick = () => this.selectTower('ice');
        container.querySelector('#td-btn-start-wave').onclick = () => this.startWave();
    }

    selectTower(type) {
        this.selectedTower = type;
        // Visual feedback could go here
    }

    startWave() {
        if (this.waveActive) return;
        this.waveActive = true;
        this.enemiesToSpawn = 5 + (this.wave * 2);
        this.spawnTimer = 0;
        this.spawnInterval = Math.max(0.2, 1.0 - (this.wave * 0.05));
    }

    handleClick(e) {
        if (!this.selectedTower || !this.active) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Snap to grid
        const gridX = Math.floor(mouseX / this.gridSize) * this.gridSize + this.gridSize/2;
        const gridY = Math.floor(mouseY / this.gridSize) * this.gridSize + this.gridSize/2;

        // Check cost
        const towerConfig = this.towerTypes[this.selectedTower];
        if (this.money < towerConfig.cost) {
            window.soundManager.playSound('shoot'); // Error sound placeholder
            return;
        }

        // Check placement (not on path, not on other tower)
        if (this.isValidPlacement(gridX, gridY)) {
            this.towers.push({
                x: gridX,
                y: gridY,
                type: this.selectedTower,
                cooldownTimer: 0,
                ...towerConfig
            });
            this.money -= towerConfig.cost;
            this.updateUI();
            window.soundManager.playSound('click');
        }
    }

    isValidPlacement(x, y) {
        // Check towers
        for (const t of this.towers) {
            if (Math.abs(t.x - x) < 1 && Math.abs(t.y - y) < 1) return false;
        }

        // Check path (Distance to line segments)
        // Simplified: Check distance to path points for now, better would be point-to-segment distance
        for (const p of this.path) {
            if (Math.hypot(p.x - x, p.y - y) < this.gridSize) return false;
        }
        // Ideally we check segments
        for (let i=0; i<this.path.length-1; i++) {
             const p1 = this.path[i];
             const p2 = this.path[i+1];
             const dist = this.distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
             if (dist < this.gridSize/2 + 10) return false;
        }

        return true;
    }

    distToSegment(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    shutdown() {
        this.active = false;
        this.enemies = [];
        this.towers = [];
        if (this.canvas) {
            this.canvas.removeEventListener('click', this.boundClick);
        }
    }

    update(dt) {
        if (!this.active) return;

        // Spawning
        if (this.waveActive && this.enemiesToSpawn > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                this.spawnTimer = this.spawnInterval;
                this.enemiesToSpawn--;
            }
        } else if (this.waveActive && this.enemiesToSpawn <= 0 && this.enemies.length === 0) {
            this.waveComplete();
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];

            // Move along path
            const target = this.path[e.pathIndex + 1];
            if (target) {
                const dx = target.x - e.x;
                const dy = target.y - e.y;
                const dist = Math.hypot(dx, dy);
                const moveDist = e.speed * dt;

                if (moveDist >= dist) {
                    e.x = target.x;
                    e.y = target.y;
                    e.pathIndex++;
                    if (e.pathIndex >= this.path.length - 1) {
                        // Reached end
                        this.lives--;
                        this.enemies.splice(i, 1);
                        window.soundManager.playSound('shoot'); // Hit sound
                        continue;
                    }
                } else {
                    e.x += (dx / dist) * moveDist;
                    e.y += (dy / dist) * moveDist;
                }
            }

            // Apply slow decay
            if (e.slowTimer > 0) {
                e.slowTimer -= dt;
                if (e.slowTimer <= 0) e.speed = e.baseSpeed;
            }
        }

        // Towers Fire
        for (const t of this.towers) {
            if (t.cooldownTimer > 0) t.cooldownTimer -= dt;

            if (t.cooldownTimer <= 0) {
                // Find target
                let target = null;
                let minDist = Infinity;

                for (const e of this.enemies) {
                    const dist = Math.hypot(e.x - t.x, e.y - t.y);
                    if (dist <= t.range && dist < minDist) {
                        minDist = dist;
                        target = e;
                    }
                }

                if (target) {
                    // Fire
                    this.projectiles.push({
                        x: t.x,
                        y: t.y,
                        target: target,
                        speed: 400,
                        damage: t.damage,
                        type: t.type
                    });
                    t.cooldownTimer = t.cooldown;
                }
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            if (!this.enemies.includes(p.target)) {
                this.projectiles.splice(i, 1);
                continue;
            }

            const dx = p.target.x - p.x;
            const dy = p.target.y - p.y;
            const dist = Math.hypot(dx, dy);
            const move = p.speed * dt;

            if (move >= dist) {
                // Hit
                this.damageEnemy(p.target, p.damage, p.type);
                this.projectiles.splice(i, 1);
            } else {
                p.x += (dx / dist) * move;
                p.y += (dy / dist) * move;
            }
        }
    }

    spawnEnemy() {
        const hp = 20 + (this.wave * 10);
        this.enemies.push({
            x: this.path[0].x,
            y: this.path[0].y,
            pathIndex: 0,
            hp: hp,
            maxHp: hp,
            speed: 100,
            baseSpeed: 100,
            slowTimer: 0,
            color: '#fff'
        });
    }

    damageEnemy(enemy, amount, type) {
        enemy.hp -= amount;

        if (type === 'ice') {
            enemy.speed = enemy.baseSpeed * 0.5;
            enemy.slowTimer = 2.0;
        }

        if (enemy.hp <= 0) {
            const index = this.enemies.indexOf(enemy);
            if (index > -1) {
                this.enemies.splice(index, 1);
                this.money += 15;
                this.updateUI();
                window.soundManager.playSound('score');
            }
        }
    }

    waveComplete() {
        this.waveActive = false;
        this.wave++;
        this.money += 50;
        this.updateUI();
    }

    updateUI() {
        const mEl = document.getElementById('td-money');
        const wEl = document.getElementById('td-wave');
        if(mEl) mEl.innerText = this.money;
        if(wEl) wEl.innerText = this.wave;
    }

    draw() {
        if (!this.ctx) return;

        // Clear
        this.ctx.fillStyle = "#2c3e50";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Path
        this.ctx.strokeStyle = "#34495e";
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        if (this.path.length > 0) {
            this.ctx.moveTo(this.path[0].x, this.path[0].y);
            for (let i = 1; i < this.path.length; i++) {
                this.ctx.lineTo(this.path[i].x, this.path[i].y);
            }
        }
        this.ctx.stroke();

        // Draw Towers
        for (const t of this.towers) {
            this.ctx.fillStyle = t.color;
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, 15, 0, Math.PI*2);
            this.ctx.fill();

            // Range indicator if selected? Nah, maybe on hover
        }

        // Draw Enemies
        for (const e of this.enemies) {
            this.ctx.fillStyle = e.slowTimer > 0 ? '#3498db' : '#e74c3c';
            this.ctx.beginPath();
            this.ctx.arc(e.x, e.y, 10, 0, Math.PI*2);
            this.ctx.fill();

            // Health bar
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(e.x - 10, e.y - 15, 20, 4);
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.fillRect(e.x - 10, e.y - 15, 20 * (e.hp / e.maxHp), 4);
        }

        // Draw Projectiles
        this.ctx.fillStyle = '#f1c40f';
        for (const p of this.projectiles) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
            this.ctx.fill();
        }

        // Draw Selected Ghost
        if (this.selectedTower) {
            // Need mouse pos tracking or just rely on click
            // For now, no ghost cursor
        }

        // Draw Lives
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Lives: ${this.lives}`, 20, 30);

        if (this.lives <= 0) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'red';
            this.ctx.font = '40px Arial';
            this.ctx.fillText('GAME OVER', this.canvas.width/2 - 100, this.canvas.height/2);
            this.active = false;
        }
    }
import SoundManager from "../core/SoundManager.js";
import InputManager from "../core/InputManager.js";
import ParticleSystem from "../core/ParticleSystem.js";

export default class TowerDefenseGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gridSize = 40;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.wave = 1;
        this.money = 150;
        this.lives = 20;
        this.spawnTimer = 0;
        this.enemiesToSpawn = 0;
        this.gameActive = false;
        this.mousePos = { x: 0, y: 0 };
        this.path = [
            {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}, {x: 3, y: 2},
            {x: 3, y: 3}, {x: 3, y: 4}, {x: 4, y: 4}, {x: 5, y: 4},
            {x: 6, y: 4}, {x: 6, y: 3}, {x: 6, y: 2}, {x: 6, y: 1},
            {x: 7, y: 1}, {x: 8, y: 1}, {x: 9, y: 1}, {x: 9, y: 2},
            {x: 9, y: 3}, {x: 9, y: 4}, {x: 9, y: 5}, {x: 10, y: 5},
            {x: 11, y: 5}, {x: 12, y: 5}, {x: 13, y: 5}, {x: 14, y: 5}
        ];
        this.towerTypes = {
            "archer": { name: "Laser", cost: 50, range: 120, fireRate: 0.4, damage: 15, color: "#00ffff", desc: "Fast, low dmg" },
            "cannon": { name: "Blaster", cost: 120, range: 150, fireRate: 1.2, damage: 60, color: "#ff00ff", desc: "Slow, high dmg, splash" },
            "ice": { name: "Cryo", cost: 80, range: 100, fireRate: 0.8, damage: 10, color: "#3498db", desc: "Slows enemies" },
            "sniper": { name: "Sniper", cost: 200, range: 300, fireRate: 2.0, damage: 150, color: "#e74c3c", desc: "Long range, high dmg" }
        };
        this.selectedTowerType = "archer";
        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        this.boundHandleClick = this.handleCanvasClick.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    }
    init(container) {
        container.innerHTML = `
            <div id="td-wrapper" style="position: relative; width: 800px; height: 600px; background: #050510; border: 2px solid #00ffff; box-shadow: 0 0 20px rgba(0,255,255,0.2); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: rgba(0,255,255,0.1); border-bottom: 1px solid #00ffff;">
                    <h2 style="margin:0; font-size: 1.2rem; text-shadow: 0 0 5px #00ffff;">🏰 NEON DEFENSE</h2>
                    <div style="font-family: monospace; font-size: 1rem; color: #fff;">
                        ❤️ <span id="td-lives" style="color: #ff5555; margin-right: 15px;">20</span>
                        💰 <span id="td-money" style="color: #ffff55; margin-right: 15px;">150</span>
                        🌊 <span id="td-wave" style="color: #55ffff;">1</span>
                    </div>
                </div>
                <div style="position: relative; flex: 1; background: #000;">
                    <canvas id="tdCanvas" width="800" height="480"></canvas>
                </div>
                <div id="td-controls" style="padding: 10px; background: #0d0d1a; border-top: 1px solid #00ffff; display: flex; gap: 10px; justify-content: center; align-items: center;">
                    ${Object.entries(this.towerTypes).map(([key, tower]) => `<button id="btn-${key}" class="td-btn" title="${tower.desc}"><div style="font-weight:bold; color: ${tower.color}">${tower.name}</div><div style="font-size: 0.8em; color: #aaa;">$${tower.cost}</div></button>`).join("")}
                    <div style="width: 20px;"></div>
                    <button id="btn-sell" class="td-btn sell-btn">
                        <div style="font-weight:bold; color: #ff5555">SELL</div>
                        <div style="font-size: 0.8em; color: #aaa;">(50%)</div>
                    </button>
                    <div style="flex: 1;"></div>
                    <button id="btn-next-wave" class="td-btn action-btn" style="border-color: #00ff00; color: #00ff00;">
                        START WAVE
                    </button>
                </div>
            </div>
            <button class="back-btn">Back</button>
            <style>
                .td-btn { background: rgba(255,255,255,0.05); border: 1px solid #555; border-radius: 5px; padding: 8px 12px; cursor: pointer; font-family: "Press Start 2P", cursive; font-size: 0.7rem; text-align: center; transition: all 0.2s; min-width: 80px; }
                .td-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
                .td-btn.selected { border-color: #00ffff; background: rgba(0,255,255,0.1); box-shadow: 0 0 10px rgba(0,255,255,0.3); }
                .td-btn.action-btn:hover { background: rgba(0,255,0,0.2); box-shadow: 0 0 15px rgba(0,255,0,0.4); }
                .td-btn.sell-btn.active { border-color: #ff5555; background: rgba(255,85,85,0.2); box-shadow: 0 0 10px rgba(255,85,85,0.3); }
            </style>
        `;
        this.canvas = document.getElementById("tdCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = 800;
        this.canvas.height = 480;
        Object.keys(this.towerTypes).forEach(type => {
            document.getElementById(`btn-${type}`).onclick = () => this.selectTower(type);
        });
        document.getElementById("btn-sell").onclick = () => this.toggleSellMode();
        document.getElementById("btn-next-wave").onclick = () => this.startWave();
        container.querySelector(".back-btn").addEventListener("click", () => {
             window.miniGameHub.transitionToState("MENU");
        });
        this.canvas.addEventListener("click", this.boundHandleClick);
        this.canvas.addEventListener("mousemove", this.boundHandleMouseMove);
        this.resetGame();
        this.selectTower("archer");
        this.gameActive = true;
    }
    resetGame() {
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.wave = 1;
        this.money = 250;
        this.lives = 20;
        this.enemiesToSpawn = 0;
        this.isSelling = false;
        this.gameActive = true;
        this.updateUI();
    }
    selectTower(type) {
        this.selectedTowerType = type;
        this.isSelling = false;
        document.querySelectorAll(".td-btn").forEach(b => b.classList.remove("selected", "active"));
        document.getElementById(`btn-${type}`).classList.add("selected");
        document.getElementById("btn-sell").classList.remove("active");
    }
    toggleSellMode() {
        this.isSelling = !this.isSelling;
        document.querySelectorAll(".td-btn").forEach(b => b.classList.remove("selected"));
        const sellBtn = document.getElementById("btn-sell");
        if (this.isSelling) {
            sellBtn.classList.add("active");
            this.selectedTowerType = null;
        } else {
            sellBtn.classList.remove("active");
            this.selectTower("archer");
        }
    }
    startWave() {
        if (this.enemiesToSpawn > 0 || this.enemies.length > 0) return;
        this.wave++; // Increment wave before starting
        let count = 5 + Math.floor(this.wave * 1.5);
        this.enemiesToSpawn = count;
        this.spawnTimer = 0;
        this.updateUI();
        this.soundManager.playSound("powerup");
    }
    shutdown() {
        if (this.canvas) {
            this.canvas.removeEventListener("click", this.boundHandleClick);
            this.canvas.removeEventListener("mousemove", this.boundHandleMouseMove);
        }
        this.gameActive = false;
    }
    update(dt) {
        if (!this.gameActive) return;
        if (this.enemiesToSpawn > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                this.spawnTimer = Math.max(0.2, 1.5 - (this.wave * 0.05));
                this.enemiesToSpawn--;
            }
        } else if (this.enemies.length === 0 && this.lives > 0 && this.spawnTimer <= 0) {
             // Wave cleared, waiting for player to start next wave
             this.updateUI(); // Ensure button is enabled
        }
        this.enemies.forEach(e => {
            const target = this.path[e.pathIndex];
            const tx = target.x * this.gridSize + this.gridSize/2;
            const ty = target.y * this.gridSize + this.gridSize/2;
            const dx = tx - e.x;
            const dy = ty - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const speed = e.speed * (e.frozen > 0 ? 0.5 : 1);
            if (e.frozen > 0) e.frozen -= dt;
            if (dist < speed * dt) {
                e.x = tx; e.y = ty; e.pathIndex++;
                if (e.pathIndex >= this.path.length) {
                    e.reachedEnd = true;
                    this.lives--;
                    this.soundManager.playSound("explosion");
                    this.particleSystem.emit(this.ctx, e.x, e.y, "#ff0000", 10);
                    this.updateUI();
                }
            } else {
                e.x += (dx / dist) * speed * dt;
                e.y += (dy / dist) * speed * dt;
            }
        });
        this.enemies = this.enemies.filter(e => !e.reachedEnd && e.hp > 0);
        if (this.lives <= 0) this.gameActive = false;
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
        this.projectiles.forEach(p => {
            if (!p.active) return;
            if (p.target && p.target.hp > 0) {
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
            } else { p.active = false; }
        });
        this.projectiles = this.projectiles.filter(p => p.active);
        this.particleSystem.update(dt);
    }
    spawnEnemy() {
        const hp = 30 + (this.wave * this.wave * 5);
        const isFast = this.wave > 3 && Math.random() > 0.8;
        const isTank = this.wave > 5 && Math.random() > 0.9;
        let speed = 60; let color = "#e74c3c"; let radius = 10; let finalHp = hp;
        if (isFast) { speed = 100; color = "#f1c40f"; radius = 8; finalHp = hp * 0.6; }
        else if (isTank) { speed = 40; color = "#8e44ad"; radius = 14; finalHp = hp * 2.5; }
        this.enemies.push({ x: this.path[0].x * this.gridSize + this.gridSize/2, y: this.path[0].y * this.gridSize + this.gridSize/2, pathIndex: 1, hp: finalHp, maxHp: finalHp, speed: speed, frozen: 0, color: color, radius: radius });
    }
    findTarget(tower) {
        let closest = null; let minDist = tower.range;
        this.enemies.forEach(e => {
            const dx = e.x - tower.x; const dy = e.y - tower.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist) { closest = e; minDist = dist; }
        });
        return closest;
    }
    fireProjectile(tower, target) {
        this.projectiles.push({ x: tower.x, y: tower.y, target: target, speed: 400, damage: tower.damage, type: tower.type, active: true });
        let pitch = 1.0;
        if(tower.type === "cannon") pitch = 0.5;
        if(tower.type === "archer") pitch = 1.5;
        this.soundManager.playSound("shoot", 0.2, pitch);
    }
    hitEnemy(enemy, projectile) {
        enemy.hp -= projectile.damage;
        if (projectile.type === "ice") { enemy.frozen = 2.0; this.particleSystem.emit(this.ctx, enemy.x, enemy.y, "#74b9ff", 5); }
        else if (projectile.type === "cannon") {
            this.particleSystem.emit(this.ctx, enemy.x, enemy.y, "#ffaa00", 8);
            this.enemies.forEach(e => {
                const dx = e.x - enemy.x; const dy = e.y - enemy.y;
                if (Math.sqrt(dx*dx + dy*dy) < 60) { e.hp -= projectile.damage * 0.5; }
            });
        } else { this.particleSystem.emit(this.ctx, enemy.x, enemy.y, "#ffffff", 3); }
        if (enemy.hp <= 0 && !enemy.dead) {
            enemy.dead = true; this.money += 15; this.updateUI();
        }
    }
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.mousePos.x = (e.clientX - rect.left) * scaleX;
        this.mousePos.y = (e.clientY - rect.top) * scaleY;
    }
    handleCanvasClick(e) {
        if (!this.gameActive) return;
        const gx = Math.floor(this.mousePos.x / this.gridSize);
        const gy = Math.floor(this.mousePos.y / this.gridSize);
        if (gx < 0 || gx >= 20 || gy < 0 || gy >= 12) return;
        const existingIndex = this.towers.findIndex(t => t.gx === gx && t.gy === gy);
        if (this.isSelling) {
            if (existingIndex !== -1) {
                const t = this.towers[existingIndex];
                this.money += Math.floor(this.towerTypes[t.type].cost * 0.5);
                this.towers.splice(existingIndex, 1);
                this.soundManager.playSound("click");
                this.particleSystem.emit(this.ctx, t.x, t.y, "#ffff00", 15);
                this.updateUI();
            }
            return;
        }
        if (existingIndex !== -1) return;
        const onPath = this.path.some(p => p.x === gx && p.y === gy);
        if (onPath) return;
        if (!this.selectedTowerType) return;
        const cost = this.towerTypes[this.selectedTowerType].cost;
        if (this.money >= cost) {
            this.money -= cost;
            this.updateUI();
            this.addTower(gx, gy, this.selectedTowerType);
        }
    }
    addTower(gx, gy, type) {
        const stats = this.towerTypes[type];
        this.towers.push({ gx: gx, gy: gy, x: gx * this.gridSize + this.gridSize/2, y: gy * this.gridSize + this.gridSize/2, type: type, ...stats, cooldown: 0 });
        this.soundManager.playSound("click");
        this.particleSystem.emit(this.ctx, gx*this.gridSize + this.gridSize/2, gy*this.gridSize + this.gridSize/2, "#00ffff", 10);
    }
    updateUI() {
        const moneyEl = document.getElementById("td-money"); if(moneyEl) moneyEl.textContent = this.money;
        const livesEl = document.getElementById("td-lives"); if(livesEl) livesEl.textContent = this.lives;
        const waveEl = document.getElementById("td-wave"); if(waveEl) waveEl.textContent = this.wave;
        const btnNext = document.getElementById("btn-next-wave");
        if(btnNext) {
            if (this.enemiesToSpawn > 0 || this.enemies.length > 0) {
                btnNext.textContent = "IN PROGRESS..."; btnNext.style.borderColor = "#555"; btnNext.style.color = "#555"; btnNext.disabled = true;
            } else {
                btnNext.textContent = "START WAVE"; btnNext.style.borderColor = "#00ff00"; btnNext.style.color = "#00ff00"; btnNext.disabled = false;
            }
        }
    }
    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = "rgba(255,255,255,0.05)"; this.ctx.lineWidth = 1;
        for(let i=0; i<this.canvas.width; i+=this.gridSize) { this.ctx.beginPath(); this.ctx.moveTo(i,0); this.ctx.lineTo(i, this.canvas.height); this.ctx.stroke(); }
        for(let i=0; i<this.canvas.height; i+=this.gridSize) { this.ctx.beginPath(); this.ctx.moveTo(0,i); this.ctx.lineTo(this.canvas.width, i); this.ctx.stroke(); }
        this.ctx.shadowBlur = 10; this.ctx.shadowColor = "#00ffff"; this.ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
        this.path.forEach(p => { this.ctx.fillRect(p.x * this.gridSize + 1, p.y * this.gridSize + 1, this.gridSize - 2, this.gridSize - 2); });
        this.ctx.shadowBlur = 0;
        this.towers.forEach(t => { this.drawTower(t); });
        this.enemies.forEach(e => { this.drawEnemy(e); });
        this.projectiles.forEach(p => {
            this.ctx.fillStyle = "#ffff00";
            if (p.type === "ice") this.ctx.fillStyle = "#00ffff";
            if (p.type === "cannon") this.ctx.fillStyle = "#ff00ff";
            this.ctx.shadowBlur = 5; this.ctx.shadowColor = this.ctx.fillStyle;
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 4, 0, Math.PI*2); this.ctx.fill(); this.ctx.shadowBlur = 0;
        });
        this.particleSystem.draw(this.ctx);
        if (this.gameActive && !this.isSelling && this.selectedTowerType) {
            const gx = Math.floor(this.mousePos.x / this.gridSize);
            const gy = Math.floor(this.mousePos.y / this.gridSize);
            if (gx >= 0 && gx < 20 && gy >= 0 && gy < 12) {
                const cx = gx * this.gridSize + this.gridSize/2;
                const cy = gy * this.gridSize + this.gridSize/2;
                const range = this.towerTypes[this.selectedTowerType].range;
                const onPath = this.path.some(p => p.x === gx && p.y === gy);
                const occupied = this.towers.some(t => t.gx === gx && t.gy === gy);
                if (!onPath && !occupied) {
                    this.ctx.beginPath(); this.ctx.arc(cx, cy, range, 0, Math.PI*2); this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; this.ctx.fill();
                    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; this.ctx.stroke();
                    this.ctx.globalAlpha = 0.5; this.ctx.fillStyle = this.towerTypes[this.selectedTowerType].color;
                    this.ctx.beginPath(); this.ctx.arc(cx, cy, 15, 0, Math.PI*2); this.ctx.fill(); this.ctx.globalAlpha = 1.0;
                } else {
                    this.ctx.beginPath(); this.ctx.arc(cx, cy, 10, 0, Math.PI*2); this.ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; this.ctx.fill();
                }
            }
        }
        const gx = Math.floor(this.mousePos.x / this.gridSize);
        const gy = Math.floor(this.mousePos.y / this.gridSize);
        const hoveredTower = this.towers.find(t => t.gx === gx && t.gy === gy);
        if (hoveredTower) {
             this.ctx.beginPath(); this.ctx.arc(hoveredTower.x, hoveredTower.y, hoveredTower.range, 0, Math.PI*2);
             this.ctx.strokeStyle = this.isSelling ? "#ff0000" : "#ffffff";
             this.ctx.setLineDash([5, 5]); this.ctx.stroke(); this.ctx.setLineDash([]);
             if(this.isSelling) { this.ctx.fillStyle = "red"; this.ctx.font = "12px monospace"; this.ctx.fillText("SELL", hoveredTower.x - 12, hoveredTower.y + 4); }
        }
        if (this.lives <= 0) {
            this.ctx.fillStyle = "rgba(0,0,0,0.7)"; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "red"; this.ctx.font = "40px Press Start 2P"; this.ctx.textAlign = "center";
            this.ctx.fillText("GAME OVER", this.canvas.width/2, this.canvas.height/2);
            this.ctx.font = "16px monospace"; this.ctx.fillStyle = "white";
            this.ctx.fillText("Click Back to Exit", this.canvas.width/2, this.canvas.height/2 + 40);
        }
    }
    drawTower(t) {
        this.ctx.save(); this.ctx.translate(t.x, t.y);
        this.ctx.fillStyle = "#333"; this.ctx.fillRect(-18, -18, 36, 36);
        this.ctx.strokeStyle = t.color; this.ctx.lineWidth = 2; this.ctx.strokeRect(-16, -16, 32, 32);
        this.ctx.fillStyle = t.color;
        if (t.type === "archer") { this.ctx.beginPath(); this.ctx.moveTo(0, -15); this.ctx.lineTo(10, 10); this.ctx.lineTo(-10, 10); this.ctx.fill(); }
        else if (t.type === "cannon") { this.ctx.fillRect(-12, -12, 24, 24); this.ctx.fillStyle = "black"; this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill(); }
        else if (t.type === "ice") { this.ctx.beginPath(); this.ctx.moveTo(0, -15); this.ctx.lineTo(12, 5); this.ctx.lineTo(0, 15); this.ctx.lineTo(-12, 5); this.ctx.fill(); }
        else if (t.type === "sniper") { this.ctx.beginPath(); this.ctx.arc(0, 0, 10, 0, Math.PI*2); this.ctx.fill(); this.ctx.strokeStyle = "white"; this.ctx.lineWidth = 2; this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(0, -25); this.ctx.stroke(); }
        this.ctx.restore();
    }
    drawEnemy(e) {
        this.ctx.save(); this.ctx.translate(e.x, e.y);
        this.ctx.shadowBlur = 10; this.ctx.shadowColor = e.color;
        this.ctx.fillStyle = e.color; if (e.frozen > 0) this.ctx.fillStyle = "#74b9ff";
        this.ctx.beginPath(); this.ctx.arc(0, 0, e.radius, 0, Math.PI*2); this.ctx.fill();
        this.ctx.shadowBlur = 0;
        const hpPct = e.hp / e.maxHp; this.ctx.fillStyle = "red"; this.ctx.fillRect(-12, -e.radius - 8, 24, 4);
        this.ctx.fillStyle = "#00ff00"; this.ctx.fillRect(-12, -e.radius - 8, 24 * hpPct, 4);
        this.ctx.restore();
    }
}
