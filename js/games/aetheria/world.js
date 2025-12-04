import { config } from './config.js';
import { utils } from './utils.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = [];
        this.clouds = [];
    }

    generate() {
        // Create Main Floating Island
        const geometry = new THREE.CylinderGeometry(50, 20, 15, 8, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x4caf50,
            flatShading: true,
            roughness: 0.8
        });
        
        // Displace vertices for irregularity
        const pos = geometry.attributes.position;
        for(let i=0; i<pos.count; i++) {
            const y = pos.getY(i);
            if (y > 0) {
                // Top surface noise
                pos.setY(i, y + Math.random() * 2);
            } else {
                // Bottom jaggedness
                pos.setY(i, y - Math.random() * 5);
            }
        }
        geometry.computeVertexNormals();

        const island = new THREE.Mesh(geometry, material);
        island.position.y = 0;
        island.receiveShadow = true;
        this.scene.add(island);
        this.chunks.push(island);

        // Add some trees
        for(let i=0; i<20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const rad = Math.random() * 40;
            const x = Math.cos(angle) * rad;
            const z = Math.sin(angle) * rad;

            this.createTree(x, 8, z);
        }

        // Add Floating Platforms
        for(let i=0; i<10; i++) {
             const w = 5 + Math.random() * 5;
             const geo = new THREE.BoxGeometry(w, 1, w);
             const mat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
             const platform = new THREE.Mesh(geo, mat);

             platform.position.set(
                 (Math.random() - 0.5) * 150,
                 Math.random() * 30 + 10,
                 (Math.random() - 0.5) * 150
             );
             this.scene.add(platform);
             this.chunks.push(platform);
        }

        // Clouds
        for(let i=0; i<50; i++) {
            const geo = new THREE.IcosahedronGeometry(Math.random() * 5 + 2, 0);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
            const cloud = new THREE.Mesh(geo, mat);
            cloud.position.set(
                (Math.random() - 0.5) * 400,
                Math.random() * 50 + 20,
                (Math.random() - 0.5) * 400
            );
            this.scene.add(cloud);
            this.clouds.push(cloud);
        }
    }

    createTree(x, y, z) {
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 3, 5);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(x, y + 1.5, z);

        const leavesGeo = new THREE.ConeGeometry(2, 4, 5);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.set(0, 3, 0);

        trunk.add(leaves);
        this.scene.add(trunk);
        this.chunks.push(trunk); // Add to collision candidates?
    }

    update(time) {
        // Animate clouds
        this.clouds.forEach((cloud, i) => {
            cloud.position.x += 0.05;
            if (cloud.position.x > 200) cloud.position.x = -200;
        });
    }

    getHeightAt(x, z) {
        // Simple collision check against the main island (radius 50)
        const dist = Math.sqrt(x*x + z*z);
        if (dist < 48) {
            return 8; // Top of main island
        }
        return -100; // Fall
    }
}
