// Mock World class
export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
    }
    generate() {
        // Simple plane
        const geometry = new THREE.PlaneGeometry(200, 200);
        const material = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        this.scene.add(plane);
        
        // Random cubes
        for(let i=0; i<20; i++) {
             const geo = new THREE.BoxGeometry(5, 10 + Math.random()*20, 5);
             const mat = new THREE.MeshStandardMaterial({color: 0x888888});
             const mesh = new THREE.Mesh(geo, mat);
             mesh.position.set((Math.random()-0.5)*100, mesh.geometry.parameters.height/2, (Math.random()-0.5)*100);
             this.scene.add(mesh);
        }
    }
    update(time) {}
    getHeightAt(x, z) { return 0; }
}
