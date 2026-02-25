import SoundManager from '../core/SoundManager.js';

const BLOCK_TYPES = [
    { name: 'Grass', color: 0x4caf50 },
    { name: 'Dirt', color: 0x795548 },
    { name: 'Stone', color: 0x9e9e9e },
    { name: 'Wood', color: 0x5d4037 },
    { name: 'Leaves', color: 0x2e7d32 },
    { name: 'Water', color: 0x2196f3 },
    { name: 'Sand', color: 0xffeb3b },
    { name: 'Snow', color: 0xffffff },
    { name: 'Lava', color: 0xff5722 },
    { name: 'Neon', color: 0x00bcd4 }
];

export default class NeonBlocksGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.running = false;
        this.soundManager = SoundManager.getInstance();

        // Systems
        this.input = null;
        this.player = null;
        this.raycaster = null;

        // Voxel Data
        this.MAX_BLOCKS = 20000; // Increased limit
        this.mesh = null;
        this.blockMap = new Map(); // "x,y,z" -> instanceId
        this.instanceMap = new Map(); // instanceId -> "x,y,z"
        this.count = 0;
        this.selectedBlockType = 0; // Index in BLOCK_TYPES

        // UI Elements
        this.slots = [];
        this.blockNameEl = null;

        // Environment
        this.time = 0;
        this.dirLight = null;
        this.ambientLight = null;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'relative w-full h-full bg-black overflow-hidden';

        if (typeof THREE === 'undefined') {
            this.container.innerHTML = '<div class="flex items-center justify-center h-full text-red-500 font-bold">Error: Three.js not loaded.</div>';
            return;
        }

        this.raycaster = new THREE.Raycaster();

        // Setup Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'block w-full h-full outline-none cursor-none';
        this.container.appendChild(this.canvas);

        // Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Setup Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

        // Setup Camera
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);

        // Lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dirLight.position.set(50, 100, 50);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.scene.add(this.dirLight);

        // Initialize Voxel Mesh
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
        this.mesh = new THREE.InstancedMesh(geometry, material, this.MAX_BLOCKS);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.count = 0;
        this.scene.add(this.mesh);

        // Input System
        this.input = new Input(this.canvas);

        // Bind Input Actions
        this.input.onMouseDown = (e) => {
            if (!this.running || !this.input.isLocked) return;
            if (e.button === 0) this.breakBlock();
            if (e.button === 2) this.placeBlock();
        };

        this.input.onScroll = (delta) => {
             const len = BLOCK_TYPES.length;
             if (delta > 0) this.selectBlock((this.selectedBlockType + 1) % len);
             else this.selectBlock((this.selectedBlockType + len - 1) % len);
        };

        this.input.onDigit = (digit) => {
            if(digit >= 1 && digit <= BLOCK_TYPES.length) this.selectBlock(digit - 1);
        };

        this.input.onKeyDown = (code) => {
            if (code === 'KeyF') this.player.toggleFly();
        };

        // Player System
        this.player = new Player(this.camera, this.input);
        this.player.world = this; // Link for collision
        this.scene.add(this.player.object);

        // Terrain Generation
        this.noise = new SimpleNoise();
        if (!this.load()) {
            this.generateTerrain();
        }

        // Resize
        this.resizeHandler = () => {
            if (!this.camera || !this.renderer || !this.container) return;
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        };
        window.addEventListener('resize', this.resizeHandler);

        // UI
        this.setupUI();
        this.selectBlock(0);

        this.running = true;
    }

    generateTerrain() {
        // Clear existing
        this.count = 0;
        this.blockMap.clear();
        this.instanceMap.clear();

        const SIZE = 24; // Radius
        const WATER_LEVEL = -1;

        for(let x = -SIZE; x <= SIZE; x++) {
            for(let z = -SIZE; z <= SIZE; z++) {
                // Noise parameters
                const scale = 0.05;
                const amplitude = 6;
                const n = this.noise.noise2D(x * scale, z * scale);
                const height = Math.floor(n * amplitude);

                // Biome determination
                let surfaceType = 0; // Grass
                if (height > 4) surfaceType = 7; // Snow
                else if (height > 2) surfaceType = 2; // Stone
                else if (height <= 0) surfaceType = 6; // Sand

                // Fill logic
                if (height < WATER_LEVEL) {
                    // Underwater
                    for(let y = height; y <= WATER_LEVEL; y++) {
                        this.addBlock(x, y, z, 5, false); // Water
                    }
                    // Bedrock/Sand under water
                    this.addBlock(x, height - 1, z, 6, false); // Sand
                } else {
                    // Surface
                    this.addBlock(x, height, z, surfaceType, false);

                    // Subsurface
                    const depth = 3;
                    for(let d = 1; d <= depth; d++) {
                        const y = height - d;
                        if (y < -10) break; // limit depth
                        this.addBlock(x, y, z, 1, false); // Dirt
                    }
                }

                // Trees
                if (surfaceType === 0 && Math.random() < 0.02) {
                    this.createTree(x, height + 1, z);
                }
            }
        }
        this.save();
    }

    createTree(x, y, z) {
        // Simple tree
        const height = 3 + Math.floor(Math.random() * 2);
        for(let i=0; i<height; i++) {
            this.addBlock(x, y + i, z, 3, false); // Wood
        }
        // Leaves
        for(let lx = -1; lx <= 1; lx++) {
            for(let lz = -1; lz <= 1; lz++) {
                for(let ly = height - 1; ly <= height + 1; ly++) {
                    if (lx===0 && lz===0 && ly < height+1) continue; // Skip trunk
                    if (Math.abs(lx) + Math.abs(lz) + Math.abs(ly-height) > 2) continue; // Round shape
                    this.addBlock(x + lx, y + ly, z + lx, 4, false); // Leaves
                }
            }
        }
        // Top leaf
        this.addBlock(x, y + height + 1, z, 4, false);
    }

    save() {
        if (!window.miniGameHub || !window.miniGameHub.saveSystem) return;

        const blocks = [];
        for (const [key, value] of this.blockMap.entries()) {
            const [x, y, z] = key.split(',').map(Number);
            blocks.push({ x, y, z, t: value.type });
        }

        const data = {
            blocks: blocks,
            player: {
                position: this.player.object.position.toArray(),
                rotation: { yaw: this.player.yaw, pitch: this.player.pitch }
            }
        };

        window.miniGameHub.saveSystem.setGameConfig('neon-blocks', data);
    }

    load() {
        if (!window.miniGameHub || !window.miniGameHub.saveSystem) return false;

        const data = window.miniGameHub.saveSystem.getGameConfig('neon-blocks');
        if (!data || !data.blocks || data.blocks.length === 0) return false;

        // Restore blocks
        this.count = 0;
        this.blockMap.clear();
        this.instanceMap.clear();

        for (const b of data.blocks) {
            this.addBlock(b.x, b.y, b.z, b.t, false); // false = no save during load
        }

        // Restore player
        if (data.player && this.player) {
            this.player.object.position.fromArray(data.player.position);
            this.player.yaw = data.player.rotation.yaw;
            this.player.pitch = data.player.rotation.pitch;
            this.player.object.rotation.y = this.player.yaw;
            this.player.camera.rotation.x = this.player.pitch;
        }

        return true;
    }

    addBlock(x, y, z, typeIndex, shouldSave = true) {
        if (this.count >= this.MAX_BLOCKS) return false;
        const key = `${x},${y},${z}`;
        if (this.blockMap.has(key)) return false;

        const id = this.count;
        const matrix = new THREE.Matrix4();
        matrix.setPosition(x, y, z);
        this.mesh.setMatrixAt(id, matrix);

        // Use BLOCK_TYPES instead of COLORS
        const colorHex = BLOCK_TYPES[typeIndex] ? BLOCK_TYPES[typeIndex].color : 0xffffff;
        this.mesh.setColorAt(id, new THREE.Color(colorHex));

        this.blockMap.set(key, { id, type: typeIndex }); // Store type too for save/load later
        this.instanceMap.set(id, key);
        this.count++;

        this.mesh.count = this.count;
        this.mesh.instanceMatrix.needsUpdate = true;
        if(this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

        if (shouldSave) this.save();
        return true;
    }

    removeBlock(id) {
        if (id < 0 || id >= this.count) return;

        const keyToRemove = this.instanceMap.get(id);
        const lastId = this.count - 1;

        if (id !== lastId) {
            // Swap with last
            const lastKey = this.instanceMap.get(lastId);
            const lastMatrix = new THREE.Matrix4();
            const lastColor = new THREE.Color();

            this.mesh.getMatrixAt(lastId, lastMatrix);
            this.mesh.getColorAt(lastId, lastColor);

            this.mesh.setMatrixAt(id, lastMatrix);
            this.mesh.setColorAt(id, lastColor);

            // Update Maps
            const lastData = this.blockMap.get(lastKey);
            this.blockMap.set(lastKey, { id: id, type: lastData.type });
            this.instanceMap.set(id, lastKey);
        }

        this.blockMap.delete(keyToRemove);
        this.instanceMap.delete(lastId);
        this.count--;

        this.mesh.count = this.count;
        this.mesh.instanceMatrix.needsUpdate = true;
        if(this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

        this.save();
    }

    setupUI() {
        const ui = document.createElement('div');
        ui.className = 'absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10';
        ui.innerHTML = `
            <div class="text-white font-bold drop-shadow-md">
                <h1 class="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-500">NEON BLOCKS</h1>
                <p class="text-sm opacity-80">WASD to Move | SPACE to Jump</p>
                <p id="block-name-display" class="text-lg text-yellow-400 mt-1"></p>
            </div>

            <!-- Crosshair -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/50 rounded-full flex items-center justify-center bg-black/20">
                <div class="w-1 h-1 bg-white rounded-full"></div>
            </div>

            <!-- Hotbar -->
            <div class="flex gap-2 mx-auto bg-black/50 p-2 rounded backdrop-blur overflow-x-auto max-w-full">
                ${BLOCK_TYPES.map((b, i) => `
                    <div id="slot-${i}" class="w-10 h-10 border-2 border-white/20 rounded flex items-center justify-center transition-all shrink-0">
                        <div class="w-6 h-6" style="background-color: #${b.color.toString(16)};"></div>
                    </div>
                `).join('')}
            </div>
        `;
        this.container.appendChild(ui);

        this.blockNameEl = document.getElementById('block-name-display');

        // Cache slots
        this.slots = [];
        for(let i=0; i<BLOCK_TYPES.length; i++) {
            this.slots.push(document.getElementById(`slot-${i}`));
        }

        // Click to capture
        this.container.addEventListener('click', () => {
            if (this.running && !this.input.isLocked) {
                this.canvas.requestPointerLock();
            }
        });
    }

    selectBlock(index) {
        this.selectedBlockType = index;
        if(this.blockNameEl) this.blockNameEl.textContent = BLOCK_TYPES[index].name;

        this.slots.forEach((el, i) => {
            if (i === index) {
                el.classList.add('border-white', 'scale-110');
                el.classList.remove('border-white/20');
            } else {
                el.classList.remove('border-white', 'scale-110');
                el.classList.add('border-white/20');
            }
        });
    }

    placeBlock() {
        this.raycaster.setFromCamera({x:0, y:0}, this.camera);
        const intersects = this.raycaster.intersectObject(this.mesh);

        if (intersects.length > 0) {
            const i = intersects[0];
            const instanceId = i.instanceId;
            const normal = i.face.normal;

            const matrix = new THREE.Matrix4();
            this.mesh.getMatrixAt(instanceId, matrix);
            const pos = new THREE.Vector3();
            pos.setFromMatrixPosition(matrix);

            const targetPos = pos.clone().add(normal);
            targetPos.round(); // Snap to grid

            // Avoid placing inside player
            const playerPos = this.player.object.position.clone();
            // Simple distance check (player height ~2)
            const dx = Math.abs(targetPos.x - playerPos.x);
            const dz = Math.abs(targetPos.z - playerPos.z);
            const dy = targetPos.y - playerPos.y;

            // Allow placing if not directly intersecting body (radius 0.5, height 2)
            if (dx < 0.6 && dz < 0.6 && dy > -1.8 && dy < 0.5) {
                // Too close
                return;
            }

            if(this.addBlock(targetPos.x, targetPos.y, targetPos.z, this.selectedBlockType)) {
                this.soundManager.playSound('click'); // Or a place sound
            }
        }
    }

    breakBlock() {
        this.raycaster.setFromCamera({x:0, y:0}, this.camera);
        const intersects = this.raycaster.intersectObject(this.mesh);

        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            this.removeBlock(instanceId);
            this.soundManager.playSound('click'); // Or a break sound
        }
    }

    update(dt) {
        if (!this.running) return;
        const delta = Math.min(dt, 0.1);
        if (this.player) this.player.update(delta);
        this.updateDayNight(delta);
    }

    updateDayNight(dt) {
        this.time += dt * 0.05; // Day speed
        const angle = this.time;
        const radius = 100;

        // Sun movement
        this.dirLight.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            50
        );

        // Sky Color & Light Intensity
        const height = Math.sin(angle);
        let skyColor = new THREE.Color(0x87CEEB); // Day
        let lightInt = 0.8;
        let ambientInt = 0.6;

        if (height < -0.2) {
            // Night
            skyColor.setHex(0x0a0a2a);
            lightInt = 0;
            ambientInt = 0.2;
        } else if (height < 0.2) {
            // Sunset/Sunrise
            const t = (height + 0.2) / 0.4;
            skyColor.lerpColors(new THREE.Color(0x0a0a2a), new THREE.Color(0xffaa00), t);
            if(height > 0) skyColor.lerp(new THREE.Color(0x87CEEB), height * 2);
            lightInt = Math.max(0, height * 0.8);
            ambientInt = 0.2 + Math.max(0, height * 0.4);
        }

        this.scene.background = skyColor;
        this.scene.fog.color = skyColor;
        this.dirLight.intensity = lightInt;
        this.ambientLight.intensity = ambientInt;
    }

    draw() {
        if (!this.running || !this.renderer) return;
        this.renderer.render(this.scene, this.camera);
    }

    shutdown() {
        this.running = false;
        if (this.input) this.input.dispose();
        if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
        }
        this.container.innerHTML = '';
    }
}

// --- Helper Classes ---

class SimpleNoise {
    constructor() {
        this.perm = new Uint8Array(512);
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const n = Math.floor(Math.random() * (i + 1));
            [p[i], p[n]] = [p[n], p[i]];
        }
        for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }

    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }

    noise2D(x, y) {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

        let n0, n1, n2; // Noise contributions from the three corners

        // Skew the input space to determine which simplex cell we're in
        const s = (x + y) * F2; // Hairy factor for 2D
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);

        const t = (i + j) * G2;
        const X0 = i - t; // Unskew the cell origin back to (x,y) space
        const Y0 = j - t;
        const x0 = x - X0; // The x,y distances from the cell origin
        const y0 = y - Y0;

        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) { i1 = 1; j1 = 0; } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
        else { i1 = 0; j1 = 1; } // upper triangle, YX order: (0,0)->(0,1)->(1,1)

        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6

        const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
        const y2 = y0 - 1.0 + 2.0 * G2;

        // Work out the hashed gradient indices of the three simplex corners
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.perm[ii + this.perm[jj]] % 12;
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

        // Calculate the contribution from the three corners
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0.0;
        else {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0.0;
        else {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0.0;
        else {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }

        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70.0 * (n0 + n1 + n2);
    }
}

SimpleNoise.prototype.grad3 = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [1, 0], [-1, 0],
    [0, 1], [0, -1], [0, 1], [0, -1]
];

class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.isLocked = false;
        this.movementX = 0;
        this.movementY = 0;
        this.onMouseDown = null;
        this.onScroll = null;
        this.onDigit = null;
        this.onKeyDown = null;

        this.handleKeyDown = (e) => {
            this.keys[e.code] = true;
            if (this.onKeyDown) this.onKeyDown(e.code);
            if (e.key >= '0' && e.key <= '9' && this.onDigit) {
                 // Map 0 to 10th item if it exists, else use digit as is
                 let val = parseInt(e.key);
                 if (val === 0) val = 10;
                 this.onDigit(val);
            }
        };
        this.handleKeyUp = (e) => { this.keys[e.code] = false; };
        this.handleMouseMove = (e) => {
            if (this.isLocked) {
                this.movementX += e.movementX;
                this.movementY += e.movementY;
            }
        };
        this.handleMouseDown = (e) => {
            if (this.onMouseDown) this.onMouseDown(e);
        };
        this.handleWheel = (e) => {
            if (this.onScroll) this.onScroll(e.deltaY);
        };
        this.handlePointerLockChange = () => {
            this.isLocked = document.pointerLockElement === this.canvas;
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('wheel', this.handleWheel);
        document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    }

    dispose() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('wheel', this.handleWheel);
        document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    }

    getAxis(negKey, posKey) {
        return (this.keys[posKey] ? 1 : 0) - (this.keys[negKey] ? 1 : 0);
    }
}

class Player {
    constructor(camera, input) {
        this.camera = camera;
        this.input = input;
        this.world = null; // Reference to game world for collision

        this.object = new THREE.Object3D();
        this.object.position.set(0, 15, 0); // Higher start
        this.object.add(camera);

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.onGround = false;

        this.speed = 10;
        this.jumpForce = 12;
        this.gravity = 35;
        this.height = 1.8;
        this.radius = 0.4;

        this.pitch = 0;
        this.yaw = 0;

        this.isFlying = false;
    }

    toggleFly() {
        this.isFlying = !this.isFlying;
        if (this.isFlying) {
            this.velocity.y = 0;
            this.onGround = false;
            // Juice
            const el = document.getElementById('block-name-display');
            if(el) {
                const prev = el.textContent;
                el.textContent = "FLY MODE: ON";
                el.classList.add('text-green-400');
                setTimeout(() => {
                    el.textContent = prev;
                    el.classList.remove('text-green-400');
                }, 1000);
            }
        } else {
             const el = document.getElementById('block-name-display');
            if(el) {
                const prev = el.textContent;
                el.textContent = "FLY MODE: OFF";
                el.classList.add('text-red-400');
                setTimeout(() => {
                    el.textContent = prev;
                    el.classList.remove('text-red-400');
                }, 1000);
            }
        }
    }

    update(dt) {
        if (!this.input.isLocked) return;

        // Rotation
        const sensitivity = 0.002;
        this.yaw -= this.input.movementX * sensitivity;
        this.pitch -= this.input.movementY * sensitivity;
        this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
        this.input.movementX = 0;
        this.input.movementY = 0;

        this.object.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;

        // Movement Input
        const forward = this.input.getAxis('KeyS', 'KeyW');
        const right = this.input.getAxis('KeyA', 'KeyD');
        this.direction.set(right, 0, -forward).normalize();
        this.direction.applyEuler(this.object.rotation);

        // Accelerate
        const currentSpeed = this.speed;
        if (this.direction.length() > 0) {
            this.velocity.x = this.direction.x * currentSpeed;
            this.velocity.z = this.direction.z * currentSpeed;
        } else {
            // Friction
            this.velocity.x *= 0.8;
            this.velocity.z *= 0.8;
        }

        // Jumping / Flying
        if (this.isFlying) {
            if (this.input.keys['Space']) this.velocity.y = this.speed;
            else if (this.input.keys['ShiftLeft']) this.velocity.y = -this.speed;
            else this.velocity.y = 0;
        } else {
            if (this.onGround && this.input.keys['Space']) {
                this.velocity.y = this.jumpForce;
                this.onGround = false;
            }
            // Gravity
            this.velocity.y -= this.gravity * dt;
        }

        // Physics Step (Simple AABB)
        const steps = 5; // Sub-steps for collision stability
        const subDt = dt / steps;
        for(let i=0; i<steps; i++) {
            this.move(subDt);
        }
    }

    move(dt) {
        // Apply Y
        this.object.position.y += this.velocity.y * dt;
        if (this.checkCollision()) {
            this.object.position.y -= this.velocity.y * dt;
            if (this.velocity.y < 0) this.onGround = true;
            this.velocity.y = 0;
        } else {
            this.onGround = false;
        }

        // Apply X
        this.object.position.x += this.velocity.x * dt;
        if (this.checkCollision()) {
             this.object.position.x -= this.velocity.x * dt;
             this.velocity.x = 0;
        }

        // Apply Z
        this.object.position.z += this.velocity.z * dt;
        if (this.checkCollision()) {
             this.object.position.z -= this.velocity.z * dt;
             this.velocity.z = 0;
        }
    }

    checkCollision() {
        if (!this.world) return false;

        // Player Bounds
        const pos = this.object.position;
        // Check surrounding blocks
        const minX = Math.floor(pos.x - this.radius);
        const maxX = Math.floor(pos.x + this.radius);
        const minY = Math.floor(pos.y - 1.6); // Feet
        const maxY = Math.floor(pos.y + 0.2); // Head
        const minZ = Math.floor(pos.z - this.radius);
        const maxZ = Math.floor(pos.z + this.radius);

        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                for(let z = minZ; z <= maxZ; z++) {
                    const key = `${x},${y},${z}`;
                    if (this.world.blockMap.has(key)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
