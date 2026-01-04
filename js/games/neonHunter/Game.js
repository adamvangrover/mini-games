import InputManager from '../../core/InputManager.js';
import SoundManager from '../../core/SoundManager.js';
import SaveSystem from '../../core/SaveSystem.js';
import ClayPigeons from './modes/ClayPigeons.js';
import DuckHunt from './modes/DuckHunt.js';
import DeerHunt from './modes/DeerHunt.js';
import Safari from './modes/Safari.js';
import SharkAttack from './modes/SharkAttack.js';

export default class Game {
    constructor(container) {
        this.container = container;
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;

        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
        this.activeMode = null;
        this.activeModeInstance = null;

        this.score = 0;
        this.ammo = 0;
        this.timeLeft = 0;

        // "64-bit 90s" resolution
        this.renderWidth = 320;
        this.renderHeight = 240;

        this.initThree();
        this.createMenu();

        window.addEventListener('resize', this.onResize.bind(this));
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        this.camera = new THREE.PerspectiveCamera(60, this.renderWidth / this.renderHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight); // Canvas size matches window
        this.renderer.setPixelRatio(1); // Standard pixel ratio
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap; // Rough shadows for 90s feel

        // We render to a low-res target and upscale via CSS or a pass
        // But for simplicity in "additive" mode, we'll use a low-res RenderTarget or just setSize small and scale up canvas?
        // Setting canvas size small and CSS large creates blur.
        // To get pixelated look:
        this.renderer.domElement.style.imageRendering = 'pixelated';
        this.renderer.setSize(this.renderWidth, this.renderHeight, false); // Update canvas buffer size
        this.renderer.domElement.style.width = '100%'; // Stretch via CSS
        this.renderer.domElement.style.height = '100%';

        this.container.appendChild(this.renderer.domElement);

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Crosshair
        this.createCrosshair();

        // Click Listener for Shooting
        this.container.addEventListener('click', this.onShoot.bind(this));

        // Mobile tap
        this.container.addEventListener('touchstart', (e) => {
             // Basic tap to shoot for now
             if(this.state === 'PLAYING') this.onShoot(e);
        }, {passive: false});
    }

    createCrosshair() {
        this.crosshair = document.createElement('div');
        this.crosshair.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            border: 2px solid #0f0;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            display: none;
        `;
        const dot = document.createElement('div');
        dot.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 4px;
            height: 4px;
            background: #0f0;
            transform: translate(-50%, -50%);
        `;
        this.crosshair.appendChild(dot);
        this.container.appendChild(this.crosshair);
    }

    createMenu() {
        this.menu = document.createElement('div');
        this.menu.className = 'absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-green-500 font-mono z-10';
        this.menu.innerHTML = `
            <h1 class="text-4xl mb-8 font-bold border-b-4 border-green-500 pb-2">NEON HUNTER 64</h1>
            <div class="grid grid-cols-1 gap-4 w-64">
                <button class="mode-btn px-4 py-2 border-2 border-green-500 hover:bg-green-500 hover:text-black transition-colors" data-mode="clay">CLAY PIGEONS</button>
                <button class="mode-btn px-4 py-2 border-2 border-green-500 hover:bg-green-500 hover:text-black transition-colors" data-mode="duck">DUCK HUNT</button>
                <button class="mode-btn px-4 py-2 border-2 border-green-500 hover:bg-green-500 hover:text-black transition-colors" data-mode="deer">DEER HUNT</button>
                <button class="mode-btn px-4 py-2 border-2 border-green-500 hover:bg-green-500 hover:text-black transition-colors" data-mode="safari">SAFARI</button>
                <button class="mode-btn px-4 py-2 border-2 border-green-500 hover:bg-green-500 hover:text-black transition-colors" data-mode="shark">SHARK ATTACK</button>
            </div>
            <button id="exit-btn" class="mt-8 text-red-500 hover:text-red-400">EXIT GAME</button>
        `;

        this.container.appendChild(this.menu);

        this.menu.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startMode(e.target.dataset.mode);
            });
        });

        this.menu.querySelector('#exit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.miniGameHub) window.miniGameHub.goBack();
        });

        // HUD
        this.hud = document.createElement('div');
        this.hud.className = 'absolute top-0 left-0 w-full p-4 flex justify-between font-mono text-xl text-green-400 pointer-events-none hidden';
        this.hud.innerHTML = `
            <div>SCORE: <span id="nh-score">0</span></div>
            <div id="nh-center-msg" class="text-yellow-400"></div>
            <div>AMMO: <span id="nh-ammo">∞</span></div>
        `;
        this.container.appendChild(this.hud);
    }

    startMode(mode) {
        this.activeMode = mode;
        this.state = 'PLAYING';
        this.menu.classList.add('hidden');
        this.hud.classList.remove('hidden');
        this.crosshair.style.display = 'block';

        this.score = 0;
        this.updateHUD();

        // Clear scene (keep camera/lights?)
        while(this.scene.children.length > 0){
            this.scene.remove(this.scene.children[0]);
        }

        switch(mode) {
            case 'clay': this.activeModeInstance = new ClayPigeons(this); break;
            case 'duck': this.activeModeInstance = new DuckHunt(this); break;
            case 'deer': this.activeModeInstance = new DeerHunt(this); break;
            case 'safari': this.activeModeInstance = new Safari(this); break;
            case 'shark': this.activeModeInstance = new SharkAttack(this); break;
        }

        this.activeModeInstance.init();

        // Lock pointer
        if (!('ontouchstart' in window)) {
            this.container.requestPointerLock();
        }
    }

    onShoot(e) {
        if (this.state !== 'PLAYING' || !this.activeModeInstance) return;

        // Recoil effect?
        this.camera.rotateX(0.02);

        // Sound
        this.soundManager.playSound(this.activeMode === 'shark' ? 'shoot-water' : 'shoot'); // Need to register these sounds or use generic

        // Raycast
        this.raycaster.setFromCamera(new THREE.Vector2(0,0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        this.activeModeInstance.onShoot(intersects);
    }

    update(dt) {
        if (this.state === 'PLAYING' && this.activeModeInstance) {
            this.activeModeInstance.update(dt);

            // Recoil recovery
            this.camera.rotation.x *= 0.9;
        }

        // Camera input handling (if pointer locked or touch drag implemented)
        if (document.pointerLockElement === this.container) {
            const lookSpeed = 0.002;
            this.camera.rotation.y -= this.inputManager.mouseMovement.x * lookSpeed;
            this.camera.rotation.x -= this.inputManager.mouseMovement.y * lookSpeed;
            this.camera.rotation.x = Math.max(-1.5, Math.min(1.5, this.camera.rotation.x));

            // Reset mouse delta after reading (InputManager accumulates usually, depends on impl)
            // InputManager in this codebase: accumulates in `handleMouseMove`.
            // We need to verify if `InputManager` resets it or if we use `movementX` directly.
            // Using standard pointer lock API listeners is safer if InputManager doesn't support 3D look well.
        } else if (this.state === 'PLAYING') {
             // Fallback for non-pointer lock (e.g. testing)
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateHUD() {
        document.getElementById('nh-score').innerText = this.score;
        // Ammo update by mode
    }

    gameOver(finalScore) {
        this.state = 'GAMEOVER';
        document.exitPointerLock();

        window.miniGameHub.showGameOver(finalScore, {
            onRestart: () => this.startMode(this.activeMode),
            onExit: () => {
                this.state = 'MENU';
                this.menu.classList.remove('hidden');
                this.hud.classList.add('hidden');
                this.crosshair.style.display = 'none';
            }
        });
    }

    onResize() {
        // Keep low res buffer, stretch via CSS
        // Aspect ratio update
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    shutdown() {
        window.removeEventListener('resize', this.onResize.bind(this));
        if (this.menu) this.menu.remove();
        if (this.hud) this.hud.remove();
        if (this.crosshair) this.crosshair.remove();
        this.container.innerHTML = '';
    }
}
