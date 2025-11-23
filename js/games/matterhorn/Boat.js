export default class Boat {
    constructor(scene) {
        this.scene = scene;

        const geo = new THREE.BoxGeometry(5, 1, 10);
        const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = true;
        this.mesh.position.set(30, 0, 30);

        this.rotation = 0;
        this.velocity = 0;

        scene.add(this.mesh);
    }

    update(dt) {
        this.mesh.position.y = Math.sin(performance.now() * 0.001) * 0.3;
    }
}
