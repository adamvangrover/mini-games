import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class JellyRacer {
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
    }

    async init(container) {
        this.container = container;

        // Setup minimal UI and Canvas
        this.container.innerHTML = `
            <div class="relative w-full h-full bg-black overflow-hidden font-mono select-none" id="jellyRacer-ui">
                <canvas id="jellyRacer-canvas" class="absolute inset-0 block"></canvas>
                <div class="absolute inset-0 flex items-center justify-center text-white z-10 pointer-events-none">
                    <div class="text-center bg-black/80 p-6 rounded-xl border border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]">
                        <h1 class="text-3xl font-bold text-cyan-400 mb-2">Soft-Body Physics Toy</h1>
                        <p class="text-slate-300 max-w-md">Drive a squishy, soft-body vehicle over rugged terrain.</p>
                        <p class="text-yellow-400 mt-4 animate-pulse">Under Construction...</p>
                    </div>
                </div>
                <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded font-bold z-20 transition-colors pointer-events-auto">BACK</button>
            </div>
        `;

        this.canvas = this.container.querySelector('#jellyRacer-canvas');
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        this.resize();

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    loop(timestamp) {
        if (!this.canvas) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(Math.min(dt, 0.1));
        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
        // Logic placeholder
    }

    draw() {
        if (!this.ctx) return;

        // Minimal dynamic background placeholder
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const t = performance.now() * 0.001;
        this.ctx.fillStyle = `hsl(${(t * 50) % 360}, 100%, 50%)`;
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width/2 + Math.cos(t) * 50, this.canvas.height/2 + Math.sin(t) * 50, 5, 0, Math.PI*2);
        this.ctx.fill();
    }

    resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.boundResize);
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
