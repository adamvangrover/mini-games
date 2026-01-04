import ModeBase from './ModeBase.js';

export default class ClayPigeons extends ModeBase {
    init() {
        super.init();
        this.camera.position.set(0, 1.6, 5);
        this.camera.lookAt(0, 5, -20);

        // Spawn timer
        this.spawnTimer = 0;
        this.targets = [];
        this.game.ammo = 2;
        this.game.maxAmmo = 2;
        this.game.updateHUD();
    }

    update(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTarget();
            this.spawnTimer = 3.0;
            this.game.ammo = 2; // Reload
            this.game.updateHUD();
            this.game.showMsg("PULL!");
        }

        // Update targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.mesh.position.addScaledVector(t.velocity, dt);
            t.velocity.y -= 9.8 * dt; // Gravity

            // Rotation
            t.mesh.rotation.x += dt * 5;

            if (t.mesh.position.y < 0) {
                this.scene.remove(t.mesh);
                this.targets.splice(i, 1);
            }
        }
    }

    spawnTarget() {
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0xff4500 });
        const mesh = new THREE.Mesh(geometry, material);

        // Start low, launch up and away
        mesh.position.set((Math.random() - 0.5) * 10, 0, -5);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            10 + Math.random() * 5,
            -10 - Math.random() * 5
        );

        this.scene.add(mesh);
        this.targets.push({ mesh, velocity, active: true });
    }

    onShoot(intersects) {
        if (this.game.ammo <= 0) return;
        this.game.ammo--;
        this.game.updateHUD();

        for (let hit of intersects) {
            const target = this.targets.find(t => t.mesh === hit.object);
            if (target && target.active) {
                // Hit!
                this.scene.remove(target.mesh);
                target.active = false;
                this.game.score += 100;
                this.game.updateHUD();

                // Explosion effect (simple particles)
                this.createExplosion(target.mesh.position, 0xff4500);
                break;
            }
        }
    }

    createExplosion(pos, color) {
        // Temporary particles
        const count = 10;
        const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const mat = new THREE.MeshBasicMaterial({ color: color });

        for(let i=0; i<count; i++) {
            const part = new THREE.Mesh(geo, mat);
            part.position.copy(pos);
            part.userData = { vel: new THREE.Vector3((Math.random()-0.5)*5, (Math.random()-0.5)*5, (Math.random()-0.5)*5) };
            this.scene.add(part);

            setTimeout(() => this.scene.remove(part), 500);
        }
    }
}
