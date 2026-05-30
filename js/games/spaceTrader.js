import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

export default class SpaceTrader {
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

        // Three.js State
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Physics State
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = 100;
        this.drag = 0.5;
        this.rotationSpeed = 2.0;

        // UI Refs
        this.uiSpeed = null;
        this.uiCoords = null;
    }

    async init(container) {
        this.container = container;

        // Setup minimal UI and Canvas
        this.container.innerHTML = `
            <div class="relative w-full h-full bg-black overflow-hidden font-mono select-none" id="spaceTrader-ui">
                <canvas id="spaceTrader-canvas" class="absolute inset-0 block"></canvas>

                <div class="absolute top-4 left-4 text-green-500 z-10 pointer-events-none text-xl font-bold tracking-widest drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">
                    <div>SPEED: <span id="st-speed">0.0</span> c</div>
                    <div>COORDS: <span id="st-coords">X:0 Y:0 Z:0</span></div>
                </div>

                <!-- Radar / Wireframe overlays -->
                <div class="absolute bottom-4 left-4 w-48 h-48 border-2 border-green-500 rounded-full z-10 pointer-events-none bg-black/50">
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="w-1 h-1 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,1)] animate-ping"></div>
                    </div>
                </div>

                <!-- CRT Overlay -->
                <div class="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMzQsMTk3LDk0LDAuMSkiLz48L3N2Zz4=')] opacity-50 z-20 mix-blend-overlay"></div>

                <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-transparent hover:bg-green-900 text-green-500 hover:text-green-300 rounded font-bold z-30 transition-colors pointer-events-auto border border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]">ABORT</button>
            </div>
        `;

        this.canvas = this.container.querySelector('#spaceTrader-canvas');
        this.uiSpeed = this.container.querySelector('#st-speed');
        this.uiCoords = this.container.querySelector('#st-coords');

        this.initThree();

        window.addEventListener('resize', this.boundResize);
        this.resize();

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000);

        const wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x22c55e, // Green-500
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });

        // Create Player Ship (Invisible camera target, but we can draw a cockpit later if needed)
        // For now, camera is the ship.

        // Create environment stars (Vector lines)
        const starGeo = new THREE.BufferGeometry();
        const starVerts = [];
        for (let i = 0; i < 2000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starVerts.push(x, y, z);
            // Draw a tiny line for each star to keep vector aesthetic
            starVerts.push(x + (Math.random()-0.5)*2, y + (Math.random()-0.5)*2, z + (Math.random()-0.5)*2);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
        const stars = new THREE.LineSegments(starGeo, new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.5 }));
        this.scene.add(stars);

        // Example Planet (Icosahedron looks wireframey)
        const planetGeo = new THREE.IcosahedronGeometry(100, 2);
        const planetEdges = new THREE.EdgesGeometry(planetGeo);
        const planet = new THREE.LineSegments(planetEdges, wireframeMaterial);
        planet.position.set(0, 0, -500);
        this.scene.add(planet);
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
        if (!this.camera) return;

        // 1. Handle Input (Rotation & Thrust)
        // Pitch (Up/Down)
        if (this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW')) {
            this.camera.rotateX(this.rotationSpeed * dt);
        }
        if (this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS')) {
            this.camera.rotateX(-this.rotationSpeed * dt);
        }

        // Yaw (Left/Right)
        if (this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('KeyA')) {
            this.camera.rotateY(this.rotationSpeed * dt);
        }
        if (this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('KeyD')) {
            this.camera.rotateY(-this.rotationSpeed * dt);
        }

        // Roll
        if (this.input.isKeyDown('KeyQ')) {
            this.camera.rotateZ(this.rotationSpeed * dt);
        }
        if (this.input.isKeyDown('KeyE')) {
            this.camera.rotateZ(-this.rotationSpeed * dt);
        }

        // Thrust
        if (this.input.isKeyDown('Space') || this.input.isKeyDown('ShiftLeft')) {
            // Get forward vector of camera
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(this.camera.quaternion);

            // Add acceleration to velocity (Bolt optimization: avoid clone)
            this.velocity.addScaledVector(forward, this.acceleration * dt);
        }

        // Apply Drag (Inertia dampening)
        this.velocity.multiplyScalar(1 - (this.drag * dt));

        // Apply Velocity to Position
        this.camera.position.addScaledVector(this.velocity, dt);

        // Update UI
        if (this.uiSpeed && this.uiCoords) {
            const speed = this.velocity.length();
            this.uiSpeed.innerText = speed.toFixed(1);

            const px = Math.round(this.camera.position.x);
            const py = Math.round(this.camera.position.y);
            const pz = Math.round(this.camera.position.z);
            this.uiCoords.innerText = `X:${px} Y:${py} Z:${pz}`;
        }
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
