import ModeBase from './ModeBase.js';

export default class Safari extends ModeBase {
    init() {
        super.init();
        this.scene.background = new THREE.Color(0xFFD700); // Golden Savannah
        this.scene.fog = new THREE.FogExp2(0xFFD700, 0.02);

        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xDAA520 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        this.spawnTimer = 0;
        this.game.ammo = 10;
        document.getElementById('nh-ammo').innerText = "10";
    }

    update(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnAnimal();
            this.spawnTimer = 3.0;
            if(this.game.ammo <= 0) {
                 this.game.ammo = 10;
                 document.getElementById('nh-ammo').innerText = "10";
            }
        }

        // Move Animals
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.mesh.position.addScaledVector(t.velocity, dt);

            // Bounds check
            if (t.mesh.position.z > 5 || t.mesh.position.z < -60) {
                this.scene.remove(t.mesh);
                this.targets.splice(i, 1);
            }
        }
    }

    spawnAnimal() {
        // Charging Rhino or Elephant (simple blocks)
        const isRhino = Math.random() > 0.5;
        const animal = new THREE.Group();

        const color = isRhino ? 0x808080 : 0x708090;
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 4), new THREE.MeshStandardMaterial({color}));
        body.position.y = 2;
        animal.add(body);

        if (isRhino) {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 8), new THREE.MeshStandardMaterial({color: 0xffffff}));
            horn.position.set(0, 2.5, 2.2);
            horn.rotation.x = 0.5;
            animal.add(horn);
        } else {
            // Elephant trunk
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 8), new THREE.MeshStandardMaterial({color}));
            trunk.position.set(0, 2, 2.5);
            trunk.rotation.x = 0.5;
            animal.add(trunk);
        }

        // Spawn far away coming towards player
        animal.position.set((Math.random()-0.5) * 40, 0, -50);

        const speed = 8 + Math.random() * 4;
        const velocity = new THREE.Vector3(0, 0, speed); // Towards Z+

        this.scene.add(animal);
        this.targets.push({ mesh: animal, velocity, active: true });
    }

    onShoot(intersects) {
        if (this.game.ammo <= 0) return;
        this.game.ammo--;
        document.getElementById('nh-ammo').innerText = this.game.ammo;

        for (let hit of intersects) {
            let obj = hit.object;
            while(obj.parent && obj.parent !== this.scene) obj = obj.parent;

            const target = this.targets.find(t => t.mesh === obj);
            if (target && target.active) {
                this.scene.remove(target.mesh);
                target.active = false;
                this.game.score += 200;
                this.game.updateHUD();
                break;
            }
        }
    }
}
