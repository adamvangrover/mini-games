import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export default class Lumina {
    constructor() {
        this.CONFIG = {
            maxHP: 100,
            maxEnergy: 100,
            energyRegen: 0.8,
            shotCost: 10,
            moveSpeed: 0.22,
            jumpForce: 0.35,
            gravity: 0.015,
            dashForce: 1.5,
            dashCooldown: 600,
            totalShards: 8,
            enemySpawnRate: 200,
            enemyDamage: 10
        };

        this.state = {
            hp: this.CONFIG.maxHP,
            energy: this.CONFIG.maxEnergy,
            shards: 0,
            abilities: { doubleJump: true, dash: true, combat: true }, // Unlocked by default for fun
            velocity: new THREE.Vector3(),
            jumps: 0,
            lastDash: 0,
            keys: {},
            isDead: false,
            threatLevel: 0,
            score: 0
        };

        this.entities = {
            projectiles: [],
            enemies: [],
            shards: [],
            platforms: [],
            particles: [],
            pickups: []
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.weapon = null;
        this.loopId = null;
        this.container = null;

        // Touch state
        this.touchState = {
            leftStick: { active: false, origin: {x:0, y:0}, current: {x:0, y:0}, id: null },
            rightLook: { active: false, last: {x:0, y:0}, id: null }
        };
    }

    async init(container) {
        this.container = container;

        if (typeof THREE === 'undefined') {
            this.container.innerHTML = '<div style="color:white; text-align:center; padding-top:20px;">Error: Three.js not found</div>';
            return;
        }

        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.overflow = 'hidden';
        container.style.background = '#000000';
        container.style.cursor = 'none';

        // Inject UI
        this.injectUI();

        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020205);
        this.scene.fog = new THREE.FogExp2(0x020205, 0.012);

        this.camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.player = new THREE.Group();
        this.player.position.set(0, 10, 0);
        this.scene.add(this.player);
        this.player.add(this.camera);

        // Weapon
        this.createWeapon();

        // Lighting
        this.scene.add(new THREE.AmbientLight(0x404060, 0.6));
        const sun = new THREE.DirectionalLight(0x00ffff, 0.6);
        sun.position.set(30, 100, -30);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.far = 200;
        this.scene.add(sun);

        const pointLight = new THREE.PointLight(0x00f2ff, 0.5, 15);
        this.player.add(pointLight);

        // Skybox
        this.createSkybox();

        // World Generation
        this.createWorld();

        // Event Listeners
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handlePointerLock = this.handlePointerLock.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('resize', this.handleResize);

        this.renderer.domElement.addEventListener('click', this.handlePointerLock);
        this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart, {passive: false});
        this.renderer.domElement.addEventListener('touchmove', this.handleTouchMove, {passive: false});
        this.renderer.domElement.addEventListener('touchend', this.handleTouchEnd, {passive: false});

        if('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this.setupMobileUI();
        }

        this.notify("LUMINA PROTOCOL", "Purify the Glitch. Restore the Light.");

        this.animate = this.animate.bind(this);
        this.loopId = requestAnimationFrame(this.animate);
    }

    createWeapon() {
        this.weapon = new THREE.Group();
        this.weapon.position.set(0.3, -0.3, -0.5);
        this.weapon.rotation.y = -0.1;

        // Gun body
        const bodyGeo = new THREE.BoxGeometry(0.1, 0.1, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.weapon.add(body);

        // Barrel glow
        const glowGeo = new THREE.BoxGeometry(0.02, 0.08, 0.38);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(0, 0.05, 0);
        this.weapon.add(glow);

        // Floating bits
        const bitGeo = new THREE.BoxGeometry(0.02, 0.05, 0.1);
        const bit1 = new THREE.Mesh(bitGeo, glowMat);
        bit1.position.set(0.08, 0, 0);
        this.weapon.add(bit1);

        const bit2 = new THREE.Mesh(bitGeo, glowMat);
        bit2.position.set(-0.08, 0, 0);
        this.weapon.add(bit2);

        this.camera.add(this.weapon);
    }

    createSkybox() {
        const geo = new THREE.IcosahedronGeometry(400, 2);
        const mat = new THREE.MeshBasicMaterial({ color: 0x001133, wireframe: true, transparent: true, opacity: 0.1 });
        this.skybox = new THREE.Mesh(geo, mat);
        this.scene.add(this.skybox);

        // Stars
        const starsGeo = new THREE.BufferGeometry();
        const starsCount = 1000;
        const posArray = new Float32Array(starsCount * 3);
        for(let i=0; i<starsCount*3; i++) posArray[i] = (Math.random()-0.5)*800;
        starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const starsMat = new THREE.PointsMaterial({color: 0xffffff, size: 2});
        this.stars = new THREE.Points(starsGeo, starsMat);
        this.scene.add(this.stars);
    }

    generateTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        if (type === 'grid') {
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, 512, 512);
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f2ff';

            // Hexagon Grid
            const drawHex = (x, y, r) => {
                ctx.beginPath();
                for(let i=0; i<6; i++) {
                    const angle = Math.PI/3 * i;
                    ctx.lineTo(x + r*Math.cos(angle), y + r*Math.sin(angle));
                }
                ctx.closePath();
                ctx.stroke();
            };

            for(let y=0; y<600; y+=80) {
                for(let x=0; x<600; x+=80) {
                    drawHex(x, y, 35);
                    drawHex(x + 40, y + 40, 35);
                }
            }
        } else if (type === 'platform') {
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, 512, 512);
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 8;
            ctx.strokeRect(0, 0, 512, 512);
            ctx.fillStyle = '#220011';
            ctx.fillRect(20, 20, 472, 472);

            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(256, 256, 50, 0, Math.PI*2);
            ctx.fill();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    injectUI() {
        const uiHTML = `
            <div id="lumina-ui" class="absolute inset-0 pointer-events-none z-50 transition-all duration-300 font-mono">
                <!-- Glitch Overlay -->
                <div id="glitch-overlay" class="absolute inset-0 bg-red-500 mix-blend-overlay opacity-0 pointer-events-none transition-opacity duration-100"></div>

                <!-- Top Bar -->
                <div class="absolute top-0 left-0 w-full p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
                    <div class="text-cyan-400">
                        <div class="text-xs uppercase tracking-widest opacity-70">Protocol</div>
                        <div class="text-2xl font-bold tracking-tighter">LUMINA</div>
                    </div>

                    <div class="flex flex-col items-center">
                        <div class="text-white/50 text-xs tracking-[0.5em] mb-1">SHARD COMPASS</div>
                        <div class="w-64 h-1 bg-white/20 relative overflow-hidden rounded-full">
                            <div id="compass-marker" class="absolute top-0 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_cyan]" style="left: 50%; transform: translateX(-50%);"></div>
                        </div>
                    </div>

                    <div class="text-right text-purple-400">
                        <div class="text-xs uppercase tracking-widest opacity-70">Corruption</div>
                        <div id="score-text" class="text-2xl font-bold">0%</div>
                    </div>
                </div>

                <!-- Stats (Left) -->
                <div class="absolute bottom-8 left-8 w-64 hidden md:block">
                     <div class="mb-2 flex justify-between text-cyan-300 text-xs font-bold uppercase tracking-wider"><span>Integrity</span> <span id="hp-val">100%</span></div>
                     <div class="h-2 bg-slate-800 rounded-full overflow-hidden mb-4 border border-slate-700">
                        <div id="hp-bar" class="h-full bg-cyan-400 shadow-[0_0_10px_cyan] transition-all duration-300" style="width: 100%"></div>
                     </div>

                     <div class="mb-2 flex justify-between text-yellow-300 text-xs font-bold uppercase tracking-wider"><span>Energy</span> <span id="en-val">100%</span></div>
                     <div class="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div id="en-bar" class="h-full bg-yellow-400 shadow-[0_0_10px_yellow] transition-all duration-300" style="width: 100%"></div>
                     </div>
                </div>

                <!-- Mobile Stats -->
                <div class="absolute top-20 left-4 md:hidden flex flex-col gap-2">
                    <div class="bg-black/50 backdrop-blur px-2 py-1 rounded border border-cyan-500/30 text-cyan-400 text-xs font-bold">HP <span id="hp-mob">100</span></div>
                    <div class="bg-black/50 backdrop-blur px-2 py-1 rounded border border-yellow-500/30 text-yellow-400 text-xs font-bold">EN <span id="en-mob">100</span></div>
                </div>

                <!-- Ability Icons (Right) -->
                <div class="absolute bottom-8 right-8 flex gap-4 items-end hidden md:flex">
                    <div class="flex flex-col items-center gap-1 opacity-50"><div class="w-10 h-10 border border-white/30 rounded flex items-center justify-center text-white bg-white/5">⇧</div><span class="text-[10px] text-white/50">JUMP</span></div>
                    <div class="flex flex-col items-center gap-1 opacity-50"><div class="w-10 h-10 border border-white/30 rounded flex items-center justify-center text-white bg-white/5">⚡</div><span class="text-[10px] text-white/50">DASH</span></div>
                    <div class="flex flex-col items-center gap-1 opacity-50"><div class="w-10 h-10 border border-white/30 rounded flex items-center justify-center text-white bg-white/5">⚔</div><span class="text-[10px] text-white/50">FIRE</span></div>
                </div>

                <!-- Crosshair -->
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div class="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_cyan]"></div>
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-white/20 rounded-full"></div>
                </div>

                <!-- Notifications -->
                <div id="notification" class="absolute top-1/3 left-1/2 -translate-x-1/2 text-center opacity-0 transition-all duration-500 scale-90">
                    <h1 id="notify-title" class="text-3xl text-white font-bold tracking-widest uppercase drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]"></h1>
                    <p id="notify-sub" class="text-cyan-200 text-sm mt-1 tracking-[0.5em] uppercase"></p>
                </div>

                <!-- Back Button -->
                <button id="lumina-exit" class="absolute top-20 left-4 z-50 text-white/50 hover:text-white border border-white/20 px-3 py-1 rounded text-xs uppercase tracking-widest pointer-events-auto transition-colors md:block hidden">
                    <i class="fas fa-sign-out-alt"></i> Abort
                </button>
                 <button id="lumina-exit-mob" class="absolute top-4 right-4 z-50 text-white hover:text-red-400 w-8 h-8 flex items-center justify-center bg-black/40 backdrop-blur rounded-full border border-white/20 pointer-events-auto md:hidden block">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const uiContainer = document.createElement('div');
        uiContainer.innerHTML = uiHTML;
        this.container.appendChild(uiContainer);

        const handleBack = (e) => {
            e.stopPropagation();
            document.exitPointerLock();
            window.miniGameHub.goBack();
        };
        document.getElementById('lumina-exit').addEventListener('click', handleBack);
        document.getElementById('lumina-exit-mob').addEventListener('click', handleBack);
    }

    setupMobileUI() {
        const ui = document.getElementById('lumina-ui');

        // Joystick
        const stickBase = document.createElement('div');
        stickBase.id = 'stick-base';
        stickBase.className = 'pointer-events-auto absolute bottom-8 left-8 w-32 h-32 rounded-full border border-white/10 bg-white/5 backdrop-blur';
        const stickKnob = document.createElement('div');
        stickKnob.id = 'stick-knob';
        stickKnob.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-cyan-500/50 shadow-[0_0_15px_cyan] border border-white/30';
        stickBase.appendChild(stickKnob);
        ui.appendChild(stickBase);

        // Buttons
        const btns = document.createElement('div');
        btns.className = 'absolute bottom-8 right-8 flex gap-4 pointer-events-auto';

        const makeBtn = (icon, color, cb) => {
            const b = document.createElement('div');
            b.className = `w-16 h-16 rounded-full border border-white/10 bg-black/40 backdrop-blur flex items-center justify-center text-${color}-400 text-xl active:bg-${color}-500/30 active:scale-95 transition-all`;
            b.innerHTML = `<i class="fas ${icon}"></i>`;
            b.addEventListener('touchstart', (e) => { e.preventDefault(); cb(true); });
            b.addEventListener('touchend', (e) => { e.preventDefault(); cb(false); });
            return b;
        };

        btns.appendChild(makeBtn('fa-arrow-up', 'cyan', (p) => {
            if(p) { this.state.keys['Space'] = true; this.handleKeyDown({code:'Space'}); }
            else this.state.keys['Space'] = false;
        }));
        btns.appendChild(makeBtn('fa-forward', 'yellow', (p) => {
             if(p && !this.state.keys['ShiftLeft']) { this.state.keys['ShiftLeft'] = true; this.handleKeyDown({code:'ShiftLeft'}); }
             else if(!p) this.state.keys['ShiftLeft'] = false;
        }));
        btns.appendChild(makeBtn('fa-crosshairs', 'red', (p) => { if(p) this.fireProjectile(); }));

        ui.appendChild(btns);
    }

    handleTouchStart(e) {
        for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if(t.clientX < window.innerWidth / 2) {
                if(!this.touchState.leftStick.active) {
                    this.touchState.leftStick.active = true;
                    this.touchState.leftStick.id = t.identifier;
                    this.touchState.leftStick.origin = {x: t.clientX, y: t.clientY};
                    this.touchState.leftStick.current = {x: t.clientX, y: t.clientY};
                    const base = document.getElementById('stick-base');
                    if(base) {
                        base.style.left = (t.clientX - 64) + 'px';
                        base.style.bottom = (window.innerHeight - t.clientY - 64) + 'px';
                    }
                }
            } else {
                if(!this.touchState.rightLook.active) {
                    this.touchState.rightLook.active = true;
                    this.touchState.rightLook.id = t.identifier;
                    this.touchState.rightLook.last = {x: t.clientX, y: t.clientY};
                }
            }
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if(t.identifier === this.touchState.leftStick.id) {
                this.touchState.leftStick.current = {x: t.clientX, y: t.clientY};
                const dx = t.clientX - this.touchState.leftStick.origin.x;
                const dy = t.clientY - this.touchState.leftStick.origin.y;
                const knob = document.getElementById('stick-knob');
                if(knob) {
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const limit = 40;
                    const angle = Math.atan2(dy, dx);
                    const rx = dist > limit ? Math.cos(angle) * limit : dx;
                    const ry = dist > limit ? Math.sin(angle) * limit : dy;
                    knob.style.transform = `translate(calc(-50% + ${rx}px), calc(-50% + ${ry}px))`;
                }
            } else if (t.identifier === this.touchState.rightLook.id) {
                const dx = t.clientX - this.touchState.rightLook.last.x;
                const dy = t.clientY - this.touchState.rightLook.last.y;
                this.player.rotation.y -= dx * 0.005;
                this.camera.rotation.x = Math.max(-1.5, Math.min(1.5, this.camera.rotation.x - dy * 0.005));
                this.touchState.rightLook.last = {x: t.clientX, y: t.clientY};
            }
        }
    }

    handleTouchEnd(e) {
         for(let i=0; i<e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if(t.identifier === this.touchState.leftStick.id) {
                this.touchState.leftStick.active = false;
                const knob = document.getElementById('stick-knob');
                if(knob) knob.style.transform = `translate(-50%, -50%)`;
            } else if (t.identifier === this.touchState.rightLook.id) {
                this.touchState.rightLook.active = false;
            }
         }
    }

    createPlatform(x, y, z, w, d, type='platform') {
        const geo = new THREE.BoxGeometry(w, 2, d);
        let mat;
        if(type === 'floor') {
             mat = new THREE.MeshStandardMaterial({
                color: 0x050510, roughness: 0.1, metalness: 0.5,
                map: this.generateTexture('grid'),
                emissive: 0x001122, emissiveIntensity: 0.2
            });
             mat.map.repeat.set(w/20, d/20);
        } else {
             mat = new THREE.MeshStandardMaterial({
                color: 0x222222, roughness: 0.3, metalness: 0.7,
                map: this.generateTexture('platform')
            });
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.entities.platforms.push(mesh);

        // Neon Edges
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: type==='floor'?0x004488:0xff0055, transparent: true, opacity: 0.8 }));
        mesh.add(line);

        return mesh;
    }

    createWorld() {
        this.createPlatform(0, -1, 0, 300, 300, 'floor');

        // Central Hub
        this.createPlatform(0, 5, 0, 20, 20);

        // Altar
        this.altar = new THREE.Group();
        this.altar.position.set(0, 8, 0);
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2), new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x0088ff, wireframe: true }));
        this.altar.add(core);
        // Rings
        for(let i=0; i<3; i++) {
             const r = new THREE.Mesh(new THREE.TorusGeometry(3+i, 0.05, 16, 100), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 }));
             r.rotation.x = Math.random() * Math.PI;
             this.altar.add(r);
        }
        // Beam
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 500, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        beam.position.y = 250;
        this.altar.add(beam);
        this.scene.add(this.altar);

        // Parkour
        for(let i=0; i<40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 100;
            const h = 10 + Math.random() * 50;
            const w = 5 + Math.random() * 10;
            this.createPlatform(Math.cos(angle)*dist, h, Math.sin(angle)*dist, w, w);
        }

        // Shards
        for(let i=0; i<this.CONFIG.totalShards; i++) {
            const angle = (i / this.CONFIG.totalShards) * Math.PI * 2;
            const dist = 80;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const y = 30 + Math.random()*20;

            this.createPlatform(x, y-3, z, 8, 8); // Platform under shard

            const group = new THREE.Group();
            group.position.set(x, y, z);

            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1), new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0xff00ff, shininess: 100 }));
            group.add(crystal);
            group.add(new THREE.PointLight(0xff00ff, 1, 10));

            // Beacon
            const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 100, 8), new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending }));
            beacon.position.y = 50;
            group.add(beacon);

            this.scene.add(group);
            this.entities.shards.push(group);
        }
    }

    spawnParticles(pos, count, color, speed) {
        for(let i=0; i<count; i++) {
            const vel = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(Math.random()*speed);
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 0.2),
                new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 })
            );
            mesh.position.copy(pos);
            mesh.rotation.set(Math.random()*3, Math.random()*3, Math.random()*3);
            this.scene.add(mesh);
            this.entities.particles.push({ mesh, velocity: vel, lifetime: 40 + Math.random()*20, age: 0 });
        }
    }

    spawnEnemy(type='drone') {
        if(this.entities.enemies.length > 15) return;

        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 80;
        const x = this.player.position.x + Math.cos(angle) * dist;
        const z = this.player.position.z + Math.sin(angle) * dist;

        const enemy = new THREE.Group();
        enemy.position.set(x, 20, z);

        let hp = 3;
        let speed = 0.1;

        if (type === 'drone') {
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
            enemy.add(body);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            eye.position.z = 0.6;
            enemy.add(eye);
            const rings = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 4, 16), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            rings.rotation.x = Math.PI/2;
            enemy.add(rings);
            enemy.userData = { type: 'drone', eye, rings };
            hp = 3;
        } else {
            // Walker (Floating Pyramid)
            const body = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2, 4), new THREE.MeshStandardMaterial({ color: 0x330000, roughness: 0.5 }));
            body.rotation.x = Math.PI; // Point down
            enemy.add(body);
            const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0xff5500 }));
            enemy.add(core);
            enemy.userData = { type: 'walker', core };
            hp = 5;
            speed = 0.15;
        }

        this.scene.add(enemy);
        this.entities.enemies.push({
            mesh: enemy,
            hp,
            type,
            speed,
            state: 'patrol',
            patrolPoint: new THREE.Vector3(x, 20, z)
        });

        this.spawnParticles(enemy.position, 10, 0xff0000, 0.5);
    }

    fireProjectile() {
        if(this.state.energy < this.CONFIG.shotCost) return;
        this.state.energy -= this.CONFIG.shotCost;
        this.updateHUD();

        // Recoil
        this.weapon.position.z += 0.2;

        const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
        mesh.position.copy(this.player.position);

        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion()));
        // Offset origin slightly
        mesh.position.add(dir.clone().multiplyScalar(1));

        this.entities.projectiles.push({ mesh, velocity: dir.multiplyScalar(2.5), lifetime: 80 });
        this.scene.add(mesh);

        // Muzzle flash
        this.spawnParticles(mesh.position, 3, 0x00ffff, 0.2);
    }

    takeDamage(amount) {
        this.state.hp = Math.max(0, this.state.hp - amount);
        this.updateHUD();

        const overlay = document.getElementById('glitch-overlay');
        if(overlay) {
            overlay.style.opacity = 1;
            setTimeout(() => overlay.style.opacity = 0, 200);
        }

        // Camera shake
        this.camera.position.x += (Math.random()-0.5);
        this.camera.position.y += (Math.random()-0.5);

        if(this.state.hp <= 0) {
            this.notify("CRITICAL FAILURE", "Rebooting...");
            setTimeout(() => this.respawn(), 2000);
        }
    }

    respawn() {
        this.state.hp = this.CONFIG.maxHP;
        this.state.energy = this.CONFIG.maxEnergy;
        this.player.position.set(0, 15, 0);
        this.state.velocity.set(0,0,0);
        this.updateHUD();
    }

    notify(title, sub) {
        const el = document.getElementById('notification');
        if(el) {
            document.getElementById('notify-title').innerText = title;
            document.getElementById('notify-sub').innerText = sub;
            el.style.opacity = 1; el.style.transform = 'translate(-50%, -50%) scale(1)';
            setTimeout(() => { el.style.opacity = 0; el.style.transform = 'translate(-50%, -50%) scale(0.9)'; }, 4000);
        }
    }

    handleKeyDown(e) {
        this.state.keys[e.code] = true;
        if(e.code === 'Space') {
            const max = this.state.abilities.doubleJump ? 2 : 1;
            if(this.state.jumps < max) {
                this.state.velocity.y = this.CONFIG.jumpForce;
                this.state.jumps++;
            }
        }
        if(e.code === 'ShiftLeft' && this.state.abilities.dash && Date.now() - this.state.lastDash > this.CONFIG.dashCooldown) {
            const dir = new THREE.Vector3(0,0,-1).applyQuaternion(this.player.quaternion).normalize();
            this.state.velocity.add(dir.multiplyScalar(this.CONFIG.dashForce));
            this.state.lastDash = Date.now();
            this.camera.fov = 100; this.camera.updateProjectionMatrix();
            setTimeout(() => { this.camera.fov = 85; this.camera.updateProjectionMatrix(); }, 200);
        }
    }
    handleKeyUp(e) { this.state.keys[e.code] = false; }
    handleMouseDown(e) { if(document.pointerLockElement && e.button === 0) this.fireProjectile(); }
    handlePointerLock() { if(!('ontouchstart' in window)) this.renderer.domElement.requestPointerLock(); }
    handleMouseMove(e) {
        if(document.pointerLockElement) {
            this.player.rotation.y -= e.movementX * 0.002;
            this.camera.rotation.x = Math.max(-1.5, Math.min(1.5, this.camera.rotation.x - e.movementY * 0.002));
        }
    }
    handleResize() {
        this.camera.aspect = window.innerWidth/window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }

    updateHUD() {
        const setW = (id, pct) => { const el = document.getElementById(id); if(el) el.style.width = pct + '%'; };
        const setT = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };

        setW('hp-bar', (this.state.hp/this.CONFIG.maxHP)*100);
        setW('en-bar', (this.state.energy/this.CONFIG.maxEnergy)*100);
        setT('hp-val', Math.ceil(this.state.hp) + '%');
        setT('en-val', Math.floor(this.state.energy) + '%');
        setT('hp-mob', Math.ceil(this.state.hp));
        setT('en-mob', Math.floor(this.state.energy));
        setT('score-text', this.state.score * 100);

        // Compass
        if(this.entities.shards.length > 0) {
            let nearest = null, minDist = Infinity;
            this.entities.shards.forEach(s => {
                const d = this.player.position.distanceTo(s.position);
                if(d < minDist) { minDist = d; nearest = s; }
            });
            if(nearest) {
                const dir = nearest.position.clone().sub(this.player.position).normalize();
                const camDir = new THREE.Vector3(0,0,-1).applyQuaternion(this.player.quaternion);
                const angle = Math.atan2(dir.x, dir.z) - Math.atan2(camDir.x, camDir.z);
                let deg = angle * (180/Math.PI);
                while(deg > 180) deg -= 360; while(deg < -180) deg += 360;
                let pct = 50 + (deg/90)*50;
                pct = Math.max(0, Math.min(100, pct));
                const m = document.getElementById('compass-marker');
                if(m) m.style.left = pct + '%';
            }
        }
    }

    animate() {
        this.loopId = requestAnimationFrame(this.animate);
        const time = Date.now() * 0.001;

        // Weapon Anim
        if(this.weapon) {
            this.weapon.position.z += (-0.5 - this.weapon.position.z) * 0.1;
            this.weapon.position.y = -0.3 + Math.sin(time*2)*0.01;
        }

        // Player Move
        if(this.state.hp > 0) {
            const input = new THREE.Vector3();
            if(this.state.keys['KeyW']) input.z -= 1; if(this.state.keys['KeyS']) input.z += 1;
            if(this.state.keys['KeyA']) input.x -= 1; if(this.state.keys['KeyD']) input.x += 1;

            // Touch Stick
            if(this.touchState.leftStick.active) {
                const dx = (this.touchState.leftStick.current.x - this.touchState.leftStick.origin.x) / 40;
                const dy = (this.touchState.leftStick.current.y - this.touchState.leftStick.origin.y) / 40;
                if(Math.sqrt(dx*dx+dy*dy) > 0.1) { input.x += dx; input.z += dy; }
            }

            input.normalize().applyQuaternion(this.player.quaternion);
            this.state.velocity.add(input.multiplyScalar(0.04)); // Acceleration
            this.state.velocity.x *= 0.85; this.state.velocity.z *= 0.85;
            this.state.velocity.y -= this.CONFIG.gravity;
            this.player.position.add(this.state.velocity);

            // Ground Check
            let onGround = false;
            this.entities.platforms.forEach(p => {
                const box = new THREE.Box3().setFromObject(p);
                // Simple top collision
                if(this.player.position.x > box.min.x && this.player.position.x < box.max.x &&
                   this.player.position.z > box.min.z && this.player.position.z < box.max.z) {
                       if(Math.abs(this.player.position.y - (box.max.y + 1.5)) < 0.5 && this.state.velocity.y <= 0) {
                           onGround = true;
                           this.player.position.y = box.max.y + 1.5;
                           this.state.velocity.y = 0;
                           this.state.jumps = 0;
                       }
                   }
            });
            if(this.player.position.y < -20) this.takeDamage(20);
        }

        // Projectiles
        for(let i=this.entities.projectiles.length-1; i>=0; i--) {
            const p = this.entities.projectiles[i];
            p.mesh.position.add(p.velocity);
            p.mesh.rotation.z += 0.2;
            p.lifetime--;
            let hit = false;

            this.entities.enemies.forEach(e => {
                if(!hit && p.mesh.position.distanceTo(e.mesh.position) < 2) {
                    hit = true; e.hp--;
                    this.spawnParticles(p.mesh.position, 10, 0x00ffff, 0.4);
                    // Flash
                    e.mesh.children.forEach(c => { if(c.material && c.material.emissive) c.material.emissive.setHex(0xffffff); });
                    setTimeout(() => e.mesh.children.forEach(c => { if(c.material && c.material.emissive) c.material.emissive.setHex(0x000000); }), 50);

                    if(e.hp <= 0) {
                        this.spawnParticles(e.mesh.position, 30, 0xff0000, 0.8);
                        this.scene.remove(e.mesh);
                        this.entities.enemies.splice(this.entities.enemies.indexOf(e), 1);
                        this.state.score += 100;
                        this.notify("THREAT NEUTRALIZED", "+100 SCORE");
                    }
                }
            });

            if(p.lifetime <= 0 || hit) {
                this.scene.remove(p.mesh);
                this.entities.projectiles.splice(i, 1);
            }
        }

        // Enemies
        const frame = Math.floor(time * 60);
        this.entities.enemies.forEach(e => {
            const dist = this.player.position.distanceTo(e.mesh.position);

            if(e.userData.type === 'drone') {
                e.userData.rings.rotation.z += 0.2;
                e.userData.rings.rotation.x = Math.sin(time);
            } else {
                e.userData.core.rotation.y += 0.1;
                e.mesh.position.y += Math.sin(time*5)*0.03; // Bob
            }

            // AI
            if(dist < 40) e.state = 'chase'; else e.state = 'patrol';

            const dir = new THREE.Vector3();
            if(e.state === 'chase') {
                dir.subVectors(this.player.position, e.mesh.position).normalize().multiplyScalar(e.speed);
                e.mesh.lookAt(this.player.position);
            } else {
                dir.subVectors(e.patrolPoint, e.mesh.position);
                if(dir.length() < 1) e.patrolPoint.set(e.mesh.position.x + (Math.random()-0.5)*40, 20, e.mesh.position.z + (Math.random()-0.5)*40);
                dir.normalize().multiplyScalar(e.speed * 0.5);
            }
            e.mesh.position.add(dir);

            if(dist < 2.5 && this.state.hp > 0) {
                this.takeDamage(this.CONFIG.enemyDamage);
                e.mesh.position.sub(dir.multiplyScalar(30)); // Bounce
            }
        });

        if(frame % this.CONFIG.enemySpawnRate === 0) {
            this.spawnEnemy(Math.random() > 0.7 ? 'walker' : 'drone');
        }

        // Shards
        this.entities.shards.forEach((s, i) => {
            s.rotation.y += 0.02;
            s.position.y += Math.sin(time)*0.05;
            if(this.player.position.distanceTo(s.position) < 3.5) {
                this.scene.remove(s);
                this.entities.shards.splice(i, 1);
                this.collectShard();
            }
        });

        // Particles
        for(let i=this.entities.particles.length-1; i>=0; i--) {
            const p = this.entities.particles[i];
            p.age++;
            p.mesh.position.add(p.velocity);
            p.mesh.scale.multiplyScalar(0.95);
            if(p.age > p.lifetime) {
                this.scene.remove(p.mesh);
                this.entities.particles.splice(i, 1);
            }
        }

        if(this.state.energy < this.CONFIG.maxEnergy) this.state.energy += this.CONFIG.energyRegen;
        this.updateHUD();
        this.renderer.render(this.scene, this.camera);
    }

    collectShard() {
        this.state.shards++;
        this.notify("SHARD ACQUIRED", `${this.state.shards}/${this.CONFIG.totalShards} COLLECTED`);
        this.state.hp = this.CONFIG.maxHP;
        this.state.score += 500;
        this.spawnParticles(this.player.position, 40, 0xff00ff, 1);

        if(this.state.shards === this.CONFIG.totalShards) {
            setTimeout(() => {
                document.exitPointerLock();
                window.miniGameHub.showGameOver(this.state.score, () => this.respawn());
            }, 2000);
        }
    }

    shutdown() {
        if(this.loopId) cancelAnimationFrame(this.loopId);
        // Events removal...
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('resize', this.handleResize);
        if(this.renderer && this.renderer.domElement) {
             const c = this.renderer.domElement;
             c.removeEventListener('click', this.handlePointerLock);
             c.removeEventListener('touchstart', this.handleTouchStart);
             c.removeEventListener('touchmove', this.handleTouchMove);
             c.removeEventListener('touchend', this.handleTouchEnd);
        }
        document.exitPointerLock();
        // Three.js cleanup
        if(this.scene) this.scene.clear();
        if(this.renderer) this.renderer.dispose();
        if(this.container) this.container.innerHTML = '';
    }
}
