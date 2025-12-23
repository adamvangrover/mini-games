export default class World {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.rainSystem = null;

        this.generateCity();
        this.createEnvironment();
        this.createRain();
    }

    createEnvironment() {
        // Floor Grid
        const gridHelper = new THREE.GridHelper(2000, 100, 0x1a1a2e, 0x0f0f1a);
        this.scene.add(gridHelper);

        // Ground Plane (Dark Reflection)
        const planeGeo = new THREE.PlaneGeometry(2000, 2000);
        const planeMat = new THREE.MeshPhongMaterial({
            color: 0x050510,
            shininess: 10,
            specular: 0x111111
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);
    }

    generateCity() {
        // Procedural Blocks
        const blockSize = 80;
        const streetWidth = 20;
        const mapSize = 10; // 10x10 blocks

        const geometry = new THREE.BoxGeometry(1, 1, 1);

        // Materials (Neon Palettes)
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x00ffff, emissiveIntensity: 0.4, roughness: 0.2 }),
            new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff00ff, emissiveIntensity: 0.4, roughness: 0.2 }),
            new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x0000ff, emissiveIntensity: 0.5, roughness: 0.2 }),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1 }) // Dark Glass
        ];

        for(let x = -mapSize; x <= mapSize; x++) {
            for(let z = -mapSize; z <= mapSize; z++) {
                // Chance for open plaza
                if(Math.random() < 0.15) continue;
                // Chance for center "Core" tower
                const dist = Math.sqrt(x*x + z*z);

                const posX = x * (blockSize + streetWidth);
                const posZ = z * (blockSize + streetWidth);

                const height = dist < 3 ? 100 + Math.random() * 150 : 20 + Math.random() * 60;
                const width = blockSize * (0.8 + Math.random() * 0.2);

                const matIndex = Math.floor(Math.random() * materials.length);
                const mesh = new THREE.Mesh(geometry, materials[matIndex]);

                mesh.position.set(posX, height/2, posZ);
                mesh.scale.set(width, height, width);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                this.scene.add(mesh);
                this.buildings.push(mesh);

                // Add "Windows" or Detail lights (simple small cubes)
                if(Math.random() > 0.5) {
                    this.addDetailLights(posX, height, posZ, width);
                }
            }
        }
    }

    addDetailLights(x, h, z, w) {
        // Add a glowing stripe
        const stripGeo = new THREE.BoxGeometry(w + 2, 1, w + 2);
        const stripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(x, h * 0.9, z);
        this.scene.add(strip);
    }

    createRain() {
        const particleCount = 1500;
        const geom = new THREE.BufferGeometry();
        const positions = [];

        for(let i=0; i<particleCount; i++) {
            positions.push(
                (Math.random() - 0.5) * 600,
                Math.random() * 200,
                (Math.random() - 0.5) * 600
            );
        }

        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 0.5,
            transparent: true,
            opacity: 0.6
        });

        this.rainSystem = new THREE.Points(geom, mat);
        this.scene.add(this.rainSystem);
    }

    update(dt) {
        if(this.rainSystem) {
            const positions = this.rainSystem.geometry.attributes.position.array;
            for(let i=1; i<positions.length; i+=3) {
                positions[i] -= 50 * dt; // Fall speed
                if(positions[i] < 0) {
                    positions[i] = 200; // Reset height
                }
            }
            this.rainSystem.geometry.attributes.position.needsUpdate = true;
        }
    }
}
