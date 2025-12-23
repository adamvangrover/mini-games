import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';

// --- Procedural Audio (ZzFX) ---
const playSfx = (v,r,f,a,s,rel,c) => {
    // Check for AudioContext availability
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const b = ctx.createBuffer(1, 44100 * rel, 44100);
    const d = b.getChannelData(0);
    for(let i=0; i<44100*rel; i++) {
        let env = i < 44100*a ? i/(44100*a) : 1 - (i-44100*s)/(44100*(rel-s));
        d[i] = Math.sin(f * Math.PI * 2 / 44100 * i + Math.sin(i*c)) * env * v;
    }
    const src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start();
};

const SFX = {
    shoot: [0.1, 0, 900, 0.01, 0.05, 0.1, 0.2],
    hit: [0.4, 0, 80, 0.01, 0.02, 0.4, 0.8],
    dash: [0.3, 0, 1500, 0.01, 0.03, 0.3, -0.5],
    jump: [0.2, 0, 400, 0.05, 0.1, 0.3, 0]
};

// --- Shaders ---
const GridShader = {
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec3 vWorldPos; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float time; varying vec3 vWorldPos; void main() {
        float grid = step(0.98, fract(vWorldPos.x * 0.5)) + step(0.98, fract(vWorldPos.z * 0.5));
        gl_FragColor = vec4(vec3(0.0, 0.8, 1.0) * grid * 0.5 + vec3(0.01, 0.02, 0.05), 1.0);
    }`
};

const GlitchShader = {
    uniforms: { "tDiffuse": { value: null }, "amount": { value: 0.0 }, "time": { value: 0.0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float time; varying vec2 vUv;
        void main() {
            vec2 uv = vUv;
            if(amount > 0.1) {
                uv.x += sin(uv.y * 10.0 + time * 20.0) * 0.01 * amount;
                vec4 r = texture2D(tDiffuse, uv + vec2(amount*0.02, 0.0));
                vec4 g = texture2D(tDiffuse, uv);
                vec4 b = texture2D(tDiffuse, uv - vec2(amount*0.02, 0.0));
                gl_FragColor = vec4(r.r, g.g, b.b, 1.0);
            } else { gl_FragColor = texture2D(tDiffuse, uv); }
        }`
};

// --- Game Engine ---
export default class PrismRealms {
    constructor() {
        this.isRunning = false;
        this.bullets = [];
        this.enemies = [];
        this.score = 0;
        this.hp = 100;
        this.trauma = 0;
        this.clock = null;
        this.composer = null;
        this.playerCapsule = null;
    }

    async init(container) {
        this.container = container;

        // Inject HTML
        this.container.innerHTML = `
            <div id="prism-vignette" class="prism-ui"></div>
            <div id="prism-overlay" class="prism-ui">
                <h1>PRISM REALMS</h1>
                <p style="letter-spacing: 8px; opacity: 0.6;">SHADOWFALL // ADAM_CORE v4.5</p>
                <div style="margin-top: 50px; line-height: 2;">
                    <p>CLICK TO SYNC NEURAL LINK</p>
                    <p><span class="prism-key">W,A,S,D</span> MOVE | <span class="prism-key">SHIFT</span> DASH | <span class="prism-key">SPACE</span> WALL-RUN</p>
                    <p><span class="prism-key">LMB</span> DISCHARGE PULSE</p>
                </div>
            </div>

            <div id="prism-hud" class="prism-ui" style="display: none;">
                <div class="prism-stats-top">
                    <div class="prism-stat-group">
                        <div class="prism-label">Integrity Status</div>
                        <div id="prism-hp-val" class="prism-value">100%</div>
                    </div>
                    <div class="prism-stat-group" style="text-align: right; border-left: none; border-right: 3px solid var(--neon); padding-right: 15px;">
                        <div class="prism-label">Core Fragments</div>
                        <div id="prism-score-val" class="prism-value">0000</div>
                    </div>
                </div>
                <div id="prism-console"></div>
            </div>
            <div id="prism-crosshair" class="prism-ui"></div>
        `;

        // Initialize immediately
        this.initCore();
        this.initPhysics();
        this.initWorld();
        this.initPlayer();
        this.initEnemies();
        this.initParticles();
        this.setupInput();

        this.isRunning = true;
        this.log("ADAM_OS V4.5 LOADED. NEURAL INTERFACE ONLINE.");
    }

    log(msg) {
        const con = document.getElementById('prism-console');
        if(!con) return;
        const div = document.createElement('div');
        div.className = 'prism-log-entry';
        div.innerText = `[${new Date().toLocaleTimeString()}] > ${msg}`;
        con.prepend(div);
        if(con.children.length > 10) con.removeChild(con.lastChild);
    }

    initCore() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000205, 0.015);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.85);
        this.composer.addPass(this.bloom);
        this.glitch = new ShaderPass(GlitchShader);
        this.composer.addPass(this.glitch);

        this.clock = new THREE.Clock();

        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);
    }

    initPhysics() {
        this.worldOctree = new Octree();
    }

    initWorld() {
        const gridMat = new THREE.ShaderMaterial(GridShader);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), gridMat);
        floor.rotation.x = -Math.PI/2;
        this.scene.add(floor);
        this.worldOctree.fromGraphNode(floor);

        for(let i=0; i<30; i++) {
            const h = 10 + Math.random() * 30;
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(8, h, 8), gridMat);
            pillar.position.set(Math.random()*200-100, h/2, Math.random()*200-100);
            this.scene.add(pillar);
            this.worldOctree.fromGraphNode(pillar);
        }
    }

    initPlayer() {
        this.playerCapsule = new Capsule(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 3, 0), 0.6);
        this.playerVelocity = new THREE.Vector3();
        this.playerDirection = new THREE.Vector3();
        this.onFloor = false;
        this.hp = 100;
        this.score = 0;
        this.trauma = 0;
        this.bullets = [];
    }

    initEnemies() {
        this.enemies = [];
        this.spawnTimer = 0;
    }

    initParticles() {
        this.pCount = 1000;
        this.pGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(this.pCount * 3);
        this.pVel = [];
        for(let i=0; i<this.pCount; i++) {
            pos[i*3] = pos[i*3+1] = pos[i*3+2] = 0;
            this.pVel.push(new THREE.Vector3(0, -100, 0));
        }
        this.pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.pSys = new THREE.Points(this.pGeo, new THREE.PointsMaterial({ color: 0x00ffff, size: 0.15, transparent: true, opacity: 0.8 }));
        this.scene.add(this.pSys);
    }

    setupInput() {
        this.keys = {};

        this.keyDownHandler = (e) => this.keys[e.code] = true;
        this.keyUpHandler = (e) => this.keys[e.code] = false;
        this.mouseDownHandler = (e) => {
            if(document.pointerLockElement && e.button === 0) this.shoot();
        };

        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);
        window.addEventListener('mousedown', this.mouseDownHandler);

        const overlay = document.getElementById('prism-overlay');
        if(overlay) {
            overlay.addEventListener('click', () => {
                this.renderer.domElement.requestPointerLock();
                overlay.style.display = 'none';
                const hud = document.getElementById('prism-hud');
                if(hud) hud.style.display = 'flex';
            });
        }

        this.mouseMoveHandler = (e) => {
            if(document.pointerLockElement) {
                this.camera.rotation.y -= e.movementX * 0.002;
                this.camera.rotation.x -= e.movementY * 0.002;
                this.camera.rotation.x = Math.max(-1.5, Math.min(1.5, this.camera.rotation.x));
            }
        };
        document.addEventListener('mousemove', this.mouseMoveHandler);
    }

    shoot() {
        playSfx(...SFX.shoot);
        this.trauma = Math.min(1, this.trauma + 0.15);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
        b.position.copy(this.camera.position);
        const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir);
        b.userData = { vel: dir.multiplyScalar(70), life: 2.0 };
        this.bullets.push(b);
        this.scene.add(b);
    }

    explode(pos, color=0x00ffff) {
        const posAttr = this.pGeo.attributes.position.array;
        for(let i=0; i<50; i++) {
            const idx = Math.floor(Math.random()*this.pCount);
            posAttr[idx*3] = pos.x; posAttr[idx*3+1] = pos.y; posAttr[idx*3+2] = pos.z;
            this.pVel[idx].set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(15);
        }
        this.pGeo.attributes.position.needsUpdate = true;
    }

    spawnEnemy() {
        const e = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), new THREE.MeshPhongMaterial({ color: 0xff0055, wireframe: true }));
        const angle = Math.random() * Math.PI * 2;
        e.position.set(Math.cos(angle)*60, 5 + Math.random()*15, Math.sin(angle)*60);
        e.userData = { hp: 20, vel: new THREE.Vector3(), nextShoot: 2 };
        this.enemies.push(e);
        this.scene.add(e);
        this.log("HOSTILE_SIG_DETECTED: ENGAGING.");
    }

    update(dt) {
        if(!this.isRunning || !this.playerCapsule) return;

        // Movement Logic
        const speed = (this.onFloor ? 45 : 15) * dt;
        const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion); fwd.y = 0; fwd.normalize();
        const side = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0));

        if(this.keys['KeyW']) this.playerVelocity.addScaledVector(fwd, speed);
        if(this.keys['KeyS']) this.playerVelocity.addScaledVector(fwd, -speed);
        if(this.keys['KeyA']) this.playerVelocity.addScaledVector(side, -speed);
        if(this.keys['KeyD']) this.playerVelocity.addScaledVector(side, speed);

        if(this.keys['Space'] && this.onFloor) {
            this.playerVelocity.y = 12;
            this.onFloor = false;
            playSfx(...SFX.jump);
        }

        if(this.keys['ShiftLeft'] && this.trauma < 0.8) {
            const dash = new THREE.Vector3(); this.camera.getWorldDirection(dash);
            this.playerVelocity.addScaledVector(dash, 1.5);
            this.trauma += 0.25;
            playSfx(...SFX.dash);
        }

        this.playerVelocity.y -= 30 * dt;
        this.playerVelocity.multiplyScalar(Math.exp(-4 * dt));
        this.playerCapsule.translate(this.playerVelocity.clone().multiplyScalar(dt));

        const col = this.worldOctree.capsuleIntersect(this.playerCapsule);
        this.onFloor = false;
        if(col) {
            this.onFloor = col.normal.y > 0.5;
            this.playerCapsule.translate(col.normal.multiplyScalar(col.depth));
        }
        this.camera.position.copy(this.playerCapsule.end);

        // Trauma & Shaders
        this.trauma = Math.max(0, this.trauma - dt * 1.2);
        if(this.glitch && this.glitch.uniforms) {
            this.glitch.uniforms.amount.value = this.trauma;
            this.glitch.uniforms.time.value += dt;
        }
        if(this.trauma > 0.1) {
            this.camera.position.x += (Math.random()-0.5) * this.trauma * 0.2;
            this.camera.position.y += (Math.random()-0.5) * this.trauma * 0.2;
        }

        // Bullets
        for(let i=this.bullets.length-1; i>=0; i--) {
            const b = this.bullets[i];
            b.position.addScaledVector(b.userData.vel, dt);
            b.userData.life -= dt;
            this.enemies.forEach(e => {
                if(b.position.distanceTo(e.position) < 1.5) {
                    e.userData.hp -= 10;
                    b.userData.life = 0;
                    this.explode(e.position);
                }
            });
            if(b.userData.life <= 0) { this.scene.remove(b); this.bullets.splice(i,1); }
        }

        // Enemies AI
        this.spawnTimer -= dt;
        if(this.spawnTimer <= 0) { this.spawnEnemy(); this.spawnTimer = 4; }
        for(let i=this.enemies.length-1; i>=0; i--) {
            const e = this.enemies[i];
            const toP = new THREE.Vector3().subVectors(this.camera.position, e.position);
            if(toP.length() > 10) e.position.addScaledVector(toP.normalize(), 5*dt);
            e.rotation.y += dt;
            if(e.userData.hp <= 0) {
                this.explode(e.position, 0xff0055);
                this.scene.remove(e);
                this.enemies.splice(i, 1);
                this.score += 100;
                const scoreEl = document.getElementById('prism-score-val');
                if(scoreEl) scoreEl.innerText = this.score.toString().padStart(4, '0');
                this.log("TARGET_PURGED. FRAGMENT_COLLECTED.");
            }
        }

        // Particles Gravity
        const pPos = this.pGeo.attributes.position.array;
        for(let i=0; i<this.pCount; i++) {
            pPos[i*3] += this.pVel[i].x * dt;
            pPos[i*3+1] += this.pVel[i].y * dt;
            pPos[i*3+2] += this.pVel[i].z * dt;
            this.pVel[i].y -= 9.8 * dt;
        }
        this.pGeo.attributes.position.needsUpdate = true;
    }

    onResize() {
        if(!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth/window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    draw() {
        if(!this.isRunning || !this.composer) return;
        this.composer.render();
    }

    shutdown() {
        this.isRunning = false;

        // Remove Listeners
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
        window.removeEventListener('mousedown', this.mouseDownHandler);
        document.removeEventListener('mousemove', this.mouseMoveHandler);

        // Cleanup Three.js
        if(this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }

        // Unlock Pointer
        if(document.pointerLockElement) {
            document.exitPointerLock();
        }

        this.container.innerHTML = '';
        this.composer = null;
    }
}
