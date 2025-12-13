import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonFlow {
    constructor() {
        this.input = InputManager.getInstance();
        this.sound = SoundManager.getInstance();
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.score = 0;
        this.lastPos = { x: 0, y: 0 };
        this.hue = 0;
        this.isActive = false;
    }

    async init(container) {
        this.container = container;
        this.container.style.background = '#000'; // Ensure black background

        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Bind resize
        this.resizeHandler = () => this.resize();
        window.addEventListener('resize', this.resizeHandler);

        // Add HUD
        this.hud = document.createElement('div');
        this.hud.style.position = 'absolute';
        this.hud.style.top = '20px';
        this.hud.style.left = '20px';
        this.hud.style.color = 'white';
        this.hud.style.fontFamily = "'Poppins', sans-serif";
        this.hud.style.pointerEvents = 'none';
        this.hud.style.userSelect = 'none';
        this.hud.innerHTML = `
            <h1 style="font-size: 2rem; margin: 0; text-shadow: 0 0 10px #f0f;">NEON FLOW</h1>
            <p style="font-size: 1.2rem;">Score: <span id="nf-score" style="color: #0ff; text-shadow: 0 0 10px #0ff;">0</span></p>
            <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 5px;">Drag to create flow • Relax & Enjoy</p>
        `;
        this.container.appendChild(this.hud);

        // Exit Button (Custom style to ensure visibility/touch target)
        this.exitBtn = document.createElement('button');
        this.exitBtn.innerHTML = '<i class="fas fa-times"></i>';
        this.exitBtn.className = 'glass-panel';
        this.exitBtn.style.position = 'absolute';
        this.exitBtn.style.top = '20px';
        this.exitBtn.style.right = '20px';
        this.exitBtn.style.width = '50px';
        this.exitBtn.style.height = '50px';
        this.exitBtn.style.borderRadius = '50%';
        this.exitBtn.style.border = '1px solid rgba(255,255,255,0.3)';
        this.exitBtn.style.color = 'white';
        this.exitBtn.style.fontSize = '1.5rem';
        this.exitBtn.style.cursor = 'pointer';
        this.exitBtn.style.zIndex = '100';
        this.exitBtn.style.display = 'flex';
        this.exitBtn.style.alignItems = 'center';
        this.exitBtn.style.justifyContent = 'center';

        this.exitBtn.onclick = (e) => {
             e.stopPropagation(); // Prevent drag
             this.finish();
        };
        this.container.appendChild(this.exitBtn);

        this.isActive = true;

        // Initialize position
        const mouse = this.input.getMouse();
        this.lastPos = { x: mouse.x, y: mouse.y };
    }

    resize() {
        if(!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    update(dt) {
        if (!this.isActive) return;

        const mouse = this.input.getMouse();

        // Interactive Logic
        if (mouse.down) {
            const dx = mouse.x - this.lastPos.x;
            const dy = mouse.y - this.lastPos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Generate particles if moving or just holding (if holding, slowly emit)
            if (dist > 2 || Math.random() < 0.1) {
                this.addParticles(mouse.x, mouse.y, dist);

                if (dist > 0) {
                    this.score += Math.floor(dist) + 1;
                    const scoreEl = document.getElementById('nf-score');
                    if(scoreEl) scoreEl.innerText = this.score.toLocaleString();

                    // Cycle hue faster when moving
                    this.hue = (this.hue + dist * 0.5 + 1) % 360;
                } else {
                    this.hue = (this.hue + 0.5) % 360;
                }
            }
        } else {
             this.hue = (this.hue + 0.1) % 360;
        }

        this.lastPos = { x: mouse.x, y: mouse.y };

        // Physics Update
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;

            // Drag/Friction
            p.vx *= 0.96;
            p.vy *= 0.96;

            // Gravity/Drift
            p.vy -= 0.05; // Float up slightly

            p.life -= dt;
            p.size *= 0.97;

            if (p.life <= 0 || p.size < 0.5) {
                this.particles.splice(i, 1);
            }
        }
    }

    addParticles(x, y, intensity) {
        const count = Math.min(5, Math.ceil(intensity / 2) + 1);
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + (intensity * 0.05);

            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.5 + Math.random(),
                size: 10 + Math.random() * 20,
                color: `hsl(${this.hue + (Math.random() * 40 - 20)}, 100%, 60%)`
            });
        }
    }

    draw() {
        if (!this.isActive || !this.ctx) return;

        // Trail effect: Draw a semi-transparent rect over everything
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = 'rgba(10, 2, 33, 0.2)'; // Dark purple tint for trail
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Particles
        this.ctx.globalCompositeOperation = 'lighter';

        for (const p of this.particles) {
            this.ctx.beginPath();
            // Gradient for particle
            const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            this.ctx.fillStyle = grad;
            this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    finish() {
        this.isActive = false;
        if (window.miniGameHub) {
            window.miniGameHub.showGameOver(this.score, () => {
                this.reset();
            });
        }
    }

    reset() {
        this.score = 0;
        this.particles = [];
        this.isActive = true;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const scoreEl = document.getElementById('nf-score');
        if(scoreEl) scoreEl.innerText = '0';
    }

    shutdown() {
        this.isActive = false;
        if(this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
        this.container.innerHTML = '';
    }
}
