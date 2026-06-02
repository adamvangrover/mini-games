import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonSwarm {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.player = { x: 0, y: 0, targetX: 0, targetY: 0, speed: 300, radius: 15 };
        this.enemies = [];
        this.bullets = [];
        this.score = 0;
        this.spawnTimer = 0;
        this.spawnRate = 1.0;
        this.isGameOver = false;

        this.boundResize = this.resize.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundClick = this.handleClick.bind(this);
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.canvas.addEventListener('mousedown', this.boundClick);

        this.resize();
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;

        this.isActive = true;
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.player.targetX = e.clientX - rect.left;
        this.player.targetY = e.clientY - rect.top;
    }

    handleClick(e) {
        if (this.isGameOver) {
            this.reset();
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const dx = clickX - this.player.x;
        const dy = clickY - this.player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > 0) {
            this.bullets.push({
                x: this.player.x,
                y: this.player.y,
                vx: (dx / dist) * 800,
                vy: (dy / dist) * 800,
                active: true
            });
            this.soundManager.playSound('click');
        }
    }

    reset() {
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.enemies = [];
        this.bullets = [];
        this.score = 0;
        this.spawnRate = 1.0;
        this.isGameOver = false;
    }

    loop(timestamp) {
        if (!this.isActive) return;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.isGameOver) return;

        // Player Move
        const pdx = this.player.targetX - this.player.x;
        const pdy = this.player.targetY - this.player.y;
        const pDist = Math.sqrt(pdx*pdx + pdy*pdy);
        if (pDist > 5) {
            this.player.x += (pdx / pDist) * this.player.speed * dt;
            this.player.y += (pdy / pDist) * this.player.speed * dt;
        }

        // Spawn Enemies
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnRate) {
            this.spawnTimer = 0;
            this.spawnRate = Math.max(0.2, this.spawnRate - 0.05); // Speed up

            // Spawn at edge
            let ex, ey;
            if (Math.random() > 0.5) {
                ex = Math.random() > 0.5 ? 0 : this.canvas.width;
                ey = Math.random() * this.canvas.height;
            } else {
                ex = Math.random() * this.canvas.width;
                ey = Math.random() > 0.5 ? 0 : this.canvas.height;
            }
            this.enemies.push({ x: ex, y: ey, radius: 10, speed: 100 + Math.random()*50, active: true });
        }

        // Move Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            // Offscreen
            if (b.x < 0 || b.x > this.canvas.width || b.y < 0 || b.y > this.canvas.height) {
                this.bullets.splice(i, 1);
            }
        }

        // Move Enemies & Collisions
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const edx = this.player.x - e.x;
            const edy = this.player.y - e.y;
            const eDistSq = edx*edx + edy*edy;

            // Player collision
            const pRadSq = (this.player.radius + e.radius) * (this.player.radius + e.radius);
            if (eDistSq < pRadSq) {
                this.isGameOver = true;
                this.soundManager.playSound('hit');
                continue;
            }

            const eDist = Math.sqrt(eDistSq);
            if (eDist > 0) {
                e.x += (edx / eDist) * e.speed * dt;
                e.y += (edy / eDist) * e.speed * dt;
            }

            // Bullet collision
            let hit = false;
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                const bdx = b.x - e.x;
                const bdy = b.y - e.y;
                if (bdx*bdx + bdy*bdy < e.radius*e.radius) {
                    hit = true;
                    this.bullets.splice(j, 1);
                    break;
                }
            }

            if (hit) {
                this.enemies.splice(i, 1);
                this.score += 10;
                this.soundManager.playSound('coin');
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.fillStyle = '#000010';
        this.ctx.fillRect(0, 0, w, h);

        // Bullets (optimized rects)
        this.ctx.fillStyle = '#ffffff';
        for (const b of this.bullets) {
            this.ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
        }

        // Enemies
        this.ctx.fillStyle = '#ff00ff';
        for (const e of this.enemies) {
            this.ctx.beginPath();
            this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2);
            this.ctx.fill();
        }

        // Player
        this.ctx.fillStyle = '#00ffff';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI*2);
        this.ctx.fill();

        // Crosshair
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.targetX - 10, this.player.targetY);
        this.ctx.lineTo(this.player.targetX + 10, this.player.targetY);
        this.ctx.moveTo(this.player.targetX, this.player.targetY - 10);
        this.ctx.lineTo(this.player.targetX, this.player.targetY + 10);
        this.ctx.stroke();

        // UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);

        if (this.isGameOver) {
             this.ctx.textAlign = 'center';
             this.ctx.fillStyle = '#ff0000';
             this.ctx.font = 'bold 48px monospace';
             this.ctx.fillText('SWARMED', w/2, h/2);
             this.ctx.font = '20px monospace';
             this.ctx.fillText('CLICK TO RESTART', w/2, h/2 + 40);
        }
    }

    async shutdown() {
        this.isActive = false;
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);

        window.removeEventListener('resize', this.boundResize);
        if(this.canvas) {
            this.canvas.removeEventListener('mousemove', this.boundMouseMove);
            this.canvas.removeEventListener('mousedown', this.boundClick);
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
