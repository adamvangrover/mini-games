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
        this.explosions = [];
        this.score = 0;
        this.isActive = false;
        this.enemySpawnTimer = 0;

        this.PLAYER_SPEED = 30;
        this.BULLET_SPEED = 60;
        this.ENEMY_SPEED = 20;
        this.FIELD_WIDTH = 30;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    async init(container) {
        if (typeof THREE === 'undefined') {
            container.innerHTML = `<div class="p-4 text-red-500">Error: Three.js is not loaded. Please check your internet connection or standard libraries.</div>`;
            return;
        }

        let canvas = container.querySelector('#spaceCanvas');
        if (!canvas) {
            container.innerHTML = `
                <h2>🚀 Space Shooter</h2>
                <div class="relative w-full h-[80vh] bg-black rounded-lg overflow-hidden border border-blue-500">
                    <canvas id="spaceCanvas" class="w-full h-full block"></canvas>
                    <div class="absolute top-4 left-4 text-white font-mono text-lg z-10 pointer-events-none">
                        Score: <span id="space-score">0</span>
                        <br>
                        High Score: <span id="space-high-score">0</span>
                    </div>
                </div>
                <p class="mt-4 text-slate-300">Use <b>Arrow Keys</b> to move. <b>Space</b> to shoot.</p>
                <button class="back-btn mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Back</button>
            `;
            canvas = container.querySelector('#spaceCanvas');

             container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.isActive = true;
        this.score = 0;
        this.bullets = [];
        this.enemies = [];
        this.explosions = [];
        this.enemySpawnTimer = 0;

        const hs = this.saveSystem.getHighScore('space-game');
        container.querySelector('#space-high-score').textContent = hs;
        this.scoreEl = container.querySelector('#space-score');

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x020617, 0.03);

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, -5);

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        const ambientLight = new THREE.AmbientLight(0x404040, 2.0);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(0, 10, 10);
        this.scene.add(pointLight);

        this.createPlayerShip();
        this.createStarfield();

        this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 10);
        this.player.add(this.muzzleLight);
        this.muzzleTimer = 0;

        this.resizeHandler = () => {
             if (!this.isActive || !this.camera || !this.renderer) return;
             const w = canvas.clientWidth;
             const h = canvas.clientHeight;
             this.camera.aspect = w / h;
             this.camera.updateProjectionMatrix();
             this.renderer.setSize(w, h);
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    shutdown() {
        this.isActive = false;
        if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);

        if (this.scene) {
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

    createPlayerShip() {
        const shipGroup = new THREE.Group();

        const bodyGeo = new THREE.ConeGeometry(1.5, 4, 8);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, flatShading: true, shininess: 100 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = -Math.PI / 2;
        shipGroup.add(body);

        const wingGeo = new THREE.BufferGeometry();
        const wingVertices = new Float32Array([
            0, 0, 1,   // Base center
            4, -1, 2,  // Wing tip
            0, 0, -1,  // Base back

            0, 0, 1,
            -4, -1, 2,
            0, 0, -1
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
        const wingMat = new THREE.MeshPhongMaterial({ color: 0x1d4ed8, side: THREE.DoubleSide, flatShading: true });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.rotation.x = -Math.PI / 2;
        shipGroup.add(wings);

        const engineLight = new THREE.PointLight(0x60a5fa, 2, 10);
        engineLight.position.set(0, 0, 2);
        shipGroup.add(engineLight);

        this.player = shipGroup;
        this.scene.add(this.player);
    }

    createStarfield() {
        const starsGeometry = new THREE.BufferGeometry();
        const starCount = 2000;
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            positions[i*3] = (Math.random() - 0.5) * 400;
            positions[i*3+1] = (Math.random() - 0.5) * 400;
            positions[i*3+2] = (Math.random() - 0.5) * 400 - 100;
            sizes[i] = Math.random() * 2;
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true });
        this.starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.starField);
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

        this.muzzleLight.intensity = 5;
        this.muzzleTimer = 0.05;
    }

    spawnEnemy() {
        const type = Math.random();
        let enemy;

        if (type > 0.7) {
            const geo = new THREE.ConeGeometry(0.5, 2, 3);
            const mat = new THREE.MeshPhongMaterial({ color: 0xff3333, flatShading: true });
            enemy = new THREE.Mesh(geo, mat);
            enemy.rotation.x = Math.PI / 2;
            enemy.userData = { speed: this.ENEMY_SPEED * 1.5, hp: 1, type: 'interceptor', rotVel: {x: 0, y: 0} };
        } else {
            const geo = new THREE.BoxGeometry(2, 1, 2);
            const mat = new THREE.MeshStandardMaterial({ color: 0x880000, roughness: 0.4 });
            enemy = new THREE.Mesh(geo, mat);
            enemy.userData = { speed: this.ENEMY_SPEED, hp: 2, type: 'bomber', rotVel: {x: Math.random()*0.05, y: Math.random()*0.05} };
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
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
             positions.push(position.x, position.y, position.z);
             velocities.push(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.5,
            transparent: true,
            opacity: 1
        });

        const explosion = new THREE.Points(geometry, material);
        explosion.userData = {
            velocities: velocities,
            life: 1.0
        };

        this.scene.add(explosion);
        this.explosions.push(explosion);
    }

    update(dt) {
        if (!this.isActive) return;

        if (this.inputManager.isKeyDown('ArrowLeft')) this.player.position.x -= this.PLAYER_SPEED * dt;
        if (this.inputManager.isKeyDown('ArrowRight')) this.player.position.x += this.PLAYER_SPEED * dt;
        if (this.inputManager.isKeyDown('ArrowUp')) this.player.position.y += this.PLAYER_SPEED * dt;
        if (this.inputManager.isKeyDown('ArrowDown')) this.player.position.y -= this.PLAYER_SPEED * dt;

        this.player.position.x = Math.max(-this.FIELD_WIDTH/2, Math.min(this.FIELD_WIDTH/2, this.player.position.x));
        this.player.position.y = Math.max(-5, Math.min(10, this.player.position.y));

        const targetRotZ = (this.inputManager.isKeyDown('ArrowLeft') ? 0.5 : 0) + (this.inputManager.isKeyDown('ArrowRight') ? -0.5 : 0);
        this.player.rotation.z = THREE.MathUtils.lerp(this.player.rotation.z, targetRotZ, dt * 10);

        if (this.muzzleTimer > 0) {
            this.muzzleTimer -= dt;
            if (this.muzzleTimer <= 0) this.muzzleLight.intensity = 0;
        }

        if (this.inputManager.isKeyDown('Space') && !this.lastShot) {
            this.shoot();
            this.lastShot = true;
        }
        if (!this.inputManager.isKeyDown('Space')) {
            this.lastShot = false;
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.position.z -= this.BULLET_SPEED * dt;
            if (b.position.z < -100) {
                this.scene.remove(b);
                this.bullets.splice(i, 1);
            }
        }

        this.enemySpawnTimer += dt;
        const spawnRate = Math.max(0.5, 2.0 - (this.score / 2000));
        if (this.enemySpawnTimer > spawnRate) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.position.z += e.userData.speed * dt;

            e.rotation.x += e.userData.rotVel.x;
            e.rotation.y += e.userData.rotVel.y;

            if (e.position.distanceTo(this.player.position) < 3) {
                this.gameOver();
                return;
            }

            if (e.position.z > 20) {
                this.scene.remove(e);
                this.enemies.splice(i, 1);
            }

            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                if (Math.abs(b.position.z - e.position.z) < 2 &&
                    Math.abs(b.position.x - e.position.x) < 2 &&
                    Math.abs(b.position.y - e.position.y) < 2) {

                    e.userData.hp--;
                    this.scene.remove(b);
                    this.bullets.splice(j, 1);
                    this.createExplosion(b.position, 0xffff00);

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

        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            const positions = exp.geometry.attributes.position.array;
            const vels = exp.userData.velocities;

            exp.userData.life -= dt * 2;
            exp.material.opacity = exp.userData.life;

            for(let j=0; j<vels.length/3; j++) {
                positions[j*3] += vels[j] * dt;
                positions[j*3+1] += vels[j+1] * dt;
                positions[j*3+2] += vels[j+2] * dt;
            }
            exp.geometry.attributes.position.needsUpdate = true;

            if (exp.userData.life <= 0) {
                this.scene.remove(exp);
                this.explosions.splice(i, 1);
            }
        }

        if (this.starField) {
             const positions = this.starField.geometry.attributes.position.array;
             for(let i=0; i<positions.length; i+=3) {
                 positions[i+2] += (50 + (this.score * 0.05)) * dt;
                 if(positions[i+2] > 50) positions[i+2] -= 400;
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
        this.isActive = false;
        this.saveSystem.setHighScore('space-game', this.score);
        if (window.miniGameHub && window.miniGameHub.showGameOver) {
             window.miniGameHub.showGameOver(this.score, () => {
                 this.resetGame();
             });
        }
    }

    resetGame() {
        this.score = 0;
        this.bullets.forEach(b => this.scene.remove(b));
        this.bullets = [];
        this.enemies.forEach(e => this.scene.remove(e));
        this.enemies = [];
        this.explosions.forEach(e => this.scene.remove(e));
        this.explosions = [];
        if(this.scoreEl) this.scoreEl.textContent = 0;
        this.isActive = true;
        this.player.position.set(0, 0, 0);
    }
}
