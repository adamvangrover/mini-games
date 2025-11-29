export default class ParticleSystem {
    constructor() {
        if (ParticleSystem.instance) return ParticleSystem.instance;
        this.particles = [];
        ParticleSystem.instance = this;
    }
    static getInstance() {
        if (!ParticleSystem.instance) ParticleSystem.instance = new ParticleSystem();
        return ParticleSystem.instance;
    }
    emit(ctx, x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    }
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life -= dt * 2;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }
    draw(ctx) {
        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
    }
}
