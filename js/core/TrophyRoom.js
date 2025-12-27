
import SaveSystem from './SaveSystem.js';
import { AchievementRegistry } from './AchievementRegistry.js';

/**
 * Renders a 3D Trophy Room scene using Three.js.
 * Displays acquired trophies and allows the player to "walk" around (placeholder for now).
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

        if (this.container) {
            this.init(this.container);
        }
    }

    init() {
        if (!this.container) {
            console.error("TrophyRoom: Container not provided.");
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
            this.scene.background = new THREE.Color(0x0a0a1a); // Deep dark blue
            this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.03);

            // Camera
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.set(0, 3, 8);
            this.camera.lookAt(0, 1, 0);

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
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        this.scene.add(spotLight);

        const blueLight = new THREE.PointLight(0x00ffff, 1, 20);
        blueLight.position.set(-10, 5, -5);
        this.scene.add(blueLight);

        const pinkLight = new THREE.PointLight(0xff00ff, 1, 20);
        pinkLight.position.set(10, 5, -5);
        this.scene.add(pinkLight);

        // Floor (Grid)
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.1,
            metalness: 0.8
        });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const gridHelper = new THREE.GridHelper(100, 50, 0x00ffff, 0x222222);
        this.scene.add(gridHelper);

        // Render Content
        this.renderTrophies();

        // Listeners
        window.addEventListener('resize', this.onResize.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('click', this.onClick.bind(this)); // For walking/selecting?

        // Add "Back" button overlay if not present
        if (!document.getElementById('trophy-back-btn') && this.container) {
            const btn = document.createElement('button');
            btn.id = 'trophy-back-btn';
            btn.innerHTML = '<i class="fas fa-arrow-left"></i> Return to Hub';
            btn.className = 'absolute top-6 left-6 glass-panel px-6 py-3 rounded-full text-white hover:text-cyan-400 z-50 font-bold uppercase tracking-wider transition-all border border-white/10 hover:border-cyan-500 shadow-lg';
            btn.onclick = () => this.exit();
            this.container.appendChild(btn);
        }

        this.animate();
    }

    renderTrophies() {
        const unlocked = this.saveSystem.data.achievements || [];
        const trophies = Object.values(AchievementRegistry); // All potential trophies

        // Arrange in a semi-circle
        const radius = 6;
        const total = trophies.length;
        const angleStep = Math.PI / (total > 1 ? total - 1 : 1);
        const startAngle = Math.PI; // Start from left (-x) to right (+x)

        trophies.forEach((achievement, i) => {
            const isUnlocked = unlocked.includes(achievement.id);

            // Position
            // Actually, let's do rows if too many.
            // For now, circle is fine.
            const angle = startAngle + (Math.PI / (total)) * i - (Math.PI/2); // Center arc?
            // Simple row for now:
            const x = (i - (total-1)/2) * 2.5;
            const z = 0; // Curve? -Math.abs(x) * 0.2;

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

            // Simple Cup Shape
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

            // Add Icon (Floating Text?) - Complex in 3D.
            // We use raycasting for details.

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

    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    onClick(event) {
        // Raycast
        if (!this.camera) return;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Check intersections with interactables (recursive? cupGroup has children)
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            // Find parent group with userData
            let target = intersects[0].object;
            while(target.parent && !target.userData.id) {
                target = target.parent;
            }

            if (target.userData && target.userData.id) {
                // Show Details
                // We show this in update loop via hover, or click?
                // Click to focus?
            }
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

        // Camera gentle float
        // this.camera.position.x = Math.sin(Date.now() * 0.0005) * 1;

        this.renderer.render(this.scene, this.camera);
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
