import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

export default class SynthwaveRhythm {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.animationId = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.input = InputManager.getInstance();
        this.boundResize = this.resize.bind(this);
        this.boundLoop = this.loop.bind(this);
        this.lastTime = 0;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.grid = null;

        // Game State
        this.notes = [];
        this.activeNotes = [];
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;

        this.timeElapsed = 0;
        this.bpm = 120;
        this.noteSpeed = 20; // Units per second

        // Spawn timer
        this.nextBeat = 0;

        // Materials
        this.noteGeo = null;
        this.noteMats = [];
    }

    async init(container) {
        this.container = container;

        // Setup UI
        this.container.innerHTML = `
            <div class="relative w-full h-full bg-slate-900 overflow-hidden font-mono select-none" id="synthwaveRhythm-ui">
                <canvas id="synthwaveRhythm-canvas" class="absolute inset-0 block"></canvas>

                <div class="absolute top-4 left-4 text-white z-10 pointer-events-none">
                    <div class="text-3xl font-bold text-fuchsia-500 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]">SCORE: <span id="sr-score">0</span></div>
                    <div class="text-xl text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">COMBO: <span id="sr-combo">0</span>x</div>
                    <div id="sr-feedback" class="text-2xl font-bold mt-4 text-yellow-400 opacity-0 transition-opacity">PERFECT!</div>
                </div>

                <div class="absolute bottom-10 left-0 w-full flex justify-center gap-8 z-10 pointer-events-none text-slate-500 font-bold text-xl">
                    <div class="key-indicator" id="key-d">D</div>
                    <div class="key-indicator" id="key-f">F</div>
                    <div class="key-indicator" id="key-j">J</div>
                    <div class="key-indicator" id="key-k">K</div>
                </div>

                <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded font-bold z-20 transition-colors pointer-events-auto border border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]">BACK</button>
            </div>
            <style>
                .key-indicator {
                    width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;
                    border: 2px solid #64748b; border-radius: 8px; transition: all 0.1s;
                }
                .key-indicator.active {
                    background: rgba(217,70,239,0.3); border-color: #d946ef; color: white;
                    box-shadow: 0 0 15px rgba(217,70,239,0.8); transform: scale(1.1);
                }
            </style>
        `;

        this.canvas = this.container.querySelector('#synthwaveRhythm-canvas');

        this.initThree();

        window.addEventListener('resize', this.boundResize);
        this.resize();

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, -10);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x0f172a);

        // Sun
        const sunGeo = new THREE.CircleGeometry(20, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, fog: false });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(0, 5, -80);
        this.scene.add(sun);

        // Moving Grid (Highway)
        const gridHelper = new THREE.GridHelper(200, 100, 0xd946ef, 0x0ea5e9);
        gridHelper.position.y = -1;
        this.scene.add(gridHelper);
        this.grid = gridHelper;

        // Hit Zone Line
        const lineGeo = new THREE.BoxGeometry(10, 0.2, 0.5);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
        const hitLine = new THREE.Mesh(lineGeo, lineMat);
        hitLine.position.set(0, -0.9, 2); // Z=2 is hit time
        this.scene.add(hitLine);

        // Note Setup
        this.noteGeo = new THREE.BoxGeometry(1.5, 0.5, 1.5);
        this.noteMats = [
            new THREE.MeshBasicMaterial({ color: 0xf43f5e }), // Red
            new THREE.MeshBasicMaterial({ color: 0x3b82f6 }), // Blue
            new THREE.MeshBasicMaterial({ color: 0x10b981 }), // Green
            new THREE.MeshBasicMaterial({ color: 0xeab308 })  // Yellow
        ];

        // Build Track
        this.generateTrack();
    }

    generateTrack() {
        // Simple procedural track generator
        let t = 2; // Start after 2 seconds
        for (let i = 0; i < 200; i++) {
            this.notes.push({
                time: t,
                lane: Math.floor(Math.random() * 4),
                spawned: false,
                mesh: null
            });
            // 8th notes, 16th notes, etc.
            const beatStep = (60 / this.bpm) * (Math.random() > 0.7 ? 0.5 : 1);
            t += beatStep;
        }
    }

    loop(timestamp) {
        if (!this.renderer) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(Math.min(dt, 0.1));
        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
        this.timeElapsed += dt;

        // Animate Grid
        if (this.grid) {
            this.grid.position.z += this.noteSpeed * dt;
            if (this.grid.position.z > 2) {
                this.grid.position.z -= 2;
            }
        }

        // Spawn Notes (Spawn ahead of time so they travel down the highway)
        const spawnLeadTime = 60 / this.noteSpeed; // Time it takes to reach Z=2 from Z=-60

        for (const note of this.notes) {
            if (!note.spawned && this.timeElapsed >= note.time - spawnLeadTime) {
                this.spawnNoteMesh(note);
                note.spawned = true;
            }
        }

        // Handle input states (Rising Edge)
        const codes = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
        const pressedThisFrame = [false, false, false, false];

        for (let i=0; i<4; i++) {
            const el = document.getElementById(`key-${['d', 'f', 'j', 'k'][i]}`);

            // We need rising edge detection to prevent holding.
            // Since we don't have isKeyPressed in InputManager guaranteed, we simulate it via a local state map
            if (!this._lastKeys) this._lastKeys = {};

            const isDown = this.input.isKeyDown(codes[i]);
            if (isDown && !this._lastKeys[codes[i]]) {
                pressedThisFrame[i] = true;
                this.soundManager.playSound('click'); // drum tap
            }
            this._lastKeys[codes[i]] = isDown;

            if (el) {
                if (isDown) el.classList.add('active');
                else el.classList.remove('active');
            }
        }

        // Move Active Notes and Check Hit/Miss
        for (let i = this.activeNotes.length - 1; i >= 0; i--) {
            const n = this.activeNotes[i];

            // Target Z is 2. Calculate current Z based on exact time difference.
            const timeDiff = n.time - this.timeElapsed;
            n.mesh.position.z = 2 - (timeDiff * this.noteSpeed);

            // Hit Detection
            if (pressedThisFrame[n.lane]) {
                // Determine accuracy
                const absDiff = Math.abs(timeDiff);

                if (absDiff < 0.1) {
                    this.registerHit(n, i, 'PERFECT!', 100);
                    pressedThisFrame[n.lane] = false; // consume
                    continue;
                } else if (absDiff < 0.25) {
                    this.registerHit(n, i, 'GOOD', 50);
                    pressedThisFrame[n.lane] = false;
                    continue;
                }
            }

            // Miss Detection
            if (timeDiff < -0.3) {
                this.registerHit(n, i, 'MISS', 0);
            }
        }
    }

    spawnNoteMesh(note) {
        const mesh = new THREE.Mesh(this.noteGeo, this.noteMats[note.lane]);
        // Lanes: -3, -1, 1, 3
        const laneX = (note.lane - 1.5) * 2;
        mesh.position.set(laneX, -0.5, -60);
        this.scene.add(mesh);
        note.mesh = mesh;
        this.activeNotes.push(note);
    }

    registerHit(note, index, feedback, points) {
        // Remove mesh
        this.scene.remove(note.mesh);
        this.activeNotes.splice(index, 1);

        // Score logic
        if (points > 0) {
            this.combo++;
            this.score += points * Math.min(this.combo, 10);
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        } else {
            this.combo = 0;
        }

        document.getElementById('sr-score').innerText = this.score;
        document.getElementById('sr-combo').innerText = this.combo;

        // Visual Feedback
        const fbEl = document.getElementById('sr-feedback');
        fbEl.innerText = feedback;
        fbEl.style.color = points === 100 ? '#f43f5e' : (points > 0 ? '#10b981' : '#64748b');

        // Trigger reflow for animation restart
        fbEl.classList.remove('opacity-0', 'scale-150');
        void fbEl.offsetWidth;
        fbEl.style.transition = 'none';
        fbEl.style.opacity = '1';
        fbEl.style.transform = 'scale(1.5)';

        setTimeout(() => {
            fbEl.style.transition = 'all 0.5s ease-out';
            fbEl.style.opacity = '0';
            fbEl.style.transform = 'scale(1)';
        }, 50);
    }

    draw() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    resize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const rect = this.container.getBoundingClientRect();
        this.camera.aspect = rect.width / rect.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(rect.width, rect.height);
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.boundResize);

        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
