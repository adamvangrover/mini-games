import ModeBase from './ModeBase.js';

export default class SharkAttack extends ModeBase {
    init() {
        super.init();

        // Camera Setup (Main)
        this.camera.position.set(0, 1.6, 0);

        // Environment: Deep Blue (Feature Branch has better atmosphere)
        this.scene.background = new THREE.Color(0x000080);
        this.scene.fog = new THREE.FogExp2(0x000080, 0.03);

        // Water surface (Feature Branch)
        const waterGeo = new THREE.PlaneGeometry(100, 100);
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 10;
        this.scene.add(water);

        // Ocean floor (Feature Branch)
        const floorGeo = new THREE.PlaneGeometry(200, 200);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x000033 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -10;
        this.scene.add(floor);

        // Bubbles System (Feature Branch)
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
        
        // Ammo: Hybrid Approach
        // Value: 8 (Feature - Sharks are hard)
        // Architecture: MaxAmmo/HUD (Main - Better UI)
        this.game.ammo = 8;
        this.game.maxAmmo = 8;
        this.game.updateHUD();
        this.reloadTimer = 0;
    }

    update(dt) {
        // Bubble animation (Feature Branch - Visuals)
        this.bubbles.forEach(b => {
            b.mesh.position.y += dt * b.speed;
            if(b.mesh.position.y > 10) b.mesh.position.y = -10;
        });

        // Reload Logic (Main Branch - Gameplay Mechanics)
        // Replaces the simple "if ammo <= 0 then reset" logic from Feature branch
        if (this.game.ammo === 0 && !this.game.isReloading) {
             this.game.isReloading = true;
             this.reloadTimer = 2.0;
             if(this.game.showMsg) this.game.showMsg("RELOADING...", 2000);
        }

        if (this.game.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.game.ammo = this.game.maxAmmo;
                this.game.isReloading = false;
                this.game.updateHUD();
                if(this.game.showMsg) this.game.showMsg("");
            }
        }

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTarget();
            this.spawnTimer = 1.5; // Fast pace
            
            // NOTE: "Auto Reload" block from Feature Branch removed here 
            // to avoid conflict with the Timed Reload logic above.
        }

        // Move Sharks
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.mesh.position.addScaledVector(t.velocity, dt);
            
            // Logic: Always face player (Main Branch)
            t.mesh.lookAt(this.camera.position); 

            // Animation: Swim motion (Feature Branch)
            t.mesh.rotation.z = Math.sin(Date.now() * 0.01) * 0.2;

            // Attack Logic (Main Branch) - Critical for gameplay
            if (t.mesh.position.distanceTo(this.camera.position) < 2) {
                this.game.gameOver("EATEN BY SHARK");
                return;
            }
        }
    }

    spawnTarget() {
        const mesh = new THREE.Group();

        // Shark Body - Wireframe Style (Main Branch fits "Neon" theme better)
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

        // Spawning Logic: Semi-circle around player (Main Branch)
        // This ensures sharks come FROM the distance TOWARDS the player
        const angle = Math.random() * Math.PI; // Front 180 deg
        const radius = 40; // Further out
        const x = Math.cos(angle) * radius;
        const z = -Math.sin(angle) * radius; // In front (-z)

        // Fix logic for semi-circle front (Main Branch comments preserved for clarity):
        // We want -z direction primarily.
        // If angle is 0..PI
        // x = R*cos(a) -> -R to R
        // z = -R*sin(a) -> 0 to -R (this is correct, front)

        mesh.position.set(x, Math.random() * 4 - 2, z);

        // Velocity: Calculate vector towards player (Main Branch)
        const dir = new THREE.Vector3(0, 1.6, 0).sub(mesh.position).normalize();
        const speed = 8 + Math.random() * 5;
        const velocity = dir.multiplyScalar(speed);

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
                
                this.game.score += 500;
                this.game.updateHUD();

                // Hybrid FX: Use Main's particle system, but Feature's "Blood" color
                this.createExplosion(target.mesh.position, 0x880000);
                break;
            }
        }
    }

    createExplosion(pos, color) {
        // Robust particle system (Main Branch)
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