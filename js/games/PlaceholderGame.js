export default class PlaceholderGame {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.text = "CONTENT NOT FOUND";
        this.subText = "Please verify file integrity.";
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        container.appendChild(this.canvas);

        // Handle resize
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.draw();
    }

    update(dt) {
        // No logic needed
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear with a "glitch" background
        this.ctx.fillStyle = '#110011';
        this.ctx.fillRect(0, 0, w, h);

        // Neon Grid Effect
        this.ctx.strokeStyle = '#330033';
        this.ctx.lineWidth = 2;
        const gridSize = 50;

        this.ctx.beginPath();
        for (let x = 0; x <= w; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
        }
        for (let y = 0; y <= h; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
        }
        this.ctx.stroke();

        // Text
        this.ctx.font = 'bold 40px "Press Start 2P", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Glow
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#ff0055';
        this.ctx.fillStyle = '#ff0055';
        this.ctx.fillText(this.text, w / 2, h / 2 - 30);

        this.ctx.font = '20px "Poppins", sans-serif';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00ffff';
        this.ctx.fillText(this.subText, w / 2, h / 2 + 30);

        this.ctx.shadowBlur = 0;
    }

    async shutdown() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.canvas) {
            this.canvas.remove();
        }
    }
}
