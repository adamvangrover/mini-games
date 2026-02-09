export class Particle {
    x: number;
    y: number;
    text: string;
    color: string;
    life: number = 1.0; // Seconds
    vy: number = -20; // Velocity Y

    constructor(x: number, y: number, text: string, color: string) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
    }

    update(dt: number) {
        this.y += this.vy * dt;
        this.life -= dt;
    }
}

export class ParticleSystem {
    particles: Particle[] = [];
    ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    spawn(x: number, y: number, text: string, color: string) {
        this.particles.push(new Particle(x, y, text, color));
    }

    update(dt: number) {
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw() {
        this.ctx.font = '20px "VT323", monospace';
        this.ctx.textAlign = 'center';

        this.particles.forEach(p => {
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.fillText(p.text, p.x, p.y);
        });

        this.ctx.globalAlpha = 1.0;
        this.ctx.textAlign = 'left';
    }
}
