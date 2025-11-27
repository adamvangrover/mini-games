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
