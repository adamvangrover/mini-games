export default class BackgroundShader {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'bg-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.stars = [];
        this.initStars();

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initStars() {
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                z: Math.random() * 2 + 1, // Depth/Speed
                size: Math.random() * 2
            });
        }
    }

    loop() {
        this.ctx.fillStyle = '#050010'; // Deep dark purple/black
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Retro Grid
        this.drawGrid();

        // Draw Stars
        this.ctx.fillStyle = '#ffffff';
        this.stars.forEach(star => {
            star.y += star.z * 0.5;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }

            const alpha = Math.random() * 0.5 + 0.5;
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        requestAnimationFrame(this.loop);
    }

    drawGrid() {
        const time = Date.now() * 0.001;
        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.2)';
        this.ctx.lineWidth = 1;

        const perspectiveY = this.canvas.height * 0.5;

        // Vertical lines (moving perspective)
        // This is a simple pseudo-3d effect

        // Horizontal lines
        const lineCount = 20;
        const speed = (time * 50) % (this.canvas.height / lineCount);

        for (let i = 0; i < this.canvas.height; i += 40) {
            let y = i + speed;
            if (y > this.canvas.height) y -= this.canvas.height;

            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        // Vertical Lines
        for(let x = 0; x < this.canvas.width; x += 60) {
             this.ctx.beginPath();
             this.ctx.moveTo(x, 0);
             this.ctx.lineTo(x, this.canvas.height);
             this.ctx.stroke();
        }
    }
}
