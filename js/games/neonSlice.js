import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

class Blade {
    constructor() {
        this.points = [];
        this.maxPoints = 20;
        this.color = '#ffffff';
        this.width = 8; // Thicker blade
    }

    addPoint(x, y) {
        this.points.push({ x, y, life: 1.0 });
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }

    update(dt) {
        for (let i = this.points.length - 1; i >= 0; i--) {
            this.points[i].life -= dt * 8; // Fast fade
            if (this.points[i].life <= 0) {
                this.points.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        if (this.points.length < 2) return;

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0ff';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer Glow
        ctx.beginPath();
        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i+1];
            ctx.strokeStyle = `rgba(0, 255, 255, ${p1.life * 0.5})`;
            ctx.lineWidth = this.width * p1.life * 2;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        // Inner Core
        ctx.beginPath();
        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i+1];
            ctx.strokeStyle = `rgba(255, 255, 255, ${p1.life})`;
            ctx.lineWidth = this.width * p1.life;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }
}

class Sliceable {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'fruit' or 'bomb'
        this.vx = (Math.random() - 0.5) * 300;
        this.vy = -Math.random() * 400 - 600;
        this.radius = 40;
        this.active = true;
        this.rotation = 0;
        this.rotSpeed = (Math.random() - 0.5) * 5;
        this.gravity = 1000;

        // Icon mapping
        if (type === 'bomb') {
            this.icon = '\uf1e2'; // Bomb
            this.color = '#ef4444';
        } else {
            const fruits = [
                { icon: '\uf179', color: '#ef4444' }, // Apple
                { icon: '\uf094', color: '#eab308' }, // Lemon
                { icon: '\uf787', color: '#f97316' }, // Carrot
                { icon: '\uf816', color: '#22c55e' }, // Pepper
                { icon: '\uf5d1', color: '#8b5cf6' }, // Grapes (using apple alt?) -> actually f5d1 is apple-alt. Let's use simple ones.
                { icon: '\uf135', color: '#3b82f6' }  // Rocket (Bonus?) -> No keep to fruits/food
            ];
            const f = fruits[Math.floor(Math.random() * fruits.length)];
            this.icon = f.icon;
            this.color = f.color;
        }
    }

    update(dt) {
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotSpeed * dt;
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        ctx.font = '900 60px "Font Awesome 6 Free"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, 0, 0);

        ctx.restore();
    }
}

export default class NeonSlice {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;

        this.blade = new Blade();
        this.objects = [];
        this.spawnTimer = 0;
        this.score = 0;
        this.isActive = false;

        this.resizeHandler = this.resize.bind(this);
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', this.resizeHandler);

        this.resetGame();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    resetGame() {
        this.objects = [];
        this.blade.points = [];
        this.spawnTimer = 0;
        this.score = 0;
        this.isActive = true;
    }

    update(dt) {
        if (!this.isActive) return;

        const mouse = this.inputManager.getMouse();

        if (mouse.down) {
            const lastP = this.blade.points[this.blade.points.length-1];
            if (!lastP || Math.hypot(mouse.x - lastP.x, mouse.y - lastP.y) > 5) {
                this.blade.addPoint(mouse.x, mouse.y);
                this.checkSlices(mouse.x, mouse.y);
            }
        }
        this.blade.update(dt);

        this.spawnTimer += dt;
        const spawnRate = Math.max(0.5, 2.0 - (this.score / 50));

        if (this.spawnTimer > spawnRate) {
            this.spawnObject();
            this.spawnTimer = 0;
        }

        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            obj.update(dt);
            if (obj.y > this.height + 100) {
                this.objects.splice(i, 1);
            }
        }
    }

    spawnObject() {
        const x = this.width * 0.2 + Math.random() * (this.width * 0.6);
        const y = this.height + 50;
        const type = Math.random() > 0.8 ? 'bomb' : 'fruit';
        this.objects.push(new Sliceable(x, y, type));
        this.soundManager.playSound('jump');
    }

    checkSlices(mx, my) {
        if (this.blade.points.length < 2) return;

        const p1 = this.blade.points[this.blade.points.length - 2];
        const p2 = { x: mx, y: my };

        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (!obj.active) continue;

            const dist = this.distToSegment(obj, p1, p2);

            if (dist < obj.radius) {
                this.sliceObject(obj, i);
            }
        }
    }

    distToSegment(p, v, w) {
        const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
        if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    sliceObject(obj, index) {
        if (obj.type === 'bomb') {
            this.gameOver();
        } else {
            this.score++;
            this.soundManager.playSound('score');

            // Visual Juice
            this.particleSystem.emit(obj.x, obj.y, obj.color, 20);

            // Draw "half" fruits falling apart?
            // Too complex for simple canvas without images, just particles is fine for now.
            // Maybe emit text "+1"?

            this.objects.splice(index, 1);
        }
    }

    gameOver() {
        this.isActive = false;
        this.soundManager.playSound('explosion');
        this.particleSystem.shake.intensity = 20;
        this.particleSystem.shake.duration = 1.0;

        window.miniGameHub.showGameOver(this.score, () => this.resetGame());
    }

    draw() {
        // Dojo Background
        this.ctx.fillStyle = '#1e1b4b'; // Deep indigo
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Shoji Screen Pattern
        this.ctx.strokeStyle = '#312e81';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        for(let x=0; x<this.width; x+=100) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
        }
        for(let y=0; y<this.height; y+=100) {
             this.ctx.moveTo(0, y);
             this.ctx.lineTo(this.width, y);
        }
        this.ctx.stroke();

        this.objects.forEach(obj => obj.draw(this.ctx));
        this.blade.draw(this.ctx);
        this.particleSystem.updateAndDraw(this.ctx, 0.016);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 50px "Press Start 2P"';
        this.ctx.textAlign = 'right';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#f0f';
        this.ctx.fillText(this.score, this.width - 40, 80);

        if (this.score === 0 && this.objects.length > 0) {
            this.ctx.font = '20px "Poppins"';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#aaa';
            this.ctx.shadowBlur = 0;
            this.ctx.fillText('Swipe to Slice!', this.width/2, this.height/2);
        }
    }

    shutdown() {
        window.removeEventListener('resize', this.resizeHandler);
        if (this.canvas) this.canvas.remove();
    }
}
