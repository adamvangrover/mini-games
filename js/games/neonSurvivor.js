import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonSurvivor {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // Ensure container has relative position for overlay elements
        this.container.style.position = 'relative';

        this.resetGame();

        // Handle resize
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);

        // UI for Level Up
        this.createLevelUpUI();
    }

    createLevelUpUI() {
        this.levelUpOverlay = document.createElement('div');
        this.levelUpOverlay.className = 'absolute inset-0 flex items-center justify-center bg-black/80 hidden z-50';
        this.levelUpOverlay.innerHTML = `
            <div class="bg-slate-800 p-6 rounded-lg border border-fuchsia-500 max-w-lg w-full text-center">
                <h2 class="text-3xl text-fuchsia-400 font-bold mb-4">LEVEL UP!</h2>
                <div id="upgrade-options" class="grid grid-cols-1 gap-4">
                    <!-- Dynamic Options -->
                </div>
            </div>
        `;
        this.container.appendChild(this.levelUpOverlay);
    }

    resetGame() {
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: 10,
            speed: 200,
            hp: 100,
            maxHp: 100,
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            weapons: [
                { type: 'orb', damage: 10, cooldown: 0, maxCooldown: 0.5, range: 150, speed: 300 }
            ],
            orbitAngle: 0,
            upgrades: {
                damage: 1,
                speed: 1,
                area: 1,
                amount: 1,
                magnet: 100,
                armor: 0,
                cooldown: 1
            }
        };

        this.enemies = [];
        this.projectiles = [];
        this.drops = []; // XP gems, health
        this.damageNumbers = [];

        this.gameTime = 0;
        this.enemySpawnTimer = 0;
        this.bossSpawned = false;

        this.isPaused = false;
        this.isGameOver = false;
        this.score = 0;
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        // Re-center player if valid? Or just keep pos.
    }

    update(dt) {
        if (this.isPaused || this.isGameOver) return;

        this.gameTime += dt;
        this.player.orbitAngle += dt * 2; // Spin orbits

        this.handleInput(dt);
        this.spawnEnemies(dt);
        this.updateEntities(dt);
        this.checkCollisions();

        // Update particles
        this.particleSystem.update(dt);
    }

    handleInput(dt) {
        const moveSpeed = this.player.speed * dt;
        let dx = 0;
        let dy = 0;

        if (this.inputManager.isKeyDown('KeyW') || this.inputManager.isKeyDown('ArrowUp')) dy -= 1;
        if (this.inputManager.isKeyDown('KeyS') || this.inputManager.isKeyDown('ArrowDown')) dy += 1;
        if (this.inputManager.isKeyDown('KeyA') || this.inputManager.isKeyDown('ArrowLeft')) dx -= 1;
        if (this.inputManager.isKeyDown('KeyD') || this.inputManager.isKeyDown('ArrowRight')) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx*dx + dy*dy);
            dx /= length;
            dy /= length;

            this.player.x += dx * moveSpeed;
            this.player.y += dy * moveSpeed;

            // Bounds check
            this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
            this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));
        }
    }

    spawnEnemies(dt) {
        // Boss Spawn
        if (!this.bossSpawned && this.gameTime > 60) {
            this.bossSpawned = true;
            this.enemies.push({
                x: this.canvas.width/2, y: -100,
                type: 'boss',
                radius: 40,
                speed: 30,
                hp: 2000,
                maxHp: 2000,
                color: '#f00',
                isBoss: true
            });
            this.soundManager.playSound('powerup'); // Warning sound
            return;
        }

        this.enemySpawnTimer -= dt;
        if (this.enemySpawnTimer <= 0) {
            const spawnRate = Math.max(0.1, 1.0 - (this.gameTime / 60) * 0.1); // Spawns faster over time
            this.enemySpawnTimer = spawnRate;

            // Spawn at edge
            let x, y;
            if (Math.random() < 0.5) {
                x = Math.random() < 0.5 ? -20 : this.canvas.width + 20;
                y = Math.random() * this.canvas.height;
            } else {
                x = Math.random() * this.canvas.width;
                y = Math.random() < 0.5 ? -20 : this.canvas.height + 20;
            }

            const rand = Math.random();
            let type = 'weak';

            if (this.gameTime > 30 && rand < 0.2) type = 'charger';
            else if (rand < Math.min(0.5, this.gameTime / 120)) type = 'strong';

            let enemy = {
                x, y,
                type,
                radius: 10,
                speed: 80,
                hp: 20,
                maxHp: 20,
                color: '#f00'
            };

            if (type === 'strong') {
                enemy.radius = 15;
                enemy.speed = 50;
                enemy.hp = 50;
                enemy.maxHp = 50;
                enemy.color = '#f0f';
            } else if (type === 'charger') {
                enemy.radius = 8;
                enemy.speed = 180; // Fast
                enemy.hp = 15;
                enemy.maxHp = 15;
                enemy.color = '#fa0';
            }

            this.enemies.push(enemy);
        }
    }

    updateEntities(dt) {
        // Weapons
        this.player.weapons.forEach(w => {
            if (w.type === 'orb') {
                w.cooldown -= dt;
                if (w.cooldown <= 0) {
                    const target = this.getNearestEnemy(this.player.x, this.player.y, w.range * this.player.upgrades.area);
                    if (target) {
                        w.cooldown = w.maxCooldown * this.player.upgrades.cooldown;
                        const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
                        // Fan out projectiles if amount > 1
                        const count = this.player.upgrades.amount || 1;
                        for(let i=0; i<count; i++) {
                            const spread = (i - (count-1)/2) * 0.2;
                            this.projectiles.push({
                                x: this.player.x,
                                y: this.player.y,
                                vx: Math.cos(angle + spread) * w.speed,
                                vy: Math.sin(angle + spread) * w.speed,
                                damage: w.damage * this.player.upgrades.damage,
                                radius: 4,
                                life: 2,
                                color: '#0ff',
                                type: 'bullet'
                            });
                        }
                        this.soundManager.playSound('laser');
                    }
                }
            } else if (w.type === 'shield') {
                // Logic in checkCollisions
            } else if (w.type === 'missile') {
                w.cooldown -= dt;
                if (w.cooldown <= 0) {
                    w.cooldown = w.maxCooldown * 1.5 * this.player.upgrades.cooldown;
                    const target = this.getNearestEnemy(this.player.x, this.player.y, 400);
                     if (target) {
                        this.projectiles.push({
                            x: this.player.x,
                            y: this.player.y,
                            vx: 0, vy: 0, // Homing logic needed
                            target: target,
                            speed: 250,
                            damage: 20 * this.player.upgrades.damage,
                            radius: 6,
                            life: 3,
                            color: '#fa0',
                            type: 'homing'
                        });
                     }
                }
            } else if (w.type === 'laser') {
                w.cooldown -= dt;
                if (w.cooldown <= 0) {
                     w.cooldown = w.maxCooldown * this.player.upgrades.cooldown;
                     // Fire giant beam in facing direction (or random/nearest)
                     // Let's go nearest
                     const target = this.getNearestEnemy(this.player.x, this.player.y, 600);
                     const angle = target ? Math.atan2(target.y - this.player.y, target.x - this.player.x) : Math.random() * Math.PI * 2;

                     this.projectiles.push({
                         x: this.player.x,
                         y: this.player.y,
                         angle: angle,
                         life: 0.2, // Instant flash
                         damage: 50 * this.player.upgrades.damage,
                         type: 'laser',
                         width: 20 * this.player.upgrades.area
                     });
                     this.soundManager.playSound('powerup'); // Zap sound
                }
            }
        });

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];

            if (p.type === 'homing') {
                if (p.target && p.target.hp > 0) {
                    const dx = p.target.x - p.x;
                    const dy = p.target.y - p.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    p.vx = (dx/dist) * p.speed;
                    p.vy = (dy/dist) * p.speed;
                }
            }

            if (p.type !== 'laser') {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
            }

            p.life -= dt;
            if (p.life <= 0) this.projectiles.splice(i, 1);
        }

        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 0) {
                e.x += (dx / dist) * e.speed * dt;
                e.y += (dy / dist) * e.speed * dt;
            }

            // Push separation
             for (let j = i + 1; j < this.enemies.length; j++) {
                 const e2 = this.enemies[j];
                 const ddx = e.x - e2.x;
                 const ddy = e.y - e2.y;
                 const ddist = Math.sqrt(ddx*ddx + ddy*ddy);
                 if (ddist < e.radius + e2.radius) {
                     const push = (e.radius + e2.radius - ddist) / 2;
                     e.x += (ddx/ddist) * push;
                     e.y += (ddy/ddist) * push;
                     e2.x -= (ddx/ddist) * push;
                     e2.y -= (ddy/ddist) * push;
                 }
             }
        }

        // Drops (Magnet effect)
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            const dx = this.player.x - d.x;
            const dy = this.player.y - d.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            const magnetRange = this.player.upgrades.magnet;

            if (dist < magnetRange) { // Magnet range
                const pullSpeed = 300 * (1 + (magnetRange - dist)/100);
                d.x += (dx / dist) * pullSpeed * dt;
                d.y += (dy / dist) * pullSpeed * dt;
            }

            if (dist < this.player.radius + d.radius) {
                // Collect
                if (d.type === 'xp') this.addXP(d.value);
                else if (d.type === 'heal') this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);

                this.soundManager.playSound('coin');
                this.drops.splice(i, 1);
            }
        }

        // Damage Numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
             const dn = this.damageNumbers[i];
             dn.y -= 20 * dt;
             dn.life -= dt;
             if(dn.life <= 0) this.damageNumbers.splice(i, 1);
        }
    }

    checkCollisions() {
        // Projectile vs Enemy
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];

            if (p.type === 'laser') {
                // Line collision
                const lx = Math.cos(p.angle);
                const ly = Math.sin(p.angle);

                this.enemies.forEach(e => {
                    // Simple distance from line check, assume infinite length for now or long range
                    // Vector from player to enemy
                    const ex = e.x - this.player.x;
                    const ey = e.y - this.player.y;

                    // Project enemy onto laser vector
                    const dot = ex * lx + ey * ly;
                    if (dot > 0) { // In front
                         const closeX = lx * dot;
                         const closeY = ly * dot;
                         const distSq = (ex-closeX)**2 + (ey-closeY)**2;
                         if (distSq < (p.width/2 + e.radius)**2) {
                             if (!e.immuneTime || e.immuneTime <= 0) {
                                 this.damageEnemy(e, p.damage);
                                 e.immuneTime = 0.2;
                                 this.particleSystem.emit(e.x, e.y, e.color, 5);
                             }
                         }
                    }
                });
                continue;
            }

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                const dx = p.x - e.x;
                const dy = p.y - e.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < p.radius + e.radius) {
                    this.damageEnemy(e, p.damage);
                    this.particleSystem.emit(e.x, e.y, e.color, 3);

                    // Penetration? For now destroy bullet
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }

        // Shield Orbit vs Enemy
        const shield = this.player.weapons.find(w => w.type === 'shield');
        if (shield) {
            const count = this.player.upgrades.amount || 1;
            for(let i=0; i<count; i++) {
                const angle = this.player.orbitAngle + (Math.PI * 2 * i / count);
                const sx = this.player.x + Math.cos(angle) * 60 * this.player.upgrades.area;
                const sy = this.player.y + Math.sin(angle) * 60 * this.player.upgrades.area;

                for (let e of this.enemies) {
                     const dx = sx - e.x;
                     const dy = sy - e.y;
                     if (Math.sqrt(dx*dx + dy*dy) < 15 + e.radius) {
                         if (!e.immuneTime || e.immuneTime <= 0) {
                             this.damageEnemy(e, 5 * this.player.upgrades.damage);
                             e.immuneTime = 0.2; // Tick rate
                             this.particleSystem.emit(e.x, e.y, '#0ff', 1);
                         }
                     }
                }
            }
        }

        // Cooldowns on enemy immunity
        this.enemies.forEach(e => { if(e.immuneTime > 0) e.immuneTime -= 0.016; });

        // Enemy vs Player
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < this.player.radius + e.radius) {
                let dmg = (e.isBoss ? 50 : 10);
                dmg = Math.max(1, dmg - this.player.upgrades.armor); // Armor reduction
                this.player.hp -= dmg * 0.016;
                if (this.player.hp <= 0) {
                    this.gameOver();
                }
            }
        }
    }

    damageEnemy(e, dmg) {
        e.hp -= dmg;
        this.spawnDamageNumber(e.x, e.y, Math.round(dmg));

        if (e.hp <= 0) {
            // Remove
            const index = this.enemies.indexOf(e);
            if (index > -1) {
                this.enemies.splice(index, 1);

                if (e.isBoss) {
                    this.score += 5000;
                    this.drops.push({x: e.x, y: e.y, type: 'heal', radius: 8, color: '#f00', value: 0});
                    this.drops.push({x: e.x, y: e.y, type: 'xp', radius: 8, color: '#ff0', value: 500});
                    // Boss death explosion
                    this.particleSystem.emit(e.x, e.y, '#f00', 50);
                } else {
                    this.drops.push({
                        x: e.x, y: e.y,
                        type: Math.random() < 0.05 ? 'heal' : 'xp',
                        value: e.type === 'strong' ? 50 : 10,
                        radius: 4,
                        color: e.type === 'strong' ? '#0f0' : '#0f0'
                    });
                    this.score += e.type === 'strong' ? 50 : 10;
                }
                this.soundManager.playSound('explosion');
            }
        }
    }

    spawnDamageNumber(x, y, dmg) {
        this.damageNumbers.push({
            x, y,
            text: dmg.toString(),
            life: 0.5,
            color: '#fff'
        });
    }

    addXP(amount) {
        this.player.xp += amount;
        if (this.player.xp >= this.player.xpToNextLevel) {
            this.player.xp -= this.player.xpToNextLevel;
            this.player.level++;
            this.player.xpToNextLevel = Math.floor(this.player.xpToNextLevel * 1.5);
            this.showLevelUp();
        }
    }

    showLevelUp() {
        this.isPaused = true;
        this.levelUpOverlay.classList.remove('hidden');
        const container = document.getElementById('upgrade-options');
        container.innerHTML = '';

        const possibleOptions = [
            { name: 'Damage Up', desc: '+20% Damage', apply: () => this.player.upgrades.damage += 0.2 },
            { name: 'Attack Speed', desc: '+10% Attack Speed', apply: () => this.player.upgrades.cooldown *= 0.9 },
            { name: 'Move Speed', desc: '+10% Movement', apply: () => this.player.speed *= 1.1 },
            { name: 'Multishot', desc: '+1 Projectile', apply: () => this.player.upgrades.amount += 1 },
            { name: 'Area', desc: '+20% Area/Range', apply: () => this.player.upgrades.area += 0.2 },
            { name: 'Magnet', desc: '+50% Pickup Range', apply: () => this.player.upgrades.magnet *= 1.5 },
            { name: 'Armor', desc: '+1 Armor', apply: () => this.player.upgrades.armor += 1 },
            { name: 'Heal', desc: 'Restore 50% HP', apply: () => this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.5) }
        ];

        // Unlock Weapons
        if (!this.player.weapons.find(w => w.type === 'shield')) {
            possibleOptions.push({ name: 'Orbit Shield', desc: 'New Weapon: Shield', apply: () => this.player.weapons.push({ type: 'shield', damage: 5 }) });
        }
        if (!this.player.weapons.find(w => w.type === 'missile')) {
            possibleOptions.push({ name: 'Magic Missile', desc: 'New Weapon: Homing', apply: () => this.player.weapons.push({ type: 'missile', damage: 20, cooldown: 0, maxCooldown: 1.5 }) });
        }
        if (!this.player.weapons.find(w => w.type === 'laser')) {
            possibleOptions.push({ name: 'Ion Beam', desc: 'New Weapon: Laser', apply: () => this.player.weapons.push({ type: 'laser', damage: 40, cooldown: 0, maxCooldown: 3.0 }) });
        }

        // Pick 3 random
        const choices = [];
        while(choices.length < 3 && possibleOptions.length > 0) {
            const idx = Math.floor(Math.random() * possibleOptions.length);
            const opt = possibleOptions[idx];
            choices.push(opt);
            possibleOptions.splice(idx, 1);
        }

        choices.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'bg-slate-700 hover:bg-slate-600 p-4 rounded text-left border border-slate-600 hover:border-fuchsia-400 transition-colors w-full';
            btn.innerHTML = `<div class="font-bold text-white">${opt.name}</div><div class="text-sm text-slate-300">${opt.desc}</div>`;
            btn.onclick = () => {
                opt.apply();
                this.levelUpOverlay.classList.add('hidden');
                this.isPaused = false;
            };
            container.appendChild(btn);
        });
    }

    getNearestEnemy(x, y, range) {
        let nearest = null;
        let minDistSq = range * range;

        for (let e of this.enemies) {
            const dx = e.x - x;
            const dy = e.y - y;
            const distSq = dx*dx + dy*dy;
            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearest = e;
            }
        }
        return nearest;
    }

    gameOver() {
        this.isGameOver = true;
        window.miniGameHub.showGameOver(this.score, () => {
            this.resetGame();
        });
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.shadowBlur = 10;

        // Player
        this.ctx.fillStyle = '#0ff';
        this.ctx.shadowColor = '#0ff';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Orbit Shield
        if (this.player.weapons.find(w => w.type === 'shield')) {
            const count = this.player.upgrades.amount || 1;
            this.ctx.fillStyle = '#0ff';
            for(let i=0; i<count; i++) {
                const angle = this.player.orbitAngle + (Math.PI * 2 * i / count);
                const sx = this.player.x + Math.cos(angle) * 60 * this.player.upgrades.area;
                const sy = this.player.y + Math.sin(angle) * 60 * this.player.upgrades.area;
                this.ctx.beginPath();
                this.ctx.arc(sx, sy, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Enemies
        this.enemies.forEach(e => {
            this.ctx.fillStyle = e.color;
            this.ctx.shadowColor = e.color;
            if (e.isBoss) {
                 this.ctx.beginPath();
                 this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
                 this.ctx.fill();
                 // Boss HP Bar
                 this.ctx.fillStyle = '#333';
                 this.ctx.fillRect(e.x - 40, e.y - 60, 80, 8);
                 this.ctx.fillStyle = '#f00';
                 this.ctx.fillRect(e.x - 40, e.y - 60, 80 * (e.hp/e.maxHp), 8);
            } else {
                this.ctx.fillRect(e.x - e.radius, e.y - e.radius, e.radius*2, e.radius*2);
            }
        });

        // Projectiles
        this.projectiles.forEach(p => {
            this.ctx.fillStyle = p.type === 'laser' ? '#f0f' : p.color;
            this.ctx.shadowColor = p.color;

            if (p.type === 'laser') {
                 this.ctx.save();
                 this.ctx.translate(p.x, p.y);
                 this.ctx.rotate(p.angle);
                 this.ctx.fillStyle = `rgba(255, 0, 255, ${p.life * 5})`; // Fade out
                 this.ctx.fillRect(0, -p.width/2, 1000, p.width);
                 this.ctx.restore();
            } else {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Drops
        this.drops.forEach(d => {
            this.ctx.fillStyle = d.color;
            this.ctx.shadowColor = d.color;
            this.ctx.beginPath();
            if (d.type === 'heal') { // Heart
                 this.ctx.arc(d.x, d.y, d.radius, 0, Math.PI*2);
            } else { // Diamond
                this.ctx.moveTo(d.x, d.y - d.radius);
                this.ctx.lineTo(d.x + d.radius, d.y);
                this.ctx.lineTo(d.x, d.y + d.radius);
                this.ctx.lineTo(d.x - d.radius, d.y);
            }
            this.ctx.fill();
        });

        this.particleSystem.draw(this.ctx);

        // Damage Numbers
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#fff';
        this.damageNumbers.forEach(dn => {
            this.ctx.fillText(dn.text, dn.x, dn.y);
        });

        // HUD
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`LVL ${this.player.level}`, 20, 30);
        this.ctx.fillText(`HP ${Math.floor(this.player.hp)}/${this.player.maxHp}`, 20, 60);

        if (this.gameTime < 60) {
            this.ctx.fillText(`Boss in: ${Math.ceil(60 - this.gameTime)}`, this.canvas.width/2 - 50, 30);
        } else if (this.bossSpawned && this.enemies.find(e => e.isBoss)) {
            this.ctx.fillStyle = '#f00';
            this.ctx.fillText(`BOSS FIGHT`, this.canvas.width/2 - 60, 30);
        }

        // XP Bar
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 0, this.canvas.width, 5);
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillRect(0, 0, (this.player.xp / this.player.xpToNextLevel) * this.canvas.width, 5);
    }

    async shutdown() {
        this.isPaused = true;
        this.isGameOver = true;
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.canvas) this.canvas.remove();
        if (this.levelUpOverlay) this.levelUpOverlay.remove();
    }
}
