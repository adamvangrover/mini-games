// Adapter for Aetheria to standard Game interface

import { World } from './world.js';
import { Player } from './player.js';

export default class AetheriaGameAdapter {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.player = null;
        this.isPlaying = false;
        this.clock = new THREE.Clock();
        this.resizeHandler = this.onResize.bind(this);
    }

    init(container) {
        if (typeof THREE === 'undefined') {
            container.innerHTML = `<div class="p-4 text-red-500">Error: Three.js is not loaded. Please check your internet connection or standard libraries.</div>`;
            return;
        }

        // Inject UI HTML if missing
        if (!container.querySelector('#aetheria-game-container')) {
            container.innerHTML = `
                <div id="aetheria-wrapper" class="relative w-full h-full font-mono">
                    <!-- Game Canvas Container -->
                    <div id="aetheria-game-container" class="w-full h-full absolute inset-0"></div>

                    <!-- Selection Screen -->
                    <div id="aetheria-selection-screen" class="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center z-50 transition-opacity duration-1000">
                        <h1 class="text-6xl font-bold text-cyan-400 mb-8 title-glow">AETHERIA</h1>
                        <p class="text-slate-300 mb-12 text-lg">Choose your Element</p>

                        <div class="flex gap-8">
                            <button onclick="window.startAetheriaGame('fire')" class="group relative w-48 h-64 bg-slate-800 border-2 border-red-500 rounded-lg overflow-hidden hover:scale-105 transition-transform">
                                <div class="absolute inset-0 bg-red-900/20 group-hover:bg-red-500/20 transition-colors"></div>
                                <div class="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
                                    <h3 class="text-2xl font-bold text-red-500">PYRO</h3>
                                    <p class="text-xs text-slate-400">Master of Flame</p>
                                </div>
                                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl text-red-500">
                                    <i class="fas fa-fire"></i>
                                </div>
                            </button>

                            <button onclick="window.startAetheriaGame('ice')" class="group relative w-48 h-64 bg-slate-800 border-2 border-cyan-500 rounded-lg overflow-hidden hover:scale-105 transition-transform">
                                <div class="absolute inset-0 bg-cyan-900/20 group-hover:bg-cyan-500/20 transition-colors"></div>
                                <div class="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
                                    <h3 class="text-2xl font-bold text-cyan-500">CRYO</h3>
                                    <p class="text-xs text-slate-400">Frost Walker</p>
                                </div>
                                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl text-cyan-500">
                                    <i class="fas fa-snowflake"></i>
                                </div>
                            </button>

                            <button onclick="window.startAetheriaGame('nature')" class="group relative w-48 h-64 bg-slate-800 border-2 border-green-500 rounded-lg overflow-hidden hover:scale-105 transition-transform">
                                <div class="absolute inset-0 bg-green-900/20 group-hover:bg-green-500/20 transition-colors"></div>
                                <div class="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
                                    <h3 class="text-2xl font-bold text-green-500">TERRA</h3>
                                    <p class="text-xs text-slate-400">Nature's Wrath</p>
                                </div>
                                <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl text-green-500">
                                    <i class="fas fa-leaf"></i>
                                </div>
                            </button>
                        </div>
                        <button class="back-btn mt-12 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Back</button>
                    </div>

                    <!-- HUD -->
                    <div id="aetheria-hud" class="hidden absolute inset-0 pointer-events-none z-40">
                        <div class="absolute top-4 left-4 bg-black/50 p-2 rounded border border-white/10">
                            <div class="text-xs text-slate-400">COORDINATES</div>
                            <div class="text-lg text-cyan-400 font-mono" id="aetheria-coord-display">0, 0</div>
                        </div>
                        <div class="absolute top-4 right-4 bg-black/50 p-2 rounded border border-white/10 text-right">
                             <div class="text-xs text-slate-400">ALTITUDE</div>
                             <div class="text-lg text-yellow-400 font-mono" id="aetheria-alt-display">0.0</div>
                        </div>
                        <div class="absolute bottom-8 left-8 text-white/50 text-sm">
                            WASD to Move | SPACE to Jump | CLICK to Lock Cursor
                        </div>
                    </div>
                </div>
            `;

            container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.container = container;
        const selectionScreen = container.querySelector('#aetheria-selection-screen');
        const hud = container.querySelector('#aetheria-hud');
        
        if (selectionScreen) {
            selectionScreen.style.display = 'flex';
            selectionScreen.style.opacity = '1';
        }
        if (hud) hud.style.display = 'none';

        // Initialize Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);

        // Get dimensions from container
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        
        // Find or create container div inside the game container
        let renderTarget = container.querySelector('#aetheria-game-container');
        if (!renderTarget) renderTarget = container;
        
        renderTarget.innerHTML = '';
        renderTarget.appendChild(this.renderer.domElement);

        // Click to lock
        renderTarget.addEventListener('click', () => {
            if (this.isPlaying) {
                renderTarget.requestPointerLock = renderTarget.requestPointerLock || renderTarget.mozRequestPointerLock;
                if (renderTarget.requestPointerLock) renderTarget.requestPointerLock();
            }
        });

        // Lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemiLight);
        const dirLight = new THREE.DirectionalLight(0xffdfba, 1.2);
        dirLight.position.set(100, 100, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
        
        // Game Objects
        this.world = new World(this.scene);
        this.world.generate();
        this.player = new Player(this.scene, this.camera);

        this.isPlaying = false;

        // Global hook for the onclick in HTML
        window.startAetheriaGame = (type) => {
            if (window.soundManager) window.soundManager.playSound('click');
            if (selectionScreen) {
                selectionScreen.style.opacity = 0;
                setTimeout(() => {
                    selectionScreen.style.display = 'none';
                    if (hud) hud.style.display = 'block';
                }, 1000);
            }
            this.player.spawn(type, 0, 30, 0);
            this.isPlaying = true;

            // Auto lock
            renderTarget.requestPointerLock();
        };

        window.addEventListener('resize', this.resizeHandler);
    }

    shutdown() {
        this.isPlaying = false;
        window.removeEventListener('resize', this.resizeHandler);
        
        // Cleanup UI
        delete window.startAetheriaGame;
        if (document.exitPointerLock) document.exitPointerLock();
        
        if (this.renderer) {
            this.renderer.dispose();
            // Remove canvas from DOM
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        
        // Reset scene refs to help GC
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.player = null;
    }

    update(dt) {
        if (!this.scene) return;
        const time = this.clock.getElapsedTime(); // Use internal clock total time
        if (this.world) this.world.update(time);

        if (this.isPlaying && this.player) {
            this.player.update(dt, time, this.world);

            // HUD Update
            if (this.container) {
                const coordDisplay = this.container.querySelector('#aetheria-coord-display');
                const altDisplay = this.container.querySelector('#aetheria-alt-display');
                if (coordDisplay && this.player.container) {
                    coordDisplay.innerText = `${this.player.container.position.x.toFixed(0)}, ${this.player.container.position.z.toFixed(0)}`;
                }
                if (altDisplay && this.player.container) {
                    altDisplay.innerText = this.player.container.position.y.toFixed(1);
                }
            }
        }
    }

    draw() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize() {
        if (this.camera && this.renderer && this.container) {
            const rect = this.container.getBoundingClientRect();
            this.camera.aspect = rect.width / rect.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(rect.width, rect.height);
        }
    }
}
