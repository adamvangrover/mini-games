
export default class ArcadeHub {
    constructor(container, gameRegistry, loadGameCallback) {
        this.container = container;
        this.gameRegistry = gameRegistry;
        this.loadGameCallback = loadGameCallback;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.cabinets = [];
        this.isHovering = false;

        // Navigation
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.cameraRotation = { x: 0, y: 0 }; // Track accumulated rotation

        this.init();
    }

    init() {
        // Setup Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

        // Setup Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 0.1); // Center of room

        // Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);

        // Neon Lights (Point Lights)
        this.createNeonLight(0, 5, 0, 0xff00ff, 2, 20);
        this.createNeonLight(-10, 5, -10, 0x00ffff, 2, 20);
        this.createNeonLight(10, 5, -10, 0xffff00, 2, 20);

        // Floor
        this.createFloor();

        // Generate Cabinets
        this.generateCabinets();

        // Event Listeners
        window.addEventListener('resize', this.onResize.bind(this));

        // Mouse / Touch Events for Drag Navigation
        this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));

        this.container.addEventListener('click', this.onClick.bind(this));

        // Start Loop
        this.active = true;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    createNeonLight(x, y, z, color, intensity, distance) {
        const light = new THREE.PointLight(color, intensity, distance);
        light.position.set(x, y, z);
        this.scene.add(light);
    }

    createFloor() {
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

        // Grid pattern (Retro Grid)
        const gridHelper = new THREE.GridHelper(100, 50, 0xff00ff, 0x222222);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        this.scene.add(floor);
    }

    generateCabinets() {
        const games = Object.entries(this.gameRegistry);
        const radius = 8; // Increased radius
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

        // Screen (Emissive)
        const screenGeo = new THREE.PlaneGeometry(0.9, 0.7);
        // Generate texture from name
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 512, 384);
        ctx.fillStyle = this.getNeonColor(id);
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameInfo.name, 256, 192);

        const texture = new THREE.CanvasTexture(canvas);
        const screenMat = new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.5, 0.51);
        screen.name = `screen-${id}`; // For raycasting
        group.add(screen);

        // Marquee (Top)
        const marqueeGeo = new THREE.BoxGeometry(1.2, 0.3, 1.0);
        const marqueeMat = new THREE.MeshStandardMaterial({ color: this.getNeonColor(id), emissive: this.getNeonColor(id), emissiveIntensity: 0.5 });
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

        // Joystick
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

        group.userData = { gameId: id }; // Store ID for interaction
        this.cabinets.push(group);
        this.scene.add(group);
    }

    getNeonColor(id) {
        // Hash string to color
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseDown(event) {
        if (!this.active) return;
        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    onMouseUp(event) {
        this.isDragging = false;
    }

    onMouseMove(event) {
        // Update Mouse for Raycaster
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Navigation (Drag to Rotate)
        if (this.isDragging) {
            const deltaMove = {
                x: event.clientX - this.previousMousePosition.x,
                y: event.clientY - this.previousMousePosition.y
            };

            const rotationSpeed = 0.005;
            this.cameraRotation.y -= deltaMove.x * rotationSpeed;
            this.cameraRotation.x -= deltaMove.y * rotationSpeed;

            // Clamp vertical rotation
            this.cameraRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraRotation.x));

            // Apply rotation
            this.camera.rotation.x = this.cameraRotation.x;
            this.camera.rotation.y = this.cameraRotation.y;
            this.camera.rotation.z = 0; // Keep level

            this.previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    }

    onClick(event) {
        if (!this.active) return;

        // Raycast
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            // Find parent cabinet
            let object = intersects[0].object;
            while(object.parent && !object.userData.gameId) {
                object = object.parent;
            }

            if (object.userData && object.userData.gameId) {
                console.log("Clicked Game:", object.userData.gameId);
                this.loadGameCallback(object.userData.gameId);
            }
        }
    }

    animate() {
        if (!this.renderer) return;
        requestAnimationFrame(this.animate);

        if(!this.active) return;

        // Raycast for Hover Effect (Highlight Cabinet)
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
                // We could add an emissive glow here if desired
            }
        }

        if (hovered) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = this.isDragging ? 'grabbing' : 'grab';
        }

        this.renderer.render(this.scene, this.camera);
    }

    show() {
        this.active = true;
        this.container.style.display = 'block';
    }

    hide() {
        this.active = false;
        this.container.style.display = 'none';
        document.body.style.cursor = 'default';
    }
}
