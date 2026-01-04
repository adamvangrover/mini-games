import ModeBase from './ModeBase.js';

export default class SharkAttack extends ModeBase {
    init() {
        super.init();
        this.camera.position.set(0, 0, 5);

        // Underwater Environment
        this.scene.background = new THREE.Color(0x001e36); // Deep Blue
        this.scene.fog = new THREE.FogExp2(0x001e36, 0.08);

        // Water surface?
        const waterGeo = new THREE.PlaneGeometry(100, 100);
        const waterMat = new THREE.MeshBasicMaterial({ color: 0x006994, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 10;
        this.scene.add(water);

        // Seabed
        const seabedGeo = new THREE.PlaneGeometry(100, 100);
        const seabedMat = new THREE.MeshStandardMaterial({ color: 0x2f4f4f });
        const seabed = new THREE.Mesh(seabedGeo, seabedMat);
        seabed.rotation.x = -Math.PI / 2;
        seabed.position.y = -10;
        this.scene.add(seabed);

        this.spawnTimer = 0;
        this.game.ammo = 10; // Spear gun
        this.particles = [];
        this.bubbles = [];

        // Ambient bubbles
        for(let i=0; i<20; i++) this.spawnBubble(true);
    }

    update(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnShark();
            this.spawnTimer = 2.0;
            this.game.ammo = 10;
            this.game.updateHUD();
        }

        // Move Sharks
        this.targets.forEach((t) => {
            if (!t.active) return;
            const dir = this.camera.position.clone().sub(t.mesh.position).normalize();
            t.mesh.position.addScaledVector(dir, t.speed * dt);
            t.mesh.lookAt(this.camera.position);

            // Check collision with player
            if (t.mesh.position.distanceTo(this.camera.position) < 2) {
                // Game Over logic
                this.game.gameOver(this.game.score);
            }
        });

        this.targets = this.targets.filter(t => t.active);

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.mesh.position.addScaledVector(p.velocity, dt);
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }

        // Update Bubbles
        this.bubbles.forEach(b => {
            b.position.y += dt * 2;
            if(b.position.y > 10) b.position.y = -10;
        });
    }

    spawnBubble(init=false) {
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const mat = new THREE.MeshBasicMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.5 });
        const bubble = new THREE.Mesh(geo, mat);
        const x = (Math.random() - 0.5) * 20;
        const y = (Math.random() - 0.5) * 20;
        const z = -5 - Math.random() * 10;
        bubble.position.set(x, y, z);
        this.scene.add(bubble);
        this.bubbles.push(bubble);
    }

    spawnShark() {
        const shark = new THREE.Group();

        // Body
        const bodyGeo = new THREE.ConeGeometry(0.8, 3, 8);
        const bodyMat = new THREE.MeshStandardMaterial({color: 0x708090});
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2; // Point forward? Cone points up y by default.
        // If we rotate X 90, it points to -Z or +Z?
        // Cone points along Y. Rotate X 90 -> points along Z.
        // We want it to point at camera. LookAt handles orientation, but we need the mesh to be oriented correctly locally.
        // Let's assume Z-forward is "nose".
        body.rotation.x = -Math.PI / 2;
        shark.add(body);

        // Dorsal Fin
        const finGeo = new THREE.BoxGeometry(0.1, 0.5, 0.5);
        const fin = new THREE.Mesh(finGeo, bodyMat);
        fin.position.set(0, 0.6, 0.5);
        shark.add(fin);

        // Spawn far away
        const angle = Math.random() * Math.PI * 2;
        const dist = 30;
        const x = Math.cos(angle) * dist;
        const y = (Math.random() - 0.5) * 10;
        const z = Math.sin(angle) * dist - 20; // Bias forward

        shark.position.set(x, y, z);
        this.scene.add(shark);

        this.targets.push({ mesh: shark, speed: 5 + Math.random() * 3, active: true });
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
                this.game.score += 500;
                this.game.updateHUD();

                this.createBloodEffect(hit.point);
                break;
            }
        }
    }

    createBloodEffect(pos) {
        for(let i=0; i<15; i++) {
            const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const mat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
            const part = new THREE.Mesh(geo, mat);
            part.position.copy(pos);
            this.scene.add(part);
            this.particles.push({
                mesh: part,
                velocity: new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)),
                life: 1.5
            });
        }
    }
}
