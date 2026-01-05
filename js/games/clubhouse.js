
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import SaveSystem from '../core/SaveSystem.js';
import LLMService from '../core/LLMService.js';
import Store from '../core/Store.js';

export default class Clubhouse {
    constructor() {
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.saveSystem = SaveSystem.getInstance();

        this.objects = []; // Interactive furniture
        this.npcs = []; // NPC entities
        this.selectedObject = null;
        this.isDragging = false;
        this.dragPlane = null;

        this.mode = 'view'; // 'view', 'edit'
        this.isActive = false;

        // Vibe & Economy
        this.vibeScore = 0;
        this.incomeRate = 0;
        this.pendingIncome = 0;
        this.lastIncomeTime = 0;

        // Configuration (Loaded from Store/SaveSystem)
        this.propertyType = 'studio'; // studio, penthouse, moon
        this.wallStyle = 'concrete';
        this.floorStyle = 'wood';

        this.boundOnResize = this.onResize.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnMouseUp = this.onMouseUp.bind(this);
        this.boundOnKeyDown = this.onKeyDown.bind(this);
    }

    async init(container) {
        this.container = container;
        this.isActive = true;

        // Load Configuration
        this.propertyType = this.saveSystem.getEquippedItem('property') || 'studio';
        this.wallStyle = this.saveSystem.getEquippedItem('wallpaper') || 'concrete';
        this.floorStyle = this.saveSystem.getEquippedItem('flooring') || 'wood';

        // Init Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111122);
        this.scene.fog = new THREE.FogExp2(0x111122, 0.02);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 8);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();

        // Room Geometry based on Property
        this.createRoom();

        // Controls
        if (typeof OrbitControls !== 'undefined') {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
            this.controls.minDistance = 2;
            this.controls.maxDistance = 20;
        }

        // Drag Plane
        const planeGeo = new THREE.PlaneGeometry(100, 100);
        const planeMat = new THREE.MeshBasicMaterial({ visible: false });
        this.dragPlane = new THREE.Mesh(planeGeo, planeMat);
        this.dragPlane.rotation.x = -Math.PI / 2;
        this.scene.add(this.dragPlane);

        // Load Furniture
        this.loadFurniture();
        this.recalculateVibe();

        // NPCs
        this.spawnNPCs();

        // UI Overlay
        this.createUI();

        // Income Loop
        this.lastIncomeTime = Date.now();

        // Event Listeners
        window.addEventListener('resize', this.boundOnResize);
        this.renderer.domElement.addEventListener('mousemove', this.boundOnMouseMove);
        this.renderer.domElement.addEventListener('mousedown', this.boundOnMouseDown);
        window.addEventListener('mouseup', this.boundOnMouseUp);
        window.addEventListener('keydown', this.boundOnKeyDown);

        console.log("Clubhouse Initialized. Property:", this.propertyType);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xff00ff, 0.8);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Dynamic colored lights based on property
        if (this.propertyType === 'moon') {
            this.scene.background = new THREE.Color(0x000000);
            this.scene.fog = new THREE.FogExp2(0x000000, 0.01);
            const blueLight = new THREE.PointLight(0x00aaff, 0.5);
            blueLight.position.set(0, 5, 0);
            this.scene.add(blueLight);
        } else if (this.propertyType === 'penthouse') {
            const warmLight = new THREE.PointLight(0xffaa00, 0.5);
            warmLight.position.set(0, 8, 0);
            this.scene.add(warmLight);
        }
    }

    createRoom() {
        // Materials based on style
        let floorColor = 0x222222;
        if (this.floorStyle === 'wood') floorColor = 0x5c4033;
        if (this.floorStyle === 'glass') floorColor = 0xaaddff;
        if (this.floorStyle === 'grid') floorColor = 0x000000;

        let wallColor = 0x333344;
        if (this.wallStyle === 'brick') wallColor = 0x552222;
        if (this.wallStyle === 'hex') wallColor = 0x111122;

        const floorMat = new THREE.MeshStandardMaterial({
            color: floorColor,
            roughness: 0.8,
            metalness: this.floorStyle === 'glass' ? 0.9 : 0.2,
            transparent: this.floorStyle === 'glass',
            opacity: this.floorStyle === 'glass' ? 0.6 : 1.0
        });

        const wallMat = new THREE.MeshStandardMaterial({
            color: wallColor,
            side: THREE.DoubleSide,
            emissive: this.wallStyle === 'hex' ? 0x000033 : 0x000000
        });

        // Geometry based on Property Type
        let width = 16, depth = 16, height = 6;

        if (this.propertyType === 'penthouse') {
            width = 24; depth = 20; height = 8;
        } else if (this.propertyType === 'moon') {
            width = 30; depth = 30; height = 10; // Large dome logic later?
        }

        // Floor
        const floorGeo = new THREE.PlaneGeometry(width, depth);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid (Only for some styles)
        if (this.floorStyle === 'grid' || this.propertyType === 'studio') {
            const grid = new THREE.GridHelper(width, width, 0xff00ff, 0x333333);
            grid.position.y = 0.01;
            this.scene.add(grid);
        }

        // Walls logic
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
        backWall.position.set(0, height/2, -depth/2);
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-width/2, height/2, 0);
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        // Window / View
        if (this.propertyType === 'penthouse' || this.propertyType === 'studio') {
             // City View Plane
            const cityPlane = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({color: 0x000011}));
            cityPlane.position.set(0, 5, -depth/2 - 5);
            this.scene.add(cityPlane);

             // Random lights
            for(let i=0; i<30; i++) {
                 const light = new THREE.Mesh(new THREE.BoxGeometry(0.5, Math.random()*5, 0.5), new THREE.MeshBasicMaterial({color: Math.random() * 0xffffff}));
                 light.position.set((Math.random()-0.5)*40, Math.random()*10, -depth/2 - 4);
                 this.scene.add(light);
            }
        }

        if (this.propertyType === 'moon') {
            // Earth in sky
            const earth = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshStandardMaterial({color: 0x2233ff, emissive: 0x112244}));
            earth.position.set(10, 15, -20);
            this.scene.add(earth);
        }
    }

    createUI() {
        const ui = document.createElement('div');
        ui.id = 'clubhouse-ui';
        ui.className = 'absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-4';
        ui.innerHTML = `
            <div class="flex justify-between items-start pointer-events-auto w-full z-10">
                <div class="flex flex-col gap-2">
                    <div class="glass-panel p-4 rounded-lg bg-black/60 backdrop-blur border border-fuchsia-500/30">
                        <h1 class="text-2xl font-bold text-fuchsia-400 text-shadow-neon">My Clubhouse</h1>
                        <p class="text-xs text-slate-300 uppercase tracking-widest">${this.propertyType.replace('_', ' ')}</p>
                    </div>

                    <div class="glass-panel p-3 rounded-lg bg-black/60 border border-yellow-500/30">
                        <div class="flex items-center gap-3 mb-1">
                            <i class="fas fa-star text-yellow-400 text-xl animate-pulse"></i>
                            <div>
                                <div class="text-xs text-slate-400">VIBE SCORE</div>
                                <div class="text-xl font-bold text-white" id="vibe-score-display">0</div>
                            </div>
                        </div>
                        <div class="text-xs text-green-400">+<span id="income-rate-display">0</span> coins/sec</div>
                    </div>
                </div>

                <div class="flex gap-4">
                     <button id="collect-income-btn" class="glass-panel px-6 py-4 rounded-full font-bold text-white bg-green-600 hover:bg-green-500 transition-all shadow-lg shadow-green-500/50 hidden animate-bounce">
                        <i class="fas fa-coins"></i> Collect <span id="pending-income-amt">0</span>
                    </button>
                    <button id="clubhouse-back-btn" class="glass-panel px-6 py-2 rounded-full font-bold text-white hover:bg-white/10 transition-colors border border-slate-600 h-10">
                        <i class="fas fa-arrow-left"></i> Exit
                    </button>
                </div>
            </div>

            <!-- NPC Chatter Overlay -->
            <div id="npc-chat-container" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none"></div>

            <div id="edit-controls" class="pointer-events-auto glass-panel p-4 rounded-lg self-center mb-8 bg-slate-900/90 border border-cyan-500/50 hidden flex flex-col gap-4 z-20 w-full max-w-2xl">
                <div class="flex gap-4 items-center justify-between border-b border-slate-700 pb-2">
                    <span class="text-cyan-400 font-bold uppercase tracking-wider">Editor</span>
                    <div class="flex gap-2">
                        <button id="save-layout-btn" class="bg-green-600 hover:bg-green-500 text-white px-3 py-1 text-sm rounded"><i class="fas fa-save"></i> Save</button>
                        <button id="clear-room-btn" class="bg-red-600 hover:bg-red-500 text-white px-3 py-1 text-sm rounded"><i class="fas fa-trash"></i> Clear</button>
                    </div>
                </div>

                <div class="flex gap-2 mb-2">
                    <button class="tab-btn active px-3 py-1 rounded bg-slate-700 text-white text-xs" data-cat="furniture">Furniture</button>
                    <!-- Future: Add tabs for other categories if we implement in-game buying or swapping -->
                </div>

                <div id="furniture-inventory" class="flex gap-2 overflow-x-auto p-2 bg-black/50 rounded inner-shadow h-24 items-center">
                    <!-- Populated via JS -->
                </div>

                <div class="text-xs text-slate-400 text-center mt-1">
                    [E] Toggle Edit | [Click] Move | [R] Rotate | [DEL] Delete
                </div>
            </div>

            <div id="edit-toggle-hint" class="absolute bottom-8 right-8 pointer-events-auto">
                 <button id="toggle-edit-btn" class="glass-panel w-16 h-16 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40 flex items-center justify-center text-2xl transition-transform hover:scale-110">
                    <i class="fas fa-pen"></i>
                 </button>
            </div>
        `;
        this.container.appendChild(ui);

        // Bindings
        document.getElementById('clubhouse-back-btn').addEventListener('click', () => {
             // Save passive income state before leaving?
             this.saveLayout();
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        document.getElementById('toggle-edit-btn').addEventListener('click', () => this.toggleEditMode());
        document.getElementById('save-layout-btn').addEventListener('click', () => {
            this.saveLayout();
            if (window.miniGameHub) window.miniGameHub.showToast("Layout Saved!");
        });
        document.getElementById('clear-room-btn').addEventListener('click', () => {
            if(confirm("Clear room?")) {
                this.objects.forEach(obj => this.scene.remove(obj));
                this.objects = [];
                this.recalculateVibe();
                this.saveLayout();
            }
        });

        document.getElementById('collect-income-btn').addEventListener('click', () => {
            if (this.pendingIncome > 0) {
                this.saveSystem.addCurrency(Math.floor(this.pendingIncome));
                if (window.miniGameHub) window.miniGameHub.showToast(`Collected ${Math.floor(this.pendingIncome)} Coins!`);
                this.pendingIncome = 0;
                this.updateIncomeUI();
                // Visual effect?
            }
        });

        this.populateInventory();
    }

    populateInventory() {
        const inv = document.getElementById('furniture-inventory');
        if(!inv) return;
        inv.innerHTML = '';

        // Define furniture (should match Store.js IDs ideally)
        const furnitureDb = [
            { id: 'furniture_couch', name: 'Couch', icon: 'fa-couch', vibe: 10 },
            { id: 'furniture_table', name: 'Table', icon: 'fa-table', vibe: 5 },
            { id: 'furniture_lamp', name: 'Lamp', icon: 'fa-lightbulb', vibe: 5 },
            { id: 'furniture_plant', name: 'Plant', icon: 'fa-seedling', vibe: 8 },
            { id: 'furniture_arcade', name: 'Arcade', icon: 'fa-gamepad', vibe: 20 },
            { id: 'furniture_rug', name: 'Rug', icon: 'fa-dharmachakra', vibe: 5 },
            { id: 'furniture_bed_neon', name: 'Neon Bed', icon: 'fa-bed', vibe: 20 },
            { id: 'furniture_server', name: 'Server', icon: 'fa-server', vibe: 25 },
            { id: 'furniture_art_glitch', name: 'Art', icon: 'fa-image', vibe: 15 },
            { id: 'furniture_jukebox', name: 'Jukebox', icon: 'fa-music', vibe: 30 },
        ];

        let hasItems = false;
        furnitureDb.forEach(item => {
            if (this.saveSystem.isItemUnlocked(item.id)) {
                hasItems = true;
                const btn = document.createElement('button');
                btn.className = 'flex flex-col items-center justify-center min-w-[5rem] h-20 bg-slate-700 hover:bg-fuchsia-600 rounded text-white transition-colors border border-slate-600 relative group';
                btn.innerHTML = `
                    <i class="fas ${item.icon} text-2xl mb-1"></i>
                    <span class="text-[10px]">${item.name}</span>
                    <span class="absolute top-1 right-1 text-[8px] bg-yellow-500 text-black px-1 rounded-full font-bold">+${item.vibe}</span>
                `;
                btn.onclick = () => this.spawnObject(item.id, null, 0, item.vibe);
                inv.appendChild(btn);
            }
        });

        if (!hasItems) {
            inv.innerHTML = '<p class="text-slate-500 text-xs w-full text-center">Visit Store to buy furniture!</p>';
        }
    }

    spawnObject(itemId, position = null, rotation = 0, vibe = 0) {
        let mesh;

        // Procedural Generation (Expanded)
        if (itemId === 'furniture_couch') {
            const group = new THREE.Group();
            const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
            const back = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.2), new THREE.MeshStandardMaterial({ color: 0xcc00cc }));
            base.position.y = 0.25;
            back.position.set(0, 0.75, -0.4);
            group.add(base, back);
            mesh = group;
        } else if (itemId === 'furniture_table') {
            const geo = new THREE.CylinderGeometry(1, 1, 0.8, 8);
            const mat = new THREE.MeshStandardMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 0.4;
        } else if (itemId === 'furniture_bed_neon') {
             const group = new THREE.Group();
             const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 2.5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
             mattress.position.y = 0.25;
             const frame = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 2.7), new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x004400 }));
             frame.position.y = 0.05;
             group.add(frame, mattress);
             mesh = group;
        } else if (itemId === 'furniture_server') {
             const geo = new THREE.BoxGeometry(0.8, 2, 0.8);
             const mat = new THREE.MeshStandardMaterial({ color: 0x111111 });
             mesh = new THREE.Mesh(geo, mat);
             mesh.position.y = 1;
             // Blinking lights
             for(let i=0; i<4; i++) {
                 const light = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.1), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
                 light.position.set(0, 1.5 - (i*0.3), 0.41);
                 mesh.add(light);
             }
        } else if (itemId === 'furniture_art_glitch') {
             const geo = new THREE.BoxGeometry(2, 1.5, 0.1);
             const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Placeholder for texture
             mesh = new THREE.Mesh(geo, mat);
             mesh.position.y = 1.5;
        } else if (itemId === 'furniture_jukebox') {
             const geo = new THREE.BoxGeometry(1, 1.8, 1);
             const mat = new THREE.MeshStandardMaterial({ color: 0x5500aa });
             mesh = new THREE.Mesh(geo, mat);
             mesh.position.y = 0.9;
             // Add a visualizer bar
             const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
             bar.position.set(0, 1.2, 0.51);
             mesh.add(bar);
        } else if (itemId === 'furniture_lamp') {
            const group = new THREE.Group();
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
            pole.position.y = 1;
            const shade = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.5, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00, side: THREE.DoubleSide }));
            shade.position.y = 2;
            group.add(pole, shade);
            const light = new THREE.PointLight(0xffaa00, 1, 5);
            light.position.y = 1.8;
            group.add(light);
            mesh = group;
        } else if (itemId === 'furniture_plant') {
            const group = new THREE.Group();
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x884400 }));
            pot.position.y = 0.2;
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1), new THREE.MeshStandardMaterial({ color: 0x00aa00 }));
            stem.position.y = 0.7;
            const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
            leaf.position.y = 1.2;
            group.add(pot, stem, leaf);
            mesh = group;
        } else if (itemId === 'furniture_rug') {
            const geo = new THREE.CircleGeometry(1.5, 32);
            const mat = new THREE.MeshStandardMaterial({ color: 0xff0055 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.y = 0.02;
        } else if (itemId === 'furniture_arcade') {
            const group = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
            body.position.y = 0.9;
            const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
            screen.position.set(0, 1.4, 0.41);
            group.add(body, screen);
            mesh = group;
        } else {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 0.5;
        }

        mesh.userData.itemId = itemId;
        mesh.userData.isFurniture = true;
        mesh.userData.vibe = vibe || 10;

        mesh.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        if (position) {
            mesh.position.copy(position);
            mesh.rotation.y = rotation;
        } else {
            mesh.position.x = 0;
            mesh.position.z = 0;
        }

        this.scene.add(mesh);
        this.objects.push(mesh);
        this.recalculateVibe();
        return mesh;
    }

    spawnNPCs() {
        // Number of NPCs based on Vibe
        const count = Math.min(5, Math.floor(this.vibeScore / 20));

        for(let i=0; i<count; i++) {
            const group = new THREE.Group();

            // Body (Cylinder)
            const geo = new THREE.CylinderGeometry(0.3, 0.3, 1.6, 16);
            const mat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 0.8;
            group.add(mesh);

            // Head (Sphere)
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshStandardMaterial({color: 0xffccaa}));
            head.position.y = 1.6;
            group.add(head);

            // Random Position
            group.position.set((Math.random()-0.5)*10, 0, (Math.random()-0.5)*10);

            group.userData.isNPC = true;
            group.userData.target = new THREE.Vector3(group.position.x, 0, group.position.z);
            group.userData.nextMoveTime = Date.now() + Math.random() * 5000;

            this.scene.add(group);
            this.npcs.push(group);
        }
    }

    updateNPCs(dt) {
        const now = Date.now();
        this.npcs.forEach(npc => {
            // Movement Logic
            if (now > npc.userData.nextMoveTime) {
                // Pick new random target within room bounds (approx -7 to 7)
                npc.userData.target.set((Math.random()-0.5)*14, 0, (Math.random()-0.5)*14);
                npc.userData.nextMoveTime = now + 5000 + Math.random() * 5000;

                // Chance to chat
                if (Math.random() < 0.3) {
                    this.triggerNPCChat(npc);
                }
            }

            // Move towards target
            const speed = 2 * dt;
            const dir = new THREE.Vector3().subVectors(npc.userData.target, npc.position);
            if (dir.length() > 0.1) {
                dir.normalize();
                npc.position.add(dir.multiplyScalar(speed));
                npc.lookAt(npc.userData.target);
            }
        });
    }

    async triggerNPCChat(npc) {
        // Screen space bubble
        // Just mock simple lines for now to avoid complexity of HTML overlay tracking 3D position in this snippet
        const msgs = [
            "Nice place!", "Love the rug.", "Is that a neon lamp?", "This vibe is impeccable.",
            "Can I get a drink?", "Where's the bathroom?", "Radical!", "So shiny."
        ];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];

        // Show Toast as "Chat"
        if (window.miniGameHub) window.miniGameHub.showToast(`Guest: "${msg}"`);

        // If LLM service is available and we want to be fancy:
        // const response = await LLMService.chat("Comment on this cool room", "Visitor");
        // window.miniGameHub.showToast(`Guest: "${response}"`);
    }

    recalculateVibe() {
        this.vibeScore = this.objects.reduce((acc, obj) => acc + (obj.userData.vibe || 0), 0);
        // Base income
        this.incomeRate = this.vibeScore * 0.1; // 0.1 coins per second per vibe point

        const vibeEl = document.getElementById('vibe-score-display');
        const incomeEl = document.getElementById('income-rate-display');
        if (vibeEl) vibeEl.textContent = this.vibeScore;
        if (incomeEl) incomeEl.textContent = this.incomeRate.toFixed(1);
    }

    loadFurniture() {
        const raw = this.saveSystem.getGameConfig('clubhouse_layout_' + this.propertyType);
        // Fallback to default layout key if property specific not found?
        // Or just 'clubhouse_layout' for migration.
        const legacy = this.saveSystem.getGameConfig('clubhouse_layout');

        const data = raw || legacy;

        if (data && Array.isArray(data)) {
            data.forEach(item => {
                // Find stats from DB if missing in save
                // For now, spawnObject handles defaults
                this.spawnObject(item.id, new THREE.Vector3(item.x, item.y, item.z), item.rot);
            });
        }
    }

    saveLayout() {
        const layout = this.objects.map(obj => ({
            id: obj.userData.itemId,
            x: obj.position.x,
            y: obj.position.y,
            z: obj.position.z,
            rot: obj.rotation.y
        }));
        this.saveSystem.setGameConfig('clubhouse_layout_' + this.propertyType, layout);
        this.saveSystem.setGameConfig('clubhouse_layout', layout); // Backup/Legacy
    }

    toggleEditMode() {
        this.mode = this.mode === 'view' ? 'edit' : 'view';
        const controls = document.getElementById('edit-controls');
        const toggleBtn = document.getElementById('toggle-edit-btn');
        if (this.mode === 'edit') {
            controls.classList.remove('hidden');
            toggleBtn.classList.add('bg-red-600');
            toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            controls.classList.add('hidden');
            toggleBtn.classList.remove('bg-red-600');
            toggleBtn.innerHTML = '<i class="fas fa-pen"></i>';
            this.selectedObject = null;
        }
    }

    onKeyDown(e) {
        if (!this.isActive) return;
        if (e.key === 'e' || e.key === 'E') {
            this.toggleEditMode();
        }
        if (this.mode === 'edit' && this.selectedObject) {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.scene.remove(this.selectedObject);
                this.objects = this.objects.filter(o => o !== this.selectedObject);
                this.selectedObject = null;
                this.recalculateVibe();
            }
            if (e.key === 'r' || e.key === 'R') {
                this.selectedObject.rotation.y += Math.PI / 4;
            }
        }
    }

    onMouseDown(e) {
        if (this.mode !== 'edit') return;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects, true);

        if (intersects.length > 0) {
            let target = intersects[0].object;
            // Traverse up to find the group/container
            while(target.parent && target.parent !== this.scene && !target.userData.isFurniture) {
                target = target.parent;
            }

            if (this.objects.includes(target)) {
                this.isDragging = true;
                if(this.controls) this.controls.enabled = false;
                this.selectedObject = target;
            }
        } else {
            this.selectedObject = null;
        }
    }

    onMouseMove(e) {
        // Calc mouse position
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.isDragging && this.selectedObject) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.dragPlane);
            if (intersects.length > 0) {
                const point = intersects[0].point;
                // Snap to grid 0.5
                const snap = 0.5;
                this.selectedObject.position.x = Math.round(point.x / snap) * snap;
                this.selectedObject.position.z = Math.round(point.z / snap) * snap;
            }
        }
    }

    onMouseUp() {
        this.isDragging = false;
        if (this.controls) this.controls.enabled = true;
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update(dt) {
        if (!this.isActive) return;
        if (this.controls) this.controls.update();

        // Income Logic
        const now = Date.now();
        const elapsed = (now - this.lastIncomeTime) / 1000;
        if (elapsed > 1) { // Every second
            this.pendingIncome += this.incomeRate * elapsed;
            this.lastIncomeTime = now;
            this.updateIncomeUI();
        }

        // NPC Update
        this.updateNPCs(dt);

        this.renderer.render(this.scene, this.camera);
    }

    updateIncomeUI() {
        const el = document.getElementById('pending-income-amt');
        const btn = document.getElementById('collect-income-btn');
        if (el) el.textContent = Math.floor(this.pendingIncome);
        if (btn) {
            if (this.pendingIncome >= 1) btn.classList.remove('hidden');
            else btn.classList.add('hidden');
        }
    }

    shutdown() {
        this.isActive = false;
        window.removeEventListener('resize', this.boundOnResize);
        window.removeEventListener('mouseup', this.boundOnMouseUp);
        window.removeEventListener('keydown', this.boundOnKeyDown);

        if (this.renderer) {
            this.renderer.domElement.removeEventListener('mousemove', this.boundOnMouseMove);
            this.renderer.domElement.removeEventListener('mousedown', this.boundOnMouseDown);
            if (this.container.contains(this.renderer.domElement)) {
                this.container.removeChild(this.renderer.domElement);
            }
            this.renderer.dispose();
        }

        const ui = document.getElementById('clubhouse-ui');
        if (ui) ui.remove();

        // Save pending income? Maybe just lose it or auto-collect. Auto-collect better for UX.
        if (this.pendingIncome > 0) {
             this.saveSystem.addCurrency(Math.floor(this.pendingIncome));
        }
    }
}
