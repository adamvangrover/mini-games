import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonDrop {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // Ensure Matter.js is loaded
        if (typeof Matter === 'undefined') {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js";
            document.head.appendChild(script);
            await new Promise(resolve => script.onload = resolve);
        }

        this.initPhysics();
        this.resetGame();

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);

        // Input
        this.boundHandleClick = this.handleClick.bind(this);
        this.canvas.addEventListener('click', this.boundHandleClick);
        this.canvas.addEventListener('mousemove', (e) => this.mouseX = e.clientX);
    }

    initPhysics() {
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        // Walls
        const w = this.canvas.width;
        const h = this.canvas.height;
        const wallOpts = { isStatic: true, render: { fillStyle: '#333' } };

        this.ground = Matter.Bodies.rectangle(w/2, h + 50, w, 100, wallOpts);
        this.leftWall = Matter.Bodies.rectangle(-50, h/2, 100, h*2, wallOpts);
        this.rightWall = Matter.Bodies.rectangle(w + 50, h/2, 100, h*2, wallOpts);

        Matter.World.add(this.world, [this.ground, this.leftWall, this.rightWall]);

        Matter.Events.on(this.engine, 'collisionStart', (event) => this.handleCollisions(event));
    }

    resetGame() {
        // Clear bodies
        Matter.World.clear(this.world, false); // Keep static bodies? No, clear all dynamic
        Matter.World.add(this.world, [this.ground, this.leftWall, this.rightWall]);

        this.shapes = [];
        this.nextShape = 0;
        this.score = 0;
        this.isGameOver = false;
        this.canDrop = true;

        this.SHAPE_TYPES = [
            { radius: 15, color: '#f00', score: 2 },
            { radius: 25, color: '#f80', score: 4 },
            { radius: 35, color: '#ff0', score: 8 },
            { radius: 45, color: '#0f0', score: 16 },
            { radius: 60, color: '#00f', score: 32 },
            { radius: 80, color: '#4b0082', score: 64 },
            { radius: 100, color: '#f0f', score: 128 },
        ];
    }

    resize() {
         if (!this.canvas) return;
         this.canvas.width = this.container.clientWidth;
         this.canvas.height = this.container.clientHeight;
         // Physics world resize logic would go here (move walls)
         Matter.Body.setPosition(this.ground, { x: this.canvas.width/2, y: this.canvas.height + 50 });
         Matter.Body.setPosition(this.leftWall, { x: -50, y: this.canvas.height/2 });
         Matter.Body.setPosition(this.rightWall, { x: this.canvas.width + 50, y: this.canvas.height/2 });
    }

    handleClick(e) {
        if (!this.canDrop || this.isGameOver) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = Math.max(20, Math.min(this.canvas.width - 20, e.clientX - rect.left));

        this.spawnShape(x, 50, this.nextShape);
        this.nextShape = Math.floor(Math.random() * 3); // 0-2 small shapes
        this.canDrop = false;
        setTimeout(() => this.canDrop = true, 500);
    }

    spawnShape(x, y, level) {
        const type = this.SHAPE_TYPES[level];
        const body = Matter.Bodies.circle(x, y, type.radius, {
            restitution: 0.3,
            label: `shape_${level}`
        });
        body.level = level; // Custom prop
        Matter.World.add(this.world, body);
        this.shapes.push(body);
    }

    handleCollisions(event) {
        const pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            const bodyA = pairs[i].bodyA;
            const bodyB = pairs[i].bodyB;

            if (bodyA.level !== undefined && bodyB.level !== undefined && bodyA.level === bodyB.level) {
                // Merge
                const level = bodyA.level;
                if (level < this.SHAPE_TYPES.length - 1) {
                    const midX = (bodyA.position.x + bodyB.position.x) / 2;
                    const midY = (bodyA.position.y + bodyB.position.y) / 2;

                    Matter.World.remove(this.world, [bodyA, bodyB]);
                    this.shapes = this.shapes.filter(s => s !== bodyA && s !== bodyB);

                    this.spawnShape(midX, midY, level + 1);
                    this.score += this.SHAPE_TYPES[level].score;
                    this.soundManager.playSound('powerup');
                    this.particleSystem.emit(midX, midY, this.SHAPE_TYPES[level].color, 10);
                }
            }
        }
    }

    update(dt) {
        if (this.isGameOver) return;
        Matter.Engine.update(this.engine, dt * 1000);

        // Check overflow
        for (const shape of this.shapes) {
            if (shape.position.y < 0) {
                // Game Over logic
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw preview line
        if (this.canDrop && !this.isGameOver) {
            // We need mouse x from somewhere. Stored in this.mouseX?
            // Assuming mouseX is tracked globally or locally.
            // Since InputManager tracks global mouse:
            const mouse = this.inputManager.getMouse();
            const rect = this.canvas.getBoundingClientRect();
            let x = mouse.x - rect.left;
            x = Math.max(20, Math.min(this.canvas.width - 20, x));

            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();

            // Preview shape
            const type = this.SHAPE_TYPES[this.nextShape];
            this.ctx.beginPath();
            this.ctx.fillStyle = type.color;
            this.ctx.arc(x, 50, type.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.shadowBlur = 10;
        for (const body of this.shapes) {
            const type = this.SHAPE_TYPES[body.level];
            this.ctx.beginPath();
            this.ctx.fillStyle = type.color;
            this.ctx.shadowColor = type.color;
            this.ctx.arc(body.position.x, body.position.y, type.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw Face?
             this.ctx.fillStyle = '#fff';
             this.ctx.font = '12px Arial';
             // this.ctx.fillText(body.level, body.position.x, body.position.y);
        }

        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 20, 40);
    }

    async shutdown() {
        Matter.World.clear(this.world);
        Matter.Engine.clear(this.engine);
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.canvas) this.canvas.remove();
        this.canvas.removeEventListener('click', this.boundHandleClick);
    }
}
