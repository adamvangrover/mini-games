export class Player {
    constructor(scene, x, z) {
        this.scene = scene;

        // Group for player + vehicle
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 0, z);
        this.scene.add(this.mesh);

        // Avatar Body
        // Fallback for older Three.js versions without CapsuleGeometry
        const geometry = (typeof THREE.CapsuleGeometry !== 'undefined')
            ? new THREE.CapsuleGeometry(2, 6, 4, 8)
            : new THREE.CylinderGeometry(2, 2, 6, 8);

        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x0088aa,
            emissiveIntensity: 0.5,
            roughness: 0.3
        });
        this.body = new THREE.Mesh(geometry, material);
        this.body.position.y = 3;
        this.body.castShadow = true;
        this.mesh.add(this.body);

        // Halo/Ring
        const ringGeo = new THREE.TorusGeometry(3, 0.2, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.halo = new THREE.Mesh(ringGeo, ringMat);
        this.halo.rotation.x = Math.PI / 2;
        this.halo.position.y = 3;
        this.mesh.add(this.halo);

        // Vehicle Mesh Container
        this.vehicleMesh = new THREE.Group();
        this.mesh.add(this.vehicleMesh);

        this.baseSpeed = 40;
        this.currentSpeed = 40;
        this.vehicleId = 'legs';
    }

    setVehicle(vehicleId, stats) {
        this.vehicleId = vehicleId;
        this.currentSpeed = stats.speed;

        // Clear old vehicle
        while(this.vehicleMesh.children.length > 0){
            this.vehicleMesh.remove(this.vehicleMesh.children[0]);
        }

        if (vehicleId === 'legs') {
            this.body.position.y = 3;
            this.halo.position.y = 3;
        } else if (vehicleId === 'hoverboard') {
            const board = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 8), new THREE.MeshStandardMaterial({ color: stats.color }));
            board.position.y = 1;
            this.vehicleMesh.add(board);
            this.body.position.y = 4.5;
            this.halo.position.y = 4.5;
        } else if (vehicleId === 'bike') {
            const bike = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 10), new THREE.MeshStandardMaterial({ color: stats.color }));
            bike.position.y = 1.5;
            this.vehicleMesh.add(bike);
            this.body.position.y = 5; // Sitting?
            this.halo.position.y = 5;
        } else if (vehicleId === 'glider') {
             const wings = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 4), new THREE.MeshStandardMaterial({ color: stats.color, transparent: true, opacity: 0.8 }));
             wings.position.y = 6;
             this.vehicleMesh.add(wings);
             this.body.position.y = 3; // Hanging?
             this.halo.position.y = 3;
        }
    }

    move(vec, dt) {
        if(vec.lengthSq() > 0) {
            vec.normalize();
            this.mesh.position.addScaledVector(vec, this.currentSpeed * dt);

            // Rotate to face direction
            const angle = Math.atan2(vec.x, vec.z);
            this.mesh.rotation.y = angle;

            // Tilt if vehicle
            if (this.vehicleId !== 'legs') {
                this.mesh.rotation.z = -vec.x * 0.2; // Bank turn
                this.mesh.rotation.x = vec.z * 0.1;
            } else {
                this.mesh.rotation.z = 0;
                this.mesh.rotation.x = 0;
            }
        } else {
            // Reset tilt
             this.mesh.rotation.z *= 0.9;
             this.mesh.rotation.x *= 0.9;
        }

        // Bobbing effect
        if(this.vehicleId === 'legs') {
             this.halo.position.y = 3 + Math.sin(Date.now() * 0.005) * 0.5;
        } else {
             // Vehicle hover
             this.mesh.position.y = Math.sin(Date.now() * 0.005 + 1) * 0.5;
        }
    }
}

export class NPC {
    constructor(scene, x, z, role) {
        this.scene = scene;
        this.role = role;

        const geo = new THREE.ConeGeometry(2, 6, 8);
        const color = this.getRoleColor(role);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2
        });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(x, 3, z);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        this.target = new THREE.Vector3(x, 3, z);
        this.timer = 0;
    }

    getRoleColor(role) {
        switch(role) {
            case 'Merchant': return 0x00ff00;
            case 'Guard': return 0xff0000;
            case 'Hacker': return 0xff00ff;
            default: return 0xcccccc;
        }
    }

    update(dt) {
        this.timer -= dt;
        if(this.timer <= 0) {
            this.target.x = this.mesh.position.x + (Math.random() - 0.5) * 40;
            this.target.z = this.mesh.position.z + (Math.random() - 0.5) * 40;
            this.timer = 2 + Math.random() * 4;
        }

        const dir = new THREE.Vector3().subVectors(this.target, this.mesh.position);
        if(dir.lengthSq() > 1) {
            dir.normalize();
            this.mesh.position.addScaledVector(dir, 10 * dt);
            this.mesh.lookAt(this.target);
        }
    }
}

export class Car {
    constructor(scene, x, z) {
        this.scene = scene;
        this.mesh = new THREE.Group();

        const bodyGeo = new THREE.BoxGeometry(4, 2, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 2;
        this.mesh.add(body);

        const lightGeo = new THREE.BoxGeometry(3, 0.5, 0.5);
        const frontLight = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        frontLight.position.set(0, 2, 4);
        this.mesh.add(frontLight);

        const backLight = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        backLight.position.set(0, 2, -4);
        this.mesh.add(backLight);

        this.mesh.position.set(x, 0, z);
        this.scene.add(this.mesh);

        this.speed = 30 + Math.random() * 40;
        this.dir = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize();
        this.mesh.lookAt(this.mesh.position.clone().add(this.dir));
    }

    update(dt) {
        this.mesh.position.addScaledVector(this.dir, this.speed * dt);
        this.mesh.position.y = 2 + Math.sin(Date.now() * 0.01 + this.speed) * 0.5;
    }

    reset() {
        this.mesh.position.set(0,0,0);
        this.dir = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize();
        this.mesh.lookAt(this.mesh.position.clone().add(this.dir));
    }
}

export class DataNode {
    constructor(scene, x, z) {
        this.scene = scene;
        this.hacked = false;

        const geo = new THREE.BoxGeometry(3, 3, 3);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x0000ff,
            emissive: 0x0000ff,
            emissiveIntensity: 0.8,
            wireframe: true
        });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(x, 4, z);
        this.scene.add(this.mesh);

        const coreGeo = new THREE.OctahedronGeometry(1);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.mesh.add(this.core);
    }

    update(dt) {
        if(this.hacked) return;
        this.mesh.rotation.x += dt;
        this.mesh.rotation.y += dt;
        this.core.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);
    }

    hack() {
        this.hacked = true;
        this.mesh.material.color.setHex(0x00ff00);
        this.mesh.material.emissive.setHex(0x00ff00);
        this.mesh.material.wireframe = false;
        this.core.visible = false;
    }
}

export class GlitchPortal {
    constructor(scene, x, z) {
        this.scene = scene;
        this.targetGame = null;

        const geom = new THREE.IcosahedronGeometry(4, 0);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        this.mesh = new THREE.Mesh(geom, mat);
        this.mesh.position.set(x, 5, z);
        this.scene.add(this.mesh);

        // Particles
        const partGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(30 * 3);
        for(let i=0; i<30*3; i++) positions[i] = (Math.random() - 0.5) * 10;
        partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const partMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.5 });
        this.particles = new THREE.Points(partGeo, partMat);
        this.mesh.add(this.particles);
    }

    update(dt) {
        this.mesh.rotation.x += dt;
        this.mesh.rotation.y += dt * 2;
        this.mesh.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.3);
        this.particles.rotation.y -= dt;
    }
}

export class BuildingMarker {
    constructor(scene, x, z, type) {
        this.scene = scene;
        this.type = type; // 'shop', 'home'

        const color = type === 'shop' ? 0xffff00 : 0x00ff00;
        const geo = new THREE.ConeGeometry(2, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: color, wireframe: true });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(x, 8, z);
        this.mesh.rotation.x = Math.PI; // Point down
        this.scene.add(this.mesh);

        // Ground Ring
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(4, 5, 16),
            new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.5;
        this.mesh.attach(ring); // Attach to move with parent but we want it at ground...
        // Actually better to make ring separate or just offset
        ring.position.set(0, -7.5, 0); // Offset from top
    }

    update(dt) {
        this.mesh.rotation.y += dt;
        this.mesh.position.y = 8 + Math.sin(Date.now() * 0.003) * 1;
    }
}
