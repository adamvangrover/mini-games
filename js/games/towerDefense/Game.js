import Map from './Map.js';
import Enemy from './Enemy.js';
import Tower from './Tower.js';
import Projectile from './Projectile.js';
import UI from './UI.js';
import { CONFIG } from './config.js';
import SoundManager from '../../core/SoundManager.js';
import ParticleSystem from '../../core/ParticleSystem.js';

export default class Game {
    constructor(container) {
        this.container = container;
        this.canvas = null;
        this.ctx = null;
        this.ui = null;

        this.map = new Map();
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];

        this.money = CONFIG.INITIAL_MONEY;
        this.lives = CONFIG.INITIAL_LIVES;
        this.wave = 1;

        this.selectedBuildType = null;
        this.selectedTower = null;

        this.spawnTimer = 0;
        this.enemiesToSpawn = 0;
        this.waveInProgress = false;

        this.speedMultiplier = 1;
        this.gameActive = false;

        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = CONFIG.MAP_COLS * CONFIG.TILE_SIZE;
        this.canvas.height = CONFIG.MAP_ROWS * CONFIG.TILE_SIZE;
        this.canvas.className = 'block mx-auto border border-cyan-500 bg-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.5)] cursor-crosshair';
        this.ctx = this.canvas.getContext('2d');

        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);

        this.ui = new UI(this.container, this);

        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        this.map.generate();
        this.gameActive = true;
        this.startWave();
    }

    startWave() {
        this.waveInProgress = true;
        this.enemiesToSpawn = 5 + Math.floor(this.wave * 1.5);
        this.spawnTimer = 2.0; // Delay before start
    }

    update(dt) {
        if (!this.gameActive) return;

        dt *= this.speedMultiplier;

        // Spawning
        if (this.enemiesToSpawn > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                this.spawnTimer = Math.max(0.2, 1.5 - this.wave * 0.05);
                this.enemiesToSpawn--;
            }
        } else if (this.enemies.length === 0 && this.waveInProgress) {
            // End of Wave
            this.waveInProgress = false;
            this.wave++;
            setTimeout(() => this.startWave(), 2000); // 2s break
            this.money += 50 + this.wave * 10; // Wave clear bonus
            this.soundManager.playSound('powerup'); // Reusing powerup sound for wave clear
        }

        // Entities
        this.enemies.forEach((e, i) => {
            e.update(dt);
            if (e.reachedEnd) {
                this.lives--;
                this.enemies.splice(i, 1);
                this.soundManager.playSound('hurt');
                this.particleSystem.setShake(5);
            } else if (e.hp <= 0) {
                this.money += e.reward;
                this.enemies.splice(i, 1);
                this.soundManager.playSound('coin');
                this.particleSystem.emit(e.x, e.y, e.color, 8, { speed: 40 });
            }
        });

        this.towers.forEach(t => t.update(dt, this.enemies, (p) => this.addProjectile(p)));

        this.projectiles.forEach((p, i) => {
            p.update(dt);
            if (p.hit) this.projectiles.splice(i, 1);
        });

        // Check Loss
        if (this.lives <= 0) {
            this.gameActive = false;
            if (window.miniGameHub) window.miniGameHub.showGameOver(this.wave, () => this.restart());
        }

        this.ui.update(dt);
        this.particleSystem.update(dt);
    }

    spawnEnemy() {
        this.enemies.push(new Enemy(this.map.waypoints, this.wave));
    }

    addProjectile(data) {
        this.projectiles.push(new Projectile(data));
        // Sound is triggered by Tower but maybe centralized here is better? Tower did it.
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const c = Math.floor(x / CONFIG.TILE_SIZE);
        const r = Math.floor(y / CONFIG.TILE_SIZE);

        if (c < 0 || c >= CONFIG.MAP_COLS || r < 0 || r >= CONFIG.MAP_ROWS) return;

        // Check if existing tower
        const existingTower = this.towers.find(t => t.c === c && t.r === r);

        if (existingTower) {
            this.selectTower(existingTower);
        } else {
            // Attempt build
            this.ui.hideUpgradePanel();
            if (this.selectedBuildType) {
                this.buildTower(c, r);
            }
        }
    }

    selectTowerToBuild(type) {
        if (this.selectedBuildType === type) {
            this.selectedBuildType = null; // Toggle off
        } else {
            this.selectedBuildType = type;
            this.ui.hideUpgradePanel();
        }
    }

    buildTower(c, r) {
        const tile = this.map.getTile(c, r);
        if (tile !== 0) { // Not empty
            this.soundManager.playSound('error');
            return;
        }

        const type = this.selectedBuildType;
        const cost = CONFIG.TOWERS[type.toUpperCase()].cost;

        if (this.money >= cost) {
            this.money -= cost;
            const tower = new Tower(c, r, type);
            this.towers.push(tower);
            this.map.setTile(c, r, 4); // 4 = Tower
            this.soundManager.playSound('click'); // Build sound
            this.particleSystem.emit(tower.x, tower.y, '#ffffff', 15, { speed: 50 });
            this.selectedBuildType = null; // Deselect after build? Or keep for multi-build?
            // Let's keep it selected for easier building multiple
        } else {
            this.soundManager.playSound('error');
        }
    }

    selectTower(tower) {
        this.selectedTower = tower;
        this.ui.showUpgradePanel(tower);
        this.selectedBuildType = null;
    }

    deselectTower() {
        this.selectedTower = null;
    }

    upgradeSelectedTower() {
        if (!this.selectedTower) return;
        const cost = this.selectedTower.getUpgradeCost();
        if (this.money >= cost) {
            this.money -= cost;
            this.selectedTower.upgrade();
            this.soundManager.playSound('powerup');
        } else {
            this.soundManager.playSound('error');
        }
    }

    sellSelectedTower() {
        if (!this.selectedTower) return;
        this.money += this.selectedTower.getSellValue();
        this.map.setTile(this.selectedTower.c, this.selectedTower.r, 0); // Clear tile
        this.towers = this.towers.filter(t => t !== this.selectedTower);
        this.selectedTower = null;
        this.soundManager.playSound('coin');
    }

    toggleSpeed() {
        this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
    }

    restart() {
        this.map.generate();
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.money = CONFIG.INITIAL_MONEY;
        this.lives = CONFIG.INITIAL_LIVES;
        this.wave = 1;
        this.spawnTimer = 0;
        this.enemiesToSpawn = 0;
        this.waveInProgress = false;
        this.speedMultiplier = 1;
        this.gameActive = true;
        this.startWave();
        this.ui.update(); // Reset UI values
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.map.draw(this.ctx);
        this.towers.forEach(t => t.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));

        // Draw selection highlight
        if (this.selectedTower) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(this.selectedTower.x - 32, this.selectedTower.y - 32, 64, 64);

            // Draw range
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.beginPath();
            this.ctx.arc(this.selectedTower.x, this.selectedTower.y, this.selectedTower.range, 0, Math.PI*2);
            this.ctx.fill();
        }

        this.particleSystem.draw(this.ctx);
    }

    shutdown() {
        this.gameActive = false;
        this.ui.cleanup();
    }
}
