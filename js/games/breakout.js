import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class BreakoutGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.ballRadius = 8;
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.paddleHeight = 12;
        this.paddleWidth = 100;
        this.paddleX = 0;
        this.brickRowCount = 6;
        this.brickColumnCount = 8;
        this.brickWidth = 75;
        this.brickHeight = 25;
        this.brickPadding = 10;
        this.brickOffsetTop = 60;
        this.brickOffsetLeft = 35;
        this.bricks = [];
        this.score = 0;

        // Juice properties
        this.shakeTimer = 0;
        this.flashTimer = 0;
        this.trailTimer = 0;
        this.trailInterval = 0.02;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.resizeHandler = this.resize.bind(this);
        this.mouseMoveHandler = this.onMouseMove.bind(this);
        this.touchMoveHandler = this.onTouchMove.bind(this);
    }

    init(container) {
        let canvas = container.querySelector('#breakoutCanvas');
        if (!canvas) {
            container.innerHTML = `
                <div class="relative w-full h-full flex flex-col items-center justify-center">
                    <h2 class="absolute top-4 left-4 text-2xl font-bold text-fuchsia-500 z-10 pointer-events-none">🧱 Breakout</h2>
                    <canvas id="breakoutCanvas" class="border-2 border-fuchsia-500 rounded-lg bg-black shadow-[0_0_20px_rgba(255,0,255,0.3)]"></canvas>
                    <p class="absolute bottom-4 text-slate-400 text-sm pointer-events-none">Mouse/Touch/Arrows to move</p>
                    <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded z-20">Back</button>
                </div>
            `;
            canvas = container.querySelector('#breakoutCanvas');
             container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");

        // Responsive Sizing
        this.resize();
        window.addEventListener('resize', this.resizeHandler);

        // Input
        this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
        this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });

        this.resetGame();
    }

    shutdown() {
        window.removeEventListener('resize', this.resizeHandler);
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
            this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
        }
    }

    resize() {
        if (!this.canvas) return;

        // Use window dimensions since it's a full-screen overlay game
        // This avoids issues where parent container layout isn't fully calculated yet
        let width = window.innerWidth - 40;
        let height = window.innerHeight - 80;

        // Clamp aspect ratio to avoid extreme squashing
        if (width / height > 2.0) width = height * 2.0;
        if (height / width > 1.5) height = width * 1.5;

        this.canvas.width = width;
        this.canvas.height = height;

        // Re-calc brick sizes based on new width
        this.recalcLayout();

        // Ensure paddle stays on screen if resized
        if (this.paddleX > this.canvas.width - this.paddleWidth) {
            this.paddleX = this.canvas.width - this.paddleWidth;
        }
    }

    recalcLayout() {
        if (!this.canvas) return;
        this.brickColumnCount = Math.floor(this.canvas.width / 80);
        // Center the bricks
        const totalBrickWidth = this.brickColumnCount * 70 + (this.brickColumnCount - 1) * 10;
        this.brickWidth = 70;
        this.brickPadding = 10;
        this.brickOffsetLeft = (this.canvas.width - totalBrickWidth) / 2;

        // If bricks array doesn't match new count, we might want to regenerate or just map
        // For simplicity in a resize during game, we'll just regenerate bricks if the count changes drastically
        // But better to just restart round or try to preserve.
        // Let's just create new bricks if the array is empty, otherwise we might clip some.
        // Actually, easiest is to just reset if we haven't started playing much, but user might be annoyed.
        // We'll just update existing bricks positions in collision/draw loops, but here we set constants.
    }

    resetGame() {
        if (!this.canvas) return;
        this.recalcLayout();
        this.createBricks();

        this.x = this.canvas.width / 2;
        this.y = this.canvas.height - 40;
        this.dx = 400 * (Math.random() > 0.5 ? 1 : -1);
        this.dy = -400; // Start moving up
        this.paddleX = (this.canvas.width - this.paddleWidth) / 2;
        this.score = 0;

        this.shakeTimer = 0;
        this.flashTimer = 0;
    }

    createBricks() {
        this.bricks = [];
        const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#00FF00', '#FF0000', '#FFA500'];

        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                // Determine if brick is active or special
                this.bricks[c][r] = {
                    x: 0,
                    y: 0,
                    status: 1,
                    color: colors[r % colors.length]
                };
            }
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        if(relativeX > 0 && relativeX < this.canvas.width) {
            this.paddleX = relativeX - this.paddleWidth / 2;
        }
    }

    onTouchMove(e) {
        e.preventDefault(); // Prevent scrolling
        const rect = this.canvas.getBoundingClientRect();
        const relativeX = e.touches[0].clientX - rect.left;
        if(relativeX > 0 && relativeX < this.canvas.width) {
            this.paddleX = relativeX - this.paddleWidth / 2;
        }
    }

    update(dt) {
        if (!this.ctx) return;

        // Clamp paddle
        if (this.paddleX < 0) this.paddleX = 0;
        if (this.paddleX + this.paddleWidth > this.canvas.width) this.paddleX = this.canvas.width - this.paddleWidth;

        // Keyboard Override
        const paddleSpeed = 800;
        if (this.inputManager.isKeyDown("ArrowRight")) {
            this.paddleX += paddleSpeed * dt;
        } else if (this.inputManager.isKeyDown("ArrowLeft")) {
            this.paddleX -= paddleSpeed * dt;
        }

        // Ball Movement
        let nextX = this.x + this.dx * dt;
        let nextY = this.y + this.dy * dt;

        // Wall Collision (X)
        if (nextX + this.ballRadius > this.canvas.width || nextX - this.ballRadius < 0) {
            this.dx = -this.dx;
            this.soundManager.playSound('click');
            this.triggerShake(0.1, 5);
            nextX = this.x + this.dx * dt; // Recalc pos
        }

        // Wall Collision (Y)
        if (nextY - this.ballRadius < 0) {
            this.dy = -this.dy;
            this.soundManager.playSound('click');
            this.triggerShake(0.1, 5);
            nextY = this.y + this.dy * dt;
        } else if (nextY + this.ballRadius > this.canvas.height) {
            // Paddle Check (Simple AABB first, then Circle logic if we wanted to be fancy)
            // But we need to check if we hit the paddle NOW, not just at bottom.
            // Actually, we check collision with paddle below. If we miss paddle and hit bottom:

            this.soundManager.playSound('explosion');
            this.triggerShake(0.5, 15);
            this.particleSystem.emit(this.ctx, this.x, this.y, '#FF0000', 50, { life: 1.0, size: 5 });

            // Game Over
            if (window.miniGameHub) {
                window.miniGameHub.showGameOver(this.score, () => this.resetGame());
            } else {
                this.resetGame();
            }
            return; // Stop update for this frame
        }

        // Paddle Collision (Circle vs Rectangle)
        // Find closest point on paddle to circle center
        const closestX = Math.max(this.paddleX, Math.min(nextX, this.paddleX + this.paddleWidth));
        const closestY = Math.max(this.canvas.height - this.paddleHeight, Math.min(nextY, this.canvas.height));

        const distanceX = nextX - closestX;
        const distanceY = nextY - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        if (distanceSquared < (this.ballRadius * this.ballRadius)) {
            // Hit paddle!
            this.dy = -Math.abs(this.dy); // Ensure it goes up

            // Add some "English" based on where it hit
            const hitPoint = nextX - (this.paddleX + this.paddleWidth/2);
            this.dx = hitPoint * 10; // Influence X speed

            // Speed up slightly
            const speed = Math.sqrt(this.dx*this.dx + this.dy*this.dy);
            const newSpeed = Math.min(speed * 1.05, 1000); // Cap speed

            // Normalize and apply new speed
            this.dx = (this.dx / speed) * newSpeed;
            this.dy = (this.dy / speed) * newSpeed;

            this.soundManager.playSound('click'); // Paddle sound
            this.triggerShake(0.1, 5);
            this.particleSystem.emit(this.ctx, closestX, closestY, '#00FF00', 10, { life: 0.3, size: 3 });
        }

        this.x = nextX;
        this.y = nextY;

        // Trail
        this.trailTimer -= dt;
        if(this.trailTimer <= 0) {
            this.particleSystem.emit(this.ctx, this.x, this.y, '#FFFFFF', 1, { life: 0.2, size: 3, velocity: {x: 0, y: 0} });
            this.trailTimer = this.trailInterval;
        }

        this.collisionDetection();
        this.particleSystem.update(dt);

        if (this.shakeTimer > 0) this.shakeTimer -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;
    }

    triggerShake(duration, magnitude) {
        this.shakeTimer = Math.max(this.shakeTimer, duration);
        this.particleSystem.setShake(magnitude);
    }

    triggerFlash(duration) {
        this.flashTimer = Math.max(this.flashTimer, duration);
    }

    collisionDetection() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (!this.bricks[c]) continue; // Safety
                let b = this.bricks[c][r];
                if (b && b.status === 1) {
                    const brickX = (c * (this.brickWidth + this.brickPadding)) + this.brickOffsetLeft;
                    const brickY = (r * (this.brickHeight + this.brickPadding)) + this.brickOffsetTop;
                    b.x = brickX;
                    b.y = brickY;

                    // Circle vs AABB Collision for Bricks
                    const closestX = Math.max(brickX, Math.min(this.x, brickX + this.brickWidth));
                    const closestY = Math.max(brickY, Math.min(this.y, brickY + this.brickHeight));

                    const distanceX = this.x - closestX;
                    const distanceY = this.y - closestY;
                    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

                    if (distanceSquared < (this.ballRadius * this.ballRadius)) {
                        this.dy = -this.dy;
                        b.status = 0;
                        this.score += 10;
                        this.soundManager.playSound('score');
                        this.particleSystem.emit(this.ctx, closestX, closestY, b.color, 15, { life: 0.5, size: 4 });
                        this.triggerShake(0.1, 3);

                        // Check Win
                        let activeBricks = 0;
                        this.bricks.forEach(col => col.forEach(br => { if(br.status === 1) activeBricks++; }));
                        if (activeBricks === 0) {
                            this.soundManager.playSound('score'); // Victory sound?
                             if (window.miniGameHub) {
                                window.miniGameHub.showGameOver(this.score, () => this.resetGame()); // "Win" screen same as game over for now
                            }
                        }
                    }
                }
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        if (this.shakeTimer > 0) {
            const shake = this.particleSystem.getShake();
            this.ctx.translate(shake.x, shake.y);
        }

        this.drawBricks();
        this.drawBall();
        this.drawPaddle();
        this.particleSystem.draw(this.ctx);

        this.ctx.restore();

        // Draw Score
        this.ctx.font = "16px 'Press Start 2P'";
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fillText("Score: " + this.score, 8, 25);

        if(this.flashTimer > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashTimer * 3})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawBall() {
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fill();
        this.ctx.closePath();
        this.ctx.shadowBlur = 0;
    }

    drawPaddle() {
        this.ctx.shadowColor = '#00ff00';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = "#00FF00";
        this.ctx.fillRect(this.paddleX, this.canvas.height - this.paddleHeight, this.paddleWidth, this.paddleHeight);
        this.ctx.shadowBlur = 0;
    }

    drawBricks() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status === 1) {
                    let b = this.bricks[c][r];
                    this.ctx.shadowColor = b.color;
                    this.ctx.shadowBlur = 10;
                    this.ctx.fillStyle = b.color;
                    this.ctx.fillRect(b.x, b.y, this.brickWidth, this.brickHeight);
                    this.ctx.shadowBlur = 0;
                }
            }
        }
    }
}
