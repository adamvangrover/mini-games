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
