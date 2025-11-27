export default {
    scene: null,
    camera: null,
    renderer: null,
    player: null,
    bullets: [],
    enemies: [],
    particles: [],
    explosions: [], // Using Points for explosions
    score: 0,
    isActive: false,
    animationFrameId: null,
    keys: {},
    lastTime: 0,
    enemySpawnTimer: 0,

    // Starfield
    starField: null,
    warpEffect: false,

    // Game constants
    PLAYER_SPEED: 25,
    BULLET_SPEED: 60,
    ENEMY_SPEED: 20,
    FIELD_WIDTH: 50,
    FIELD_HEIGHT: 30,

    init: function() {
        this.isActive = true;
        this.score = 0;
        this.keys = {};
        this.bullets = [];
        this.enemies = [];
        this.particles = []; // Mesh particles (legacy)
        this.explosions = []; // Point particles
        this.lastTime = performance.now();

        // UI Setup
        const canvas = document.getElementById("spaceCanvas");

        // Score display update
        const scoreEl = document.getElementById("space-score");
        if(scoreEl) scoreEl.textContent = this.score;

        let highScoreEl = document.getElementById("space-high-score");
        if (!highScoreEl && scoreEl && scoreEl.parentElement) {
            const p = document.createElement("p");
            p.innerHTML = '🏆 High Score: <span id="space-high-score">0</span>';
            scoreEl.parentElement.after(p);
            highScoreEl = document.getElementById("space-high-score");
        }
        if (highScoreEl && window.saveSystem) {
            highScoreEl.textContent = window.saveSystem.getHighScore('space-game');
        }

        // Three.js Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

        this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
        this.camera.position.z = 30;
        this.camera.position.y = 10;
        this.camera.rotation.x = -0.3;

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.shadowMap.enabled = true;

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x00ffff, 1, 50);
        pointLight.position.set(0, 10, 10);
        this.scene.add(pointLight);

        // Player Model (Composite)
        this.createPlayerShip();

        // Starfield
        this.createStarfield();

        // Event Listeners
        this.keydownHandler = (e) => this.keys[e.code] = true;
        this.keyupHandler = (e) => this.keys[e.code] = false;
        document.addEventListener("keydown", this.keydownHandler);
        document.addEventListener("keyup", this.keyupHandler);

        // Start Loop
        this.loop();
    },

    shutdown: function() {
        this.isActive = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

        document.removeEventListener("keydown", this.keydownHandler);
        document.removeEventListener("keyup", this.keyupHandler);

        if (this.scene) {
            while(this.scene.children.length > 0){
                this.scene.remove(this.scene.children[0]);
            }
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    },

    createPlayerShip: function() {
        const shipGroup = new THREE.Group();

        // Body
        const bodyGeo = new THREE.ConeGeometry(1.5, 4, 8);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, flatShading: true, shininess: 100 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = -Math.PI / 2;
        shipGroup.add(body);

        // Wings
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

        // Engine Glow
        const engineLight = new THREE.PointLight(0x60a5fa, 2, 10);
        engineLight.position.set(0, 0, 2);
        shipGroup.add(engineLight);

        // Trail particles emitter point

        this.player = shipGroup;
        this.scene.add(this.player);
    },

    createStarfield: function() {
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
    },

    shoot: function() {
        // Left Blaster
        this.spawnBullet(-1.5);
        // Right Blaster
        this.spawnBullet(1.5);

        if(window.soundManager) window.soundManager.playTone(600, 'sawtooth', 0.1, false, true);
    },

    spawnBullet: function(xOffset) {
        const geometry = new THREE.CapsuleGeometry(0.2, 2, 4, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const bullet = new THREE.Mesh(geometry, material);

        bullet.position.copy(this.player.position);
        bullet.position.x += xOffset;
        bullet.position.z -= 2;
        bullet.rotation.x = Math.PI / 2;

        this.scene.add(bullet);
        this.bullets.push(bullet);
    },

    spawnEnemy: function() {
        const geometry = new THREE.TetrahedronGeometry(2, 0);
        const material = new THREE.MeshPhongMaterial({ color: 0xff4500, flatShading: true, shininess: 50 });
        const enemy = new THREE.Mesh(geometry, material);

        enemy.position.x = (Math.random() - 0.5) * this.FIELD_WIDTH;
        enemy.position.y = (Math.random() - 0.5) * 10;
        enemy.position.z = -100;

        // Random spin
        enemy.userData.rotVel = {
            x: Math.random() * 0.1,
            y: Math.random() * 0.1
        };

        this.scene.add(enemy);
        this.enemies.push(enemy);
    },

    createExplosion: function(position) {
        if(window.soundManager) window.soundManager.playSound('explosion');

        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for(let i=0; i<particleCount; i++) {
            positions.push(position.x, position.y, position.z);
            velocities.push(
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 1
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffaa00,
            size: 2,
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
    },

    update: function(dt) {
        if (!this.player) return;

        // Player Movement
        if (this.keys['ArrowLeft']) this.player.position.x -= this.PLAYER_SPEED * dt;
        if (this.keys['ArrowRight']) this.player.position.x += this.PLAYER_SPEED * dt;
        if (this.keys['ArrowUp']) this.player.position.y += this.PLAYER_SPEED * dt;
        if (this.keys['ArrowDown']) this.player.position.y -= this.PLAYER_SPEED * dt;

        // Clamp
        this.player.position.x = Math.max(-this.FIELD_WIDTH/2, Math.min(this.FIELD_WIDTH/2, this.player.position.x));
        this.player.position.y = Math.max(-10, Math.min(15, this.player.position.y));

        // Bank
        const targetRotZ = (this.keys['ArrowLeft'] ? 0.5 : (this.keys['ArrowRight'] ? -0.5 : 0));
        this.player.rotation.z += (targetRotZ - this.player.rotation.z) * 5 * dt;

        // Shoot
        if (this.keys['Space'] && !this.lastShot) {
            this.shoot();
            this.lastShot = true;
        }
        if (!this.keys['Space']) {
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

        // Enemy Spawn
        this.enemySpawnTimer += dt;
        const spawnRate = Math.max(0.5, 2.0 - (this.score / 2000));
        if (this.enemySpawnTimer > spawnRate) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.position.z += this.ENEMY_SPEED * dt;

            e.rotation.x += e.userData.rotVel.x;
            e.rotation.y += e.userData.rotVel.y;

            const dist = e.position.distanceTo(this.player.position);
            if (dist < 4) { // Larger hit box for player
                this.gameOver();
                return;
            }

            if (e.position.z > 20) {
                this.scene.remove(e);
                this.enemies.splice(i, 1);
            }

            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                if (b.position.distanceTo(e.position) < 3) {
                    this.createExplosion(e.position);
                    this.scene.remove(e);
                    this.enemies.splice(i, 1);
                    this.scene.remove(b);
                    this.bullets.splice(j, 1);
                    this.score += 100;
                    document.getElementById("space-score").textContent = this.score;
                    if(window.soundManager) window.soundManager.playSound('score');
                    break;
                }
            }
        }

        // Update Explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            const positions = exp.geometry.attributes.position.array;
            const vels = exp.userData.velocities;

            exp.userData.life -= dt * 2;
            exp.material.opacity = exp.userData.life;

            for(let j=0; j<vels.length/3; j++) {
                positions[j*3] += vels[j*3];
                positions[j*3+1] += vels[j*3+1];
                positions[j*3+2] += vels[j*3+2];
            }
            exp.geometry.attributes.position.needsUpdate = true;

            if (exp.userData.life <= 0) {
                this.scene.remove(exp);
                this.explosions.splice(i, 1);
            }
        }

        // Starfield "Warp"
        if (this.starField) {
             const positions = this.starField.geometry.attributes.position.array;
             for(let i=0; i<positions.length; i+=3) {
                 positions[i+2] += (50 + (this.score * 0.05)) * dt;
                 if(positions[i+2] > 50) positions[i+2] -= 400;
             }
             this.starField.geometry.attributes.position.needsUpdate = true;
        }
    },

    loop: function() {
        if (!this.isActive) return;

        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        const clampedDt = Math.min(dt, 0.1);

        this.update(clampedDt);
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        this.animationFrameId = requestAnimationFrame(() => this.loop());
    },

    gameOver: function() {
        if(window.soundManager) window.soundManager.playSound('explosion');

        let msg = "Game Over! Score: " + this.score;
        if (window.saveSystem) {
             const isNewHigh = window.saveSystem.setHighScore('space-game', this.score);
             if (isNewHigh) msg += "\nNew High Score!";
        }

        alert(msg);
        this.shutdown();
    }
};
