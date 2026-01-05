import InputManager from '../../core/InputManager.js';
import SoundManager from '../../core/SoundManager.js';
import SaveSystem from '../../core/SaveSystem.js';

export default class Game {
    constructor(container) {
        this.container = container;
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();

        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Config
        this.CONFIG = {
            fov: 70,
            maxAmmo: 6,
            gameDuration: 60,
            gravity: 9.8,
            colors: {
                sky: 0x050510,
                grid: 0xff00ff,
                hit: 0xffff00,
                clay: 0xff5500,
                duck: 0x00ff00,
                deer: 0x8B4513,
                zebra: 0xffffff,
                shark: 0x00aaff,
                elite: 0xffd700,
                sun: 0xff0055
            },
            powerups: {
                rapid: { color: 0x00ffff, duration: 5, label: "RAPID FIRE" },
                slow:  { color: 0xaa00ff, duration: 5, label: "TIME WARP" },
                x2:    { color: 0xffff00, duration: 10, label: "DOUBLE PTS" }
            }
        };

        // State
        this.score = 0;
        this.ammo = this.CONFIG.maxAmmo;
        this.timeLeft = this.CONFIG.gameDuration;
        this.isPlaying = false;
        this.currentMode = '';
        this.targets = [];
        this.particles = [];
        this.powerups = [];
        this.environmentObjects = [];

        this.combo = 0;
        this.comboTimer = 0;
        this.activePowerups = {};
        this.timeScale = 1.0;
        this.spawnTimer = 0;
        this.powerupTimer = 0;
        this.isReloading = false;
        this.playerHealth = 100;

        this.yaw = 0;
        this.pitch = 0;
        this.raycaster = new THREE.Raycaster();

        // Visuals
        this.gunGroup = null;
        this.muzzleLight = null;
        this.gridHelper = null;
        this.retroSun = null;

        // HUD Elements
        this.ui = {
            mainMenu: null,
            gameOverMenu: null,
            hud: null,
            score: null,
            timer: null,
            ammo: null,
            wave: null,
            combo: null,
            powerup: null,
            healthBar: null,
            healthFill: null,
            crosshair: null,
            reloadMsg: null
        };

        this.init();
    }

    init() {
        // Setup Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.CONFIG.colors.sky);
        this.scene.fog = new THREE.FogExp2(this.CONFIG.colors.sky, 0.015);

        this.camera = new THREE.PerspectiveCamera(this.CONFIG.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.7, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight); // Will resize later
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xff00ff, 0.8);
        dirLight.position.set(-10, 20, -20);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Create UI
        this.createUI();

        // Listeners
        this.boundOnResize = this.onResize.bind(this);
        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnKeyDown = this.onKeyDown.bind(this);

        window.addEventListener('resize', this.boundOnResize);
        window.addEventListener('mousedown', this.boundOnMouseDown);
        window.addEventListener('mousemove', this.boundOnMouseMove);
        window.addEventListener('keydown', this.boundOnKeyDown);

        this.renderer.domElement.addEventListener('click', () => {
             if(this.isPlaying) this.container.requestPointerLock();
        });

        this.onResize();
    }

    createUI() {
        // Inject Styles (Scoped)
        const style = document.createElement('style');
        style.id = 'neon-hunter-ex-style';
        style.textContent = `
            .nh-hud-layer { font-family: 'Press Start 2P', monospace; user-select: none; text-shadow: 2px 2px 0 #ff00ff; }
            .nh-menu { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 20; backdrop-filter: blur(5px); }
            .nh-btn { background: transparent; border: 4px solid #ff00ff; color: #fff; padding: 15px 30px; font-family: 'Press Start 2P', monospace; font-size: 16px; margin: 10px; cursor: pointer; transition: 0.2s; text-transform: uppercase; box-shadow: 0 0 15px rgba(255, 0, 255, 0.5); width: 250px; }
            .nh-btn:hover { background: #ff00ff; color: #000; box-shadow: 0 0 30px #ff00ff; transform: scale(1.05); }
            .nh-hit-text { position: absolute; color: #ffff00; font-weight: bold; font-size: 24px; pointer-events: none; animation: nh-floatUp 0.8s forwards; text-shadow: 2px 2px 0 #000; z-index: 15; }
            .nh-hit-text.crit { color: #ff0000; font-size: 32px; text-shadow: 4px 4px 0 #000; }
            @keyframes nh-floatUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-80px) scale(1.2); opacity: 0; } }
            @keyframes nh-pulse { 0% { opacity: 0.7; } 100% { opacity: 1; text-shadow: 0 0 10px #fff; } }
            .nh-powerup-active { margin-bottom: 10px; animation: nh-pulse 0.5s infinite alternate; }
            .reloading { border-color: #ff0000 !important; transform: translate(-50%, -50%) rotate(45deg) !important; }
        `;
        this.container.appendChild(style);

        // Main Menu
        this.ui.mainMenu = document.createElement('div');
        this.ui.mainMenu.className = 'nh-menu';
        this.ui.mainMenu.innerHTML = `
            <h1 class="text-4xl text-cyan-400 mb-2 text-center" style="text-shadow: 4px 4px 0 #ff00ff;">NEON HUNTER 64</h1>
            <div class="text-fuchsia-500 mb-10 text-sm tracking-widest">ENHANCED EDITION</div>
            <div class="grid grid-cols-2 gap-4">
                <button class="nh-btn" data-mode="clay">Clay Pigeons</button>
                <button class="nh-btn" data-mode="duck">Duck Hunt</button>
                <button class="nh-btn" data-mode="deer">Deer Hunt</button>
                <button class="nh-btn" data-mode="safari">Safari</button>
            </div>
            <button class="nh-btn" style="margin-top: 20px; border-color: #ff0000; color: #ffaaaa;" data-mode="shark">Shark Attack</button>
            <p style="color: #888; margin-top: 30px; font-size: 10px;">MOUSE: AIM/SHOOT • R: RELOAD • ESC: EXIT</p>
        `;
        this.container.appendChild(this.ui.mainMenu);

        this.ui.mainMenu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startGame(e.target.dataset.mode);
            });
        });

        // HUD
        this.ui.hud = document.createElement('div');
        this.ui.hud.className = 'absolute top-0 left-0 w-full h-full pointer-events-none hidden nh-hud-layer';
        this.ui.hud.innerHTML = `
            <div id="nh-ex-score" class="absolute top-5 left-5 text-2xl text-cyan-400">SCORE: 0000</div>
            <div id="nh-ex-timer" class="absolute top-5 right-5 text-2xl text-pink-600">TIME: 60</div>
            <div id="nh-ex-ammo" class="absolute bottom-5 right-5 text-2xl text-yellow-400">AMMO: 6/6</div>
            <div id="nh-ex-wave" class="absolute bottom-5 left-5 text-lg text-green-400">MODE: N/A</div>
            <div id="nh-ex-combo" class="absolute top-20 left-5 text-xl text-orange-400 opacity-0 transition-opacity duration-200 transform -skew-x-12">COMBO x2</div>
            <div id="nh-ex-powerup" class="absolute top-24 right-5 text-base text-right"></div>

            <div id="nh-ex-health" class="absolute bottom-5 left-1/2 -translate-x-1/2 w-72 h-5 border-2 border-white bg-black/50 hidden">
                <div id="nh-ex-health-fill" class="w-full h-full bg-pink-600 transition-all duration-200"></div>
            </div>

            <div id="nh-ex-crosshair" class="absolute top-1/2 left-1/2 w-10 h-10 border-2 border-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_#00ffff] transition-transform duration-100 flex items-center justify-center">
                <div class="w-1 h-1 bg-pink-600"></div>
            </div>

            <div id="nh-ex-reload" class="absolute top-[60%] left-1/2 -translate-x-1/2 text-red-600 text-xl hidden animate-pulse">RELOAD! (R)</div>
        `;
        this.container.appendChild(this.ui.hud);

        // Bind Elements
        this.ui.score = this.ui.hud.querySelector('#nh-ex-score');
        this.ui.timer = this.ui.hud.querySelector('#nh-ex-timer');
        this.ui.ammo = this.ui.hud.querySelector('#nh-ex-ammo');
        this.ui.wave = this.ui.hud.querySelector('#nh-ex-wave');
        this.ui.combo = this.ui.hud.querySelector('#nh-ex-combo');
        this.ui.powerup = this.ui.hud.querySelector('#nh-ex-powerup');
        this.ui.healthBar = this.ui.hud.querySelector('#nh-ex-health');
        this.ui.healthFill = this.ui.hud.querySelector('#nh-ex-health-fill');
        this.ui.crosshair = this.ui.hud.querySelector('#nh-ex-crosshair');
        this.ui.reloadMsg = this.ui.hud.querySelector('#nh-ex-reload');
    }

    startGame(mode) {
        this.currentMode = mode;
        this.score = 0;
        this.ammo = this.CONFIG.maxAmmo;
        this.timeLeft = this.CONFIG.gameDuration;
        this.playerHealth = 100;
        this.isPlaying = true;
        this.targets = [];
        this.powerups = [];
        this.environmentObjects = [];
        this.particles = [];
        this.combo = 0;
        this.activePowerups = {};

        // UI Updates
        this.ui.mainMenu.style.display = 'none';
        this.ui.hud.classList.remove('hidden');
        this.ui.healthBar.style.display = (mode === 'shark') ? 'block' : 'none';
        this.ui.healthFill.style.width = '100%';
        this.updateHUD();

        // Scene Reset
        while(this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }

        // Re-setup Scene
        this.scene.add(this.camera);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        this.createGun();
        this.setupEnvironment(mode);
        this.container.requestPointerLock();
    }

    createGun() {
        if(this.gunGroup) this.camera.remove(this.gunGroup);

        this.gunGroup = new THREE.Group();

        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const gripMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.4), bodyMat);
        this.gunGroup.add(body);

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), bodyMat);
        barrel.rotation.x = -Math.PI/2;
        barrel.position.z = -0.3;
        this.gunGroup.add(barrel);

        const strip1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.3), neonMat);
        strip1.position.y = 0.05;
        this.gunGroup.add(strip1);

        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.1), gripMat);
        grip.position.set(0, -0.1, 0.1);
        grip.rotation.x = 0.5;
        this.gunGroup.add(grip);

        this.gunGroup.position.set(0.2, -0.25, -0.4);
        this.camera.add(this.gunGroup);

        this.muzzleLight = new THREE.PointLight(0x00ffff, 0, 5);
        this.muzzleLight.position.set(0, 0, -0.6);
        this.gunGroup.add(this.muzzleLight);
    }

    setupEnvironment(mode) {
        this.gridHelper = new THREE.GridHelper(400, 100, this.CONFIG.colors.grid, 0x111111);
        this.scene.add(this.gridHelper);

        const planeGeo = new THREE.PlaneGeometry(400, 400);
        const planeMat = new THREE.MeshBasicMaterial({ color: 0x050510, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.1;
        this.scene.add(plane);

        const sunGeo = new THREE.CircleGeometry(40, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: this.CONFIG.colors.sun, fog: false });
        this.retroSun = new THREE.Mesh(sunGeo, sunMat);
        this.retroSun.position.set(0, 20, -100);
        this.scene.add(this.retroSun);

        if (mode === 'deer') {
            for(let i=0; i<40; i++) this.createTree();
            this.scene.background = new THREE.Color(0x001100);
            this.scene.fog.color.setHex(0x001100);
        } else if (mode === 'shark') {
            this.scene.background = new THREE.Color(0x000033);
            this.scene.fog.color.setHex(0x000033);
            this.scene.fog.density = 0.04;
            this.gridHelper.material.color.setHex(0x00aaff);
            this.retroSun.material.color.setHex(0x00aaff);
        } else if (mode === 'safari') {
            this.scene.background = new THREE.Color(0x221100);
            this.scene.fog.color.setHex(0x221100);
            this.gridHelper.material.color.setHex(0xffaa00);
            this.retroSun.material.color.setHex(0xffaa00);
        }
    }

    createTree() {
        const height = 5 + Math.random() * 8;
        const geo = new THREE.ConeGeometry(1.5, height, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const tree = new THREE.Mesh(geo, mat);
        const x = (Math.random() - 0.5) * 120;
        const z = (Math.random() - 0.5) * 120;
        if(Math.abs(x) < 10 && Math.abs(z) < 10) return;
        tree.position.set(x, height/2, z);
        this.scene.add(tree);
        this.environmentObjects.push(tree);
    }

    update(dt) {
        if (!this.isPlaying) {
             this.renderer.render(this.scene, this.camera);
             return;
        }

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.gameOver();
            return;
        }

        // Combo Decay
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.updateHUD();
            }
        }

        // Powerups
        this.timeScale = 1.0;
        for (let key in this.activePowerups) {
            if (this.activePowerups[key] > 0) {
                this.activePowerups[key] -= dt;
                if (key === 'slow') this.timeScale = 0.3;
                if (key === 'rapid') this.ammo = 99;

                if (this.activePowerups[key] <= 0) {
                     if(key === 'rapid') this.ammo = this.CONFIG.maxAmmo;
                     this.updateHUD();
                }
            }
        }
        this.updatePowerupHUD();

        // Spawning
        this.spawnTimer -= dt * this.timeScale;
        if (this.spawnTimer <= 0) {
            this.spawnTarget();
            let rate = 2.0;
            if (this.currentMode === 'safari') rate = 0.8;
            if (this.currentMode === 'shark') rate = 1.0;
            this.spawnTimer = rate;
        }

        this.powerupTimer -= dt;
        if(this.powerupTimer <= -15 && Math.random() < 0.01) {
            this.spawnPowerup();
            this.powerupTimer = 0;
        }

        // Updates
        this.targets.forEach(t => t.update(dt, this.timeScale, this.CONFIG, this.camera));
        // Filter out dead
        for(let i = this.targets.length - 1; i >= 0; i--) {
            if (this.targets[i].isDead) {
                this.targets[i].remove(this.scene);
                this.targets.splice(i, 1);
            }
        }

        this.powerups.forEach(p => p.update(dt));
        for(let i = this.powerups.length - 1; i >= 0; i--) {
            if (this.powerups[i].isDead) {
                 this.powerups[i].remove(this.scene);
                 this.powerups.splice(i, 1);
            }
        }

        this.particles.forEach((p, i) => {
            p.position.add(p.userData.vel.clone().multiplyScalar(dt));
            p.scale.multiplyScalar(0.92);
            if (p.scale.x < 0.01) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        });

        // Visuals
        if (this.gunGroup) {
            this.gunGroup.position.z += ((-0.4) - this.gunGroup.position.z) * 10 * dt;
            this.gunGroup.rotation.x += (0 - this.gunGroup.rotation.x) * 10 * dt;
        }
        if (this.muzzleLight && this.muzzleLight.intensity > 0) {
            this.muzzleLight.intensity -= 20 * dt;
        }
        if (this.gridHelper) {
            this.gridHelper.position.z = (Date.now() * 0.005) % 10;
        }
        if (this.retroSun) {
            this.retroSun.rotation.z += dt * 0.05;
        }

        this.ui.timer.innerText = `TIME: ${Math.ceil(this.timeLeft)}`;
        this.renderer.render(this.scene, this.camera);
    }

    spawnTarget() {
         const t = new Target(this.currentMode, this.CONFIG, this.scene);
         this.targets.push(t);
    }

    spawnPowerup() {
         const p = new PowerUp(this.CONFIG, this.scene);
         this.powerups.push(p);
    }

    onMouseMove(event) {
        if (!this.isPlaying || document.pointerLockElement !== this.container) return;

        const sensitivity = 0.002;
        this.yaw -= event.movementX * sensitivity;
        this.pitch -= event.movementY * sensitivity;
        this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch));

        this.camera.rotation.set(0, 0, 0);
        this.camera.rotateY(this.yaw);
        this.camera.rotateX(this.pitch);
    }

    onMouseDown() {
        if (!this.isPlaying || document.pointerLockElement !== this.container) return;

        if (this.isReloading && (!this.activePowerups['rapid'] || this.activePowerups['rapid'] <= 0)) {
            this.playSound('empty');
            return;
        }

        if (this.ammo > 0) {
            this.shoot();
        } else {
            this.playSound('empty');
            this.ui.reloadMsg.style.display = 'block';
        }
    }

    onKeyDown(event) {
        if (!this.isPlaying) return;
        if (event.key.toLowerCase() === 'r') this.reload();
        // Escape handled globally, but here we can release lock if needed.
        // Actually global handler might close game, so we rely on that for menu.
    }

    shoot() {
        if(!this.activePowerups['rapid'] || this.activePowerups['rapid'] <= 0) {
            this.ammo--;
            this.updateHUD();
        }

        this.playSound('shoot');

        if (this.gunGroup) {
            this.gunGroup.position.z += 0.15;
            this.gunGroup.rotation.x += 0.1;
            this.muzzleLight.intensity = 2;
        }
        this.createMuzzleFlash();

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const shootables = [];
        const map = new Map();

        [...this.targets, ...this.powerups].forEach(obj => {
            obj.mesh.traverse(child => {
                if(child.isMesh) {
                    shootables.push(child);
                    map.set(child.uuid, obj);
                }
            });
        });

        const intersects = this.raycaster.intersectObjects(shootables);
        if (intersects.length > 0) {
            const hitObj = map.get(intersects[0].object.uuid);
            if (hitObj) {
                if(hitObj instanceof Target) {
                     this.onTargetHit(hitObj);
                } else if(hitObj instanceof PowerUp) {
                     this.onPowerupHit(hitObj);
                }
            }
        } else {
            this.combo = 0;
            this.updateHUD();
        }
    }

    onTargetHit(target) {
        target.isDead = true;
        this.createExplosion(target.mesh.position, target.isElite ? this.CONFIG.colors.elite : this.CONFIG.colors.hit);

        let pts = target.points;
        if (this.activePowerups['x2'] > 0) pts *= 2;
        if (this.combo > 1) pts *= (1 + (this.combo * 0.1));

        this.score += pts;
        this.combo++;
        this.comboTimer = 2.5;

        this.showHitText(Math.floor(pts), target.mesh.position, target.isElite);
        this.playSound(target.isElite ? 'powerup' : 'hit');
        this.updateHUD();
        // Removed by loop
    }

    onPowerupHit(powerup) {
        this.activePowerups[powerup.type] = this.CONFIG.powerups[powerup.type].duration;
        if(powerup.type === 'rapid') this.ammo = this.CONFIG.maxAmmo;
        this.createExplosion(powerup.mesh.position, this.CONFIG.powerups[powerup.type].color);
        this.playSound('powerup');
        this.showHitText(this.CONFIG.powerups[powerup.type].label, powerup.mesh.position, true);
        this.updateHUD();
        powerup.isDead = true;
    }

    reload() {
        if (this.isReloading || this.ammo === this.CONFIG.maxAmmo || (this.activePowerups['rapid'] && this.activePowerups['rapid'] > 0)) return;
        this.isReloading = true;
        this.ui.crosshair.classList.add('reloading');
        this.ui.reloadMsg.innerText = "RELOADING...";
        this.ui.reloadMsg.style.display = 'block';
        this.playSound('reload');

        setTimeout(() => {
            this.ammo = this.CONFIG.maxAmmo;
            this.isReloading = false;
            if(this.ui.crosshair) this.ui.crosshair.classList.remove('reloading');
            if(this.ui.reloadMsg) {
                this.ui.reloadMsg.style.display = 'none';
                this.ui.reloadMsg.innerText = "RELOAD! (R)";
            }
            this.updateHUD();
        }, 800);
    }

    createExplosion(pos, colorHex) {
        for (let i = 0; i < 12; i++) {
            const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
            const mat = new THREE.MeshBasicMaterial({ color: colorHex });
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(pos);
            p.userData.vel = new THREE.Vector3((Math.random()-0.5)*8, (Math.random()-0.5)*8, (Math.random()-0.5)*8);
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    createMuzzleFlash() {
        const pos = this.gunGroup.position.clone().add(new THREE.Vector3(0, 0, -1)).applyMatrix4(this.camera.matrixWorld);
        for(let i=0; i<3; i++) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.05), new THREE.MeshBasicMaterial({color: 0x00ffff}));
            p.position.copy(pos);
            p.userData.vel = new THREE.Vector3((Math.random()-0.5)*2, (Math.random()-0.5)*2, -5);
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    showHitText(text, pos, isCrit) {
        const el = document.createElement('div');
        el.className = isCrit ? 'nh-hit-text crit' : 'nh-hit-text';
        el.innerText = typeof text === 'number' ? `+${text}` : text;

        const vector = pos.clone().project(this.camera);
        const x = (vector.x * .5 + .5) * this.container.clientWidth;
        const y = (-(vector.y * .5) + .5) * this.container.clientHeight;

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        this.container.appendChild(el);
        setTimeout(() => el.remove(), 800);
    }

    updateHUD() {
        if(!this.ui.hud) return;
        this.ui.score.innerText = `SCORE: ${Math.floor(this.score).toString().padStart(4, '0')}`;
        const ammoText = (this.activePowerups['rapid'] > 0) ? "INF" : `${this.ammo}/${this.CONFIG.maxAmmo}`;
        this.ui.ammo.innerText = `AMMO: ${ammoText}`;
        this.ui.wave.innerText = `MODE: ${this.currentMode.toUpperCase()}`;
        if(this.ammo === 0) this.ui.reloadMsg.style.display = 'block';

        if(this.combo > 1) {
            this.ui.combo.innerText = `${this.combo}x COMBO`;
            this.ui.combo.style.opacity = 1;
        } else {
            this.ui.combo.style.opacity = 0;
        }
    }

    updatePowerupHUD() {
        if(!this.ui.powerup) return;
        this.ui.powerup.innerHTML = '';
        for (let key in this.activePowerups) {
            if (this.activePowerups[key] > 0) {
                const p = document.createElement('div');
                p.className = 'nh-powerup-active';
                p.style.color = '#' + this.CONFIG.powerups[key].color.toString(16);
                p.innerText = `${this.CONFIG.powerups[key].label}: ${Math.ceil(this.activePowerups[key])}s`;
                this.ui.powerup.appendChild(p);
            }
        }
    }

    playSound(type) {
        // Use SoundManager for cleaner integration
        this.soundManager.playSound(type);
    }

    gameOver() {
        this.isPlaying = false;
        document.exitPointerLock();
        this.ui.hud.classList.add('hidden');
        window.miniGameHub.showGameOver(Math.floor(this.score), {
            onRestart: () => this.startGame(this.currentMode),
            onExit: () => {
                this.ui.mainMenu.style.display = 'flex';
                // Reset scene visuals or leave them? Cleaner to clear.
                while(this.scene.children.length > 0) {
                    this.scene.remove(this.scene.children[0]);
                }
            }
        });
    }

    onResize() {
        if(!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    shutdown() {
        window.removeEventListener('resize', this.boundOnResize);
        window.removeEventListener('mousedown', this.boundOnMouseDown);
        window.removeEventListener('mousemove', this.boundOnMouseMove);
        window.removeEventListener('keydown', this.boundOnKeyDown);

        if (this.renderer) {
            if (this.container.contains(this.renderer.domElement)) {
                this.container.removeChild(this.renderer.domElement);
            }
            this.renderer.dispose();
            if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
            this.renderer = null;
        }

        this.container.innerHTML = '';
        this.scene = null;
        this.camera = null;
    }
}

class Target {
    constructor(mode, config, scene) {
        this.mode = mode;
        this.config = config;
        this.isDead = false;
        this.mesh = new THREE.Group();

        this.isElite = Math.random() < 0.1;
        const colorScale = this.isElite ? config.colors.elite : null;

        if (mode === 'clay') {
            const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 8);
            const mat = new THREE.MeshBasicMaterial({ color: colorScale || config.colors.clay });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI / 2;
            this.mesh.add(mesh);

            const side = Math.random() > 0.5 ? 1 : -1;
            this.mesh.position.set(side * 25, 2, -15 - Math.random() * 10);
            this.velocity = new THREE.Vector3(-side * (12 + Math.random() * 8), 12 + Math.random() * 6, 0);
            this.points = 100;

        } else if (mode === 'duck') {
            const geo = new THREE.ConeGeometry(0.4, 1, 4);
            const mat = new THREE.MeshLambertMaterial({ color: colorScale || config.colors.duck });
            const body = new THREE.Mesh(geo, mat);
            body.rotation.z = -Math.PI / 2;
            this.mesh.add(body);
            const wings = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 1.2), mat);
            this.mesh.add(wings);

            this.mesh.position.set((Math.random()-0.5)*50, 0, -25);
            this.velocity = new THREE.Vector3((Math.random()-0.5)*15, 8 + Math.random()*8, (Math.random()-0.5)*8);
            this.points = 200;

        } else if (mode === 'deer' || mode === 'safari') {
            const color = colorScale || (mode === 'deer' ? config.colors.deer : config.colors.zebra);
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 3), new THREE.MeshLambertMaterial({ color: color }));
            this.mesh.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1), new THREE.MeshLambertMaterial({ color: color }));
            head.position.set(0, 1, 1.5);
            this.mesh.add(head);

            const side = Math.random() > 0.5 ? 1 : -1;
            this.mesh.position.set(side * 50, 1, -10 - Math.random() * 40);
            const speed = (mode === 'safari' ? 30 : 10) * (this.isElite ? 1.5 : 1);
            this.velocity = new THREE.Vector3(-side * speed, 0, 0);
            this.mesh.lookAt(this.mesh.position.clone().add(this.velocity));
            this.points = mode === 'safari' ? 300 : 150;

        } else if (mode === 'shark') {
            const mat = new THREE.MeshBasicMaterial({ color: colorScale || config.colors.shark, wireframe: true });
            const body = new THREE.Mesh(new THREE.ConeGeometry(1, 4, 5), mat);
            body.rotation.x = -Math.PI / 2;
            this.mesh.add(body);

            const angle = Math.random() * Math.PI;
            const radius = 45;
            this.mesh.position.set(Math.cos(angle)*radius, 1+Math.random()*4, -Math.sin(angle)*radius);

            const dir = new THREE.Vector3(0, 1.6, 0).sub(this.mesh.position).normalize();
            this.velocity = dir.multiplyScalar((8 + Math.random() * 5) * (this.isElite ? 1.4 : 1));
            this.mesh.lookAt(0, 1.6, 0);
            this.points = 500;
        }

        if(this.isElite) this.points *= 5;
        scene.add(this.mesh);
    }

    update(dt, timeScale, config, camera) {
        if (this.isDead) return;

        const dts = dt * timeScale;
        this.mesh.position.add(this.velocity.clone().multiplyScalar(dts));

        if (this.mode === 'clay') {
            this.velocity.y -= config.gravity * dts;
            this.mesh.rotation.x += 5 * dts;
        } else if (this.mode === 'duck') {
            this.mesh.rotation.z = Math.sin(Date.now()*0.01) * 0.5;
            if (this.mesh.position.y < 0) this.velocity.y = Math.abs(this.velocity.y);
        }

        // Cleanup
        if (this.mesh.position.y < -10 || Math.abs(this.mesh.position.x) > 70 || this.mesh.position.z > 20) {
            if (this.mode === 'shark' && this.mesh.position.distanceTo(camera.position) < 3) {
                 this.isDead = true;
            }
            this.isDead = true;
        }
    }

    remove(scene) {
        scene.remove(this.mesh);
        this.isDead = true;
    }
}

class PowerUp {
    constructor(config, scene) {
        const types = ['rapid', 'slow', 'x2'];
        this.type = types[Math.floor(Math.random() * types.length)];
        this.config = config.powerups[this.type];
        this.isDead = false;

        const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const mat = new THREE.MeshBasicMaterial({ color: this.config.color, wireframe: true });
        this.mesh = new THREE.Mesh(geo, mat);

        this.mesh.position.set((Math.random()-0.5)*30, 2 + Math.random()*5, -15 - Math.random()*10);
        scene.add(this.mesh);
        this.lifeTime = 8.0;
    }

    update(dt) {
        if(this.isDead) return;
        this.lifeTime -= dt;
        if(this.lifeTime <= 0) {
            this.isDead = true;
        }
        this.mesh.rotation.x += dt;
        this.mesh.rotation.y += dt;
    }

    remove(scene) {
        scene.remove(this.mesh);
        this.isDead = true;
    }
}
