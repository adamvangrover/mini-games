export default class PlaceholderGame {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.text = "COMING SOON";
        this.subText = "This module is under construction.";
        this.time = 0;
        this.particles = [];
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        container.appendChild(this.canvas);

        // Handle resize
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);

        // Add a back button if not present (handled by main.js error handler usually, but good for standalone use)
        if (!container.querySelector('button')) {
            const btn = document.createElement('button');
            btn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
            btn.className = "absolute top-4 left-4 px-6 py-2 bg-slate-800/80 hover:bg-fuchsia-600 text-white font-bold rounded-full border border-slate-600 hover:border-fuchsia-400 transition-all z-50 pointer-events-auto backdrop-blur-sm";
            btn.onclick = () => window.miniGameHub.goBack();
            container.appendChild(btn);
        }
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    update(dt) {
        this.time += dt;

        // Spawn glitch particles
        if (Math.random() < 0.1) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                w: Math.random() * 50 + 10,
                h: Math.random() * 5 + 1,
                life: 0.2
            });
        }

        this.particles.forEach(p => p.life -= dt);
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear with a "glitch" background
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, w, h);

        // Neon Grid Effect
        this.ctx.strokeStyle = `rgba(255, 0, 255, ${0.1 + Math.sin(this.time) * 0.05})`;
        this.ctx.lineWidth = 1;
        const gridSize = 60;

        // Moving grid
        const offset = (this.time * 20) % gridSize;

        this.ctx.beginPath();
        for (let x = 0; x <= w; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
        }
        for (let y = offset; y <= h; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            // Perspective line
            this.ctx.moveTo(w/2, h/2);
            this.ctx.lineTo((x - w/2) * 5 + w/2, h);
        }
        this.ctx.stroke();

        // Glitch Particles
        this.ctx.fillStyle = '#00ffff';
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life * 2;
            this.ctx.fillRect(p.x, p.y, p.w, p.h);
        });
        this.ctx.globalAlpha = 1;

        // Text
        this.ctx.save();
        this.ctx.translate(w/2, h/2);

        // Floating animation
        this.ctx.translate(0, Math.sin(this.time * 2) * 10);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Main Text Glow
        this.ctx.shadowBlur = 20 + Math.sin(this.time * 5) * 10;
        this.ctx.shadowColor = '#f0f';
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 40px "Press Start 2P", monospace';
        this.ctx.fillText(this.text, 0, -20);

        // Chromatic Aberration
        if (Math.random() < 0.05) {
             this.ctx.globalCompositeOperation = 'screen';
             this.ctx.fillStyle = '#f00';
             this.ctx.fillText(this.text, 2, -20);
             this.ctx.fillStyle = '#0ff';
             this.ctx.fillText(this.text, -2, -20);
             this.ctx.globalCompositeOperation = 'source-over';
        }

        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#0ff';
        this.ctx.fillStyle = '#0ff';
        this.ctx.font = '20px "Poppins", sans-serif';
        this.ctx.fillText(this.subText, 0, 40);

        this.ctx.restore();

        // Scanlines
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for(let i=0; i<h; i+=4) {
            this.ctx.fillRect(0, i, w, 1);
        }
    }

    async shutdown() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.canvas) {
            this.canvas.remove();
        }
        // Remove button if created
        if (this.container) {
            const btn = this.container.querySelector('button');
            if (btn) btn.remove();
        }
    }
}
