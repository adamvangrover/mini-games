import SaveSystem from './SaveSystem.js';

export default class ArcadeHub {
    constructor(container, gameRegistry, onGameSelect, onFallback) {
        this.container = container;
        this.gameRegistry = gameRegistry;
        this.onGameSelect = onGameSelect;
        this.onFallback = onFallback;

        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.cabinets = [];
        this.aisles = [];
        this.isHovering = false;
        this.isActive = true;

        // Navigation State
        this.position = new THREE.Vector3(0, 1.6, 0);
        this.targetPosition = new THREE.Vector3(0, 1.6, 0);
        this.moveSpeed = 5.0;
        this.isMoving = false;
        this.yaw = 0;
        this.pitch = 0;

        // Input State
        this.keys = {
            w: false, a: false, s: false, d: false,
            arrowup: false, arrowleft: false, arrowdown: false, arrowright: false
        };
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.dragSensitivity = 0.002;

        this.init();
    }

    init() {
        try {
            // --- Scene Setup ---
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x020205); // Darker vintage arcade
            this.scene.fog = new THREE.FogExp2(0x020205, 0.015);

            // --- Camera Setup ---
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.copy(this.position);
            // Default look
            this.updateCameraRotation();

            // --- Renderer Setup ---
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            if (this.container) {
                this.container.appendChild(this.renderer.domElement);
            } else {
                console.error("ArcadeHub: No container provided.");
                return;
            }

            // --- Lighting ---
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Dim ambient
            this.scene.add(ambientLight);

            // --- Environment ---
            this.createEnvironment();
            this.organizeGamesIntoAisles();
            this.createTeleporter();

            // --- Event Listeners ---
            window.addEventListener('resize', this.onResize.bind(this));

            // Mouse / Touch
            this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

            this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            window.addEventListener('touchend', this.onMouseUp.bind(this));

            // Keyboard
            window.addEventListener('keydown', this.onKeyDown.bind(this));
            window.addEventListener('keyup', this.onKeyUp.bind(this));

            // Start Loop
            this.animate();
        } catch (e) {
            console.error("ArcadeHub: WebGL Initialization Failed. Falling back to Grid View.", e);
            this.isActive = false;
            if(this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            if(this.container) this.container.style.display = 'none';
            if (this.onFallback) this.onFallback();
        }
    }

    createEnvironment() {
        const saveSystem = SaveSystem.getInstance();
        const settings = saveSystem.data.equipped || {};

        // Floor
        const floorGeo = new THREE.PlaneGeometry(200, 200);

        // Procedural Carpet Texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Base color
        ctx.fillStyle = '#1a0b1a'; // Dark purple/black
        ctx.fillRect(0,0,512,512);

        // Pattern (90s Arcade style)
        ctx.fillStyle = '#331133';
        for(let i=0; i<50; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const r = Math.random() * 20 + 5;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        // Neon squiggles
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        for(let i=0; i<20; i++) {
             ctx.beginPath();
             ctx.moveTo(Math.random()*512, Math.random()*512);
             ctx.lineTo(Math.random()*512, Math.random()*512);
             ctx.stroke();
        }

        const floorTex = new THREE.CanvasTexture(canvas);
        floorTex.wrapS = THREE.RepeatWrapping;
        floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(20, 20);

        const floorMat = new THREE.MeshStandardMaterial({
            map: floorTex,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.floor = floor; // Reference for raycasting

        // Ceiling (Stars/Grid)
        const ceilingGeo = new THREE.PlaneGeometry(200, 200);
        const ceilingMat = new THREE.MeshBasicMaterial({ color: 0x050510, side: THREE.BackSide });
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 10;
        this.scene.add(ceiling);

        // Grid on Ceiling
        const grid = new THREE.GridHelper(200, 50, 0x333333, 0x111111);
        grid.position.y = 9.9;
        this.scene.add(grid);

        // Walls (Outer bounds)
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const wallGeo = new THREE.BoxGeometry(200, 20, 1);

        // Back Wall
        const backWall = new THREE.Mesh(wallGeo, wallMat);
        backWall.position.set(0, 10, -50);
        this.scene.add(backWall);

        // Front Wall
        const frontWall = new THREE.Mesh(wallGeo, wallMat);
        frontWall.position.set(0, 10, 50);
        this.scene.add(frontWall);

        // Side Walls
        const sideWallGeo = new THREE.BoxGeometry(1, 20, 200);
        const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
        leftWall.position.set(-50, 10, 0);
        this.scene.add(leftWall);

        const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
        rightWall.position.set(50, 10, 0);
        this.scene.add(rightWall);
    }

    organizeGamesIntoAisles() {
        const games = Object.entries(this.gameRegistry);
        const categories = {};

        // Group by category
        games.forEach(([id, game]) => {
            const cat = game.category || 'Misc';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({ id, ...game });
        });

        const categoryNames = Object.keys(categories);

        // Layout Config
        const aisleSpacing = 12; // Distance between aisles (Z axis)
        const rowSpacing = 3;   // Distance between cabinets in a row (X axis)
        const startZ = -20;

        categoryNames.forEach((catName, index) => {
            const z = startZ + (index * aisleSpacing);
            const gamesInCat = categories[catName];

            // Aisle Label (Neon Sign)
            this.createNeonSign(catName, 0, 4.5, z);

            // Place cabinets in two rows (facing each other? or back to back?)
            // Let's do a single long row for simplicity, or double row facing outward.
            // "Aisles grouped by genre" usually means you walk DOWN the aisle.
            // So cabinets should be on Left and Right of the aisle.
            // Aisle runs along X axis? Or Z axis?
            // Let's say Aisles run along X axis. You walk X.
            // Z separates aisles.

            // Wait, standard aisles: You walk down Z. Cabinets on Left (-X) and Right (+X).
            // Let's do that. Main path is Z axis.
            // Group 1: Z=0 to 10. Group 2: Z=15 to 25.

            // Let's try: A main Hallway (Z axis).
            // Categories are bays/alcoves on Left and Right.

            // Simpler approach for "Vintage Arcade":
            // Rows of machines.
            // Row 1 (Z = -10): Action Games.
            // Row 2 (Z = -5): Puzzle Games.
            // Row 3 (Z = 0): ...

            // Let's do Rows along X axis. You walk between them (along X) or cut across (Z).

            // Let's place them:
            // Category Label at X=0.
            // Games spread out left and right from X=0.

            const count = gamesInCat.length;
            const mid = Math.floor(count / 2);

            gamesInCat.forEach((game, i) => {
                const offset = (i - mid) * 2.5; // 2.5 units width per cabinet area
                const x = offset;
                // Add some jitter or curve? No, straight rows.

                // If it's too wide, wrap?
                // For now, linear.

                this.createCabinet(x, 0, z, 0, game.id, game);
            });
        });

        // Set initial position
        this.position.set(0, 1.6, 25); // Start at front (further back to see more)
        this.targetPosition.copy(this.position);
        this.yaw = 0; // Face North (-Z) - Look INTO the arcade
        this.updateCameraRotation();
    }

    createNeonSign(text, x, y, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)'; // Transparent
        ctx.fillRect(0,0,512,128);

        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.toUpperCase(), 256, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const geo = new THREE.PlaneGeometry(8, 2);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        // Face the player initially or rotate?
        // If rows are along X, sign should face Z (front/back).
        // If we view from +Z looking -Z.
        mesh.rotation.y = 0; // Face +Z? No, standard plane is XY.
        // We want it readable from +Z (start).
        // Text is naturally on +Z face?
        // Let's rotate Y=0 if we look from +Z to -Z, text should be readable.
        // Actually, let's make it look at 0,0,0? No.

        this.scene.add(mesh);

        // Add a light for the sign
        const light = new THREE.PointLight(0x00ffff, 0.5, 10);
        light.position.set(x, y, z + 1);
        this.scene.add(light);
    }

    createCabinet(x, y, z, rotation, id, gameInfo) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotation;

        // Fetch Equipped Style
        const saveSystem = SaveSystem.getInstance();
        const cabinetStyle = saveSystem.getEquippedItem('cabinet') || 'default';

        let bodyColor = 0x222222;
        let metalness = 0.5;
        let roughness = 0.5;

        if (cabinetStyle === 'wood') { bodyColor = 0x5c4033; metalness = 0.1; roughness = 0.8; }
        else if (cabinetStyle === 'carbon') { bodyColor = 0x111111; metalness = 0.9; roughness = 0.2; }
        else if (cabinetStyle === 'gold') { bodyColor = 0xffd700; metalness = 1.0; roughness = 0.1; }

        // Cabinet Body
        const bodyGeo = new THREE.BoxGeometry(1.2, 2.2, 1.0);
        const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: roughness, metalness: metalness });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.1;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Screen
        const screenGeo = new THREE.PlaneGeometry(0.9, 0.7);
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 512, 384);
        const neonColor = this.getNeonColor(id);
        ctx.fillStyle = neonColor;
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameInfo.name, 256, 192);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, 472, 344);

        const texture = new THREE.CanvasTexture(canvas);
        const screenMat = new THREE.MeshBasicMaterial({ map: texture });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.5, 0.51);
        group.add(screen);

        // Marquee
        const marqueeGeo = new THREE.BoxGeometry(1.2, 0.3, 1.0);
        const marqueeMat = new THREE.MeshStandardMaterial({ color: neonColor, emissive: neonColor, emissiveIntensity: 0.5 });
        const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
        marquee.position.set(0, 2.35, 0);
        group.add(marquee);

        // Control Panel
        const panelGeo = new THREE.BoxGeometry(1.2, 0.1, 0.5);
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, 1.1, 0.6);
        panel.rotation.x = 0.2;
        group.add(panel);

        // Joystick & Buttons (Simple)
        const joyGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2);
        const joyMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const joy = new THREE.Mesh(joyGeo, joyMat);
        joy.position.set(-0.3, 1.25, 0.65);
        joy.rotation.x = 0.2;
        group.add(joy);

        group.userData = { gameId: id, isCabinet: true, bounds: new THREE.Box3().setFromObject(body) };

        // Update bounds relative to world for collision?
        // We'll compute world bounds in update loop if needed, or approximate with position + radius.

        this.cabinets.push(group);
        this.scene.add(group);
    }

    createTeleporter() {
        const group = new THREE.Group();
        group.position.set(0, 0, 15); // Behind start position

        const padGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32);
        const padMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.2 });
        const pad = new THREE.Mesh(padGeo, padMat);
        group.add(pad);

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0,0,256,64);
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#ffaa00';
        ctx.textAlign = 'center';
        ctx.fillText("TROPHY ROOM", 128, 40);
        const tex = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(2, 0.5);
        const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(0, 1.5, 0);
        label.rotation.y = Math.PI; // Face the arcade
        group.add(label);

        group.userData = { isTeleporter: true, target: 'TROPHY_ROOM' };
        this.teleporter = group;
        this.scene.add(group);
    }

    getNeonColor(id) {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    }

    // --- Input & Navigation ---

    onKeyDown(e) {
        const key = e.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) this.keys[key] = true;
        if (this.keys.hasOwnProperty('arrow' + e.key.toLowerCase().replace('arrow',''))) this.keys['arrow' + e.key.toLowerCase().replace('arrow','')] = true;
    }

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) this.keys[key] = false;
        if (this.keys.hasOwnProperty('arrow' + e.key.toLowerCase().replace('arrow',''))) this.keys['arrow' + e.key.toLowerCase().replace('arrow','')] = false;
    }

    onMouseDown(e) {
        if (!this.isActive) return;
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onMouseMove(e) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (this.isDragging) {
            const dx = e.clientX - this.previousMousePosition.x;
            const dy = e.clientY - this.previousMousePosition.y;

            this.yaw -= dx * this.dragSensitivity;
            this.pitch -= dy * this.dragSensitivity;

            // Clamp pitch
            this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));

            this.updateCameraRotation();
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    }

    onTouchStart(e) {
        if (!this.isActive || e.touches.length !== 1) return;
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    onTouchMove(e) {
        if (this.isDragging && e.touches.length === 1) {
            e.preventDefault();
            const dx = e.touches[0].clientX - this.previousMousePosition.x;
            const dy = e.touches[0].clientY - this.previousMousePosition.y;
            this.yaw -= dx * this.dragSensitivity * 2; // More sensitive on touch
            this.pitch -= dy * this.dragSensitivity * 2;
            this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
            this.updateCameraRotation();
            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }

    updateCameraRotation() {
        if (!this.camera) return;
        // Euler rotation order 'YXZ' usually better for FPS
        this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }

    onClick(e) {
        if (!this.isActive || this.isDragging) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            // Check for Cabinet or Teleporter
            let obj = intersects[0].object;

            // Walk to floor click
            if (obj === this.floor) {
                const point = intersects[0].point;
                this.targetPosition.set(point.x, 1.6, point.z);
                this.isMoving = true;
                return;
            }

            // Check hierarchy
            while (obj) {
                if (obj.userData) {
                    if (obj.userData.gameId) {
                        // Enter Game
                        if (this.onGameSelect) this.onGameSelect(obj.userData.gameId);
                        return;
                    }
                    if (obj.userData.isTeleporter) {
                        if (this.onGameSelect) this.onGameSelect('TROPHY_ROOM');
                        return;
                    }
                }
                obj = obj.parent;
            }
        }
    }

    updateMovement(dt) {
        // WASD Input
        const forward = (this.keys.w || this.keys.arrowup) ? 1 : (this.keys.s || this.keys.arrowdown) ? -1 : 0;
        const strafe = (this.keys.a || this.keys.arrowleft) ? 1 : (this.keys.d || this.keys.arrowright) ? -1 : 0;

        if (forward !== 0 || strafe !== 0) {
            // Cancel click-to-move if using keys
            this.isMoving = false;

            const dir = new THREE.Vector3();
            this.camera.getWorldDirection(dir);
            dir.y = 0;
            dir.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(this.camera.up, dir).normalize(); // Cross Y and Dir gives Right? Wait. Camera Up is Y. Dir is -Z (local).
            // Standard: Right is cross(Forward, Up)? No cross(Up, Forward) = Left?
            // Three.js: Right is cross(Forward, Up)?
            // Let's rely on camera local vectors

            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(dir, forward);
            // Right vector
            const rightVec = new THREE.Vector3(-dir.z, 0, dir.x); // Simple 90 deg rotation
            moveVec.addScaledVector(rightVec, strafe);

            moveVec.normalize();

            this.position.addScaledVector(moveVec, this.moveSpeed * dt);
        }
        else if (this.isMoving) {
            // Click-to-move Lerp
            const dist = this.position.distanceTo(this.targetPosition);
            if (dist < 0.1) {
                this.position.copy(this.targetPosition);
                this.isMoving = false;
            } else {
                const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position).normalize();
                this.position.addScaledVector(dir, this.moveSpeed * dt);
            }
        }

        // Collision Check (Simple bounds clamping)
        this.position.x = Math.max(-45, Math.min(45, this.position.x));
        this.position.z = Math.max(-45, Math.min(45, this.position.z));

        // Cabinet Collision (Circle check)
        this.cabinets.forEach(cab => {
            const dist = new THREE.Vector2(this.position.x, this.position.z).distanceTo(new THREE.Vector2(cab.position.x, cab.position.z));
            if (dist < 1.5) {
                // Push back
                const dir = new THREE.Vector2(this.position.x - cab.position.x, this.position.z - cab.position.z).normalize();
                this.position.x = cab.position.x + dir.x * 1.5;
                this.position.z = cab.position.z + dir.y * 1.5;
                this.isMoving = false; // Stop auto move on collision
            }
        });

        this.camera.position.copy(this.position);
    }

    animate() {
        if (!this.isActive) return;
        requestAnimationFrame(this.animate.bind(this));

        const dt = 0.016; // Approx 60fps
        this.updateMovement(dt);

        // Hover Effect
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        let hovering = false;

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while(obj) {
                if (obj.userData && (obj.userData.gameId || obj.userData.isTeleporter)) {
                    hovering = true;
                    // Spin marquee or something?
                    break;
                }
                obj = obj.parent;
            }
        }
        document.body.style.cursor = hovering ? 'pointer' : (this.isDragging ? 'grabbing' : 'default');

        if (this.teleporter) {
             const ring = this.teleporter.children.find(c => c.geometry.type === 'TorusGeometry');
             if(ring) {
                 ring.position.y = 0.5 + Math.sin(Date.now() * 0.005) * 0.1;
                 ring.rotation.x = Math.PI/2 + Math.sin(Date.now() * 0.002) * 0.2;
             }
        }

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    resume() {
        this.isActive = true;
        this.container.style.display = 'block';
        this.onResize();
        this.keys = { w:false, a:false, s:false, d:false, arrowup:false, arrowleft:false, arrowdown:false, arrowright:false };
    }

    pause() {
        this.isActive = false;
        this.container.style.display = 'none';
        document.body.style.cursor = 'default';
    }
}
