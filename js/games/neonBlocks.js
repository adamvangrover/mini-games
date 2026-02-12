import SoundManager from '../core/SoundManager.js';

const COLORS = [
    0x4caf50, // 1: Grass
    0x795548, // 2: Dirt
    0x9e9e9e, // 3: Stone
    0x5d4037, // 4: Wood
    0x00bcd4  // 5: Neon
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
        this.MAX_BLOCKS = 10000;
        this.mesh = null;
        this.blockMap = new Map(); // "x,y,z" -> instanceId
        this.instanceMap = new Map(); // instanceId -> "x,y,z"
        this.count = 0;
        this.selectedBlockType = 0; // Index in COLORS (0-4)

        // UI Elements
        this.slots = [];
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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Initialize Voxel Mesh
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
        this.mesh = new THREE.InstancedMesh(geometry, material, this.MAX_BLOCKS);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.count = 0;
        this.scene.add(this.mesh);

        // Create initial ground (10x10 area)
        for(let x = -10; x <= 10; x++) {
            for(let z = -10; z <= 10; z++) {
                this.addBlock(x, 0, z, 0); // Grass
            }
        }

        // Input System
        this.input = new Input(this.canvas);

        // Bind Input Actions
        this.input.onMouseDown = (e) => {
            if (!this.running || !this.input.isLocked) return;
            if (e.button === 0) this.breakBlock();
            if (e.button === 2) this.placeBlock();
        };

        this.input.onScroll = (delta) => {
             // Optional: Scroll to change block
             if (delta > 0) this.selectBlock((this.selectedBlockType + 1) % 5);
             else this.selectBlock((this.selectedBlockType + 4) % 5);
        };

        this.input.onDigit = (digit) => {
            if(digit >= 1 && digit <= 5) this.selectBlock(digit - 1);
        };

        // Player System
        this.player = new Player(this.camera, this.input);
        this.player.world = this; // Link for collision
        this.scene.add(this.player.object);

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

    addBlock(x, y, z, typeIndex) {
        if (this.count >= this.MAX_BLOCKS) return false;
        const key = `${x},${y},${z}`;
        if (this.blockMap.has(key)) return false;

        const id = this.count;
        const matrix = new THREE.Matrix4();
        matrix.setPosition(x, y, z);
        this.mesh.setMatrixAt(id, matrix);
        this.mesh.setColorAt(id, new THREE.Color(COLORS[typeIndex]));

        this.blockMap.set(key, id);
        this.instanceMap.set(id, key);
        this.count++;

        this.mesh.count = this.count;
        this.mesh.instanceMatrix.needsUpdate = true;
        if(this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

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
            this.blockMap.set(lastKey, id);
            this.instanceMap.set(id, lastKey);
        }

        this.blockMap.delete(keyToRemove);
        this.instanceMap.delete(lastId);
        this.count--;

        this.mesh.count = this.count;
        this.mesh.instanceMatrix.needsUpdate = true;
        if(this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }

    setupUI() {
        const ui = document.createElement('div');
        ui.className = 'absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10';
        ui.innerHTML = `
            <div class="text-white font-bold drop-shadow-md">
                <h1 class="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-500">NEON BLOCKS</h1>
                <p class="text-sm opacity-80">WASD to Move | SPACE to Jump</p>
            </div>

            <!-- Crosshair -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/50 rounded-full flex items-center justify-center bg-black/20">
                <div class="w-1 h-1 bg-white rounded-full"></div>
            </div>

            <!-- Hotbar -->
            <div class="flex gap-2 mx-auto bg-black/50 p-2 rounded backdrop-blur">
                ${COLORS.map((c, i) => `
                    <div id="slot-${i}" class="w-10 h-10 border-2 border-white/20 rounded flex items-center justify-center transition-all">
                        <div class="w-6 h-6" style="background-color: #${c.toString(16)};"></div>
                    </div>
                `).join('')}
            </div>
        `;
        this.container.appendChild(ui);

        // Cache slots
        this.slots = [];
        for(let i=0; i<5; i++) {
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

        this.handleKeyDown = (e) => {
            this.keys[e.code] = true;
            if (e.key >= '1' && e.key <= '5' && this.onDigit) this.onDigit(parseInt(e.key));
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
        this.object.position.set(0, 5, 0);
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

        // Jumping
        if (this.onGround && this.input.keys['Space']) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        // Gravity
        this.velocity.y -= this.gravity * dt;

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
