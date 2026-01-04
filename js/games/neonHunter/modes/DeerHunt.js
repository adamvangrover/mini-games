import ModeBase from './ModeBase.js';

export default class DeerHunt extends ModeBase {
    init() {
        super.init();
        this.camera.position.set(0, 1.6, 5);

        // Forest Environment
        this.scene.background = new THREE.Color(0x1a472a); // Dark Green
        this.scene.fog = new THREE.FogExp2(0x1a472a, 0.05);

        // Ground
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Trees
        for(let i=0; i<50; i++) {
            this.spawnTree();
        }

        this.spawnTimer = 0;
        this.game.ammo = 5;
    }

    spawnTree() {
        const x = (Math.random() - 0.5) * 80;
        const z = -5 - Math.random() * 50;

        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 4, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(x, 2, z);

        const leavesGeo = new THREE.ConeGeometry(3, 6, 8);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x006400 });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.set(0, 4, 0);
        trunk.add(leaves);

        this.scene.add(trunk);
    }

    update(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnDeer();
            this.spawnTimer = 3.0 + Math.random() * 2;
            this.game.ammo = 5;
            this.game.updateHUD();
        }

        // Move Deer
        this.targets.forEach((t) => {
            if (!t.active) return;
            t.mesh.position.addScaledVector(t.velocity, dt);
            t.mesh.lookAt(t.mesh.position.clone().add(t.velocity));

            // Remove if far out
            if (Math.abs(t.mesh.position.x) > 50) {
                this.scene.remove(t.mesh);
                t.active = false;
            }
        });

        // Cleanup inactive
        this.targets = this.targets.filter(t => t.active);
    }

    spawnDeer() {
        const deer = new THREE.Group();

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 2.0), new THREE.MeshStandardMaterial({color: 0x8B4513}));
        body.position.y = 1.5;
        deer.add(body);

        // Neck
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), new THREE.MeshStandardMaterial({color: 0x8B4513}));
        neck.position.set(0, 2.2, 0.8);
        neck.rotation.x = -0.5;
        deer.add(neck);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.8), new THREE.MeshStandardMaterial({color: 0x8B4513}));
        head.position.set(0, 2.8, 1.2);
        deer.add(head);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.2, 1.5, 0.2);
        const legMat = new THREE.MeshStandardMaterial({color: 0x5c4033});
        const l1 = new THREE.Mesh(legGeo, legMat); l1.position.set(-0.4, 0.75, 0.8); deer.add(l1);
        const l2 = new THREE.Mesh(legGeo, legMat); l2.position.set(0.4, 0.75, 0.8); deer.add(l2);
        const l3 = new THREE.Mesh(legGeo, legMat); l3.position.set(-0.4, 0.75, -0.8); deer.add(l3);
        const l4 = new THREE.Mesh(legGeo, legMat); l4.position.set(0.4, 0.75, -0.8); deer.add(l4);

        // Spawn Side
        const leftSide = Math.random() > 0.5;
        const x = leftSide ? -40 : 40;
        const z = -10 - Math.random() * 20;

        deer.position.set(x, 0, z);
        this.scene.add(deer);

        const velocity = new THREE.Vector3(leftSide ? 8 : -8, 0, 0);
        this.targets.push({ mesh: deer, velocity, active: true });
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
                this.game.score += 200;
                this.game.updateHUD();

                // Add particles
                this.createBloodEffect(hit.point);
                break;
            }
        }
    }

    createBloodEffect(pos) {
        // Red particles
         for(let i=0; i<8; i++) {
            const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const part = new THREE.Mesh(geo, mat);
            part.position.copy(pos);
            this.scene.add(part);
            // Move particles
            const vel = new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5));
            const animate = () => {
                 part.position.add(vel.clone().multiplyScalar(0.1));
                 part.scale.multiplyScalar(0.9);
                 if(part.scale.x < 0.01) {
                     this.scene.remove(part);
                 } else {
                     requestAnimationFrame(animate);
                 }
            };
            animate();
        }
    }
}
