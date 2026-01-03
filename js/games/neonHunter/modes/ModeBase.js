export default class ModeBase {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.camera = game.camera;
        this.targets = [];
    }

    init() {
        // Setup environment (lights, ground, sky)
        this.setupEnvironment();
    }

    setupEnvironment() {
        // Default Environment
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        // Ground
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x2b4a2b });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
    }

    update(dt) {
        // Update targets
    }

    onShoot(intersects) {
        // Handle hit logic
    }

    createLowPolyGeometry(type) {
        // Helper for 90s style shapes
    }
}
