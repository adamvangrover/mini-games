import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class CyberWheel {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.cash = 0;
        this.spinVelocity = 0;
        this.rotation = 0;
        this.isSpinning = false;

        this.prizes = [
            { label: '$1000', value: 1000, color: '#00ff00' },
            { label: 'BANKRUPT', value: 0, color: '#ff0000' },
            { label: '$500', value: 500, color: '#00ffff' },
            { label: '$250', value: 250, color: '#ff00ff' },
            { label: 'BANKRUPT', value: 0, color: '#ff0000' },
            { label: '$750', value: 750, color: '#ffff00' },
            { label: '$100', value: 100, color: '#ff8800' },
            { label: '$5000', value: 5000, color: '#ffffff' }
        ];

        this.segments = this.prizes.length;
        this.arc = (2 * Math.PI) / this.segments;
        this.currentSegment = 0;

        this.boundResize = this.resize.bind(this);
        this.boundClick = this.handleClick.bind(this);
    }

    async init(container) {
        this.container = container;

        // Spin Button Overlay
        const btnContainer = document.createElement('div');
        btnContainer.className = "absolute bottom-10 w-full flex justify-center z-10 pointer-events-none";

        this.spinBtn = document.createElement('button');
        this.spinBtn.className = "px-8 py-4 bg-fuchsia-900 border-2 border-fuchsia-400 text-fuchsia-100 font-bold text-2xl tracking-widest rounded-lg shadow-[0_0_15px_rgba(255,0,255,0.6)] hover:bg-fuchsia-700 hover:shadow-[0_0_25px_rgba(255,0,255,0.9)] transition-all pointer-events-auto font-mono";
        this.spinBtn.innerText = "SPIN WHEEL";
        this.spinBtn.onclick = this.boundClick;

        btnContainer.appendChild(this.spinBtn);
        this.container.appendChild(btnContainer);

        // Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);

        this.resize();
        this.isActive = true;
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.draw();
    }

    handleClick() {
        if (!this.isSpinning) {
            this.isSpinning = true;
            this.spinVelocity = Math.random() * 10 + 20; // Random initial velocity
            this.soundManager.playSound('jump'); // Whoosh sound
            this.spinBtn.classList.add('opacity-50', 'pointer-events-none');
        }
    }

    loop(timestamp) {
        if (!this.isActive) return;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.isSpinning) {
            this.rotation += this.spinVelocity * dt;
            // Friction
            this.spinVelocity -= this.spinVelocity * 0.5 * dt;

            // Tick sound tracking
            const newSegment = Math.floor(this.segments - (this.rotation / this.arc) % this.segments) % this.segments;
            if (newSegment !== this.currentSegment) {
                this.currentSegment = newSegment;
                this.soundManager.playSound('click'); // Tick
            }

            if (this.spinVelocity < 0.1) {
                this.isSpinning = false;
                this.spinVelocity = 0;
                this.resolveSpin();
            }
        }
    }

    resolveSpin() {
        const prize = this.prizes[this.currentSegment];
        if (prize.value === 0) {
            this.cash = 0;
            this.soundManager.playSound('error');
        } else {
            this.cash += prize.value;
            this.soundManager.playSound('coin');
        }

        setTimeout(() => {
             this.spinBtn.classList.remove('opacity-50', 'pointer-events-none');
        }, 1000);
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2 - 20;
        const r = Math.min(w, h) * 0.35;

        this.ctx.fillStyle = '#05050a';
        this.ctx.fillRect(0, 0, w, h);

        // Draw Wheel
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(this.rotation);

        for (let i = 0; i < this.segments; i++) {
            const angle = i * this.arc;
            const prize = this.prizes[i];

            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, r, angle, angle + this.arc);
            this.ctx.lineTo(0, 0);

            // Segment Fill
            this.ctx.fillStyle = (i % 2 === 0) ? '#111' : '#222';
            this.ctx.fill();

            // Segment Stroke (Neon)
            this.ctx.strokeStyle = prize.color;
            this.ctx.lineWidth = 4;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = prize.color;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0; // reset

            // Text
            this.ctx.save();
            this.ctx.translate(Math.cos(angle + this.arc / 2) * (r * 0.65),
                               Math.sin(angle + this.arc / 2) * (r * 0.65));
            this.ctx.rotate(angle + this.arc / 2);
            this.ctx.fillStyle = prize.color;
            this.ctx.font = 'bold 20px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(prize.label, 0, 0);
            this.ctx.restore();
        }
        this.ctx.restore();

        // Draw Center Hub
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        this.ctx.fillStyle = '#000';
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 5;
        this.ctx.stroke();

        // Draw Pointer (Top)
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 20, cy - r - 20);
        this.ctx.lineTo(cx + 20, cy - r - 20);
        this.ctx.lineTo(cx, cy - r + 10);
        this.ctx.closePath();
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`TOTAL WINNINGS: $${this.cash}`, 20, 40);

        // Winning Banner
        if (!this.isSpinning && this.spinVelocity === 0 && this.cash > 0 && this.prizes[this.currentSegment].value > 0) {
             this.ctx.textAlign = 'center';
             this.ctx.fillStyle = this.prizes[this.currentSegment].color;
             this.ctx.font = 'bold 36px monospace';
             this.ctx.fillText(`YOU WON ${this.prizes[this.currentSegment].label}!`, w/2, cy + r + 50);
        } else if (!this.isSpinning && this.spinVelocity === 0 && this.prizes[this.currentSegment].value === 0 && this.cash === 0) {
             this.ctx.textAlign = 'center';
             this.ctx.fillStyle = '#ff0000';
             this.ctx.font = 'bold 36px monospace';
             this.ctx.fillText(`BANKRUPT!`, w/2, cy + r + 50);
        }
    }

    async shutdown() {
        this.isActive = false;
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);

        window.removeEventListener('resize', this.boundResize);

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
