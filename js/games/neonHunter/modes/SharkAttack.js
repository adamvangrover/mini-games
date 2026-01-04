import ModeBase from './ModeBase.js';

export default class SharkAttack extends ModeBase {
    init() {
        super.init();
        this.scene.background = new THREE.Color(0x000080); // Deep Blue
        this.scene.fog = new THREE.FogExp2(0x000080, 0.05);

        // Water surface above?
        const waterGeo = new THREE.PlaneGeometry(100, 100);
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 10;
        this.scene.add(water);

        // Ocean floor
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x000033 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -10;
        this.scene.add(floor);

        // Bubbles
        this.bubbles = [];
        const bubbleGeo = new THREE.SphereGeometry(0.1, 4, 4);
        const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
        for(let i=0; i<100; i++) {
            const b = new THREE.Mesh(bubbleGeo, bubbleMat);
            b.position.set((Math.random()-0.5)*50, (Math.random()-0.5)*20, (Math.random()-0.5)*20 - 10);
            this.scene.add(b);
            this.bubbles.push({mesh: b, speed: Math.random() * 2});
        }

        this.spawnTimer = 0;
        this.game.ammo = 8; // Speargun
        document.getElementById('nh-ammo').innerText = "8";
    }

    update(dt) {
        // Bubble anim
        this.bubbles.forEach(b => {
            b.mesh.position.y += dt * b.speed;
            if(b.mesh.position.y > 10) b.mesh.position.y = -10;
        });

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnShark();
            this.spawnTimer = 2.0;
             if(this.game.ammo <= 0) {
                 this.game.ammo = 8;
                 document.getElementById('nh-ammo').innerText = "8";
            }
        }

        // Move Sharks
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.mesh.position.addScaledVector(t.velocity, dt);
            t.mesh.lookAt(t.mesh.position.clone().add(t.velocity));

            // Swim motion (tail wag placeholder by rotation?)
            t.mesh.rotation.z = Math.sin(Date.now() * 0.01) * 0.2;

            if (t.mesh.position.z > 5 || Math.abs(t.mesh.position.x) > 30) {
                this.scene.remove(t.mesh);
                this.targets.splice(i, 1);
            }
        }
    }

    spawnShark() {
        const shark = new THREE.Group();
        const body = new THREE.Mesh(new THREE.ConeGeometry(1, 4, 8), new THREE.MeshStandardMaterial({color: 0x708090}));
        body.rotation.x = -Math.PI / 2;
        shark.add(body);

        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4), new THREE.MeshStandardMaterial({color: 0x708090}));
        fin.position.set(0, 0.5, -0.5);
        fin.rotation.x = -0.5;
        shark.add(fin);

        shark.position.set((Math.random()-0.5) * 40, (Math.random()-0.5)*10, -40);

        const velocity = new THREE.Vector3(
            (Math.random()-0.5) * 5,
            0,
            5 + Math.random() * 5
        );

        this.scene.add(shark);
        this.targets.push({ mesh: shark, velocity, active: true });
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
                this.game.score += 300;
                this.game.updateHUD();

                // Blood cloud (red particles)
                this.createBlood(target.mesh.position);
                break;
            }
        }
    }

    createBlood(pos) {
        const count = 20;
        const geo = new THREE.SphereGeometry(0.2, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x880000, transparent: true, opacity: 0.8 });

        for(let i=0; i<count; i++) {
            const part = new THREE.Mesh(geo, mat);
            part.position.copy(pos);
            part.position.add(new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)));
            this.scene.add(part);

            setTimeout(() => this.scene.remove(part), 1000);
        }
    }
}
