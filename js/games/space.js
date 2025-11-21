const spaceGame = {
    scene: null,
    camera: null,
    renderer: null,
    player: null,
    bullets: [],
    enemies: [],
    particles: [],
    score: 0,
    isActive: false,
    animationFrameId: null,
    keys: {},
    lastTime: 0,
    enemySpawnTimer: 0,

    // Game constants
    PLAYER_SPEED: 20,
    BULLET_SPEED: 40,
    ENEMY_SPEED: 15,
    FIELD_WIDTH: 40,
    FIELD_HEIGHT: 20,

    init: function() {
        this.isActive = true;
        this.score = 0;
        this.keys = {};
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.lastTime = performance.now();

        // UI Setup
        const container = document.getElementById("space-game");
        const canvas = document.getElementById("spaceCanvas");

        // We need to replace the canvas with a container for Three.js or just use the canvas if possible.
        // Three.js can attach to an existing canvas.

        // Score display update
        const scoreEl = document.getElementById("space-score");
        if(scoreEl) scoreEl.textContent = this.score;

        // High Score Display
        let highScoreEl = document.getElementById("space-high-score");
        if (!highScoreEl) {
            const p = document.createElement("p");
            p.innerHTML = '🏆 High Score: <span id="space-high-score">0</span>';
            // Insert after score
            scoreEl.parentElement.after(p);
            highScoreEl = document.getElementById("space-high-score");
        }
        highScoreEl.textContent = window.saveSystem.getHighScore('space-game');

        // Three.js Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
        this.camera.position.z = 20;
        this.camera.position.y = 5;
        this.camera.rotation.x = -0.2;

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        this.renderer.setSize(canvas.width, canvas.height);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 10, 10);
        this.scene.add(directionalLight);

        // Player (Arwing-ish style)
        const geometry = new THREE.ConeGeometry(1, 2, 4);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00, flatShading: true });
        this.player = new THREE.Mesh(geometry, material);
        this.player.rotation.x = -Math.PI / 2; // Point forward
        this.player.position.y = 0;
        this.scene.add(this.player);

        // Engine glow (simple point light attached to player)
        const engineLight = new THREE.PointLight(0x00ff00, 1, 10);
        engineLight.position.set(0, -1, 0.5);
        this.player.add(engineLight);

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
        cancelAnimationFrame(this.animationFrameId);

        document.removeEventListener("keydown", this.keydownHandler);
        document.removeEventListener("keyup", this.keyupHandler);

        // Clean up Three.js
        if (this.scene) {
            while(this.scene.children.length > 0){
                this.scene.remove(this.scene.children[0]);
            }
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
        // Remove high score element to prevent duplicates if init is called again differently (though check above handles it)
    },

    createStarfield: function() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });

        const starsVertices = [];
        for (let i = 0; i < 1000; i++) {
            const x = (Math.random() - 0.5) * 200;
            const y = (Math.random() - 0.5) * 200;
            const z = (Math.random() - 0.5) * 200; // Deep space
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(starField);
        this.starField = starField; // Reference for animation
    },

    shoot: function() {
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const bullet = new THREE.Mesh(geometry, material);

        bullet.position.copy(this.player.position);
        bullet.position.z -= 1; // Start slightly in front

        this.scene.add(bullet);
        this.bullets.push(bullet);

        window.soundManager.playSound('shoot');
    },

    spawnEnemy: function() {
        const geometry = new THREE.BoxGeometry(2, 1, 2); // Simple ship shape
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true });
        const enemy = new THREE.Mesh(geometry, material);

        // Random X position within field width
        enemy.position.x = (Math.random() - 0.5) * this.FIELD_WIDTH;
        enemy.position.y = 0;
        enemy.position.z = -100; // Start far away

        this.scene.add(enemy);
        this.enemies.push(enemy);
    },

    createExplosion: function(position) {
        window.soundManager.playSound('explosion');
        const particleCount = 10;
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);

            // Random velocity
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );

            this.scene.add(particle);
            this.particles.push(particle);
        }
    },

    update: function(dt) {
        // Player Movement
        if (this.keys['ArrowLeft']) this.player.position.x -= this.PLAYER_SPEED * dt;
        if (this.keys['ArrowRight']) this.player.position.x += this.PLAYER_SPEED * dt;

        // Clamp Player Position
        this.player.position.x = Math.max(-this.FIELD_WIDTH/2, Math.min(this.FIELD_WIDTH/2, this.player.position.x));

        // Tilt effect
        this.player.rotation.z = -this.player.position.x * 0.05; // Bank turn

        // Shooting
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

            // Remove if too far
            if (b.position.z < -100) {
                this.scene.remove(b);
                this.bullets.splice(i, 1);
            }
        }

        // Enemy Spawning
        this.enemySpawnTimer += dt;
        if (this.enemySpawnTimer > 1.0) { // Spawn every second
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.position.z += this.ENEMY_SPEED * dt;

            // Check Collision with Player
            const dist = e.position.distanceTo(this.player.position);
            if (dist < 2) {
                this.gameOver();
                return;
            }

            // Remove if passed player
            if (e.position.z > 10) {
                this.scene.remove(e);
                this.enemies.splice(i, 1);
            }

            // Check Collision with Bullets
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                if (b.position.distanceTo(e.position) < 2) {
                    // Hit!
                    this.createExplosion(e.position);

                    this.scene.remove(e);
                    this.enemies.splice(i, 1);

                    this.scene.remove(b);
                    this.bullets.splice(j, 1);

                    this.score += 100;
                    document.getElementById("space-score").textContent = this.score;
                    window.soundManager.playSound('score');
                    break; // Break bullet loop
                }
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.addScaledVector(p.userData.velocity, dt);
            p.material.opacity -= dt * 2; // Fade out

            if (p.material.opacity <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }

        // Starfield movement (fake speed)
        if (this.starField) {
             this.starField.position.z += 10 * dt;
             if (this.starField.position.z > 50) this.starField.position.z = 0;
        }
    },

    loop: function() {
        if (!this.isActive) return;

        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.update(dt);
        this.renderer.render(this.scene, this.camera);

        this.animationFrameId = requestAnimationFrame(() => this.loop());
    },

    gameOver: function() {
        window.soundManager.playSound('explosion');

        const isNewHigh = window.saveSystem.setHighScore('space-game', this.score);
        let msg = "Game Over! Score: " + this.score;
        if (isNewHigh) msg += "\nNew High Score!";

        alert(msg);
        this.shutdown();

        // Optional: restart or go back to menu
        // For now, just reset
        this.init();
    }
};
