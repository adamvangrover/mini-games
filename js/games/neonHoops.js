import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonHoops {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;

        this.score = 0;
        this.balls = []; // Array of active balls
        this.hoop = { x: 700, y: 300, radius: 40, direction: 1, speed: 2 };

        this.input = {
            isDragging: false,
            start: {x:0, y:0},
            current: {x:0, y:0}
        };

        this.timeLeft = 60;
    }

    async init(container) {
        this.container = container;

        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.className = 'w-full h-full object-contain bg-slate-900 border-2 border-orange-500 rounded-lg shadow-[0_0_20px_rgba(255,165,0,0.3)]';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // UI
        this.uiLayer = document.createElement('div');
        this.uiLayer.className = 'absolute top-4 left-4 text-white font-mono pointer-events-none';
        this.uiLayer.innerHTML = `
            <div class="text-xl text-orange-400 font-bold drop-shadow-[0_0_5px_rgba(255,165,0,0.8)]">NEON HOOPS</div>
            <div>Score: <span id="hoops-score">0</span></div>
            <div>Time: <span id="hoops-time">60</span></div>
        `;
        this.container.appendChild(this.uiLayer);

        // Back Button
        const backBtn = document.createElement('button');
        backBtn.className = 'absolute top-4 right-4 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 back-btn z-50';
        backBtn.innerText = 'Exit';
        backBtn.onclick = () => window.miniGameHub.goBack();
        this.container.appendChild(backBtn);

        this.isRunning = true;
        this.score = 0;
        this.balls = [];
        this.timeLeft = 60;

        // Listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        // Start drag anywhere on left side
        if (x < 300) {
            this.input.isDragging = true;
            this.input.start = {x, y};
            this.input.current = {x, y};
        }
    }

    handleMouseMove(e) {
        if (!this.input.isDragging) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        this.input.current = {x, y};
    }

    handleMouseUp(e) {
        if (!this.input.isDragging) return;

        const dx = this.input.start.x - this.input.current.x;
        const dy = this.input.start.y - this.input.current.y;

        const power = Math.min(Math.sqrt(dx*dx + dy*dy), 300) * 0.15;
        const angle = Math.atan2(dy, dx);

        if (power > 2) {
            this.balls.push({
                x: this.input.start.x,
                y: this.input.start.y,
                vx: Math.cos(angle) * power,
                vy: Math.sin(angle) * power,
                radius: 15,
                scored: false
            });
            this.soundManager.playSound('click');
        }

        this.input.isDragging = false;
    }

    update(dt) {
        if (!this.isRunning) return;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.isRunning = false;
            window.miniGameHub.showGameOver(this.score, () => {
                this.score = 0;
                this.timeLeft = 60;
                this.balls = [];
                this.isRunning = true;
            });
            return;
        }

        // Update UI
        const timeEl = this.container.querySelector('#hoops-time');
        if(timeEl) timeEl.textContent = Math.ceil(this.timeLeft);

        // Update Hoop
        this.hoop.y += this.hoop.speed * this.hoop.direction;
        if (this.hoop.y < 100 || this.hoop.y > 500) {
            this.hoop.direction *= -1;
        }

        // Update Balls
        for (let i = this.balls.length - 1; i >= 0; i--) {
            let b = this.balls[i];
            b.vy += 15 * dt; // Gravity (pixels/s/s needs scaling, assume dt is sec)
             // Actually, usually gravity is ~9.8 * scale. Let's say scale is 50px/m -> 500 px/s2
            b.vy += 20 * dt * 10; // stronger gravity feeling

            b.x += b.vx;
            b.y += b.vy;

            // Floor bounce
            if (b.y > 580) {
                b.y = 580;
                b.vy *= -0.6;
            }
            // Walls
            if (b.x > 790 || b.x < 10) {
                b.vx *= -0.6;
            }

            // Hoop Collision (Rim)
            // Hoop is at this.hoop.x, this.hoop.y
            // Rim points: x-radius, x+radius
            const rimL = { x: this.hoop.x - this.hoop.radius, y: this.hoop.y };
            const rimR = { x: this.hoop.x + this.hoop.radius, y: this.hoop.y };

            [rimL, rimR].forEach(p => {
                let dx = b.x - p.x;
                let dy = b.y - p.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < b.radius + 5) { // Rim thickness
                    // Bounce
                    let nx = dx / dist;
                    let ny = dy / dist;
                    // Reflect
                    let vDot = b.vx * nx + b.vy * ny;
                    b.vx -= 2 * vDot * nx;
                    b.vy -= 2 * vDot * ny;
                    // Push out
                    b.x += nx * (b.radius + 5 - dist);
                    b.y += ny * (b.radius + 5 - dist);
                    b.vx *= 0.7;
                    b.vy *= 0.7;
                }
            });

            // Scoring
            // Check if passed through hoop plane from top
            // Hoop plane Y
            // Must be within x range
            if (!b.scored &&
                b.vy > 0 &&
                Math.abs(b.x - this.hoop.x) < this.hoop.radius - 5 &&
                Math.abs(b.y - this.hoop.y) < 10) {
                    this.score += 2; // 2 points!
                    this.container.querySelector('#hoops-score').textContent = this.score;
                    b.scored = true;
                    this.soundManager.playSound('score');
                    this.particleSystem.emit(this.hoop.x, this.hoop.y, '#FFA500', 15);
            }

            // Remove if off screen or stopped
            if (b.x > 850 || b.x < -50 || (Math.abs(b.vy) < 0.1 && b.y > 570)) {
                this.balls.splice(i, 1);
            }
        }

        this.particleSystem.update(dt);
    }

    draw() {
        if (!this.ctx) return;

        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Hoop
        this.ctx.strokeStyle = '#f97316'; // Orange-500
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(this.hoop.x - this.hoop.radius, this.hoop.y);
        this.ctx.lineTo(this.hoop.x + this.hoop.radius, this.hoop.y);
        this.ctx.stroke();

        // Backboard
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.fillRect(this.hoop.x + this.hoop.radius, this.hoop.y - 50, 10, 60);

        // Net (Visual only)
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.hoop.x - this.hoop.radius, this.hoop.y);
        this.ctx.lineTo(this.hoop.x - this.hoop.radius + 10, this.hoop.y + 40);
        this.ctx.lineTo(this.hoop.x + this.hoop.radius - 10, this.hoop.y + 40);
        this.ctx.lineTo(this.hoop.x + this.hoop.radius, this.hoop.y);
        this.ctx.stroke();

        // Draw Balls
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#f97316';
        this.ctx.fillStyle = '#f97316';
        for (let b of this.balls) {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;

        // Draw Aim Line
        if (this.input.isDragging) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.input.start.x, this.input.start.y);
            // Inverse line to show trajectory direction roughly
            let dx = this.input.start.x - this.input.current.x;
            let dy = this.input.start.y - this.input.current.y;
            this.ctx.lineTo(this.input.start.x + dx, this.input.start.y + dy);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        this.particleSystem.draw(this.ctx);
    }

    shutdown() {
        this.isRunning = false;
        // Clean listeners if needed, though they are mostly bound to this instance or handled by GC when container cleared
        this.container.innerHTML = '';
    }
}
