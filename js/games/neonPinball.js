import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonPinball {
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
        // Left/Right arrows or A/D for paddles
        // Down/Space for plunger
    }

    initPhysics() {
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Walls
        const wallOpts = { isStatic: true, render: { fillStyle: '#333' }, friction: 0, restitution: 0.5 };

        // Outline of table
        this.walls = [
            Matter.Bodies.rectangle(w/2, -50, w, 100, wallOpts), // Top
            Matter.Bodies.rectangle(-50, h/2, 100, h*2, wallOpts), // Left
            Matter.Bodies.rectangle(w+50, h/2, 100, h*2, wallOpts), // Right
            // Angled corners
            Matter.Bodies.rectangle(0, 0, 200, 20, { ...wallOpts, angle: Math.PI/4 }),
            Matter.Bodies.rectangle(w, 0, 200, 20, { ...wallOpts, angle: -Math.PI/4 })
        ];

        // Paddles
        const paddleGroup = Matter.Body.nextGroup(true);
        const paddleW = 100;
        const paddleH = 20;

        // Left Paddle
        this.leftPaddle = Matter.Bodies.rectangle(w/2 - 80, h - 80, paddleW, paddleH, {
            collisionFilter: { group: paddleGroup },
            render: { fillStyle: '#0ff' }
        });
        this.leftPaddleConstraint = Matter.Constraint.create({
            bodyA: this.leftPaddle,
            pointA: { x: -40, y: 0 },
            pointB: { x: w/2 - 120, y: h - 80 },
            stiffness: 1,
            length: 0
        });

        // Right Paddle
        this.rightPaddle = Matter.Bodies.rectangle(w/2 + 80, h - 80, paddleW, paddleH, {
            collisionFilter: { group: paddleGroup },
            render: { fillStyle: '#0ff' }
        });
        this.rightPaddleConstraint = Matter.Constraint.create({
            bodyA: this.rightPaddle,
            pointA: { x: 40, y: 0 },
            pointB: { x: w/2 + 120, y: h - 80 },
            stiffness: 1,
            length: 0
        });

        // Bumpers
        this.bumpers = [
            Matter.Bodies.circle(w/2, h/2 - 100, 30, { isStatic: true, render: { fillStyle: '#f0f' }, restitution: 1.5, label: 'bumper' }),
            Matter.Bodies.circle(w/3, h/3, 25, { isStatic: true, render: { fillStyle: '#f0f' }, restitution: 1.5, label: 'bumper' }),
            Matter.Bodies.circle(2*w/3, h/3, 25, { isStatic: true, render: { fillStyle: '#f0f' }, restitution: 1.5, label: 'bumper' })
        ];

        Matter.World.add(this.world, [
            ...this.walls,
            this.leftPaddle, this.leftPaddleConstraint,
            this.rightPaddle, this.rightPaddleConstraint,
            ...this.bumpers
        ]);

        Matter.Events.on(this.engine, 'collisionStart', (e) => this.handleCollisions(e));
    }

    resetGame() {
        // Clear ball
        if(this.ball) Matter.World.remove(this.world, this.ball);

        this.score = 0;
        this.lives = 3;
        this.spawnBall();
    }

    spawnBall() {
        this.ball = Matter.Bodies.circle(this.canvas.width - 40, this.canvas.height - 100, 10, {
            restitution: 0.8,
            render: { fillStyle: '#fff' },
            density: 0.001
        });
        Matter.World.add(this.world, this.ball);
        // Launch
        Matter.Body.setVelocity(this.ball, { x: -5, y: -25 });
    }

    resize() {
         if (!this.canvas) return;
         this.canvas.width = this.container.clientWidth;
         this.canvas.height = this.container.clientHeight;
         // Physics resize is complex, skip for prototype
    }

    handleCollisions(event) {
        event.pairs.forEach(pair => {
            const bodies = [pair.bodyA, pair.bodyB];
            const bumper = bodies.find(b => b.label === 'bumper');
            if(bumper) {
                this.score += 100;
                this.soundManager.playSound('score');
                this.particleSystem.emit(bumper.position.x, bumper.position.y, '#f0f', 10);

                // Add boost to ball
                const ball = bodies.find(b => b !== bumper);
                // Vector from bumper to ball
                /*
                const dx = ball.position.x - bumper.position.x;
                const dy = ball.position.y - bumper.position.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                Matter.Body.applyForce(ball, ball.position, { x: (dx/dist)*0.05, y: (dy/dist)*0.05 });
                */
            }
        });
    }

    update(dt) {
        // Paddle Control
        // Matter.js constraints don't work like motors easily for flippers without configuration
        // We can manually set angular velocity/position limits

        const leftPressed = this.inputManager.isKeyDown('ArrowLeft') || this.inputManager.isKeyDown('KeyA');
        const rightPressed = this.inputManager.isKeyDown('ArrowRight') || this.inputManager.isKeyDown('KeyD');

        // Simple kinematic-like control by applying torque/angVel
        // Or setting rotation target? Setting position is jerky.
        // Let's use Body.setAngularVelocity

        // Left
        if (leftPressed) {
            if (this.leftPaddle.angle > -Math.PI/4) {
                Matter.Body.setAngularVelocity(this.leftPaddle, -0.2);
            } else {
                Matter.Body.setAngularVelocity(this.leftPaddle, 0);
                Matter.Body.setAngle(this.leftPaddle, -Math.PI/4);
            }
        } else {
             if (this.leftPaddle.angle < 0.2) { // Rest pos
                Matter.Body.setAngularVelocity(this.leftPaddle, 0.1);
            } else {
                Matter.Body.setAngularVelocity(this.leftPaddle, 0);
                Matter.Body.setAngle(this.leftPaddle, 0.2);
            }
        }

        // Right
        if (rightPressed) {
            if (this.rightPaddle.angle < Math.PI/4) {
                Matter.Body.setAngularVelocity(this.rightPaddle, 0.2);
            } else {
                Matter.Body.setAngularVelocity(this.rightPaddle, 0);
                Matter.Body.setAngle(this.rightPaddle, Math.PI/4);
            }
        } else {
             if (this.rightPaddle.angle > -0.2) { // Rest pos
                Matter.Body.setAngularVelocity(this.rightPaddle, -0.1);
            } else {
                Matter.Body.setAngularVelocity(this.rightPaddle, 0);
                Matter.Body.setAngle(this.rightPaddle, -0.2);
            }
        }

        Matter.Engine.update(this.engine, 1000/60); // Fixed step for physics stability

        // Ball check
        if (this.ball && this.ball.position.y > this.canvas.height + 50) {
            this.lives--;
            Matter.World.remove(this.world, this.ball);
            if (this.lives > 0) {
                setTimeout(() => this.spawnBall(), 1000);
            } else {
                window.miniGameHub.showGameOver(this.score, () => this.resetGame());
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Render bodies
        const bodies = Matter.Composite.allBodies(this.world);
        this.ctx.shadowBlur = 10;

        bodies.forEach(b => {
            if (b.render.visible === false) return;

            this.ctx.fillStyle = b.render.fillStyle;
            this.ctx.shadowColor = b.render.fillStyle;
            this.ctx.beginPath();

            const vertices = b.vertices;
            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let j = 1; j < vertices.length; j += 1) {
                this.ctx.lineTo(vertices[j].x, vertices[j].y);
            }
            this.ctx.lineTo(vertices[0].x, vertices[0].y);
            this.ctx.fill();
        });

        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 20, 40);
        this.ctx.fillText(`Lives: ${this.lives}`, 20, 70);
    }

    async shutdown() {
        Matter.World.clear(this.world);
        Matter.Engine.clear(this.engine);
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.canvas) this.canvas.remove();
    }
}
