import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonCentipede {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;

        this.player = { x: 0, y: 0, w: 20, h: 20, speed: 300, cooldown: 0, active: true };
        this.bullets = [];
        this.centipede = [];
        this.mushrooms = [];
        this.spiders = [];

        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.state = 'START';

        this.keys = {};
        this.lastTime = 0;
        this.gridSize = 20;

        this.colors = {
            player: '#0f0',
            bullet: '#fff',
            centipedeHead: '#f00',
            centipedeBody: '#fa0',
            mushroomFull: '#a0f',
            mushroomDamaged: '#50a',
            spider: '#0ff'
        };
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = "game-container relative w-full h-full min-h-screen bg-black overflow-hidden";

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimize by disabling alpha
        this.canvas.className = "w-full h-full object-contain";
        this.container.appendChild(this.canvas);

        // HUD
        const hud = document.createElement('div');
        hud.className = "absolute top-0 left-0 w-full p-4 flex justify-between font-mono text-green-400 pointer-events-none z-10";
        hud.innerHTML = `
            <div>SCORE: <span id="centipede-score">0</span></div>
            <div id="centipede-msg" class="absolute top-20 left-1/2 -translate-x-1/2 text-center text-yellow-400 font-bold text-xl opacity-0 transition-opacity drop-shadow-md"></div>
            <div>LIVES: <span id="centipede-lives">3</span></div>
        `;
        this.container.appendChild(hud);

        // Mobile Controls
        const controls = document.createElement('div');
        controls.className = "absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none md:hidden";
        controls.innerHTML = `
            <div class="flex gap-4 pointer-events-auto">
                <button id="cent-left" class="w-16 h-16 bg-white/10 rounded-full border border-white/20 active:bg-white/30 backdrop-blur"><i class="fas fa-arrow-left text-white"></i></button>
                <button id="cent-right" class="w-16 h-16 bg-white/10 rounded-full border border-white/20 active:bg-white/30 backdrop-blur"><i class="fas fa-arrow-right text-white"></i></button>
            </div>
            <button id="cent-fire" class="pointer-events-auto w-20 h-20 bg-red-500/20 rounded-full border border-red-500/50 active:bg-red-500/40 flex items-center justify-center backdrop-blur"><i class="fas fa-crosshairs text-red-400"></i></button>
        `;
        this.container.appendChild(controls);

        this.resize();
        window.addEventListener('resize', this.handleResize);

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        const bindBtn = (id, key) => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[key] = true; });
                el.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[key] = false; });
            }
        };
        bindBtn('cent-left', 'ArrowLeft');
        bindBtn('cent-right', 'ArrowRight');
        bindBtn('cent-fire', ' ');

        SaveSystem.getInstance().incrementStat('total_games_played');

        this.startLevel();
        this.lastTime = performance.now();
        this.loop();
    }

    handleResize = () => this.resize();
    handleKeyDown = (e) => this.keys[e.key] = true;
    handleKeyUp = (e) => this.keys[e.key] = false;

    resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.cols = Math.floor(this.canvas.width / this.gridSize);
        this.rows = Math.floor(this.canvas.height / this.gridSize);
        if (this.player) {
            this.player.y = this.canvas.height - this.gridSize * 2;
            if (!this.player.active) this.player.x = this.canvas.width / 2;
        }
    }

    showMessage(text, duration=2000, color='text-yellow-400') {
        const el = document.getElementById('centipede-msg');
        if(!el) return;
        el.className = `absolute top-20 left-1/2 -translate-x-1/2 text-center font-bold text-xl opacity-0 transition-opacity drop-shadow-md ${color}`;
        el.textContent = text;
        el.classList.remove('opacity-0');
        setTimeout(() => el.classList.add('opacity-0'), duration);
    }

    startLevel() {
        this.bullets = [];
        this.centipede = [];
        this.spiders = [];

        this.showMessage(`LEVEL ${this.level}`);

        // Spawn Mushrooms
        const numMushrooms = 30 + this.level * 5;
        // Keep existing mushrooms if any, otherwise generate
        if (this.mushrooms.length === 0) {
            for (let i = 0; i < numMushrooms; i++) {
                const c = Math.floor(Math.random() * this.cols);
                const r = Math.floor(Math.random() * (this.rows - 5)) + 1; // Don't spawn too close to bottom/top
                if (!this.mushrooms.some(m => m.c === c && m.r === r)) {
                    this.mushrooms.push({ c, r, hp: 4 });
                }
            }
        } else {
             // Heal remaining mushrooms (score logic goes here usually)
             this.mushrooms.forEach(m => m.hp = 4);
        }

        // Spawn Centipede
        const length = 10 + Math.min(10, this.level);
        for (let i = 0; i < length; i++) {
            this.centipede.push({
                x: (this.cols / 2) * this.gridSize,
                y: -i * this.gridSize,
                c: Math.floor(this.cols / 2),
                r: -i,
                dx: 1, // 1 for right, -1 for left
                dy: 0,
                speed: 100 + this.level * 10,
                isHead: i === 0,
                targetR: -i,
                targetC: Math.floor(this.cols / 2)
            });
        }

        this.player.active = true;
        this.player.x = this.canvas.width / 2;
        this.state = 'PLAY';
    }

    update(dt) {
        if (!this.scoreEl) this.scoreEl = document.getElementById('centipede-score');
        if (!this.livesEl) this.livesEl = document.getElementById('centipede-lives');

        if (this.player.active) {
            let moveX = 0;
            let moveY = 0;
            if (this.keys['ArrowLeft']) moveX -= 1;
            if (this.keys['ArrowRight']) moveX += 1;
            if (this.keys['ArrowUp']) moveY -= 1;
            if (this.keys['ArrowDown']) moveY += 1;

            // Normalize diagonal movement using Bolt standard
            if (moveX !== 0 && moveY !== 0) {
                moveX *= Math.SQRT1_2;
                moveY *= Math.SQRT1_2;
            }

            this.player.x += moveX * this.player.speed * dt;
            this.player.y += moveY * this.player.speed * dt;

            // Constrain player to bottom quarter of screen
            const minY = this.canvas.height - (this.canvas.height / 4);
            this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.w, this.player.x));
            this.player.y = Math.max(minY, Math.min(this.canvas.height - this.player.h, this.player.y));

            if (this.player.cooldown > 0) this.player.cooldown -= dt;
            if ((this.keys[' '] || this.keys['z']) && this.player.cooldown <= 0) {
                this.fireBullet();
            }
        }

        // Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.y -= 500 * dt;

            if (b.y < 0) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Bullet vs Mushroom
            const bc = Math.floor(b.x / this.gridSize);
            const br = Math.floor(b.y / this.gridSize);
            const mIdx = this.mushrooms.findIndex(m => m.c === bc && m.r === br);
            if (mIdx !== -1) {
                this.mushrooms[mIdx].hp--;
                this.bullets.splice(i, 1);
                if (this.mushrooms[mIdx].hp <= 0) {
                    this.score += 1;
                    this.updateScore();
                    this.mushrooms.splice(mIdx, 1);
                }
                ParticleSystem.getInstance().emit(b.x, b.y, this.colors.mushroomFull, 5);
                window.miniGameHub.soundManager.playSound('hit');
                continue;
            }

            // Bullet vs Centipede
            let hitCentipede = false;
            for (let j = 0; j < this.centipede.length; j++) {
                const seg = this.centipede[j];
                if (Math.abs(b.x - (seg.x + this.gridSize/2)) < this.gridSize/2 && Math.abs(b.y - (seg.y + this.gridSize/2)) < this.gridSize/2) {
                    this.bullets.splice(i, 1);
                    hitCentipede = true;

                    // Split centipede
                    this.score += seg.isHead ? 100 : 10;
                    this.updateScore();
                    ParticleSystem.getInstance().emit(seg.x, seg.y, seg.isHead ? this.colors.centipedeHead : this.colors.centipedeBody, 10);
                    window.miniGameHub.soundManager.playSound('explosion');

                    // Turn segment into mushroom
                    this.mushrooms.push({c: Math.floor(seg.x/this.gridSize), r: Math.floor(seg.y/this.gridSize), hp: 4});

                    // Remove segment
                    this.centipede.splice(j, 1);

                    // Next segment becomes a head
                    if (j < this.centipede.length) {
                        this.centipede[j].isHead = true;
                    }
                    break;
                }
            }
            if (hitCentipede) continue;
        }

        // Centipede Movement
        for (let i = 0; i < this.centipede.length; i++) {
            const seg = this.centipede[i];

            // Move towards target grid position
            const tx = seg.targetC * this.gridSize;
            const ty = seg.targetR * this.gridSize;

            const dx = tx - seg.x;
            const dy = ty - seg.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < 1) {
                // Reached target, calculate next
                seg.x = tx;
                seg.y = ty;
                seg.c = seg.targetC;
                seg.r = seg.targetR;

                let nextC = seg.c + seg.dx;
                let nextR = seg.r;

                // Check bounds and mushrooms
                const hitWall = nextC < 0 || nextC >= this.cols;
                const hitMushroom = this.mushrooms.some(m => m.c === nextC && m.r === nextR);

                if (hitWall || hitMushroom) {
                    seg.dx *= -1; // Reverse direction
                    seg.targetR = seg.r + 1; // Move down
                    if (seg.targetR >= this.rows) {
                        seg.targetR = this.rows - 1; // Stay at bottom
                        // In real centipede they move back up, simplified here
                    }
                } else {
                    seg.targetC = nextC;
                }
            } else {
                // Move towards target
                const moveDist = seg.speed * dt;
                if (moveDist > dist) {
                    seg.x = tx;
                    seg.y = ty;
                } else {
                    seg.x += (dx / dist) * moveDist;
                    seg.y += (dy / dist) * moveDist;
                }
            }

            // Player collision
            if (this.player.active &&
                Math.abs((this.player.x + this.player.w/2) - (seg.x + this.gridSize/2)) < (this.player.w/2 + this.gridSize/2 - 5) &&
                Math.abs((this.player.y + this.player.h/2) - (seg.y + this.gridSize/2)) < (this.player.h/2 + this.gridSize/2 - 5)) {
                this.handlePlayerHit();
            }
        }

        if (this.centipede.length === 0) {
            this.level++;
            this.startLevel();
        }

        ParticleSystem.getInstance().update(dt);
    }

    updateScore() {
        if (this.scoreEl && this.lastScore !== this.score) {
            this.scoreEl.textContent = this.score;
            this.lastScore = this.score;
        }
    }

    fireBullet() {
        // Only one bullet active at a time to match classic feel
        if (this.bullets.length < 1) {
            this.bullets.push({x: this.player.x + this.player.w / 2, y: this.player.y});
            this.player.cooldown = 0.1;
            window.miniGameHub.soundManager.playSound('laser');
        }
    }

    handlePlayerHit() {
        if (!this.player.active) return;

        this.lives--;
        if (this.livesEl && this.lastLives !== this.lives) {
            this.livesEl.textContent = this.lives;
            this.lastLives = this.lives;
        }
        ParticleSystem.getInstance().emit(this.player.x, this.player.y, '#0ff', 30);
        window.miniGameHub.soundManager.playSound('explosion');

        if (this.lives <= 0) {
            this.player.active = false;
            this.state = 'GAMEOVER';
            window.miniGameHub.showGameOver(this.score, () => {
                this.lives = 3;
                this.score = 0;
                this.level = 1;
                this.mushrooms = [];
                if (this.livesEl) {
                    this.livesEl.textContent = 3;
                    this.lastLives = 3;
                }
                this.updateScore();
                this.startLevel();
            });
        } else {
            this.player.active = false;
            this.centipede = []; // Clear current wave
            setTimeout(() => {
                // Restart wave logic
                this.startLevel();
            }, 1000);
        }
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.fillStyle = '#000';
        // Optimization: fillRect instead of clearRect since we don't need alpha
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Mushrooms
        for (let i = 0; i < this.mushrooms.length; i++) {
            const m = this.mushrooms[i];
            this.ctx.fillStyle = m.hp === 4 ? this.colors.mushroomFull : this.colors.mushroomDamaged;
            const size = this.gridSize - (4 - m.hp) * 2;
            const offset = (this.gridSize - size) / 2;
            // Optimization: Avoid anti-aliasing via bitwise OR 0
            this.ctx.fillRect((m.c * this.gridSize + offset) | 0, (m.r * this.gridSize + offset) | 0, size | 0, size | 0);
        }

        // Draw Centipede
        for (let i = 0; i < this.centipede.length; i++) {
            const seg = this.centipede[i];
            this.ctx.fillStyle = seg.isHead ? this.colors.centipedeHead : this.colors.centipedeBody;
            this.ctx.beginPath();
            // Optimization: Replace ctx.arc with ctx.fillRect per project guidelines for simple shapes
            const r = this.gridSize / 2 - 2;
            this.ctx.fillRect((seg.x + this.gridSize/2 - r) | 0, (seg.y + this.gridSize/2 - r) | 0, (r * 2) | 0, (r * 2) | 0);
        }

        // Draw Bullets
        this.ctx.fillStyle = this.colors.bullet;
        for (let i = 0; i < this.bullets.length; i++) {
            const b = this.bullets[i];
            this.ctx.fillRect((b.x - 2) | 0, (b.y - 8) | 0, 4, 16);
        }

        // Draw Player
        if (this.player.active) {
            this.ctx.fillStyle = this.colors.player;
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x + this.player.w / 2, this.player.y);
            this.ctx.lineTo(this.player.x + this.player.w, this.player.y + this.player.h);
            this.ctx.lineTo(this.player.x, this.player.y + this.player.h);
            this.ctx.fill();
        }

        ParticleSystem.getInstance().draw(this.ctx);
    }

    loop() {
        if (!this.ctx) return;
        requestAnimationFrame(() => this.loop());

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        if (this.state === 'PLAY') {
            this.update(dt);
        }
        this.draw();
    }

    shutdown() {
        this.ctx = null;
        this.container.innerHTML = '';
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('resize', this.handleResize);
    }
}
