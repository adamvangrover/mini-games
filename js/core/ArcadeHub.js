export default class ArcadeHub {
    constructor(container, gameRegistry, onGameSelect) {
        this.container = container;
        this.gameRegistry = gameRegistry;
        this.onGameSelect = onGameSelect;

        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.cabinets = [];
        this.isHovering = false;
        this.isActive = true;

        // Navigation State
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.cameraRotation = { x: 0, y: 0 }; 

        this.init();
    }

    init() {
        // --- Scene Setup (From Overhaul: Better Colors/Fog) ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

        // --- Camera Setup ---
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 0.1); // Center of room

        // --- Renderer Setup ---
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio); // Added from Main
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Append to container (Overhaul style)
        if (this.container) {
            this.container.appendChild(this.renderer.domElement);
        } else {
            console.error("ArcadeHub: No container provided.");
            return;
        }

        // --- Lighting (From Overhaul: Neon Theme) ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);

        // Neon Points
        this.createNeonLight(0, 5, 0, 0xff00ff, 2, 20);     // Center Magenta
        this.createNeonLight(-10, 5, -10, 0x00ffff, 2, 20); // Left Cyan
        this.createNeonLight(10, 5, -10, 0xffff00, 2, 20);  // Right Yellow

        // --- Environment ---
        this.createFloor();
        this.generateCabinets();
        this.createTeleporter();

        // --- Event Listeners ---
        window.addEventListener('resize', this.onResize.bind(this));

        // Mouse Events
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

        // Touch Events (Adapted from Main to work with Overhaul rotation)
        this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.onMouseUp.bind(this));

        // Start Loop
        this.animate();
    }

    createNeonLight(x, y, z, color, intensity, distance) {
        const light = new THREE.PointLight(color, intensity, distance);
        light.position.set(x, y, z);
        this.scene.add(light);
    }

    createFloor() {
        // Using Overhaul's Grid+Standard Material for better retro aesthetics
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.1,
            metalness: 0.8,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;

        // Retro Grid
        const gridHelper = new THREE.GridHelper(100, 50, 0xff00ff, 0x222222);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        this.scene.add(floor);

        // Add some ambient particles (dust/stars)
        const particlesGeo = new THREE.BufferGeometry();
        const particlesCount = 200;
        const posArray = new Float32Array(particlesCount * 3);

        for(let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 40;
        }

        particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMat = new THREE.PointsMaterial({
            size: 0.05,
            color: 0xffffff,
            transparent: true,
            opacity: 0.5
        });
        const particles = new THREE.Points(particlesGeo, particlesMat);
        particles.position.y = 2;
        this.scene.add(particles);
    }

    createTeleporter() {
        // A special area to go to Trophy Room
        const group = new THREE.Group();
        group.position.set(0, 0, 8); // Behind start position

        // Pad
        const padGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32);
        const padMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.2 });
        const pad = new THREE.Mesh(padGeo, padMat);
        group.add(pad);

        // Ring
        const ringGeo = new THREE.TorusGeometry(1.2, 0.1, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.5;
        group.add(ring);

        // Floating Text
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
        // label.lookAt(0, 1.6, 0.1); // Look at camera start pos roughly
        // We'll make it billboard in animate
        group.add(label);
        this.label = label; // Store ref

        group.userData = { isTeleporter: true, target: 'TROPHY_ROOM' };
        this.teleporter = group;
        this.scene.add(group);
    }

    generateCabinets() {
        const games = Object.entries(this.gameRegistry);
        const radius = 8;
        const count = games.length;
        const angleStep = (Math.PI * 2) / count;

        games.forEach(([id, game], index) => {
            const angle = index * angleStep;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;

            // Face center: angle + PI
            this.createCabinet(x, 0, z, angle + Math.PI, id, game);
        });
    }

    // Using Overhaul's high-detail cabinet generation
    createCabinet(x, y, z, rotation, id, gameInfo) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotation;

        // Cabinet Body
        const bodyGeo = new THREE.BoxGeometry(1.2, 2.2, 1.0);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.1;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Screen (Emissive Texture)
        const screenGeo = new THREE.PlaneGeometry(0.9, 0.7);
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        
        // Draw screen content
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 512, 384);
        ctx.fillStyle = this.getNeonColor(id);
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameInfo.name, 256, 192);
        // Add a glow line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, 472, 344);

        const texture = new THREE.CanvasTexture(canvas);
        const screenMat = new THREE.MeshBasicMaterial({ map: texture });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.5, 0.51);
        group.add(screen);

        // Marquee (Top)
        const marqueeGeo = new THREE.BoxGeometry(1.2, 0.3, 1.0);
        const marqueeMat = new THREE.MeshStandardMaterial({ 
            color: this.getNeonColor(id), 
            emissive: this.getNeonColor(id), 
            emissiveIntensity: 0.5 
        });
        const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
        marquee.position.set(0, 2.35, 0);
        group.add(marquee);

        // Control Panel & Joystick (High detail geometry)
        const panelGeo = new THREE.BoxGeometry(1.2, 0.1, 0.5);
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, 1.1, 0.6);
        panel.rotation.x = 0.2;
        group.add(panel);

        const joyGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2);
        const joyMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const joy = new THREE.Mesh(joyGeo, joyMat);
        joy.position.set(-0.3, 1.25, 0.65);
        joy.rotation.x = 0.2;
        group.add(joy);

        // Buttons
        const btnGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05);
        const btnMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const btn1 = new THREE.Mesh(btnGeo, btnMat);
        btn1.position.set(0.1, 1.15, 0.65);
        btn1.rotation.x = 0.2;
        group.add(btn1);

        const btn2 = new THREE.Mesh(btnGeo, btnMat);
        btn2.position.set(0.3, 1.15, 0.65);
        btn2.rotation.x = 0.2;
        group.add(btn2);

        // Store metadata on the group for easy Raycasting retrieval
        group.userData = { gameId: id }; 
        this.cabinets.push(group);
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

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // --- Input Handling ---

    onMouseDown(event) {
        if (!this.isActive) return;
        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    onTouchStart(event) {
        if (!this.isActive || event.touches.length !== 1) return;
        event.preventDefault(); // Prevent scrolling
        this.isDragging = true;
        this.previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onMouseMove(event) {
        // Raycaster update
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (this.isDragging) {
            this.handleCameraRotation(event.clientX, event.clientY);
        }
    }

    onTouchMove(event) {
        if (this.isDragging && event.touches.length === 1) {
            event.preventDefault();
            this.handleCameraRotation(event.touches[0].clientX, event.touches[0].clientY);
        }
    }

    handleCameraRotation(clientX, clientY) {
        const deltaMove = {
            x: clientX - this.previousMousePosition.x,
            y: clientY - this.previousMousePosition.y
        };

        const rotationSpeed = 0.005;
        this.cameraRotation.y -= deltaMove.x * rotationSpeed;
        this.cameraRotation.x -= deltaMove.y * rotationSpeed;

        // Clamp vertical rotation so user doesn't flip over
        this.cameraRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraRotation.x));

        // Apply rotation
        this.camera.rotation.x = this.cameraRotation.x;
        this.camera.rotation.y = this.cameraRotation.y;
        this.camera.rotation.z = 0; 

        this.previousMousePosition = { x: clientX, y: clientY };
    }

    onClick(event) {
        if (!this.isActive) return;

        // Update raycaster for click (incase mouse didn't move)
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            let object = intersects[0].object;

            // Check up the tree
            let current = object;
            while(current) {
                if (current.userData && current.userData.gameId) {
                    if (this.onGameSelect) {
                        this.onGameSelect(current.userData.gameId);
                    }
                    return;
                }
                if (current.userData && current.userData.isTeleporter) {
                    if (this.onGameSelect) {
                        // Using 'TROPHY_ROOM' as a special game ID that main.js handles
                        this.onGameSelect('TROPHY_ROOM');
                    }
                    return;
                }
                current = current.parent;
            }
        }
    }

    animate() {
        if (!this.renderer) return;
        
        requestAnimationFrame(this.animate.bind(this));

        if(!this.isActive) return;

        // --- Hover Effects (From Overhaul) ---
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        let hovered = false;
        if (intersects.length > 0) {
            let object = intersects[0].object;
            while(object.parent && !object.userData.gameId) {
                object = object.parent;
            }
            if (object.userData && object.userData.gameId) {
                hovered = true;
            }
        }

        if (hovered) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = this.isDragging ? 'grabbing' : 'grab';
        }

        // --- Floating Animation (From Main) ---
        // Subtle floating effect adds life to the scene
        const time = Date.now() * 0.001;
        this.cabinets.forEach((cab, i) => {
             cab.position.y = Math.sin(time + i) * 0.05; 
        });

        // Teleporter animation
        if (this.teleporter) {
             const ring = this.teleporter.children.find(c => c.geometry.type === 'TorusGeometry');
             if(ring) {
                 ring.position.y = 0.5 + Math.sin(time * 2) * 0.1;
                 ring.rotation.x = Math.PI/2 + Math.sin(time) * 0.1;
             }
             if (this.label) {
                 this.label.lookAt(this.camera.position);
             }
        }

        this.renderer.render(this.scene, this.camera);
    }

    resume() {
        this.isActive = true;
        this.container.style.display = 'block';
        this.onResize();
    }

    pause() {
        this.isActive = false;
        this.container.style.display = 'none';
        document.body.style.cursor = 'default';
    }
}