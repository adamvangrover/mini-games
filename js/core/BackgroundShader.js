export default class BackgroundShader {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.stars = [];
        this.initStars();

        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.initStars();
        });

        this.animate();
    }

    initStars() {
        this.stars = [];
        for(let i=0; i<100; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2,
                speed: Math.random() * 0.5 + 0.1
            });
        }
    }

    animate() {
        if (!this.ctx) return;

        // Deep dark blue/purple background
        const grad = this.ctx.createRadialGradient(
            this.width/2, this.height/2, 0,
            this.width/2, this.height/2, this.width
        );
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(1, '#020617');

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Stars
        this.ctx.fillStyle = '#ffffff';
        this.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > this.height) star.y = 0;

            this.ctx.globalAlpha = Math.random() * 0.5 + 0.3;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Grid Effect
        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.1)';
        this.ctx.lineWidth = 1;

        // Perspective Grid logic (simplified)
        const horizon = this.height * 0.6;
        const gridSpacing = 40;

        // Vertical lines
        /*
        for(let x = 0; x <= this.width; x+=100) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.width/2, horizon);
            this.ctx.lineTo(x + (x - this.width/2)*2, this.height);
            this.ctx.stroke();
        }
        */

        // Simple overlay scanline
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for(let i=0; i<this.height; i+=4) {
            this.ctx.fillRect(0, i, this.width, 1);
        }

        requestAnimationFrame(() => this.animate());
    }
}
