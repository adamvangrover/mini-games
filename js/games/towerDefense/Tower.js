import { CONFIG } from './config.js';
import { drawNeonRect, drawNeonCircle } from './utils.js';
import ParticleSystem from '../../core/ParticleSystem.js';

export default class Tower {
    constructor(c, r, type) {
        this.c = c;
        this.r = r;
        this.x = c * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.y = r * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        this.type = type;
        const stats = CONFIG.TOWERS[type.toUpperCase()];

        this.name = stats.name;
        this.range = stats.range;
        this.damage = stats.damage;
        this.fireRate = stats.fireRate;
        this.color = stats.color;

        this.cooldown = 0;
        this.level = 1;
        this.totalSpent = stats.cost;

        this.target = null;
        this.angle = 0;
    }

    upgrade() {
        const cost = this.getUpgradeCost();
        this.level++;
        this.damage *= 1.3;
        this.range *= 1.1;
        this.fireRate *= 0.9;
        this.totalSpent += cost;

        // Visual effect
        ParticleSystem.getInstance().emit(this.x, this.y, '#ffffff', 20, { speed: 100 });
    }

    getUpgradeCost() {
        return Math.floor(this.totalSpent * 0.5);
    }

    getSellValue() {
        return Math.floor(this.totalSpent * 0.7);
    }

    update(dt, enemies, addProjectile) {
        this.cooldown -= dt;

        // Find target
        if (!this.target || this.target.hp <= 0 || !this.inRange(this.target)) {
            this.target = this.findTarget(enemies);
        }

        if (this.target) {
            // Rotate towards target
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.angle = Math.atan2(dy, dx);

            if (this.cooldown <= 0) {
                this.fire(addProjectile);
                this.cooldown = this.fireRate;
            }
        }
    }

    inRange(enemy) {
        const dist = Math.sqrt((enemy.x - this.x)**2 + (enemy.y - this.y)**2);
        return dist <= this.range;
    }

    findTarget(enemies) {
        let best = null;
        let bestDist = Infinity;
        // Simple strategy: Closest
        // Better strategy: Furthest along path (closest to base)
        // Let's do Closest to Base logic if enemy has 'distanceToEnd' property, else closest to tower

        for (const e of enemies) {
            if (this.inRange(e)) {
                // Prioritize enemies closer to end (less distance to travel)
                // But we don't track that easily without recalculating.
                // Using array index if sorted? No.
                // Let's stick to Closest to Tower for now, or First in array (usually spawned earlier)

                // Let's use simple distance to tower for stability
                const d = Math.sqrt((e.x - this.x)**2 + (e.y - this.y)**2);
                if (d < bestDist) {
                    bestDist = d;
                    best = e;
                }
            }
        }
        return best;
    }

    fire(addProjectile) {
        addProjectile({
            x: this.x,
            y: this.y,
            target: this.target,
            damage: this.damage,
            speed: 600,
            type: this.type,
            color: this.color
        });

        // Recoil/Flash effect?
    }

    draw(ctx) {
        // Draw Base
        drawNeonRect(ctx, this.x - 20, this.y - 20, 40, 40, '#1e293b');

        // Draw Range if hovered (handled by UI/Game usually, but we can check a flag)

        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw Turret Body
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        // Draw Barrel
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(0, -5, 25, 10);

        // Level Indicator
        if (this.level > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.fillText(this.level, -3, 3);
        }

        ctx.restore();
    }
}
