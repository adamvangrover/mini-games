export default class NeonBounce {
    constructor() {
        this.container = null;
        this.saveSystem = window.miniGameHub ? window.miniGameHub.saveSystem : null;
        this.soundManager = window.miniGameHub ? window.miniGameHub.soundManager : null;

        // Visual / Aesthetic Config
        this.colors = {
            bg: '#050510',
            paddle: '#00ffff',
            ball: '#ff00ff',
            blockLight: '#ffffff',
            blockColors: ['#ff0055', '#00ffcc', '#ffff00', '#aa00ff']
        };

        // Game State
        this.score = 0;
        this.combo = 0;
        this.lives = 3;
        this.level = 1;
        this.state = 'start'; // start, playing, gameover

        // Entites
        this.paddle = { x: 0, y: 0, width: 100, height: 15, vx: 0, speed: 600 };
        this.ball = { x: 0, y: 0, radius: 8, vx: 0, vy: 0, speed: 400, active: false };
        this.blocks = [];

        // Effects
        this.particles = [];
        this.trails = [];
        this.screenShake = 0;

        // Input
        this.keys = {};

        // Timers
        this.lastTime = 0;
        this.animationFrame = null;
    }

    async init(container) {
        this.container = container;
        this.buildUI();
        this.resetGame();
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    buildUI() {
        this.container.innerHTML = `
            <div id="neon-bounce-ui" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; box-sizing: border-box; font-family: monospace; color: white;">
                <div style="display: flex; justify-content: space-between; font-size: 24px; text-shadow: 0 0 10px #0ff;">
                    <div>SCORE: <span id="nb-score">0</span></div>
                    <div>LEVEL: <span id="nb-level">1</span></div>
                    <div>LIVES: <span id="nb-lives">3</span></div>
                </div>
                <div id="nb-msg" style="text-align: center; font-size: 48px; text-shadow: 0 0 20px #f0f; margin-bottom: 20%;">
                    CLICK TO START
                </div>
            </div>
            <canvas id="neon-bounce-canvas" style="display: block; width: 100%; height: 100%; background: ${this.colors.bg};"></canvas>
        `;

        this.canvas = this.container.querySelector('#neon-bounce-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.scoreEl = this.container.querySelector('#nb-score');
        this.levelEl = this.container.querySelector('#nb-level');
        this.livesEl = this.container.querySelector('#nb-lives');
        this.msgEl = this.container.querySelector('#nb-msg');

        this.resize();

        // Bindings
        this.boundResize = this.resize.bind(this);
        this.boundKeyDown = this.onKeyDown.bind(this);
        this.boundKeyUp = this.onKeyUp.bind(this);
        this.boundPointerMove = this.onPointerMove.bind(this);
        this.boundPointerDown = this.onPointerDown.bind(this);

        window.addEventListener('resize', this.boundResize);
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        this.canvas.addEventListener('pointermove', this.boundPointerMove);
        this.canvas.addEventListener('pointerdown', this.boundPointerDown);
    }


    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = rect.width;
        this.height = rect.height;

        if (this.state === 'start' && !this.ball.active) {
            this.resetPaddleAndBall();
        }
    }

    resetGame() {
        this.score = 0;
        this.combo = 0;
        this.lives = 3;
        this.level = 1;
        this.state = 'start';
        this.updateHUD();
        this.generateLevel();
        this.resetPaddleAndBall();
        this.msgEl.style.display = 'block';
        this.msgEl.textContent = 'CLICK TO START';
    }

    resetPaddleAndBall() {
        this.paddle.x = this.width / 2 - this.paddle.width / 2;
        this.paddle.y = this.height - 40;
        this.paddle.vx = 0;

        this.ball.active = false;
        this.ball.x = this.paddle.x + this.paddle.width / 2;
        this.ball.y = this.paddle.y - this.ball.radius - 1;
        this.ball.speed = 400 + (this.level * 20);
    }

    launchBall() {
        if (this.ball.active) return;
        this.ball.active = true;
        this.state = 'playing';
        this.msgEl.style.display = 'none';

        const angle = -Math.PI / 2 + (Math.random() * 0.4 - 0.2); // Up with slight random lean
        this.ball.vx = Math.cos(angle) * this.ball.speed;
        this.ball.vy = Math.sin(angle) * this.ball.speed;
        if(this.soundManager) this.soundManager.playSound('click');
    }

    generateLevel() {
        this.blocks = [];
        const rows = Math.min(4 + this.level, 10);
        const cols = 8;
        const blockWidth = (this.width - 100) / cols;
        const blockHeight = 25;
        const startY = 80;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > 0.1) { // 90% chance to spawn block
                    this.blocks.push({
                        x: 50 + c * blockWidth + 2,
                        y: startY + r * blockHeight + 2,
                        w: blockWidth - 4,
                        h: blockHeight - 4,
                        color: this.colors.blockColors[(r + this.level) % this.colors.blockColors.length],
                        hp: 1 + Math.floor(r/3)
                    });
                }
            }
        }
    }

    spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 200 + 50;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color,
                size: Math.random() * 3 + 1
            });
        }
    }

    updateHUD() {
        this.scoreEl.textContent = this.score;
        this.levelEl.textContent = this.level;
        this.livesEl.textContent = this.lives;
    }

    onKeyDown(e) {
        this.keys[e.key] = true;
        if (e.key === ' ' || e.key === 'Enter') {
            if (this.state === 'start') this.launchBall();
            if (this.state === 'gameover') this.resetGame();
        }
    }

    onKeyUp(e) {
        this.keys[e.key] = false;
    }

    onPointerMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const targetX = e.clientX - rect.left - this.paddle.width / 2;
        // Smoothly follow pointer
        this.paddle.x += (targetX - this.paddle.x) * 0.5;

        // Constrain
        if (this.paddle.x < 0) this.paddle.x = 0;
        if (this.paddle.x > this.width - this.paddle.width) this.paddle.x = this.width - this.paddle.width;
    }

    onPointerDown(e) {
        if (this.state === 'start') this.launchBall();
        if (this.state === 'gameover') this.resetGame();
    }

    update(dt) {
        if (this.state !== 'playing') {
            if (this.state === 'start') {
                // Keep ball on paddle
                this.ball.x = this.paddle.x + this.paddle.width / 2;
                this.ball.y = this.paddle.y - this.ball.radius - 1;
            }
            return;
        }

        // Screen shake decay
        if (this.screenShake > 0) this.screenShake -= dt * 30;
        if (this.screenShake < 0) this.screenShake = 0;

        // Keyboard Paddle Movement
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            this.paddle.x -= this.paddle.speed * dt;
        }
        if (this.keys['ArrowRight'] || this.keys['d']) {
            this.paddle.x += this.paddle.speed * dt;
        }

        // Constrain paddle
        if (this.paddle.x < 0) this.paddle.x = 0;
        if (this.paddle.x > this.width - this.paddle.width) this.paddle.x = this.width - this.paddle.width;

        // Move Ball
        const steps = 3; // Sub-stepping for collision accuracy
        const subDt = dt / steps;

        for (let s = 0; s < steps; s++) {
            this.ball.x += this.ball.vx * subDt;
            this.ball.y += this.ball.vy * subDt;

            // Wall Collisions
            if (this.ball.x - this.ball.radius < 0) {
                this.ball.x = this.ball.radius;
                this.ball.vx *= -1;
                if(this.soundManager) this.soundManager.playSound('click');
            } else if (this.ball.x + this.ball.radius > this.width) {
                this.ball.x = this.width - this.ball.radius;
                this.ball.vx *= -1;
                if(this.soundManager) this.soundManager.playSound('click');
            }

            if (this.ball.y - this.ball.radius < 0) {
                this.ball.y = this.ball.radius;
                this.ball.vy *= -1;
                if(this.soundManager) this.soundManager.playSound('click');
            } else if (this.ball.y + this.ball.radius > this.height) {
                // Death
                this.lives--;
                this.updateHUD();
                if(this.soundManager) this.soundManager.playSound('explosion');
                this.spawnParticles(this.ball.x, this.ball.y, '#ff0000', 30);
                this.screenShake = 15;

                if (this.lives <= 0) {
                    this.state = 'gameover';
                    this.msgEl.style.display = 'block';
                    this.msgEl.innerHTML = 'GAME OVER<br><span style="font-size:24px">CLICK TO RESTART</span>';

                    // Save Highscore
                    const hs = this.saveSystem.data.minigames['neon-bounce'] || 0;
                    if (this.score > hs) {
                        this.saveSystem.updateMinigameScore('neon-bounce', this.score);
                    }
                } else {
                    this.state = 'start';
                    this.resetPaddleAndBall();
                }
                break;
            }

            // Paddle Collision
            if (this.ball.vy > 0 &&
                this.ball.y + this.ball.radius >= this.paddle.y &&
                this.ball.y - this.ball.radius <= this.paddle.y + this.paddle.height &&
                this.ball.x >= this.paddle.x &&
                this.ball.x <= this.paddle.x + this.paddle.width) {

                this.ball.y = this.paddle.y - this.ball.radius; // Push out

                // Angle based on hit position
                const hitPos = (this.ball.x - (this.paddle.x + this.paddle.width/2)) / (this.paddle.width/2);
                const maxAngle = Math.PI / 3; // 60 degrees
                const angle = hitPos * maxAngle;

                // Increase speed slightly
                this.ball.speed = Math.min(this.ball.speed + 10, 1000);

                this.ball.vx = Math.sin(angle) * this.ball.speed;
                this.ball.vy = -Math.cos(angle) * this.ball.speed;

                this.combo = 0; // Reset combo
                if(this.soundManager) this.soundManager.playSound('click');
                this.spawnParticles(this.ball.x, this.ball.y, this.colors.paddle, 5);
            }

            // Block Collision
            for (let i = this.blocks.length - 1; i >= 0; i--) {
                const b = this.blocks[i];

                // Simple AABB vs Circle check
                const cx = Math.max(b.x, Math.min(this.ball.x, b.x + b.w));
                const cy = Math.max(b.y, Math.min(this.ball.y, b.y + b.h));

                const distSq = (this.ball.x - cx) * (this.ball.x - cx) + (this.ball.y - cy) * (this.ball.y - cy);

                if (distSq <= this.ball.radius * this.ball.radius) {
                    // Hit!
                    b.hp--;
                    this.combo++;
                    this.score += 10 * this.combo;
                    this.updateHUD();

                    this.spawnParticles(cx, cy, b.color, 15);
                    this.screenShake = 3 + Math.min(this.combo, 5);
                    if(this.soundManager) this.soundManager.playSound('click'); // Need a pop sound ideally

                    // Resolve collision direction
                    if (Math.abs(this.ball.x - cx) > Math.abs(this.ball.y - cy)) {
                        this.ball.vx *= -1;
                    } else {
                        this.ball.vy *= -1;
                    }

                    if (b.hp <= 0) {
                        this.blocks.splice(i, 1);
                    }

                    // Check level complete
                    if (this.blocks.length === 0) {
                        this.level++;
                        this.updateHUD();
                        this.state = 'start';
                        this.generateLevel();
                        this.resetPaddleAndBall();
                        this.msgEl.style.display = 'block';
                        this.msgEl.innerHTML = 'LEVEL UP!<br><span style="font-size:24px">CLICK TO CONTINUE</span>';
                        if(this.soundManager) this.soundManager.playSound('powerup');
                    }
                    break; // Only hit one block per sub-step
                }
            }
        }

        // Trail
        if (this.state === 'playing') {
            this.trails.push({x: this.ball.x, y: this.ball.y, life: 1.0});
            if (this.trails.length > 20) this.trails.shift();
        }

        // Update Effects
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 2;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.trails.length - 1; i >= 0; i--) {
            this.trails[i].life -= dt * 5;
            if (this.trails[i].life <= 0) this.trails.splice(i, 1);
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.colors.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.save();

        // Apply screen shake
        if (this.screenShake > 0) {
            const dx = (Math.random() - 0.5) * this.screenShake;
            const dy = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(dx, dy);
        }

        // Draw Trails
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.trails.length - 1; i++) {
            const t1 = this.trails[i];
            const t2 = this.trails[i+1];
            ctx.beginPath();
            ctx.moveTo(t1.x, t1.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.strokeStyle = `rgba(255, 0, 255, ${t1.life * 0.5})`;
            ctx.lineWidth = this.ball.radius * 2 * t1.life;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Draw Blocks
        for (let i = 0; i < this.blocks.length; i++) {
            const b = this.blocks[i];
            ctx.fillStyle = b.color;
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(b.x | 0, b.y | 0, b.w | 0, b.h | 0);

            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect((b.x | 0) + 2, (b.y | 0) + 2, (b.w | 0) - 4, (b.h/2) | 0);
        }

        // Draw Paddle
        ctx.fillStyle = this.colors.paddle;
        ctx.shadowColor = this.colors.paddle;
        ctx.shadowBlur = 15;
        // Rounded rect
        ctx.beginPath();
        ctx.roundRect(this.paddle.x | 0, this.paddle.y | 0, this.paddle.width | 0, this.paddle.height | 0, 5);
        ctx.fill();

        // Draw Ball
        ctx.fillStyle = this.colors.ball;
        ctx.shadowColor = this.colors.ball;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.ball.x | 0, this.ball.y | 0, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Draw Particles
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x | 0, p.y | 0, p.size | 0, p.size | 0);
        }

        ctx.restore();
    }

    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap dt
        this.lastTime = timestamp;

        this.update(dt);
        this.draw(this.ctx);

        this.animationFrame = requestAnimationFrame(this.loop.bind(this));
    }

    cleanup() {
        cancelAnimationFrame(this.animationFrame);
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        this.canvas.removeEventListener('pointermove', this.boundPointerMove);
        this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
        this.container.innerHTML = '';
    }
}
