import ModeBase from './ModeBase.js';

export default class DeerHunt extends ModeBase {
    init() {
        super.init();
        
        // Camera Setup (Main)
        this.camera.position.set(0, 1.6, 0);

        // Forest colors (Main - Darker Neon Theme)
        this.scene.background = new THREE.Color(0x001100);
        this.scene.fog = new THREE.FogExp2(0x001100, 0.02);

        // Ground (Main - Larger area)
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x003300 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Trees (Using Main's structure but Feature Branch's density)
        for(let i=0; i<50; i++) {
            this.createTree();
        }

        this.spawnTimer = 0;
        
        // Ammo (Main provides more ammo)
        this.game.ammo = 6;
        this.game.maxAmmo = 6;
        this.game.updateHUD();
        this.reloadTimer = 0;
    }

    createTree() {
        // Integrated Feature Branch's detailed tree geometry into Main's helper method
        const h = 5 + Math.random() * 10;
        
        // Trunk
        const tree = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.8, h, 6),
            new THREE.MeshStandardMaterial({ color: 0x3d2817 })
        );

        // Position (Hybrid logic: spread wide like Main, but varied z-depth like Feature)
        const x = (Math.random() - 0.5) * 80;
        const z = -10 - Math.random() * 60; // Bias towards background
        
        // Don't spawn on player
        if(Math.abs(x) < 5 && Math.abs(z) < 5) return;

        tree.position.set(x, h/2, z);
        this.scene.add(tree);

        // Leaves (From Feature Branch)
        const leaves = new THREE.Mesh(
            new THREE.ConeGeometry(2 + Math.random()*2, 5, 6),
            new THREE.MeshStandardMaterial({ color: 0x004d00 })
        );
        leaves.position.y = h/2 + 2;
        tree.add(leaves);
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
        
        // Spawning Logic
        if (this.spawnTimer <= 0) {
            this.spawnTarget();
            
            // Timer (Hybrid: Randomness from Feature, base speed from Main)
            this.spawnTimer = 2.0 + Math.random() * 3.0;

            // Auto reload mechanic (Preserved from Feature Branch)
            if(this.game.ammo <= 2) {
                 this.game.ammo = 5;
                 document.getElementById('nh-ammo').innerText = "5";
            }
        }

        // Move targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.mesh.position.addScaledVector(t.velocity, dt);
            
            // mechanics: LookAt (Main) + Hopping (Feature)
            t.mesh.lookAt(t.mesh.position.clone().add(t.velocity));
            t.mesh.position.y = Math.abs(Math.sin(Date.now() * 0.01)) * 0.5;

            // Remove if out of bounds (Main uses wider bounds)
            if (Math.abs(t.mesh.position.x) > 60) {
                this.scene.remove(t.mesh);
                this.targets.splice(i, 1);
            }
        }
    }

    spawnTarget() {
        // Using the Detailed Geometry from Feature Branch (Legs, Neck, Head)
        const deer = new THREE.Group();
        
        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 3), new THREE.MeshStandardMaterial({color: 0x8B4513}));
        body.position.y = 1.5;
        deer.add(body);

        // Neck
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), new THREE.MeshStandardMaterial({color: 0x8B4513}));
        neck.position.set(0, 2.5, 1.2);
        neck.rotation.x = -0.5;
        deer.add(neck);

        // Head
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

        // Position & Velocity
        const side = Math.random() > 0.5 ? 1 : -1;
        deer.position.set(side * 50, 0, -10 - Math.random() * 30);

        // Speed (Main is faster/harder)
        const speed = 8 + Math.random() * 5; 
        const velocity = new THREE.Vector3(-side * speed, 0, 0);

        this.scene.add(deer);
        this.targets.push({ mesh: deer, velocity, active: true });
    }

    onShoot(intersects) {
        if (this.game.ammo <= 0) return;
        this.game.ammo--;
        this.game.updateHUD();

        for (let hit of intersects) {
            let obj = hit.object;
            // Traverse up to find the Group
            while(obj.parent && obj.parent !== this.scene) obj = obj.parent;

            const target = this.targets.find(t => t.mesh === obj);
            if (target && target.active) {
                this.scene.remove(target.mesh);
                target.active = false;
                
                // Scoring (Main)
                this.game.score += 150;
                this.game.updateHUD();

                // Blood/Hit particles (Main)
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
            
            // Manual tween for particles
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