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
        this.maxAmmo = 6;
        this.isReloading = false;
        this.timeLeft = 0;

        // "64-bit 90s" resolution
        this.renderWidth = 320;
        this.renderHeight = 240;

        this.initThree();
        this.createMenu();

        this.boundResize = this.onResize.bind(this);
        window.addEventListener('resize', this.boundResize);

        // Input handling
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandlePointerLockChange = this.handlePointerLockChange.bind(this);
        document.addEventListener('pointerlockchange', this.boundHandlePointerLockChange);
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        this.camera = new THREE.PerspectiveCamera(60, this.renderWidth / this.renderHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;

        this.renderer.domElement.style.imageRendering = 'pixelated';
        this.renderer.setSize(this.renderWidth, this.renderHeight, false);
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';

        this.container.appendChild(this.renderer.domElement);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.createCrosshair();

        this.container.addEventListener('click', this.onShoot.bind(this));

        // Mobile tap
        this.container.addEventListener('touchstart', (e) => {
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
                e.stopPropagation(); // Prevent shoot
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

    handlePointerLockChange() {
        if (document.pointerLockElement === this.container) {
            document.addEventListener('mousemove', this.boundHandleMouseMove, false);
        } else {
            document.removeEventListener('mousemove', this.boundHandleMouseMove, false);
        }
    }

    handleMouseMove(event) {
        if (this.state !== 'PLAYING') return;

        const lookSpeed = 0.002;
        this.camera.rotation.y -= event.movementX * lookSpeed;
        this.camera.rotation.x -= event.movementY * lookSpeed;

        // Clamp vertical look
        this.camera.rotation.x = Math.max(-1.5, Math.min(1.5, this.camera.rotation.x));
    }

    startMode(mode) {
        this.activeMode = mode;
        this.state = 'PLAYING';
        this.menu.classList.add('hidden');
        this.hud.classList.remove('hidden');
        this.crosshair.style.display = 'block';

        this.score = 0;
        this.isReloading = false;

        // Reset ammo defaults (modes can override)
        this.ammo = 0;
        this.maxAmmo = 6;

        this.updateHUD();

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

        if (this.activeModeInstance) {
             this.activeModeInstance.init();
        } else {
             console.error("Mode not implemented:", mode);
             this.gameOver(0);
        }

        if (!('ontouchstart' in window)) {
            this.container.requestPointerLock();
        }
    }

    onShoot(e) {
        if (this.state !== 'PLAYING' || !this.activeModeInstance) return;
        if (this.isReloading) {
            // Clicked while reloading
            return;
        }

        // Basic ammo check if handled by game (some modes like clay regulate their own)
        // But for consistency we'll let modes handle onShoot logic entirely

        this.camera.rotateX(0.02); // Recoil

        this.soundManager.playSound(this.activeMode === 'shark' ? 'shoot-water' : 'shoot');

        this.raycaster.setFromCamera(new THREE.Vector2(0,0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        this.activeModeInstance.onShoot(intersects);
    }

    update(dt) {
        if (this.state === 'PLAYING' && this.activeModeInstance) {
            this.activeModeInstance.update(dt);
            this.camera.rotation.x *= 0.9; // Recoil recovery
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateHUD() {
        const scoreEl = document.getElementById('nh-score');
        const ammoEl = document.getElementById('nh-ammo');
        if(scoreEl) scoreEl.innerText = this.score;
        if(ammoEl) ammoEl.innerText = this.ammo;
    }

    showMsg(msg, duration = 1000) {
        const el = document.getElementById('nh-center-msg');
        if (el) {
            el.innerText = msg;
            if (duration > 0) {
                setTimeout(() => {
                    if(el.innerText === msg) el.innerText = "";
                }, duration);
            }
        }
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
        if (!this.container || !this.camera || !this.renderer) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    shutdown() {
        window.removeEventListener('resize', this.boundResize);
        document.removeEventListener('pointerlockchange', this.boundHandlePointerLockChange);
        document.removeEventListener('mousemove', this.boundHandleMouseMove);

        if (this.menu) this.menu.remove();
        if (this.hud) this.hud.remove();
        if (this.crosshair) this.crosshair.remove();
        this.container.innerHTML = '';

        if(this.renderer) {
            this.renderer.dispose();
        }
        if(this.scene) {
            this.scene.clear();
        }
    }
}
