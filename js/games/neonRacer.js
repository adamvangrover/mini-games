
import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonRacer {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.isActive = false;
        this.score = 0;
        this.speed = 0;
        this.distance = 0;
        this.segments = [];
        this.playerX = 0; // -1 to 1
        this.segmentLength = 200;
        this.cameraHeight = 1000;
        this.cameraDepth = 0.84; // FOV
        this.roadWidth = 2000;
        this.rumbleWidth = 3;
        this.lanes = 3;

        this.obstacles = [];
        this.gameTime = 0;
        this.health = 3;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = ''; // Clear
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Add UI Overlay
        this.scoreEl = document.createElement('div');
        this.scoreEl.className = "absolute top-4 left-4 text-2xl font-black text-cyan-400 font-[Poppins]";
        this.scoreEl.innerText = "DISTANCE: 0";
        container.appendChild(this.scoreEl);

        this.healthEl = document.createElement('div');
        this.healthEl.className = "absolute top-4 right-4 flex gap-2";
        this.updateHealthUI();
        container.appendChild(this.healthEl);

        this.resetGame();
        this.isActive = true;

        // Add specific controls hint
        const hint = document.createElement('div');
        hint.innerHTML = '<i class="fas fa-arrow-left"></i> STEER <i class="fas fa-arrow-right"></i>';
        hint.className = "absolute bottom-20 w-full text-center text-white/50 animate-pulse font-bold";
        container.appendChild(hint);
        setTimeout(() => hint.remove(), 3000);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
    }

    updateHealthUI() {
        if (!this.healthEl) return;
        this.healthEl.innerHTML = '';
        for(let i=0; i<3; i++) {
            const heart = document.createElement('i');
            heart.className = `fas fa-heart text-2xl ${i < this.health ? 'text-red-500' : 'text-slate-700'}`;
            this.healthEl.appendChild(heart);
        }
    }

    resetGame() {
        this.segments = [];
        for (let i = 0; i < 500; i++) {
            this.createSegment(i);
        }
        this.playerX = 0;
        this.speed = 0;
        this.score = 0;
        this.distance = 0;
        this.health = 3;
        this.obstacles = [];
        this.gameTime = 0;
        this.updateHealthUI();
    }

    createSegment(i) {
        const light = Math.floor(i / 3) % 2;
        const curve = (i > 50 && i < 300) ? Math.sin(i / 30) * 4 : 0;
        this.segments.push({
            index: i,
            p1: { world: { z: i * this.segmentLength }, camera: {}, screen: {} },
            p2: { world: { z: (i + 1) * this.segmentLength }, camera: {}, screen: {} },
            color: light ? { road: '#1e293b', grass: '#0f172a', rumble: '#f472b6' } : { road: '#0f172a', grass: '#020617', rumble: '#22d3ee' },
            curve: curve
        });

        // Add obstacles
        if (i > 20 && Math.random() < 0.1) {
            this.obstacles.push({
                z: i * this.segmentLength,
                x: (Math.random() * 2 - 1) * 0.8, // Normalized lane position
                type: Math.random() < 0.8 ? 'block' : 'coin'
            });
        }
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
        p.camera.x = (p.world.x || 0) - cameraX;
        p.camera.y = (p.world.y || 0) - cameraY;
        p.camera.z = (p.world.z || 0) - cameraZ;

        // Cyclic loops for endless road
        // Not implementing full cyclic here, just simple endless forward
        // Actually for endless we need to reset Z or generate new segments
        // We'll just generate new segments dynamically.

        p.screen.scale = cameraDepth / p.camera.z;
        p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
        p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
        p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
    }

    update(dt) {
        if (!this.isActive) return;
        this.gameTime += dt;

        // Input
        const maxSpeed = 12000; // units per sec
        const accel = 4000;
        const breaking = 8000;
        const decel = 2000;

        // Auto-accelerate (Arcade style)
        if (this.speed < maxSpeed) this.speed += accel * dt;

        // Steering
        if (this.inputManager.isKeyDown('ArrowLeft') || this.inputManager.isKeyDown('KeyA')) {
            this.playerX -= 1.5 * dt;
        }
        if (this.inputManager.isKeyDown('ArrowRight') || this.inputManager.isKeyDown('KeyD')) {
            this.playerX += 1.5 * dt;
        }

        // Clamp Player
        this.playerX = Math.max(-1.1, Math.min(1.1, this.playerX));

        // Move Forward
        this.distance += this.speed * dt;
        this.score = Math.floor(this.distance / 100);
        this.scoreEl.innerText = `DISTANCE: ${this.score}`;

        // Infinite Road Generation
        const totalLength = this.segments.length * this.segmentLength;
        if (this.distance + 8000 > totalLength) {
            for(let i=0; i<50; i++) {
                this.createSegment(this.segments.length);
            }

            // Cleanup Old Segments
            if (this.segments.length > 1000) {
                // Keep current batch, remove ancient history
                // We rely on index for drawing, so we can't just splice effectively without adjusting logic.
                // However, for painter's algorithm, we select by index modulo length?
                // Wait, logic is: this.segments[(baseSegment.index + n) % this.segments.length]
                // If we splice, indices shift. We need to be careful.
                // Simple fix: Limit max segments and just loop?
                // But we want procedural variation.
                // Let's just clamp the array size for memory safety by splicing start if we ensure render loop uses correct offset.
                // The current render logic uses `baseSegment` found by Z.
                // If we remove segments, Z of index 0 changes.
                // Better approach for simple prototype: reload game if too long or just let JS handle it (10k objects is fine).
                // But let's add a soft cap to prevent millions.
                if (this.segments.length > 5000) {
                     // Emergency reset? No, just stop generating unique geometry maybe.
                     // Or implement proper scrolling buffer.
                     // For now, given constraints, let's leave it as is, 5000 segments is a lot of driving.
                }
            }
        }

        // Collision Detection
        this.checkCollisions();

        // Particles
        this.particleSystem.update(dt);
    }

    checkCollisions() {
        const playerZ = this.distance + this.cameraHeight * 0.8; // Approx player position relative to camera
        const hitZone = 100; // Depth tolerance

        // Find segment
        // Simple obstacle check
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            const relativeZ = obs.z - this.distance;

            // Passed player
            if (relativeZ < -200) {
                this.obstacles.splice(i, 1);
                continue;
            }

            // Collision Check
            if (relativeZ > 0 && relativeZ < 200) {
                // Width check
                const obsWidth = 0.3; // Relative to road width
                if (Math.abs(this.playerX - obs.x) < obsWidth) {
                    if (obs.type === 'coin') {
                        this.soundManager.playSound('score');
                        this.saveSystem.addCurrency(5);
                        this.particleSystem.emit(this.canvas.width/2, this.canvas.height - 100, '#fbbf24', 10);
                        this.obstacles.splice(i, 1);
                    } else {
                        // HIT!
                        this.handleCrash();
                        this.obstacles.splice(i, 1);
                    }
                }
            }
        }
    }

    handleCrash() {
        this.soundManager.playSound('explosion');
        this.particleSystem.setShake(20);
        this.health--;
        this.speed = 0; // Stop
        this.updateHealthUI();

        if (this.health <= 0) {
            this.isActive = false;
            window.miniGameHub.showGameOver(this.score, () => {
                this.init(this.container);
            });
        }
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Sky
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, w, h);

        // Retro Sun (Gradient)
        const sunGrad = this.ctx.createLinearGradient(0, 0, 0, h/2);
        sunGrad.addColorStop(0, '#0f172a');
        sunGrad.addColorStop(1, '#c026d3');
        this.ctx.fillStyle = sunGrad;
        this.ctx.fillRect(0, 0, w, h/2);

        // Render Road
        const baseSegment = this.findSegment(this.distance);
        const basePercent = (this.distance % this.segmentLength) / this.segmentLength;

        let dx = -(baseSegment.curve * basePercent);
        let x = 0;
        const maxY = h;

        // Draw Segments (Painter's Algorithm)
        const drawDistance = 50;

        for (let n = 0; n < drawDistance; n++) {
            const segment = this.segments[(baseSegment.index + n) % this.segments.length];
            if (!segment) break;

            segment.looped = segment.index < baseSegment.index;
            // Loop adjustment logic omitted for simple linear extension

            // Project
            // Adjust camera position based on player curve?
            // Simple approach:

            const cameraX = this.playerX * this.roadWidth;
            const cameraY = this.cameraHeight;
            const cameraZ = this.distance; // This moves the camera forward

            // We need world coordinates of segment p1 and p2 relative to camera
            // p1.world.z is absolute.

            this.project(segment.p1, cameraX - x, cameraY, cameraZ, this.cameraDepth, w, h, this.roadWidth);
            this.project(segment.p2, cameraX - x - dx, cameraY, cameraZ, this.cameraDepth, w, h, this.roadWidth);

            x += dx;
            dx += segment.curve;

            const p1 = segment.p1.screen;
            const p2 = segment.p2.screen;

            // Clip if behind camera or off screen height
            if (p1.y >= maxY || segment.p2.camera.z <= this.cameraDepth) continue;
            // if (p2.y >= p1.y) continue; // Behind hill?

            this.drawSegment(this.ctx, w, h, this.lanes, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, segment.color);
        }

        // Draw Objects (Reverse order)
        for (let n = drawDistance - 1; n > 0; n--) {
            const segmentIndex = (baseSegment.index + n);
            if (segmentIndex >= this.segments.length) continue;
            const segment = this.segments[segmentIndex];

            // Check for obstacles in this segment range
            // Optimization: Store obstacles in segment? Or just iterate all close ones?
            // Since we have few obstacles, iterate all
            this.obstacles.forEach(obs => {
                if (obs.z >= segment.p1.world.z && obs.z < segment.p2.world.z) {
                    const spriteX = segment.p1.screen.x + (obs.x * segment.p1.screen.w);
                    const spriteY = segment.p1.screen.y;
                    const scale = segment.p1.screen.scale * 2000;

                    this.drawSprite(this.ctx, spriteX, spriteY, scale, obs.type);
                }
            });
        }

        // Draw Player Car
        this.drawPlayer(w, h);

        // Particles
        this.particleSystem.draw(this.ctx);
    }

    findSegment(z) {
        return this.segments[Math.floor(z / this.segmentLength) % this.segments.length];
    }

    drawSegment(ctx, width, height, lanes, x1, y1, w1, x2, y2, w2, color) {
        // Grass
        ctx.fillStyle = color.grass;
        ctx.fillRect(0, y2, width, y1 - y2);

        // Road
        const r1 = w1 / 2; // Road half width
        const r2 = w2 / 2;
        const l1 = w1 / 20; // Lane marker width? Rumble width
        const l2 = w2 / 20;

        ctx.fillStyle = color.rumble;
        ctx.beginPath();
        ctx.moveTo(x1 - w1 - l1, y1);
        ctx.lineTo(x1 + w1 + l1, y1);
        ctx.lineTo(x2 + w2 + l2, y2);
        ctx.lineTo(x2 - w2 - l2, y2);
        ctx.fill();

        ctx.fillStyle = color.road;
        ctx.beginPath();
        ctx.moveTo(x1 - w1, y1);
        ctx.lineTo(x1 + w1, y1);
        ctx.lineTo(x2 + w2, y2);
        ctx.lineTo(x2 - w2, y2);
        ctx.fill();

        // Lanes
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        const laneW = w1 / 40;
        // Center Line
        // ctx.fillRect(x1 - laneW/2, y1, laneW, ...);
    }

    drawSprite(ctx, x, y, scale, type) {
        ctx.save();
        ctx.translate(x, y - scale);

        if (type === 'coin') {
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, scale * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = `bold ${scale*0.4}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0);
        } else {
            // Block
            ctx.fillStyle = '#f43f5e';
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 15;
            ctx.fillRect(-scale/2, -scale/2, scale, scale);
        }

        ctx.restore();
    }

    drawPlayer(w, h) {
        const cx = w / 2;
        const cy = h - 100;

        // Car Body
        this.ctx.save();
        this.ctx.translate(cx, cy);

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 20, 40, 10, 0, 0, Math.PI*2);
        this.ctx.fill();

        // Body
        this.ctx.fillStyle = '#06b6d4'; // Cyan
        this.ctx.shadowColor = '#06b6d4';
        this.ctx.shadowBlur = 20;

        // Draw Car shape (Back view)
        this.ctx.beginPath();
        this.ctx.moveTo(-30, 0);
        this.ctx.lineTo(-30, -20);
        this.ctx.lineTo(-20, -30);
        this.ctx.lineTo(20, -30);
        this.ctx.lineTo(30, -20);
        this.ctx.lineTo(30, 0);
        this.ctx.fill();

        // Lights
        this.ctx.fillStyle = '#ff0000';
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(-25, -10, 10, 5);
        this.ctx.fillRect(15, -10, 10, 5);

        this.ctx.restore();
    }

    shutdown() {
        this.isActive = false;
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.canvas) this.canvas.remove();
        if (this.scoreEl) this.scoreEl.remove();
        if (this.healthEl) this.healthEl.remove();
    }
}
