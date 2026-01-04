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

        this.boundResize = this.onResize.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundOnShoot = this.onShoot.bind(this);
        this.boundTouchStart = (e) => {
            if (this.state === 'PLAYING') this.onShoot(e);
        };

        this.initThree();
        this.createMenu();

        window.addEventListener('resize', this.boundResize);
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

        this.container.addEventListener('click', this.boundOnShoot);
        document.addEventListener('mousemove', this.boundMouseMove);
        this.container.addEventListener('touchstart', this.boundTouchStart, {passive: false});
    }

    onMouseMove(e) {
        if (this.state === 'PLAYING' && document.pointerLockElement === this.container) {
            const lookSpeed = 0.002;
            this.camera.rotation.y -= e.movementX * lookSpeed;
            this.camera.rotation.x -= e.movementY * lookSpeed;
            this.camera.rotation.x = Math.max(-1.5, Math.min(1.5, this.camera.rotation.x));
        }
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
            btn.addEventListener('click', (e) => this.startMode(e.target.dataset.mode));
        });

        this.menu.querySelector('#exit-btn').addEventListener('click', () => {
            if (window.miniGameHub) window.miniGameHub.goBack();
        });

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
        this.updateHUD();

        if (!('ontouchstart' in window)) {
            this.container.requestPointerLock();
        }
    }

    onShoot(e) {
        if (this.state !== 'PLAYING' || !this.activeModeInstance) return;

        this.soundManager.playSound(this.activeMode === 'shark' ? 'shoot-water' : 'shoot');

        this.raycaster.setFromCamera(new THREE.Vector2(0,0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        this.activeModeInstance.onShoot(intersects);
    }

    update(dt) {
        if (this.state === 'PLAYING' && this.activeModeInstance) {
            this.activeModeInstance.update(dt);
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateHUD() {
        const scoreEl = document.getElementById('nh-score');
        const ammoEl = document.getElementById('nh-ammo');
        if (scoreEl) scoreEl.innerText = this.score;
        if (ammoEl) ammoEl.innerText = this.ammo;
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
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    shutdown() {
        window.removeEventListener('resize', this.boundResize);
        document.removeEventListener('mousemove', this.boundMouseMove);
        if (this.container) {
            this.container.removeEventListener('click', this.boundOnShoot);
            this.container.removeEventListener('touchstart', this.boundTouchStart);
        }

        if (this.menu) this.menu.remove();
        if (this.hud) this.hud.remove();
        if (this.crosshair) this.crosshair.remove();
        this.container.innerHTML = '';

        if(this.renderer) this.renderer.dispose();
    }
}
