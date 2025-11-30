import State from "./State.js";
import Input from "./Input.js";
import SoundManager from "./SoundManager.js";
import LightingManager from "./LightingManager.js";
import WeatherManager from "./WeatherManager.js";
import Effects from "./Effects.js";
import Player from "./Player.js";
import World from "./World.js";
import CameraController from "./CameraController.js";
import Interactables from "./Interactables.js";
import UI from "./UI.js";
import MiniGameManager from "./MiniGameManager.js";

class GameController {
    constructor() {
        this.running = false;
        this.paused = false;

        this.scene = null;
        this.renderer = null;
        this.camera = null;

        this.canvas = null;
        this.uiRoot = null;
    }

    init({ canvas, uiRoot }) {
        this.canvas = canvas;
        this.uiRoot = uiRoot;

        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        // Lighting handled by manager

        // Modules
        this.input = new Input();

        // Managers
        this.lightingManager = new LightingManager(this.scene, this.renderer);
        this.effects = new Effects(this.scene);

        // Entities
        this.player = new Player(this.scene);
        this.world = new World(this.scene, this.player);
        this.weatherManager = new WeatherManager(this.scene, this.player);
        this.cameraController = new CameraController(this.camera, this.player);

        this.interactables = new Interactables();
        this.ui = new UI(this.uiRoot);

        // Sound
        this.soundManager = new SoundManager(this.camera);

        // Minigames
        this.miniGameManager = new MiniGameManager(this.scene, this.player, this.camera, this.world.wildlifeManager);

        // Register global state references
        State.set("player", this.player);
        State.set("world", this.world);
        State.set("ui", this.ui);
        State.reset(); // Reset stats for new game

        // Bind Interactions
        this.setupInteractions();

        // Resize Listener
        this._resizeHandler = this.resize.bind(this);
        window.addEventListener("resize", this._resizeHandler);
        this.resize();
    }

    setupInteractions() {
        // Hook up world interactable meshes to the Interactables system
        const meshes = this.world.interactableMeshes;

        if (meshes.chocolateShop) {
            this.interactables.add(meshes.chocolateShop, 4, () => {
                this.pause();
                this.miniGameManager.startChocolateGame((msg) => {
                    this.ui.notifications.push(msg);
                    this.resume();
                });
            });
        }

        if (meshes.fondueShop) {
            this.interactables.add(meshes.fondueShop, 4, () => {
                this.pause();
                this.miniGameManager.startFondueGame((msg) => {
                    this.ui.notifications.push(msg);
                    this.resume();
                });
            });
        }

        if (meshes.photoSpot) {
            this.interactables.add(meshes.photoSpot, 6, () => {
                this.pause();
                this.miniGameManager.startPhotoGame((msg) => {
                    this.ui.notifications.push(msg);
                    this.resume();
                });
            });
        }
    }

    start() {
        this.running = true;
        this.ui.show();
    }

    pause() {
        this.paused = true;
        // Unlock pointer so user can interact with minigames
        if (document.pointerLockElement === document.body) {
            document.exitPointerLock();
        }
    }

    resume() {
        this.paused = false;
        // Optional: Request lock again if desired, or let user click to lock
    }

    shutdown() {
        this.running = false;
        this.started = false;
        this.initialized = false;

        // Clean up Three.js
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }

        // Unbind input events
        if (this.input) this.input.unbindEvents();

        if (this._resizeHandler) {
            window.removeEventListener("resize", this._resizeHandler);
        }

        // Hide UI
        if (this.ui) this.ui.hide();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setClearColor(0x000000);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0xa0e0ff, 0.002);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 1.8, 5);
    }

    resize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update(dt) {
        if (!this.paused) {
            // Update systems
            if (this.input) this.input.update();
            if (this.lightingManager) this.lightingManager.update();
            if (this.weatherManager) this.weatherManager.update(dt);
            if (this.effects) this.effects.update(dt);

            if (this.player) this.player.update(dt, this.input);
            if (this.world) this.world.update(dt);
            if (this.cameraController) this.cameraController.update(dt, this.input);

            if (this.interactables && this.player) {
                this.interactables.check(this.player, this.input, this.ui.prompt);
            }

            if (this.ui) this.ui.update(dt);

            // Update HUD altitude
            if (this.player) State.set("altitude", Math.round(this.player.position.y));
        }
    }

    draw() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Singleton for consistency with current architecture
const instance = new GameController();
window.game = instance; // Expose for minigames to pause/resume
export default instance;
