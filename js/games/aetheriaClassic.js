
// Classic Aetheria (Standalone HTML Port)
export default class AetheriaClassic {
    constructor() {
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.player = null;
        this.isPlaying = false;
        this.animationId = null;
        this.clock = new THREE.Clock();

        // Game State
        this.config = {
            worldSize: 400,
            chunkSize: 64,
            waterLevel: -5,
            mountainHeight: 35,
            gravity: 0.8,
            speed: 0.5,
            jumpForce: 1.2
        };

        this.state = {
            isPlaying: false,
            avatarType: 'construct',
            time: 0
        };

        this.keys = { w:false, a:false, s:false, d:false, space:false };
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.targetRotation = 0;

        // Mouse State
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
    }

    init(container) {
        if (typeof THREE === 'undefined') {
            container.innerHTML = `<div class="p-4 text-red-500">Error: Three.js is not loaded.</div>`;
            return;
        }

        // --- UI INJECTION ---
        container.innerHTML = `
            <div id="aetheria-classic-wrapper" style="position: relative; width: 100%; height: 100%; overflow: hidden; background-color: #000; font-family: 'Segoe UI', sans-serif;">
                <canvas id="ac-canvas" style="width: 100%; height: 100%; display: block;"></canvas>

                <div id="ac-ui-layer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div id="ac-selection-screen" style="background: rgba(10, 10, 20, 0.85); backdrop-filter: blur(10px); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); text-align: center; pointer-events: auto; box-shadow: 0 0 50px rgba(0,0,0,0.5);">
                        <h1 style="color: white; font-size: 3rem; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 4px; background: linear-gradient(45deg, #00f260, #0575e6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Aetheria</h1>
                        <p style="color: #aaa; margin-bottom: 30px; font-size: 1.1rem;">Choose your vessel to explore the infinite floating isles.</p>

                        <div style="display: flex; gap: 20px; justify-content: center;">
                            <div class="ac-avatar-card" data-type="construct" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; cursor: pointer; width: 150px; transition: all 0.3s ease;">
                                <div style="background: #e74c3c; width: 80px; height: 80px; margin: 0 auto 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🤖</div>
                                <div style="color: white; font-weight: bold; margin-bottom: 5px;">The Construct</div>
                                <div style="color: #888; font-size: 0.8rem;">Heavy, stable, industrial.</div>
                            </div>
                            <div class="ac-avatar-card" data-type="spirit" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; cursor: pointer; width: 150px; transition: all 0.3s ease;">
                                <div style="background: #2ecc71; width: 80px; height: 80px; margin: 0 auto 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🌿</div>
                                <div style="color: white; font-weight: bold; margin-bottom: 5px;">The Spirit</div>
                                <div style="color: #888; font-size: 0.8rem;">Light, floating, nature.</div>
                            </div>
                            <div class="ac-avatar-card" data-type="voyager" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; cursor: pointer; width: 150px; transition: all 0.3s ease;">
                                <div style="background: #9b59b6; width: 80px; height: 80px; margin: 0 auto 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🔮</div>
                                <div style="color: white; font-weight: bold; margin-bottom: 5px;">The Voyager</div>
                                <div style="color: #888; font-size: 0.8rem;">Mysterious, glowing.</div>
                            </div>
                        </div>
                        <button class="back-btn" style="margin-top: 20px; padding: 10px 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 5px; cursor: pointer;">Back to Hub</button>
                    </div>

                    <div id="ac-hud" style="position: absolute; bottom: 20px; left: 20px; color: white; font-family: monospace; display: none;">
                        COORD: <span id="ac-coord-display">0, 0</span><br>
                        ALT: <span id="ac-alt-display">0</span>
                    </div>

                    <div id="ac-controls-hint" style="position: absolute; bottom: 20px; right: 20px; color: rgba(255,255,255,0.5); font-size: 0.9rem; text-align: right; display: none;">
                        WASD to Move | SPACE to Jump<br>
                        Mouse Drag to Rotate Camera
                    </div>
                </div>
            </div>
        `;

        // Bind Events
        container.querySelectorAll('.ac-avatar-card').forEach(el => {
            el.onclick = () => this.startGame(el.dataset.type);
            el.onmouseenter = () => el.style.transform = "translateY(-10px)";
            el.onmouseleave = () => el.style.transform = "translateY(0)";
        });

        container.querySelector('.back-btn').onclick = () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        };

        // --- THREE.JS SETUP ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);

        const canvas = container.querySelector('#ac-canvas');
        const rect = container.getBoundingClientRect();
        this.camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(rect.width, rect.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xffdfba, 1.2);
        this.dirLight.position.set(100, 100, 50);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 500;
        this.dirLight.shadow.camera.left = -100;
        this.dirLight.shadow.camera.right = 100;
        this.dirLight.shadow.camera.top = 100;
        this.dirLight.shadow.camera.bottom = -100;
        this.scene.add(this.dirLight);

        // --- WORLD GEN (NOISE) ---
        this.initNoise();
        this.generateWorld();

        // --- INPUT LISTENERS ---
        this._keydown = (e) => {
            switch(e.key.toLowerCase()) {
                case 'w': this.keys.w = true; break;
                case 'a': this.keys.a = true; break;
                case 's': this.keys.s = true; break;
                case 'd': this.keys.d = true; break;
                case ' ': this.keys.space = true; break;
            }
        };
        this._keyup = (e) => {
            switch(e.key.toLowerCase()) {
                case 'w': this.keys.w = false; break;
                case 'a': this.keys.a = false; break;
                case 's': this.keys.s = false; break;
                case 'd': this.keys.d = false; break;
                case ' ': this.keys.space = false; break;
            }
        };
        window.addEventListener('keydown', this._keydown);
        window.addEventListener('keyup', this._keyup);

        // Mouse Drag
        canvas.addEventListener('mousedown', (e) => {
             this.isDragging = true;
             this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mouseup', () => this.isDragging = false);
        window.addEventListener('mousemove', (e) => {
            if(this.isDragging && this.state.isPlaying) {
                const deltaMove = { x: e.clientX - this.previousMousePosition.x };
                this.targetRotation -= deltaMove.x * 0.005;
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });

        // Resize
        this._resize = () => {
             const r = container.getBoundingClientRect();
             this.camera.aspect = r.width / r.height;
             this.camera.updateProjectionMatrix();
             this.renderer.setSize(r.width, r.height);
        };
        window.addEventListener('resize', this._resize);
    }

    startGame(type) {
        document.getElementById('ac-selection-screen').style.display = 'none';
        document.getElementById('ac-hud').style.display = 'block';
        document.getElementById('ac-controls-hint').style.display = 'block';

        this.state.avatarType = type;
        this.createPlayer(type);
        this.state.isPlaying = true;
    }

    createPlayer(type) {
        const group = new THREE.Group();

        if (type === 'construct') {
            const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x7f8c8d }));
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x95a5a6 }));
            head.position.y = 1.1;
            const eye = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xe74c3c, emissive: 0xe74c3c }));
            eye.position.set(0, 1.1, 0.3);
            group.add(body, head, eye);
        } else if (type === 'spirit') {
            const body = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2, 8), new THREE.MeshStandardMaterial({ color: 0x2ecc71 }));
            body.position.y = 0.5;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
            head.position.y = 1.6;
            group.add(body, head);
            // Leaves
             for(let i=0; i<3; i++) {
                const leaf = new THREE.Mesh(new THREE.TetrahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
                leaf.userData = { offset: i * 2 };
                leaf.update = (t) => {
                    leaf.position.x = Math.sin(t * 2 + i*2) * 1;
                    leaf.position.z = Math.cos(t * 2 + i*2) * 1;
                    leaf.position.y = 1 + Math.sin(t * 4) * 0.2;
                };
                group.add(leaf);
            }
        } else {
            const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshStandardMaterial({ color: 0x8e44ad, wireframe: true }));
            body.position.y = 1;
            const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0x9b59b6, emissive: 0x8e44ad }));
            core.position.y = 1;
            group.add(body, core);
        }

        group.traverse(c => { if(c.isMesh) c.castShadow = true; });

        this.playerMesh = group;
        this.player = new THREE.Group();
        this.player.add(this.playerMesh);
        this.player.position.set(0, 30, 0);
        this.scene.add(this.player);
    }

    // --- NOISE ---
    initNoise() {
        this.perm = [];
        this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
                     [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
                     [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];

        for(let i=0; i<256; i++) this.perm[i] = Math.floor(Math.random()*256);
        for(let i=0; i<256; i++) this.perm[i+256] = this.perm[i];
    }

    noise2D(x, y) {
        const dot = (g, x, y) => g[0]*x + g[1]*y;
        const mix = (a, b, t) => (1-t)*a + t*b;
        const fade = (t) => t*t*t*(t*(t*6-15)+10);

        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        let u = fade(x);
        let v = fade(y);
        let A = this.perm[X]+Y, AA = this.perm[A], AB = this.perm[A+1],
            B = this.perm[X+1]+Y, BA = this.perm[B], BB = this.perm[B+1];

        return mix(mix(dot(this.grad3[AA % 12], x, y), dot(this.grad3[BA % 12], x-1, y), u),
                   mix(dot(this.grad3[AB % 12], x, y-1), dot(this.grad3[BB % 12], x-1, y-1), u), v);
    }

    getHeight(x, z) {
        let y = 0;
        y += this.noise2D(x * 0.01, z * 0.01) * 20;
        y += this.noise2D(x * 0.04, z * 0.04) * 10;
        y += this.noise2D(x * 0.1, z * 0.1) * 2;

        const dist = Math.sqrt(x*x + z*z);
        if(dist > this.config.worldSize * 0.4) {
            y -= (dist - this.config.worldSize * 0.4) * 0.5;
        }
        return y;
    }

    generateWorld() {
        const geometry = new THREE.PlaneGeometry(this.config.worldSize, this.config.worldSize, 128, 128);
        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array;
        const colors = [];

        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            const y = this.getHeight(x, z);
            vertices[i + 1] = y;

            let color = new THREE.Color();
            if (y < this.config.waterLevel + 2) color.setHex(0xe0d6a6);
            else if (y < 10) color.setHex(0x599646);
            else if (y < 25) color.setHex(0x5e5e5e);
            else color.setHex(0xffffff);
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            vertexColors: true, flatShading: true, roughness: 0.8, metalness: 0.1
        }));
        terrain.receiveShadow = true;
        this.scene.add(terrain);

        // Water
        const water = new THREE.Mesh(
            new THREE.PlaneGeometry(this.config.worldSize, this.config.worldSize),
            new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.8 })
        );
        water.rotateX(-Math.PI / 2);
        water.position.y = this.config.waterLevel;
        this.water = water;
        this.scene.add(water);

        // Trees
        const treeGeo = new THREE.ConeGeometry(1.5, 6, 6);
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, flatShading: true });
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });

        for(let i=0; i<300; i++) {
            const x = (Math.random() - 0.5) * this.config.worldSize * 0.8;
            const z = (Math.random() - 0.5) * this.config.worldSize * 0.8;
            const y = this.getHeight(x, z);

            if(y > this.config.waterLevel + 2 && y < 18) {
                const group = new THREE.Group();
                const tree = new THREE.Mesh(treeGeo, treeMat);
                const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                tree.position.y = 4;
                tree.castShadow = true;
                trunk.position.y = 1;
                trunk.castShadow = true;
                group.add(trunk, tree);
                group.position.set(x, y, z);
                const s = 0.8 + Math.random() * 0.5;
                group.scale.set(s,s,s);
                this.scene.add(group);
            }
        }
    }

    update(dt) {
        if (!this.state.isPlaying || !this.player) return;

        const time = this.clock.getElapsedTime();

        // Water anim
        if(this.water) {
            this.water.material.opacity = 0.6 + Math.sin(time) * 0.1;
            this.water.position.y = this.config.waterLevel + Math.sin(time * 0.5) * 0.2;
        }

        // Sun
        const dayTime = time * 0.05;
        const sunX = Math.cos(dayTime) * 100;
        const sunY = Math.sin(dayTime) * 100;
        this.dirLight.position.set(sunX, sunY, 50);

        // Sky Color
        const dayColor = new THREE.Color(0x87CEEB);
        const duskColor = new THREE.Color(0xFF7F50);
        const nightColor = new THREE.Color(0x0a0a20);
        let skyColor;
        if (sunY > 20) skyColor = dayColor;
        else if (sunY > -20) skyColor = dayColor.lerp(duskColor, 1 - (sunY + 20)/40);
        else skyColor = nightColor;
        this.scene.background = skyColor;
        this.scene.fog.color = skyColor;

        // Player Physics
        if (this.keys.w) {
            this.velocity.z -= Math.cos(this.targetRotation) * this.config.speed * dt * 50;
            this.velocity.x -= Math.sin(this.targetRotation) * this.config.speed * dt * 50;
        }
        if (this.keys.s) {
            this.velocity.z += Math.cos(this.targetRotation) * this.config.speed * dt * 50;
            this.velocity.x += Math.sin(this.targetRotation) * this.config.speed * dt * 50;
        }

        this.velocity.x *= 0.9;
        this.velocity.z *= 0.9;
        this.velocity.y -= this.config.gravity * dt * 50;

        this.player.position.x += this.velocity.x * dt;
        this.player.position.z += this.velocity.z * dt;

        const terrainHeight = this.getHeight(this.player.position.x, this.player.position.z);
        if (this.player.position.y <= terrainHeight) {
            this.player.position.y = terrainHeight;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        if (!this.onGround) {
            this.player.position.y += this.velocity.y * dt;
        }

        if (this.keys.space && this.onGround) {
            this.velocity.y = 15;
            this.onGround = false;
        }

        // Rotate Mesh
        this.playerMesh.rotation.y = this.targetRotation + Math.PI;

        // Camera Follow
        const cameraOffset = new THREE.Vector3(0, 8, 15);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0,1,0), -this.targetRotation);
        const targetPos = this.player.position.clone().add(cameraOffset);
        this.camera.position.lerp(targetPos, 0.1);
        this.camera.lookAt(this.player.position.clone().add(new THREE.Vector3(0, 2, 0)));

        // HUD
        document.getElementById('ac-coord-display').innerText = `${this.player.position.x.toFixed(0)}, ${this.player.position.z.toFixed(0)}`;
        document.getElementById('ac-alt-display').innerText = this.player.position.y.toFixed(1);

        // Respawn
        if (this.player.position.y < this.config.waterLevel - 10) {
            this.player.position.set(0, 40, 0);
            this.velocity.set(0,0,0);
        }
    }

    draw() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    shutdown() {
        this.state.isPlaying = false;
        window.removeEventListener('keydown', this._keydown);
        window.removeEventListener('keyup', this._keyup);
        window.removeEventListener('resize', this._resize);
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}
