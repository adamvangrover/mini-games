import ModeBase from './ModeBase.js';

export default class Safari extends ModeBase {
    init() {
        super.init();
        this.camera.position.set(0, 1.6, 5);

        // Savanna Environment
        this.scene.background = new THREE.Color(0x87CEEB); // Sky Blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 80);

        // Ground
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xE6C288 }); // Sand/Tan
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Acacia Trees
        for(let i=0; i<20; i++) {
            this.spawnAcacia();
        }

        this.spawnTimer = 0;
        this.game.ammo = 5;
        this.particles = [];
    }

    spawnAcacia() {
        const x = (Math.random() - 0.5) * 100;
        const z = -10 - Math.random() * 80;

        const tree = new THREE.Group();

        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 5, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2.5;
        tree.add(trunk);

        const topGeo = new THREE.CylinderGeometry(5, 1, 1, 8);
        const topMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 5;
        tree.add(top);

        tree.position.set(x, 0, z);
        this.scene.add(tree);
    }

    update(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnZebra();
            this.spawnTimer = 2.0 + Math.random() * 2;
            this.game.ammo = 5;
            this.game.updateHUD();
        }

        // Move Animals
        this.targets.forEach((t) => {
            if (!t.active) return;
            t.mesh.position.addScaledVector(t.velocity, dt);
            t.mesh.lookAt(t.mesh.position.clone().add(t.velocity));

            if (Math.abs(t.mesh.position.x) > 80) {
                this.scene.remove(t.mesh);
                t.active = false;
            }
        });

        this.targets = this.targets.filter(t => t.active);

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.mesh.position.addScaledVector(p.velocity, dt);
            p.mesh.scale.multiplyScalar(0.95);
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }

    spawnZebra() {
        const zebra = new THREE.Group();

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 2.2), new THREE.MeshStandardMaterial({color: 0xFFFFFF}));
        body.position.y = 1.5;
        zebra.add(body);

        // Stripes (Simplified as black boxes slightly larger)
        const stripeGeo = new THREE.BoxGeometry(1.52, 1.02, 0.2);
        const stripeMat = new THREE.MeshBasicMaterial({color: 0x000000});
        for(let i=0; i<3; i++) {
            const s = new THREE.Mesh(stripeGeo, stripeMat);
            s.position.set(0, 1.5, -0.5 + i*0.6);
            zebra.add(s);
        }

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.0), new THREE.MeshStandardMaterial({color: 0xFFFFFF}));
        head.position.set(0, 2.5, 1.5);
        zebra.add(head);

        // Spawn Side
        const leftSide = Math.random() > 0.5;
        const x = leftSide ? -60 : 60;
        const z = -10 - Math.random() * 40;

        zebra.position.set(x, 0, z);
        this.scene.add(zebra);

        const velocity = new THREE.Vector3(leftSide ? 12 : -12, 0, 0);
        this.targets.push({ mesh: zebra, velocity, active: true });
    }

    onShoot(intersects) {
        if (this.game.ammo <= 0) return;
        this.game.ammo--;
        this.game.updateHUD();

        for (let hit of intersects) {
            let obj = hit.object;
            while(obj.parent && obj.parent !== this.scene) obj = obj.parent;

            const target = this.targets.find(t => t.mesh === obj);
            if (target && target.active) {
                this.scene.remove(target.mesh);
                target.active = false;
                this.game.score += 300;
                this.game.updateHUD();

                this.createDustEffect(hit.point);
                break;
            }
        }
    }

    createDustEffect(pos) {
        for(let i=0; i<10; i++) {
            const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const mat = new THREE.MeshBasicMaterial({ color: 0xD2B48C });
            const part = new THREE.Mesh(geo, mat);
            part.position.copy(pos);
            this.scene.add(part);
            this.particles.push({
                mesh: part,
                velocity: new THREE.Vector3((Math.random()-0.5)*2, Math.random()*2, (Math.random()-0.5)*2),
                life: 1.0
            });
        }
    }
}
