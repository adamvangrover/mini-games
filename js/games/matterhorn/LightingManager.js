export default class LightingManager {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;

        // Directional sunlight
        this.sun = new THREE.DirectionalLight(0xffffff, 1);
        this.sun.position.set(50, 100, -50);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 500;
        this.scene.add(this.sun);

        // Ambient light
        this.ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambient);

        // Night aurora glow
        this.nightLight = new THREE.PointLight(0x88ccff, 0.5, 200);
        this.nightLight.position.set(0, 80, 0);
        this.scene.add(this.nightLight);

        // Time tracking
        this.timeOfDay = 12; // 0–24 hours
        this.daySpeed = 0.01; // Time flow speed
    }

    update() {
        // Advance time
        this.timeOfDay += this.daySpeed;
        if(this.timeOfDay >= 24) this.timeOfDay = 0;

        // Update sun position
        const angle = (this.timeOfDay / 24) * Math.PI * 2;
        this.sun.position.set(100 * Math.cos(angle), 100 * Math.sin(angle), -50);

        // Adjust sunlight intensity
        if(this.timeOfDay >= 6 && this.timeOfDay <= 18) {
            this.sun.intensity = 1;
            this.ambient.intensity = 0.5;
            this.nightLight.intensity = 0;
        } else {
            // Night
            this.sun.intensity = 0.1;
            this.ambient.intensity = 0.2;
            this.nightLight.intensity = 0.5;
        }

        // Optional: adjust renderer background color
        if(this.timeOfDay >= 6 && this.timeOfDay <= 18) {
            this.renderer.setClearColor(0x87ceeb); // Day sky
        } else {
            this.renderer.setClearColor(0x0a0a2a); // Night sky
        }
    }
}
