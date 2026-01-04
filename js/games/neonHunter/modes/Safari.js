import ModeBase from './ModeBase.js';

export default class Safari extends ModeBase {
    init() {
        super.init();

        // Camera Setup (Main)
        this.camera.position.set(0, 1.6, 0);

        // Environment: Golden Savannah (Feature Branch visuals are better for "Safari")
        this.scene.background = new THREE.Color(0xFFD700); 
        this.scene.fog = new THREE.FogExp2(0xFFD700, 0.02);

        // Ground: Larger size (Main) but Savannah color (Feature)
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0xDAA520 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        this.spawnTimer = 0;
        
        // Ammo: Compromise (Start with more because charging animals are dangerous)
        this.game.ammo = 8;
        document.getElementById('nh-ammo').innerText = "8";
    }

    update(dt) {
        this.spawnTimer -= dt;
        
        // Spawning Logic
        if (this.spawnTimer <= 0) {
            this.spawnTarget();
            
            // Timer: Fast paced (Hybrid)
            this.spawnTimer = 2.0;
            
            // Auto Reload mechanic (Feature Branch)
            if(this.game.ammo <= 0) {
                 this.game.ammo = 8;
                 document.getElementById('nh-ammo').innerText = "8";
            }
        }

        // Move Animals
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            
            // Movement (Feature Branch: Charging Z-axis)
            t.mesh.position.addScaledVector(t.velocity, dt);
            
            // Animation: Bobbing effect
            t.mesh.position.y = 2 + Math.sin(Date.now() * 0.01) * 0.2;

            // Bounds check (Feature Branch logic for Z-axis)
            // If it passes the camera (z > 5) or is too far back
            if (t.mesh.position.z > 5 || t.mesh.position.z < -80) {
                this.scene.remove(t.mesh);
                this.targets.splice(i, 1);
            }
        }
    }

    spawnTarget() {
        // Rhino or Elephant Geometry (From Feature Branch)
        const isRhino = Math.random() > 0.5;
        const animal = new THREE.Group();

        const color = isRhino ? 0x808080 : 0x708090;
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 4), new THREE.MeshStandardMaterial({color}));
        body.position.y = 0; // Centered in group
        animal.add(body);

        if (isRhino) {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 8), new THREE.MeshStandardMaterial({color: 0xffffff}));
            horn.position.set(0, 0.5, 2.2);
            horn.rotation.x = 0.5;
            animal.add(horn);
        } else {
            // Elephant trunk
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 8), new THREE.MeshStandardMaterial({color}));
            trunk.position.set(0, 0, 2.5);
            trunk.rotation.x = 0.5;
            animal.add(trunk);
        }

        // Position: Spawn far away coming towards player (Feature Logic)
        animal.position.set((Math.random()-0.5) * 60, 2, -60);

        // Velocity: Towards Z+ (Player)
        const speed = 10 + Math.random() * 5;
        const velocity = new THREE.Vector3(0, 0, speed); 

        this.scene.add(animal);
        this.targets.push({ mesh: animal, velocity, active: true });
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
                
                // Score (Main Branch is more generous)
                this.game.score += 300;
                this.game.updateHUD();

                // Explosion FX (Main Branch)
                this.createExplosion(target.mesh.position, 0xff0000);
                break;
            }
        }
    }

    createExplosion(pos, color) {
        // Particle System (From Main Branch)
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