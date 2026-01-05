// All in Hole Game Module
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Game Configuration
 */
const CONFIG = {
    colors: {
        floor: 0xFFF8E7,
        floorShadow: 0xDDD0B0,
        bg: 0x87CEEB, // Sky Blue
        treats: [0xFF0055, 0x00AAFF, 0xFFAA00, 0x00CC44, 0x9D00FF]
    },
    hole: {
        startRadius: 1.5,
        maxRadius: 4.0,
        growthPerTreat: 0.2
    },
    world: {
        width: 30,
        height: 30
    }
};

export default class AllInHoleGame {
    constructor() {
        this.container = null;
        this.gameInstance = null;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';

        // Inject UI
        const uiLayer = document.createElement('div');
        uiLayer.id = 'aih-ui-layer';
        uiLayer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            z-index: 10;
        `;
        uiLayer.innerHTML = `
            <div id="aih-score-hud" style="padding: 20px; font-size: 24px; color: #333; font-weight: 800; text-shadow: 2px 2px 0px #fff;">Treats: 0 / 5</div>
            <button id="aih-back-btn" class="absolute top-5 right-5 pointer-events-auto bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-500">BACK</button>
        `;
        this.container.appendChild(uiLayer);

        document.getElementById('aih-back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        // Inject Overlay
        const overlay = document.createElement('div');
        overlay.id = 'aih-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85);
            display: none;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            pointer-events: auto;
            color: white;
            z-index: 20;
        `;
        overlay.innerHTML = `
            <h1 style="margin: 0 0 20px 0; font-size: 48px; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 20px rgba(255,255,255,0.5);">Delicious!</h1>
            <div id="aih-cake-container" style="width: 100%; height: 60%; position: relative;"></div>
            <button id="aih-restart-btn" style="
                background: linear-gradient(135deg, #00C853, #64DD17);
                border: none;
                padding: 15px 40px;
                font-size: 24px;
                color: white;
                border-radius: 50px;
                cursor: pointer;
                font-weight: bold;
                box-shadow: 0 10px 20px rgba(0,0,0,0.3);
                transition: transform 0.1s;
                pointer-events: auto;
                margin-top: 20px;
            ">Unlock Recipe & Replay</button>
        `;
        this.container.appendChild(overlay);

        this.gameInstance = new Game(this.container);
    }

    update(dt) {
        if (this.gameInstance) this.gameInstance.update(dt);
    }

    draw() {}

    shutdown() {
        if (this.gameInstance) {
            this.gameInstance.dispose();
            this.gameInstance = null;
        }
    }
}

class Game {
    constructor(container) {
        this.container = container;
        this.initThree();
        this.initPhysics();
        this.initLevel();
        this.initInputs();

        this.score = 0;
        this.targetTotal = 5;
        this.collectedCount = 0;
        this.holeRadius = CONFIG.hole.startRadius;
        this.holePos = new THREE.Vector2(0, 0);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.isActive = true;
        this.clock = new THREE.Clock();
        this.cakeRenderer = null;
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.colors.bg);
        this.scene.fog = new THREE.Fog(CONFIG.colors.bg, 40, 80);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 35, 15);
        this.camera.lookAt(0, 0, 2);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.2);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(15, 30, 15);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Floor with Hole Shader
        this.createFloor();

        // Hole Visuals (Interior)
        const holeGeo = new THREE.CylinderGeometry(1, 1, 5, 32, 1, true);
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
        this.holeMesh = new THREE.Mesh(holeGeo, holeMat);
        this.holeMesh.position.y = -2.5;
        this.scene.add(this.holeMesh);

        // Hole Void (Bottom)
        const voidGeo = new THREE.CircleGeometry(1, 32);
        voidGeo.rotateX(-Math.PI / 2);
        const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.voidMesh = new THREE.Mesh(voidGeo, voidMat);
        this.voidMesh.position.y = -5;
        this.scene.add(this.voidMesh);

        this.onResize = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', this.onResize);
    }

    createFloor() {
        const floorGeo = new THREE.PlaneGeometry(100, 100, 100, 100);
        floorGeo.rotateX(-Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.floor,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.FrontSide
        });

        material.onBeforeCompile = (shader) => {
            shader.uniforms.holePos = { value: new THREE.Vector2(0, 0) };
            shader.uniforms.holeRadius = { value: CONFIG.hole.startRadius };
            material.userData.shader = shader;

            shader.vertexShader = `
                varying vec3 vWorldPosition;
                ${shader.vertexShader}
            `;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <worldpos_vertex>',
                `#include <worldpos_vertex>
                 vWorldPosition = (modelMatrix * vec4( transformed, 1.0 )).xyz;`
            );

            shader.fragmentShader = `
                uniform vec2 holePos;
                uniform float holeRadius;
                varying vec3 vWorldPosition;
                ${shader.fragmentShader}
            `;

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
                #include <dithering_fragment>
                float dist = distance(vWorldPosition.xz, holePos);
                if (dist < holeRadius) discard;
                `
            );
        };

        this.floorMesh = new THREE.Mesh(floorGeo, material);
        this.floorMesh.receiveShadow = true;
        this.scene.add(this.floorMesh);
    }

    initPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);

        this.groundMat = new CANNON.Material();
        this.objectMat = new CANNON.Material();

        const matContact = new CANNON.ContactMaterial(this.groundMat, this.objectMat, { friction: 0.1, restitution: 0.3 });
        this.world.addContactMaterial(matContact);

        const groundShape = new CANNON.Plane();
        this.groundBody = new CANNON.Body({ mass: 0, material: this.groundMat });
        this.groundBody.addShape(groundShape);
        this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.groundBody.collisionFilterGroup = 1;
        this.groundBody.collisionFilterMask = 2;
        this.world.addBody(this.groundBody);

        this.physicsObjects = [];
    }

    initLevel() {
        if (this.physicsObjects) {
            this.physicsObjects.forEach(o => {
                this.world.removeBody(o.body);
                this.scene.remove(o.mesh);
            });
        }
        this.physicsObjects = [];
        this.collectedCount = 0;
        this.targetTotal = 5;
        this.holeRadius = CONFIG.hole.startRadius;
        this.updateHoleVisuals();

        const geometries = [
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.SphereGeometry(0.6, 16, 16),
            new THREE.ConeGeometry(0.6, 1, 16)
        ];

        for (let i = 0; i < 50; i++) {
            const geo = geometries[Math.floor(Math.random() * geometries.length)];
            const color = CONFIG.colors.treats[Math.floor(Math.random() * CONFIG.colors.treats.length)];
            this.spawnObject(geo, color, false);
        }

        const targetGeo = new THREE.TorusKnotGeometry(0.4, 0.15, 64, 8);
        for (let i = 0; i < 5; i++) {
            this.spawnObject(targetGeo, 0xFFD700, true);
        }

        this.updateHUD();
    }

    spawnObject(geometry, color, isTarget) {
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const x = (Math.random() - 0.5) * CONFIG.world.width;
        const z = (Math.random() - 0.5) * CONFIG.world.height;
        mesh.position.set(x, 5 + Math.random() * 5, z);
        mesh.rotation.set(Math.random(), Math.random(), Math.random());

        this.scene.add(mesh);

        let shape;
        if (geometry.type === 'SphereGeometry') shape = new CANNON.Sphere(0.6);
        else shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));

        const body = new CANNON.Body({
            mass: 1,
            material: this.objectMat,
            shape: shape
        });
        body.position.set(x, mesh.position.y, z);
        body.quaternion.copy(mesh.quaternion);

        body.collisionFilterGroup = 2;
        body.collisionFilterMask = 1 | 2;

        body.angularDamping = 0.5;
        body.linearDamping = 0.1;

        this.world.addBody(body);

        this.physicsObjects.push({ mesh, body, isTarget, active: true });
    }

    initInputs() {
        this.onPointerMove = (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        document.addEventListener('pointermove', this.onPointerMove);

        document.getElementById('aih-restart-btn').addEventListener('click', () => {
            document.getElementById('aih-overlay').style.display = 'none';
            const container = document.getElementById('aih-cake-container');
            while (container.firstChild) container.removeChild(container.firstChild);
            if(this.cakeRenderer) {
                this.cakeRenderer.dispose();
                this.cakeRenderer = null;
            }

            this.isActive = true;
            this.initLevel();
        });
    }

    update(dt) {
        if (!this.isActive) return;

        // Note: dt passed from main loop is in seconds
        // Cannon fixed step is usually 1/60

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.floorMesh);
        if (intersects.length > 0) {
            const targetPos = intersects[0].point;
            this.holePos.lerp(new THREE.Vector2(targetPos.x, targetPos.z), 5 * dt);
        }

        if (this.floorMesh.material.userData.shader) {
            this.floorMesh.material.userData.shader.uniforms.holePos.value.copy(this.holePos);
            this.floorMesh.material.userData.shader.uniforms.holeRadius.value = this.holeRadius;
        }

        this.holeMesh.position.set(this.holePos.x, -2.5, this.holePos.y);
        this.holeMesh.scale.set(this.holeRadius, 1, this.holeRadius);

        this.voidMesh.position.set(this.holePos.x, -5, this.holePos.y);
        this.voidMesh.scale.set(this.holeRadius, this.holeRadius, 1);

        this.world.step(1/60, dt, 3);

        for (let i = this.physicsObjects.length - 1; i >= 0; i--) {
            const obj = this.physicsObjects[i];
            if (!obj.active) continue;

            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);

            const dx = obj.body.position.x - this.holePos.x;
            const dz = obj.body.position.z - this.holePos.y;
            const dist = Math.sqrt(dx*dx + dz*dz);

            if (dist < this.holeRadius * 0.9) {
                obj.body.collisionFilterMask = 2;
                const force = new CANNON.Vec3(-dx, 0, -dz).scale(2);
                obj.body.applyForce(force, obj.body.position);
            } else {
                obj.body.collisionFilterMask = 1 | 2;
            }

            if (obj.body.position.y < -3) {
                this.collectObject(obj);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateHoleVisuals() {}

    collectObject(obj) {
        obj.active = false;
        this.world.removeBody(obj.body);
        this.scene.remove(obj.mesh);

        this.holeRadius = Math.min(CONFIG.hole.maxRadius, this.holeRadius + CONFIG.hole.growthPerTreat);

        if (obj.isTarget) {
            this.collectedCount++;
            this.updateHUD();
            if (this.collectedCount >= this.targetTotal) {
                this.winLevel();
            }
        }
    }

    updateHUD() {
        const hud = document.getElementById('aih-score-hud');
        if(hud) hud.innerText = `Treats: ${this.collectedCount} / ${this.targetTotal}`;
    }

    winLevel() {
        this.isActive = false;
        document.getElementById('aih-overlay').style.display = 'flex';
        this.generateCake();

        // Notify Hub
        if(window.miniGameHub) {
            window.miniGameHub.saveSystem.addCurrency(50);
            window.miniGameHub.showToast("All Targets Collected! +50 Coins");
        }
    }

    generateCake() {
        const container = document.getElementById('aih-cake-container');
        if(!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x222);
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 3, 5);
        camera.lookAt(0, 0, 0);

        this.cakeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.cakeRenderer.setSize(width, height);
        this.cakeRenderer.shadowMap.enabled = true;
        container.appendChild(this.cakeRenderer.domElement);

        const amb = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(amb);
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(2, 5, 2);
        dir.castShadow = true;
        scene.add(dir);

        const baseGeo = new THREE.CylinderGeometry(1.5, 1.5, 1, 32);
        const baseColor = Math.random() > 0.5 ? 0x8B4513 : 0xFFAABB;
        const baseMat = new THREE.MeshToonMaterial({ color: baseColor });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.castShadow = true;
        scene.add(base);

        const iceGeo = new THREE.CylinderGeometry(1.55, 1.55, 0.3, 32);
        const iceMat = new THREE.MeshToonMaterial({ color: 0xFFFFFF });
        const ice = new THREE.Mesh(iceGeo, iceMat);
        ice.position.y = 0.5;
        ice.castShadow = true;
        scene.add(ice);

        for(let i=0; i<8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const r = 1.2;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const cherryGeo = new THREE.SphereGeometry(0.15, 16, 16);
            const cherryMat = new THREE.MeshStandardMaterial({ color: 0xFF0000, roughness: 0.1 });
            const cherry = new THREE.Mesh(cherryGeo, cherryMat);
            cherry.position.set(x, 0.7, z);
            scene.add(cherry);
        }

        const animateCake = () => {
            if (!this.cakeRenderer) return;
            requestAnimationFrame(animateCake);
            scene.rotation.y += 0.01;
            this.cakeRenderer.render(scene, camera);
        };
        animateCake();
    }

    dispose() {
        this.isActive = false;
        window.removeEventListener('resize', this.onResize);
        document.removeEventListener('pointermove', this.onPointerMove);
        if(this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        if(this.cakeRenderer) {
            this.cakeRenderer.dispose();
        }
        // Physics cleanup
        // ...
    }
}
