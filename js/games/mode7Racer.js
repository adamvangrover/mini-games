import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class Mode7Racer {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.boundResize = this.resize.bind(this);
        this.boundLoop = this.loop.bind(this);
        this.lastTime = 0;

        // Player State
        this.player = {
            x: 512,
            y: 512,
            angle: 0,
            speed: 0,
            maxSpeed: 200, // units per sec
            accel: 100,
            turnSpeed: 2.0
        };

        // Camera State
        this.camera = {
            height: 30, // Z height
            horizon: 100,
            scale: 200,
            distance: 50 // Distance behind player
        };

        // Track Data (1024x1024 texture)
        this.trackTexWidth = 1024;
        this.trackTexHeight = 1024;
        this.trackData = null; // Uint8ClampedArray of RGBA

        // Rendering buffers
        this.renderWidth = 320; // Low res for retro feel & performance
        this.renderHeight = 240;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.renderWidth;
        this.offscreenCanvas.height = this.renderHeight;
        this.offCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
        this.imageData = this.offCtx.createImageData(this.renderWidth, this.renderHeight);
        this.pixels = new Uint32Array(this.imageData.data.buffer); // Fast 32-bit access

        // Input
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
        this.boundKeyDown = (e) => { if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = true; };
        this.boundKeyUp = (e) => { if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = false; };

        // AI Opponents
        this.opponents = [];
        for (let i = 0; i < 3; i++) {
             this.opponents.push({
                 x: 500 + i * 20,
                 y: 500 + i * 10,
                 angle: 0,
                 speed: 150 + Math.random() * 30,
                 color: `hsl(${Math.random()*360}, 100%, 50%)`
             });
        }
    }

    async init(container) {
        this.container = container;

        this.container.innerHTML = `
            <div class="relative w-full h-full bg-black overflow-hidden font-mono select-none" id="mode7Racer-ui">
                <canvas id="mode7Racer-canvas" class="absolute inset-0 block w-full h-full" style="image-rendering: pixelated;"></canvas>

                <!-- HUD -->
                <div class="absolute top-4 left-4 z-10 text-white font-bold text-2xl" style="text-shadow: 2px 2px 0 #000;">
                    LAP: 1/3<br>
                    POS: 1/4
                </div>

                <div class="absolute top-4 right-4 z-10 text-right text-white font-bold text-2xl" style="text-shadow: 2px 2px 0 #000;">
                    <span id="m7-speed">0</span> KM/H
                </div>

                <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-white font-bold text-lg animate-pulse" style="text-shadow: 2px 2px 0 #000;">
                    [ ARROWS ] TO DRIVE
                </div>

                <button class="back-btn absolute bottom-4 right-4 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded font-bold z-20 transition-colors pointer-events-auto border-2 border-white">EXIT</button>
            </div>
        `;

        this.canvas = this.container.querySelector('#mode7Racer-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // Disable smoothing for retro look
        this.ctx.imageSmoothingEnabled = false;

        window.addEventListener('resize', this.boundResize);
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        this.resize();

        await this.generateTrack();

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    async generateTrack() {
        // Procedurally generate a simple track texture
        const texCanvas = document.createElement('canvas');
        texCanvas.width = this.trackTexWidth;
        texCanvas.height = this.trackTexHeight;
        const tctx = texCanvas.getContext('2d');

        // Base grass (checkerboard pattern)
        tctx.fillStyle = '#15803d'; // green-700
        tctx.fillRect(0, 0, this.trackTexWidth, this.trackTexHeight);
        tctx.fillStyle = '#166534'; // green-800
        for (let y = 0; y < this.trackTexWidth; y += 32) {
             for (let x = 0; x < this.trackTexHeight; x += 32) {
                  if ((x/32 + y/32) % 2 === 0) tctx.fillRect(x, y, 32, 32);
             }
        }

        // Track Asphalt
        tctx.strokeStyle = '#334155'; // slate-700
        tctx.lineWidth = 150;
        tctx.lineJoin = 'round';
        tctx.lineCap = 'round';

        // Simple oval/bean track
        tctx.beginPath();
        tctx.moveTo(256, 256);
        tctx.lineTo(768, 256);
        tctx.quadraticCurveTo(900, 256, 900, 512);
        tctx.quadraticCurveTo(900, 768, 768, 768);
        tctx.lineTo(256, 768);
        tctx.quadraticCurveTo(128, 768, 128, 512);
        tctx.quadraticCurveTo(128, 256, 256, 256);
        tctx.stroke();

        // Inner/Outer borders (Rumble strips)
        tctx.strokeStyle = '#ef4444'; // red-500
        tctx.setLineDash([20, 20]);
        tctx.lineWidth = 10;

        // Outer
        tctx.stroke();

        // Inner
        tctx.strokeStyle = '#fff';
        tctx.lineDashOffset = 20;
        tctx.stroke();

        // Reset dash for middle line
        tctx.setLineDash([]);

        // Get Pixel Data
        const trackImgData = tctx.getImageData(0, 0, this.trackTexWidth, this.trackTexHeight);
        this.trackData = new Uint32Array(trackImgData.data.buffer);

        // Align player roughly on track
        this.player.x = 512;
        this.player.y = 256;
    }

    loop(timestamp) {
        if (!this.canvas) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(Math.min(dt, 0.1));
        this.renderMode7(); // Draw to offscreen buffer

        // Draw buffer scaled to screen
        this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.canvas.width, this.canvas.height);

        // Draw 2D Sprites on top (pseudo-3D projection)
        this.drawSprites();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
        // Handle Input
        if (this.keys.ArrowUp) {
            this.player.speed += this.player.accel * dt;
        } else if (this.keys.ArrowDown) {
            this.player.speed -= this.player.accel * dt;
        } else {
            // Friction
            this.player.speed *= 0.95;
        }

        // Clamp speed
        if (this.player.speed > this.player.maxSpeed) this.player.speed = this.player.maxSpeed;
        if (this.player.speed < -this.player.maxSpeed/2) this.player.speed = -this.player.maxSpeed/2;

        // Turning (only if moving)
        if (Math.abs(this.player.speed) > 5) {
            const turnDir = this.player.speed > 0 ? 1 : -1;
            if (this.keys.ArrowLeft) this.player.angle -= this.player.turnSpeed * dt * turnDir;
            if (this.keys.ArrowRight) this.player.angle += this.player.turnSpeed * dt * turnDir;
        }

        // Move Player
        this.player.x += Math.cos(this.player.angle) * this.player.speed * dt;
        this.player.y += Math.sin(this.player.angle) * this.player.speed * dt;

        // Update UI
        document.getElementById('m7-speed').innerText = Math.abs(Math.floor(this.player.speed));

        // Simple AI movement
        for (let ai of this.opponents) {
             // Dumb AI: Just circle around the center of the track for now
             const dx = 512 - ai.x;
             const dy = 512 - ai.y;
             const targetAngle = Math.atan2(dy, dx) + Math.PI/2; // Tangent

             // Smooth turn
             let diff = targetAngle - ai.angle;
             while (diff < -Math.PI) diff += Math.PI*2;
             while (diff > Math.PI) diff -= Math.PI*2;

             ai.angle += diff * dt;

             ai.x += Math.cos(ai.angle) * ai.speed * dt;
             ai.y += Math.sin(ai.angle) * ai.speed * dt;
        }
    }

    renderMode7() {
        if (!this.trackData) return;

        const w = this.renderWidth;
        const h = this.renderHeight;

        // Precalculate sin/cos for rotation
        const sinA = Math.sin(this.player.angle);
        const cosA = Math.cos(this.player.angle);

        // Camera position (behind player)
        const camX = this.player.x - cosA * this.camera.distance;
        const camY = this.player.y - sinA * this.camera.distance;

        // Clear top half (sky)
        for (let i = 0; i < w * this.camera.horizon; i++) {
            this.pixels[i] = 0xFFdca24c; // Sky Blue (AABBGGRR format for Uint32) -> 4c a2 dc FF
        }

        // Render Mode 7 ground
        for (let y = this.camera.horizon; y < h; y++) {
            // Calculate distance to this row
            const distance = (this.camera.height * this.camera.scale) / (y - this.camera.horizon + 1);

            // Calculate line start and end vectors
            const lineDx = -sinA * distance;
            const lineDy = cosA * distance;

            const pX = camX + cosA * distance;
            const pY = camY + sinA * distance;

            let currentX = pX - lineDx;
            let currentY = pY - lineDy;

            // Step across the screen width
            const stepX = (lineDx * 2) / w;
            const stepY = (lineDy * 2) / w;

            for (let x = 0; x < w; x++) {
                // Texture wrapping (bitwise AND works well for POT sizes like 1024)
                const tx = (currentX | 0) & (this.trackTexWidth - 1);
                const ty = (currentY | 0) & (this.trackTexHeight - 1);

                // Get pixel from track data
                const texIdx = ty * this.trackTexWidth + tx;
                const color = this.trackData[texIdx];

                // Draw to buffer
                const screenIdx = y * w + x;
                this.pixels[screenIdx] = color;

                currentX += stepX;
                currentY += stepY;
            }
        }

        this.offCtx.putImageData(this.imageData, 0, 0);
    }

    drawSprites() {
        // We draw sprites directly on the main high-res canvas, mapping them from the Mode 7 space
        // This gives crisp 2D sprites on a retro 3D background (like Mario Kart SNES)

        const w = this.canvas.width;
        const h = this.canvas.height;

        const sinA = Math.sin(this.player.angle);
        const cosA = Math.cos(this.player.angle);
        const camX = this.player.x - cosA * this.camera.distance;
        const camY = this.player.y - sinA * this.camera.distance;

        // Sort opponents by distance (painter's algorithm)
        this.opponents.sort((a, b) => {
             const distA = Math.hypot(a.x - camX, a.y - camY);
             const distB = Math.hypot(b.x - camX, b.y - camY);
             return distB - distA; // Furthest first
        });

        for (let ai of this.opponents) {
            // Translate position to camera space
            const dx = ai.x - camX;
            const dy = ai.y - camY;

            // Rotate around camera
            const rotX = dx * cosA + dy * sinA;
            const rotY = dx * -sinA + dy * cosA;

            // If behind camera, skip
            if (rotX <= 0) continue;

            // Project to screen
            const scale = (this.camera.scale / rotX) * (h / this.renderHeight);
            const screenX = (w / 2) + (rotY * scale);
            const screenY = ((this.camera.horizon * h / this.renderHeight)) + (this.camera.height * scale);

            // Draw Sprite
            const spriteSize = 64 * (scale / 5); // Base size scaled by depth

            if (spriteSize > 5 && screenX > -spriteSize && screenX < w + spriteSize) {
                 this.ctx.fillStyle = ai.color;
                 // Simple box for kart
                 this.ctx.fillRect(screenX - spriteSize/2, screenY - spriteSize, spriteSize, spriteSize);
                 // Shadow
                 this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                 this.ctx.fillRect(screenX - spriteSize/2, screenY, spriteSize, spriteSize/4);
            }
        }

        // Draw Player (always bottom center)
        const pSize = h * 0.15;
        this.ctx.fillStyle = '#ef4444'; // Red kart
        this.ctx.fillRect(w/2 - pSize/2, h - pSize - 20, pSize, pSize);
        // Player shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(w/2 - pSize/2, h - 20, pSize, pSize/4);
    }

    resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.ctx.imageSmoothingEnabled = false; // Need to re-apply after resize
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
