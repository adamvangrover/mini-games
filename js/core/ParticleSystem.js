export default class ParticleSystem {
    constructor() {
        if (ParticleSystem.instance) return ParticleSystem.instance;
        this.particles = [];
        this.shake = { x: 0, y: 0, magnitude: 0, duration: 0 };
        ParticleSystem.instance = this;
    }
    static getInstance() {
        if (!ParticleSystem.instance) ParticleSystem.instance = new ParticleSystem();
        return ParticleSystem.instance;
    }
    emit(x, y, color, count, options = {}) {
        for (let i = 0; i < count; i++) {
            const size = options.size || (Math.random() * 3 + 1);
            const life = options.life || 1.0;
            const velocity = options.velocity || { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 };

            // If random velocity is requested via option
            let vx = velocity.x;
            let vy = velocity.y;

            // If velocity wasn't passed, randomize it (default behavior)
            if (!options.velocity) {
                 vx = (Math.random() - 0.5) * 4;
                 vy = (Math.random() - 0.5) * 4;
            }

            this.particles.push({
                x: x, y: y,
                vx: vx,
                vy: vy,
                life: life,
                maxLife: life,
                color: color,
                size: size
            });
        }
    }
    setShake(magnitude) {
        this.shake.magnitude = magnitude;
        this.shake.duration = 0.5; // default duration
    }
    getShake() {
        if (this.shake.magnitude > 0) {
            return {
                x: (Math.random() - 0.5) * this.shake.magnitude,
                y: (Math.random() - 0.5) * this.shake.magnitude
            };
        }
        return { x: 0, y: 0 };
    }
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life -= dt * 2; // Decay
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        if (this.shake.magnitude > 0) {
            this.shake.magnitude -= dt * 30; // Decay shake
            if (this.shake.magnitude < 0) this.shake.magnitude = 0;
        }
    }

    updateAndDraw(ctx, dt) {
        this.update(dt);
        this.draw(ctx);
    }

    draw(ctx) {
        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = Math.max(0, p.life); // Fade out
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
    }
}
