import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonLander {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();

        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.resetGame();
    }

    resetGame() {
        this.lander = {
            x: 400,
            y: 100,
            vx: 0,
            vy: 0,
            angle: 0, // In radians
            fuel: 1000,
            width: 20,
            height: 25,
            crashed: false,
            landed: false
        };
        this.particles = [];
        this.terrain = [];
        this.landingPads = [];
        this.score = 0;
        this.gravity = 0.05;
        this.thrustPower = 0.15;
        this.rotationSpeed = 0.05;
        this.shakeTimer = 0;

        this.lastTime = performance.now();
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="relative w-full h-full flex flex-col items-center justify-center bg-black font-mono">
                <canvas id="landerCanvas" width="800" height="600" class="border-2 border-cyan-500 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)]"></canvas>
            </div>
        `;

        this.canvas = this.container.querySelector('#landerCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.isMouseDown = false;

        this.boundDown = this.handleDown.bind(this);
        this.boundUp = this.handleUp.bind(this);

        this.canvas.addEventListener('mousedown', this.boundDown);
        this.canvas.addEventListener('mouseup', this.boundUp);
        this.canvas.addEventListener('touchstart', this.boundDown, {passive: false});
        this.canvas.addEventListener('touchend', this.boundUp, {passive: false});

        this.generateTerrain();
        this.isActive = true;
        this.lastTime = performance.now();
    }

    handleDown(e) {
        if (e.type === 'touchstart') e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const mouseX = (clientX - rect.left) * scaleX;
        const mouseY = (clientY - rect.top) * scaleY;

        // Check if "BACK" button region (top left) is clicked
        if (mouseX >= 20 && mouseX <= 100 && mouseY >= 20 && mouseY <= 60) {
            if (window.miniGameHub) {
                // Remove listeners immediately to prevent double firing
                this.canvas.removeEventListener('mousedown', this.boundDown);
                this.canvas.removeEventListener('touchstart', this.boundDown);
                window.miniGameHub.transitionToState('MENU');
            }
        }
        this.isMouseDown = true;
    }

    handleUp(e) {
        this.isMouseDown = false;
    }

    generateTerrain() {
        this.terrain = [];
        this.landingPads = [];
        let x = 0;
        let y = 400 + Math.random() * 100;

        // Add starting point
        this.terrain.push({x: x, y: y});

        // Generate a few landing pads
        const padCount = 3;
        const width = 800;
        const segmentWidth = width / (padCount + 1);

        for (let i = 1; i <= padCount; i++) {
            // Jagged terrain up to the pad
            const padStartX = (i * segmentWidth) - 30 + (Math.random() * 20 - 10);
            while (x < padStartX) {
                x += 20 + Math.random() * 30;
                if (x > padStartX) x = padStartX;
                y += (Math.random() * 80 - 40);
                // Keep y within bounds
                y = Math.max(200, Math.min(550, y));
                this.terrain.push({x: x, y: y});
            }

            // The landing pad (flat line)
            const padWidth = 40 + Math.random() * 20;
            const padEndX = x + padWidth;
            // Pad properties
            const multiplier = Math.floor(Math.random() * 3) + 1; // 1x, 2x, 3x
            this.landingPads.push({ x1: x, x2: padEndX, y: y, multiplier: multiplier });

            x = padEndX;
            this.terrain.push({x: x, y: y});
        }

        // Jagged terrain to the end
        while (x < width) {
            x += 20 + Math.random() * 30;
            if (x >= width) {
                x = width;
            }
            y += (Math.random() * 80 - 40);
            y = Math.max(200, Math.min(550, y));
            this.terrain.push({x: x, y: y});
        }
    }

    checkCollision() {
        if (this.lander.crashed || this.lander.landed) return;

        const lx = this.lander.x;
        const ly = this.lander.y;
        const radius = this.lander.width / 2; // Approximate collision circle

        // Check out of bounds
        if (lx < 0 || lx > 800 || ly < 0) {
            this.crash();
            return;
        }

        // Check landing pads first
        for (const pad of this.landingPads) {
            if (lx > pad.x1 && lx < pad.x2 && ly + this.lander.height/2 >= pad.y - 2 && ly <= pad.y) {
                // Check landing conditions: angle, speed
                const speed = Math.sqrt(this.lander.vx * this.lander.vx + this.lander.vy * this.lander.vy);
                const angleDeg = Math.abs(this.lander.angle * (180 / Math.PI));

                if (speed < 1.5 && angleDeg < 15 && this.lander.vy > 0) {
                    this.land(pad);
                } else {
                    this.crash();
                }
                return;
            }
        }

        // Check terrain segments
        for (let i = 0; i < this.terrain.length - 1; i++) {
            const p1 = this.terrain[i];
            const p2 = this.terrain[i+1];

            // Basic line collision (approximated)
            // Distance from point to line segment
            const A = lx - p1.x;
            const B = ly - p1.y;
            const C = p2.x - p1.x;
            const D = p2.y - p1.y;

            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            let param = -1;
            if (len_sq != 0) //in case of 0 length line
                param = dot / len_sq;

            let xx, yy;
            if (param < 0) {
                xx = p1.x;
                yy = p1.y;
            } else if (param > 1) {
                xx = p2.x;
                yy = p2.y;
            } else {
                xx = p1.x + param * C;
                yy = p1.y + param * D;
            }

            const dx = lx - xx;
            const dy = ly - yy;
            // Use radius + some buffer for the lander's box shape
            if (dx * dx + dy * dy < radius * radius) {
                this.crash();
                return;
            }
        }
    }

    crash() {
        this.lander.crashed = true;
        this.soundManager.playSound('explosion');
        this.shakeTimer = 20; // 20 frames of shake

        // Explosion particles
        for(let i=0; i<30; i++) {
            this.particles.push({
                x: this.lander.x,
                y: this.lander.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1.0,
                color: Math.random() > 0.5 ? '#ff0000' : '#ff7700'
            });
        }

        if (window.miniGameHub) {
            setTimeout(() => {
                window.miniGameHub.showGameOver(this.score, () => {
                    this.score = 0;
                    this.resetGame();
                    this.generateTerrain();
                });
            }, 1500);
        }
    }

    land(pad) {
        this.lander.landed = true;
        this.lander.vy = 0;
        this.lander.vx = 0;
        this.lander.angle = 0;

        this.score += 50 * pad.multiplier;

        this.soundManager.playSound('powerup');

        setTimeout(() => {
            this.resetGame();
            this.generateTerrain();
        }, 2000);
    }

    update(dt) {
        if (!this.isActive) return;

        if (!this.lander.crashed && !this.lander.landed) {
            // Controls
            if (this.inputManager.isKeyDown('ArrowLeft') || this.inputManager.isKeyDown('a')) {
                this.lander.angle -= this.rotationSpeed;
            }
            if (this.inputManager.isKeyDown('ArrowRight') || this.inputManager.isKeyDown('d')) {
                this.lander.angle += this.rotationSpeed;
            }

            let thrusting = false;
            if ((this.inputManager.isKeyDown('ArrowUp') || this.inputManager.isKeyDown('w') || this.inputManager.isKeyDown(' ')) && this.lander.fuel > 0) {
                thrusting = true;
                this.lander.fuel -= 1;

                // Apply thrust in direction of angle
                this.lander.vx += Math.sin(this.lander.angle) * this.thrustPower;
                this.lander.vy -= Math.cos(this.lander.angle) * this.thrustPower;

                // Thrust particles
                if (Math.random() < 0.5) {
                    const exhaustX = this.lander.x - Math.sin(this.lander.angle) * (this.lander.height / 2);
                    const exhaustY = this.lander.y + Math.cos(this.lander.angle) * (this.lander.height / 2);

                    this.particles.push({
                        x: exhaustX,
                        y: exhaustY,
                        vx: -Math.sin(this.lander.angle) * 2 + (Math.random() - 0.5),
                        vy: Math.cos(this.lander.angle) * 2 + (Math.random() - 0.5),
                        life: 1.0,
                        color: '#00ffff'
                    });
                }
            }

            // Gravity
            this.lander.vy += this.gravity;

            // Velocity caps
            const maxSpeed = 5;
            if (this.lander.vx > maxSpeed) this.lander.vx = maxSpeed;
            if (this.lander.vx < -maxSpeed) this.lander.vx = -maxSpeed;
            if (this.lander.vy > maxSpeed) this.lander.vy = maxSpeed;
            if (this.lander.vy < -maxSpeed) this.lander.vy = -maxSpeed;

            // Update position
            this.lander.x += this.lander.vx;
            this.lander.y += this.lander.vy;

            this.checkCollision();
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        if (!this.isActive || !this.ctx) return;

        this.ctx.save();

        if (this.shakeTimer > 0) {
            const dx = (Math.random() - 0.5) * 10;
            const dy = (Math.random() - 0.5) * 10;
            this.ctx.translate(dx, dy);
            this.shakeTimer--;
        }

        // Clear background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Stars
        this.ctx.fillStyle = '#ffffff';
        // (Static stars could be cached, but drawing a few for now)
        // A better way is drawing randomly generated stars. For simplicity, just use a sparse static pattern based on coordinates
        for (let i = 0; i < 50; i++) {
            const sx = (i * 12345) % this.canvas.width;
            const sy = (i * 67890) % this.canvas.height;
            this.ctx.fillRect(sx, sy, 1, 1);
        }

        // Draw Terrain
        this.ctx.beginPath();
        if (this.terrain.length > 0) {
            this.ctx.moveTo(this.terrain[0].x, this.terrain[0].y);
            for (let i = 1; i < this.terrain.length; i++) {
                this.ctx.lineTo(this.terrain[i].x, this.terrain[i].y);
            }
        }

        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.lineTo(0, this.canvas.height);
        this.ctx.closePath();

        this.ctx.strokeStyle = '#00ffcc';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Fill terrain with a dark neon gradient or solid
        this.ctx.fillStyle = 'rgba(0, 255, 204, 0.1)';
        this.ctx.fill();

        // Draw Landing Pads
        for (const pad of this.landingPads) {
            this.ctx.beginPath();
            this.ctx.moveTo(pad.x1, pad.y);
            this.ctx.lineTo(pad.x2, pad.y);
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();

            // Draw multiplier text
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = '12px monospace';
            this.ctx.fillText(`x${pad.multiplier}`, pad.x1 + 10, pad.y + 15);
        }

        // Draw Particles
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 3, 3);
        }
        this.ctx.globalAlpha = 1.0;

        // Draw Lander
        if (!this.lander.crashed) {
            this.ctx.save();
            this.ctx.translate(this.lander.x, this.lander.y);
            this.ctx.rotate(this.lander.angle);

            // Draw lander body (neon vector style)
            this.ctx.strokeStyle = '#ffffff';
            if (this.lander.landed) this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;

            this.ctx.beginPath();
            // Top point
            this.ctx.moveTo(0, -this.lander.height / 2);
            // Bottom right
            this.ctx.lineTo(this.lander.width / 2, this.lander.height / 2);
            // Bottom left
            this.ctx.lineTo(-this.lander.width / 2, this.lander.height / 2);
            this.ctx.closePath();
            this.ctx.stroke();

            // Legs
            this.ctx.beginPath();
            this.ctx.moveTo(-this.lander.width / 2, this.lander.height / 2);
            this.ctx.lineTo(-this.lander.width / 2 - 5, this.lander.height / 2 + 5);
            this.ctx.moveTo(this.lander.width / 2, this.lander.height / 2);
            this.ctx.lineTo(this.lander.width / 2 + 5, this.lander.height / 2 + 5);
            this.ctx.stroke();

            this.ctx.restore();
        }

        // Draw UI
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 30);

        let fuelColor = '#00ffff';
        if (this.lander.fuel < 300) fuelColor = '#ffaa00';
        if (this.lander.fuel < 100) fuelColor = '#ff0000';

        this.ctx.fillStyle = fuelColor;
        this.ctx.fillText(`FUEL:  ${Math.floor(this.lander.fuel)}`, 20, 50);

        // Draw speed/angle warnings
        const speed = Math.sqrt(this.lander.vx * this.lander.vx + this.lander.vy * this.lander.vy);
        const angleDeg = Math.abs(this.lander.angle * (180 / Math.PI));

        this.ctx.fillStyle = speed > 1.5 ? '#ff0000' : '#00ff00';
        this.ctx.fillText(`SPEED: ${speed.toFixed(1)}`, this.canvas.width - 120, 30);

        this.ctx.fillStyle = angleDeg > 15 ? '#ff0000' : '#00ff00';
        this.ctx.fillText(`ANGLE: ${angleDeg.toFixed(0)}°`, this.canvas.width - 120, 50);

        if (this.lander.landed) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '30px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SUCCESSFUL LANDING', this.canvas.width / 2, this.canvas.height / 4);
            this.ctx.textAlign = 'left';
        }

        // Draw BACK button in canvas
        this.ctx.fillStyle = '#ff0044';
        this.ctx.fillRect(20, 20, 80, 40);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText('< BACK', 30, 45);

        this.ctx.restore();
    }

    async shutdown() {
        this.isActive = false;
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this.boundDown);
            this.canvas.removeEventListener('mouseup', this.boundUp);
            this.canvas.removeEventListener('touchstart', this.boundDown);
            this.canvas.removeEventListener('touchend', this.boundUp);
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
