import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';

export default class NeonGenesis {
    constructor() {
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();

        this.container = null;
        this.isActive = false;

        // Three.js Core
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Game State
        this.distance = 0;
        this.speed = 20;
        this.baseSpeed = 20;
        this.score = 0;
        this.energy = 100;
        this.isGameOver = false;

        // Entities
        this.player = null;
        this.terrain = null;
        this.obstacles = [];
        this.pickups = [];
        this.particles = [];

        // Procedural Generation
        this.simplex = new SimplexNoise();
        this.terrainWidth = 100;
        this.terrainDepth = 150;
        this.segmentsW = 50;
        this.segmentsD = 75;
        this.terrainOffset = 0;

        // References for cleanup
        this.boundAnimate = this.animate.bind(this);
        this.reqAnimFrameId = null;
    }

    async init(container) {
        this.container = container;
        this.isActive = true;

        this.initUI();
        this.initThree();
        this.createPlayer();
        this.createTerrain();
        this.createLighting();

        // Start Loop
        this.clock.start();
        this.animate();
        this.soundManager.playSound('click'); // Start sound
    }

    initUI() {
        this.container.innerHTML = `
            <div id="genesis-ui" class="absolute inset-0 pointer-events-none font-[Poppins] flex flex-col z-10 select-none">
                <div class="p-4 flex justify-between items-start">
                    <div class="glass-panel p-3 rounded-lg border border-cyan-500/30">
                        <div class="text-cyan-400 font-bold text-lg">DISTANCE</div>
                        <div class="text-3xl font-black text-white font-mono" id="genesis-distance">0m</div>
                    </div>
                    <div class="glass-panel p-3 rounded-lg border border-fuchsia-500/30 text-right">
                        <div class="text-fuchsia-400 font-bold text-lg">ENERGY</div>
                        <div class="w-48 h-4 bg-gray-800 rounded-full mt-1 overflow-hidden border border-gray-600">
                            <div id="genesis-energy-bar" class="h-full bg-gradient-to-r from-fuchsia-600 to-purple-400 w-full transition-all duration-200"></div>
                        </div>
                    </div>
                </div>

                <div id="genesis-game-over" class="hidden absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-sm">
                    <h2 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-4 animate-pulse">SYSTEM FAILURE</h2>
                    <p class="text-xl text-gray-300 mb-8 font-mono">Distance Traveled: <span id="genesis-final-distance" class="text-cyan-400 font-bold"></span></p>
                    <div class="flex gap-4">
                        <button id="genesis-retry-btn" class="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(8,145,178,0.5)] transition-all transform hover:scale-105">REBOOT</button>
                        <button id="genesis-quit-btn" class="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all">EXIT</button>
                    </div>
                </div>

                <!-- Controls Hint -->
                 <div class="absolute bottom-8 w-full text-center text-gray-400/50 text-sm font-mono tracking-widest pointer-events-none">
                    USE ARROW KEYS OR WASD TO NAVIGATE
                </div>
            </div>
        `;

        document.getElementById('genesis-retry-btn').onclick = () => this.resetGame();
        document.getElementById('genesis-quit-btn').onclick = () => window.miniGameHub.goBack();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, -20);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Optimize rendering
        this.renderer.sortObjects = false;

        const canvas = this.renderer.domElement;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '0';
        this.container.appendChild(canvas);

        this.boundOnResize = this.onResize.bind(this);
        window.addEventListener('resize', this.boundOnResize);
    }

    createLighting() {
        const ambientLight = new THREE.AmbientLight(0x222233, 1.5);
        this.scene.add(ambientLight);

        // Player Headlight
        this.headLight = new THREE.PointLight(0x00ffff, 2, 50);
        this.headLight.position.set(0, 2, 0);
        this.scene.add(this.headLight);

        // Horizon Glow
        const horizonLight = new THREE.DirectionalLight(0xff00ff, 1);
        horizonLight.position.set(0, 10, -100);
        this.scene.add(horizonLight);
    }

    createPlayer() {
        this.playerGroup = new THREE.Group();
        this.scene.add(this.playerGroup);
        this.playerGroup.position.set(0, 1, 0);

        // Vehicle Chassis
        const chassisGeo = new THREE.BoxGeometry(2, 0.5, 4);
        const chassisMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x002222
        });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        this.playerGroup.add(chassis);

        // Cockpit Glow
        const cockpitGeo = new THREE.BoxGeometry(1, 0.4, 2);
        const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 0.4, -0.5);
        this.playerGroup.add(cockpit);

        // Thruster Glows
        const thrusterGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.5, 8);
        thrusterGeo.rotateX(Math.PI / 2);
        const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });

        this.thrusterL = new THREE.Mesh(thrusterGeo, thrusterMat);
        this.thrusterL.position.set(-0.8, 0, 2);
        this.playerGroup.add(this.thrusterL);

        this.thrusterR = new THREE.Mesh(thrusterGeo, thrusterMat);
        this.thrusterR.position.set(0.8, 0, 2);
        this.playerGroup.add(this.thrusterR);

        // Collision radius
        this.playerRadius = 1.5;

        // Player physics state
        this.playerVelX = 0;
        this.playerTilt = 0;
    }

    createTerrain() {
        // Custom Shader Material for glowing wireframe look
        const vertexShader = `
            varying vec2 vUv;
            varying float vElevation;
            void main() {
                vUv = uv;
                vElevation = position.y;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            varying vec2 vUv;
            varying float vElevation;
            uniform float time;

            void main() {
                // Grid pattern
                vec2 grid = fract(vUv * vec2(20.0, 30.0));
                float line = step(0.95, grid.x) + step(0.95, grid.y);

                // Base colors based on height
                vec3 lowColor = vec3(0.0, 0.1, 0.3); // Deep blue
                vec3 highColor = vec3(0.8, 0.0, 0.8); // Magenta peaks

                // Mix based on elevation
                float mixVal = clamp((vElevation + 5.0) / 10.0, 0.0, 1.0);
                vec3 color = mix(lowColor, highColor, mixVal);

                // Add grid lines (Cyan)
                vec3 gridColor = vec3(0.0, 1.0, 1.0) * line * clamp(vElevation, 0.1, 1.0);

                // Pulse effect on grid
                float pulse = (sin(time * 2.0 - vElevation * 0.5) + 1.0) * 0.5;
                gridColor *= (0.5 + pulse * 0.5);

                gl_FragColor = vec4(color + gridColor, 1.0);
            }
        `;

        this.terrainUniforms = {
            time: { value: 0 }
        };

        const terrainMat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: this.terrainUniforms,
            wireframe: false,
            side: THREE.DoubleSide
        });

        // We use a plane and modify its vertices every frame to simulate infinite movement
        this.terrainGeo = new THREE.PlaneGeometry(this.terrainWidth, this.terrainDepth, this.segmentsW, this.segmentsD);
        this.terrainGeo.rotateX(-Math.PI / 2);

        this.terrain = new THREE.Mesh(this.terrainGeo, terrainMat);
        // Position terrain so it extends forward from player
        this.terrain.position.z = -(this.terrainDepth / 2) + 20;
        this.scene.add(this.terrain);

        this.updateTerrainVertices();
    }

    updateTerrainVertices() {
        const positions = this.terrainGeo.attributes.position.array;

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];

            // Map local Z to world Z considering movement offset
            const worldZ = z - this.terrainOffset;

            // Noise function
            // Create a valley in the center (x near 0)
            const valleyFactor = Math.abs(x) / (this.terrainWidth / 2); // 0 at center, 1 at edges
            const valleyShape = Math.pow(valleyFactor, 2) * 15; // Smooth curve up

            // Add noise on top of valley
            const noise = this.simplex.noise2D(x * 0.05, worldZ * 0.05) * 3;
            const detailNoise = this.simplex.noise2D(x * 0.2, worldZ * 0.2) * 0.5;

            // Calculate final height
            let height = valleyShape + noise + detailNoise - 5;

            // Flatten the very center path
            if (Math.abs(x) < 8) {
                height = Math.min(height, 0); // Keep path relatively flat
            }

            positions[i + 1] = height;
        }

        this.terrainGeo.attributes.position.needsUpdate = true;
        this.terrainGeo.computeVertexNormals();
    }

    spawnObstacle() {
        // Spawn far ahead
        const zPos = -120;

        // Random X position within path bounds
        const xPos = (Math.random() - 0.5) * 30;

        const isWall = Math.random() > 0.7;

        let mesh;
        let radius = 1;

        if (isWall) {
            // Wall Obstacle
            const geo = new THREE.BoxGeometry(8, 3, 1);
            const mat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x880000, roughness: 0.1 });
            mesh = new THREE.Mesh(geo, mat);
            radius = 4; // Wider collision box roughly
        } else {
            // Crystal Obstacle
            const geo = new THREE.ConeGeometry(1.5, 4, 4);
            const mat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0x440022, flatShading: true });
            mesh = new THREE.Mesh(geo, mat);
            radius = 1.5;
        }

        // Add wireframe highlight
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
        mesh.add(line);

        // Determine height from terrain
        const worldZ = zPos - this.terrainOffset;
        const noise = this.simplex.noise2D(xPos * 0.05, worldZ * 0.05) * 3;
        const yPos = noise + 1; // Approximate height

        mesh.position.set(xPos, yPos, zPos);
        this.scene.add(mesh);
        this.obstacles.push({ mesh, radius, active: true });
    }

    spawnPickup() {
        const zPos = -120;
        const xPos = (Math.random() - 0.5) * 20;

        const geo = new THREE.OctahedronGeometry(1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, wireframe: true });
        const mesh = new THREE.Mesh(geo, mat);

        // Inner core
        const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        mesh.add(inner);

        mesh.position.set(xPos, 2, zPos);
        this.scene.add(mesh);

        const light = new THREE.PointLight(0x00ff00, 1, 10);
        mesh.add(light);

        this.pickups.push({ mesh, radius: 1.5, active: true });
    }

    createExplosion(position) {
        const count = 30;
        for (let i = 0; i < count; i++) {
            const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const mat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff00ff : 0x00ffff });
            const mesh = new THREE.Mesh(geo, mat);

            mesh.position.copy(position);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                Math.random() * 20,
                (Math.random() - 0.5) * 20
            );

            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 1.0 });
        }
    }

    updateParticles(dt) {
        // Reverse loop for safe removal
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt * 1.5;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }

            // Gravity
            p.velocity.y -= 30 * dt;

            // Move
            p.mesh.position.addScaledVector(p.velocity, dt);

            // Spin
            p.mesh.rotation.x += dt * 5;
            p.mesh.rotation.y += dt * 5;

            // Shrink
            p.mesh.scale.setScalar(p.life);
        }
    }

    update(dt) {
        if (this.isGameOver) {
            this.updateParticles(dt);
            return; // Stop main update
        }

        // --- Inputs ---
        const moveSpeed = 40;
        let inputX = 0;

        if (this.inputManager.isKeyDown('ArrowLeft') || this.inputManager.isKeyDown('KeyA')) {
            inputX = -1;
        } else if (this.inputManager.isKeyDown('ArrowRight') || this.inputManager.isKeyDown('KeyD')) {
            inputX = 1;
        }

        // --- Physics & Movement ---
        // Smooth velocity
        this.playerVelX += (inputX * moveSpeed - this.playerVelX) * dt * 5;
        this.playerGroup.position.x += this.playerVelX * dt;

        // Clamp to path
        const maxLimit = (this.terrainWidth / 2) - 5;
        if (this.playerGroup.position.x > maxLimit) {
            this.playerGroup.position.x = maxLimit;
            this.playerVelX = 0;
        } else if (this.playerGroup.position.x < -maxLimit) {
            this.playerGroup.position.x = -maxLimit;
            this.playerVelX = 0;
        }

        // Tilt based on velocity
        this.playerTilt = THREE.MathUtils.lerp(this.playerTilt, -this.playerVelX * 0.02, dt * 10);
        this.playerGroup.rotation.z = this.playerTilt;

        // --- Forward Progress ---
        // Increase speed over time slightly
        this.speed = this.baseSpeed + (this.distance * 0.01);
        const moveDist = this.speed * dt;

        this.terrainOffset += moveDist;
        this.distance += moveDist;

        // Update Shader Time
        this.terrainUniforms.time.value += dt;

        // We don't actually move the camera or player forward.
        // We move the terrain vertices backwards, and move obstacles towards camera.

        // Update terrain noise every frame to simulate moving forward
        this.updateTerrainVertices();

        // Adjust player height slightly based on noise at origin
        const px = this.playerGroup.position.x;
        const pNoise = this.simplex.noise2D(px * 0.05, -this.terrainOffset * 0.05) * 3;
        const targetY = Math.max(1, pNoise + 1.5);
        this.playerGroup.position.y = THREE.MathUtils.lerp(this.playerGroup.position.y, targetY, dt * 10);

        this.headLight.position.copy(this.playerGroup.position);
        this.headLight.position.y += 1;

        // --- Obstacles & Pickups ---

        // Spawning logic
        if (Math.random() < dt * 2.0 * (1 + this.distance/2000)) this.spawnObstacle();
        if (Math.random() < dt * 0.5) this.spawnPickup();

        const pPos = this.playerGroup.position;

        // Update Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            // Move towards player
            obs.mesh.position.z += moveDist;

            // Collision
            if (obs.active) {
                // Quick AABB/Sphere approx check
                const dx = pPos.x - obs.mesh.position.x;
                const dz = pPos.z - obs.mesh.position.z;
                // Since player is at z=0, we just check if obs is near z=0
                if (Math.abs(dz) < 2) {
                    const distSq = dx*dx + dz*dz;
                    const radii = this.playerRadius + obs.radius;
                    if (distSq < radii * radii) {
                        this.handleCrash();
                        return; // Break out
                    }
                }
            }

            // Remove if past camera
            if (obs.mesh.position.z > 20) {
                this.scene.remove(obs.mesh);
                obs.mesh.geometry.dispose();
                obs.mesh.material.dispose();
                this.obstacles.splice(i, 1);
            }
        }

        // Update Pickups
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            p.mesh.position.z += moveDist;
            p.mesh.rotation.y += dt * 2;
            p.mesh.rotation.x += dt;
            p.mesh.position.y = 2 + Math.sin(this.clock.getElapsedTime() * 5 + p.mesh.position.x) * 0.5;

            // Collision
            if (p.active) {
                const dx = pPos.x - p.mesh.position.x;
                const dz = pPos.z - p.mesh.position.z;
                if (Math.abs(dz) < 2) {
                    const distSq = dx*dx + dz*dz;
                    const radii = this.playerRadius + p.radius;
                    if (distSq < radii * radii) {
                        this.collectEnergy();
                        p.active = false;
                        this.scene.remove(p.mesh);
                        p.mesh.geometry.dispose();
                        p.mesh.material.dispose();
                        this.pickups.splice(i, 1);
                        continue;
                    }
                }
            }

            if (p.mesh.position.z > 20) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.pickups.splice(i, 1);
            }
        }

        // --- Energy Drain ---
        this.energy -= dt * 5; // Drain 5 per second
        if (this.energy <= 0) {
            this.handleCrash(); // Or out of energy state
            return;
        }

        this.updateUI();
        this.updateParticles(dt);

        // Thruster flicker
        const flicker = 0.5 + Math.random() * 0.5;
        this.thrusterL.scale.z = flicker;
        this.thrusterR.scale.z = flicker;
    }

    collectEnergy() {
        this.soundManager.playSound('coin'); // Reusing coin sound for pickup
        this.energy = Math.min(100, this.energy + 20);

        // Small visual feedback
        const flash = new THREE.PointLight(0x00ff00, 5, 20);
        flash.position.copy(this.playerGroup.position);
        this.scene.add(flash);
        setTimeout(() => this.scene.remove(flash), 100);
    }

    handleCrash() {
        this.isGameOver = true;
        this.soundManager.playSound('explosion');
        this.createExplosion(this.playerGroup.position);

        // Hide player
        this.playerGroup.visible = false;

        // Show Game Over Screen
        const goScreen = document.getElementById('genesis-game-over');
        document.getElementById('genesis-final-distance').textContent = Math.floor(this.distance) + 'm';
        goScreen.classList.remove('hidden');

        // Save Score
        const finalScore = Math.floor(this.distance);
        const currentHigh = this.saveSystem.getHighScore('neon-genesis') || 0;
        if (finalScore > currentHigh) {
            this.saveSystem.setHighScore('neon-genesis', finalScore);
        }

        // Add currency based on distance
        const coins = Math.floor(this.distance / 100);
        if (coins > 0) this.saveSystem.addCurrency(coins);
    }

    updateUI() {
        const distEl = document.getElementById('genesis-distance');
        if (distEl) distEl.textContent = Math.floor(this.distance) + 'm';

        const bar = document.getElementById('genesis-energy-bar');
        if (bar) {
            bar.style.width = Math.max(0, this.energy) + '%';
            if (this.energy < 20) bar.className = "h-full bg-red-600 w-full transition-all duration-200 animate-pulse";
            else bar.className = "h-full bg-gradient-to-r from-fuchsia-600 to-purple-400 w-full transition-all duration-200";
        }
    }

    resetGame() {
        // Clean up entities
        this.obstacles.forEach(o => { this.scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose(); });
        this.obstacles = [];

        this.pickups.forEach(p => { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        this.pickups = [];

        this.particles.forEach(p => { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        this.particles = [];

        // Reset state
        this.distance = 0;
        this.terrainOffset = 0;
        this.energy = 100;
        this.speed = this.baseSpeed;
        this.isGameOver = false;
        this.playerGroup.visible = true;
        this.playerGroup.position.set(0, 1, 0);
        this.playerVelX = 0;

        document.getElementById('genesis-game-over').classList.add('hidden');
        this.clock.start(); // reset clock delta
    }

    animate() {
        if (!this.isActive) return;
        this.reqAnimFrameId = requestAnimationFrame(this.boundAnimate);

        const dt = Math.min(this.clock.getDelta(), 0.1); // cap dt to prevent physics glitches on lag
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    shutdown() {
        this.isActive = false;
        if (this.reqAnimFrameId) cancelAnimationFrame(this.reqAnimFrameId);
        window.removeEventListener('resize', this.boundOnResize);

        // Thorough cleanup to prevent leaks
        if (this.renderer) {
            this.renderer.dispose();
            const canvas = this.renderer.domElement;
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        }

        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.isMesh) {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
                        else object.material.dispose();
                    }
                }
            });
        }

        if (this.container) this.container.innerHTML = '';
    }
}