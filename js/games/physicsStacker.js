import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';

export default class PhysicsStackerGame {
    constructor() {
        this.engine = null;
        this.render = null;
        this.runner = null;
        this.score = 0;
        this.crane = { x: 300, y: 50, angle: 0 };
        this.currentBody = null;
        this.inputDebounce = false;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
    }

    init(container) {
        // Ensure Matter.js is loaded
        if (typeof Matter === 'undefined') {
            console.error("Matter.js is not loaded.");
            return;
        }

        container.innerHTML = `
            <h2>🏗️ Physics Stacker</h2>
            <div id="stacker-container" class="relative bg-slate-800 rounded-lg overflow-hidden border border-slate-600" style="width: 600px; height: 600px;"></div>
            <div class="mt-4 flex justify-between items-center w-[600px]">
                 <div class="text-xl font-bold text-white">Height: <span id="stacker-score" class="text-cyan-400">0</span></div>
                 <p class="text-sm text-slate-400">SPACE or CLICK to drop.</p>
            </div>
            <button class="back-btn mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Back</button>
        `;

        container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        const element = container.querySelector('#stacker-container');
        this.scoreEl = container.querySelector('#stacker-score');

        // Setup Matter.js
        const Engine = Matter.Engine,
              Render = Matter.Render,
              Runner = Matter.Runner,
              Bodies = Matter.Bodies,
              Composite = Matter.Composite,
              Events = Matter.Events;

        this.engine = Engine.create();
        this.world = this.engine.world;

        this.render = Render.create({
            element: element,
            engine: this.engine,
            options: {
                width: 600,
                height: 600,
                wireframes: false,
                background: 'transparent'
            }
        });

        // Ground
        const ground = Bodies.rectangle(300, 610, 610, 60, { isStatic: true, render: { fillStyle: '#475569' } });
        Composite.add(this.world, ground);

        Render.run(this.render);
        this.runner = Runner.create();
        Runner.run(this.runner, this.engine);

        this.spawnBlock();

        // Mouse click
        element.addEventListener('mousedown', () => this.dropBlock());

        this.engine.world.gravity.y = 1;

        // Listen for collisions for sound
        Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                // Simple check: if velocity is significant
                // Matter.js doesn't give impact velocity easily in collisionStart without calculation,
                // but we can check speeds of bodies.
                const speedA = pair.bodyA.speed;
                const speedB = pair.bodyB.speed;
                if (speedA > 1 || speedB > 1) {
                    this.soundManager.playTone(100, 'square', 0.05);
                }
            }
        });
    }

    spawnBlock() {
        if (!this.world) return;
        const Bodies = Matter.Bodies;
        const width = 50;
        const height = 50;

        // Block is static initially or kinematic until dropped?
        // We manage its position manually in update loop until dropped.
        // Actually, easiest is just a JS object for the 'crane holding' state.

        this.currentHolding = {
            width: 50,
            height: 50,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        };
    }

    dropBlock() {
        if (this.currentHolding) {
            const Bodies = Matter.Bodies;
            const Composite = Matter.Composite;

            const body = Bodies.rectangle(this.crane.x, this.crane.y + 50, this.currentHolding.width, this.currentHolding.height, {
                restitution: 0.1,
                friction: 0.5,
                render: { fillStyle: this.currentHolding.color }
            });

            Composite.add(this.world, body);
            this.currentHolding = null;
            this.soundManager.playSound('jump'); // drop sound

            setTimeout(() => this.spawnBlock(), 1000);
        }
    }

    shutdown() {
        if (this.render) {
            Matter.Render.stop(this.render);
            this.render.canvas.remove();
            this.render.canvas = null;
            this.render.context = null;
            this.render.textures = {};
        }
        if (this.runner) {
            Matter.Runner.stop(this.runner);
        }
        if (this.engine) {
            Matter.World.clear(this.engine.world);
            Matter.Engine.clear(this.engine);
        }
        this.engine = null;
        this.render = null;
        this.runner = null;
    }

    update(dt) {
        // Crane Movement
        this.crane.angle += dt * 1;
        this.crane.x = 300 + Math.sin(this.crane.angle) * 200;

        // Input Key
        if (this.inputManager.isKeyDown("Space")) {
            if (!this.inputDebounce) {
                this.dropBlock();
                this.inputDebounce = true;
            }
        } else {
            this.inputDebounce = false;
        }

        // Draw Crane Overlay (Manual Canvas Draw on top of Matter.js canvas?)
        // Matter.Render is clearing canvas. We can hook into afterRender event of Matter.js render
        // But for simplicity, we can manipulate the holding block via Matter.js if we wanted,
        // but since we want it 'attached', external drawing is easier.
        // Actually, we can just use the Render's context.

        if (this.render && this.render.context) {
             const ctx = this.render.context;

             // Crane Line
             ctx.beginPath();
             ctx.moveTo(300, 0);
             ctx.lineTo(this.crane.x, this.crane.y);
             ctx.strokeStyle = '#aaa';
             ctx.lineWidth = 4;
             ctx.stroke();

             // Holding Block
             if (this.currentHolding) {
                 ctx.fillStyle = this.currentHolding.color;
                 const w = this.currentHolding.width;
                 const h = this.currentHolding.height;
                 ctx.fillRect(this.crane.x - w/2, this.crane.y, w, h);
             }

             // Calculate Height
             let minHeight = 600;
             const bodies = Matter.Composite.allBodies(this.world);
             bodies.forEach(b => {
                 if (!b.isStatic && b.position.y < minHeight) minHeight = b.position.y;
             });
             this.score = Math.floor(600 - minHeight);
             if (this.score < 0) this.score = 0;
             if (this.scoreEl) this.scoreEl.textContent = this.score;
        }
    }

    draw() {
        // No-op, Matter.js Render handles it
    }
}
