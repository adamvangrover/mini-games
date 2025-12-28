
import SaveSystem from './SaveSystem.js';
import { AchievementRegistry } from './AchievementRegistry.js';

/**
 * Renders a 3D Trophy Room scene using Three.js.
 * Displays acquired trophies and allows the player to walk around.
 */
export default class TrophyRoom {
    /**
     * @param {HTMLElement} container - The DOM element to append the renderer to.
     * @param {Function} onBack - Callback function to return to the main menu/hub.
     */
    constructor(container, onBack) {
        this.container = container;
        this.onBack = onBack;
        this.saveSystem = SaveSystem.getInstance();

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isActive = true;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.interactables = [];

        // Navigation
        this.position = new THREE.Vector3(0, 1.6, 8);
        this.targetPosition = new THREE.Vector3(0, 1.6, 8);
        this.yaw = 0;
        this.pitch = 0;
        this.keys = { w: false, a: false, s: false, d: false, arrowup: false, arrowleft: false, arrowdown: false, arrowright: false };
        this.isMoving = false;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.moveSpeed = 4.0;
        this.dragSensitivity = 0.002;

        if (this.container) {
            this.init(this.container);
        }
    }

    init(container) {
        if (container) this.container = container;

        if (!this.container) {
            console.error("TrophyRoom: Container is null or undefined.");
            return;
        }

        if (typeof THREE === 'undefined') {
            console.error("TrophyRoom: Three.js not loaded.");
            this.container.innerHTML = '<div class="text-white text-center p-10">Error: 3D Engine not loaded.</div>';
            return;
        }

        try {
            // Scene Setup
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x050510);
            this.scene.fog = new THREE.FogExp2(0x050510, 0.03);

            // Camera
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.updateCameraRotation();

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // Clear container
            this.container.innerHTML = '';
            this.container.appendChild(this.renderer.domElement);

            // Add Interaction Overlay
            this.overlay = document.createElement('div');
            this.overlay.className = "absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black/80 border border-cyan-500 text-white p-4 rounded-lg hidden pointer-events-none text-center font-mono";
            this.container.appendChild(this.overlay);

        } catch (e) {
            console.error("TrophyRoom: Failed to initialize WebGL.", e);
            if(this.container) this.container.innerHTML = '<div class="text-white text-center p-10">Error: Your browser does not support WebGL.</div>';
            this.isActive = false;
            return;
        }

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffaa00, 2);
        spotLight.position.set(0, 15, 0);
        spotLight.castShadow = true;
        this.scene.add(spotLight);

        // Environment
        this.createEnvironment();

        // Render Content
        this.renderTrophies();

        // Listeners
        window.addEventListener('resize', this.onResize.bind(this));

        // Input
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));

        // Touch
        this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.onMouseUp.bind(this));

        // Add "Back" button overlay if not present
        if (!document.getElementById('trophy-back-btn') && this.container) {
            const btn = document.createElement('button');
            btn.id = 'trophy-back-btn';
            btn.innerHTML = '<i class="fas fa-arrow-left"></i> Return to Hub';
            btn.className = 'absolute top-6 left-6 glass-panel px-6 py-3 rounded-full text-white hover:text-cyan-400 z-50 font-bold uppercase tracking-wider transition-all border border-white/10 hover:border-cyan-500 shadow-lg pointer-events-auto';
            btn.onclick = () => this.exit();
            this.container.appendChild(btn);
        }

        this.animate();
    }

    createEnvironment() {
        const theme = this.saveSystem.getEquippedItem('trophy_room') || 'default';

        let floorColor = 0x111111;
        let gridColor = 0x00ffff;
        let fogColor = 0x050510;
        let ambientIntensity = 0.3;

        if (theme === 'cyber') {
            floorColor = 0x000000;
            gridColor = 0xff00ff;
            fogColor = 0x000020;
        } else if (theme === 'gold') {
            floorColor = 0x221100;
            gridColor = 0xffd700;
            fogColor = 0x221100;
            ambientIntensity = 0.5;
        } else if (theme === 'nature') {
            floorColor = 0x001100;
            gridColor = 0x00ff00;
            fogColor = 0x001100;
        }

        // Apply Fog
        this.scene.fog = new THREE.FogExp2(fogColor, 0.03);
        this.scene.background = new THREE.Color(fogColor);

        // Adjust Ambient Light if needed (assuming it's the first child or search for it)
        const ambient = this.scene.children.find(c => c.isAmbientLight);
        if (ambient) ambient.intensity = ambientIntensity;

        // Floor
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({
            color: floorColor,
            roughness: 0.1,
            metalness: 0.8
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.floor = floor;

        const gridHelper = new THREE.GridHelper(100, 50, gridColor, 0x222222);
        this.scene.add(gridHelper);
    }

    renderTrophies() {
        const unlocked = this.saveSystem.data.achievements || [];
        const trophies = Object.values(AchievementRegistry); // All potential trophies

        // Arrange in aisles/rows
        const cols = 6;
        const spacingX = 3;
        const spacingZ = 3;

        trophies.forEach((achievement, i) => {
            const isUnlocked = unlocked.includes(achievement.id);

            const row = Math.floor(i / cols);
            const col = i % cols;

            const x = (col - (cols - 1) / 2) * spacingX;
            const z = -row * spacingZ;

            // Pedestal
            const pedGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.2, 8);
            const pedMat = new THREE.MeshStandardMaterial({
                color: 0x222222,
                emissive: 0x111111,
                roughness: 0.5,
                metalness: 0.8
            });
            const ped = new THREE.Mesh(pedGeo, pedMat);
            ped.position.set(x, 0.6, z);
            ped.castShadow = true;
            ped.receiveShadow = true;
            this.scene.add(ped);

            // Trophy Model
            let trophyColor = 0x444444; // Locked grey
            let emissive = 0x000000;

            if (isUnlocked) {
                if (achievement.xp >= 500) { trophyColor = 0xffd700; emissive = 0xaa6600; } // Gold
                else if (achievement.xp >= 200) { trophyColor = 0xc0c0c0; emissive = 0x444444; } // Silver
                else { trophyColor = 0xcd7f32; emissive = 0x442200; } // Bronze
            }

            const cupGroup = new THREE.Group();
            cupGroup.position.set(x, 1.4, z);

            const baseGeo = new THREE.BoxGeometry(0.5, 0.1, 0.5);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            cupGroup.add(base);

            let cupGeo;
            if (THREE.CapsuleGeometry) {
                 cupGeo = new THREE.CapsuleGeometry(0.3, 0.6, 4, 8);
            } else {
                 cupGeo = new THREE.CylinderGeometry(0.3, 0.1, 0.6, 16);
            }

            const cupMat = new THREE.MeshStandardMaterial({
                color: trophyColor,
                metalness: 0.9,
                roughness: 0.2,
                emissive: emissive,
                emissiveIntensity: 0.2
            });
            const cup = new THREE.Mesh(cupGeo, cupMat);
            cup.position.y = 0.4;
            cupGroup.add(cup);

            if (!isUnlocked) {
                const lockGeo = new THREE.BoxGeometry(0.4, 0.6, 0.1);
                const lockMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.3 });
                const lock = new THREE.Mesh(lockGeo, lockMat);
                lock.position.y = 0.5;
                cupGroup.add(lock);
            } else {
                // Glow point
                const light = new THREE.PointLight(trophyColor, 0.5, 3);
                light.position.y = 0.5;
                cupGroup.add(light);
            }

            this.scene.add(cupGroup);
            cupGroup.userData = { id: achievement.id, unlocked: isUnlocked, data: achievement };
            this.interactables.push(cupGroup);
        });
    }

    // --- Input Handling ---

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
            this.pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.pitch));
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
            this.yaw -= dx * this.dragSensitivity * 2;
            this.pitch -= dy * this.dragSensitivity * 2;
            this.pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.pitch));
            this.updateCameraRotation();
            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }

    updateCameraRotation() {
        if (!this.camera) return;
        this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }

    onClick(e) {
        if (this.isDragging) return;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            // Check for interactables
            let target = intersects[0].object;
            while(target.parent && (!target.userData || !target.userData.id)) {
                target = target.parent;
                if (!target) break;
            }
            if (target && target.userData && target.userData.id) {
                // Already handled by hover overlay, maybe click to view full detail?
                return;
            }

            // Click to Move
            if (intersects[0].object === this.floor) {
                const p = intersects[0].point;
                this.targetPosition.set(p.x, 1.6, p.z);
                this.isMoving = true;
            }
        }
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateMovement(dt) {
         // WASD Input
        const forward = (this.keys.w || this.keys.arrowup) ? 1 : (this.keys.s || this.keys.arrowdown) ? -1 : 0;
        const strafe = (this.keys.a || this.keys.arrowleft) ? 1 : (this.keys.d || this.keys.arrowright) ? -1 : 0;

        if (forward !== 0 || strafe !== 0) {
            this.isMoving = false;
            const dir = new THREE.Vector3();
            this.camera.getWorldDirection(dir);
            dir.y = 0; dir.normalize();

            const right = new THREE.Vector3(-dir.z, 0, dir.x);

            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(dir, forward);
            moveVec.addScaledVector(right, strafe);
            moveVec.normalize();

            this.position.addScaledVector(moveVec, this.moveSpeed * dt);
        } else if (this.isMoving) {
            const dist = this.position.distanceTo(this.targetPosition);
            if (dist < 0.1) {
                this.position.copy(this.targetPosition);
                this.isMoving = false;
            } else {
                const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position).normalize();
                this.position.addScaledVector(dir, this.moveSpeed * dt);
            }
        }

        // Clamp
        this.position.x = Math.max(-50, Math.min(50, this.position.x));
        this.position.z = Math.max(-50, Math.min(50, this.position.z));
        this.camera.position.copy(this.position);
    }

    animate() {
        if (!this.isActive) return;
        requestAnimationFrame(this.animate.bind(this));

        const dt = 0.016;
        this.updateMovement(dt);

        // Raycast for Hover
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        let hovered = null;
        if (intersects.length > 0) {
            let target = intersects[0].object;
            while(target.parent && (!target.userData || !target.userData.id)) {
                target = target.parent;
                if (!target) break;
            }
            if (target && target.userData && target.userData.id) {
                hovered = target.userData;
                target.rotation.y += 0.05;
            }
        }

        // Update Overlay
        if (hovered && this.overlay) {
            this.overlay.classList.remove('hidden');
            const data = hovered.data;
            const status = hovered.unlocked ? `<span class="text-green-400">UNLOCKED</span>` : `<span class="text-red-500">LOCKED</span>`;
            this.overlay.innerHTML = `
                <div class="text-lg font-bold text-cyan-300">${data.title}</div>
                <div class="text-xs text-gray-300 mb-2">${data.description}</div>
                <div class="text-xs font-bold">${status}</div>
                <div class="text-xs text-yellow-500 mt-1">+${data.xp} XP</div>
            `;
        } else if (this.overlay) {
            this.overlay.classList.add('hidden');
        }

        // Idle Animation
        this.interactables.forEach(obj => {
            if (obj.userData !== hovered) {
                obj.rotation.y += 0.01;
            }
            obj.position.y = 1.4 + Math.sin(Date.now() * 0.002 + obj.position.x) * 0.1;
        });

        this.renderer.render(this.scene, this.camera);
    }

    exit() {
        this.isActive = false;
        const btn = document.getElementById('trophy-back-btn');
        if (btn) btn.remove();
        if (this.overlay) this.overlay.remove();

        window.removeEventListener('resize', this.onResize.bind(this));
        window.removeEventListener('mousemove', this.onMouseMove.bind(this));
        window.removeEventListener('keydown', this.onKeyDown.bind(this));
        window.removeEventListener('keyup', this.onKeyUp.bind(this));

        if (this.onBack) this.onBack();
    }
}
