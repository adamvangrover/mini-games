import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonGalagaGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        
        this.player = { x: 0, y: 0, w: 30, h: 30, dx: 0, cooldown: 0, dual: false, active: true };
        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = []; 
        this.tractorBeam = null; 
        
        this.particles = [];
        this.stars = [];
        this.floatingTexts = []; // {x, y, text, life, color}
        
        this.wave = 1;
        this.score = 0;
        this.lives = 3;
        this.state = 'START'; 
        
        this.keys = {};
        this.lastTime = 0;
        this.formationOffset = 0;
        this.formationDir = 1;
        this.formationBreathing = 0;
        
        this.diveTimer = 0;
        this.stats = { enemies: 0 };
        this.isChallengeStage = false;
        this.challengeSpawnTimer = 0;
        this.challengeGroupCount = 0;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = "game-container relative w-full h-full min-h-screen bg-black overflow-hidden";
        
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.className = "w-full h-full object-contain";
        this.container.appendChild(this.canvas);
        
        // HUD
        const hud = document.createElement('div');
        hud.className = "absolute top-0 left-0 w-full p-4 flex justify-between font-mono text-cyan-400 pointer-events-none z-10";
        hud.innerHTML = `
            <div>SCORE: <span id="galaga-score">0</span></div>
            <div id="galaga-msg" class="absolute top-20 left-1/2 -translate-x-1/2 text-center text-yellow-400 font-bold text-xl opacity-0 transition-opacity drop-shadow-md"></div>
            <div>LIVES: <span id="galaga-lives">3</span></div>
        `;
        this.container.appendChild(hud);
        
        // Mobile Controls
        const controls = document.createElement('div');
        controls.className = "absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none md:hidden";
        controls.innerHTML = `
            <div class="flex gap-4 pointer-events-auto">
                <button id="gal-left" class="w-16 h-16 bg-white/10 rounded-full border border-white/20 active:bg-white/30 backdrop-blur"><i class="fas fa-arrow-left text-white"></i></button>
                <button id="gal-right" class="w-16 h-16 bg-white/10 rounded-full border border-white/20 active:bg-white/30 backdrop-blur"><i class="fas fa-arrow-right text-white"></i></button>
            </div>
            <button id="gal-fire" class="pointer-events-auto w-20 h-20 bg-red-500/20 rounded-full border border-red-500/50 active:bg-red-500/40 flex items-center justify-center backdrop-blur"><i class="fas fa-crosshairs text-red-400"></i></button>
        `;
        this.container.appendChild(controls);

        this.resize();
        window.addEventListener('resize', () => this.resize());

        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);

        const bindBtn = (id, key) => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[key] = true; });
                el.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[key] = false; });
            }
        };
        bindBtn('gal-left', 'ArrowLeft');
        bindBtn('gal-right', 'ArrowRight');
        bindBtn('gal-fire', ' ');

        this.initStars();
        SaveSystem.getInstance().incrementStat('total_games_played');

        this.startWave();
        this.lastTime = performance.now();
        this.loop();
    }

    resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        if (this.player) {
            this.player.y = this.canvas.height - 50;
            if (!this.player.active) this.player.x = this.canvas.width / 2;
        }
    }

    initStars() {
        for(let i=0; i<100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                s: Math.random() * 2 + 0.5,
                v: Math.random() * 2 + 0.5,
                color: Math.random() > 0.9 ? '#aaf' : '#fff'
            });
        }
    }
    
    showMessage(text, duration=2000, color='text-yellow-400') {
        const el = document.getElementById('galaga-msg');
        if(!el) return;
        el.className = `absolute top-20 left-1/2 -translate-x-1/2 text-center font-bold text-xl opacity-0 transition-opacity drop-shadow-md ${color}`;
        el.textContent = text;
        el.classList.remove('opacity-0');
        setTimeout(() => el.classList.add('opacity-0'), duration);
    }

    spawnFloatingText(x, y, text, color='#fff') {
        this.floatingTexts.push({x, y, text, color, life: 1.0});
    }

    startWave() {
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.tractorBeam = null;
        this.formationOffset = 0;
        this.isChallengeStage = false;
        
        // Challenge Stage every 3rd wave
        if (this.wave % 3 === 0) {
            this.startChallengeStage();
            return;
        }

        this.showMessage(`WAVE ${this.wave}`);
        
        const rows = 4;
        const cols = 8;
        const startX = (this.canvas.width - (cols * 40)) / 2;
        const startY = 80;
        
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                let type = 'bee';
                let hp = 1;
                if (r === 0) { type = 'boss'; hp = 2; }
                else if (r === 1) { type = 'butterfly'; hp = 1; }
                
                this.enemies.push({
                    x: startX + c * 40,
                    y: startY + r * 40,
                    homeX: startX + c * 40,
                    homeY: startY + r * 40,
                    row: r,
                    col: c,
                    type: type,
                    state: 'GRID', 
                    angle: 0,
                    hp: hp,
                    capturedShip: null 
                });
            }
        }
        
        this.player.active = true;
        this.state = 'PLAY';
    }

    startChallengeStage() {
        this.isChallengeStage = true;
        this.challengeSpawnTimer = 0;
        this.challengeGroupCount = 0;
        this.showMessage("CHALLENGING STAGE", 3000, 'text-cyan-400');
        this.state = 'PLAY';
        window.miniGameHub.soundManager.playSound('powerup');
    }

    updateChallengeStage(dt) {
        this.challengeSpawnTimer -= dt;
        if (this.challengeSpawnTimer <= 0 && this.challengeGroupCount < 5) { // 5 groups
            this.spawnChallengeGroup();
            this.challengeSpawnTimer = 2.5; 
            this.challengeGroupCount++;
        }

        if (this.challengeGroupCount >= 5 && this.enemies.length === 0) {
            this.wave++;
            this.showMessage("PERFECT!", 2000);
            setTimeout(() => this.startWave(), 2000);
        }
    }

    spawnChallengeGroup() {
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const startX = side === 'left' ? -50 : this.canvas.width + 50;
        const startY = 100 + Math.random() * 200;
        
        // Create path: Loop de loop
        const p1 = {x: startX, y: startY};
        const p2 = {x: this.canvas.width/2, y: startY + 100};
        const p3 = {x: this.canvas.width/2, y: startY - 100};
        const p4 = {x: side === 'left' ? this.canvas.width + 50 : -50, y: startY};
        
        const path = this.createCurve(p1, p2, p3, p4);
        
        for(let i=0; i<5; i++) { // 5 enemies per group
            setTimeout(() => {
                this.enemies.push({
                    x: startX,
                    y: startY,
                    type: 'butterfly',
                    state: 'CHALLENGE_PATH',
                    path: path,
                    pathIdx: 0,
                    hp: 1,
                    angle: 0
                });
            }, i * 200);
        }
    }

    update(dt) {
        if (this.player.active) {
            if (this.keys['ArrowLeft']) this.player.x -= 350 * dt;
            if (this.keys['ArrowRight']) this.player.x += 350 * dt;
            this.player.x = Math.max(20, Math.min(this.canvas.width - 20, this.player.x));
            
            if (this.player.cooldown > 0) this.player.cooldown -= dt;
            if ((this.keys[' '] || this.keys['ArrowUp'] || this.keys['z']) && this.player.cooldown <= 0) {
                this.fireBullet();
            }
        }

        this.bullets.forEach(b => { b.y -= 700 * dt; if (b.y < -10) b.active = false; });
        this.bullets = this.bullets.filter(b => b.active);

        this.enemyBullets.forEach(b => {
             b.y += 350 * dt;
             if (this.player.active && Math.abs(b.x - this.player.x) < 15 && Math.abs(b.y - this.player.y) < 15) {
                 this.handlePlayerHit();
                 b.active = false;
             }
             if (b.y > this.canvas.height) b.active = false;
        });
        this.enemyBullets = this.enemyBullets.filter(b => b.active);

        if (this.isChallengeStage) {
            this.updateChallengeStage(dt);
        } else {
            // Normal Grid Logic
            this.formationBreathing += dt * 2;
            const breathing = Math.sin(this.formationBreathing) * 10;
            
            this.formationOffset += 50 * dt * this.formationDir;
            if (Math.abs(this.formationOffset) > 60) this.formationDir *= -1;

            this.diveTimer += dt;
            if (this.diveTimer > (3 - Math.min(2, this.wave * 0.2)) && this.enemies.some(e => e.state === 'GRID')) { // Faster dives per wave
                this.diveTimer = 0;
                const candidates = this.enemies.filter(e => e.state === 'GRID');
                if (candidates.length > 0) {
                    const diver = candidates[Math.floor(Math.random() * candidates.length)];
                    this.startDive(diver);
                }
            }
        }

        // Tractor Beam
        if (this.tractorBeam) {
            this.tractorBeam.h += 150 * dt;
            if (this.tractorBeam.h > 350) this.tractorBeam.h = 350;
            this.tractorBeam.angle += dt * 5; // Rotation effect
            
            if (this.player.active && Math.abs(this.player.x - this.tractorBeam.x) < 25 && 
                this.player.y > this.tractorBeam.y && this.player.y < this.tractorBeam.y + this.tractorBeam.h) {
                this.playerCaptured(this.tractorBeam.host);
            }
            
            this.tractorBeam.timer -= dt;
            if (this.tractorBeam.timer <= 0 || this.tractorBeam.host.hp <= 0) {
                this.tractorBeam = null;
                if (this.tractorBeam && this.tractorBeam.host) this.tractorBeam.host.state = 'RETURN';
            }
        }

        this.enemies.forEach(e => {
            this.updateEnemy(e, dt, this.isChallengeStage);
        });

        // Bullet Collisions
        this.bullets.forEach(b => {
            this.enemies.forEach(e => {
                if (e.hp > 0 && Math.abs(b.x - e.x) < 25 && Math.abs(b.y - e.y) < 25) {
                    b.active = false;
                    this.damageEnemy(e);
                }
            });
        });

        this.enemies = this.enemies.filter(e => e.hp > 0 || e.capturedShip);
        
        if (!this.isChallengeStage && this.enemies.filter(e=>e.hp>0).length === 0) {
            this.wave++;
            this.lives++;
            this.showMessage("WAVE COMPLETE! EXTRA LIFE", 2000, 'text-green-400');
            document.getElementById('galaga-lives').textContent = this.lives;
            this.startWave();
        }

        // Floating Texts
        this.floatingTexts.forEach(t => {
            t.y -= 20 * dt;
            t.life -= dt;
        });
        this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);

        // Stars
        this.stars.forEach(s => {
            s.y += s.v * 60 * dt * (this.isChallengeStage ? 4 : 1); // Warp speed in challenge
            if (s.y > this.canvas.height) s.y = 0;
        });
        
        ParticleSystem.getInstance().update(dt);
    }
    
    startDive(e) {
        e.state = 'DIVE';
        if (e.type === 'boss' && !this.tractorBeam && this.player.active && !this.player.dual && Math.random() < 0.4) {
            e.state = 'BEAM_POSITION';
             const p1 = {x: e.x, y: e.y};
             const p2 = {x: this.player.x, y: e.y + 100}; 
             const p3 = {x: this.player.x, y: this.player.y - 150}; 
             e.path = this.createCurve(p1, {x: (p1.x+p3.x)/2, y: p1.y}, p2, p3);
        } else {
            const p1 = {x: e.x, y: e.y};
            const p2 = {x: e.x - 100 + Math.random()*200, y: e.y + 100};
            const p3 = {x: this.player.x, y: this.player.y}; 
            const p4 = {x: this.player.x, y: this.canvas.height + 50};
            e.path = this.createCurve(p1, p2, p3, p4);
        }
        e.pathIdx = 0;
    }
    
    updateEnemy(e, dt, challenge) {
        if (challenge && e.state === 'CHALLENGE_PATH') {
             if (e.path && e.pathIdx < e.path.length) {
                const p = e.path[Math.floor(e.pathIdx)];
                e.x = p.x;
                e.y = p.y;
                if (e.pathIdx + 1 < e.path.length) {
                    const next = e.path[Math.floor(e.pathIdx)+1];
                    e.angle = Math.atan2(next.y - e.y, next.x - e.x) + Math.PI/2;
                }
                e.pathIdx += 60 * dt * 5; 
            } else {
                e.hp = 0; // Left screen
            }
            return;
        }

        if (e.state === 'GRID') {
            const breathing = Math.sin(this.formationBreathing) * (e.col - 3.5) * 5;
            e.x = e.homeX + this.formationOffset + breathing;
            e.y = e.homeY + Math.cos(this.formationBreathing) * 5;
            e.angle = 0;
        } 
        else if (e.state === 'DIVE') {
            if (e.path && e.pathIdx < e.path.length) {
                const p = e.path[Math.floor(e.pathIdx)];
                e.x = p.x;
                e.y = p.y;
                if (e.pathIdx + 1 < e.path.length) {
                    const next = e.path[Math.floor(e.pathIdx)+1];
                    e.angle = Math.atan2(next.y - e.y, next.x - e.x) + Math.PI/2;
                }
                e.pathIdx += 60 * dt * 4; 
                if (Math.random() < 0.02) this.enemyFire(e);
            } else {
                e.y = -50;
                e.state = 'RETURN';
            }
        }
        else if (e.state === 'BEAM_POSITION') {
             if (e.path && e.pathIdx < e.path.length) {
                const p = e.path[Math.floor(e.pathIdx)];
                e.x = p.x;
                e.y = p.y;
                e.pathIdx += 60 * dt * 3;
            } else {
                e.state = 'BEAM_ACTIVE';
                this.tractorBeam = {
                    x: e.x, y: e.y + 20, h: 0, width: 40,
                    host: e, timer: 4.0, angle: 0
                };
                window.miniGameHub.soundManager.playSound('powerup');
            }
        }
        else if (e.state === 'BEAM_ACTIVE') {
            if (this.tractorBeam) {
                this.tractorBeam.x = e.x;
                this.tractorBeam.y = e.y + 20;
            } else {
                e.state = 'RETURN';
            }
        }
        else if (e.state === 'RETURN') {
            const dx = (e.homeX + this.formationOffset) - e.x;
            const dy = e.homeY - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 5) {
                e.state = 'GRID';
            } else {
                e.x += (dx/dist) * 300 * dt;
                e.y += (dy/dist) * 300 * dt;
                e.angle = Math.atan2(dy, dx) + Math.PI/2;
            }
        }
    }
    
    enemyFire(e) {
        this.enemyBullets.push({x: e.x, y: e.y + 10, active: true});
    }

    fireBullet() {
        this.bullets.push({x: this.player.x, y: this.player.y - 20, active: true});
        if (this.player.dual) {
            this.bullets.push({x: this.player.x - 20, y: this.player.y - 20, active: true});
            this.bullets.push({x: this.player.x + 20, y: this.player.y - 20, active: true});
        }
        this.player.cooldown = 0.15;
        window.miniGameHub.soundManager.playSound('laser');
    }

    damageEnemy(e) {
        e.hp--;
        if (e.hp <= 0) {
            const val = (e.type === 'boss' ? 150 : (e.type === 'butterfly' ? 80 : 50));
            this.score += val;
            this.spawnFloatingText(e.x, e.y, `+${val}`);
            
            document.getElementById('galaga-score').textContent = this.score;
            ParticleSystem.getInstance().emit(e.x, e.y, '#f0f', 15);
            window.miniGameHub.soundManager.playSound('explosion');
            
            this.stats.enemies++;
            SaveSystem.getInstance().incrementStat('galaga_enemies');
            
            if (e.capturedShip) {
                this.player.dual = true;
                this.showMessage("DUAL FIGHTER!", 2000, 'text-cyan-300');
                window.miniGameHub.soundManager.playSound('powerup');
                e.capturedShip = null;
            }
            if (this.tractorBeam && this.tractorBeam.host === e) {
                this.tractorBeam = null;
            }
        } else {
            window.miniGameHub.soundManager.playSound('click');
        }
    }

    playerCaptured(host) {
        if (!this.player.active) return;
        this.player.active = false;
        this.tractorBeam = null;
        host.state = 'RETURN';
        host.capturedShip = { type: 'player' };
        
        this.lives--;
        document.getElementById('galaga-lives').textContent = this.lives;
        
        if (this.lives <= 0) {
            this.state = 'GAMEOVER';
            window.miniGameHub.showGameOver(this.score, () => {
                this.lives = 3;
                this.score = 0;
                document.getElementById('galaga-lives').textContent = 3;
                document.getElementById('galaga-score').textContent = 0;
                this.player.dual = false;
                this.startWave();
            });
        } else {
            setTimeout(() => {
                this.player.x = this.canvas.width/2;
                this.player.y = this.canvas.height - 50;
                this.player.active = true;
                this.player.cooldown = 2.0; 
            }, 2000);
        }
    }

    handlePlayerHit() {
        if (!this.player.active) return;
        
        if (this.player.dual) {
            this.player.dual = false;
            ParticleSystem.getInstance().emit(this.player.x + 20, this.player.y, '#0ff', 20);
            window.miniGameHub.soundManager.playSound('explosion');
        } else {
            this.lives--;
            document.getElementById('galaga-lives').textContent = this.lives;
            ParticleSystem.getInstance().emit(this.player.x, this.player.y, '#0ff', 30);
            window.miniGameHub.soundManager.playSound('explosion');
            
            if (this.lives <= 0) {
                this.player.active = false;
                this.state = 'GAMEOVER';
                window.miniGameHub.showGameOver(this.score, () => {
                    this.lives = 3;
                    this.score = 0;
                    document.getElementById('galaga-lives').textContent = 3;
                    document.getElementById('galaga-score').textContent = 0;
                    this.player.dual = false;
                    this.startWave();
                });
            } else {
                this.player.active = false;
                 setTimeout(() => {
                    this.player.active = true;
                    this.player.cooldown = 1.0;
                }, 1000);
            }
        }
    }

    createCurve(p0, p1, p2, p3) {
        const points = [];
        for (let t = 0; t <= 1; t += 0.02) {
            const x = Math.pow(1-t, 3)*p0.x + 3*Math.pow(1-t, 2)*t*p1.x + 3*(1-t)*Math.pow(t, 2)*p2.x + Math.pow(t, 3)*p3.x;
            const y = Math.pow(1-t, 3)*p0.y + 3*Math.pow(1-t, 2)*t*p1.y + 3*(1-t)*Math.pow(t, 2)*p2.y + Math.pow(t, 3)*p3.y;
            points.push({x, y});
        }
        return points;
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fff';
        this.stars.forEach(s => {
            this.ctx.globalAlpha = Math.random();
            this.ctx.fillStyle = s.color || '#fff';
            this.ctx.fillRect(s.x, s.y, s.s, s.s);
        });
        this.ctx.globalAlpha = 1;

        if (this.tractorBeam) {
            this.ctx.save();
            this.ctx.translate(this.tractorBeam.x, this.tractorBeam.y);
            const grad = this.ctx.createLinearGradient(0, 0, 0, this.tractorBeam.h);
            grad.addColorStop(0, 'rgba(0, 255, 255, 0.6)'); // Cyan beam
            grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
            this.ctx.fillStyle = grad;
            
            // Wavy beam effect
            this.ctx.beginPath();
            const w = this.tractorBeam.width;
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(w, this.tractorBeam.h);
            this.ctx.lineTo(-w, this.tractorBeam.h);
            this.ctx.fill();
            
            // Rings
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${Math.abs(Math.sin(performance.now()/200))})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            const ringY = (performance.now() / 5) % this.tractorBeam.h;
            this.ctx.ellipse(0, ringY, w * (ringY/this.tractorBeam.h), 5, 0, 0, Math.PI*2);
            this.ctx.stroke();
            
            this.ctx.restore();
        }

        if (this.player.active) {
            this.drawPlayer(this.player.x, this.player.y);
            if (this.player.dual) {
                this.drawPlayer(this.player.x - 35, this.player.y);
                this.drawPlayer(this.player.x + 35, this.player.y);
            }
        }

        this.enemies.forEach(e => {
            this.ctx.save();
            this.ctx.translate(e.x, e.y);
            this.ctx.rotate(e.angle);
            
            if (e.type === 'bee') {
                this.ctx.strokeStyle = '#ffeb3b'; // Yellow
                this.ctx.shadowColor = '#ffeb3b';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -12);
                this.ctx.lineTo(12, 6);
                this.ctx.lineTo(-12, 6);
                this.ctx.closePath();
                this.ctx.stroke();
            } else if (e.type === 'butterfly') {
                this.ctx.strokeStyle = '#ef4444'; // Red
                this.ctx.shadowColor = '#ef4444';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.moveTo(0, 10);
                this.ctx.lineTo(14, -10);
                this.ctx.lineTo(0, -4);
                this.ctx.lineTo(-14, -10);
                this.ctx.closePath();
                this.ctx.stroke();
            } else {
                this.ctx.strokeStyle = '#22c55e'; // Green
                this.ctx.shadowColor = '#22c55e';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.moveTo(0, 15);
                this.ctx.lineTo(15, -6);
                this.ctx.lineTo(10, -15);
                this.ctx.lineTo(-10, -15);
                this.ctx.lineTo(-15, -6);
                this.ctx.closePath();
                this.ctx.stroke();
                
                if (e.capturedShip) {
                    this.ctx.fillStyle = '#f00';
                    this.ctx.fillRect(-6, -6, 12, 12); 
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.strokeRect(-8, -8, 16, 16);
                }
            }
            this.ctx.restore();
        });

        this.ctx.fillStyle = '#fff';
        this.ctx.shadowColor = '#fff';
        this.ctx.shadowBlur = 5;
        this.bullets.forEach(b => {
            this.ctx.fillRect(b.x - 2, b.y - 8, 4, 16);
        });

        this.ctx.fillStyle = '#f00';
        this.ctx.shadowColor = '#f00';
        this.enemyBullets.forEach(b => {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, 4, 0, Math.PI*2);
            this.ctx.fill();
        });
        
        // Floating Text
        this.floatingTexts.forEach(t => {
            this.ctx.fillStyle = t.color;
            this.ctx.font = 'bold 20px monospace';
            this.ctx.globalAlpha = t.life;
            this.ctx.fillText(t.text, t.x, t.y);
        });
        this.ctx.globalAlpha = 1;

        ParticleSystem.getInstance().draw(this.ctx);
    }
    
    drawPlayer(x, y) {
        this.ctx.strokeStyle = '#06b6d4'; // Cyan
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = '#06b6d4';
        this.ctx.shadowBlur = 15;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.beginPath();
        this.ctx.moveTo(0, -18);
        this.ctx.lineTo(18, 18);
        this.ctx.lineTo(0, 8);
        this.ctx.lineTo(-18, 18);
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        this.ctx.fill();
        this.ctx.stroke();
        
        // Engine flame
        this.ctx.fillStyle = '#f97316';
        this.ctx.shadowColor = '#f97316';
        this.ctx.beginPath();
        this.ctx.moveTo(-5, 18);
        this.ctx.lineTo(0, 25 + Math.random()*10);
        this.ctx.lineTo(5, 18);
        this.ctx.fill();
        
        this.ctx.restore();
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
        window.removeEventListener('keydown', this.handleKey);
        window.removeEventListener('resize', this.resize);
    }
}
