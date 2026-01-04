import ModeBase from './ModeBase.js';

export default class Safari extends ModeBase {
    init() {
        super.init();
        this.camera.position.set(0, 1.6, 0);

        // Safari colors
        this.scene.background = new THREE.Color(0x221100);
        this.scene.fog = new THREE.FogExp2(0x221100, 0.015);

        // Ground
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xccaa00 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        this.spawnTimer = 0;
        this.game.ammo = 6;
        this.game.maxAmmo = 6;
        this.game.updateHUD();
        this.reloadTimer = 0;
    }

    update(dt) {
        // Reload Logic
        if (this.game.ammo === 0 && !this.game.isReloading) {
             this.game.isReloading = true;
             this.reloadTimer = 2.0;
             this.game.showMsg("RELOADING...", 2000);
        }

        if (this.game.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.game.ammo = this.game.maxAmmo;
                this.game.isReloading = false;
                this.game.updateHUD();
                this.game.showMsg("");
            }
        }

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTarget();
            this.spawnTimer = 1.0; // Faster spawns
        }

        // Move targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.mesh.position.addScaledVector(t.velocity, dt);
            t.mesh.lookAt(t.mesh.position.clone().add(t.velocity));

            if (Math.abs(t.mesh.position.x) > 80) {
                this.scene.remove(t.mesh);
                this.targets.splice(i, 1);
            }
        }
    }

    spawnTarget() {
        const mesh = new THREE.Group();

        // Zebra/Animal body
        const geo = new THREE.BoxGeometry(1.5, 1, 3);
        const mat = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White (Zebraish)
        const body = new THREE.Mesh(geo, mat);
        mesh.add(body);

        // Head
        const hGeo = new THREE.BoxGeometry(0.8, 0.8, 1);
        const head = new THREE.Mesh(hGeo, mat);
        head.position.set(0, 1, 1.5);
        mesh.add(head);

        const side = Math.random() > 0.5 ? 1 : -1;
        mesh.position.set(side * 60, 0.5, -10 - Math.random() * 40);

        const speed = 20 + Math.random() * 10; // Faster
        const velocity = new THREE.Vector3(-side * speed, 0, 0);

        this.scene.add(mesh);
        this.targets.push({ mesh, velocity, active: true });
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

                this.createExplosion(target.mesh.position, 0xff0000);
                break;
            }
        }
    }

    createExplosion(pos, color) {
        const count = 10;
        const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        for(let i=0; i<count; i++) {
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(pos);
            this.scene.add(p);

            const vel = new THREE.Vector3((Math.random()-0.5)*5, (Math.random()-0.5)*5, (Math.random()-0.5)*5);
            const animateParticle = () => {
                if(!p.parent) return;
                p.position.addScaledVector(vel, 0.1);
                p.scale.multiplyScalar(0.9);
                if(p.scale.x < 0.1) this.scene.remove(p);
                else requestAnimationFrame(animateParticle);
            };
            animateParticle();
        }
    }
}
