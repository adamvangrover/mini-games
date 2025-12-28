import SaveSystem from './SaveSystem.js';
import InputManager from './InputManager.js';

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
        this.clock = new THREE.Clock();

        // Environment Arrays
        this.cabinets = [];
        this.colliders = []; // Array of Box3 for collision
        this.walls = [];
        
        // State
        this.isHovering = false;
        this.isActive = true;

        // Player / Physics State
        this.inputManager = InputManager.getInstance();
        this.player = {
            position: new THREE.Vector3(0, 1.6, 25), // Start at entrance
            velocity: new THREE.Vector3(),
            speed: 8.0,
            radius: 0.5,
            height: 1.6
        };

        // Camera State (Look)
        this.yaw = 0;
        this.pitch = 0;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.dragSensitivity = 0.0025;

        // Navigation State (Click-to-Move)
        this.navTarget = null;
        this.navMarker = null;

        this.init();
    }

    init() {
        try {
            // --- Scene Setup ---
            const saveSystem = SaveSystem.getInstance();
            const theme = saveSystem.getEquippedItem('theme') || 'blue';

            // Theme Colors (Merged Logic)
            const themeColors = {
                blue: { bg: 0x050510, fog: 0x050510, grid: 0x00ffff, light: 0x0088ff },
                pink: { bg: 0x100505, fog: 0x100505, grid: 0xff00ff, light: 0xff0088 },
                gold: { bg: 0x101005, fog: 0x101005, grid: 0xffd700, light: 0xffaa00 },
                green: { bg: 0x001000, fog: 0x001000, grid: 0x00ff00, light: 0x00ff00 },
                red:  { bg: 0x100000, fog: 0x100000, grid: 0xff0000, light: 0xff0000 }
            };
            const colors = themeColors[theme] || themeColors.blue;

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(colors.bg);
            this.scene.fog = new THREE.FogExp2(colors.fog, 0.02);

            // --- Camera Setup ---
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.copy(this.player.position);
            this.updateCameraRotation();

            // --- Renderer Setup ---
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            if (this.container) {
                this.container.innerHTML = '';
                this.container.appendChild(this.renderer.domElement);
            } else {
                return;
            }

            // --- Lighting (Branch 2 - Better Lighting) ---
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
            this.scene.add(ambientLight);

            // Ceiling Lights
            this.createCeilingLight(0, 9, 0, colors.light, 2.0, 40);
            this.createCeilingLight(0, 9, -15, colors.light, 2.0, 40);
            this.createCeilingLight(0, 9, 15, colors.light, 2.0, 40);
            this.createCeilingLight(0, 9, -30, colors.light, 2.0, 40);

            // --- Environment & Layout ---
            this.createRoom(colors);
            this.organizeLayout(); // Uses Branch 2 logic with Branch 1 cabinets
            this.createTeleporter();
            this.createNavMarker();

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

            // Start Loop
            this.animate();

        } catch (e) {
            console.error("ArcadeHub: WebGL Initialization Failed.", e);
            if (this.onFallback) this.onFallback();
        }
    }

    // --- Environment Creation (Merged) ---

    createCeilingLight(x, y, z, color, intensity, distance) {
        const light = new THREE.PointLight(color, intensity, distance);
        light.position.set(x, y, z);
        this.scene.add(light);

        // Glow mesh
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
    }

    createRoom(colors) {
        // Floor (Reflective - Branch 2)
        const floorGeo = new THREE.PlaneGeometry(60, 80);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.1,
            metalness: 0.6,
            side: THREE.FrontSide
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.floor = floor; // Reference for click-to-move

        // Grid on floor (Visual style)
        const gridHelper = new THREE.GridHelper(60, 30, colors.grid, 0x222222);
        gridHelper.position.y = 0.02;
        this.scene.add(gridHelper);

        // Ceiling
        const ceilGeo = new THREE.PlaneGeometry(60, 80);
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x050505 });
        const ceil = new THREE.Mesh(ceilGeo, ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.y = 10;
        this.scene.add(ceil);

        // Walls (Collision Enabled)
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });

        const createWall = (w, h, d, x, y, z) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
            mesh.position.set(x, y, z);
            this.scene.add(mesh);
            this.addCollider(mesh);
        };

        createWall(60, 10, 1, 0, 5, -40); // Back
        createWall(60, 10, 1, 0, 5, 40);  // Front
        createWall(1, 10, 80, -30, 5, 0); // Left
        createWall(1, 10, 80, 30, 5, 0);  // Right
    }

    addCollider(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push(box);
    }

    // --- Layout Logic ---

    organizeLayout() {
        const categories = {};
        Object.entries(this.gameRegistry).forEach(([id, game]) => {
            const cat = game.category || 'Misc';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({ id, ...game });
        });

        const catNames = Object.keys(categories).sort();
        let currentZ = 5;
        const aisleSpacing = 12;
        const cabinetSpacing = 2.5;

        catNames.forEach((cat) => {
            const games = categories[cat];
            
            // Signage
            this.createNeonSign(cat, 0, 7, currentZ);

            let rowZ = currentZ;
            
            games.forEach((game, i) => {
                const isLeft = i % 2 === 0;
                const offsetZ = Math.floor(i / 2) * cabinetSpacing;
                // Place cabinets on left (-X) and right (+X) facing inwards
                if (isLeft) {
                    this.createCabinet(-6, 0, rowZ - offsetZ, Math.PI / 2, game.id, game);
                } else {
                    this.createCabinet(6, 0, rowZ - offsetZ, -Math.PI / 2, game.id, game);
                }
            });
            currentZ -= aisleSpacing;
        });
    }

    createNeonSign(text, x, y, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 512, 128);

        // Neon Glow Style
        ctx.font = 'bold 60px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.fillText(text.toUpperCase(), 256, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), mat);
        mesh.position.set(x, y, z);

        const light = new THREE.PointLight(0x00ffff, 1.5, 20);
        light.position.set(x, y - 1, z);
        this.scene.add(light);
        this.scene.add(mesh);
    }

    createCabinet(x, y, z, rotation, id, gameInfo) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotation;

        // Fetch Equipped Style (Branch 1 Feature)
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

        // Screen & Neon (Branch 2 Logic integrated)
        const neonColor = this.getNeonColor(id);
        const screenGeo = new THREE.PlaneGeometry(0.9, 0.7);
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 192;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 256, 192);
        ctx.fillStyle = neonColor;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameInfo.name, 128, 100);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 236, 172);

        const screenMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.5, 0.51);
        group.add(screen);

        // Marquee (Glowing)
        const marqMat = new THREE.MeshStandardMaterial({ color: neonColor, emissive: neonColor, emissiveIntensity: 0.6 });
        const marq = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.0), marqMat);
        marq.position.set(0, 2.35, 0);
        group.add(marq);

        // Detailed Control Panel (Branch 1 Feature)
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        panel.position.set(0, 1.1, 0.6);
        panel.rotation.x = 0.2;
        group.add(panel);

        const joy = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        joy.position.set(-0.3, 1.25, 0.65);
        joy.rotation.x = 0.2;
        group.add(joy);

        group.userData = { gameId: id, isCabinet: true };
        this.scene.add(group);
        this.addCollider(body);
        this.cabinets.push(group);
    }

    createTeleporter() {
        const group = new THREE.Group();
        group.position.set(0, 0, -35); // Back of room

        // Base
        const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.5 })
        );
        group.add(pad);

        // Floating Text
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#ffaa00';
        ctx.textAlign = 'center';
        ctx.fillText("TROPHY ROOM", 128, 40);
        
        const label = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 0.75),
            new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, side: THREE.DoubleSide })
        );
        label.position.set(0, 2, 0);
        group.add(label);

        group.userData = { isTeleporter: true, target: 'TROPHY_ROOM' };
        this.scene.add(group);
        this.addCollider(pad);
        this.teleporterTrigger = group; // Trigger reference
    }

    createNavMarker() {
        const geometry = new THREE.RingGeometry(0.3, 0.4, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        this.navMarker = new THREE.Mesh(geometry, material);
        this.navMarker.rotation.x = -Math.PI / 2;
        this.navMarker.visible = false;
        this.scene.add(this.navMarker);

        // Inner pulse circle
        const innerGeo = new THREE.CircleGeometry(0.2, 32);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        const navInner = new THREE.Mesh(innerGeo, innerMat);
        navInner.position.z = 0.01;
        this.navMarker.add(navInner);
    }

    getNeonColor(id) {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    }

    // --- Update Loop & Movement ---

    update(dt) {
        if (!this.isActive || !this.scene) return;

        // 1. Handle Input & Movement
        this.handleMovement(dt);

        // 2. Check Interactions (Hover)
        this.checkInteractions();

        // 3. Render (If not handled externally)
        if (this.renderer && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    animate() {
        if (!this.isActive) return;
        requestAnimationFrame(this.animate.bind(this));
        
        const dt = this.clock.getDelta();
        this.update(dt);
    }

    handleMovement(dt) {
        // --- FPS Movement (WASD) ---
        const velocity = new THREE.Vector3();
        const isSprinting = this.inputManager.isKeyDown('ShiftLeft');
        const moveSpeed = this.player.speed * (isSprinting ? 1.5 : 1.0) * dt;

        if (this.inputManager.isKeyDown('KeyW') || this.inputManager.isKeyDown('ArrowUp')) velocity.z -= 1;
        if (this.inputManager.isKeyDown('KeyS') || this.inputManager.isKeyDown('ArrowDown')) velocity.z += 1;
        if (this.inputManager.isKeyDown('KeyA') || this.inputManager.isKeyDown('ArrowLeft')) velocity.x -= 1;
        if (this.inputManager.isKeyDown('KeyD') || this.inputManager.isKeyDown('ArrowRight')) velocity.x += 1;

        if (velocity.length() > 0) {
            velocity.normalize().multiplyScalar(moveSpeed);
            
            // Move relative to Camera Yaw (Y-rotation)
            const euler = new THREE.Euler(0, this.yaw, 0, 'YXZ');
            velocity.applyEuler(euler);
            
            this.navTarget = null; // Manual input overrides click-move
        }

        // --- Click-to-Move Logic ---
        if (this.navTarget) {
            this.navMarker.visible = true;
            this.navMarker.position.set(this.navTarget.x, 0.1, this.navTarget.z);
            this.navMarker.rotation.z += dt * 2;
            const scale = 1 + Math.sin(Date.now() * 0.01) * 0.2;
            this.navMarker.scale.set(scale, scale, scale);

            const dir = new THREE.Vector3().subVectors(this.navTarget, this.player.position);
            dir.y = 0;
            const dist = dir.length();
            if (dist < 0.2) {
                this.navTarget = null;
            } else {
                dir.normalize().multiplyScalar(Math.min(moveSpeed, dist));
                velocity.add(dir);
            }
        } else {
            this.navMarker.visible = false;
        }

        // --- Collision Detection ---
        const nextPos = this.player.position.clone().add(velocity);
        let collided = false;

        // Room Bounds
        if (Math.abs(nextPos.x) > 28 || Math.abs(nextPos.z) > 38) collided = true;

        // Object Colliders
        const playerBox = new THREE.Box3().setFromCenterAndSize(nextPos, new THREE.Vector3(1, 2, 1));
        for (let box of this.colliders) {
            if (box.intersectsBox(playerBox)) {
                collided = true;
                break;
            }
        }

        if (!collided) {
            this.player.position.copy(nextPos);
        } else {
            // Stop auto-walk on collision
            this.navTarget = null;
        }

        // --- Camera Sync ---
        this.camera.position.set(this.player.position.x, this.player.height, this.player.position.z);
        
        // Trigger Check (Teleporter)
        if (this.teleporterTrigger) {
            if (this.player.position.distanceTo(this.teleporterTrigger.position) < 2.5) {
                if (this.onGameSelect) this.onGameSelect('TROPHY_ROOM');
            }
        }
    }

    checkInteractions() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        let hovered = false;
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            // Traverse up to find Game/Teleporter Group
            while(obj.parent && !obj.userData.gameId && !obj.userData.isTeleporter) {
                obj = obj.parent;
            }
            if (obj.userData && (obj.userData.gameId || obj.userData.isTeleporter)) {
                hovered = true;
            }
        }
        
        document.body.style.cursor = hovered ? 'pointer' : (this.isDragging ? 'grabbing' : 'default');
    }

    // --- Input Handlers ---

    onMouseDown(event) {
        if (!this.isActive) return;
        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    onMouseMove(e) {
        // Update Mouse Normalized Device Coordinates for Raycaster
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        // Mouse Look (Drag)
        if (this.isDragging) {
            const dx = e.clientX - this.previousMousePosition.x;
            const dy = e.clientY - this.previousMousePosition.y;

            this.yaw -= dx * this.dragSensitivity;
            this.pitch -= dy * this.dragSensitivity;

            // Clamp vertical look
            this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));

            this.updateCameraRotation();
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onClick(event) {
        if (!this.isActive || this.isDragging) return; // Prevent click after drag

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            let obj = intersects[0].object;

            // 1. Check for Cabinet/Teleporter Click
            let interactiveObj = obj;
            while(interactiveObj.parent && !interactiveObj.userData.gameId && !interactiveObj.userData.isTeleporter) {
                interactiveObj = interactiveObj.parent;
            }

            if (interactiveObj.userData && (interactiveObj.userData.gameId || interactiveObj.userData.isTeleporter)) {
                const dist = this.player.position.distanceTo(interactiveObj.position);
                
                // If close, interact immediately
                if (dist < 4.0) {
                    const targetId = interactiveObj.userData.gameId || 'TROPHY_ROOM';
                    if (this.onGameSelect) this.onGameSelect(targetId);
                } else {
                    // If far, walk towards it
                    const dir = new THREE.Vector3().subVectors(this.player.position, interactiveObj.position).normalize().multiplyScalar(2.0);
                    this.navTarget = new THREE.Vector3().addVectors(interactiveObj.position, dir);
                    this.navTarget.y = this.player.position.y;
                }
                return;
            }

            // 2. Click-to-Move (Floor)
            // Just move to the clicked point
            this.navTarget = point;
            this.navTarget.y = this.player.position.y;
        }
    }

    // Touch Support
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
            
            // Slightly higher sensitivity for touch
            this.yaw -= dx * this.dragSensitivity * 1.5;
            this.pitch -= dy * this.dragSensitivity * 1.5;
            this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
            
            this.updateCameraRotation();
            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }

    updateCameraRotation() {
        if (!this.camera) return;
        // Apply rotation to camera. YXZ order prevents gimbal lock for FPS controls
        this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    resume() {
        this.isActive = true;
        if(this.container) this.container.style.display = 'block';
        this.onResize();
        this.clock.start();
        this.animate();
    }

    pause() {
        this.isActive = false;
        if(this.container) this.container.style.display = 'none';
        this.clock.stop();
    }
}