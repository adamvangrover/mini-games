import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';
import InputManager from '../core/InputManager.js';

export default class NeonAsteroids {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.inputManager = InputManager.getInstance();

        this.player = null;
        this.asteroids = [];
        this.bullets = [];
        this.particles = [];

        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameState = 'START'; // START, PLAYING, GAMEOVER

        this.lastFireTime = 0;
        this.fireRate = 200; // ms

        this.width = 800;
        this.height = 600;

        // Custom UI overlay
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
            <div style="position: absolute; top: 20px; left: 20px; font-size: 24px; text-shadow: 0 0 10px #0ff;">SCORE: <span id="ast-score">0</span></div>
            <div style="position: absolute; top: 20px; right: 20px; font-size: 24px; text-shadow: 0 0 10px #0ff;">LIVES: <span id="ast-lives">3</span></div>
            <div id="ast-message" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; text-align: center; text-shadow: 0 0 20px #f0f;">NEON ASTEROIDS<br><span style="font-size:24px">Press SPACE to Start</span></div>
        `;
        this.container.appendChild(this.uiContainer);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);
        this.resize();

        this.resetGame();
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameState = 'START';
        this.updateUI();
        this.spawnPlayer();
        this.asteroids = [];
        this.bullets = [];
        this.particles = [];
        document.getElementById('ast-message').innerHTML = 'NEON ASTEROIDS<br><span style="font-size:24px">Press SPACE to Start</span>';
        document.getElementById('ast-message').style.display = 'block';
    }

    spawnPlayer() {
        this.player = {
            x: this.width / 2,
            y: this.height / 2,
            vx: 0,
            vy: 0,
            angle: -Math.PI / 2,
            radius: 15,
            rotationSpeed: 0.05,
            thrust: 0.1,
            friction: 0.99,
            maxSpeed: 5,
            invulnerable: 2000, // ms
            lastTime: performance.now()
        };
    }

    spawnAsteroids(count) {
        for (let i = 0; i < count; i++) {
            let x, y;
            // Spawn away from player
            do {
                x = Math.random() * this.width;
                y = Math.random() * this.height;
            } while (this.player && Math.hypot(x - this.player.x, y - this.player.y) < 100);

            this.asteroids.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 2 * (1 + this.level * 0.2),
                vy: (Math.random() - 0.5) * 2 * (1 + this.level * 0.2),
                radius: 40,
                type: 3, // 3: large, 2: medium, 1: small
                points: [] // random jagged edges
            });

            let ast = this.asteroids[this.asteroids.length - 1];
            let numPoints = 8 + Math.floor(Math.random() * 4);
            for(let j=0; j<numPoints; j++) {
                ast.points.push(ast.radius * 0.5 + Math.random() * ast.radius * 0.5);
            }
        }
    }

    updateUI() {
        if (!this.uiContainer) return;
        const scoreEl = document.getElementById('ast-score');
        const livesEl = document.getElementById('ast-lives');
        if (scoreEl) scoreEl.innerText = this.score;
        if (livesEl) livesEl.innerText = this.lives;
    }

    update(dt) {
        let now = performance.now();

        if (this.gameState === 'START') {
            if (this.inputManager.isKeyDown('Space')) {
                this.gameState = 'PLAYING';
                document.getElementById('ast-message').style.display = 'none';
                this.spawnAsteroids(4);
            }
            return;
        }

        if (this.gameState === 'GAMEOVER') {
            if (this.inputManager.isKeyDown('Space')) {
                this.resetGame();
            }
            return;
        }

        // --- Player Update ---
        if (this.player) {
            if (this.player.invulnerable > 0) {
                this.player.invulnerable -= dt * 1000;
            }

            if (this.inputManager.isKeyDown('ArrowLeft') || this.inputManager.isKeyDown('KeyA')) {
                this.player.angle -= this.player.rotationSpeed;
            }
            if (this.inputManager.isKeyDown('ArrowRight') || this.inputManager.isKeyDown('KeyD')) {
                this.player.angle += this.player.rotationSpeed;
            }

            if (this.inputManager.isKeyDown('ArrowUp') || this.inputManager.isKeyDown('KeyW')) {
                this.player.vx += Math.cos(this.player.angle) * this.player.thrust;
                this.player.vy += Math.sin(this.player.angle) * this.player.thrust;

                // Thrust particles
                if (Math.random() < 0.5) {
                    this.particles.push({
                        x: this.player.x - Math.cos(this.player.angle) * this.player.radius,
                        y: this.player.y - Math.sin(this.player.angle) * this.player.radius,
                        vx: -Math.cos(this.player.angle) * 2 + (Math.random() - 0.5),
                        vy: -Math.sin(this.player.angle) * 2 + (Math.random() - 0.5),
                        life: 0.5 + Math.random() * 0.5,
                        color: '#ff8800'
                    });
                }
            }

            // Limit speed
            let speed = Math.hypot(this.player.vx, this.player.vy);
            if (speed > this.player.maxSpeed) {
                this.player.vx = (this.player.vx / speed) * this.player.maxSpeed;
                this.player.vy = (this.player.vy / speed) * this.player.maxSpeed;
            }

            this.player.vx *= this.player.friction;
            this.player.vy *= this.player.friction;

            this.player.x += this.player.vx;
            this.player.y += this.player.vy;

            // Screen wrap
            this.player.x = (this.player.x + this.width) % this.width;
            this.player.y = (this.player.y + this.height) % this.height;

            // Shooting
            if (this.inputManager.isKeyDown('Space') && now - this.lastFireTime > this.fireRate) {
                this.bullets.push({
                    x: this.player.x + Math.cos(this.player.angle) * this.player.radius,
                    y: this.player.y + Math.sin(this.player.angle) * this.player.radius,
                    vx: Math.cos(this.player.angle) * 10,
                    vy: Math.sin(this.player.angle) * 10,
                    life: 2.0 // seconds
                });
                this.lastFireTime = now;
                this.soundManager.playSound('shoot');
            }
        }

        // --- Bullets ---
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            b.x = (b.x + this.width) % this.width;
            b.y = (b.y + this.height) % this.height;
            b.life -= dt;
            if (b.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }

        // --- Asteroids ---
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            let a = this.asteroids[i];
            a.x += a.vx;
            a.y += a.vy;
            a.x = (a.x + this.width) % this.width;
            a.y = (a.y + this.height) % this.height;
        }

        // --- Collisions ---
        // Bullet vs Asteroid
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            let hit = false;
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                let a = this.asteroids[j];
                // using approximate circle collision
                if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius) {
                    hit = true;
                    // Split asteroid
                    if (a.type > 1) {
                        for(let k=0; k<2; k++) {
                            let newA = {
                                x: a.x,
                                y: a.y,
                                vx: a.vx + (Math.random() - 0.5) * 4,
                                vy: a.vy + (Math.random() - 0.5) * 4,
                                radius: a.radius * 0.6,
                                type: a.type - 1,
                                points: []
                            };
                            let numPoints = 6 + Math.floor(Math.random() * 4);
                            for(let p=0; p<numPoints; p++) {
                                newA.points.push(newA.radius * 0.5 + Math.random() * newA.radius * 0.5);
                            }
                            this.asteroids.push(newA);
                        }
                    }

                    // Explosion particles
                    for(let k=0; k<10; k++) {
                        this.particles.push({
                            x: a.x, y: a.y,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5,
                            life: 0.5 + Math.random() * 0.5,
                            color: '#00ffff'
                        });
                    }

                    this.score += (4 - a.type) * 100;
                    this.updateUI();
                    this.soundManager.playSound('explosion');
                    this.asteroids.splice(j, 1);
                    break;
                }
            }
            if (hit) {
                this.bullets.splice(i, 1);
            }
        }

        // Player vs Asteroid
        if (this.player && this.player.invulnerable <= 0) {
            for (let j = 0; j < this.asteroids.length; j++) {
                let a = this.asteroids[j];
                if (Math.hypot(this.player.x - a.x, this.player.y - a.y) < a.radius + this.player.radius * 0.8) {
                    // Player hit
                    for(let k=0; k<20; k++) {
                        this.particles.push({
                            x: this.player.x, y: this.player.y,
                            vx: (Math.random() - 0.5) * 8,
                            vy: (Math.random() - 0.5) * 8,
                            life: 1 + Math.random(),
                            color: '#ff00ff'
                        });
                    }
                    this.soundManager.playSound('explosion');
                    this.lives--;
                    this.updateUI();
                    if (this.lives <= 0) {
                        this.player = null;
                        this.gameState = 'GAMEOVER';
                        document.getElementById('ast-message').innerHTML = 'GAME OVER<br><span style="font-size:24px">Press SPACE to Restart</span>';
                        document.getElementById('ast-message').style.display = 'block';
                    } else {
                        this.spawnPlayer();
                    }
                    break;
                }
            }
        }

        // Next Level
        if (this.asteroids.length === 0 && this.gameState === 'PLAYING') {
            this.level++;
            this.spawnAsteroids(4 + this.level);
            this.player.invulnerable = 2000;
        }

        // --- Particles ---
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        if (!this.ctx) return;

        // Background
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Grid (optional, for style)
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for(let x=0; x<this.width; x+=50) { this.ctx.moveTo(x,0); this.ctx.lineTo(x,this.height); }
        for(let y=0; y<this.height; y+=50) { this.ctx.moveTo(0,y); this.ctx.lineTo(this.width,y); }
        this.ctx.stroke();

        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';

        // Bullets
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ff00ff';
        for (let i = 0; i < this.bullets.length; i++) {
            let b = this.bullets[i];
            // Memory optimization: using fillRect instead of arc
            this.ctx.fillRect((b.x - 2) | 0, (b.y - 2) | 0, 4, 4);
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

        // Asteroids
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00ffff';
        for (let i = 0; i < this.asteroids.length; i++) {
            let a = this.asteroids[i];
            this.ctx.save();
            this.ctx.translate(a.x | 0, a.y | 0);
            this.ctx.beginPath();
            let numPoints = a.points.length;
            for(let j=0; j<numPoints; j++) {
                let angle = (j / numPoints) * Math.PI * 2;
                let r = a.points[j];
                let px = Math.cos(angle) * r;
                let py = Math.sin(angle) * r;
                if (j === 0) this.ctx.moveTo(px, py);
                else this.ctx.lineTo(px, py);
            }
            this.ctx.closePath();
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Player
        if (this.player && (this.player.invulnerable <= 0 || Math.floor(performance.now() / 100) % 2 === 0)) {
            this.ctx.save();
            this.ctx.translate(this.player.x | 0, this.player.y | 0);
            this.ctx.rotate(this.player.angle);

            this.ctx.strokeStyle = '#ff00ff';
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#ff00ff';

            this.ctx.beginPath();
            this.ctx.moveTo(this.player.radius, 0);
            this.ctx.lineTo(-this.player.radius, -this.player.radius * 0.8);
            this.ctx.lineTo(-this.player.radius * 0.5, 0);
            this.ctx.lineTo(-this.player.radius, this.player.radius * 0.8);
            this.ctx.closePath();
            this.ctx.stroke();

            // Engine flame
            if (this.inputManager.isKeyDown('ArrowUp') || this.inputManager.isKeyDown('KeyW')) {
                this.ctx.strokeStyle = '#ff8800';
                this.ctx.shadowColor = '#ff8800';
                this.ctx.beginPath();
                this.ctx.moveTo(-this.player.radius * 0.6, 0);
                this.ctx.lineTo(-this.player.radius * 1.5 - Math.random() * 10, 0);
                this.ctx.stroke();
            }

            this.ctx.restore();
        }

        this.ctx.shadowBlur = 0;
    }

    async shutdown() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.canvas) this.canvas.remove();
        if (this.uiContainer) this.uiContainer.remove();
    }
}
