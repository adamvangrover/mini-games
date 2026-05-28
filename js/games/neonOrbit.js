export default class NeonOrbit {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.particles = [];
        this.asteroids = [];
        this.energy = [];
        this.ship = { angle: 0, distance: 150, speed: 2, radius: 10 };
        this.star = { radius: 40, pulse: 0 };
        this.score = 0;
        this.gameOver = false;
        this.keys = { left: false, right: false };
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.lastTime = performance.now();
        this.spawnTimer = 0;
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

        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);

        // UI Layer
        this.uiContainer = document.createElement('div');
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.top = '10px';
        this.uiContainer.style.left = '10px';
        this.uiContainer.style.color = '#0ff';
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
        if (e.key === 'ArrowLeft') this.keys.left = true;
        if (e.key === 'ArrowRight') this.keys.right = true;
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowLeft') this.keys.left = false;
        if (e.key === 'ArrowRight') this.keys.right = false;
    }

    loop() {
        if (!this.canvas) return; // Cleaned up
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.animationFrame = requestAnimationFrame(() => this.loop());
    }

    update(dt) {
        if (this.gameOver) return;

        // Player movement
        if (this.keys.left) this.ship.angle -= this.ship.speed * dt;
        if (this.keys.right) this.ship.angle += this.ship.speed * dt;

        this.star.pulse = Math.sin(performance.now() * 0.005) * 5;

        // Calculate absolute position of ship
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const shipX = cx + Math.cos(this.ship.angle) * this.ship.distance;
        const shipY = cy + Math.sin(this.ship.angle) * this.ship.distance;

        // Spawn logic
        this.spawnTimer += dt;
        if (this.spawnTimer > 1) {
            this.spawnTimer = 0;
            // Spawn asteroid
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.max(this.canvas.width, this.canvas.height);
            this.asteroids.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                vx: -Math.cos(angle) * (100 + Math.random() * 50),
                vy: -Math.sin(angle) * (100 + Math.random() * 50),
                radius: 10 + Math.random() * 10
            });
            
            // Spawn energy
            if (Math.random() > 0.5) {
               const eAngle = Math.random() * Math.PI * 2;
               const eDist = Math.max(this.canvas.width, this.canvas.height);
               this.energy.push({
                   x: cx + Math.cos(eAngle) * eDist,
                   y: cy + Math.sin(eAngle) * eDist,
                   vx: -Math.cos(eAngle) * 50,
                   vy: -Math.sin(eAngle) * 50,
                   radius: 5
               });
            }
        }

        // Update Asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            let a = this.asteroids[i];
            a.x += a.vx * dt;
            a.y += a.vy * dt;

            // Collision with ship
            let dx = a.x - shipX;
            let dy = a.y - shipY;
            if (dx * dx + dy * dy < (a.radius + this.ship.radius) ** 2) {
                this.gameOver = true;
                this.spawnParticles(shipX, shipY, '#f0f');
                if (window.miniGameHub && window.miniGameHub.soundManager) {
                    window.miniGameHub.soundManager.playSound('explosion');
                }
            }

            // Remove if past center
            let cxDist = a.x - cx;
            let cyDist = a.y - cy;
            if (cxDist * cxDist + cyDist * cyDist < this.star.radius ** 2) {
                this.asteroids.splice(i, 1);
            }
        }

        // Update Energy
        for (let i = this.energy.length - 1; i >= 0; i--) {
            let e = this.energy[i];
            e.x += e.vx * dt;
            e.y += e.vy * dt;

            let dx = e.x - shipX;
            let dy = e.y - shipY;
            if (dx * dx + dy * dy < (e.radius + this.ship.radius) ** 2) {
                this.score += 10;
                this.updateUI();
                this.energy.splice(i, 1);
                if (window.miniGameHub && window.miniGameHub.soundManager) {
                    window.miniGameHub.soundManager.playSound('pickup');
                }
                continue;
            }
            
            let cxDist = e.x - cx;
            let cyDist = e.y - cy;
            if (cxDist * cxDist + cyDist * cyDist < this.star.radius ** 2) {
                this.energy.splice(i, 1);
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        
        // Trail
        this.particles.push({
            x: shipX,
            y: shipY,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            life: 0.5,
            color: '#0ff'
        });
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Motion blur
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        
        // Draw Orbit Path
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, this.ship.distance, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw Star
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, this.star.radius + this.star.pulse, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff0';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#ff0';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Draw Asteroids
        for (let a of this.asteroids) {
            this.ctx.beginPath();
            this.ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#f0f';
            this.ctx.fill();
        }
        
        // Draw Energy
        for (let e of this.energy) {
            this.ctx.beginPath();
            this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#0f0';
            this.ctx.fill();
        }

        // Draw Particles
        for (let p of this.particles) {
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color || '#fff';
            this.ctx.fillRect(p.x, p.y, 3, 3);
            this.ctx.globalAlpha = 1;
        }

        if (!this.gameOver) {
            // Draw Ship
            const shipX = cx + Math.cos(this.ship.angle) * this.ship.distance;
            const shipY = cy + Math.sin(this.ship.angle) * this.ship.distance;
            
            this.ctx.save();
            this.ctx.translate(shipX, shipY);
            this.ctx.rotate(this.ship.angle + Math.PI/2);
            this.ctx.beginPath();
            this.ctx.moveTo(0, -this.ship.radius);
            this.ctx.lineTo(this.ship.radius, this.ship.radius);
            this.ctx.lineTo(-this.ship.radius, this.ship.radius);
            this.ctx.closePath();
            this.ctx.fillStyle = '#0ff';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#0ff';
            this.ctx.fill();
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("GAME OVER", cx, cy - 50);
            this.ctx.font = '15px "Press Start 2P"';
            this.ctx.fillText("Score: " + this.score, cx, cy);
        }
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 1 + Math.random(),
                color: color
            });
        }
    }

    updateUI() {
        this.uiContainer.innerHTML = `SCORE: ${this.score}`;
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
            window.miniGameHub.saveSystem.setHighScore('neon-orbit', this.score);
        }
    }
}
