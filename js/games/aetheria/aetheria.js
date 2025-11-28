// Adapter for Aetheria to standard Game interface
// Aetheria seems to rely on global THREE.js logic heavily, so we wrap it.
// The original file sets up its own loop. We should try to use it or control it.

// Note: The original file uses `import * as THREE` from CDN.
// Since we are in a module environment now, we should probably stick to `window.THREE` if it's loaded in index.html,
// OR update the imports to local if we had npm.
// The existing `js/games/aetheria/aetheria.js` uses CDN imports.
// However, our `index.html` loads Three.js globally via script tag.
// We should change the import to use `window.THREE` or just not import it if it's global.

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
    }

// Helpers to handle context loss/restoration or just clean scope
const aetheriaGame = {
    init: () => {
        const container = document.getElementById('aetheria-game-container');
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
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        
        // Find or create container div inside the game container
        let renderTarget = container.querySelector('#aetheria-game-container');
        if (!renderTarget) {
            // Should exist in index.html, but just in case
            renderTarget = container;
        }
        
        // Clear old
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

        window.addEventListener('resize', this.onResize.bind(this));
    }

    shutdown: () => {
        isPlaying = false;
        if (animationId) cancelAnimationFrame(animationId);
    shutdown() {
        this.isPlaying = false;
        window.removeEventListener('resize', this.onResize.bind(this));
        
        // Cleanup UI
        delete window.startAetheriaGame;
        
        if (this.renderer) {
            this.renderer.dispose();
            // Optional: remove dom element
        }
        
        // Clean up UI
        // We set startAetheriaGame on window, we should clean it,
        // but if the user clicks the button in the UI (which is in index.html),
        // it expects this global.
        // Ideally we shouldn't use inline onclick in index.html.
        // But for now we leave it, just be aware.
        // delete window.startAetheriaGame;

        // Reset scene refs
        scene = null;
        camera = null;
        renderer = null;
        world = null;
        player = null;
        // Dispose scene...
    }

    update(dt) {
        const time = this.clock.getElapsedTime(); // Use internal clock total time
        if (this.world) this.world.update(time);

function animate() {
    // If shutdown called, stop
    if (!scene || !renderer) return;

    animationId = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    if (world) world.update(time);

    if (isPlaying && player) {
        player.update(delta, time, world);
        
        // Update HUD
        const coordDisplay = document.getElementById('aetheria-coord-display');
        const altDisplay = document.getElementById('aetheria-alt-display');
        
        if (coordDisplay && player.container) {
            coordDisplay.innerText = `${player.container.position.x.toFixed(0)}, ${player.container.position.z.toFixed(0)}`;
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

// Global hook for index.html onclicks
window.aetheriaGame = aetheriaGame;
export default aetheriaGame;
