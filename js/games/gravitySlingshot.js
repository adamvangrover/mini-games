import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class GravitySlingshot {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.boundResize = this.resize.bind(this);
        this.boundLoop = this.loop.bind(this);
        this.boundPointerDown = this.onPointerDown.bind(this);
        this.boundPointerMove = this.onPointerMove.bind(this);
        this.boundPointerUp = this.onPointerUp.bind(this);
        this.lastTime = 0;

        this.level = this.saveSystem.getGameConfig('gravitySlingshot_level') || 1;
        this.maxLevel = 10;
        this.state = 'aiming'; // aiming, flying, won, lost

        this.G = 0.5; // Gravitational constant for the simulation
        this.planets = [];
        this.ship = null;
        this.target = null;
        this.particles = [];

        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };
        this.isDragging = false;

        // Use an object pool for particles to avoid allocation in hot loop
        this.particlePool = [];
        for (let i = 0; i < 500; i++) {
            this.particlePool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '' });
        }
    }

    async init(container) {
        this.container = container;

        this.container.innerHTML = `
            <div class="relative w-full h-full bg-black overflow-hidden font-mono select-none" id="gravitySlingshot-ui">
                <canvas id="gravitySlingshot-canvas" class="absolute inset-0 block"></canvas>
                <div class="absolute top-4 left-4 text-white z-10 pointer-events-none">
                    <div class="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">Gravity Slingshot</div>
                    <div class="text-lg text-slate-300">Level <span id="gs-level-display"></span></div>
                </div>
                <div id="gs-overlay" class="absolute inset-0 flex items-center justify-center bg-black/80 z-20 hidden">
                    <div class="text-center p-8 border border-fuchsia-500 rounded bg-slate-900/90 shadow-[0_0_20px_rgba(217,70,239,0.5)]">
                        <h2 id="gs-message" class="text-4xl font-bold text-white mb-4"></h2>
                        <button id="gs-next-btn" class="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition-colors">Continue</button>
                    </div>
                </div>
                <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded font-bold z-20 transition-colors pointer-events-auto">BACK</button>
                <div class="absolute bottom-4 left-4 text-slate-400 text-sm pointer-events-none">Drag anywhere to aim and set power. Release to launch.</div>
            </div>
        `;

        this.canvas = this.container.querySelector('#gravitySlingshot-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.addEventListener('pointerdown', this.boundPointerDown);
        this.canvas.addEventListener('pointermove', this.boundPointerMove);
        window.addEventListener('pointerup', this.boundPointerUp); // Window to catch outside release

        document.getElementById('gs-next-btn').addEventListener('click', () => {
            document.getElementById('gs-overlay').classList.add('hidden');
            if (this.state === 'won') {
                this.level++;
                if (this.level > this.maxLevel) this.level = 1;
                this.saveSystem.setGameConfig('gravitySlingshot_level', this.level);
            }
            this.loadLevel();
        });

        window.addEventListener('resize', this.boundResize);
        this.resize();

        this.loadLevel();

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    loadLevel() {
        document.getElementById('gs-level-display').innerText = this.level;
        this.state = 'aiming';
        this.isDragging = false;

        // Deactivate all particles
        for (let i = 0; i < this.particlePool.length; i++) {
            this.particlePool[i].active = false;
        }

        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        this.ship = { x: w * 0.1, y: cy, vx: 0, vy: 0, radius: 4, mass: 1 };
        this.target = { x: w * 0.9, y: cy, radius: 20 };
        this.planets = [];

        // Procedural generation based on level
        const seed = this.level * 1337;
        const rand = () => {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };

        const numPlanets = Math.min(1 + Math.floor(this.level / 2), 5);

        for (let i = 0; i < numPlanets; i++) {
            let px, py;
            let valid = false;
            let attempts = 0;
            const r = 20 + rand() * 40;

            while (!valid && attempts < 100) {
                px = w * 0.2 + rand() * (w * 0.6);
                py = h * 0.1 + rand() * (h * 0.8);
                valid = true;

                // Too close to ship or target?
                const dShip = Math.hypot(px - this.ship.x, py - this.ship.y);
                const dTarget = Math.hypot(px - this.target.x, py - this.target.y);
                if (dShip < r + 100 || dTarget < r + 100) valid = false;

                // Too close to other planets?
                for (let p of this.planets) {
                    if (Math.hypot(px - p.x, py - p.y) < r + p.radius + 50) valid = false;
                }
                attempts++;
            }

            this.planets.push({
                x: px, y: py,
                radius: r,
                mass: r * r * 0.1, // Mass proportional to area
                color: `hsl(${rand() * 360}, 60%, 50%)`
            });
        }

        // Randomize target somewhat on higher levels
        if (this.level > 2) {
             this.target.y = h * 0.2 + rand() * (h * 0.6);
        }
    }

    emitParticle(x, y, color, speed, life) {
        for (let i = 0; i < this.particlePool.length; i++) {
            const p = this.particlePool[i];
            if (!p.active) {
                p.active = true;
                p.x = x;
                p.y = y;
                const angle = Math.random() * Math.PI * 2;
                p.vx = Math.cos(angle) * speed * Math.random();
                p.vy = Math.sin(angle) * speed * Math.random();
                p.life = life;
                p.maxLife = life;
                p.color = color;
                return;
            }
        }
    }

    onPointerDown(e) {
        if (this.state !== 'aiming') return;
        const rect = this.canvas.getBoundingClientRect();
        this.dragStart.x = e.clientX - rect.left;
        this.dragStart.y = e.clientY - rect.top;
        this.dragCurrent.x = this.dragStart.x;
        this.dragCurrent.y = this.dragStart.y;
        this.isDragging = true;
    }

    onPointerMove(e) {
        if (!this.isDragging) return;
        const rect = this.canvas.getBoundingClientRect();
        this.dragCurrent.x = e.clientX - rect.left;
        this.dragCurrent.y = e.clientY - rect.top;
    }

    onPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        if (this.state !== 'aiming') return;

        const dx = this.dragStart.x - this.dragCurrent.x;
        const dy = this.dragStart.y - this.dragCurrent.y;

        // Require a minimum drag distance to launch
        if (dx*dx + dy*dy < 100) return;

        // Scale down the drag distance to a reasonable velocity
        this.ship.vx = dx * 0.05;
        this.ship.vy = dy * 0.05;

        this.state = 'flying';
        this.soundManager.playSound('laser'); // Reusing laser sound for launch
    }

    calculateGravity(obj, dt) {
        let totalFx = 0;
        let totalFy = 0;

        // Optimization: avoid Math.sqrt in hot loops if possible, but we need it for normalized direction
        for (let i = 0; i < this.planets.length; i++) {
            const p = this.planets[i];
            const dx = p.x - obj.x;
            const dy = p.y - obj.y;
            const distSq = dx * dx + dy * dy;

            // Avoid division by zero or infinite forces
            if (distSq < 1) continue;

            const dist = Math.sqrt(distSq);

            // F = G * (m1 * m2) / r^2
            const force = (this.G * obj.mass * p.mass) / distSq;

            totalFx += force * (dx / dist);
            totalFy += force * (dy / dist);
        }

        obj.vx += (totalFx / obj.mass) * dt * 60; // scale to 60fps dt
        obj.vy += (totalFy / obj.mass) * dt * 60;
    }

    loop(timestamp) {
        if (!this.canvas) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(Math.min(dt, 0.05)); // Cap dt to avoid huge spikes
        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
        if (this.state === 'flying') {
            const steps = 4; // Sub-stepping for physics accuracy
            const subDt = dt / steps;

            for (let s = 0; s < steps; s++) {
                if (this.state !== 'flying') break;

                this.calculateGravity(this.ship, subDt);

                this.ship.x += this.ship.vx * subDt * 60;
                this.ship.y += this.ship.vy * subDt * 60;

                // Collision with planets
                for (let i = 0; i < this.planets.length; i++) {
                    const p = this.planets[i];
                    const dx = p.x - this.ship.x;
                    const dy = p.y - this.ship.y;
                    if (dx*dx + dy*dy < (p.radius + this.ship.radius) * (p.radius + this.ship.radius)) {
                        this.gameOver(false, "CRASHED!");
                        break;
                    }
                }

                // Collision with target
                const tx = this.target.x - this.ship.x;
                const ty = this.target.y - this.ship.y;
                if (tx*tx + ty*ty < (this.target.radius + this.ship.radius) * (this.target.radius + this.ship.radius)) {
                    this.gameOver(true, "TARGET REACHED!");
                    break;
                }

                // Out of bounds
                if (this.ship.x < -1000 || this.ship.x > this.canvas.width + 1000 ||
                    this.ship.y < -1000 || this.ship.y > this.canvas.height + 1000) {
                    this.gameOver(false, "LOST IN SPACE");
                    break;
                }
            }

            // Engine trail
            if (this.state === 'flying' && Math.random() < 0.5) {
                this.emitParticle(this.ship.x - this.ship.vx*0.5, this.ship.y - this.ship.vy*0.5, '#0ff', 1, 0.5);
            }
        }

        // Update particles
        for (let i = 0; i < this.particlePool.length; i++) {
            const p = this.particlePool[i];
            if (p.active) {
                p.x += p.vx * dt * 60;
                p.y += p.vy * dt * 60;
                p.life -= dt;
                if (p.life <= 0) p.active = false;
            }
        }
    }

    gameOver(won, msg) {
        this.state = won ? 'won' : 'lost';
        this.soundManager.playSound(won ? 'powerup' : 'explosion');

        // Explode
        for(let i=0; i<30; i++) {
            this.emitParticle(this.ship.x, this.ship.y, won ? '#0f0' : '#f00', 3, 1);
        }

        document.getElementById('gs-message').innerText = msg;
        document.getElementById('gs-message').className = won ? 'text-4xl font-bold text-green-400 mb-4' : 'text-4xl font-bold text-red-500 mb-4';
        document.getElementById('gs-next-btn').innerText = won ? 'Next Level' : 'Retry';
        document.getElementById('gs-overlay').classList.remove('hidden');
    }

    draw() {
        if (!this.ctx) return;

        // Background
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Target
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(this.target.x, this.target.y, this.target.radius + Math.sin(performance.now()*0.005)*5, 0, Math.PI*2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#0f0';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.target.x, this.target.y, this.target.radius, 0, Math.PI*2);
        this.ctx.stroke();

        // Draw Planets
        for (let i = 0; i < this.planets.length; i++) {
            const p = this.planets[i];

            // Atmosphere
            const grad = this.ctx.createRadialGradient(p.x, p.y, p.radius*0.8, p.x, p.y, p.radius*1.5);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius*1.5, 0, Math.PI*2);
            this.ctx.fill();

            // Core
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
            this.ctx.fill();

            this.ctx.strokeStyle = p.color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
            this.ctx.stroke();
        }

        // Trajectory Prediction
        if (this.state === 'aiming' && this.isDragging) {
            const dx = this.dragStart.x - this.dragCurrent.x;
            const dy = this.dragStart.y - this.dragCurrent.y;

            if (dx*dx + dy*dy >= 100) {
                // Copy state for simulation
                let simShip = { x: this.ship.x, y: this.ship.y, vx: dx * 0.05, vy: dy * 0.05, mass: this.ship.mass };

                this.ctx.beginPath();
                this.ctx.moveTo(simShip.x, simShip.y);

                const simSteps = 100;
                const simDt = 0.05; // Fixed step for prediction

                for (let i = 0; i < simSteps; i++) {
                    this.calculateGravity(simShip, simDt);
                    simShip.x += simShip.vx * simDt * 60;
                    simShip.y += simShip.vy * simDt * 60;

                    if (i % 2 === 0) { // Dashed line effect
                        this.ctx.lineTo(simShip.x, simShip.y);
                    } else {
                        this.ctx.moveTo(simShip.x, simShip.y);
                    }

                    // Stop prediction if it hits a planet
                    let hit = false;
                    for (let p of this.planets) {
                         if (Math.hypot(p.x - simShip.x, p.y - simShip.y) < p.radius) hit = true;
                    }
                    if (hit) break;
                }

                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }

            // Drag Line
            this.ctx.beginPath();
            this.ctx.moveTo(this.ship.x, this.ship.y);
            this.ctx.lineTo(this.ship.x - dx, this.ship.y - dy);
            this.ctx.strokeStyle = '#0ff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Draw Ship
        if (this.state === 'aiming' || this.state === 'flying') {
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(this.ship.x, this.ship.y, this.ship.radius, 0, Math.PI*2);
            this.ctx.fill();
        }

        // Draw Particles
        for (let i = 0; i < this.particlePool.length; i++) {
            const p = this.particlePool[i];
            if (p.active) {
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.life / p.maxLife;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1.0;
    }

    resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        if (this.state === 'aiming') {
            // Re-center on resize if aiming
            this.ship.x = this.canvas.width * 0.1;
            this.ship.y = this.canvas.height / 2;
            this.target.x = this.canvas.width * 0.9;
            this.target.y = this.canvas.height / 2;
        }
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
        this.canvas.removeEventListener('pointermove', this.boundPointerMove);
        window.removeEventListener('pointerup', this.boundPointerUp);
        window.removeEventListener('resize', this.boundResize);
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
