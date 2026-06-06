export default class WildlifeManager {
    constructor(scene, player, heightFunc) {
        this.scene = scene;
        this.player = player;
        this.heightFunc = heightFunc; // Function to get terrain height

        this.animals = [];
        this.maxAnimals = 20;

        this.loadAnimals();
    }

    loadAnimals() {
        // For simplicity, we'll use simple colored spheres as placeholder animals
        for (let i = 0; i < this.maxAnimals; i++) {
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshStandardMaterial({
                color: Math.random() > 0.5 ? 0x8b4513 : 0x228b22
            });
            const animal = new THREE.Mesh(geometry, material);

            // Random spawn within a range
            const x = Math.random() * 400 - 200;
            const z = Math.random() * 400 - 200;
            const y = this.heightFunc ? this.heightFunc(x, z) : 5;

            animal.position.set(x, y + 0.5, z);
            animal.userData = {
                speed: 0.5 + Math.random() * 1,
                direction: new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize()
            };

            this.animals.push(animal);
            this.scene.add(animal);
        }

        // Expose ibex list for PhotoGame
        this.ibex = this.animals.map(a => ({ mesh: a }));
    }

    update(delta) {
        // Bolt Optimization: Replaced forEach with index-based loop for better performance
        for (let i = 0; i < this.animals.length; i++) {
            const animal = this.animals[i];

            // Move animal in its direction
            const moveVec = animal.userData.direction.clone().multiplyScalar(animal.userData.speed * delta);
            animal.position.add(moveVec);

            // Terrain snap
            if (this.heightFunc) {
                const h = this.heightFunc(animal.position.x, animal.position.z);
                animal.position.y = h + 0.5;
            }

            // Simple boundary check (-250 to 250)
            // Bolt Optimization: Avoided inline array allocation and closure in hot loop
            if (animal.position.x > 250 || animal.position.x < -250) {
                animal.userData.direction.x *= -1; // bounce back
            }
            if (animal.position.z > 250 || animal.position.z < -250) {
                animal.userData.direction.z *= -1; // bounce back
            }

            // Simple player proximity reaction
            // Bolt Optimization: Replaced expensive distanceTo (Math.sqrt) with distanceToSquared
            const distanceSq = animal.position.distanceToSquared(this.player.position);
            if (distanceSq < 100) { // 10^2
                // Flee from player
                const fleeDir = animal.position.clone().sub(this.player.position).normalize();
                fleeDir.y = 0; // Keep on ground plane logic
                animal.position.add(fleeDir.multiplyScalar(animal.userData.speed * delta * 2));
            }

            // Optional: rotate to face movement direction
            const lookTarget = animal.position.clone().add(animal.userData.direction);
            animal.lookAt(lookTarget);
        }
    }
}
