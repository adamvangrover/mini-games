import SaveSystem from './SaveSystem.js';
import InputManager from './InputManager.js';
import SoundManager from './SoundManager.js';

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
        this.colliders = []; 
        this.walls = [];
        this.ceilingLights = [];
        this.ghostPlayers = [];
        this.interactables = []; // New generic interactables system
        this.interactionTargets = []; // Optimization: Only raycast against these
        
        // State
        this.isHovering = false;
        this.isActive = true;

        // UI State (DOM Optimization)
        this.tooltip = null;
        this.lastCursor = '';

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

        // Mobile Joystick State
        this.joystick = { 
            active: false, 
            origin: {x:0, y:0}, 
            current: {x:0, y:0}, 
            id: null 
        };

        this.init();
    }

    init() {
        try {
            // --- Scene Setup ---
            const saveSystem = SaveSystem.getInstance();
            const theme = saveSystem.getEquippedItem('theme') || 'blue';
            this.currentSkin = saveSystem.getEquippedItem('hub_skin') || 'default';

            // Theme Colors
            const themeColors = {
                blue: { bg: 0x050510, fog: 0x050510, grid: 0x00ffff, light: 0x0088ff },
                pink: { bg: 0x100505, fog: 0x100505, grid: 0xff00ff, light: 0xff0088 },
                gold: { bg: 0x101005, fog: 0x101005, grid: 0xffd700, light: 0xffaa00 },
                green: { bg: 0x001000, fog: 0x001000, grid: 0x00ff00, light: 0x00ff00 },
                red:  { bg: 0x100000, fog: 0x100000, grid: 0xff0000, light: 0xff0000 }
            };
            let colors = themeColors[theme] || themeColors.blue;

            // Apply Skin Overrides
            if (this.currentSkin === 'retro_future') {
                colors = { bg: 0x2d004d, fog: 0x2d004d, grid: 0xff00ff, light: 0x00ffff };
            } else if (this.currentSkin === 'gibson') {
                colors = { bg: 0x000000, fog: 0x000000, grid: 0x00ff00, light: 0x00ff00 };
            } else if (this.currentSkin === 'stephenson') {
                colors = { bg: 0x808080, fog: 0x808080, grid: 0xffffff, light: 0xffffff };
            }

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(colors.bg);
            this.scene.fog = new THREE.FogExp2(colors.fog, this.currentSkin === 'gibson' ? 0.04 : 0.02);

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
                this.createVirtualJoystick(); // Add Mobile Controls
            } else {
                return;
            }

            // --- Lighting ---
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
            this.scene.add(ambientLight);

            // Ceiling Lights
            this.createCeilingLight(0, 9, 0, colors.light, 2.0, 40);
            this.createCeilingLight(0, 9, -15, colors.light, 2.0, 40);
            this.createCeilingLight(0, 9, 15, colors.light, 2.0, 40);
            this.createCeilingLight(0, 9, -30, colors.light, 2.0, 40);

            // --- Environment & Layout ---
            this.createRoom(colors);
            this.organizeLayout();
            this.createTeleporter();
            this.createNavMarker();
            this.createGhostPlayers();

            // --- New Interactables ---
            this.createJukebox(15, 0, 20); // Near entrance, right side
            this.createVendingMachine(-15, 0, 20); // Near entrance, left side
            this.createJobBoard(0, 0, 15); // Center aisle

            // --- Event Listeners ---
            window.addEventListener('resize', this.onResize.bind(this));

            // Mouse
            this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

            // Touch (Delegated)
            this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            window.addEventListener('touchend', this.onTouchEnd.bind(this));

            // Start Loop
            this.animate();

        } catch (e) {
            console.error("ArcadeHub: WebGL Initialization Failed.", e);
            if (this.onFallback) this.onFallback();
        }
    }

    // --- Interactables Creation ---

    createJukebox(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        // Face the player entering
        group.rotation.y = -Math.PI / 4;

        // Main Body
        const bodyGeo = new THREE.BoxGeometry(2, 4, 1.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x330033, metalness: 0.8, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 2;
        group.add(body);

        // Neon Tubes
        const tubeGeo = new THREE.CylinderGeometry(0.1, 0.1, 4);
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 2 });
        const leftTube = new THREE.Mesh(tubeGeo, tubeMat);
        leftTube.position.set(-1.1, 2, 0.8);
        group.add(leftTube);

        const rightTube = new THREE.Mesh(tubeGeo, tubeMat);
        rightTube.position.set(1.1, 2, 0.8);
        group.add(rightTube);

        // Label
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black'; ctx.fillRect(0,0,256,128);
        ctx.font = 'bold 30px Arial'; ctx.fillStyle = '#00ffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('JUKEBOX', 128, 64);
        const label = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
        label.position.set(0, 3, 0.8);
        group.add(label);

        // Interact Data
        group.userData = {
            isInteractable: true,
            type: 'JUKEBOX',
            tooltip: 'Change Music'
        };

        this.scene.add(group);
        this.addCollider(body);
        this.interactables.push(group);
        this.interactionTargets.push(group);

        // Add a floating note particle system around it
        // (Simplified for now, maybe add later)
    }

    createVendingMachine(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = Math.PI / 4;

        // Body
        const bodyGeo = new THREE.BoxGeometry(2, 4, 1.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x003366, metalness: 0.5 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 2;
        group.add(body);

        // Glass Front
        const glassGeo = new THREE.PlaneGeometry(1.6, 2.5);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.3, metalness: 0.9, roughness: 0.1 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 2.2, 0.76);
        group.add(glass);

        // Products (Low poly cans)
        for(let i=0; i<3; i++) {
            for(let j=0; j<3; j++) {
                const can = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8),
                    new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
                );
                can.rotation.x = Math.PI / 2;
                can.position.set(-0.5 + i*0.5, 1.5 + j*0.5, 0.5);
                group.add(can);
            }
        }

        // Label
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111'; ctx.fillRect(0,0,256,64);
        ctx.font = 'bold 24px Arial'; ctx.fillStyle = '#00ff00'; ctx.textAlign = 'center'; ctx.fillText('SPEED BOOST', 128, 40);
        const label = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
        label.position.set(0, 3.7, 0.76);
        group.add(label);

        group.userData = {
            isInteractable: true,
            type: 'VENDING',
            tooltip: 'Get Energy Drink'
        };

        this.scene.add(group);
        this.addCollider(body);
        this.interactables.push(group);
        this.interactionTargets.push(group);
    }

    createJobBoard(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Stand
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 2, 8),
            new THREE.MeshStandardMaterial({ color: 0x555 })
        );
        pole.position.y = 1;
        group.add(pole);

        // Board
        const board = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1.5, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 }) // Wood
        );
        board.position.y = 2.5;
        group.add(board);

        // Papers attached
        const paperGeo = new THREE.PlaneGeometry(0.4, 0.5);
        const paperMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
        for(let i=0; i<3; i++) {
            const paper = new THREE.Mesh(paperGeo, paperMat);
            paper.position.set(-0.6 + i*0.6, 2.5, 0.06);
            paper.rotation.z = (Math.random() - 0.5) * 0.2;
            group.add(paper);
        }

        // Holographic Title
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,256,64);
        ctx.font = 'bold 36px Arial'; ctx.fillStyle = '#ffff00'; ctx.shadowBlur=10; ctx.shadowColor='#ffff00'; ctx.textAlign = 'center'; ctx.fillText('QUESTS', 128, 45);
        const title = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, side: THREE.DoubleSide }));
        title.position.set(0, 3.4, 0);
        group.add(title);

        group.userData = {
            isInteractable: true,
            type: 'JOB_BOARD',
            tooltip: 'Daily Quests'
        };

        this.scene.add(group);
        this.addCollider(board); // Small collider
        this.interactables.push(group);
        this.interactionTargets.push(group);
    }


    // --- UI: Virtual Joystick ---

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
            display: none;
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

        // Joystick-specific touch listeners
        this.joystickEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Don't bubble to camera drag
            const touch = e.changedTouches[0];
            this.joystick.id = touch.identifier;
            this.joystick.active = true;
            this.joystick.origin = { x: touch.clientX, y: touch.clientY };
            this.joystick.current = { x: touch.clientX, y: touch.clientY };
            this.updateJoystickVisual();
        }, { passive: false });
    }

    updateJoystickVisual() {
        if (!this.joystick.active) {
            this.knobEl.style.transform = `translate(-50%, -50%)`;
            return;
        }
        const dx = this.joystick.current.x - this.joystick.origin.x;
        const dy = this.joystick.current.y - this.joystick.origin.y;
        
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = 35; 
        
        let visualX = dx;
        let visualY = dy;

        if (dist > maxDist) {
            visualX = (dx / dist) * maxDist;
            visualY = (dy / dist) * maxDist;
        }

        this.knobEl.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
    }

    // --- 3D Environment ---

    createCeilingLight(x, y, z, color, intensity, distance) {
        const light = new THREE.PointLight(color, intensity, distance);
        light.position.set(x, y, z);
        this.scene.add(light);
        this.ceilingLights.push(light);

        // Glow mesh
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);

        // Save base intensity for visualizer
        light.userData.baseIntensity = intensity;
    }

    createRoom(colors) {
        let floorColor = 0x111111;
        let floorMetalness = 0.6;
        let floorRoughness = 0.1;
        let wallColor = 0x222222;
        let isWireframe = false;

        if (this.currentSkin === 'retro_future') {
            floorColor = 0x1a0b2e;
            wallColor = 0x3d0066;
        } else if (this.currentSkin === 'gibson') {
            floorColor = 0x000000;
            wallColor = 0x001100;
            floorMetalness = 0.9;
            floorRoughness = 0.0;
            isWireframe = true;
        } else if (this.currentSkin === 'stephenson') {
            floorColor = 0x333333;
            wallColor = 0x555555;
            floorMetalness = 0.2;
            floorRoughness = 0.8;
        }

        // Floor
        const floorGeo = new THREE.PlaneGeometry(60, 80);
        const floorMat = new THREE.MeshStandardMaterial({
            color: floorColor,
            roughness: floorRoughness,
            metalness: floorMetalness,
            side: THREE.FrontSide,
            wireframe: isWireframe
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.floor = floor; // Reference

        // Grid on floor
        const gridHelper = new THREE.GridHelper(60, 30, colors.grid, this.currentSkin === 'gibson' ? 0x003300 : 0x222222);
        gridHelper.position.y = 0.02;
        this.scene.add(gridHelper);

        // Ceiling
        const ceilGeo = new THREE.PlaneGeometry(60, 80);
        const ceilMat = new THREE.MeshStandardMaterial({
            color: this.currentSkin === 'gibson' ? 0x000000 : 0x050505,
            emissive: this.currentSkin === 'gibson' ? 0x000000 : 0x050505,
            wireframe: isWireframe
        });
        const ceil = new THREE.Mesh(ceilGeo, ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.y = 10;
        this.scene.add(ceil);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({
            color: wallColor,
            roughness: 0.8,
            wireframe: isWireframe
        });

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

        // Extra Stephenson Noise (Static)
        if (this.currentSkin === 'stephenson') {
            this.createStaticNoise();
        } else {
            this.createAmbientParticles();
        }
    }

    createStaticNoise() {
        // Simple particle system for static
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 5000; i++) {
            vertices.push(Math.random() * 60 - 30);
            vertices.push(Math.random() * 10);
            vertices.push(Math.random() * 80 - 40);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.3 });
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
    }

    createAmbientParticles() {
        // Floating dust/neon motes
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];
        const color = new THREE.Color();

        for (let i = 0; i < particleCount; i++) {
            vertices.push(Math.random() * 60 - 30);
            vertices.push(Math.random() * 12); // Height
            vertices.push(Math.random() * 80 - 40);

            // Random neon colors
            if (Math.random() > 0.5) color.setHex(0x00ffff); // Cyan
            else color.setHex(0xff00ff); // Magenta

            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
        this.ambientParticles = new THREE.Points(geometry, material);
        this.scene.add(this.ambientParticles);
    }

    addCollider(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push(box);
    }

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

        // Save for visualizer
        light.userData.baseIntensity = 1.5;
        this.ceilingLights.push(light); // Add to lights array for pulsing
    }

    createCabinet(x, y, z, rotation, id, gameInfo) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotation;

        const saveSystem = SaveSystem.getInstance();
        const cabinetStyle = saveSystem.getEquippedItem('cabinet') || 'default';

        let bodyColor = 0x222222;
        if (cabinetStyle === 'wood') bodyColor = 0x5c4033;
        else if (cabinetStyle === 'carbon') bodyColor = 0x111111;
        else if (cabinetStyle === 'gold') bodyColor = 0xffd700;

        const bodyGeo = new THREE.BoxGeometry(1.2, 2.2, 1.0);
        const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.1;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        const screenGeo = new THREE.PlaneGeometry(0.9, 0.7);
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 192;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 192);
        ctx.fillStyle = this.getNeonColor(id);
        ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
        ctx.fillText(gameInfo.name, 128, 100);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 236, 172);

        const screenMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.5, 0.51);
        group.add(screen);

        const marqMat = new THREE.MeshStandardMaterial({ color: this.getNeonColor(id), emissive: this.getNeonColor(id), emissiveIntensity: 0.6 });
        const marq = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.0), marqMat);
        marq.position.set(0, 2.35, 0);
        group.add(marq);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        panel.position.set(0, 1.1, 0.6);
        panel.rotation.x = 0.2;
        group.add(panel);

        if (id === 'neon-hunter' || id === 'neon-hunter-ex') {
            // Add Guns for Neon Hunter (Light Gun Arcade Style)
            const gunGeo = new THREE.BoxGeometry(0.1, 0.1, 0.3);
            const gunMat1 = new THREE.MeshStandardMaterial({ color: 0xff00ff, roughness: 0.3, metalness: 0.8 }); // Pink Gun
            const gunMat2 = new THREE.MeshStandardMaterial({ color: 0x00ffff, roughness: 0.3, metalness: 0.8 }); // Cyan Gun

            // Gun 1 (Left)
            const gun1 = new THREE.Mesh(gunGeo, gunMat1);
            gun1.position.set(-0.3, 1.25, 0.75); // Sticking out a bit more
            gun1.rotation.x = -0.2; // Pointing slightly down/resting
            group.add(gun1);

            // Gun 2 (Right)
            const gun2 = new THREE.Mesh(gunGeo, gunMat2);
            gun2.position.set(0.3, 1.25, 0.75);
            gun2.rotation.x = -0.2;
            group.add(gun2);

            // Cords (Holster/Cable)
            const cordGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4);
            const cordMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

            const cord1 = new THREE.Mesh(cordGeo, cordMat);
            cord1.position.set(-0.3, 1.15, 0.65);
            cord1.rotation.x = 0.8;
            group.add(cord1);

            const cord2 = new THREE.Mesh(cordGeo, cordMat);
            cord2.position.set(0.3, 1.15, 0.65);
            cord2.rotation.x = 0.8;
            group.add(cord2);

        } else {
            // Standard Joystick Setup
            const joy = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
            joy.position.set(-0.3, 1.25, 0.65);
            joy.rotation.x = 0.2;
            group.add(joy);

            // Standard Buttons
            const btnGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05);
            const btnMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x003300 });

            const btn1 = new THREE.Mesh(btnGeo, btnMat);
            btn1.position.set(0.1, 1.16, 0.65);
            btn1.rotation.x = 0.2;
            group.add(btn1);

            const btn2 = new THREE.Mesh(btnGeo, btnMat);
            btn2.position.set(0.3, 1.16, 0.65);
            btn2.rotation.x = 0.2;
            group.add(btn2);
        }

        // Add to cabinets for visualization
        group.userData = { gameId: id, isCabinet: true, marquee: marq };
        this.scene.add(group);
        this.addCollider(body);
        this.cabinets.push(group);
        this.interactionTargets.push(group);
    }

    createTeleporter() {
        const group = new THREE.Group();
        group.position.set(0, 0, -35); // Back of room

        const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.5 })
        );
        group.add(pad);

        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 30px Arial'; ctx.fillStyle = '#ffaa00'; ctx.textAlign = 'center';
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
        this.teleporterTrigger = group;
        this.interactionTargets.push(group);
    }

    createNavMarker() {
        const geometry = new THREE.RingGeometry(0.3, 0.4, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        this.navMarker = new THREE.Mesh(geometry, material);
        this.navMarker.rotation.x = -Math.PI / 2;
        this.navMarker.visible = false;
        this.scene.add(this.navMarker);

        const innerGeo = new THREE.CircleGeometry(0.2, 32);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        const navInner = new THREE.Mesh(innerGeo, innerMat);
        navInner.position.z = 0.01;
        this.navMarker.add(navInner);
    }

    getNeonColor(id) {
        let hash = 0;
        for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    }

    // --- Ghost Players ---

    createGhostPlayers() {
        for(let i=0; i<3; i++) {
            const group = new THREE.Group();

            // Droid body
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 1, 8),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 })
            );
            body.position.y = 0.8;
            group.add(body);

            // Eye
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00 })
            );
            eye.position.set(0, 1.2, 0.2);
            group.add(eye);

            // Initial pos
            group.position.set(
                (Math.random() * 10 - 5),
                0,
                (Math.random() * 20 - 10)
            );

            // Make interactable
            group.userData = {
                isInteractable: true,
                type: 'GHOST',
                tooltip: 'Chat',
                name: 'Ghost ' + i
            };

            this.scene.add(group);
            this.interactionTargets.push(group); // Add to interactive list
            this.ghostPlayers.push({
                mesh: group,
                target: this.getRandomGhostTarget(),
                state: 'moving', // moving, idle
                timer: 0
            });
        }
    }

    getRandomGhostTarget() {
        return new THREE.Vector3(
            (Math.random() * 14 - 7),
            0,
            (Math.random() * 60 - 30)
        );
    }

    updateGhostPlayers(dt) {
        this.ghostPlayers.forEach(ghost => {
            if (ghost.state === 'moving') {
                const dir = new THREE.Vector3().subVectors(ghost.target, ghost.mesh.position);
                const dist = dir.length();
                if (dist < 0.5) {
                    ghost.state = 'idle';
                    ghost.timer = 2 + Math.random() * 3;
                } else {
                    dir.normalize();
                    ghost.mesh.position.add(dir.multiplyScalar(2 * dt));
                    ghost.mesh.lookAt(ghost.target);
                }
            } else if (ghost.state === 'idle') {
                ghost.timer -= dt;
                // Idle animation
                ghost.mesh.position.y = Math.sin(Date.now() * 0.005) * 0.1;
                if (ghost.timer <= 0) {
                    ghost.state = 'moving';
                    ghost.target = this.getRandomGhostTarget();
                }
            }
        });
    }

    // --- Audio Visualization ---

    updateAudioVisuals(dt) {
        const soundManager = SoundManager.getInstance();
        const data = soundManager.getAudioData();
        if (data.length === 0) return;

        // Calculate average volume (bass focused)
        let sum = 0;
        const bassCount = Math.floor(data.length / 4);
        for(let i=0; i<bassCount; i++) {
            sum += data[i];
        }
        const avg = sum / bassCount; // 0-255
        const intensity = avg / 255;

        // Pulse Ceiling Lights
        this.ceilingLights.forEach(light => {
            if (light.userData.baseIntensity) {
                light.intensity = light.userData.baseIntensity * (1 + intensity * 0.5);
            }
        });

        // Pulse Cabinets
        this.cabinets.forEach((cab, i) => {
             // Offset pulse by index for wave effect
             const offset = i * 10;
             const val = data[(offset % data.length)];
             const localIntensity = val / 255;

             if (cab.userData.marquee) {
                 cab.userData.marquee.material.emissiveIntensity = 0.6 + localIntensity * 2.0;
             }
        });
    }

    // --- Update Loop & Movement ---

    update(dt) {
        if (!this.isActive || !this.scene) return;

        // Render
        if (this.renderer && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        // Logic
        this.handleMovement(dt);
        this.checkInteractions();

        // Animate Ambient Particles (From Feature Branch)
        if (this.ambientParticles) {
            const positions = this.ambientParticles.geometry.attributes.position.array;
            for(let i = 0; i < positions.length; i += 3) {
                positions[i+1] += Math.sin(this.clock.getElapsedTime() + positions[i]) * 0.005;
                if (positions[i+1] > 12) positions[i+1] = 0;
            }
            this.ambientParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Ghost Players and Audio (From Main Branch)
        this.updateGhostPlayers(dt);
        this.updateAudioVisuals(dt);
    }

    animate() {
        if (!this.isActive) return;
        requestAnimationFrame(this.animate.bind(this));
        
        const dt = this.clock.getDelta();
        this.update(dt);
    }

    handleMovement(dt) {
        // 
        // This function merges keyboard input with mobile joystick input.

        const velocity = new THREE.Vector3();
        const isSprinting = this.inputManager.isKeyDown('ShiftLeft');
        const moveSpeed = this.player.speed * (isSprinting ? 1.5 : 1.0) * dt;

        // 1. Keyboard Input
        if (this.inputManager.isKeyDown('KeyW') || this.inputManager.isKeyDown('ArrowUp')) velocity.z -= 1;
        if (this.inputManager.isKeyDown('KeyS') || this.inputManager.isKeyDown('ArrowDown')) velocity.z += 1;
        if (this.inputManager.isKeyDown('KeyA') || this.inputManager.isKeyDown('ArrowLeft')) velocity.x -= 1;
        if (this.inputManager.isKeyDown('KeyD') || this.inputManager.isKeyDown('ArrowRight')) velocity.x += 1;

        // 2. Joystick Input
        if (this.joystick.active) {
            const dx = this.joystick.current.x - this.joystick.origin.x;
            const dy = this.joystick.current.y - this.joystick.origin.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 10) { // Deadzone
                velocity.x += dx / 50; 
                velocity.z += dy / 50;
            }
        }

        if (velocity.length() > 0) {
            if (velocity.length() > 1 && !this.joystick.active) velocity.normalize(); // Normalize keyboard, keep analog for joystick
            velocity.multiplyScalar(moveSpeed);
            
            // Move relative to Camera Yaw (Y-rotation)
            const euler = new THREE.Euler(0, this.yaw, 0, 'YXZ');
            velocity.applyEuler(euler);
            
            this.navTarget = null; // Manual input overrides click-move
        }

        // 3. Click-to-Move Logic
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

        // --- Collision & Apply ---
        const nextPos = this.player.position.clone().add(velocity);
        let collided = false;

        // Room Bounds
        if (Math.abs(nextPos.x) > 28 || Math.abs(nextPos.z) > 42) collided = true;

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
            this.navTarget = null;
        }

        this.camera.position.set(this.player.position.x, this.player.height, this.player.position.z);
        
        // Trigger Check
        if (this.teleporterTrigger) {
            if (this.player.position.distanceTo(this.teleporterTrigger.position) < 2.5) {
                if (this.onGameSelect) this.onGameSelect('TROPHY_ROOM');
            }
        }
    }

    checkInteractions() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Bolt Optimization: Only raycast against interactive targets instead of entire scene
        const intersects = this.raycaster.intersectObjects(this.interactionTargets, true);
        
        let hovered = false;
        let tooltipText = '';

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            // Traverse up to find user data
            while(obj.parent && !obj.userData.gameId && !obj.userData.isTeleporter && !obj.userData.isInteractable) {
                obj = obj.parent;
            }
            if (obj.userData) {
                if (obj.userData.gameId) {
                    hovered = true;
                    tooltipText = obj.userData.name || 'Play Game';
                } else if (obj.userData.isTeleporter) {
                    hovered = true;
                    tooltipText = 'Enter Trophy Room';
                } else if (obj.userData.isInteractable) {
                    hovered = true;
                    tooltipText = obj.userData.tooltip || 'Interact';
                }
            }
        }

        // Bolt Optimization: Debounce cursor updates to avoid redundant DOM writes
        const newCursor = hovered ? 'pointer' : (this.isDragging ? 'grabbing' : 'default');
        if (this.lastCursor !== newCursor) {
            document.body.style.cursor = newCursor;
            this.lastCursor = newCursor;
        }

        // Bolt Optimization: Cache tooltip element and use Transform for performance
        if (!this.tooltip) {
            this.tooltip = document.getElementById('hub-tooltip');
            if (!this.tooltip) {
                this.tooltip = document.createElement('div');
                this.tooltip.id = 'hub-tooltip';
                this.tooltip.className = 'fixed pointer-events-none bg-black/80 text-white px-3 py-1 rounded text-sm z-50 transition-opacity duration-200 border border-white/20';
                this.tooltip.style.top = '0px';
                this.tooltip.style.left = '0px';
                document.body.appendChild(this.tooltip);
            }
        }

        if (hovered && tooltipText) {
            if (this.tooltip.textContent !== tooltipText) {
                this.tooltip.textContent = tooltipText;
            }
            this.tooltip.style.opacity = '1';
            // Bolt Optimization: Use translate3d to avoid layout thrashing
            const x = this.inputManager.mouse.x + 15;
            const y = this.inputManager.mouse.y + 15;
            this.tooltip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        } else {
            this.tooltip.style.opacity = '0';
        }
    }

    // --- Inputs ---

    onMouseDown(event) {
        if (!this.isActive) return;
        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    onMouseMove(e) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (this.isDragging) {
            const dx = e.clientX - this.previousMousePosition.x;
            const dy = e.clientY - this.previousMousePosition.y;

            this.yaw -= dx * this.dragSensitivity;
            this.pitch -= dy * this.dragSensitivity;
            this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));

            this.updateCameraRotation();
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onClick(event) {
        if (!this.isActive || this.isDragging) return;
        if (this.joystick.active) return; // Prevent click interference

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            let obj = intersects[0].object;

            let interactiveObj = obj;
            while(interactiveObj.parent && !interactiveObj.userData.gameId && !interactiveObj.userData.isTeleporter && !interactiveObj.userData.isInteractable) {
                interactiveObj = interactiveObj.parent;
            }

            // Handle Interactions
            if (interactiveObj.userData) {
                const dist = this.player.position.distanceTo(interactiveObj.position);
                const isCloseEnough = dist < 4.5;

                // 1. Games & Teleporter
                if (interactiveObj.userData.gameId || interactiveObj.userData.isTeleporter) {
                    if (isCloseEnough) {
                        const targetId = interactiveObj.userData.gameId || 'TROPHY_ROOM';
                        if (this.onGameSelect) this.onGameSelect(targetId);
                    } else {
                        // Walk to it
                        const dir = new THREE.Vector3().subVectors(this.player.position, interactiveObj.position).normalize().multiplyScalar(2.0);
                        this.navTarget = new THREE.Vector3().addVectors(interactiveObj.position, dir);
                        this.navTarget.y = this.player.position.y;
                    }
                    return;
                }

                // 2. New Interactables
                if (interactiveObj.userData.isInteractable) {
                    if (isCloseEnough) {
                        this.handleGenericInteraction(interactiveObj);
                    } else {
                        // Walk to it
                        const dir = new THREE.Vector3().subVectors(this.player.position, interactiveObj.position).normalize().multiplyScalar(2.5);
                        this.navTarget = new THREE.Vector3().addVectors(interactiveObj.position, dir);
                        this.navTarget.y = this.player.position.y;
                    }
                    return;
                }
            }

            // Default: Move to point
            this.navTarget = point;
            this.navTarget.y = this.player.position.y;
        }
    }

    handleGenericInteraction(obj) {
        const type = obj.userData.type;
        const soundManager = SoundManager.getInstance();

        if (type === 'JUKEBOX') {
            const newStyle = soundManager.nextMusicStyle();
            window.miniGameHub.showToast(`Music changed to: ${newStyle.toUpperCase()}`);
            soundManager.playSound('click');
            // Little bounce effect
            if(obj.scale.y === 1) {
                obj.scale.set(1.1, 1.1, 1.1);
                setTimeout(() => obj.scale.set(1, 1, 1), 200);
            }
        } else if (type === 'VENDING') {
            if (this.player.speed >= 14.0) {
                window.miniGameHub.showToast("You're already maxed out!");
                return;
            }
            soundManager.playSound('powerup'); // Assuming this exists or falls back
            window.miniGameHub.showToast("Speed Boost Acquired!");
            this.player.speed = 14.0;
            // Reset after 10s
            setTimeout(() => {
                this.player.speed = 8.0;
                window.miniGameHub.showToast("Speed Boost Wore Off");
            }, 10000);
        } else if (type === 'JOB_BOARD') {
            soundManager.playSound('click');
            // Trigger overlay via main.js global handler (we'll emit an event or call a method)
            window.dispatchEvent(new CustomEvent('open-quest-board'));
        } else if (type === 'GHOST') {
            const lines = [
                "Have you tried the Konami code?",
                "The boss is watching...",
                "I lost all my coins in Neon Hunter.",
                "Press Shift to sprint!",
                "There is a secret in the Trophy Room.",
                "Alt+B protects you from work."
            ];
            const randomLine = lines[Math.floor(Math.random() * lines.length)];
            window.miniGameHub.showToast(`Ghost: "${randomLine}"`);
            soundManager.playSound('hover');
        }
    }

    // Touch Handling (Smart Delegation)
    onTouchStart(event) {
        // 1. Check Joystick
        let touchingJoystick = false;
        for(let i=0; i<event.changedTouches.length; i++) {
             const t = event.changedTouches[i];
             const el = document.elementFromPoint(t.clientX, t.clientY);
             if(this.joystickEl && (el === this.joystickEl || this.joystickEl.contains(el))) {
                 touchingJoystick = true;
             }
        }
        if (touchingJoystick) return; // Handled by joystick listener

        // 2. Camera Look
        if (!this.isActive || event.touches.length !== 1) return;
        this.isDragging = true;
        this.previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }

    onTouchMove(event) {
        // Joystick update handled in its own state check via handleMovement or its own listener
        if (this.joystick.active) {
             for(let i=0; i<event.changedTouches.length; i++) {
                 if (event.changedTouches[i].identifier === this.joystick.id) {
                     this.joystick.current = { x: event.changedTouches[i].clientX, y: event.changedTouches[i].clientY };
                     this.updateJoystickVisual();
                 }
             }
        }

        if (this.isDragging && event.touches.length === 1 && !this.joystick.active) {
            event.preventDefault();
            const dx = event.touches[0].clientX - this.previousMousePosition.x;
            const dy = event.touches[0].clientY - this.previousMousePosition.y;
            
            this.yaw -= dx * this.dragSensitivity * 1.5;
            this.pitch -= dy * this.dragSensitivity * 1.5;
            this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
            
            this.updateCameraRotation();
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

    updateCameraRotation() {
        if (!this.camera) return;
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
        if(this.joystickEl && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
            this.joystickEl.style.display = 'block';
        }
        this.onResize();
        this.clock.start();
        this.animate();
    }

    pause() {
        this.isActive = false;
        if(this.container) this.container.style.display = 'none';
        if(this.joystickEl) this.joystickEl.style.display = 'none';
        this.clock.stop();
    }
}