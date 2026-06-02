import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class ContraptionMaker {
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

        // Matter.js setup
        this.engine = null;
        this.render = null;
        this.runner = null;

        this.level = this.saveSystem.getGameConfig('contraptionMaker_level') || 1;
        this.state = 'build'; // build, play, won

        this.currentTool = 'ramp'; // ramp, domino, ball
        this.placedObjects = []; // Objects placed by user
        this.levelObjects = []; // Static/Goal objects for the level

        this.dragStart = null; // For drawing ramps
        this.isDragging = false;

        // Physics Events
        this.boundPointerDown = this.onPointerDown.bind(this);
        this.boundPointerMove = this.onPointerMove.bind(this);
        this.boundPointerUp = this.onPointerUp.bind(this);
    }

    async init(container) {
        this.container = container;

        this.container.innerHTML = `
            <div class="relative w-full h-full bg-[#f8fafc] overflow-hidden font-mono select-none" id="contraptionMaker-ui" style="background-image: linear-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.2) 1px, transparent 1px); background-size: 20px 20px;">
                <canvas id="contraptionMaker-canvas" class="absolute inset-0 block"></canvas>

                <div class="absolute top-4 left-4 z-10 text-slate-800 bg-white/80 p-2 rounded shadow border border-slate-300">
                    <h1 class="text-xl font-bold text-indigo-600 mb-1"><i class="fas fa-cogs mr-2"></i>Contraption Maker</h1>
                    <div class="text-sm font-bold">Level <span id="cm-level">1</span>: <span id="cm-desc" class="text-slate-500 font-normal"></span></div>
                </div>

                <!-- Tools Palette -->
                <div id="cm-tools" class="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 bg-white/90 p-2 border border-slate-300 rounded shadow-lg transition-transform">
                    <button class="cm-tool w-12 h-12 rounded border-2 border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 flex flex-col items-center justify-center transition-colors" data-tool="ramp" title="Ramp (Drag)"><i class="fas fa-ruler-horizontal text-lg"></i></button>
                    <button class="cm-tool w-12 h-12 rounded border-2 border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 flex flex-col items-center justify-center transition-colors" data-tool="domino" title="Domino (Click)"><i class="fas fa-dice-one text-lg"></i></button>
                    <button class="cm-tool w-12 h-12 rounded border-2 border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 flex flex-col items-center justify-center transition-colors" data-tool="ball" title="Heavy Ball (Click)"><i class="fas fa-bowling-ball text-lg"></i></button>
                    <div class="h-px bg-slate-300 my-1"></div>
                    <button id="cm-clear-btn" class="w-12 h-12 rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 flex flex-col items-center justify-center transition-colors" title="Clear All"><i class="fas fa-trash"></i></button>
                </div>

                <!-- Play/Edit Toggle -->
                <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-4">
                     <button id="cm-play-btn" class="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full font-bold text-lg shadow-lg transition-transform hover:scale-105"><i class="fas fa-play mr-2"></i>START MACHINE</button>
                     <button id="cm-edit-btn" class="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold text-lg shadow-lg transition-transform hover:scale-105 hidden"><i class="fas fa-stop mr-2"></i>STOP / EDIT</button>
                </div>

                <div id="cm-overlay" class="absolute inset-0 bg-slate-900/80 z-20 flex items-center justify-center hidden">
                    <div class="bg-white p-8 rounded-xl text-center shadow-2xl border-4 border-indigo-500 max-w-sm">
                        <h2 class="text-3xl font-black text-indigo-600 mb-4">SUCCESS!</h2>
                        <p class="text-slate-600 mb-6">You solved the puzzle.</p>
                        <button id="cm-next-btn" class="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded font-bold text-lg transition-transform hover:scale-105 w-full">Next Level</button>
                    </div>
                </div>

                <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded font-bold z-30 transition-colors pointer-events-auto border border-slate-600">EXIT</button>
            </div>
        `;

        this.canvas = this.container.querySelector('#contraptionMaker-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Check Matter.js
        if (typeof Matter === 'undefined') {
            console.error('Matter.js is required');
            this.container.innerHTML += '<div class="absolute inset-0 bg-red-900 text-white p-4">Error: Matter.js not found.</div>';
            return;
        }

        // Setup UI Listeners
        const toolBtns = this.container.querySelectorAll('.cm-tool');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => b.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50'));
                btn.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50');
                this.currentTool = btn.dataset.tool;
            });
        });
        toolBtns[0].classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50');

        document.getElementById('cm-clear-btn').addEventListener('click', () => this.clearUserObjects());

        document.getElementById('cm-play-btn').addEventListener('click', () => {
             this.state = 'play';
             document.getElementById('cm-play-btn').classList.add('hidden');
             document.getElementById('cm-edit-btn').classList.remove('hidden');
             document.getElementById('cm-tools').classList.add('-translate-x-32'); // hide tools
             this.startPhysics();
        });

        document.getElementById('cm-edit-btn').addEventListener('click', () => {
             this.state = 'build';
             document.getElementById('cm-play-btn').classList.remove('hidden');
             document.getElementById('cm-edit-btn').classList.add('hidden');
             document.getElementById('cm-tools').classList.remove('-translate-x-32');
             this.stopPhysics();
        });

        document.getElementById('cm-next-btn').addEventListener('click', () => {
             document.getElementById('cm-overlay').classList.add('hidden');
             this.level++;
             if (this.level > 3) this.level = 1; // loop for now
             this.saveSystem.setGameConfig('contraptionMaker_level', this.level);
             this.loadLevel(this.level);
        });

        // Canvas Interaction
        this.canvas.addEventListener('pointerdown', this.boundPointerDown);
        this.canvas.addEventListener('pointermove', this.boundPointerMove);
        window.addEventListener('pointerup', this.boundPointerUp);

        window.addEventListener('resize', this.boundResize);
        this.resize();

        this.initMatter();
        this.loadLevel(this.level);

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    initMatter() {
        this.engine = Matter.Engine.create();

        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            if (this.state !== 'play') return;

            const pairs = event.pairs;
            for (let i = 0; i < pairs.length; i++) {
                const bodyA = pairs[i].bodyA;
                const bodyB = pairs[i].bodyB;

                // Play sounds for hits based on mass/velocity
                if (bodyA.mass > 0 && bodyB.mass > 0) {
                     // throttling might be needed in a real scenario
                     if (Math.random() < 0.1) this.soundManager.playSound('click');
                }

                // Goal check
                if ((bodyA.label === 'goal' && bodyB.label === 'target') ||
                    (bodyB.label === 'goal' && bodyA.label === 'target')) {
                    this.levelComplete();
                }
            }
        });
    }

    loadLevel(lvl) {
        document.getElementById('cm-level').innerText = lvl;
        this.stopPhysics();
        this.placedObjects = [];
        this.levelObjects = [];
        Matter.Composite.clear(this.engine.world);
        Matter.Engine.clear(this.engine);

        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w/2;
        const cy = h/2;

        let desc = "";

        if (lvl === 1) {
             desc = "Get the red ball into the green bucket.";
             // Start Ball
             const startBall = Matter.Bodies.circle(cx - 200, 100, 20, {
                 label: 'target',
                 render: { fillStyle: '#ef4444' }, // Red
                 restitution: 0.8,
                 density: 0.05
             });
             this.levelObjects.push({ type: 'target', body: startBall, initialPos: {x: cx-200, y: 100} });

             // Bucket (Goal)
             const bucketLeft = Matter.Bodies.rectangle(cx + 200, h - 100, 10, 100, { isStatic: true, render: { fillStyle: '#22c55e' }});
             const bucketRight = Matter.Bodies.rectangle(cx + 300, h - 100, 10, 100, { isStatic: true, render: { fillStyle: '#22c55e' }});
             const bucketBottom = Matter.Bodies.rectangle(cx + 250, h - 45, 110, 10, { isStatic: true, render: { fillStyle: '#22c55e' }, label: 'goal' });

             this.levelObjects.push({ type: 'static', body: bucketLeft });
             this.levelObjects.push({ type: 'static', body: bucketRight });
             this.levelObjects.push({ type: 'static', body: bucketBottom });

             // Initial Static platform
             const plat = Matter.Bodies.rectangle(cx - 200, 150, 100, 10, { isStatic: true, render: { fillStyle: '#475569' }});
             this.levelObjects.push({ type: 'static', body: plat });

        } else if (lvl === 2) {
             desc = "Domino effect to drop the ball.";
             const target = Matter.Bodies.rectangle(cx + 200, 200, 40, 40, {
                 label: 'target',
                 render: { fillStyle: '#ef4444' },
                 density: 0.01
             });
             this.levelObjects.push({ type: 'target', body: target, initialPos: {x: cx+200, y: 200} });

             const plat1 = Matter.Bodies.rectangle(cx + 200, 250, 100, 10, { isStatic: true, render: { fillStyle: '#475569' }});
             this.levelObjects.push({ type: 'static', body: plat1 });

             const goal = Matter.Bodies.rectangle(cx + 200, h - 50, 200, 20, { isStatic: true, render: { fillStyle: '#22c55e' }, label: 'goal' });
             this.levelObjects.push({ type: 'static', body: goal });
        } else {
             desc = "Build a bridge.";
             const startBall = Matter.Bodies.circle(100, h - 100, 30, {
                 label: 'target',
                 render: { fillStyle: '#ef4444' },
                 restitution: 0.5,
                 density: 0.1
             });
             this.levelObjects.push({ type: 'target', body: startBall, initialPos: {x: 100, y: h-100} });

             const wall1 = Matter.Bodies.rectangle(200, h - 150, 20, 300, { isStatic: true, render: { fillStyle: '#475569' }});
             const wall2 = Matter.Bodies.rectangle(w - 200, h - 150, 20, 300, { isStatic: true, render: { fillStyle: '#475569' }});

             this.levelObjects.push({ type: 'static', body: wall1 });
             this.levelObjects.push({ type: 'static', body: wall2 });

             const goal = Matter.Bodies.rectangle(w - 100, h - 50, 100, 20, { isStatic: true, render: { fillStyle: '#22c55e' }, label: 'goal' });
             this.levelObjects.push({ type: 'static', body: goal });
        }

        document.getElementById('cm-desc').innerText = desc;
        this.addLevelObjectsToWorld();
    }

    addLevelObjectsToWorld() {
        const bodies = this.levelObjects.map(obj => obj.body);
        Matter.Composite.add(this.engine.world, bodies);
    }

    clearUserObjects() {
        if (this.state !== 'build') return;
        this.placedObjects = [];
    }

    onPointerDown(e) {
        if (this.state !== 'build') return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.isDragging = true;
        this.dragStart = { x, y };

        // For clicks
        if (this.currentTool === 'domino' || this.currentTool === 'ball') {
             this.placeObject(x, y);
             this.isDragging = false; // no drag for these
        }
    }

    onPointerMove(e) {
        if (!this.isDragging || this.state !== 'build' || this.currentTool !== 'ramp') return;
        const rect = this.canvas.getBoundingClientRect();
        this.dragCurrent = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    onPointerUp(e) {
        if (!this.isDragging || this.state !== 'build') {
             this.isDragging = false;
             return;
        }
        this.isDragging = false;

        if (this.currentTool === 'ramp' && this.dragStart && this.dragCurrent) {
            const dx = this.dragCurrent.x - this.dragStart.x;
            const dy = this.dragCurrent.y - this.dragStart.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 20) {
                const cx = this.dragStart.x + dx/2;
                const cy = this.dragStart.y + dy/2;
                const angle = Math.atan2(dy, dx);

                this.placedObjects.push({
                    type: 'ramp',
                    x: cx, y: cy,
                    width: dist, height: 10,
                    angle: angle,
                    color: '#cbd5e1' // slate-300
                });
                this.soundManager.playSound('click');
            }
        }

        this.dragStart = null;
        this.dragCurrent = null;
    }

    placeObject(x, y) {
        if (this.currentTool === 'domino') {
            this.placedObjects.push({
                type: 'domino', x, y, width: 10, height: 60, color: '#f8fafc' // white
            });
        } else if (this.currentTool === 'ball') {
            this.placedObjects.push({
                type: 'ball', x, y, radius: 25, color: '#94a3b8' // slate-400
            });
        }
        this.soundManager.playSound('click');
    }

    startPhysics() {
        // Clear world and rebuild with physical bodies
        Matter.Composite.clear(this.engine.world);
        Matter.Engine.clear(this.engine);

        // Add static level objects
        this.addLevelObjectsToWorld();

        // Create physical bodies for placed objects
        const dynamicBodies = [];

        for (let obj of this.placedObjects) {
            let body;
            if (obj.type === 'ramp') {
                body = Matter.Bodies.rectangle(obj.x, obj.y, obj.width, obj.height, {
                    isStatic: true,
                    angle: obj.angle,
                    render: { fillStyle: obj.color }
                });
            } else if (obj.type === 'domino') {
                body = Matter.Bodies.rectangle(obj.x, obj.y, obj.width, obj.height, {
                    restitution: 0.2,
                    friction: 0.5,
                    density: 0.05,
                    render: { fillStyle: obj.color }
                });
            } else if (obj.type === 'ball') {
                body = Matter.Bodies.circle(obj.x, obj.y, obj.radius, {
                    restitution: 0.6,
                    density: 0.1, // Heavy
                    render: { fillStyle: obj.color }
                });
            }

            if (body) {
                // Link back so we don't duplicate on draw
                obj.body = body;
                dynamicBodies.push(body);
            }
        }

        Matter.Composite.add(this.engine.world, dynamicBodies);
    }

    stopPhysics() {
        // Reset level objects to initial state
        for (let obj of this.levelObjects) {
             if (obj.type === 'target') {
                  Matter.Body.setPosition(obj.body, obj.initialPos);
                  Matter.Body.setVelocity(obj.body, {x:0, y:0});
                  Matter.Body.setAngularVelocity(obj.body, 0);
                  Matter.Body.setAngle(obj.body, 0);
             }
        }

        // Remove bodies from placed objects so they are rendered as blueprints again
        for (let obj of this.placedObjects) {
            if (obj.body) {
                obj.body = null;
            }
        }
    }

    levelComplete() {
        this.soundManager.playSound('powerup');
        document.getElementById('cm-overlay').classList.remove('hidden');
        this.stopPhysics(); // Pause action
    }

    loop(timestamp) {
        if (!this.canvas) return;

        const dt = (timestamp - this.lastTime);
        this.lastTime = timestamp;

        if (this.state === 'play') {
            Matter.Engine.update(this.engine, Math.min(dt, 30));
        }

        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw depending on state
        if (this.state === 'build') {
            // Draw Level Objects
            this.drawMatterBodies(this.levelObjects.map(o => o.body));

            // Draw Placed Objects (Blueprints)
            this.ctx.globalAlpha = 0.8;
            for (let obj of this.placedObjects) {
                this.ctx.fillStyle = obj.color;
                this.ctx.strokeStyle = '#64748b'; // slate-500 outline
                this.ctx.lineWidth = 2;

                this.ctx.save();
                this.ctx.translate(obj.x, obj.y);
                if (obj.angle) this.ctx.rotate(obj.angle);

                this.ctx.beginPath();
                if (obj.type === 'ramp' || obj.type === 'domino') {
                    this.ctx.rect(-obj.width/2, -obj.height/2, obj.width, obj.height);
                } else if (obj.type === 'ball') {
                    this.ctx.arc(0, 0, obj.radius, 0, Math.PI*2);
                }
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
            }
            this.ctx.globalAlpha = 1.0;

            // Draw Drag Preview
            if (this.isDragging && this.currentTool === 'ramp' && this.dragStart && this.dragCurrent) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.dragStart.x, this.dragStart.y);
                this.ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
                this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'; // indigo semi
                this.ctx.lineWidth = 10;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
            }

        } else if (this.state === 'play') {
            // Draw all physics bodies
            const bodies = Matter.Composite.allBodies(this.engine.world);
            this.drawMatterBodies(bodies);
        }
    }

    drawMatterBodies(bodies) {
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];

            this.ctx.beginPath();
            const vertices = body.vertices;
            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let j = 1; j < vertices.length; j++) {
                this.ctx.lineTo(vertices[j].x, vertices[j].y);
            }
            this.ctx.closePath();

            this.ctx.fillStyle = body.render.fillStyle || '#000';
            this.ctx.fill();

            // Draw borders
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            this.ctx.stroke();

            // Draw a line to show rotation for circles
            if (body.circleRadius) {
                 this.ctx.beginPath();
                 this.ctx.moveTo(body.position.x, body.position.y);
                 this.ctx.lineTo(vertices[0].x, vertices[0].y);
                 this.ctx.stroke();
            }
        }
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
        window.removeEventListener('pointerup', this.boundPointerUp);

        if (this.engine) {
             Matter.Engine.clear(this.engine);
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
