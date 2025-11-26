export default class ParticleSystem {
    constructor() {
        if (ParticleSystem.instance) return ParticleSystem.instance;
        this.particles = [];
        ParticleSystem.instance = this;
    }

    static getInstance() {
        return ParticleSystem.instance || new ParticleSystem();
    }

    emit(ctx, x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200, // Speed
                vy: (Math.random() - 0.5) * 200,
                life: 1.0, // 0 to 1
                color: color,
                size: Math.random() * 4 + 1
            });
        }
    }

    update(dt) {
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 2; // Fade out speed
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx) {
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.rect(p.x, p.y, p.size, p.size);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    // Helper to get screen shake offset
    getShake(intensity = 0) {
        if (intensity <= 0) return {x:0, y:0};
        return {
            x: (Math.random() - 0.5) * intensity,
            y: (Math.random() - 0.5) * intensity
        };
    }
}
