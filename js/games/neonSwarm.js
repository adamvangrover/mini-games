import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonSwarm {
    constructor() {
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;

        // Game State
        this.state = 'TITLE'; // TITLE, PLAYING, GAMEOVER
        this.score = 0;
        this.multiplier = 1;
        this.time = 0;

        // Entities
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];

        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };

        // Wave config
        this.wave = 1;
        this.enemySpawnRate = 2.0;
        this.lastEnemySpawn = 0;

        // Screen shake
        this.shakeAmount = 0;

        // Binds
        this.boundKeydown = this.handleKeydown.bind(this);
        this.boundKeyup = this.handleKeyup.bind(this);
        this.boundMousemove = this.handleMousemove.bind(this);
        this.boundMousedown = this.handleMousedown.bind(this);
        this.boundMouseup = this.handleMouseup.bind(this);
        this.boundResize = this.resize.bind(this);
    }

    async init(container) {
        this.container = container;

        // Create Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'absolute top-0 left-0 w-full h-full cursor-crosshair';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // Add Back Button
        this.backBtn = document.createElement('button');
        this.backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> ESC';
        this.backBtn.className = "absolute top-4 left-4 px-4 py-2 bg-slate-900/80 hover:bg-cyan-600 text-white font-bold rounded-full border border-slate-600 hover:border-cyan-400 transition-all z-50 pointer-events-auto backdrop-blur-sm shadow-lg shadow-cyan-500/20";
        this.backBtn.onclick = () => window.miniGameHub.goBack();
        this.container.appendChild(this.backBtn);

        this.resize();
        window.addEventListener('resize', this.boundResize);
        window.addEventListener('keydown', this.boundKeydown);
        window.addEventListener('keyup', this.boundKeyup);
        window.addEventListener('mousemove', this.boundMousemove);
        window.addEventListener('mousedown', this.boundMousedown);
        window.addEventListener('mouseup', this.boundMouseup);

        this.soundManager.setBGMVolume(0.2);
    }

    resize() {
        if (!this.canvas || !this.container) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    handleKeydown(e) {
        this.keys[e.key.toLowerCase()] = true;
        if (this.state === 'TITLE' && e.key === 'Enter') {
            this.startGame();
        }
        if (this.state === 'GAMEOVER' && e.key === 'Enter') {
            this.state = 'TITLE';
        }
    }

    handleKeyup(e) {
        this.keys[e.key.toLowerCase()] = false;
    }

    handleMousemove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    handleMousedown(e) {
        if (e.button === 0) this.mouse.down = true;

        // Allow clicking to start too
        if (this.state === 'TITLE') this.startGame();
        else if (this.state === 'GAMEOVER') this.state = 'TITLE';
    }

    handleMouseup(e) {
        if (e.button === 0) this.mouse.down = false;
    }

    startGame() {
        this.state = 'PLAYING';
        this.score = 0;
        this.multiplier = 1;
        this.time = 0;
        this.wave = 1;
        this.enemySpawnRate = 2.0;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.shakeAmount = 0;

        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            vx: 0,
            vy: 0,
            radius: 15,
            speed: 300,
            friction: 0.85,
            color: '#00ffff',
            fireRate: 0.1, // shots per sec
            lastFire: 0,
            health: 100
        };

        this.soundManager.playSound('click');
    }

    endGame() {
        this.state = 'GAMEOVER';
        const highscore = this.saveSystem.getHighScore('neon-swarm') || 0;
        if (this.score > highscore) {
            this.saveSystem.setHighScore('neon-swarm', this.score);
            this.soundManager.playSound('win');
            window.miniGameHub.showToast("New High Score!");
        } else {
            this.soundManager.playSound('lose');
        }

        const coins = Math.floor(this.score / 100);
        if (coins > 0) this.saveSystem.addCurrency(coins);

        // Massive explosion at player death
        this.spawnParticles(this.player.x, this.player.y, this.player.color, 100, 400);
        this.shakeAmount = 20;
    }

    spawnEnemy() {
        // Spawn on edges
        let x, y;
        if (Math.random() > 0.5) {
            x = Math.random() > 0.5 ? -30 : this.canvas.width + 30;
            y = Math.random() * this.canvas.height;
        } else {
            x = Math.random() * this.canvas.width;
            y = Math.random() > 0.5 ? -30 : this.canvas.height + 30;
        }

        // Types: 0 = seeker (pink square), 1 = fast (yellow triangle), 2 = tank (red pentagon)
        const typeRoll = Math.random();
        let type, radius, speed, hp, color, pts;

        if (typeRoll > 0.9 && this.wave > 3) {
            type = 'tank'; radius = 25; speed = 80; hp = 5; color = '#ff0055'; pts = 50;
        } else if (typeRoll > 0.6 && this.wave > 1) {
            type = 'fast'; radius = 12; speed = 250; hp = 1; color = '#ffff00'; pts = 20;
        } else {
            type = 'seeker'; radius = 15; speed = 120 + (this.wave * 10); hp = 1; color = '#ff00ff'; pts = 10;
        }

        this.enemies.push({ x, y, type, radius, speed, hp, color, pts });
    }

    fireBullet() {
        if (this.time - this.player.lastFire < this.player.fireRate) return;

        const dx = this.mouse.x - this.player.x;
        const dy = this.mouse.y - this.player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist === 0) return;

        const dirX = dx / dist;
        const dirY = dy / dist;

        // Recoil
        this.player.vx -= dirX * 50;
        this.player.vy -= dirY * 50;

        this.bullets.push({
            x: this.player.x + dirX * this.player.radius,
            y: this.player.y + dirY * this.player.radius,
            vx: dirX * 800,
            vy: dirY * 800,
            radius: 4,
            life: 2.0,
            color: '#00ffff'
        });

        this.player.lastFire = this.time;

        // Tiny sound effect
        if(Math.random() > 0.5) this.soundManager.playSound('click');
    }

    spawnParticles(x, y, color, count, speedMult=100) {
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * speedMult + 20;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                life: Math.random() * 0.5 + 0.2
            });
        }
    }

    update(dt) {
        if (!this.ctx) return;

        // Cap dt to prevent massive jumps on lag
        if (dt > 0.1) dt = 0.1;

        this.time += dt;

        if (this.state === 'PLAYING') {
            // Player Movement
            let inputX = 0;
            let inputY = 0;
            if (this.keys['w'] || this.keys['arrowup']) inputY -= 1;
            if (this.keys['s'] || this.keys['arrowdown']) inputY += 1;
            if (this.keys['a'] || this.keys['arrowleft']) inputX -= 1;
            if (this.keys['d'] || this.keys['arrowright']) inputX += 1;

            // Normalize
            // Bolt Optimization: Use Math.SQRT1_2 for discrete cardinal inputs to bypass Math.sqrt division overhead
            if (inputX !== 0 && inputY !== 0) {
                inputX *= Math.SQRT1_2;
                inputY *= Math.SQRT1_2;
            }

            this.player.vx += inputX * this.player.speed * dt * 10;
            this.player.vy += inputY * this.player.speed * dt * 10;

            this.player.vx *= this.player.friction;
            this.player.vy *= this.player.friction;

            this.player.x += this.player.vx * dt;
            this.player.y += this.player.vy * dt;

            // Bounds
            const pad = this.player.radius;
            if (this.player.x < pad) { this.player.x = pad; this.player.vx *= -0.5; }
            if (this.player.x > this.canvas.width - pad) { this.player.x = this.canvas.width - pad; this.player.vx *= -0.5; }
            if (this.player.y < pad) { this.player.y = pad; this.player.vy *= -0.5; }
            if (this.player.y > this.canvas.height - pad) { this.player.y = this.canvas.height - pad; this.player.vy *= -0.5; }

            // Shooting
            if (this.mouse.down) {
                this.fireBullet();
            }

            // Wave & Spawning
            this.wave = 1 + Math.floor(this.time / 20);
            this.enemySpawnRate = Math.max(0.2, 2.0 - (this.wave * 0.15));

            if (this.time - this.lastEnemySpawn > this.enemySpawnRate) {
                this.spawnEnemy();
                this.lastEnemySpawn = this.time;
            }

            // Update Bullets
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const b = this.bullets[i];
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                b.life -= dt;

                // Bounds check
                if (b.life <= 0 || b.x < 0 || b.x > this.canvas.width || b.y < 0 || b.y > this.canvas.height) {
                    this.bullets.splice(i, 1);
                }
            }

            // Update Enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];

                // Seek player
                const dx = this.player.x - e.x;
                const dy = this.player.y - e.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist > 0) {
                    const dirX = dx / dist;
                    const dirY = dy / dist;

                    // Simple steering/wobble for fast ones
                    if (e.type === 'fast') {
                        e.x += (dirX + Math.sin(this.time * 10)) * e.speed * dt;
                        e.y += (dirY + Math.cos(this.time * 10)) * e.speed * dt;
                    } else {
                        e.x += dirX * e.speed * dt;
                        e.y += dirY * e.speed * dt;
                    }
                }

                // Collision with Player (Squared dist optimization)
                const radiiSq = (e.radius + this.player.radius) * (e.radius + this.player.radius);
                if (dx*dx + dy*dy < radiiSq) {
                    this.player.health -= 10;
                    this.shakeAmount = 10;
                    this.multiplier = 1; // reset multiplier
                    this.spawnParticles(e.x, e.y, e.color, 20);
                    this.enemies.splice(i, 1);
                    this.soundManager.playSound('hit');

                    if (this.player.health <= 0) {
                        this.endGame();
                        break;
                    }
                    continue;
                }

                // Collision with bullets
                let hit = false;
                for (let j = this.bullets.length - 1; j >= 0; j--) {
                    const b = this.bullets[j];
                    const bdx = b.x - e.x;
                    const bdy = b.y - e.y;
                    const bRadiiSq = (e.radius + b.radius) * (e.radius + b.radius);

                    if (bdx*bdx + bdy*bdy < bRadiiSq) {
                        e.hp -= 1;
                        this.spawnParticles(b.x, b.y, b.color, 3);
                        this.bullets.splice(j, 1); // remove bullet

                        if (e.hp <= 0) {
                            this.score += e.pts * this.multiplier;
                            this.multiplier = Math.min(10, this.multiplier + 0.1); // build multiplier
                            this.spawnParticles(e.x, e.y, e.color, 15);
                            this.soundManager.playSound('score');
                            hit = true;
                            break; // enemy dead
                        }
                    }
                }

                if (hit) {
                    this.enemies.splice(i, 1);
                }
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.95; // friction
            p.vy *= 0.95;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Shake dampening
        if (this.shakeAmount > 0) {
            this.shakeAmount -= dt * 30;
            if (this.shakeAmount < 0) this.shakeAmount = 0;
        }
    }

    drawShape(x, y, radius, sides, angle, color) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const a = angle + (i * Math.PI * 2) / sides;
            const px = x + Math.cos(a) * radius;
            const py = y + Math.sin(a) * radius;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.stroke();

        // Inner fill
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.2;
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.save();

        // Apply Screen Shake
        if (this.shakeAmount > 0) {
            const dx = (Math.random() - 0.5) * this.shakeAmount;
            const dy = (Math.random() - 0.5) * this.shakeAmount;
            this.ctx.translate(dx, dy);
        }

        // Background
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, w, h);

        // Grid (perspective warp effect)
        this.ctx.strokeStyle = '#1a1a3a';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        const offsetX = (this.player ? -this.player.x * 0.1 : 0) % gridSize;
        const offsetY = (this.player ? -this.player.y * 0.1 : 0) % gridSize;

        this.ctx.beginPath();
        for (let x = offsetX; x <= w; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
        }
        for (let y = offsetY; y <= h; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
        }
        this.ctx.stroke();

        if (this.state === 'PLAYING') {
            // Draw Bullets
            this.ctx.shadowBlur = 10;
            for (let i = 0; i < this.bullets.length; i++) {
                const b = this.bullets[i];
                this.ctx.shadowColor = b.color;
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
                this.ctx.fill();
            }
            this.ctx.shadowBlur = 0;

            // Draw Enemies
            for (let i = 0; i < this.enemies.length; i++) {
                const e = this.enemies[i];
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = e.color;

                // Rotations based on time/type
                const angle = this.time * (e.type === 'fast' ? 5 : 2);
                let sides = 4;
                if(e.type === 'fast') sides = 3;
                if(e.type === 'tank') sides = 5;

                this.drawShape(e.x, e.y, e.radius, sides, angle, e.color);
            }

            // Draw Player
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = this.player.color;

            // Player points towards mouse
            const dx = this.mouse.x - this.player.x;
            const dy = this.mouse.y - this.player.y;
            const pAngle = Math.atan2(dy, dx);

            this.ctx.translate(this.player.x, this.player.y);
            this.ctx.rotate(pAngle);

            // Ship geometry
            this.ctx.strokeStyle = this.player.color;
            this.ctx.fillStyle = this.player.color;
            this.ctx.lineWidth = 2;

            this.ctx.beginPath();
            this.ctx.moveTo(this.player.radius, 0);
            this.ctx.lineTo(-this.player.radius, this.player.radius * 0.8);
            this.ctx.lineTo(-this.player.radius * 0.5, 0);
            this.ctx.lineTo(-this.player.radius, -this.player.radius * 0.8);
            this.ctx.closePath();
            this.ctx.stroke();

            this.ctx.globalAlpha = 0.3;
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;

            // Thruster effect
            if (Math.abs(this.player.vx) > 10 || Math.abs(this.player.vy) > 10) {
                this.ctx.fillStyle = '#ffaa00';
                this.ctx.beginPath();
                this.ctx.moveTo(-this.player.radius * 0.5, 0);
                this.ctx.lineTo(-this.player.radius * 1.5 - Math.random() * 10, 0);
                this.ctx.stroke();
            }

            this.ctx.rotate(-pAngle);
            this.ctx.translate(-this.player.x, -this.player.y);
            this.ctx.shadowBlur = 0;

            // Draw HUD
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px "Press Start 2P", monospace';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(`SCORE: ${Math.floor(this.score)}`, 20, 20);

            // Multiplier
            this.ctx.fillStyle = this.multiplier > 1.5 ? '#ffff00' : '#00ffff';
            this.ctx.font = '16px "Press Start 2P", monospace';
            this.ctx.fillText(`x${this.multiplier.toFixed(1)}`, 20, 50);

            // Wave
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`WAVE: ${this.wave}`, w - 20, 20);

            // Health bar at bottom
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(w/2 - 100, h - 30, 200, 10);
            this.ctx.fillStyle = this.player.health > 30 ? '#00ff00' : '#ff0000';
            this.ctx.fillRect(w/2 - 100, h - 30, this.player.health * 2, 10);

            // Crosshair
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.mouse.x - 10, this.mouse.y);
            this.ctx.lineTo(this.mouse.x + 10, this.mouse.y);
            this.ctx.moveTo(this.mouse.x, this.mouse.y - 10);
            this.ctx.lineTo(this.mouse.x, this.mouse.y + 10);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(this.mouse.x, this.mouse.y, 5, 0, Math.PI*2);
            this.ctx.stroke();
        }

        // Draw Particles (Global)
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life * 2;
            this.ctx.beginPath();
            this.ctx.fillRect(p.x, p.y, 3, 3);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;

        // Draw Overlays
        if (this.state === 'TITLE') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, w, h);
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#0ff';
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '50px "Press Start 2P", monospace';
            this.ctx.fillText('NEON SWARM', w/2, h/2 - 50);

            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.font = '20px "Press Start 2P", monospace';
            this.ctx.fillText('CLICK OR PRESS ENTER TO START', w/2, h/2 + 30);

            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '14px "Poppins", sans-serif';
            this.ctx.fillText('WASD to Move | MOUSE to Aim & Shoot', w/2, h/2 + 70);

            const hs = this.saveSystem.getHighScore('neon-swarm') || 0;
            this.ctx.fillText(`HIGH SCORE: ${hs}`, w/2, h/2 + 100);

        } else if (this.state === 'GAMEOVER') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, 0, w, h);
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            this.ctx.fillStyle = '#f00';
            this.ctx.font = '50px "Press Start 2P", monospace';
            this.ctx.fillText('SYSTEM FAILURE', w/2, h/2 - 50);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px "Poppins", sans-serif';
            this.ctx.fillText(`FINAL SCORE: ${Math.floor(this.score)}`, w/2, h/2 + 10);
            this.ctx.fillText(`WAVES SURVIVED: ${this.wave}`, w/2, h/2 + 40);

            this.ctx.fillStyle = '#0ff';
            this.ctx.font = '16px "Press Start 2P", monospace';
            this.ctx.fillText('CLICK OR PRESS ENTER TO RESTART', w/2, h/2 + 100);
        }

        this.ctx.restore();
    }

    async shutdown() {
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundKeydown);
        window.removeEventListener('keyup', this.boundKeyup);
        window.removeEventListener('mousemove', this.boundMousemove);
        window.removeEventListener('mousedown', this.boundMousedown);
        window.removeEventListener('mouseup', this.boundMouseup);
        if (this.canvas) this.canvas.remove();
        if (this.backBtn) this.backBtn.remove();
    }
}
