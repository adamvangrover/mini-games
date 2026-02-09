import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonPlinko {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.balls = [];
        this.pegs = [];
        this.buckets = [];
        this.score = 0;
        this.totalBalls = 0;
        this.canDrop = true;
        this.isGameOver = false;
        this.engine = null;
        this.world = null;
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.className = "game-canvas w-full h-full";
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // Ensure Matter.js is loaded
        if (typeof Matter === 'undefined') {
            console.log("Loading Matter.js...");
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js";
            document.head.appendChild(script);
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => {
                    console.error("Failed to load Matter.js");
                    reject(new Error("Failed to load Matter.js"));
                };
            });
        }

        this.initPhysics();
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);

        // Bind input
        this.boundHandleClick = this.handleClick.bind(this);
        this.canvas.addEventListener('click', this.boundHandleClick);
        // Also listen for touch for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // prevent mouse emulation
            const touch = e.changedTouches[0];
            this.handleClick({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });
    }

    initPhysics() {
        // Create engine
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        // Adjust gravity if needed
        this.engine.world.gravity.y = 1.0;

        this.createLevel();

        // Collision Handling
        Matter.Events.on(this.engine, 'collisionStart', (event) => this.handleCollisions(event));
    }

    createLevel() {
        // Clear existing
        Matter.World.clear(this.world);
        this.pegs = [];
        this.buckets = [];
        this.balls = [];

        const width = this.canvas.width;
        const height = this.canvas.height;
        const rows = 12; // Number of peg rows
        const cols = 13; // Max pegs in a row
        const pegRadius = 4;
        const gapX = width / (cols + 1);
        const gapY = (height * 0.7) / rows;
        const startY = 80;

        // Pegs
        for (let row = 0; row < rows; row++) {
            const pegsInRow = row + 3; // Triangle shape: 3, 4, 5...
            // Or simple staggered grid
            // Let's do a staggered grid for classic Plinko feel
            const y = startY + row * gapY;
            const isOdd = row % 2 !== 0;
            const rowCols = isOdd ? cols - 1 : cols;
            const xOffset = isOdd ? gapX : gapX / 2;

            for (let col = 0; col < rowCols; col++) {
                const x = xOffset + col * gapX + gapX/2;
                // Center roughly
                const centeredX = x + (width - (rowCols * gapX))/2 - gapX/2; // rough centering logic

                // Let's use a simpler logic:
                // Just fill the width with some padding
                const padding = 40;
                const usableWidth = width - padding * 2;
                const spacing = usableWidth / cols;

                const pegX = padding + col * spacing + (isOdd ? spacing/2 : 0);

                if (pegX > width - padding) continue;

                const peg = Matter.Bodies.circle(pegX, y, pegRadius, {
                    isStatic: true,
                    restitution: 0.5,
                    friction: 0,
                    render: { fillStyle: '#fff' },
                    label: 'peg'
                });
                this.pegs.push(peg);
                Matter.World.add(this.world, peg);
            }
        }

        // Walls
        const wallThickness = 50;
        const leftWall = Matter.Bodies.rectangle(0 - wallThickness/2, height/2, wallThickness, height * 2, { isStatic: true, label: 'wall' });
        const rightWall = Matter.Bodies.rectangle(width + wallThickness/2, height/2, wallThickness, height * 2, { isStatic: true, label: 'wall' });
        Matter.World.add(this.world, [leftWall, rightWall]);

        // Buckets at the bottom
        const bucketCount = 7; // Odd number for center
        const bucketWidth = width / bucketCount;
        const bucketHeight = 60;
        const bucketY = height - bucketHeight / 2;

        const multipliers = [10, 5, 2, 0.5, 2, 5, 10]; // Center is low risk low reward? Or high risk high reward?
        // Usually center is high reward in Plinko because balls tend to go to edges?
        // Actually balls tend to gaussian distribute to center. So center should be lower multiplier usually.
        // Let's go with: Edges are high (rare), Center is low (common).
        // 10x | 5x | 2x | 0.5x | 2x | 5x | 10x

        for (let i = 0; i < bucketCount; i++) {
            const x = i * bucketWidth + bucketWidth / 2;

            // Bucket Sensor (Trigger)
            const bucket = Matter.Bodies.rectangle(x, bucketY, bucketWidth - 4, bucketHeight, {
                isStatic: true,
                isSensor: true, // Don't collide physically, just detect
                label: `bucket_${multipliers[i]}`
            });
            bucket.multiplier = multipliers[i];
            bucket.color = this.getBucketColor(multipliers[i]);
            this.buckets.push(bucket);
            Matter.World.add(this.world, bucket);

            // Bucket Dividers (Physical)
            if (i > 0) {
                const divX = i * bucketWidth;
                const divider = Matter.Bodies.rectangle(divX, height - 30, 4, 60, {
                    isStatic: true,
                    render: { fillStyle: '#555' },
                    label: 'divider'
                });
                Matter.World.add(this.world, divider);
            }
        }
    }

    getBucketColor(multiplier) {
        if (multiplier >= 10) return '#f00'; // Red
        if (multiplier >= 5) return '#f80'; // Orange
        if (multiplier >= 2) return '#ff0'; // Yellow
        return '#0f0'; // Green
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        // Recreate level on resize to fit new dimensions
        this.createLevel();
    }

    handleClick(e) {
        if (!this.canDrop || this.isGameOver) return;
        if (this.balls.length >= 50) return; // Limit balls

        const rect = this.canvas.getBoundingClientRect();
        // drop from top, x based on click
        let x = e.clientX - rect.left;

        // Clamp x to avoid dropping outside or into walls immediately
        const padding = 30;
        x = Math.max(padding, Math.min(this.canvas.width - padding, x));

        this.spawnBall(x, 20);

        // Cooldown
        this.canDrop = false;
        setTimeout(() => this.canDrop = true, 200); // Fast drop rate
    }

    spawnBall(x, y) {
        const ballRadius = 8;
        const ball = Matter.Bodies.circle(x, y, ballRadius, {
            restitution: 0.7, // Bouncy
            friction: 0.01,
            frictionAir: 0.02,
            density: 0.04,
            label: 'ball'
        });

        // Random neon color
        const colors = ['#f0f', '#0ff', '#ff0', '#0f0'];
        ball.color = colors[Math.floor(Math.random() * colors.length)];

        this.balls.push(ball);
        Matter.World.add(this.world, ball);
        this.totalBalls++;
        this.soundManager.playSound('click'); // Or a 'drop' sound
    }

    handleCollisions(event) {
        const pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            const bodyA = pairs[i].bodyA;
            const bodyB = pairs[i].bodyB;

            // Check Ball vs Bucket
            let ball = null;
            let bucket = null;

            if (bodyA.label === 'ball' && bodyB.label.startsWith('bucket_')) {
                ball = bodyA;
                bucket = bodyB;
            } else if (bodyB.label === 'ball' && bodyA.label.startsWith('bucket_')) {
                ball = bodyB;
                bucket = bodyA;
            } else if (bodyA.label === 'ball' && bodyB.label === 'peg') {
                 // Hit peg sound
                 if (Math.random() > 0.5) this.soundManager.playSound('blip');
            } else if (bodyB.label === 'ball' && bodyA.label === 'peg') {
                 if (Math.random() > 0.5) this.soundManager.playSound('blip');
            }

            if (ball && bucket) {
                // Ball entered bucket
                this.handleScore(ball, bucket);
            }
        }
    }

    handleScore(ball, bucket) {
        // Remove ball
        Matter.World.remove(this.world, ball);
        const index = this.balls.indexOf(ball);
        if (index > -1) this.balls.splice(index, 1);

        // Score
        const points = Math.floor(10 * bucket.multiplier);
        this.score += points;

        // Effects
        this.soundManager.playSound(bucket.multiplier > 2 ? 'powerup' : 'score');
        this.particleSystem.emit(ball.position.x, ball.position.y, bucket.color, 20);

        // Show floating text
        // (Simplified, just log or rely on particles/score update)
    }

    update(dt) {
        if (this.engine) {
            Matter.Engine.update(this.engine, dt * 1000); // Matter uses ms
        }

        // Cleanup balls that fell out (glitch prevention)
        for (let i = this.balls.length - 1; i >= 0; i--) {
            if (this.balls[i].position.y > this.canvas.height + 100) {
                 Matter.World.remove(this.world, this.balls[i]);
                 this.balls.splice(i, 1);
            }
        }
    }

    draw() {
        if (!this.ctx) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, w, h);

        // Draw Buckets
        for (const bucket of this.buckets) {
            this.ctx.fillStyle = bucket.color + '44'; // Transparent
            this.ctx.fillRect(bucket.bounds.min.x, bucket.bounds.min.y, bucket.bounds.max.x - bucket.bounds.min.x, bucket.bounds.max.y - bucket.bounds.min.y);

            // Text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            const centerX = (bucket.bounds.min.x + bucket.bounds.max.x) / 2;
            const centerY = (bucket.bounds.min.y + bucket.bounds.max.y) / 2;
            this.ctx.fillText(`x${bucket.multiplier}`, centerX, centerY + 5);
        }

        // Draw Pegs
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#fff';
        for (const peg of this.pegs) {
            this.ctx.beginPath();
            this.ctx.arc(peg.position.x, peg.position.y, peg.circleRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw Balls
        for (const ball of this.balls) {
            this.ctx.fillStyle = ball.color;
            this.ctx.shadowColor = ball.color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(ball.position.x, ball.position.y, ball.circleRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;

        // UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px "Courier New", monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Score: ${this.score}`, w - 30, 40);

        this.ctx.textAlign = 'center';
        if (this.canDrop) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.font = '16px Arial';
            this.ctx.fillText("Click to Drop", w/2, 30);
        }
    }

    async shutdown() {
        if (this.engine) {
            Matter.World.clear(this.world);
            Matter.Engine.clear(this.engine);
        }
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.canvas) {
            this.canvas.removeEventListener('click', this.boundHandleClick);
            this.canvas.remove();
        }
    }
}
