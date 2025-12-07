// Alpine Adventure (Alpine Legend Port)
import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class AlpineGame {
    constructor() {
        this.canvas = null;
        this.engine = null;
        this.saveSystem = SaveSystem.getInstance();
    }

    async init(container) {
        if (typeof THREE === 'undefined') {
            container.innerHTML = `<div class="p-4 text-red-500">Error: Three.js is not loaded.</div>`;
            return;
        }

        // Inject HTML
        container.innerHTML = `
            <div id="alpine-wrapper" class="relative w-full h-full bg-black">
                <canvas id="alpine-canvas" class="w-full h-full block outline-none"></canvas>
                
                <!-- UI Layer -->
                <div id="alpine-ui" class="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
                    <div id="alpine-hud" class="bg-slate-900/60 backdrop-blur rounded-xl p-4 border border-white/10 max-w-[300px] pointer-events-auto transition-opacity duration-300">
                        <div class="flex items-center gap-3 mb-2 text-sm font-bold shadow-black drop-shadow-sm text-white">
                            <span>🏔️ ALTITUDE</span><span id="alp-alt" class="ml-auto text-cyan-300">0m</span>
                        </div>
                        <div class="flex items-center gap-3 mb-2 text-sm font-bold shadow-black drop-shadow-sm text-white">
                            <span>🌡️ WARMTH</span>
                            <div class="ml-auto w-24 h-2 bg-black/50 rounded overflow-hidden">
                                <div id="alp-temp" class="h-full bg-red-500 w-full transition-all duration-300"></div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 mb-2 text-sm font-bold shadow-black drop-shadow-sm text-white">
                            <span>⚡ STAMINA</span>
                            <div class="ml-auto w-24 h-2 bg-black/50 rounded overflow-hidden">
                                <div id="alp-stamina" class="h-full bg-yellow-400 w-full transition-all duration-300"></div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 mb-2 text-sm font-bold shadow-black drop-shadow-sm text-yellow-400 border-t border-white/10 pt-2 mt-2">
                            <span>₣ FRANCS</span><span id="alp-money" class="ml-auto">0</span>
                        </div>
                        <div class="text-xs text-slate-400 font-normal text-center mt-1"><span id="alp-time">08:00</span></div>
                    </div>

                    <div id="alp-notifications" class="absolute top-24 right-4 flex flex-col items-end gap-2 pointer-events-none"></div>

                    <div id="alp-prompt" class="absolute bottom-1/3 left-1/2 -translate-x-1/2 bg-black/80 px-6 py-2 rounded-full font-bold tracking-widest uppercase border border-white/20 opacity-0 transition-opacity duration-200 text-white">
                        PRESS [E]
                    </div>
                    
                    <div class="absolute bottom-4 left-4 text-xs text-slate-500 font-mono hidden md:block">
                        WASD: Move | SPACE: Jump | SHIFT: Run | E: Interact
                    </div>
                </div>

                <!-- Start Screen -->
                <div id="alp-start" class="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center pointer-events-auto">
                    <div class="absolute inset-0 bg-cover bg-center opacity-30" style="background-image: url('https://images.unsplash.com/photo-1518098268026-4e187743363b?auto=format&fit=crop&w=1920&q=80')"></div>
                    <h1 class="text-5xl md:text-7xl font-thin tracking-[0.5em] text-white mb-2 relative drop-shadow-lg text-center uppercase">Alpine</h1>
                    <h2 class="text-xl md:text-2xl text-slate-300 tracking-[0.3em] font-light mb-12 relative drop-shadow uppercase">Legend</h2>
                    <button id="alp-start-btn" class="relative px-12 py-4 bg-white text-slate-900 font-bold tracking-widest rounded-full hover:scale-105 transition-transform shadow-2xl">BEGIN EXPEDITION</button>
                    <button class="back-btn relative mt-8 text-slate-400 hover:text-white transition-colors uppercase tracking-widest text-sm">Return to Hub</button>
                </div>
            </div>
        `;

        this.canvas = container.querySelector('#alpine-canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        // Initialize Engine
        this.game = new GameController(this.canvas, container, this.saveSystem);
        
        container.querySelector('#alp-start-btn').onclick = () => {
            container.querySelector('#alp-start').classList.add('hidden');
            this.game.start();
        };

        window.addEventListener('resize', () => this.game.onResize());
    }

    update(dt) {
        if(this.game) this.game.update(dt);
    }

    draw() {}

    shutdown() {
        if(this.game) this.game.shutdown();
        this.game = null;
    }
}

// --------------------------------------------------------------------------------------
// GAME ENGINE CLASSES (Ported & Adapted)
// --------------------------------------------------------------------------------------

const Utils = {
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    lerp(a, b, t) { return a + (b - a) * t; },
    randRange(min, max) { return Math.random() * (max - min) + min; },
    damp(a, b, lambda, dt) { return Utils.lerp(a, b, 1 - Math.exp(-lambda * dt)); }
};

class GameController {
    constructor(canvas, container, saveSystem) {
        this.canvas = canvas;
        this.container = container;
        this.saveSystem = saveSystem;
        this.started = false;
        this.paused = false;
        this.clock = new THREE.Clock();

        // Three.js Init
        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true});
        this.renderer.setClearColor(0x050510);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.canvas.parentElement.clientWidth, this.canvas.parentElement.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0xa0e0ff, 200, 1200);

        this.camera = new THREE.PerspectiveCamera(60, this.canvas.width / this.canvas.height, 0.1, 2000);
        this.camera.position.set(0, 1.8, 5);

        // Lights
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemi.position.set(0, 200, 0);
        this.scene.add(hemi);

        this.sun = new THREE.DirectionalLight(0xfffdb0, 1.2);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 500;
        const d = 100;
        this.sun.shadow.camera.left = -d;
        this.sun.shadow.camera.right = d;
        this.sun.shadow.camera.top = d;
        this.sun.shadow.camera.bottom = -d;
        this.scene.add(this.sun);
        this.sunOffset = new THREE.Vector3(100, 200, 100);

        // Systems
        this.input = new Input(this.canvas);
        this.world = new World(this.scene);
        this.player = new Player(this.scene, this.world);
        this.world.player = this.player; // link back
        
        if(this.world.animals) this.world.animals.player = this.player;

        this.camCtrl = new CameraController(this.camera, this.player);
        this.ui = new UI(this.container);
        this.inter = new Interactables();

        this.setupInteractions();

        // State Init
        this.state = {
            altitude: 0, temperature: 100, stamina: 100,
            time: 8.0, inventory: []
        };
        
        this.updateMoneyUI();
    }

    start() {
        if(this.started) return;
        this.started = true;
        this.player.position.set(-400, 20, 400); // Start near village
        
        // Request Lock
        this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock;
        this.canvas.requestPointerLock();
    }

    shutdown() {
        this.started = false;
        this.input.unbind();
        if(this.renderer) this.renderer.dispose();
        // Additional cleanup if needed
    }

    onResize() {
        if(!this.camera || !this.renderer) return;
        const p = this.canvas.parentElement;
        this.camera.aspect = p.clientWidth / p.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(p.clientWidth, p.clientHeight);
    }

    setupInteractions() {
        const l = this.world.locations;
        const add = (pos, cb, lbl) => {
            const t = new THREE.Object3D(); t.position.copy(pos);
            this.inter.add(t, 8, () => this.startMG(cb), lbl);
        };
        add(l.chocolateShop, () => new ChocolateGame(m => this.endMG(m)), "MAKE CHOCOLATE");
        add(l.fondueShop, () => new FondueGame(m => this.endMG(m)), "COOK FONDUE");
        add(l.photoSpot, () => new PhotoGame(this.scene, this.camera, this.world.animals, m => this.endMG(m)), "TAKE PHOTO");
    }

    startMG(fn) {
        this.paused = true;
        this.ui.hide();
        document.exitPointerLock();
        fn();
    }

    endMG(msg) {
        this.paused = false;
        this.ui.show();
        if(msg) this.ui.pushNotif(msg);
        this.canvas.requestPointerLock();
        this.updateMoneyUI();
    }

    updateMoneyUI() {
        const el = this.container.querySelector('#alp-money');
        if(el) el.innerText = this.saveSystem.getCurrency();
    }

    update(dt) {
        if(!this.started) return;
        if(this.paused) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        this.input.update();
        this.player.update(dt, this.input, this.state);

        // Time Cycle
        this.state.time += dt * 0.1;
        if(this.state.time >= 24) this.state.time = 0;
        
        // Update Sun
        const t = this.state.time;
        const angle = (t/24) * Math.PI * 2;
        this.sun.position.copy(this.player.position).add(new THREE.Vector3(Math.cos(angle)*100, Math.sin(angle)*100, 50));
        this.sun.target.position.copy(this.player.position);
        this.sun.target.updateMatrixWorld();

        // Sky Color
        let col;
        if(t > 6 && t < 18) { col = new THREE.Color(0x87ceeb); this.sun.intensity = 1.5; }
        else if(t > 5 && t < 19) { col = new THREE.Color(0xffa500); this.sun.intensity = 0.5; }
        else { col = new THREE.Color(0x050510); this.sun.intensity = 0.0; }
        this.scene.background = col;
        this.scene.fog.color.lerp(col, 0.1);

        this.world.update(dt, t);
        this.camCtrl.update(dt, this.input);
        this.inter.check(this.player, this.input, this.ui);
        this.ui.update(dt, this.state);

        this.renderer.render(this.scene, this.camera);
    }
}

// --------------------------------------------------------------------------------------
// SYSTEMS
// --------------------------------------------------------------------------------------

class Input {
    constructor(target) {
        this.forward = false; this.backward = false;
        this.left = false; this.right = false;
        this.shift = false; this.interact = false;
        this.jump = false;
        this.cameraYaw = 0; this.cameraPitch = 0;
        this.mouseLocked = false;
        this.recentInteractPress = false;
        this.recentJumpPress = false;

        this._onKey = (e) => this.onKey(e, e.type === 'keydown');
        this._onMove = (e) => this.onMove(e);
        this._onLock = () => this.mouseLocked = (document.pointerLockElement === target);
        
        window.addEventListener('keydown', this._onKey);
        window.addEventListener('keyup', this._onKey);
        window.addEventListener('mousemove', this._onMove);
        document.addEventListener('pointerlockchange', this._onLock);
    }

    unbind() {
        window.removeEventListener('keydown', this._onKey);
        window.removeEventListener('keyup', this._onKey);
        window.removeEventListener('mousemove', this._onMove);
        document.removeEventListener('pointerlockchange', this._onLock);
    }

    onKey(e, down) {
        const c = e.code;
        if(c==="KeyW"||c==="ArrowUp") this.forward = down;
        if(c==="KeyS"||c==="ArrowDown") this.backward = down;
        if(c==="KeyA"||c==="ArrowLeft") this.left = down;
        if(c==="KeyD"||c==="ArrowRight") this.right = down;
        if(c==="ShiftLeft") this.shift = down;
        if(c==="Space" && down) this.recentJumpPress = true;
        if(c==="KeyE" && down) this.recentInteractPress = true;
    }

    onMove(e) {
        if(!this.mouseLocked) return;
        this.cameraYaw -= e.movementX * 0.002;
        this.cameraPitch -= e.movementY * 0.002;
        this.cameraPitch = Utils.clamp(this.cameraPitch, -1.0, 1.0);
    }

    update() {
        this.interact = this.recentInteractPress;
        this.recentInteractPress = false;
        this.jump = this.recentJumpPress;
        this.recentJumpPress = false;
    }
}

class UI {
    constructor(container) {
        this.container = container;
        this.elAlt = container.querySelector('#alp-alt');
        this.elTemp = container.querySelector('#alp-temp');
        this.elStam = container.querySelector('#alp-stamina');
        this.elTime = container.querySelector('#alp-time');
        this.elNotif = container.querySelector('#alp-notifications');
        this.elPrompt = container.querySelector('#alp-prompt');
    }

    show() { this.container.querySelector('#alpine-hud').style.opacity = 1; }
    hide() { this.container.querySelector('#alpine-hud').style.opacity = 0; }

    update(dt, state) {
        if(this.elAlt) this.elAlt.innerText = Math.round(state.altitude) + "m";
        if(this.elTemp) {
            this.elTemp.style.width = state.temperature + "%";
            this.elTemp.style.backgroundColor = state.temperature < 30 ? "#38bdf8" : "#ef4444";
        }
        if(this.elStam) this.elStam.style.width = state.stamina + "%";
        if(this.elTime) {
            const h = Math.floor(state.time);
            const m = Math.floor((state.time % 1) * 60);
            this.elTime.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
        }
    }

    pushNotif(text) {
        const div = document.createElement("div");
        div.className = "bg-black/80 text-white px-4 py-2 rounded border-l-4 border-cyan-400 text-sm font-bold shadow-lg animate-[slideIn_0.3s_ease-out]";
        div.innerText = text;
        this.elNotif.appendChild(div);
        setTimeout(() => {
            div.style.opacity = 0;
            div.style.transform = "translateX(50px)";
            div.style.transition = "all 0.5s";
            setTimeout(() => div.remove(), 500);
        }, 3000);
    }

    showPrompt(text) {
        this.elPrompt.innerText = text;
        this.elPrompt.style.opacity = 1;
    }
    
    hidePrompt() {
        this.elPrompt.style.opacity = 0;
    }
}

class Interactables {
    constructor() { this.items = []; }
    add(mesh, radius, callback, label="INTERACT") { this.items.push({mesh, radius, callback, label}); }
    check(player, input, ui) {
        let active = null;
        for(const i of this.items) {
            const dx = player.position.x - i.mesh.position.x;
            const dz = player.position.z - i.mesh.position.z;
            if(Math.sqrt(dx*dx + dz*dz) < i.radius) { active=i; break; }
        }
        if(active) {
            ui.showPrompt(`[E] ${active.label}`);
            if(input.interact) active.callback();
        } else {
            ui.hidePrompt();
        }
    }
}

class CameraController {
    constructor(camera, player) {
        this.camera = camera;
        this.player = player;
        this.distance = 7;
        this.height = 3.5;
    }
    update(dt, input) {
        const target = this.player.position.clone();
        target.y += 1.5;
        const offX = Math.sin(input.cameraYaw) * this.distance;
        const offZ = Math.cos(input.cameraYaw) * this.distance;
        const des = target.clone().add(new THREE.Vector3(offX, -input.cameraPitch * 5 + this.height, offZ));
        
        this.camera.position.lerp(des, 1.0 - Math.pow(0.001, dt));
        this.camera.lookAt(target);
    }
}

// --------------------------------------------------------------------------------------
// WORLD & PLAYER
// --------------------------------------------------------------------------------------

class Player {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.position = new THREE.Vector3(0, 5, 0);
        this.velocity = new THREE.Vector3();
        this.speed = 8;
        this.gravity = -40;
        this.onGround = false;
        this.radius = 0.5;

        this.mesh = this.createAvatar();
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
    }

    createAvatar() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), new THREE.MeshStandardMaterial({color: 0xd946ef}));
        body.position.y = 0.85; body.castShadow = true;
        g.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({color: 0xffdbac}));
        head.position.y = 1.4; head.castShadow = true;
        g.add(head);
        return g;
    }

    update(dt, input, state) {
        const dir = new THREE.Vector3();
        if(input.forward) dir.z -= 1; if(input.backward) dir.z += 1;
        if(input.left) dir.x -= 1; if(input.right) dir.x += 1;
        
        const run = input.shift && state.stamina > 1;
        const spd = run ? this.speed * 1.8 : this.speed;

        if(dir.length() > 0.1) {
            dir.applyAxisAngle(new THREE.Vector3(0,1,0), input.cameraYaw);
            if(dir.length() > 1) dir.normalize();
            const angle = Math.atan2(dir.x, dir.z);
            this.mesh.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), angle), 0.15);
        }

        const lambda = 10.0;
        this.velocity.x = Utils.damp(this.velocity.x, dir.x * spd, lambda, dt);
        this.velocity.z = Utils.damp(this.velocity.z, dir.z * spd, lambda, dt);

        if(!this.onGround) this.velocity.y += this.gravity * dt;
        if(this.onGround && input.jump) {
            this.velocity.y = 15;
            this.onGround = false;
            // sound
        }

        // Apply Movement
        const proposed = this.position.clone().addScaledVector(this.velocity, dt);
        this.checkCollision(proposed);
        
        this.position.x = proposed.x;
        this.position.z = proposed.z;
        this.position.y += this.velocity.y * dt;

        // Ground Clamp
        const gy = this.world.getHeightAt(this.position.x, this.position.z);
        if(this.position.y <= gy) {
            this.position.y = gy;
            this.velocity.y = 0;
            this.onGround = true;
        } else if(this.position.y < gy + 0.5 && this.velocity.y <= 0) {
            this.position.y = gy;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Stats
        if(run && dir.length() > 0.1) state.stamina = Utils.clamp(state.stamina - dt * 15, 0, 100);
        else state.stamina = Utils.clamp(state.stamina + dt * 10, 0, 100);

        state.altitude = this.position.y;
        state.temperature = Utils.damp(state.temperature, Utils.clamp(100 - (this.position.y * 0.2), 0, 100), 1.0, dt);

        this.mesh.position.copy(this.position);
    }

    checkCollision(pos) {
        for(const o of this.world.obstacles) {
            const dx = pos.x - o.pos.x;
            const dz = pos.z - o.pos.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            const min = o.radius + this.radius;
            if(dist < min) {
                const ang = Math.atan2(dz, dx);
                pos.x = o.pos.x + Math.cos(ang) * min;
                pos.z = o.pos.z + Math.sin(ang) * min;
            }
        }
    }
}

class World {
    constructor(scene) {
        this.scene = scene;
        this.simplex = new SimplexNoise();
        this.locations = {
            chocolateShop: new THREE.Vector3(-380,0,380),
            fondueShop: new THREE.Vector3(-420,0,420),
            photoSpot: new THREE.Vector3(0,0,200)
        };
        this.obstacles = [];
        this.initTerrain();
        this.initVillage();
        this.animals = new Animals(scene, this.getHeightAt.bind(this));
        
        // Lake
        const lake = new THREE.Mesh(new THREE.PlaneGeometry(240,240), new THREE.MeshStandardMaterial({color:0x3db7ff, transparent:true, opacity:0.8}));
        lake.rotation.x = -Math.PI/2; lake.position.set(50, 2, 50);
        scene.add(lake);
    }

    getHeightAt(x, z) {
        const base = this.simplex.noise2D(x*0.002, z*0.002)*60 + this.simplex.noise2D(x*0.005, z*0.005)*20;
        const dist = Math.sqrt(x*x+z*z);
        const peak = Math.max(0, 900-dist*1.2);
        let r = 0;
        if(peak > 0) {
            const ang = Math.atan2(z,x);
            r = peak * Math.abs(Math.cos(ang*3)) * 0.5;
        }
        let y = base + peak + r;
        if(x > -100 && x < 200 && z > -100 && z < 200) {
            const ld = Math.sqrt((x-50)**2 + (z-50)**2);
            if(ld < 120) y -= 30;
        }
        return y;
    }

    initTerrain() {
        const s = 2000, seg = 100;
        const geo = new THREE.PlaneGeometry(s, s, seg, seg);
        geo.rotateX(-Math.PI/2);
        const pos = geo.attributes.position;
        const col = [];
        const cObj = new THREE.Color();
        for(let i=0; i<pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            const y = this.getHeightAt(x, z);
            pos.setY(i, y);
            if(y < 5) cObj.setHex(0x8B4513);
            else if(y < 80) cObj.setHex(0x228B22);
            else if(y < 250) cObj.setHex(0x708090);
            else cObj.setHex(0xffffff);
            col.push(cObj.r, cObj.g, cObj.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({vertexColors: true, flatShading: true});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
    }

    initVillage() {
        // Snap locations to ground
        Object.values(this.locations).forEach(l => l.y = this.getHeightAt(l.x, l.z));
        
        this.createBuilding(this.locations.chocolateShop, 0x8B4513);
        this.createBuilding(this.locations.fondueShop, 0xE67E22);
        
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,2), new THREE.MeshBasicMaterial({color:0xffff00}));
        m.position.copy(this.locations.photoSpot); m.position.y += 1;
        this.scene.add(m);
    }

    createBuilding(pos, color) {
        const g = new THREE.Group();
        const b = new THREE.Mesh(new THREE.BoxGeometry(10,8,10), new THREE.MeshStandardMaterial({color})); b.position.y=4; b.castShadow=true;
        const r = new THREE.Mesh(new THREE.ConeGeometry(8,6,4), new THREE.MeshStandardMaterial({color:0x800000})); r.position.y=11; r.rotation.y=Math.PI/4;
        g.add(b); g.add(r); g.position.copy(pos);
        this.scene.add(g);
        this.obstacles.push({pos: pos.clone(), radius: 7});
    }

    update(dt, time) {
        if(this.animals) this.animals.update(dt);
    }
}

class Animals {
    constructor(scene, heightFunc) {
        this.scene = scene; this.heightFunc = heightFunc; this.ibexList = [];
        for(let i=0; i<8; i++) this.spawn();
    }
    spawn() {
        const g = new THREE.Group();
        const b = new THREE.Mesh(new THREE.BoxGeometry(1,0.8,1.5), new THREE.MeshStandardMaterial({color:0xDAA520}));
        g.add(b);
        const x = (Math.random()-0.5)*600, z = (Math.random()-0.5)*600;
        const y = this.heightFunc(x,z);
        g.position.set(x,y+1,z); g.castShadow=true;
        this.scene.add(g);
        this.ibexList.push({mesh:g, dir:Math.random()*6, speed:2, timer:0});
    }
    update(dt) {
        for(const b of this.ibexList) {
            b.mesh.position.x += Math.sin(b.dir)*b.speed*dt;
            b.mesh.position.z += Math.cos(b.dir)*b.speed*dt;
            const h = this.heightFunc(b.mesh.position.x, b.mesh.position.z);
            b.mesh.position.y = h + 0.5;
            b.mesh.rotation.y = b.dir;
            b.timer += dt;
            if(b.timer > 3) { b.dir += (Math.random()-0.5); b.timer = 0; }
        }
    }
}

// --------------------------------------------------------------------------------------
// MINIGAMES
// --------------------------------------------------------------------------------------

class ChocolateGame {
    constructor(onFinish) {
        this.onFinish = onFinish;
        this.root = document.createElement("div");
        this.root.className = "fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] text-white";
        this.root.innerHTML = `<h2 class="text-3xl mb-4">🍫 Chocolatier</h2><p class="mb-4">Press SPACE when bar is GREEN!</p>`;
        this.cvs = document.createElement("canvas");
        this.cvs.width = 300; this.cvs.height = 60;
        this.cvs.className = "border-2 border-white rounded";
        this.root.appendChild(this.cvs);
        document.body.appendChild(this.root);
        
        this.ctx = this.cvs.getContext("2d");
        this.x = 0; this.spd = 5; this.dir = 1; this.tx = 125; this.tw = 50;
        this.active = true;
        
        this.hdl = (e) => { if(e.code==="Space") this.win(); };
        window.addEventListener("keydown", this.hdl);
        this.loop();
    }
    loop() {
        if(!this.active) return;
        requestAnimationFrame(() => this.loop());
        this.x += this.spd * this.dir;
        if(this.x > 300 || this.x < 0) this.dir *= -1;
        
        this.ctx.fillStyle = "#222"; this.ctx.fillRect(0,0,300,60);
        this.ctx.fillStyle = "#2ecc71"; this.ctx.fillRect(this.tx,0,this.tw,60);
        this.ctx.fillStyle = "#fff"; this.ctx.fillRect(this.x,0,10,60);
    }
    win() {
        this.active = false;
        window.removeEventListener("keydown", this.hdl);
        this.root.remove();
        if(this.x >= this.tx && this.x <= this.tx+this.tw) {
            SaveSystem.getInstance().addCurrency(50);
            this.onFinish("Perfect! +₣50");
        } else {
            this.onFinish("Missed!");
        }
    }
}

class FondueGame {
    constructor(onFinish) {
        this.onFinish = onFinish;
        this.root = document.createElement("div");
        this.root.className = "fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] text-white";
        this.root.innerHTML = `<h2 class="text-3xl mb-4">🧀 Fondue</h2><p class="mb-4">Tap SPACE to heat!</p>`;
        this.cvs = document.createElement("canvas");
        this.cvs.width = 100; this.cvs.height = 300;
        this.cvs.className = "border-2 border-white rounded";
        this.root.appendChild(this.cvs);
        document.body.appendChild(this.root);
        
        this.ctx = this.cvs.getContext("2d");
        this.heat = 20; this.active = true; this.time = 0;
        
        this.hdl = (e) => { if(e.code==="Space") this.heat += 8; };
        window.addEventListener("keydown", this.hdl);
        this.loop();
    }
    loop() {
        if(!this.active) return;
        requestAnimationFrame(() => this.loop());
        this.heat -= 0.5;
        this.heat = Math.max(0, Math.min(100, this.heat));
        this.time++;
        
        this.ctx.clearRect(0,0,100,300);
        this.ctx.fillStyle = "#333"; this.ctx.fillRect(0,0,100,300);
        this.ctx.fillStyle = "#e67e22"; this.ctx.fillRect(0,100,100,100);
        const h = (this.heat/100)*300;
        this.ctx.fillStyle = this.heat > 80 ? "#e74c3c" : (this.heat < 20 ? "#3498db" : "#f1c40f");
        this.ctx.fillRect(5, 300-h, 90, h);
        
        if(this.time > 400) {
            this.active = false;
            window.removeEventListener("keydown", this.hdl);
            this.root.remove();
            if(this.heat > 30 && this.heat < 70) {
                SaveSystem.getInstance().addCurrency(75);
                this.onFinish("Delicious! +₣75");
            } else {
                this.onFinish("Bad Temp!");
            }
        }
    }
}

class PhotoGame {
    constructor(scene, camera, animals, onFinish) {
        this.scene = scene; this.camera = camera; this.animals = animals; this.onFinish = onFinish;
        this.root = document.createElement("div");
        this.root.className = "fixed inset-0 z-[100] pointer-events-none border-[50px] border-black border-b-[100px]";
        this.root.innerHTML = `<div class="absolute bottom-[-80px] w-full text-center text-white"><button id="snap" class="pointer-events-auto bg-red-600 px-6 py-2 rounded-full font-bold">SNAP</button></div>`;
        document.body.appendChild(this.root);
        
        this.hdl = () => {
            const frustum = new THREE.Frustum();
            const m = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
            frustum.setFromProjectionMatrix(m);
            let cap = 0;
            if(this.animals && this.animals.ibexList) {
                for(const i of this.animals.ibexList) {
                    if(frustum.containsPoint(i.mesh.position) && this.camera.position.distanceTo(i.mesh.position) < 50) cap++;
                }
            }
            this.root.remove();
            if(cap > 0) {
                SaveSystem.getInstance().addCurrency(cap * 20);
                this.onFinish(`Captured ${cap} Ibex! +₣${cap*20}`);
            } else {
                this.onFinish("No animals.");
            }
        };
        document.getElementById('snap').onclick = this.hdl;
    }
}
