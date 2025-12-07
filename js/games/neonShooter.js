import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';

export default class NeonShooter {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();

        this.isRunning = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.player = {
            position: { x: 0, y: 1.6, z: 0 },
            rotation: { x: 0, y: 0 }, // Pitch, Yaw
            velocity: { x: 0, y: 0, z: 0 },
            health: 100
        };

        this.bullets = [];
        this.enemies = [];
        this.score = 0;
        this.lastShot = 0;
    }

    async init(container) {
        this.container = container;

        if (typeof THREE === 'undefined') {
            this.container.innerHTML = '<div class="text-white text-center pt-20">Error: Three.js not loaded.</div>';
            return;
        }

        // Setup DOM
        this.gameContainer = document.createElement('div');
        this.gameContainer.className = 'w-full h-full relative overflow-hidden bg-black';
        this.container.appendChild(this.gameContainer);

        // UI
        this.uiLayer = document.createElement('div');
        this.uiLayer.className = 'absolute top-0 left-0 w-full h-full pointer-events-none p-4';
        this.uiLayer.innerHTML = `
            <div class="flex justify-between text-cyan-400 font-mono text-xl font-bold">
                <div>SCORE: <span id="fps-score">0</span></div>
                <div>HEALTH: <span id="fps-health">100</span>%</div>
            </div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-2xl">+</div>
            <div class="absolute bottom-4 left-4 text-xs text-slate-500">WASD to Move, Click to Shoot</div>
        `;
        this.gameContainer.appendChild(this.uiLayer);

        // Back Button (Needs pointer events)
        const backBtn = document.createElement('button');
        backBtn.className = 'absolute top-4 right-4 px-4 py-2 bg-slate-800/80 text-white rounded hover:bg-slate-700 pointer-events-auto z-50';
        backBtn.innerText = 'Exit';
        backBtn.onclick = () => window.miniGameHub.goBack();
        this.gameContainer.appendChild(backBtn);

        // Three.js Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.gameContainer.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x00ffff, 1, 100);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);

        // Floor
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = Math.PI / 2;
        this.scene.add(floor);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(100, 50, 0x00ffff, 0x112233);
        this.scene.add(gridHelper);

        this.player.position.y = 1.6;
        this.camera.position.set(0, 1.6, 5);

        this.isRunning = true;
        this.enemies = [];
        this.bullets = [];
        this.score = 0;
        this.player.health = 100;

        // Input Handling
        this.keys = {};
        this.handleKeyDown = (e) => this.keys[e.code] = true;
        this.handleKeyUp = (e) => this.keys[e.code] = false;

        // Mouse Look
        this.handleMouseMove = (e) => {
            if (document.pointerLockElement === this.renderer.domElement) {
                this.player.rotation.y -= e.movementX * 0.002;
                this.player.rotation.x -= e.movementY * 0.002;
                this.player.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.player.rotation.x));
            }
        };

        this.handleClick = () => {
            if (document.pointerLockElement !== this.renderer.domElement) {
                this.renderer.domElement.requestPointerLock();
            } else {
                this.shoot();
            }
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.addEventListener('click', this.handleClick);

        // Resize
        this.resizeObserver = new ResizeObserver(() => {
            if(this.container && this.camera && this.renderer) {
                this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            }
        });
        this.resizeObserver.observe(this.container);
    }

    shoot() {
        if (Date.now() - this.lastShot < 200) return; // Fire rate limit
        this.lastShot = Date.now();

        const bulletGeo = new THREE.SphereGeometry(0.1);
        const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeo, bulletMat);

        bullet.position.copy(this.camera.position);

        // Direction vector based on camera rotation
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(this.camera.rotation);

        this.bullets.push({
            mesh: bullet,
            velocity: direction.multiplyScalar(20), // Speed
            life: 2.0
        });

        this.scene.add(bullet);
        this.soundManager.playSound('click'); // Pew pew
    }

    spawnEnemy() {
        if (this.enemies.length >= 10) return;

        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshPhongMaterial({ color: 0xff0055, emissive: 0x330011 });
        const enemy = new THREE.Mesh(geo, mat);

        // Random pos around player
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 10;
        enemy.position.set(
            this.camera.position.x + Math.cos(angle) * dist,
            1, // Half height
            this.camera.position.z + Math.sin(angle) * dist
        );

        this.enemies.push({
            mesh: enemy,
            health: 3
        });
        this.scene.add(enemy);
    }

    update(dt) {
        if (!this.isRunning || !this.player) return;

        // Player Movement
        const speed = 5 * dt;
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0,1,0), this.player.rotation.y);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), this.player.rotation.y);

        if (this.keys['KeyW']) this.camera.position.add(forward.clone().multiplyScalar(speed));
        if (this.keys['KeyS']) this.camera.position.add(forward.clone().multiplyScalar(-speed));
        if (this.keys['KeyA']) this.camera.position.add(right.clone().multiplyScalar(-speed));
        if (this.keys['KeyD']) this.camera.position.add(right.clone().multiplyScalar(speed));

        this.camera.rotation.set(this.player.rotation.x, this.player.rotation.y, 0);

        // Spawn Enemies
        if (Math.random() < 0.02) this.spawnEnemy();

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];

            // Move towards player
            const dir = new THREE.Vector3().subVectors(this.camera.position, e.mesh.position).normalize();
            e.mesh.position.add(dir.multiplyScalar(2 * dt));
            e.mesh.lookAt(this.camera.position);

            // Player Collision (Damage)
            if (e.mesh.position.distanceTo(this.camera.position) < 1.5) {
                this.player.health -= 10 * dt;
                document.getElementById('fps-health').textContent = Math.floor(this.player.health);
                if (this.player.health <= 0) {
                     this.gameOver();
                }
            }
        }

        // Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.life -= dt;
            b.mesh.position.add(b.velocity.clone().multiplyScalar(dt));

            if (b.life <= 0) {
                this.scene.remove(b.mesh);
                this.bullets.splice(i, 1);
                continue;
            }

            // Bullet Collision
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                let e = this.enemies[j];
                if (b.mesh.position.distanceTo(e.mesh.position) < 1.0) {
                    // Hit
                    e.health--;
                    this.scene.remove(b.mesh);
                    this.bullets.splice(i, 1);

                    if (e.health <= 0) {
                        this.scene.remove(e.mesh);
                        this.enemies.splice(j, 1);
                        this.score += 100;
                        document.getElementById('fps-score').textContent = this.score;
                        this.soundManager.playSound('score');
                    } else {
                        // Flash red
                        e.mesh.material.emissive.setHex(0xffffff);
                        setTimeout(() => e.mesh && e.mesh.material && e.mesh.material.emissive.setHex(0x330011), 100);
                    }
                    break;
                }
            }
        }
    }

    gameOver() {
        this.isRunning = false;
        document.exitPointerLock();
        window.miniGameHub.showGameOver(this.score, () => {
            // Reset
            this.camera.position.set(0, 1.6, 5);
            this.player.health = 100;
            this.score = 0;
            this.enemies.forEach(e => this.scene.remove(e.mesh));
            this.enemies = [];
            this.bullets.forEach(b => this.scene.remove(b.mesh));
            this.bullets = [];
            document.getElementById('fps-health').textContent = "100";
            document.getElementById('fps-score').textContent = "0";
            this.isRunning = true;
        });
    }

    draw() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    shutdown() {
        this.isRunning = false;
        if (document.pointerLockElement === this.renderer.domElement) {
            document.exitPointerLock();
        }

        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mousemove', this.handleMouseMove);

        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.gameContainer) this.gameContainer.remove();

        // Dispose Three.js
        if(this.renderer) this.renderer.dispose();
    }
}
