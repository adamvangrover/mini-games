import ModeBase from './ModeBase.js';

export default class SharkAttack extends ModeBase {
    init() {
        super.init();
        this.camera.position.set(0, 1.6, 0);

        // Underwater colors
        this.scene.background = new THREE.Color(0x000033);
        this.scene.fog = new THREE.FogExp2(0x000033, 0.04);

        // Sea floor
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x000022 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -5; // Deep
        this.scene.add(ground);

        this.spawnTimer = 0;
        this.game.ammo = 6;
        document.getElementById('nh-ammo').innerText = "6";
    }

    update(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTarget();
            this.spawnTimer = 1.5;
        }

        // Move targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.mesh.position.addScaledVector(t.velocity, dt);
            t.mesh.lookAt(this.camera.position); // Always face player

            // Attack logic
            if (t.mesh.position.distanceTo(this.camera.position) < 2) {
                // Game Over
                this.game.gameOver("EATEN BY SHARK");
                return;
            }
        }
    }

    spawnTarget() {
        const mesh = new THREE.Group();

        // Shark Body
        const geo = new THREE.ConeGeometry(1, 4, 5);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00aaff, wireframe: true });
        const body = new THREE.Mesh(geo, mat);
        body.rotation.x = -Math.PI / 2;
        mesh.add(body);

        // Fin
        const fGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,1), new THREE.Vector3(0,0,2)
        ]);
        const fin = new THREE.Mesh(fGeo, new THREE.MeshBasicMaterial({color: 0x00ffff, side: THREE.DoubleSide}));
        fin.position.y = 0.5;
        mesh.add(fin);

        // Spawn in semi-circle at distance
        const angle = Math.random() * Math.PI; // Front 180 deg
        const radius = 30;
        const x = Math.cos(angle) * radius;
        const z = -Math.sin(angle) * radius; // In front (-z)

        // Randomize z to be all around? No, user code said "semi-circle" but math was `cos(angle)*radius` and `-sin(angle)*radius` which is typical for circle.
        // Actually `Math.random() * Math.PI` gives 0 to PI.
        // Cos(0)=1, Sin(0)=0 -> x=R, z=0 (Right)
        // Cos(PI)=-1, Sin(PI)=0 -> x=-R, z=0 (Left)
        // Cos(PI/2)=0, Sin(PI/2)=1 -> x=0, z=-R (Front)
        // So this covers the front arc.

        mesh.position.set(x, Math.random() * 4 - 2, z);

        // Move towards 0,1.6,0
        const dir = new THREE.Vector3(0, 1.6, 0).sub(mesh.position).normalize();
        const speed = 5 + Math.random() * 5;
        const velocity = dir.multiplyScalar(speed);

        this.scene.add(mesh);
        this.targets.push({ mesh, velocity, active: true });
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
                this.game.score += 500;
                this.game.updateHUD();

                this.createExplosion(target.mesh.position, 0x00ffff);
                break;
            }
        }
    }

    createExplosion(pos, color) {
        const count = 15;
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
