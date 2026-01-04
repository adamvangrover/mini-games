import ModeBase from './ModeBase.js';

export default class DeerHunt extends ModeBase {
    init() {
        super.init();
        this.camera.position.set(0, 1.6, 0);

        // Forest colors
        this.scene.background = new THREE.Color(0x001100);
        this.scene.fog = new THREE.FogExp2(0x001100, 0.02);

        // Ground
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x003300 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Trees
        for(let i=0; i<40; i++) {
            this.createTree();
        }

        this.spawnTimer = 0;
        this.game.ammo = 6;
        document.getElementById('nh-ammo').innerText = "6";
    }

    createTree() {
        const height = 5 + Math.random() * 5;
        const geo = new THREE.ConeGeometry(1, height, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const tree = new THREE.Mesh(geo, mat);

        // Random position, avoiding center
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        if(Math.abs(x) < 5 && Math.abs(z) < 5) return;

        tree.position.set(x, height/2, z);
        this.scene.add(tree);
    }

    update(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTarget();
            this.spawnTimer = 2.0;
        }

        // Move targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.mesh.position.addScaledVector(t.velocity, dt);
            t.mesh.lookAt(t.mesh.position.clone().add(t.velocity));

            // Remove if out of bounds
            if (Math.abs(t.mesh.position.x) > 60) {
                this.scene.remove(t.mesh);
                this.targets.splice(i, 1);
            }
        }
    }

    spawnTarget() {
        const mesh = new THREE.Group();

        // Body
        const geo = new THREE.BoxGeometry(1.5, 1, 3);
        const mat = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
        const body = new THREE.Mesh(geo, mat);
        mesh.add(body);

        // Head
        const hGeo = new THREE.BoxGeometry(0.8, 0.8, 1);
        const head = new THREE.Mesh(hGeo, mat);
        head.position.set(0, 1, 1.5);
        mesh.add(head);

        const side = Math.random() > 0.5 ? 1 : -1;
        mesh.position.set(side * 50, 0.5, -10 - Math.random() * 30);

        const speed = 10 + Math.random() * 5;
        const velocity = new THREE.Vector3(-side * speed, 0, 0);

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
                this.game.score += 150;
                this.game.updateHUD();

                // Blood/Hit particles
                this.createExplosion(target.mesh.position, 0xffff00);
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
            // Simple animation in main loop? Or manage here?
            // To be consistent, let's just use setTimeout cleanup for now or add to a particle manager if available.
            // But ModeBase doesn't seem to manage particles.
            // I'll leave them stationary for now or add a simple tween if I can.
            // Better: use a simple manual tween.
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
