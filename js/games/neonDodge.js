export default class NeonDodge {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.player = { x: 0, y: 0, size: 15, speed: 300, color: '#0f0' };
        this.bullets = [];
        this.particles = [];
        this.score = 0;
        this.gameOver = false;
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.lastTime = performance.now();
        this.spawnTimer = 0;
        this.patternTimer = 0;
        this.animationFrame = null;
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        container.appendChild(this.canvas);

        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;

        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);

        // UI Layer
        this.uiContainer = document.createElement('div');
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.top = '10px';
        this.uiContainer.style.left = '10px';
        this.uiContainer.style.color = '#0f0';
        this.uiContainer.style.fontFamily = "'Press Start 2P', monospace";
        this.uiContainer.style.fontSize = '16px';
        this.uiContainer.style.pointerEvents = 'none';
        container.appendChild(this.uiContainer);

        // Add back button
        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
        btn.className = "absolute bottom-4 left-4 px-6 py-2 bg-slate-800/80 hover:bg-fuchsia-600 text-white font-bold rounded-full border border-slate-600 hover:border-fuchsia-400 transition-all z-50 pointer-events-auto backdrop-blur-sm";
        btn.onclick = () => window.miniGameHub.goBack();
        container.appendChild(btn);

        this.updateUI();
        this.lastTime = performance.now();
        this.loop();
    }

    handleKeyDown(e) {
        if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true;
    }

    handleKeyUp(e) {
        if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false;
    }

    loop() {
        if (!this.canvas) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.animationFrame = requestAnimationFrame(() => this.loop());
    }

    update(dt) {
        if (this.gameOver) return;

        this.score += dt * 10;
        this.updateUI();

        // Player movement
        let dx = 0;
        let dy = 0;
        if (this.keys.ArrowLeft || this.keys.a) dx -= 1;
        if (this.keys.ArrowRight || this.keys.d) dx += 1;
        if (this.keys.ArrowUp || this.keys.w) dy -= 1;
        if (this.keys.ArrowDown || this.keys.s) dy += 1;

        // Normalize
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx*dx + dy*dy);
            dx /= len;
            dy /= len;
        }

        this.player.x += dx * this.player.speed * dt;
        this.player.y += dy * this.player.speed * dt;

        // Constrain to screen
        this.player.x = Math.max(this.player.size/2, Math.min(this.canvas.width - this.player.size/2, this.player.x));
        this.player.y = Math.max(this.player.size/2, Math.min(this.canvas.height - this.player.size/2, this.player.y));

        // Spawning Logic
        this.spawnTimer += dt;
        this.patternTimer += dt;

        if (this.spawnTimer > 0.1) {
            this.spawnTimer = 0;
            // Spawn simple targeted bullet
            this.spawnBullet(Math.random() < 0.5 ? 0 : this.canvas.width, Math.random() * this.canvas.height, true);
        }

        if (this.patternTimer > 3) {
            this.patternTimer = 0;
            this.spawnPattern();
        }

        // Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            // Collision with player
            let distSq = (b.x - this.player.x)**2 + (b.y - this.player.y)**2;
            if (distSq < (b.radius + this.player.size/2)**2) {
                this.gameOver = true;
                this.spawnParticles(this.player.x, this.player.y, this.player.color);
                if (window.miniGameHub && window.miniGameHub.soundManager) {
                    window.miniGameHub.soundManager.playSound('explosion');
                }
            }

            // Remove if off screen
            if (b.x < -50 || b.x > this.canvas.width + 50 || b.y < -50 || b.y > this.canvas.height + 50) {
                this.bullets.splice(i, 1);
            }
        }

        // Trail
        if (dx !== 0 || dy !== 0) {
            this.particles.push({
                x: this.player.x,
                y: this.player.y,
                vx: -dx * 50 + (Math.random()-0.5)*20,
                vy: -dy * 50 + (Math.random()-0.5)*20,
                life: 0.3,
                color: 'rgba(0, 255, 0, 0.5)'
            });
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    spawnBullet(x, y, targeted = false) {
        let angle;
        if (targeted) {
            angle = Math.atan2(this.player.y - y, this.player.x - x);
        } else {
            angle = Math.random() * Math.PI * 2;
        }

        const speed = 150 + Math.random() * 100 + (this.score / 10); // Increases over time
        this.bullets.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 4,
            color: '#f00'
        });
    }

    spawnPattern() {
        // Circle pattern from center
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const numBullets = 20;
        for (let i = 0; i < numBullets; i++) {
            const angle = (i / numBullets) * Math.PI * 2;
            const speed = 100;
            this.bullets.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 6,
                color: '#f0f'
            });
        }
    }

    draw() {
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        this.ctx.beginPath();
        for (let x = (performance.now() * 0.05) % gridSize; x < this.canvas.width; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        for (let y = (performance.now() * 0.05) % gridSize; y < this.canvas.height; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        this.ctx.stroke();

        // Draw Bullets
        for (let b of this.bullets) {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = b.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = b.color;
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0; // reset

        // Draw Particles
        for (let p of this.particles) {
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color || '#fff';
            this.ctx.fillRect(p.x, p.y, 4, 4);
            this.ctx.globalAlpha = 1;
        }

        if (!this.gameOver) {
            // Draw Player
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            // Spin slightly based on movement
            this.ctx.rotate(performance.now() * 0.005);
            this.ctx.fillStyle = this.player.color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = this.player.color;
            this.ctx.fillRect(-this.player.size/2, -this.player.size/2, this.player.size, this.player.size);

            // Inner core
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(-this.player.size/4, -this.player.size/4, this.player.size/2, this.player.size/2);
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("GAME OVER", this.canvas.width/2, this.canvas.height/2 - 50);
            this.ctx.font = '15px "Press Start 2P"';
            this.ctx.fillText("Score: " + Math.floor(this.score), this.canvas.width/2, this.canvas.height/2);
        }
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                life: 0.5 + Math.random(),
                color: color
            });
        }
    }

    updateUI() {
        this.uiContainer.innerHTML = `TIME: ${Math.floor(this.score)}`;
    }

    async shutdown() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);

        if (this.container) this.container.innerHTML = "";
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
        this.canvas = null;

        if (window.miniGameHub && window.miniGameHub.saveSystem && this.score > 0) {
            window.miniGameHub.saveSystem.setHighScore('neon-dodge', Math.floor(this.score));
        }
    }
}
