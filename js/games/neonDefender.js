import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';
import InputManager from '../core/InputManager.js';

export default class NeonDefender {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.inputManager = InputManager.getInstance();

        this.width = 800;
        this.height = 600;

        this.gameState = 'START';
        this.score = 0;
        this.lives = 5;
        this.baseHealth = 100;

        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.particles = [];

        this.enemySpawnTimer = 0;
        this.enemySpawnRate = 2000;
        this.lastFireTime = 0;

        this.uiContainer = null;
    }

    async init(container) {
        this.container = container;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);

        this.uiContainer = document.createElement('div');
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.top = '0';
        this.uiContainer.style.left = '0';
        this.uiContainer.style.width = '100%';
        this.uiContainer.style.height = '100%';
        this.uiContainer.style.pointerEvents = 'none';
        this.uiContainer.style.color = 'white';
        this.uiContainer.style.fontFamily = 'monospace';
        this.uiContainer.innerHTML = `
            <div style="position: absolute; top: 20px; left: 20px; font-size: 24px; text-shadow: 0 0 10px #0f0;">SCORE: <span id="def-score">0</span></div>
            <div style="position: absolute; top: 20px; right: 20px; font-size: 24px; text-shadow: 0 0 10px #0f0;">BASE: <span id="def-health">100</span>%</div>
            <div id="def-message" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; text-align: center; text-shadow: 0 0 20px #0f0;">NEON DEFENDER<br><span style="font-size:24px">Press SPACE to Start</span></div>
        `;
        this.container.appendChild(this.uiContainer);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);
        this.resize();

        this.resetGame();

        // Add click listener for shooting (mouse support)
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        this.mousePos = {x: this.width/2, y: 0};
        this.mouseDown = false;
    }

    handleMouseDown(e) {
        if(this.gameState !== 'PLAYING') return;
        this.mouseDown = true;
        this.fireToMouse();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.mousePos.x = (e.clientX - rect.left) * scaleX;
        this.mousePos.y = (e.clientY - rect.top) * scaleY;
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if(this.player) {
            this.player.y = this.height - 30;
            this.player.x = this.width / 2;
        }
    }

    resetGame() {
        this.score = 0;
        this.baseHealth = 100;
        this.gameState = 'START';
        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.enemySpawnRate = 2000;
        this.updateUI();

        this.player = {
            x: this.width / 2,
            y: this.height - 30,
            width: 40,
            height: 20,
            speed: 5
        };

        const msg = document.getElementById('def-message');
        if(msg) {
            msg.innerHTML = 'NEON DEFENDER<br><span style="font-size:24px">Press SPACE or Click to Start</span>';
            msg.style.display = 'block';
        }
    }

    updateUI() {
        if (!this.uiContainer) return;
        const scoreEl = document.getElementById('def-score');
        const healthEl = document.getElementById('def-health');
        if (scoreEl) scoreEl.innerText = this.score;
        if (healthEl) healthEl.innerText = Math.max(0, Math.floor(this.baseHealth));
    }

    fireToMouse() {
        let now = performance.now();
        if (now - this.lastFireTime < 200) return;

        let dx = this.mousePos.x - this.player.x;
        let dy = this.mousePos.y - this.player.y;
        let dist = Math.hypot(dx, dy);

        if (dist > 0) {
            this.bullets.push({
                x: this.player.x,
                y: this.player.y - 10,
                vx: (dx / dist) * 10,
                vy: (dy / dist) * 10,
                color: '#0f0'
            });
            this.lastFireTime = now;
            this.soundManager.playSound('shoot');
        }
    }

    update(dt) {
        let now = performance.now();

        if (this.gameState === 'START' || this.gameState === 'GAMEOVER') {
            if (this.inputManager.isKeyDown('Space') || this.mouseDown) {
                if (this.gameState === 'GAMEOVER') this.resetGame();
                this.gameState = 'PLAYING';
                document.getElementById('def-message').style.display = 'none';
                this.mouseDown = false;
            }
            return;
        }

        // Player Movement
        if (this.inputManager.isKeyDown('ArrowLeft') || this.inputManager.isKeyDown('KeyA')) {
            this.player.x -= this.player.speed;
        }
        if (this.inputManager.isKeyDown('ArrowRight') || this.inputManager.isKeyDown('KeyD')) {
            this.player.x += this.player.speed;
        }

        // Clamp player
        this.player.x = Math.max(this.player.width/2, Math.min(this.width - this.player.width/2, this.player.x));

        // Shooting (Keyboard)
        if (this.inputManager.isKeyDown('Space') && now - this.lastFireTime > 200) {
            this.bullets.push({
                x: this.player.x,
                y: this.player.y - 10,
                vx: 0,
                vy: -10,
                color: '#0f0'
            });
            this.lastFireTime = now;
            this.soundManager.playSound('shoot');
        }

        // Spawn Enemies
        this.enemySpawnTimer += dt * 1000;
        if (this.enemySpawnTimer > this.enemySpawnRate) {
            this.enemySpawnTimer = 0;
            this.enemySpawnRate = Math.max(500, this.enemySpawnRate * 0.98); // Speed up

            this.enemies.push({
                x: Math.random() * (this.width - 40) + 20,
                y: -20,
                vx: (Math.random() - 0.5) * 2,
                vy: 1 + Math.random() * 2 + (this.score / 1000), // Speed scales with score
                radius: 15,
                hp: 1
            });
        }

        // Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            if (b.y < 0 || b.x < 0 || b.x > this.width || b.y > this.height) {
                this.bullets.splice(i, 1);
            }
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            e.x += e.vx;
            e.y += e.vy;

            // Bounce off walls
            if (e.x < e.radius || e.x > this.width - e.radius) {
                e.vx *= -1;
            }

            // Base Collision
            if (e.y > this.height - 50) {
                this.baseHealth -= 10;
                this.updateUI();
                this.soundManager.playSound('explosion');

                // Base hit particles
                for(let k=0; k<15; k++) {
                    this.particles.push({
                        x: e.x, y: this.height - 20,
                        vx: (Math.random() - 0.5) * 10,
                        vy: -Math.random() * 5,
                        life: 0.5 + Math.random(),
                        color: '#ff0000'
                    });
                }

                this.enemies.splice(i, 1);

                if (this.baseHealth <= 0) {
                    this.gameState = 'GAMEOVER';
                    const msg = document.getElementById('def-message');
                    msg.innerHTML = 'CITY DESTROYED<br><span style="font-size:24px">Press SPACE to Restart</span>';
                    msg.style.color = '#f00';
                    msg.style.textShadow = '0 0 20px #f00';
                    msg.style.display = 'block';
                }
                continue;
            }

            // Bullet Collision
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                let b = this.bullets[j];
                // using approx square collision for bullets to save math
                if (Math.abs(b.x - e.x) < e.radius + 2 && Math.abs(b.y - e.y) < e.radius + 2) {
                    e.hp--;
                    this.bullets.splice(j, 1);

                    // Hit particles
                    for(let k=0; k<5; k++) {
                        this.particles.push({
                            x: e.x, y: e.y,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5,
                            life: 0.3 + Math.random() * 0.3,
                            color: '#0ff'
                        });
                    }

                    if (e.hp <= 0) {
                        this.score += 100;
                        this.updateUI();
                        this.soundManager.playSound('explosion');
                        // Explosion particles
                        for(let k=0; k<10; k++) {
                            this.particles.push({
                                x: e.x, y: e.y,
                                vx: (Math.random() - 0.5) * 8,
                                vy: (Math.random() - 0.5) * 8,
                                life: 0.5 + Math.random() * 0.5,
                                color: '#f0f'
                            });
                        }
                        this.enemies.splice(i, 1);
                    }
                    break;
                }
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        this.mouseDown = false; // Reset for next frame if not handled globally
    }

    draw() {
        if (!this.ctx) return;

        // Background
        this.ctx.fillStyle = '#051005';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // City Base Line
        this.ctx.strokeStyle = this.baseHealth > 30 ? '#0f0' : '#f00';
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = this.ctx.strokeStyle;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height - 40);
        // Draw some "buildings"
        for(let x=0; x<this.width; x+=40) {
            let h = 10 + Math.sin(x) * 10;
            this.ctx.lineTo(x, this.height - 40 - h);
            this.ctx.lineTo(x+30, this.height - 40 - h);
            this.ctx.lineTo(x+30, this.height - 40);
        }
        this.ctx.stroke();

        this.ctx.lineJoin = 'round';

        // Bullets
        this.ctx.shadowBlur = 10;
        for (let i = 0; i < this.bullets.length; i++) {
            let b = this.bullets[i];
            this.ctx.fillStyle = b.color;
            this.ctx.shadowColor = b.color;
            this.ctx.fillRect((b.x - 2) | 0, (b.y - 6) | 0, 4, 12);
        }

        // Enemies
        this.ctx.strokeStyle = '#f0f';
        this.ctx.shadowColor = '#f0f';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < this.enemies.length; i++) {
            let e = this.enemies[i];
            this.ctx.save();
            this.ctx.translate(e.x | 0, e.y | 0);
            this.ctx.rotate(performance.now() * 0.002);
            this.ctx.beginPath();
            this.ctx.moveTo(e.radius, 0);
            this.ctx.lineTo(0, e.radius);
            this.ctx.lineTo(-e.radius, 0);
            this.ctx.lineTo(0, -e.radius);
            this.ctx.closePath();
            this.ctx.stroke();

            // Inner core
            this.ctx.fillStyle = '#0ff';
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#0ff';
            this.ctx.fillRect(-3, -3, 6, 6);

            this.ctx.restore();
        }

        // Particles
        this.ctx.shadowBlur = 5;
        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillRect((p.x - 2) | 0, (p.y - 2) | 0, 4, 4);
        }
        this.ctx.globalAlpha = 1.0;

        // Player (Turret)
        if (this.player) {
            this.ctx.fillStyle = '#0f0';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#0f0';

            // Base
            this.ctx.beginPath();
            this.ctx.ellipse(this.player.x, this.player.y, this.player.width/2, this.player.height/2, 0, 0, Math.PI, true);
            this.ctx.fill();

            // Barrel pointing to mouse (approx)
            let dx = this.mousePos.x - this.player.x;
            let dy = this.mousePos.y - this.player.y;
            let angle = Math.atan2(dy, dx);
            // Limit barrel angle
            if(angle > 0) angle = -0.1;

            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y - 5);
            this.ctx.rotate(angle);
            this.ctx.fillRect(0, -4, 20, 8);
            this.ctx.restore();
        }

        this.ctx.shadowBlur = 0;
    }

    async shutdown() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this.handleMouseDown);
            this.canvas.removeEventListener('mousemove', this.handleMouseMove);
            this.canvas.remove();
        }
        if (this.uiContainer) this.uiContainer.remove();
    }
}
