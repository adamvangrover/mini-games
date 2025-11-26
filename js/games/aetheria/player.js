// Mock Player class
export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.container = new THREE.Object3D();
        this.scene.add(this.container);
        this.velocity = new THREE.Vector3();
    }
    spawn(type, x, y, z) {
        this.container.position.set(x, y, z);
    }
    removeEventListeners() {}
    update(dt, time, world) {
        // Rotate camera around container
        this.camera.position.x = this.container.position.x + Math.sin(time * 0.5) * 20;
        this.camera.position.z = this.container.position.z + Math.cos(time * 0.5) * 20;
        this.camera.position.y = this.container.position.y + 10;
        this.camera.lookAt(this.container.position);
    }
}
