
export default class ArcadeHub {
    constructor(canvasId, gameRegistry, onGameSelect) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with id ${canvasId} not found`);
            return;
        }

        this.gameRegistry = gameRegistry;
        this.onGameSelect = onGameSelect;
        this.cabinets = [];
        this.isInteracting = false;
        this.onMouseDownMouseX = 0;
        this.onMouseDownMouseY = 0;
        this.lon = 0;
        this.onMouseDownLon = 0;
        this.lat = 0;
        this.onMouseDownLat = 0;
        this.phi = 0;
        this.theta = 0;
        this.cameraTarget = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isActive = true;

        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050505, 0.02);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 0); // Eye level

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft white light
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xff00ff, 1, 100);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);

        // Floor
        this.createFloor();

        // Cabinets
        this.createCabinets();

        // Event Listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Input Handling
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Touch support
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        document.addEventListener('touchmove', this.onTouchMove.bind(this));
        document.addEventListener('touchend', this.onMouseUp.bind(this));

        // Click detection
        this.canvas.addEventListener('click', this.onClick.bind(this));

        this.animate();
    }

    createFloor() {
        // Grid helper style floor
        const geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
        const material = new THREE.MeshBasicMaterial({
            color: 0x222222,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Add some reflections/glow to floor
        const reflectGeo = new THREE.PlaneGeometry(200, 200);
        const reflectMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            roughness: 0.1,
            metalness: 0.8
        });
        const reflectFloor = new THREE.Mesh(reflectGeo, reflectMat);
        reflectFloor.rotation.x = -Math.PI / 2;
        reflectFloor.position.y = -0.1;
        this.scene.add(reflectFloor);
    }

    createLabelTexture(text, iconClass) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 512);

        // Border
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 20;
        ctx.strokeRect(10, 10, 492, 492);

        // Text
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 40px "Courier New"'; // Use a standard font for canvas
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Simple word wrap
        const words = text.split(' ');
        let line = '';
        let y = 300;

        // Icon (simplified as text for now, or just the title)
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 60px Arial';
        ctx.fillText(text, 256, 256);

        // Glow effect
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.strokeText(text, 256, 256);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    createCabinets() {
        const games = Object.entries(this.gameRegistry);
        const count = games.length;
        const radius = 8; // Distance from center

        games.forEach(([id, info], index) => {
            const angle = (index / count) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            // Cabinet Group
            const group = new THREE.Group();
            group.position.set(x, 0, z);
            group.lookAt(0, 0, 0); // Face center

            // Main Body
            const bodyGeo = new THREE.BoxGeometry(1.2, 2.2, 1);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 1.1;
            group.add(body);

            // Screen
            const screenGeo = new THREE.PlaneGeometry(1, 0.8);
            const screenTex = this.createLabelTexture(info.name);
            const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
            const screen = new THREE.Mesh(screenGeo, screenMat);
            screen.position.set(0, 1.6, 0.51); // Slightly in front
            // Tilt screen slightly
            screen.rotation.x = -0.2;
            screen.position.z -= 0.1; // push back a bit
            screen.position.y -= 0.1;

            // Add a bezel for screen
            const bezelGeo = new THREE.BoxGeometry(1.1, 0.9, 0.1);
            const bezelMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const bezel = new THREE.Mesh(bezelGeo, bezelMat);
            bezel.position.set(0, 1.5, 0.45);
            bezel.rotation.x = -0.2;
            group.add(bezel);
            group.add(screen);

            // Marquee (Top)
            const marqueeGeo = new THREE.BoxGeometry(1.2, 0.4, 1.1);
            const marqueeMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x220022 });
            const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
            marquee.position.y = 2.4;
            marquee.position.z = 0.05;
            group.add(marquee);

            // Control Panel
            const panelGeo = new THREE.BoxGeometry(1.2, 0.1, 0.6);
            const panelMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.set(0, 1.0, 0.3);
            panel.rotation.x = 0.3;
            group.add(panel);

            // Joystick/Buttons (Visuals)
            const joyGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2);
            const joyMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            const joy = new THREE.Mesh(joyGeo, joyMat);
            joy.position.set(-0.3, 1.15, 0.3);
            joy.rotation.x = 0.3;
            group.add(joy);

            const btnGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.05);
            const btnMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            const btn1 = new THREE.Mesh(btnGeo, btnMat);
            btn1.position.set(0.1, 1.1, 0.35);
            btn1.rotation.x = 0.3;
            group.add(btn1);

            const btn2 = new THREE.Mesh(btnGeo, btnMat);
            btn2.position.set(0.3, 1.1, 0.35);
            btn2.rotation.x = 0.3;
            group.add(btn2);

            // Neon Trim
            const trimGeo = new THREE.BoxGeometry(1.25, 2.25, 0.05);
            const color = new THREE.Color().setHSL(Math.random(), 1, 0.5);
            const trimMat = new THREE.MeshBasicMaterial({ color: color });
            const trim = new THREE.Mesh(trimGeo, trimMat);
            trim.position.set(0, 1.1, -0.52); // Backglow
            group.add(trim);

            // Side Glow
            const sideTrimGeo = new THREE.BoxGeometry(0.02, 2.2, 1);
            const sideTrimMat = new THREE.MeshBasicMaterial({ color: color });
            const leftTrim = new THREE.Mesh(sideTrimGeo, sideTrimMat);
            leftTrim.position.set(-0.61, 1.1, 0);
            group.add(leftTrim);

            const rightTrim = new THREE.Mesh(sideTrimGeo, sideTrimMat);
            rightTrim.position.set(0.61, 1.1, 0);
            group.add(rightTrim);


            // Store metadata
            group.userData = { gameId: id };
            this.scene.add(group);
            this.cabinets.push(group);
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseDown(event) {
        event.preventDefault();
        this.isInteracting = true;
        this.onMouseDownMouseX = event.clientX;
        this.onMouseDownMouseY = event.clientY;
        this.onMouseDownLon = this.lon;
        this.onMouseDownLat = this.lat;
    }

    onMouseMove(event) {
        if (this.isInteracting === true) {
            this.lon = (this.onMouseDownMouseX - event.clientX) * 0.1 + this.onMouseDownLon;
            this.lat = (event.clientY - this.onMouseDownMouseY) * 0.1 + this.onMouseDownLat;
        }

        // Hover effect logic
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Optional: Highlight cabinet under cursor
        // This requires casting ray every frame or mouse move.
        // We do it in animate loop or here.
    }

    onTouchStart(event) {
        if(event.touches.length == 1) {
            event.preventDefault(); // prevent scroll
            this.isInteracting = true;
            this.onMouseDownMouseX = event.touches[0].pageX;
            this.onMouseDownMouseY = event.touches[0].pageY;
            this.onMouseDownLon = this.lon;
            this.onMouseDownLat = this.lat;
        }
    }

    onTouchMove(event) {
        if (this.isInteracting === true && event.touches.length == 1) {
            event.preventDefault();
            this.lon = (this.onMouseDownMouseX - event.touches[0].pageX) * 0.1 + this.onMouseDownLon;
            this.lat = (event.touches[0].pageY - this.onMouseDownMouseY) * 0.1 + this.onMouseDownLat;
        }
    }

    onMouseUp() {
        this.isInteracting = false;
    }

    onClick(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check intersections recursively
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            // Traverse up to find the group with userData
            let target = intersects[0].object;
            while(target.parent && !target.userData.gameId) {
                target = target.parent;
            }

            if (target.userData && target.userData.gameId) {
                this.onGameSelect(target.userData.gameId);
            }
        }
    }

    update() {
        this.lat = Math.max(-85, Math.min(85, this.lat));
        this.phi = THREE.MathUtils.degToRad(90 - this.lat);
        this.theta = THREE.MathUtils.degToRad(this.lon);

        this.cameraTarget.x = 500 * Math.sin(this.phi) * Math.cos(this.theta);
        this.cameraTarget.y = 500 * Math.cos(this.phi);
        this.cameraTarget.z = 500 * Math.sin(this.phi) * Math.sin(this.theta);

        this.camera.lookAt(this.cameraTarget);

        // Animate cabinets (bobbing or glowing)
        const time = Date.now() * 0.001;
        this.cabinets.forEach((cab, i) => {
             cab.position.y = Math.sin(time + i) * 0.05; // Gentle float
        });
    }

    animate() {
        if (!this.isActive) return;

        requestAnimationFrame(this.animate.bind(this));
        this.update();
        this.renderer.render(this.scene, this.camera);
    }

    pause() {
        this.isActive = false;
        // Optionally hide canvas
        this.canvas.style.display = 'none';
    }

    resume() {
        this.isActive = true;
        this.canvas.style.display = 'block';
        this.animate();
        this.onWindowResize(); // ensure size is correct
    }
}
