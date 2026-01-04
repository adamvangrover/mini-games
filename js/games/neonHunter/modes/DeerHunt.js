import ModeBase from './ModeBase.js';

export default class DeerHunt extends ModeBase {
    init() {
        super.init();
        // Forest setup
        this.scene.background = new THREE.Color(0x052005);
        this.scene.fog = new THREE.FogExp2(0x052005, 0.03);

        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a3300 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Trees
        for(let i=0; i<50; i++) {
            const h = 5 + Math.random() * 10;
            const tree = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.8, h, 6),
                new THREE.MeshStandardMaterial({ color: 0x3d2817 })
            );
            tree.position.set(
                (Math.random()-0.5)*80,
                h/2,
                -10 - Math.random()*50
            );
            this.scene.add(tree);

            // Leaves
            const leaves = new THREE.Mesh(
                new THREE.ConeGeometry(2 + Math.random()*2, 5, 6),
                new THREE.MeshStandardMaterial({ color: 0x004d00 })
            );
            leaves.position.y = h/2 + 2;
            tree.add(leaves);
        }

        this.spawnTimer = 0;
        this.game.ammo = 5;
        document.getElementById('nh-ammo').innerText = "5";
    }

    update(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnDeer();
            this.spawnTimer = 5.0 + Math.random() * 5.0;
            // Auto reload after wave?
            if(this.game.ammo <= 2) {
                 this.game.ammo = 5;
                 document.getElementById('nh-ammo').innerText = "5";
            }
        }

        // Move Deer (run across screen)
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.mesh.position.addScaledVector(t.velocity, dt);

            // Hop effect
            t.mesh.position.y = Math.abs(Math.sin(Date.now() * 0.01)) * 0.5;

            if (t.mesh.position.x > 50 || t.mesh.position.x < -50) {
                this.scene.remove(t.mesh);
                this.targets.splice(i, 1);
            }
        }
    }

    spawnDeer() {
        const deer = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 3), new THREE.MeshStandardMaterial({color: 0x8B4513}));
        body.position.y = 1.5;
        deer.add(body);

        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), new THREE.MeshStandardMaterial({color: 0x8B4513}));
        neck.position.set(0, 2.5, 1.2);
        neck.rotation.x = -0.5;
        deer.add(neck);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 1.0), new THREE.MeshStandardMaterial({color: 0x8B4513}));
        head.position.set(0, 3.2, 1.8);
        deer.add(head);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.3, 1.5, 0.3);
        const legMat = new THREE.MeshStandardMaterial({color: 0x5C4033});

        const fl = new THREE.Mesh(legGeo, legMat); fl.position.set(-0.5, 0.75, 1.2); deer.add(fl);
        const fr = new THREE.Mesh(legGeo, legMat); fr.position.set(0.5, 0.75, 1.2); deer.add(fr);
        const bl = new THREE.Mesh(legGeo, legMat); bl.position.set(-0.5, 0.75, -1.2); deer.add(bl);
        const br = new THREE.Mesh(legGeo, legMat); br.position.set(0.5, 0.75, -1.2); deer.add(br);

        // Random Side
        const left = Math.random() > 0.5;
        deer.position.set(left ? -40 : 40, 0, -20 - Math.random() * 20);

        const speed = 5 + Math.random() * 5;
        const velocity = new THREE.Vector3(left ? speed : -speed, 0, 0);

        deer.rotation.y = left ? Math.PI / 2 : -Math.PI / 2;

        this.scene.add(deer);
        this.targets.push({ mesh: deer, velocity, active: true });
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
                this.game.score += 1000;
                this.game.updateHUD();
                break;
            }
        }
    }
}
