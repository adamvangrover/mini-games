import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { config } from './config.js';
import { noise2D } from './utils.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.terrain = null;
        this.water = null;
        this.instancedTrees = null;
        this.particles = null;
    }

    getHeight(x, z) {
        let y = 0;
        // FBM Noise (Fractal Brownian Motion)
        y += noise2D(x * 0.01, z * 0.01) * 20;
        y += noise2D(x * 0.04, z * 0.04) * 10;
        y += noise2D(x * 0.1, z * 0.1) * 2;
        
        // Create "Bowl" effect so player doesn't fall off world easily
        const dist = Math.sqrt(x*x + z*z);
        if(dist > config.worldSize * 0.4) {
            y -= (dist - config.worldSize * 0.4) * 0.5;
        }
        
        return y;
    }

    generate() {
        // --- TERRAIN ---
        const geometry = new THREE.PlaneGeometry(config.worldSize, config.worldSize, 128, 128);
        geometry.rotateX(-Math.PI / 2);
        
        const vertices = geometry.attributes.position.array;
        const colors = [];
        // const colorAttribute = new THREE.BufferAttribute(new Float32Array(vertices.length), 3);

        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            const y = this.getHeight(x, z);
            vertices[i + 1] = y;

            // Color based on height
            let color = new THREE.Color();
            if (y < config.waterLevel + 2) {
                color.setHex(0xe0d6a6); // Sand
            } else if (y < 10) {
                color.setHex(0x599646); // Grass
            } else if (y < 25) {
                color.setHex(0x5e5e5e); // Rock
            } else {
                color.setHex(0xffffff); // Snow
            }
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const terrainMaterial = new THREE.MeshStandardMaterial({ 
            vertexColors: true, 
            flatShading: true,
            roughness: 0.8,
            metalness: 0.1
        });
        this.terrain = new THREE.Mesh(geometry, terrainMaterial);
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);

        // --- WATER ---
        const waterGeo = new THREE.PlaneGeometry(config.worldSize, config.worldSize);
        waterGeo.rotateX(-Math.PI / 2);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1,
            metalness: 0.8
        });
        this.water = new THREE.Mesh(waterGeo, waterMat);
        this.water.position.y = config.waterLevel;
        this.scene.add(this.water);

        // --- TREES ---
        const treeGeo = new THREE.ConeGeometry(1.5, 6, 6);
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, flatShading: true });
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });

        this.instancedTrees = new THREE.Group();
        this.scene.add(this.instancedTrees);

        for(let i=0; i<300; i++) {
            const x = (Math.random() - 0.5) * config.worldSize * 0.8;
            const z = (Math.random() - 0.5) * config.worldSize * 0.8;
            const y = this.getHeight(x, z);

            if(y > config.waterLevel + 2 && y < 18) {
                const group = new THREE.Group();
                const tree = new THREE.Mesh(treeGeo, treeMat);
                const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                tree.position.y = 4;
                tree.castShadow = true;
                trunk.position.y = 1;
                trunk.castShadow = true;
                
                group.add(trunk);
                group.add(tree);
                group.position.set(x, y, z);
                
                // Random scale
                const s = 0.8 + Math.random() * 0.5;
                group.scale.set(s,s,s);
                this.instancedTrees.add(group);
            }
        }

        // --- PARTICLES ---
        const particleCount = 1000;
        const particlesGeo = new THREE.BufferGeometry();
        const pPos = [];
        for(let i=0; i<particleCount; i++) {
            pPos.push(
                (Math.random() - 0.5) * 200,
                Math.random() * 50,
                (Math.random() - 0.5) * 200
            );
        }
        particlesGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
        const particlesMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.8 });
        this.particles = new THREE.Points(particlesGeo, particlesMat);
        this.scene.add(this.particles);
    }

    update(time) {
        if (this.water) {
            this.water.material.opacity = 0.6 + Math.sin(time) * 0.1;
            this.water.position.y = config.waterLevel + Math.sin(time * 0.5) * 0.2;
        }

        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for(let i=1; i<positions.length; i+=3) {
                positions[i] += Math.sin(time + positions[i-1]) * 0.02;
                if(positions[i] > 40) positions[i] = 0;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }
}
