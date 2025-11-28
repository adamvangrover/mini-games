// Physics Stacker
// Using Matter.js

let Engine, Render, Runner, World, Bodies, Composite, Events;
let engine, render, runner;
let canvas;
let boxSize = 50;
let isGameOver = false;
let score = 0;
let lastBoxY = 0;

export default {
    init: function() {
        // Safe check for Matter.js
        if (!window.Matter) {
            console.error("Matter.js not loaded");
            return;
        }

        canvas = document.getElementById('stackerCanvas');
        if (!canvas) return;

        // Modules
        Engine = Matter.Engine;
        Render = Matter.Render;
        Runner = Matter.Runner;
        Bodies = Matter.Bodies;
        Composite = Matter.Composite;
        Events = Matter.Events;

        // Create engine
        engine = Engine.create();

        // Create renderer
        render = Render.create({
            canvas: canvas,
            engine: engine,
            options: {
                width: 600,
                height: 600,
                wireframes: false,
                background: '#1a202c'
            }
        });

        this.resetGame();

        // Bind events
        canvas.addEventListener('mousedown', this.handleInput.bind(this));
        document.getElementById('stacker-restart-btn').addEventListener('click', this.resetGame.bind(this));

        // Start
        Render.run(render);
        runner = Runner.create();
        Runner.run(runner, engine);

        // Check for game over (objects falling off)
        Events.on(engine, 'afterUpdate', () => {
            if (isGameOver) return;

            const bodies = Composite.allBodies(engine.world);
            let highestY = 600;

            bodies.forEach(body => {
                if (body.label === 'Box') {
                    if (body.position.y > 650) {
                        this.gameOver();
                    }
                    if (body.speed < 0.1 && body.position.y < highestY) {
                         highestY = body.position.y;
                    }
                }
            });

            // Score based on height? Or count?
            // Let's do count of stable boxes
        });
    },

    shutdown: function() {
        if (render) {
            Render.stop(render);
            render.canvas.removeEventListener('mousedown', this.handleInput.bind(this));
        }
        if (runner) {
            Runner.stop(runner);
        }
        if (engine) {
            World.clear(engine.world);
            Engine.clear(engine);
        }
        // Cleanup UI
        document.getElementById('stacker-msg').classList.add('hidden');
        document.getElementById('stacker-restart-btn').classList.add('hidden');
    },

    resetGame: function() {
        Composite.clear(engine.world);
        Engine.clear(engine);

        isGameOver = false;
        score = 0;
        document.getElementById('stacker-score').innerText = score;
        document.getElementById('stacker-msg').classList.add('hidden');
        document.getElementById('stacker-restart-btn').classList.add('hidden');

        // Ground
        const ground = Bodies.rectangle(300, 590, 600, 20, { isStatic: true, render: { fillStyle: '#4a5568' } });
        Composite.add(engine.world, ground);

        // Spawn first box
        this.spawnBox(300, 100);
    },

    spawnBox: function(x, y) {
        // In this version, user clicks to drop a box at mouse X position
        // We actually want a hovering box that drops on click?
        // Or just spawn where clicked?
        // "Click to drop blocks" implies maybe a swinging crane or a moving cursor.
        // For simplicity: Spawn at mouse X at top.
    },

    handleInput: function(e) {
        if (isGameOver) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Limit x to bounds
        const clampX = Math.max(25, Math.min(575, x));

        const box = Bodies.rectangle(clampX, 50, 50, 50, {
            label: 'Box',
            restitution: 0.1,
            friction: 0.5,
            render: { fillStyle: this.getRandomColor() }
        });

        Composite.add(engine.world, box);
        score++;
        document.getElementById('stacker-score').innerText = score;

        if(window.soundManager) window.soundManager.playSound('jump'); // reuse jump sound
    },

    getRandomColor: function() {
        const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#c084fc'];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    gameOver: function() {
        isGameOver = true;
        document.getElementById('stacker-msg').classList.remove('hidden');
        document.getElementById('stacker-restart-btn').classList.remove('hidden');
        if(window.soundManager) window.soundManager.playTone(100, 'sawtooth', 0.5, false, true);
    }
};
export default class PhysicsStacker {
    constructor() {
        this.canvas = null;
        this.engine = null;
        this.render = null;
        this.runner = null;

        this.craneBody = null;
        this.craneConstraint = null;
        this.currentBlock = null;

        this.active = false;

        this.boundKeyDown = this.handleInput.bind(this);
        this.boundClick = this.spawnBlock.bind(this); // Using click to drop

        // Game State
        this.score = 0;
        this.maxHeight = 0;
        this.targetHeight = 1000;
        this.blockCount = 0;

        this.swingTime = 0;
    }

    init(container) {
        this.canvas = container.querySelector('#stackerCanvas');
        if (!this.canvas) return;

        // Initialize Matter.js
        const Engine = Matter.Engine,
              Render = Matter.Render,
              Runner = Matter.Runner,
              Bodies = Matter.Bodies,
              Composite = Matter.Composite,
              Constraint = Matter.Constraint,
              Mouse = Matter.Mouse,
              MouseConstraint = Matter.MouseConstraint;

        this.engine = Engine.create();

        // Renderer
        this.render = Render.create({
            canvas: this.canvas,
            engine: this.engine,
            options: {
                width: 600,
                height: 800,
                wireframes: false,
                background: '#0d1117'
            }
        });

        // Add walls and ground
        const ground = Bodies.rectangle(300, 790, 600, 60, { isStatic: true, render: { fillStyle: '#2c3e50' } });
        const leftWall = Bodies.rectangle(0, 400, 10, 800, { isStatic: true, render: { visible: false } });
        const rightWall = Bodies.rectangle(600, 400, 10, 800, { isStatic: true, render: { visible: false } });

        Composite.add(this.engine.world, [ground, leftWall, rightWall]);

        // Crane System
        // A static point at top center
        const pivot = { x: 300, y: 50 };

        // The block holder (visual representation of crane hook)
        this.craneBody = Bodies.circle(300, 150, 20, {
            collisionFilter: { group: -1 }, // Don't collide with blocks immediately?
            density: 0.001,
            frictionAir: 0.01
        });

        // Constraint swinging
        this.craneConstraint = Constraint.create({
            pointA: pivot,
            bodyB: this.craneBody,
            length: 100,
            stiffness: 0.1
        });

        Composite.add(this.engine.world, [this.craneBody, this.craneConstraint]);

        // Spawn first block attached to crane
        this.spawnNewBlockOnCrane();

        // Start
        Render.run(this.render);
        this.runner = Runner.create();
        Runner.run(this.runner, this.engine);

        this.active = true;

        // Input
        window.addEventListener('keydown', this.boundKeyDown);
        this.canvas.addEventListener('click', this.boundClick);

        // Add Mouse Control for fun (optional, maybe remove if strictly gameplay)
        // const mouse = Mouse.create(this.render.canvas);
        // const mouseConstraint = MouseConstraint.create(this.engine, {
        //     mouse: mouse,
        //     constraint: { stiffness: 0.2, render: { visible: false } }
        // });
        // Composite.add(this.engine.world, mouseConstraint);
        // this.render.mouse = mouse;
    }

    spawnNewBlockOnCrane() {
        if (this.currentBlock) return;

        const Bodies = Matter.Bodies;
        const width = 40 + Math.random() * 40;
        const height = 40 + Math.random() * 40;

        // Create block at crane position
        this.currentBlock = Bodies.rectangle(this.craneBody.position.x, this.craneBody.position.y + 30, width, height, {
            density: 0.001,
            friction: 0.5,
            restitution: 0.1,
            render: { fillStyle: this.getRandomColor() }
        });

        // Attach to crane with constraint
        this.blockConstraint = Matter.Constraint.create({
            bodyA: this.craneBody,
            bodyB: this.currentBlock,
            length: 40,
            stiffness: 1
        });

        Matter.Composite.add(this.engine.world, [this.currentBlock, this.blockConstraint]);
    }

    getRandomColor() {
        const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    handleInput(e) {
        if (!this.active) return;
        if (e.code === 'Space') {
            this.spawnBlock();
        }
    }

    spawnBlock() {
        if (!this.currentBlock || !this.blockConstraint) return;

        // Release
        Matter.Composite.remove(this.engine.world, this.blockConstraint);
        this.blockConstraint = null;
        this.currentBlock = null; // Detached

        this.blockCount++;
        window.soundManager.playSound('jump'); // Drop sound

        // Spawn next after delay
        setTimeout(() => {
            if (this.active) this.spawnNewBlockOnCrane();
        }, 1500);
    }

    shutdown() {
        this.active = false;

        if (this.runner) Matter.Runner.stop(this.runner);
        if (this.render) {
            Matter.Render.stop(this.render);
            this.render.canvas.remove();
            this.render.canvas = null;
            this.render.context = null;
            this.render.textures = {};
        }
        if (this.engine) Matter.Engine.clear(this.engine);

        window.removeEventListener('keydown', this.boundKeyDown);
        if (this.canvas) this.canvas.removeEventListener('click', this.boundClick);
    }

    update(dt) {
        if (!this.active) return;

        // Swing logic manually if needed, or let physics do it
        // We can apply a force to the crane body to keep it swinging
        this.swingTime += dt;
        const force = Math.sin(this.swingTime * 2) * 0.002;
        Matter.Body.applyForce(this.craneBody, this.craneBody.position, { x: force, y: 0 });

        // Height Check
        let highest = 0;
        const bodies = Matter.Composite.allBodies(this.engine.world);
        for (const b of bodies) {
            if (!b.isStatic && b !== this.craneBody && b !== this.currentBlock) {
                // Check if it fell off
                if (b.position.y > 800) {
                    // Game Over condition or just lost block?
                    // Let's just ignore for now
                }

                // Ground is 790. Height is inverse y.
                const h = 760 - b.position.y; // approx
                if (h > highest) highest = h;
            }
        }

        this.maxHeight = Math.max(0, Math.floor(highest));
        this.updateUI();
    }

    draw() {
        // Render handled by Matter.js Render
        // We can draw UI overlay here if needed, but we used DOM UI
    }

    updateUI() {
        const hEl = document.getElementById('stacker-height');
        const bEl = document.getElementById('stacker-blocks');
        if (hEl) hEl.innerText = `${this.maxHeight}m`;
        if (bEl) bEl.innerText = this.blockCount;
    }
}
