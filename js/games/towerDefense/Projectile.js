import ParticleSystem from '../../core/ParticleSystem.js';

export default class Projectile {
    constructor(data) {
        this.x = data.x;
        this.y = data.y;
        this.target = data.target;
        this.damage = data.damage;
        this.speed = data.speed;
        this.type = data.type;
        this.color = data.color;
        this.hit = false;
        this.particles = ParticleSystem.getInstance();
    }

    update(dt) {
        if (this.hit) return;

        // If target dead, continue to last known pos? Or just fizzle?
        // Let's just fizzle if target is effectively gone/null, or continue straight.
        // For simplicity, homing always hits unless target removed from game before hit.

        if (!this.target || this.target.hp <= 0) {
            this.hit = true; // Dissipate
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 15) {
            // Hit
            this.hit = true;
            this.target.takeDamage(this.damage, this.type);
            this.particles.emit(this.x, this.y, this.color, 5, { speed: 50, life: 0.5 });

            if (this.type === 'splash') {
                // Handle splash damage is usually done by Game or Projectile needs access to enemy list
                // We'll signal "hit" and let Game handle logic or pass enemy list?
                // Actually, cleaner if Projectile handles single target, Game handles complex logic.
                // But `update` is called by Game.
                // Let's add an `onHit` callback or just return a status.
            }
        } else {
            this.x += (dx/dist) * this.speed * dt;
            this.y += (dy/dist) * this.speed * dt;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI*2);
        ctx.fill();

        // Trail
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - (this.target.x - this.x)*0.1, this.y - (this.target.y - this.y)*0.1);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}
