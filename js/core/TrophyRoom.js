
import SaveSystem from './SaveSystem.js';
import { AchievementRegistry } from './AchievementRegistry.js';
import InputManager from './InputManager.js';

/**
 * Renders a 3D Trophy Room scene using Three.js.
 * Displays acquired trophies and allows the player to "walk" around.
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
        this.inputManager = InputManager.getInstance();

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isActive = true;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.interactables = [];
        this.colliders = [];

        // Navigation
        this.player = {
            position: new THREE.Vector3(0, 1.6, 6),
            speed: 4.0,
            rotation: { x: 0, y: 0 }
        };
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.navTarget = null;

        if (this.container) {
            this.init(this.container);
        }
    }

    init() {
        if (!this.container) {
            console.error("TrophyRoom: Container not provided.");
            return;
        }

        try {
            // Scene Setup
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0a0a1a);
            this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.03);

            // Camera
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.copy(this.player.position);

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

            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
            this.scene.add(ambientLight);

            const spotLight = new THREE.SpotLight(0xffaa00, 2);
            spotLight.position.set(0, 15, 0);
            spotLight.castShadow = true;
            this.scene.add(spotLight);

            this.createLights();

            // Environment
            this.createRoom();
            this.renderTrophies();

            // Listeners
            window.addEventListener('resize', this.onResize.bind(this));

            // Mouse/Touch
            this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            window.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

            this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            window.addEventListener('touchend', this.onMouseUp.bind(this));


            // Add "Back" button overlay
            const btn = document.createElement('button');
            btn.id = 'trophy-back-btn';
            btn.innerHTML = '<i class="fas fa-arrow-left"></i> Return to Hub';
            btn.className = 'absolute top-6 left-6 glass-panel px-6 py-3 rounded-full text-white hover:text-cyan-400 z-50 font-bold uppercase tracking-wider transition-all border border-white/10 hover:border-cyan-500 shadow-lg';
            btn.onclick = () => this.exit();
            this.container.appendChild(btn);

            this.animate();

        } catch (e) {
            console.error("TrophyRoom: Failed to initialize WebGL.", e);
            if(this.container) this.container.innerHTML = '<div class="text-white text-center p-10">Error: WebGL not supported.</div>';
            this.isActive = false;
        }
    }

    createLights() {
        const blueLight = new THREE.PointLight(0x00ffff, 1, 20);
        blueLight.position.set(-10, 5, -5);
        this.scene.add(blueLight);

        const pinkLight = new THREE.PointLight(0xff00ff, 1, 20);
        pinkLight.position.set(10, 5, -5);
        this.scene.add(pinkLight);
    }

    createRoom() {
        const style = this.saveSystem.getEquippedItem('trophy_room') || 'default';

        // Style Configs
        const styles = {
            default: { floor: 0x111111, wall: 0x111122, grid: 0x00ffff, metal: 0.8 },
            neon: { floor: 0x000000, wall: 0x000022, grid: 0xff00ff, metal: 0.9 },
            gold: { floor: 0x221100, wall: 0x332200, grid: 0xffd700, metal: 0.95 }
        };
        const theme = styles[style] || styles.default;

        // Floor
        const geometry = new THREE.PlaneGeometry(40, 40);
        const material = new THREE.MeshStandardMaterial({
            color: theme.floor,
            roughness: 0.1,
            metalness: theme.metal
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const gridHelper = new THREE.GridHelper(40, 20, theme.grid, 0x222222);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: theme.wall, side: THREE.BackSide, roughness: 0.2 });
        const roomBox = new THREE.Mesh(new THREE.BoxGeometry(40, 15, 40), wallMat);
        roomBox.position.y = 7.5;
        this.scene.add(roomBox);

        // Colliders
        this.addCollider(new THREE.Mesh(new THREE.BoxGeometry(40, 10, 1), wallMat), 0, 0, -20); // Back
        this.addCollider(new THREE.Mesh(new THREE.BoxGeometry(40, 10, 1), wallMat), 0, 0, 20); // Front
        this.addCollider(new THREE.Mesh(new THREE.BoxGeometry(1, 10, 40), wallMat), -20, 0, 0); // Left
        this.addCollider(new THREE.Mesh(new THREE.BoxGeometry(1, 10, 40), wallMat), 20, 0, 0); // Right
    }

    addCollider(mesh, x, y, z) {
        if (x !== undefined) mesh.position.set(x, y, z);
        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push(box);
    }

    renderTrophies() {
        const unlocked = this.saveSystem.data.achievements || [];
        const trophies = Object.values(AchievementRegistry);

        // Arrange in rows
        const startZ = -10;
        const spacingX = 4;
        const spacingZ = 4;
        const rowWidth = 5;

        trophies.forEach((achievement, i) => {
            const isUnlocked = unlocked.includes(achievement.id);

            const row = Math.floor(i / rowWidth);
            const col = i % rowWidth;

            const x = (col - (rowWidth-1)/2) * spacingX;
            const z = startZ + row * spacingZ;

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
            this.addCollider(ped);

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

            // Base
            const baseGeo = new THREE.BoxGeometry(0.5, 0.1, 0.5);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            cupGroup.add(base);

            // Cup Body
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
                // Lock Hologram
                const lockGeo = new THREE.BoxGeometry(0.4, 0.6, 0.1);
                const lockMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.3 });
                const lock = new THREE.Mesh(lockGeo, lockMat);
                lock.position.y = 0.5;
                cupGroup.add(lock);
            }

            this.scene.add(cupGroup);

            // Store reference for interaction
            cupGroup.userData = { id: achievement.id, unlocked: isUnlocked, data: achievement };
            this.interactables.push(cupGroup);
        });
    }

    // --- Interaction & Movement ---

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (this.isDragging) {
             const deltaX = event.clientX - this.previousMousePosition.x;
             const deltaY = event.clientY - this.previousMousePosition.y;

             this.player.rotation.y -= deltaX * 0.003;

             this.previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    }

    onMouseDown(event) {
        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onTouchStart(event) {
        if(event.touches.length === 1) {
             this.isDragging = true;
             this.previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
    }

    onTouchMove(event) {
        if(this.isDragging && event.touches.length === 1) {
             const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
             this.player.rotation.y -= deltaX * 0.005;
             this.previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
    }

    onClick(event) {
        if(this.isDragging) return;

        // Raycast
        if (!this.camera) return;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const point = intersects[0].point;

            // Walk to point
            this.navTarget = point;
            this.navTarget.y = this.player.position.y;
        }
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        if (!this.isActive) return;
        requestAnimationFrame(this.animate.bind(this));

        const dt = 0.016; // Approx

        // Handle Movement
        this.handleMovement(dt);

        // Camera Follow
        this.camera.position.copy(this.player.position);
        this.camera.rotation.y = this.player.rotation.y;

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
                target.rotation.y += 0.05; // Spin faster
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
            obj.rotation.y += 0.01;
            obj.position.y = 1.4 + Math.sin(Date.now() * 0.002 + obj.position.x) * 0.1;
        });

        this.renderer.render(this.scene, this.camera);
    }

    handleMovement(dt) {
         const moveSpeed = this.player.speed * dt;
         const velocity = new THREE.Vector3();

         // WASD
         if (this.inputManager.isKeyDown('KeyW') || this.inputManager.isKeyDown('ArrowUp')) velocity.z -= 1;
         if (this.inputManager.isKeyDown('KeyS') || this.inputManager.isKeyDown('ArrowDown')) velocity.z += 1;
         if (this.inputManager.isKeyDown('KeyA') || this.inputManager.isKeyDown('ArrowLeft')) velocity.x -= 1;
         if (this.inputManager.isKeyDown('KeyD') || this.inputManager.isKeyDown('ArrowRight')) velocity.x += 1;

         if (velocity.length() > 0) {
             velocity.normalize().multiplyScalar(moveSpeed);
             const euler = new THREE.Euler(0, this.player.rotation.y, 0, 'YXZ');
             velocity.applyEuler(euler);
             this.navTarget = null;
         }

         if (this.navTarget) {
             const dir = new THREE.Vector3().subVectors(this.navTarget, this.player.position);
             dir.y = 0;
             const dist = dir.length();
             if (dist < 0.2) this.navTarget = null;
             else {
                 dir.normalize().multiplyScalar(Math.min(moveSpeed, dist));
                 velocity.add(dir);
             }
         }

         const nextPos = this.player.position.clone().add(velocity);

         // Bounds Check
         if(Math.abs(nextPos.x) < 18 && Math.abs(nextPos.z) < 18) {
              this.player.position.copy(nextPos);
         }
    }

    exit() {
        this.isActive = false;
        // Cleanup DOM
        const btn = document.getElementById('trophy-back-btn');
        if (btn) btn.remove();
        if (this.overlay) this.overlay.remove();

        window.removeEventListener('resize', this.onResize.bind(this));
        window.removeEventListener('mousemove', this.onMouseMove.bind(this));

        // Callback
        if (this.onBack) this.onBack();
    }
}
