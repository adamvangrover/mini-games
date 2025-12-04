import { CONFIG } from './config.js';
import { drawNeonCircle } from './utils.js';

export default class Enemy {
    constructor(waypoints, wave) {
        this.waypoints = waypoints;
        this.wpIndex = 0;

        // Spawn at first waypoint
        this.x = waypoints[0].c * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.y = waypoints[0].r * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        this.wpIndex = 1; // Moving to 2nd point immediately

        // Stats based on wave
        const mult = Math.pow(CONFIG.WAVES.DIFFICULTY_MULTIPLIER, wave - 1);

        // Determine type randomly based on wave
        const rand = Math.random();

        if (wave > 3 && rand < 0.2) {
            this.type = 'fast';
            this.hp = CONFIG.WAVES.BASE_HP * mult * 0.6;
            this.speed = 150 + (wave * 2);
            this.color = '#facc15';
            this.radius = 10;
        } else if (wave > 5 && rand > 0.8) {
            this.type = 'tank';
            this.hp = CONFIG.WAVES.BASE_HP * mult * 2.5;
            this.speed = 60;
            this.color = '#8b5cf6';
            this.radius = 18;
        } else {
            this.type = 'normal';
            this.hp = CONFIG.WAVES.BASE_HP * mult;
            this.speed = 100 + wave;
            this.color = '#f87171';
            this.radius = 14;
        }

        if (wave % 10 === 0 && wave > 0) { // Boss every 10 levels
            this.type = 'boss';
            this.hp *= 10;
            this.speed *= 0.8;
            this.radius = 25;
            this.color = '#ef4444';
        }

        this.maxHp = this.hp;
        this.reward = Math.floor(CONFIG.WAVES.BASE_REWARD * (1 + wave * 0.1));
        if (this.type === 'boss') this.reward *= 10;

        this.reachedEnd = false;
        this.frozenTimer = 0;
    }

    update(dt) {
        if (this.reachedEnd) return;

        let currentSpeed = this.speed;

        // Handle status effects
        if (this.frozenTimer > 0) {
            currentSpeed *= 0.5;
            this.frozenTimer -= dt;
        }

        // Movement
        if (this.wpIndex >= this.waypoints.length) {
            this.reachedEnd = true;
            return;
        }

        const target = this.waypoints[this.wpIndex];
        const tx = target.c * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const ty = target.r * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 5) {
            this.wpIndex++;
        } else {
            this.x += (dx/dist) * currentSpeed * dt;
            this.y += (dy/dist) * currentSpeed * dt;
        }
    }

    takeDamage(amount, type) {
        this.hp -= amount;
        if (type === 'frost') {
            this.frozenTimer = 2.0; // Slow for 2 seconds
        }
    }

    draw(ctx) {
        drawNeonCircle(ctx, this.x, this.y, this.radius, this.frozenTimer > 0 ? '#67e8f9' : this.color);

        // Health Bar
        const percent = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30, 4);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30 * percent, 4);
    }
}
