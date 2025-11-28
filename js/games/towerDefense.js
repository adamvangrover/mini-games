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
