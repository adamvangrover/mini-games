import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class SpaceShooterGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.score = 0;
        this.isActive = false;
        this.enemySpawnTimer = 0;

        // Game constants
        this.PLAYER_SPEED = 30;
        this.BULLET_SPEED = 60;
        this.ENEMY_SPEED = 20;
        this.FIELD_WIDTH = 30;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    async init(container) {
        this.isActive = true;
        this.score = 0;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.enemySpawnTimer = 0;

        // Ensure canvas exists
        let canvas = container.querySelector('#spaceCanvas');
        if (!canvas) {
            container.innerHTML = `
                <h2>🚀 Space Shooter</h2>
                <div class="relative">
                    <canvas id="spaceCanvas" width="800" height="600" style="width:100%; height:80vh; border:none;"></canvas>
                    <div style="position:absolute; top:10px; left:10px; color:white; font-family:monospace; font-size:1.2rem;">
                        Score: <span id="space-score">0</span>
                        <br>
                        High Score: <span id="space-high-score">0</span>
                    </div>
                </div>
                <button class="back-btn">Back</button>
            `;
            canvas = container.querySelector('#spaceCanvas');

            container.querySelector('.back-btn').addEventListener('click', () => {
                 window.miniGameHub.goBack();
            });
        }

        // Update High Score UI
        const hs = this.saveSystem.getHighScore('space-game');
        container.querySelector('#space-high-score').textContent = hs;
        this.scoreEl = container.querySelector('#space-score');

        // Three.js Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.03); // Denser fog for depth

        this.camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 15);
        this.camera.lookAt(0, 0, -10);

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 2.0); // Brighter ambient
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(0, 10, 10);
        this.scene.add(pointLight);

        // Player (Composed Group)
        this.player = new THREE.Group();

        // Body
        const bodyGeo = new THREE.ConeGeometry(0.8, 3, 4);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x333333, emissive: 0x00ffff, emissiveIntensity: 0.2, flatShading: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = -Math.PI / 2;
        this.player.add(body);

        // Wings
        const wingGeo = new THREE.BufferGeometry();
        const wingVertices = new Float32Array([
            0, 0, 0,   2, 0, 1,   0, 0, 2,  // Right Wing
            0, 0, 0,  -2, 0, 1,   0, 0, 2   // Left Wing
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
        const wingMat = new THREE.MeshPhongMaterial({ color: 0x00aaff, side: THREE.DoubleSide });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.y = -0.2;
        this.player.add(wings);

        // Engines (Glow)
        const engineLight = new THREE.PointLight(0x00ffff, 2, 5);
        engineLight.position.set(0, 0, 1.5);
        this.player.add(engineLight);

        this.scene.add(this.player);

        // Starfield (Points)
        this.createStarfield();

        // Muzzle Flash Light
        this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 10);
        this.player.add(this.muzzleLight);
        this.muzzleTimer = 0;
    }

    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const count = 2000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i*3] = (Math.random() - 0.5) * 100;
            positions[i*3+1] = (Math.random() - 0.5) * 50;
            positions[i*3+2] = (Math.random() - 0.5) * 200 - 50; // Spread deep

            const color = new THREE.Color();
            color.setHSL(Math.random(), 0.8, 0.8);
            colors[i*3] = color.r;
            colors[i*3+1] = color.g;
            colors[i*3+2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true });
        this.starField = new THREE.Points(geometry, material);
        this.scene.add(this.starField);
    }

    shutdown() {
        this.isActive = false;
        if (this.scene) {
            // Traverse and dispose
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
                    else object.material.dispose();
                }
            });
            this.scene.clear();
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }

    shoot() {
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 1.5);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(geometry, material);

        bullet.position.copy(this.player.position);
        bullet.position.z -= 1.5;

        this.scene.add(bullet);
        this.bullets.push(bullet);

        this.soundManager.playSound('shoot');

        // Muzzle Flash
        this.muzzleLight.intensity = 5;
        this.muzzleTimer = 0.05;
    }

    spawnEnemy() {
        const type = Math.random();
        let enemy;

        if (type > 0.7) {
            // Fast Interceptor
            const geo = new THREE.ConeGeometry(0.5, 2, 3);
            const mat = new THREE.MeshPhongMaterial({ color: 0xff3333, flatShading: true });
            enemy = new THREE.Mesh(geo, mat);
            enemy.rotation.x = Math.PI / 2; // Point at player
            enemy.userData = { speed: this.ENEMY_SPEED * 1.5, hp: 1, type: 'interceptor' };
        } else {
            // Heavy Bomber
            const geo = new THREE.BoxGeometry(2, 1, 2);
            const mat = new THREE.MeshStandardMaterial({ color: 0x880000, roughness: 0.4 });
            enemy = new THREE.Mesh(geo, mat);
            enemy.userData = { speed: this.ENEMY_SPEED, hp: 2, type: 'bomber' };
        }

        enemy.position.x = (Math.random() - 0.5) * this.FIELD_WIDTH;
        enemy.position.y = (Math.random() - 0.5) * 5;
        enemy.position.z = -100;

        this.scene.add(enemy);
        this.enemies.push(enemy);
    }

    createExplosion(position, color=0xffaa00) {
        this.soundManager.playSound('explosion');
        const particleCount = 15;
        const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const material = new THREE.MeshBasicMaterial({ color: color });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);

            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15
            );

            this.scene.add(particle);
            this.particles.push(particle);
        }
    }

    update(dt) {
        if (!this.isActive) return;

        // Player Movement
        if (this.inputManager.isKeyDown('ArrowLeft')) this.player.position.x -= this.PLAYER_SPEED * dt;
        if (this.inputManager.isKeyDown('ArrowRight')) this.player.position.x += this.PLAYER_SPEED * dt;
        if (this.inputManager.isKeyDown('ArrowUp')) this.player.position.y += this.PLAYER_SPEED * dt;
        if (this.inputManager.isKeyDown('ArrowDown')) this.player.position.y -= this.PLAYER_SPEED * dt;

        // Clamp
        this.player.position.x = Math.max(-this.FIELD_WIDTH/2, Math.min(this.FIELD_WIDTH/2, this.player.position.x));
        this.player.position.y = Math.max(-10, Math.min(10, this.player.position.y));

        // Tilt
        const targetRotZ = (this.inputManager.isKeyDown('ArrowLeft') ? 0.5 : 0) + (this.inputManager.isKeyDown('ArrowRight') ? -0.5 : 0);
        this.player.rotation.z = THREE.MathUtils.lerp(this.player.rotation.z, targetRotZ, dt * 10);

        // Muzzle Flash Decay
        if (this.muzzleTimer > 0) {
            this.muzzleTimer -= dt;
            if (this.muzzleTimer <= 0) this.muzzleLight.intensity = 0;
        }

        // Shooting
        if (this.inputManager.isKeyDown('Space') && !this.lastShot) {
            this.shoot();
            this.lastShot = true;
        }
        if (!this.inputManager.isKeyDown('Space')) {
            this.lastShot = false;
        }

        // Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.position.z -= this.BULLET_SPEED * dt;
            if (b.position.z < -100) {
                this.scene.remove(b);
                this.bullets.splice(i, 1);
            }
        }

        // Spawning
        this.enemySpawnTimer += dt;
        // Increase difficulty over time
        const spawnRate = Math.max(0.5, 2.0 - (this.score / 2000));
        if (this.enemySpawnTimer > spawnRate) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.position.z += e.userData.speed * dt;

            // Player Collision
            if (e.position.distanceTo(this.player.position) < 2) {
                this.gameOver();
                return;
            }

            // Remove if passed
            if (e.position.z > 10) {
                this.scene.remove(e);
                this.enemies.splice(i, 1);
                // Penalty?
            }

            // Bullet Collision
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                // Simple AABB-ish check
                if (Math.abs(b.position.z - e.position.z) < 2 &&
                    Math.abs(b.position.x - e.position.x) < 2 &&
                    Math.abs(b.position.y - e.position.y) < 2) {

                    // Hit
                    e.userData.hp--;
                    this.scene.remove(b);
                    this.bullets.splice(j, 1);
                    this.createExplosion(b.position, 0xffff00); // Small hit effect

                    if (e.userData.hp <= 0) {
                        this.createExplosion(e.position, e.userData.type === 'interceptor' ? 0xff3333 : 0xffaa00);
                        this.scene.remove(e);
                        this.enemies.splice(i, 1);

                        this.score += 100;
                        if(this.scoreEl) this.scoreEl.textContent = this.score;
                        this.soundManager.playSound('score');
                    }
                    break;
                }
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.addScaledVector(p.userData.velocity, dt);
            p.material.opacity -= dt * 2;
            if (p.material.opacity <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }

        // Starfield
        if (this.starField) {
            this.starField.rotation.z += dt * 0.05; // Rotate stars
            const positions = this.starField.geometry.attributes.position.array;
            for(let i=0; i<positions.length; i+=3) {
                positions[i+2] += dt * 20; // Move towards camera
                if (positions[i+2] > 20) positions[i+2] -= 200; // Loop
            }
            this.starField.geometry.attributes.position.needsUpdate = true;
        }
    }

    draw() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    gameOver() {
        this.saveSystem.setHighScore('space-game', this.score);
        alert("Game Over! Score: " + this.score);
        // Force back to menu
        window.miniGameHub.goBack();
    }
}
