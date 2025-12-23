
import SaveSystem from './SaveSystem.js';

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

        this.init();
    }

    init() {
        if (typeof THREE === 'undefined') {
            console.error("TrophyRoom: Three.js not loaded.");
            this.container.innerHTML = '<div class="text-white text-center p-10">Error: 3D Engine not loaded.</div>';
            return;
        }

        try {
            // Scene Setup
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x100510); // Darker purple bg
            this.scene.fog = new THREE.FogExp2(0x100510, 0.02);

            // Camera
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.set(0, 1.6, 5);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.container.appendChild(this.renderer.domElement);
        } catch (e) {
            console.error("TrophyRoom: Failed to initialize WebGL.", e);
            this.container.innerHTML = '<div class="text-white text-center p-10">Error: Your browser does not support WebGL.</div>';
            this.isActive = false;
            return;
        }

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffaa00, 1);
        spotLight.position.set(0, 10, 0);
        spotLight.castShadow = true;
        this.scene.add(spotLight);

        // Floor
        const geometry = new THREE.PlaneGeometry(20, 20);
        const material = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1, metalness: 0.5 });
        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Pedestals & Trophies
        this.renderTrophies();

        // Resize Listener
        window.addEventListener('resize', this.onResize.bind(this));

        // Add "Back" button overlay if not present
        if (!document.getElementById('trophy-back-btn')) {
            const btn = document.createElement('button');
            btn.id = 'trophy-back-btn';
            btn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Arcade';
            btn.className = 'absolute top-4 left-4 glass-panel px-4 py-2 rounded text-white hover:text-fuchsia-400 z-50';
            btn.onclick = () => this.exit();
            this.container.appendChild(btn);
        }

        this.animate();
    }

    renderTrophies() {
        const inventory = this.saveSystem.getInventory(); // Or check unlockedItems for trophies
        // In Store.js, we unlock items. Let's check unlockedItems.
        // Also check Achievements?

        // For now, let's just show some placeholders + unlocked 'trophy' items
        const positions = [
            { x: 0, z: 0 },
            { x: -2, z: 0 },
            { x: 2, z: 0 },
            { x: -4, z: 1 },
            { x: 4, z: 1 }
        ];

        // Example Trophies
        positions.forEach((pos, i) => {
            // Pedestal
            const pedGeo = new THREE.CylinderGeometry(0.4, 0.5, 1, 32);
            const pedMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const ped = new THREE.Mesh(pedGeo, pedMat);
            ped.position.set(pos.x, 0.5, pos.z);
            ped.castShadow = true;
            ped.receiveShadow = true;
            this.scene.add(ped);

            // Trophy (Placeholder logic)
            // If i < count, show trophy
            if (i === 0 && this.saveSystem.isItemUnlocked('trophy_silver')) {
                 this.createTrophyModel(pos.x, 1.2, pos.z, 0xaaaaaa); // Silver
            } else if (i === 1 && this.saveSystem.getHighScore('snake-game') > 100) {
                 this.createTrophyModel(pos.x, 1.2, pos.z, 0xcd7f32); // Bronze Snake
            } else {
                // Empty slot or locked visual
            }
        });
    }

    createTrophyModel(x, y, z, color) {
        const cupGeo = new THREE.CylinderGeometry(0.3, 0.1, 0.5, 32);
        const cupMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.9, roughness: 0.2 });
        const cup = new THREE.Mesh(cupGeo, cupMat);
        cup.position.set(x, y, z);
        cup.castShadow = true;
        this.scene.add(cup);

        // Rotate animation logic can be added in animate
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

        // Rotate trophies?
        this.scene.children.forEach(child => {
             // Simple check if it's a trophy (not floor or light)
             if (child.geometry && child.geometry.type === 'CylinderGeometry' && child.position.y > 1) {
                 child.rotation.y += 0.01;
             }
        });

        this.renderer.render(this.scene, this.camera);
    }

    exit() {
        this.isActive = false;
        // Cleanup DOM
        const btn = document.getElementById('trophy-back-btn');
        if (btn) btn.remove();

        // Callback
        if (this.onBack) this.onBack();
    }
}
