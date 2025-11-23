import Boat from "./Boat.js";
import WildlifeManager from "./WildlifeManager.js";

export default class World {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Check for SimplexNoise availability
        if (typeof SimplexNoise !== 'undefined') {
            this.simplex = new SimplexNoise();
        } else {
            // Fallback noise
            this.simplex = { noise2D: (x,y) => Math.sin(x)*Math.cos(y) };
        }

        this.terrain = null;
        this.boat = null;
        this.wildlifeManager = null;
        this.interactableMeshes = {}; // Store specific meshes to attach interactions later

        this.initTerrain();
        this.initLake();
        this.initVillage();
        this.initBoat();
        this.initWildlife();
    }

    // ------- TERRAIN FUNCTION -------
    heightFunc(x, z) {
        const base =
            this.simplex.noise2D(x * 0.002, z * 0.002) * 80 +
            this.simplex.noise2D(x * 0.005, z * 0.005) * 20;

        // Matterhorn peak
        const dist = Math.sqrt(x * x + z * z);
        const peak = Math.max(0, 900 - dist * 1.35);

        return base + peak;
    }

    initTerrain() {
        const size = 600;
        const segments = 150;
        const geo = new THREE.PlaneGeometry(size, size, segments, segments);

        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            pos.setY(i, this.heightFunc(x, z));
        }
        pos.needsUpdate = true;

        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            flatShading: false,
        });

        this.terrain = new THREE.Mesh(geo, mat);
        this.terrain.receiveShadow = true;

        this.scene.add(this.terrain);
    }

    initLake() {
        const geo = new THREE.CircleGeometry(90, 32);
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0x3db7ff,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1,
            metalness: 0.2
        });

        this.lake = new THREE.Mesh(geo, mat);
        this.lake.rotation.x = -Math.PI / 2;
        this.lake.position.set(30, this.heightFunc(30, 30) - 0.1, 30);

        this.scene.add(this.lake);
    }

    initVillage() {
        // Simple houses near lake
        const houseGeo = new THREE.BoxGeometry(6, 4, 6);
        const roofGeo = new THREE.ConeGeometry(4.5, 3, 4);

        const houseMat = new THREE.MeshStandardMaterial({ color: 0x7c5539 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b2f2f });

        // Store references for interaction binding
        this.interactableMeshes.shops = [];

        // Specific shops
        // Chocolate Shop
        const chocoPos = {x: 50, z: 20};
        const chocoY = this.heightFunc(chocoPos.x, chocoPos.z);
        const chocoHouse = new THREE.Mesh(houseGeo, new THREE.MeshStandardMaterial({ color: 0x8B4513 })); // Darker wood
        chocoHouse.position.set(chocoPos.x, chocoY + 2, chocoPos.z);
        const chocoRoof = new THREE.Mesh(roofGeo, roofMat);
        chocoRoof.position.set(chocoPos.x, chocoY + 5, chocoPos.z);
        this.scene.add(chocoHouse, chocoRoof);
        this.interactableMeshes.chocolateShop = chocoHouse;

        // Fondue Shop
        const fonduePos = {x: 65, z: 25};
        const fondueY = this.heightFunc(fonduePos.x, fonduePos.z);
        const fondueHouse = new THREE.Mesh(houseGeo, new THREE.MeshStandardMaterial({ color: 0xEECFA1 })); // Lighter wood
        fondueHouse.position.set(fonduePos.x, fondueY + 2, fonduePos.z);
        const fondueRoof = new THREE.Mesh(roofGeo, roofMat);
        fondueRoof.position.set(fonduePos.x, fondueY + 5, fonduePos.z);
        this.scene.add(fondueHouse, fondueRoof);
        this.interactableMeshes.fondueShop = fondueHouse;

        // Photo Spot
        const photoPos = {x: 10, z: 80};
        const photoY = this.heightFunc(photoPos.x, photoPos.z);
        const markerGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
        const markerMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const photoMarker = new THREE.Mesh(markerGeo, markerMat);
        photoMarker.position.set(photoPos.x, photoY + 1, photoPos.z);
        this.scene.add(photoMarker);
        this.interactableMeshes.photoSpot = photoMarker;
    }

    initBoat() {
        this.boat = new Boat(this.scene);
    }

    initWildlife() {
        this.wildlifeManager = new WildlifeManager(this.scene, this.player, this.heightFunc.bind(this));
    }

    getHeightAt(x, z) {
        return this.heightFunc(x, z);
    }

    update(dt) {
        if (this.boat) this.boat.update(dt);
        if (this.wildlifeManager) this.wildlifeManager.update(dt);
    }
}
