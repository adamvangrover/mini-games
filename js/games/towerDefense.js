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
}
