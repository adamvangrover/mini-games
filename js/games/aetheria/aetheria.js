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
        // Find existing UI
        const selectionScreen = document.getElementById('aetheria-selection-screen');
        const hud = document.getElementById('aetheria-hud');
        
        if (selectionScreen) {
            selectionScreen.style.display = 'flex';
            selectionScreen.style.opacity = '1';
        }
        if (hud) hud.style.display = 'none';

        // Initialize Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);

        // Get dimensions from container (or window if fullscreen style)
        // Aetheria seems designed for fullscreen overlay in index.html styles
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        
        // Find or create container div inside the game container
        let renderTarget = container.querySelector('#aetheria-game-container');
        if (!renderTarget) {
            renderTarget = container;
        }
        
        // Clear old content
        renderTarget.innerHTML = '';
        renderTarget.appendChild(this.renderer.domElement);

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
        };

        window.addEventListener('resize', this.resizeHandler);
    }

    shutdown() {
        this.isPlaying = false;
        window.removeEventListener('resize', this.resizeHandler);
        
        // Cleanup UI
        delete window.startAetheriaGame;
        
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
            const coordDisplay = document.getElementById('aetheria-coord-display');
            const altDisplay = document.getElementById('aetheria-alt-display');
            if (coordDisplay && this.player.container) {
                coordDisplay.innerText = `${this.player.container.position.x.toFixed(0)}, ${this.player.container.position.z.toFixed(0)}`;
            }
            if (altDisplay && this.player.container) {
                altDisplay.innerText = this.player.container.position.y.toFixed(1);
            }
        }
    }

    draw() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
}
