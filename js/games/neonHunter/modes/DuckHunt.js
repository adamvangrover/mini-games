import ModeBase from './ModeBase.js';

export default class DuckHunt extends ModeBase {
    init() {
        super.init();
        this.camera.position.set(0, 1.6, 5);

        // Blue sky
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

        // Grass
        const grassGeo = new THREE.PlaneGeometry(100, 20);
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.position.set(0, 0, -10);
        grass.rotation.x = -0.2; // Sloped up
        this.scene.add(grass);

        this.spawnTimer = 0;
        this.game.ammo = 3;
        this.game.maxAmmo = 3;
        this.game.updateHUD();
    }

    update(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnDuck();
            this.spawnTimer = 4.0;
            // Ducks fly away if missed? Or endless?
            // Original reload logic? Duck hunt usually gives 3 shots per round.
            // For simplicity here, we reload when spawning new wave or just set ammo to 3 occasionally?
            // Let's reload every spawn for now to keep it playable.
            if(this.game.ammo === 0) {
                this.game.ammo = 3;
                this.game.updateHUD();
                this.game.showMsg("RELOADED");
            }
        }

        // Move ducks
        this.targets.forEach((t, i) => {
            t.mesh.position.addScaledVector(t.velocity, dt);
            t.mesh.lookAt(t.mesh.position.clone().add(t.velocity));

            // Bounce off "screen" edges
            if (t.mesh.position.x > 15 || t.mesh.position.x < -15) t.velocity.x *= -1;
            if (t.mesh.position.y > 15 || t.mesh.position.y < 1) t.velocity.y *= -1;
        });
    }

    spawnDuck() {
        // Simple duck shape: Group of boxes
        const duck = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.4), new THREE.MeshStandardMaterial({color: 0x8B4513}));
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({color: 0x006400}));
        head.position.set(0.4, 0.2, 0);
        const wings = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 1.0), new THREE.MeshStandardMaterial({color: 0xD2B48C}));

        duck.add(body);
        duck.add(head);
        duck.add(wings);

        duck.position.set(0, 1, -15);
        this.scene.add(duck);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            2 + Math.random() * 3,
            0
        );
        this.targets.push({ mesh: duck, velocity, active: true });
    }

    onShoot(intersects) {
        if (this.game.ammo <= 0) return;
        this.game.ammo--;
        this.game.updateHUD();

        for (let hit of intersects) {
            // Traverse up to find the group
            let obj = hit.object;
            while(obj.parent && obj.parent !== this.scene) obj = obj.parent;

            const target = this.targets.find(t => t.mesh === obj);
            if (target && target.active) {
                this.scene.remove(target.mesh);
                target.active = false;
                this.game.score += 500;
                this.game.updateHUD();
                break;
            }
        }
    }
}
