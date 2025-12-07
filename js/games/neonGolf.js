import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonGolf {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;

        // Game State
        this.score = 0;
        this.strokes = 0;
        this.levelIndex = 0;
        this.state = 'AIMING'; // AIMING, MOVING, HOLED, GAMEOVER

        // Physics
        this.ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 8 };
        this.hole = { x: 0, y: 0, radius: 12 };
        this.walls = []; // Array of {x, y, w, h}

        // Input
        this.dragStart = null;
        this.dragCurrent = null;

        this.levels = [
            // Level 1: Straight shot
            {
                start: { x: 100, y: 300 },
                hole: { x: 700, y: 300 },
                walls: [
                    { x: 0, y: 0, w: 800, h: 20 }, // Top
                    { x: 0, y: 580, w: 800, h: 20 }, // Bottom
                    { x: 0, y: 0, w: 20, h: 600 }, // Left
                    { x: 780, y: 0, w: 20, h: 600 } // Right
                ]
            },
            // Level 2: Middle Block
            {
                start: { x: 100, y: 300 },
                hole: { x: 700, y: 300 },
                walls: [
                    { x: 0, y: 0, w: 800, h: 20 },
                    { x: 0, y: 580, w: 800, h: 20 },
                    { x: 0, y: 0, w: 20, h: 600 },
                    { x: 780, y: 0, w: 20, h: 600 },
                    { x: 350, y: 200, w: 100, h: 200 } // Center block
                ]
            },
            // Level 3: Tunnel
            {
                start: { x: 100, y: 500 },
                hole: { x: 700, y: 100 },
                walls: [
                    { x: 0, y: 0, w: 800, h: 20 },
                    { x: 0, y: 580, w: 800, h: 20 },
                    { x: 0, y: 0, w: 20, h: 600 },
                    { x: 780, y: 0, w: 20, h: 600 },
                    { x: 200, y: 0, w: 20, h: 400 },
                    { x: 500, y: 200, w: 20, h: 400 }
                ]
            }
        ];
    }

    async init(container) {
        this.container = container;

        // Setup Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.className = 'w-full h-full object-contain bg-slate-900 border-2 border-fuchsia-500 rounded-lg shadow-[0_0_20px_rgba(255,0,255,0.3)]';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Setup UI
        this.uiLayer = document.createElement('div');
        this.uiLayer.className = 'absolute top-4 left-4 text-white font-mono pointer-events-none';
        this.uiLayer.innerHTML = `
            <div class="text-xl text-fuchsia-400 font-bold drop-shadow-[0_0_5px_rgba(255,0,255,0.8)]">NEON GOLF</div>
            <div>Hole: <span id="golf-level">1</span></div>
            <div>Strokes: <span id="golf-strokes">0</span></div>
            <div>Total: <span id="golf-total">0</span></div>
        `;
        this.container.appendChild(this.uiLayer);

        // Add Back Button
        const backBtn = document.createElement('button');
        backBtn.className = 'absolute top-4 right-4 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 back-btn z-50';
        backBtn.innerText = 'Exit';
        backBtn.onclick = () => window.miniGameHub.goBack();
        this.container.appendChild(backBtn);

        this.isRunning = true;
        this.levelIndex = 0;
        this.score = 0; // Total strokes
        this.strokes = 0; // Current hole strokes
        this.loadLevel(0);

        // Event Listeners for Interaction
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    loadLevel(idx) {
        if (idx >= this.levels.length) {
            // Game Complete
            window.miniGameHub.showGameOver(this.score, () => {
                this.levelIndex = 0;
                this.score = 0;
                this.loadLevel(0);
            });
            this.isRunning = false;
            return;
        }

        const level = this.levels[idx];
        this.ball.x = level.start.x;
        this.ball.y = level.start.y;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.hole.x = level.hole.x;
        this.hole.y = level.hole.y;
        this.walls = level.walls;
        this.state = 'AIMING';
        this.strokes = 0;
        this.updateUI();
    }

    updateUI() {
        if (!this.container) return;
        const levelEl = this.container.querySelector('#golf-level');
        const strokesEl = this.container.querySelector('#golf-strokes');
        const totalEl = this.container.querySelector('#golf-total');

        if (levelEl) levelEl.textContent = this.levelIndex + 1;
        if (strokesEl) strokesEl.textContent = this.strokes;
        if (totalEl) totalEl.textContent = this.score;
    }

    handleMouseDown(e) {
        if (this.state !== 'AIMING') return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        // Check if clicking near ball
        const dx = mouseX - this.ball.x;
        const dy = mouseY - this.ball.y;
        if (Math.sqrt(dx*dx + dy*dy) < 50) {
            this.dragStart = { x: this.ball.x, y: this.ball.y };
            this.dragCurrent = { x: mouseX, y: mouseY };
        }
    }

    handleMouseMove(e) {
        if (!this.dragStart) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        this.dragCurrent = { x: mouseX, y: mouseY };
    }

    handleMouseUp(e) {
        if (!this.dragStart) return;

        // Calculate velocity vector (reverse drag)
        const dx = this.dragStart.x - this.dragCurrent.x;
        const dy = this.dragStart.y - this.dragCurrent.y;

        // Cap power
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxPower = 200;
        const power = Math.min(dist, maxPower);
        const angle = Math.atan2(dy, dx);

        // Apply Impulse
        const speed = power * 0.15;
        this.ball.vx = Math.cos(angle) * speed;
        this.ball.vy = Math.sin(angle) * speed;

        if (speed > 0.5) {
            this.state = 'MOVING';
            this.strokes++;
            this.score++; // Total Score is strokes
            this.soundManager.playSound('click'); // Putt sound
            this.updateUI();
        }

        this.dragStart = null;
        this.dragCurrent = null;
    }

    update(dt) {
        if (!this.isRunning) return;

        if (this.state === 'MOVING') {
            // Apply Physics
            this.ball.x += this.ball.vx;
            this.ball.y += this.ball.vy;

            // Friction
            this.ball.vx *= 0.97;
            this.ball.vy *= 0.97;

            // Stop if too slow
            if (Math.abs(this.ball.vx) < 0.05 && Math.abs(this.ball.vy) < 0.05) {
                this.ball.vx = 0;
                this.ball.vy = 0;
                this.state = 'AIMING';
            }

            // Collision with Walls
            for (let w of this.walls) {
                // Simple AABB vs Circle check
                // Find closest point on rectangle to circle center
                let closestX = Math.max(w.x, Math.min(this.ball.x, w.x + w.w));
                let closestY = Math.max(w.y, Math.min(this.ball.y, w.y + w.h));

                let dx = this.ball.x - closestX;
                let dy = this.ball.y - closestY;
                let distSq = dx*dx + dy*dy;

                if (distSq < this.ball.radius * this.ball.radius) {
                    // Collision Detected
                    // Resolve simple bounce
                    // Determine normal based on relative position
                    let dist = Math.sqrt(distSq);
                    let overlap = this.ball.radius - dist;

                    if (dist === 0) { // Center inside - emergency push out
                         // Should not happen often if walls are thick enough and speed is capped
                         // Push back along velocity
                         this.ball.x -= this.ball.vx;
                         this.ball.y -= this.ball.vy;
                         return;
                    }

                    let nx = dx / dist;
                    let ny = dy / dist;

                    // Push out
                    this.ball.x += nx * overlap;
                    this.ball.y += ny * overlap;

                    // Reflect velocity: v' = v - 2 * (v . n) * n
                    let dot = this.ball.vx * nx + this.ball.vy * ny;
                    this.ball.vx = this.ball.vx - 2 * dot * nx;
                    this.ball.vy = this.ball.vy - 2 * dot * ny;

                    // Dampen bounce
                    this.ball.vx *= 0.8;
                    this.ball.vy *= 0.8;

                    this.soundManager.playSound('click'); // Bounce sound (reuse click for now)
                    this.particleSystem.emit(this.ball.x, this.ball.y, '#0ff', 5);
                }
            }

            // Check Hole
            let dx = this.ball.x - this.hole.x;
            let dy = this.ball.y - this.hole.y;
            let dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < this.hole.radius) {
                // In the hole! (if speed is low enough)
                let speed = Math.sqrt(this.ball.vx*this.ball.vx + this.ball.vy*this.ball.vy);
                if (speed < 5) {
                    this.state = 'HOLED';
                    this.ball.vx = 0;
                    this.ball.vy = 0;
                    this.ball.x = this.hole.x;
                    this.ball.y = this.hole.y;
                    this.soundManager.playSound('score');
                    this.particleSystem.emit(this.hole.x, this.hole.y, '#f0f', 20);

                    setTimeout(() => {
                        this.levelIndex++;
                        this.loadLevel(this.levelIndex);
                    }, 1000);
                }
            }
        }

        this.particleSystem.update(dt);
    }

    draw() {
        if (!this.ctx) return;

        // Clear
        this.ctx.fillStyle = '#111827'; // Slate-900
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid (Floor)
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for(let x=0; x<this.canvas.width; x+=40) {
            this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height);
        }
        for(let y=0; y<this.canvas.height; y+=40) {
            this.ctx.moveTo(0, y); this.ctx.lineTo(this.canvas.width, y);
        }
        this.ctx.stroke();

        // Draw Walls
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#0ff';
        this.ctx.fillStyle = '#0ff';
        for (let w of this.walls) {
            this.ctx.fillRect(w.x, w.y, w.w, w.h);
        }
        this.ctx.shadowBlur = 0;

        // Draw Hole
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#f0f';
        this.ctx.fillStyle = '#000';
        this.ctx.strokeStyle = '#f0f';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.hole.x, this.hole.y, this.hole.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw Ball
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#fff';
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Draw Aim Line
        if (this.state === 'AIMING' && this.dragStart && this.dragCurrent) {
            this.ctx.strokeStyle = '#ff0055';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.ball.x, this.ball.y);
            this.ctx.lineTo(this.ball.x + (this.dragStart.x - this.dragCurrent.x), this.ball.y + (this.dragStart.y - this.dragCurrent.y));
            this.ctx.stroke();
        }

        this.particleSystem.draw(this.ctx);
    }

    shutdown() {
        this.isRunning = false;
        // Remove listeners
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        if (this.canvas) {
            // this.canvas.removeEventListener('mousedown', this.handleMouseDown); // Bind returns new function, so this won't work perfectly unless stored.
            // But canvas is being removed from DOM anyway.
        }
        this.container.innerHTML = '';
    }
}
