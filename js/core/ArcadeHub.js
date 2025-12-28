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

        this.cabinets = [];
        this.colliders = []; // Array of Box3 for collision
        this.walls = [];
        this.isHovering = false;
        this.isActive = true;

        // Navigation State
        this.inputManager = InputManager.getInstance();
        this.player = {
            position: new THREE.Vector3(0, 1.6, 15), // Start at entrance
            velocity: new THREE.Vector3(),
            speed: 6.0,
            radius: 0.5,
            height: 1.6,
            rotation: { x: 0, y: 0 }
        };

        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.navTarget = null;
        this.joystick = { active: false, origin: {x:0, y:0}, current: {x:0, y:0}, id: null };

        this.init();
    }

    init() {
        try {
            // --- Scene Setup ---
            const saveSystem = SaveSystem.getInstance();
            const theme = saveSystem.getEquippedItem('theme') || 'blue';

            // Theme Colors
            const themeColors = {
                blue: { bg: 0x050510, fog: 0x050510, grid: 0x00ffff, light: 0x0088ff },
                pink: { bg: 0x100505, fog: 0x100505, grid: 0xff00ff, light: 0xff0088 },
                gold: { bg: 0x101005, fog: 0x101005, grid: 0xffd700, light: 0xffaa00 },
                green: { bg: 0x001000, fog: 0x001000, grid: 0x00ff00, light: 0x00ff00 },
                red: { bg: 0x100000, fog: 0x100000, grid: 0xff0000, light: 0xff0000 }
            };
            const colors = themeColors[theme] || themeColors.blue;

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(colors.bg);
            this.scene.fog = new THREE.FogExp2(colors.fog, 0.03);

            // --- Camera Setup ---
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.copy(this.player.position);

            // --- Renderer Setup ---
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            if (this.container) {
                this.container.innerHTML = '';
                this.container.appendChild(this.renderer.domElement);
                this.createVirtualJoystick(); // Add Joystick UI
            } else {
                return;
            }

            // --- Lighting ---
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
            this.scene.add(ambientLight);

            // Main Overhead Lights
            this.createCeilingLight(0, 8, 0, colors.light, 1, 20);
            this.createCeilingLight(0, 8, -10, colors.light, 1, 20);
            this.createCeilingLight(0, 8, 10, colors.light, 1, 20);

            // --- Environment ---
            this.createRoom(colors);
            this.organizeLayout();
            this.createTeleporter();

            // --- Event Listeners ---
            window.addEventListener('resize', this.onResize.bind(this));

            // Mouse Events
            this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

            // Touch Events (Delegated to Joystick if touched there, else Camera)
            this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            window.addEventListener('touchend', this.onTouchEnd.bind(this));

        } catch (e) {
            console.error("ArcadeHub: WebGL Initialization Failed.", e);
            if (this.onFallback) this.onFallback();
        }
    }

    createVirtualJoystick() {
        this.joystickEl = document.createElement('div');
        this.joystickEl.id = 'hub-joystick';
        this.joystickEl.style.cssText = `
            position: absolute;
            bottom: 50px;
            left: 50px;
            width: 120px;
            height: 120px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            display: none; /* Hidden on desktop by default */
            z-index: 20;
            touch-action: none;
        `;

        this.knobEl = document.createElement('div');
        this.knobEl.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 50px;
            height: 50px;
            background: rgba(0, 255, 255, 0.5);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            pointer-events: none;
        `;

        this.joystickEl.appendChild(this.knobEl);
        this.container.appendChild(this.joystickEl);

        // Show on touch devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this.joystickEl.style.display = 'block';
        }

        // Joystick Events
        this.joystickEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.joystick.id = touch.identifier;
            this.joystick.active = true;
            this.joystick.origin = { x: touch.clientX, y: touch.clientY };
            this.joystick.current = { x: touch.clientX, y: touch.clientY };
            this.updateJoystickVisual();
        }, { passive: false });

        // Move/End handled globally
    }

    updateJoystickVisual() {
        if (!this.joystick.active) {
            this.knobEl.style.transform = `translate(-50%, -50%)`;
            return;
        }
        const dx = this.joystick.current.x - this.joystick.origin.x;
        const dy = this.joystick.current.y - this.joystick.origin.y;

        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = 35; // Radius

        let visualX = dx;
        let visualY = dy;

        if (dist > maxDist) {
            visualX = (dx / dist) * maxDist;
            visualY = (dy / dist) * maxDist;
        }

        this.knobEl.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
    }

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
        // Floor
        const floorGeo = new THREE.PlaneGeometry(60, 100);

        // Vintage Arcade Carpet Texture Procedural
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#110011';
        ctx.fillRect(0,0,512,512);

        // Random shapes
        for(let i=0; i<50; i++) {
            ctx.fillStyle = `hsl(${Math.random()*360}, 70%, 50%)`;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(Math.random()*512, Math.random()*512, Math.random()*50 + 10, 0, Math.PI*2);
            ctx.fill();
        }
        // Grid overlay
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i=0; i<=512; i+=64) {
            ctx.moveTo(i, 0); ctx.lineTo(i, 512);
            ctx.moveTo(0, i); ctx.lineTo(512, i);
        }
        ctx.stroke();

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(6, 10);

        const floorMat = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.6,
            metalness: 0.2,
            side: THREE.FrontSide
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Ceiling
        const ceilGeo = new THREE.PlaneGeometry(60, 100);
        const ceilMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            emissive: 0x050505,
            side: THREE.FrontSide
        });
        const ceil = new THREE.Mesh(ceilGeo, ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.y = 10;
        this.scene.add(ceil);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });

        // Back Wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(60, 10, 1), wallMat);
        backWall.position.set(0, 5, -50);
        this.scene.add(backWall);
        this.addCollider(backWall);

        // Front Wall (Behind player start)
        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(60, 10, 1), wallMat);
        frontWall.position.set(0, 5, 50);
        this.scene.add(frontWall);
        this.addCollider(frontWall);

        // Left Wall
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 100), wallMat);
        leftWall.position.set(-30, 5, 0);
        this.scene.add(leftWall);
        this.addCollider(leftWall);

        // Right Wall
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 100), wallMat);
        rightWall.position.set(30, 5, 0);
        this.scene.add(rightWall);
        this.addCollider(rightWall);
    }

    addCollider(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push(box);
    }

    organizeLayout() {
        const categories = {};

        // Group games
        Object.entries(this.gameRegistry).forEach(([id, game]) => {
            const cat = game.category || 'Misc';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({ id, ...game });
        });

        const catNames = Object.keys(categories).sort();

        // Layout Config
        let currentZ = 10;
        const aisleSpacing = 16; // Wider aisles
        const cabinetSpacing = 3.0; // Space between machines

        catNames.forEach((cat, index) => {
            const games = categories[cat];

            // Create Aisle Sign (Hanging from ceiling)
            this.createNeonSign(cat, 0, 7, currentZ - 2);

            // Floor Marker (Text on floor)
            this.createFloorMarker(cat, 0, 0.05, currentZ);

            // Left Row (x=-6) and Right Row (x=6)

            games.forEach((game, i) => {
                const isLeft = i % 2 === 0;
                const offsetZ = Math.floor(i / 2) * cabinetSpacing;
                const zPos = currentZ - offsetZ - 2; // Start a bit behind the sign

                if (isLeft) {
                    this.createCabinet(-6, 0, zPos, Math.PI / 2, game.id, game);
                } else {
                    this.createCabinet(6, 0, zPos, -Math.PI / 2, game.id, game);
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

        ctx.font = 'bold 60px "Press Start 2P", Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.fillText(text.toUpperCase(), 256, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const geo = new THREE.PlaneGeometry(10, 2.5);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.rotation.y = Math.PI; // Face entrance
        this.scene.add(mesh);
    }

    createFloorMarker(text, x, y, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.toUpperCase(), 256, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, side: THREE.FrontSide });
        const geo = new THREE.PlaneGeometry(8, 2);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.rotation.x = -Math.PI/2;
        this.scene.add(mesh);
    }

    createTeleporter() {
        const group = new THREE.Group();
        group.position.set(0, 0, -45); // Back of room

        // Base
        const padGeo = new THREE.CylinderGeometry(2, 2, 0.1, 32);
        const padMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.5 });
        const pad = new THREE.Mesh(padGeo, padMat);
        group.add(pad);

        // Particles
        const partGeo = new THREE.BufferGeometry();
        const count = 50;
        const pos = new Float32Array(count * 3);
        for(let i=0; i<count*3; i++) pos[i] = (Math.random()-0.5)*3;
        partGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const partMat = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.1 });
        const parts = new THREE.Points(partGeo, partMat);
        parts.position.y = 1;
        group.add(parts);

        // Label
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#ffaa00';
        ctx.textAlign = 'center';
        ctx.fillText("TROPHY ROOM", 128, 40);
        const tex = new THREE.CanvasTexture(canvas);
        const label = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 0.75),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
        );
        label.position.set(0, 2.5, 0);
        group.add(label);

        group.userData = { isTeleporter: true, target: 'TROPHY_ROOM' };
        this.scene.add(group);

        // Trigger
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshBasicMaterial({ visible: false }));
        trigger.position.set(0, 1.5, -45);
        this.scene.add(trigger);
        this.teleporterTrigger = trigger;
    }

    createCabinet(x, y, z, rotation, id, gameInfo) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotation;

        // Fetch Equipped Style
        const saveSystem = SaveSystem.getInstance();
        const cabinetStyle = saveSystem.getEquippedItem('cabinet') || 'default';

        let bodyColor = 0x333333;
        if (cabinetStyle === 'wood') bodyColor = 0x5c4033;
        else if (cabinetStyle === 'carbon') bodyColor = 0x111111;
        else if (cabinetStyle === 'gold') bodyColor = 0xffd700;

        // Cabinet Mesh
        const bodyGeo = new THREE.BoxGeometry(1.2, 2.2, 1.0);
        const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.1;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Screen
        const screenGeo = new THREE.PlaneGeometry(0.9, 0.7);
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 192;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0,0,256,192);
        ctx.fillStyle = this.getNeonColor(id);
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameInfo.name, 128, 100);

        const tex = new THREE.CanvasTexture(canvas);
        const screenMat = new THREE.MeshBasicMaterial({ map: tex });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.5, 0.51);
        group.add(screen);

        // Marquee
        const marqGeo = new THREE.BoxGeometry(1.2, 0.3, 1.0);
        const marqMat = new THREE.MeshStandardMaterial({ color: this.getNeonColor(id), emissive: this.getNeonColor(id), emissiveIntensity: 0.5 });
        const marq = new THREE.Mesh(marqGeo, marqMat);
        marq.position.set(0, 2.35, 0);
        group.add(marq);

        group.userData = { gameId: id };
        this.scene.add(group);
        this.addCollider(body);
        this.cabinets.push(group);
    }

    getNeonColor(id) {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    }

    // --- Input & Update ---

    update(dt) {
        if (!this.isActive || !this.scene) return;

        if (this.renderer && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        this.handleMovement(dt);
        this.checkInteractions();
    }

    handleMovement(dt) {
        const moveSpeed = this.player.speed * dt;
        const velocity = new THREE.Vector3();

        // Keyboard
        if (this.inputManager.isKeyDown('KeyW') || this.inputManager.isKeyDown('ArrowUp')) velocity.z -= 1;
        if (this.inputManager.isKeyDown('KeyS') || this.inputManager.isKeyDown('ArrowDown')) velocity.z += 1;
        if (this.inputManager.isKeyDown('KeyA') || this.inputManager.isKeyDown('ArrowLeft')) velocity.x -= 1;
        if (this.inputManager.isKeyDown('KeyD') || this.inputManager.isKeyDown('ArrowRight')) velocity.x += 1;

        // Joystick
        if (this.joystick.active) {
            const dx = this.joystick.current.x - this.joystick.origin.x;
            const dy = this.joystick.current.y - this.joystick.origin.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 10) { // Deadzone
                velocity.x += dx / 50; // Sensitivity
                velocity.z += dy / 50;
            }
        }

        // Normalize and Apply Camera Rotation
        if (velocity.length() > 0) {
            if (velocity.length() > 1) velocity.normalize();
            velocity.multiplyScalar(moveSpeed);

            const euler = new THREE.Euler(0, this.camera.rotation.y, 0, 'YXZ');
            velocity.applyEuler(euler);

            this.navTarget = null;
        }

        // Click-to-Move
        if (this.navTarget) {
            const dir = new THREE.Vector3().subVectors(this.navTarget, this.player.position);
            dir.y = 0;
            const dist = dir.length();
            if (dist < 0.2) {
                this.navTarget = null;
            } else {
                dir.normalize().multiplyScalar(Math.min(moveSpeed, dist));
                velocity.add(dir);
            }
        }

        const nextPos = this.player.position.clone().add(velocity);

        // Collisions
        let collided = false;
        // Check bounds
        if (Math.abs(nextPos.x) > 28 || Math.abs(nextPos.z) > 48) collided = true;

        const playerBox = new THREE.Box3().setFromCenterAndSize(nextPos, new THREE.Vector3(1, 2, 1));
        for (let box of this.colliders) {
            if (box.intersectsBox(playerBox)) {
                collided = true;
                break;
            }
        }

        if (!collided) {
            this.player.position.copy(nextPos);
            this.camera.position.set(this.player.position.x, this.player.height, this.player.position.z);
        }

        if (this.teleporterTrigger) {
            const dist = this.player.position.distanceTo(this.teleporterTrigger.position);
            if (dist < 2.5) {
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
            while(obj.parent && !obj.userData.gameId) {
                obj = obj.parent;
            }
            if (obj.userData && obj.userData.gameId) {
                hovered = true;
            }
        }

        if (hovered) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = this.isDragging ? 'grabbing' : 'default';
        }
    }

    onMouseDown(event) {
        if (!this.isActive) return;
        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (this.isDragging) {
            const deltaX = event.clientX - this.previousMousePosition.x;
            const deltaY = event.clientY - this.previousMousePosition.y;

            this.camera.rotation.y -= deltaX * 0.003;
            this.camera.rotation.x -= deltaY * 0.003;
            this.camera.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.camera.rotation.x));

            this.previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onTouchStart(event) {
        // Check if touching Joystick
        let touchingJoystick = false;
        for(let i=0; i<event.changedTouches.length; i++) {
             const t = event.changedTouches[i];
             const el = document.elementFromPoint(t.clientX, t.clientY);
             if(this.joystickEl && (el === this.joystickEl || this.joystickEl.contains(el))) {
                 touchingJoystick = true;
             }
        }

        if (touchingJoystick) return;

        // Camera Look
         if (event.touches.length === 1) {
            this.isDragging = true;
            this.previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
         }
    }

    onTouchMove(event) {
        if (this.joystick.active) {
            // Update joystick
             for(let i=0; i<event.changedTouches.length; i++) {
                 if (event.changedTouches[i].identifier === this.joystick.id) {
                     this.joystick.current = { x: event.changedTouches[i].clientX, y: event.changedTouches[i].clientY };
                     this.updateJoystickVisual();
                 }
             }
        }

        if (this.isDragging && event.touches.length === 1 && !this.joystick.active) {
            event.preventDefault();
            const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
            const deltaY = event.touches[0].clientY - this.previousMousePosition.y;

            this.camera.rotation.y -= deltaX * 0.005;
            this.camera.rotation.x -= deltaY * 0.005;
            this.camera.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.camera.rotation.x));

            this.previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
    }

    onTouchEnd(event) {
         for(let i=0; i<event.changedTouches.length; i++) {
             if (event.changedTouches[i].identifier === this.joystick.id) {
                 this.joystick.active = false;
                 this.updateJoystickVisual();
             }
         }
         this.isDragging = false;
    }

    onClick(event) {
        if (!this.isActive || this.isDragging) return;
        if (this.joystick.active) return; // Don't click if using joystick

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            let obj = intersects[0].object;

            while(obj.parent && !obj.userData.gameId) {
                obj = obj.parent;
            }

            if (obj.userData && obj.userData.gameId) {
                const dist = this.player.position.distanceTo(obj.position);
                if (dist < 4.0) {
                    if (this.onGameSelect) this.onGameSelect(obj.userData.gameId);
                } else {
                    const dir = new THREE.Vector3().subVectors(this.player.position, obj.position).normalize().multiplyScalar(2.0);
                    this.navTarget = new THREE.Vector3().addVectors(obj.position, dir);
                    this.navTarget.y = this.player.position.y;
                }
                return;
            }

            this.navTarget = point;
            this.navTarget.y = this.player.position.y;
        }
    }

    onResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    resume() {
        this.isActive = true;
        if(this.container) this.container.style.display = 'block';
        if(this.joystickEl && ('ontouchstart' in window)) this.joystickEl.style.display = 'block';
    }

    pause() {
        this.isActive = false;
        if(this.container) this.container.style.display = 'none';
        if(this.joystickEl) this.joystickEl.style.display = 'none';
    }
}
