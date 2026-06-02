import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class JellyRacer {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.boundResize = this.resize.bind(this);
        this.boundLoop = this.loop.bind(this);
        this.lastTime = 0;

        // Matter.js references
        this.engine = null;
        this.render = null;
        this.runner = null;

        // Game State
        this.car = null;
        this.cameraX = 0;
        this.score = 0;
        this.bestScore = this.saveSystem.getGameConfig('jellyRacer_best') || 0;
        this.isGameOver = false;

        // Inputs
        this.keys = { ArrowRight: false, ArrowLeft: false };
        this.boundKeyDown = (e) => { if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = true; };
        this.boundKeyUp = (e) => { if (this.keys.hasOwnProperty(e.code)) this.keys[e.code] = false; };
    }

    async init(container) {
        this.container = container;

        this.container.innerHTML = `
            <div class="relative w-full h-full bg-sky-200 overflow-hidden font-mono select-none" id="jellyRacer-ui">
                <canvas id="jellyRacer-canvas" class="absolute inset-0 block"></canvas>

                <div class="absolute top-4 left-4 z-10 text-slate-800 font-bold text-2xl drop-shadow-md">
                    Distance: <span id="jr-score">0</span>m <br>
                    <span class="text-lg text-slate-600">Best: ${this.bestScore}m</span>
                </div>

                <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-slate-600 text-lg font-bold">
                    [LEFT / RIGHT ARROWS] to drive and flip
                </div>

                <div id="jr-overlay" class="absolute inset-0 bg-black/60 z-20 flex items-center justify-center hidden">
                    <div class="bg-white p-8 rounded-xl text-center shadow-2xl border-4 border-sky-400">
                        <h2 class="text-4xl font-black text-rose-500 mb-2">CRASHED!</h2>
                        <p class="text-xl text-slate-600 mb-6">Distance: <span id="jr-final-score">0</span>m</p>
                        <button id="jr-restart" class="px-8 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-full font-bold text-xl transition-transform hover:scale-105 active:scale-95 shadow-lg">Try Again</button>
                    </div>
                </div>

                <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-full font-bold z-30 transition-colors pointer-events-auto shadow-md border-2 border-white">EXIT</button>
            </div>
        `;

        this.canvas = this.container.querySelector('#jellyRacer-canvas');
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);

        document.getElementById('jr-restart').addEventListener('click', () => {
             document.getElementById('jr-overlay').classList.add('hidden');
             this.resetGame();
        });

        // Ensure Matter.js is loaded
        if (typeof Matter === 'undefined') {
            console.error('Matter.js is required for JellyRacer');
            this.container.innerHTML += '<div class="absolute inset-0 bg-red-900 text-white p-4">Error: Matter.js not found.</div>';
            return;
        }

        this.resize();
        this.initPhysics();

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    initPhysics() {
        // Module aliases
        const Engine = Matter.Engine,
              Runner = Matter.Runner,
              Bodies = Matter.Bodies,
              Composite = Matter.Composite,
              Composites = Matter.Composites,
              Constraint = Matter.Constraint;

        // create engine
        this.engine = Engine.create();

        this.buildTerrain();
        this.buildCar();

        // Detect collisions for game over
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            for (let i = 0; i < pairs.length; i++) {
                const bodyA = pairs[i].bodyA;
                const bodyB = pairs[i].bodyB;

                // If the car body (not wheels) hits the ground hard, game over
                if ((bodyA.label === 'carBody' && bodyB.label === 'ground') ||
                    (bodyB.label === 'carBody' && bodyA.label === 'ground')) {

                    // Allow slight scraping, check velocity
                    const carBody = bodyA.label === 'carBody' ? bodyA : bodyB;
                    if (Math.abs(carBody.velocity.y) > 2 || Math.abs(carBody.angularVelocity) > 0.1) {
                         this.gameOver();
                    }
                }
            }
        });
    }

    buildTerrain() {
        const Bodies = Matter.Bodies;
        const Composite = Matter.Composite;

        this.terrainParts = [];

        // Procedural terrain generation using simple sine waves
        let prevX = 0;
        let prevY = 400;

        for (let i = 0; i < 100; i++) {
             const width = 200 + Math.random() * 200;
             const x = prevX + width / 2;

             // Complexity increases over distance
             const amplitude = 50 + (i * 2);
             let y = 400 + Math.sin(i * 0.5) * amplitude;

             // Base flat area
             if (i < 3) y = 400;

             // Calculate angle for the rectangle to form a continuous slope
             const angle = Math.atan2(y - prevY, x - (prevX - width/2));

             const ground = Bodies.rectangle(x, y, width + 10, 50, {
                 isStatic: true,
                 friction: 1.0,
                 label: 'ground',
                 angle: angle,
                 render: { fillStyle: '#84cc16' } // Lime green
             });

             this.terrainParts.push(ground);
             prevX += width;
             prevY = y;
        }

        Composite.add(this.engine.world, this.terrainParts);
    }

    buildCar() {
        const Bodies = Matter.Bodies;
        const Composite = Matter.Composite;
        const Constraint = Matter.Constraint;
        const Composites = Matter.Composites;

        const startX = 200;
        const startY = 200;

        // Group for collision filtering
        const group = Matter.Body.nextGroup(true);

        // Soft body for the car chassis (jelly)
        // Creating a stack of circles connected by springs
        this.carChassis = Composites.softBody(startX, startY, 4, 2, 0, 0, true, 10, {
            collisionFilter: { group: group },
            friction: 0.8,
            restitution: 0.5, // Bouncy
            render: { fillStyle: '#0ea5e9' },
            label: 'carBody'
        }, {
            stiffness: 0.9,
            render: { visible: false }
        });

        // Wheels
        this.wheelA = Bodies.circle(startX - 20, startY + 30, 20, {
            collisionFilter: { group: group },
            friction: 0.9,
            density: 0.05,
            label: 'wheel',
            render: { fillStyle: '#1e293b' }
        });

        this.wheelB = Bodies.circle(startX + 60, startY + 30, 20, {
            collisionFilter: { group: group },
            friction: 0.9,
            density: 0.05,
            label: 'wheel',
            render: { fillStyle: '#1e293b' }
        });

        // Attach wheels to chassis using constraints (suspension)
        // Find bottom corner bodies in the soft body composite
        const bodies = this.carChassis.bodies;
        const bl = bodies[bodies.length - 4]; // Bottom left roughly
        const br = bodies[bodies.length - 1]; // Bottom right roughly

        const axelA = Constraint.create({
            bodyA: bl, bodyB: this.wheelA,
            stiffness: 0.2, length: 30,
            render: { strokeStyle: '#94a3b8' }
        });

        const axelB = Constraint.create({
            bodyA: br, bodyB: this.wheelB,
            stiffness: 0.2, length: 30,
            render: { strokeStyle: '#94a3b8' }
        });

        this.car = Composite.create({
             bodies: [this.wheelA, this.wheelB],
             constraints: [axelA, axelB],
             composites: [this.carChassis]
        });

        Composite.add(this.engine.world, this.car);
    }

    resetGame() {
        Matter.Composite.clear(this.engine.world);
        Matter.Engine.clear(this.engine);

        this.score = 0;
        this.cameraX = 0;
        this.isGameOver = false;

        this.initPhysics();
        document.getElementById('jr-score').innerText = '0';
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.soundManager.playSound('explosion');

        if (this.score > this.bestScore) {
             this.bestScore = this.score;
             this.saveSystem.setGameConfig('jellyRacer_best', this.bestScore);
        }

        document.getElementById('jr-final-score').innerText = this.score;
        document.getElementById('jr-overlay').classList.remove('hidden');
    }

    loop(timestamp) {
        if (!this.canvas) return;

        const dt = (timestamp - this.lastTime); // ms
        this.lastTime = timestamp;

        if (!this.isGameOver) {
             this.update(dt);
        }

        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
        // Cap dt to prevent physics explosion on lag spikes
        const safeDt = Math.min(dt, 30);

        // Step Matter.js engine
        Matter.Engine.update(this.engine, safeDt);

        // Input handling
        const maxSpeed = 0.5;
        if (this.keys.ArrowRight) {
             // Apply torque to wheels
             Matter.Body.setAngularVelocity(this.wheelA, Math.min(this.wheelA.angularVelocity + 0.05, maxSpeed));
             Matter.Body.setAngularVelocity(this.wheelB, Math.min(this.wheelB.angularVelocity + 0.05, maxSpeed));

             // Apply slight rotational force to chassis for flips
             Matter.Composite.allBodies(this.carChassis).forEach(b => {
                 Matter.Body.applyForce(b, b.position, {x: 0, y: -0.0005});
             });
        }
        if (this.keys.ArrowLeft) {
             Matter.Body.setAngularVelocity(this.wheelA, Math.max(this.wheelA.angularVelocity - 0.05, -maxSpeed));
             Matter.Body.setAngularVelocity(this.wheelB, Math.max(this.wheelB.angularVelocity - 0.05, -maxSpeed));
        }

        // Camera follow
        const centerBody = this.carChassis.bodies[0];
        const targetX = centerBody.position.x - this.canvas.width * 0.3;
        this.cameraX += (targetX - this.cameraX) * 0.1;

        // Update Score (Distance)
        const currentDistance = Math.floor(centerBody.position.x / 100) - 2; // Offset start
        if (currentDistance > this.score) {
             this.score = currentDistance;
             document.getElementById('jr-score').innerText = this.score;
        }
    }

    draw() {
        if (!this.ctx) return;

        // Background
        this.ctx.fillStyle = '#bae6fd'; // sky blue
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0); // Only pan X, keep Y steady for now or clamp it

        // Get all bodies
        const bodies = Matter.Composite.allBodies(this.engine.world);

        this.ctx.beginPath();
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];

            // Culling - don't draw offscreen bodies
            if (body.position.x < this.cameraX - 200 || body.position.x > this.cameraX + this.canvas.width + 200) continue;

            const vertices = body.vertices;

            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let j = 1; j < vertices.length; j++) {
                this.ctx.lineTo(vertices[j].x, vertices[j].y);
            }
            this.ctx.lineTo(vertices[0].x, vertices[0].y);
        }

        // Fill ground and wheels with a simple pass
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#000';
        this.ctx.stroke();

        // Custom rendering for specific parts
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (body.position.x < this.cameraX - 200 || body.position.x > this.cameraX + this.canvas.width + 200) continue;

            this.ctx.beginPath();
            const vertices = body.vertices;
            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let j = 1; j < vertices.length; j++) {
                this.ctx.lineTo(vertices[j].x, vertices[j].y);
            }
            this.ctx.closePath();

            if (body.label === 'ground') {
                 this.ctx.fillStyle = '#84cc16';
                 this.ctx.fill();
            } else if (body.label === 'carBody') {
                 this.ctx.fillStyle = '#0ea5e9'; // Blue jelly
                 this.ctx.fill();
            } else if (body.label === 'wheel') {
                 this.ctx.fillStyle = '#334155';
                 this.ctx.fill();

                 // Draw wheel rim/spoke to see rotation
                 this.ctx.beginPath();
                 this.ctx.moveTo(body.position.x, body.position.y);
                 this.ctx.lineTo(vertices[0].x, vertices[0].y);
                 this.ctx.strokeStyle = '#cbd5e1';
                 this.ctx.stroke();
            }
        }

        // Draw Constraints (Springs/Suspension)
        const constraints = Matter.Composite.allConstraints(this.engine.world);
        this.ctx.beginPath();
        for (let i = 0; i < constraints.length; i++) {
            const c = constraints[i];
            if (!c.render.visible) continue;

            const posA = c.bodyA ? Matter.Vector.add(c.bodyA.position, c.pointA) : c.pointA;
            const posB = c.bodyB ? Matter.Vector.add(c.bodyB.position, c.pointB) : c.pointB;

            this.ctx.moveTo(posA.x, posA.y);
            this.ctx.lineTo(posB.x, posB.y);
        }
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#94a3b8';
        this.ctx.stroke();

        this.ctx.restore();
    }

    resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);

        if (this.engine) {
             Matter.Engine.clear(this.engine);
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
