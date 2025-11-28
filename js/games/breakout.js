import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class BreakoutGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.ballRadius = 10;
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.paddleHeight = 10;
        this.paddleWidth = 75;
        this.paddleX = 0;
        this.brickRowCount = 5; // More bricks
        this.brickColumnCount = 7;
        this.brickWidth = 75;
        this.brickHeight = 20;
        this.brickPadding = 10;
        this.brickOffsetTop = 30;
        this.brickOffsetLeft = 30;
        this.bricks = [];
        this.score = 0;

        // Juice properties
        this.shakeTimer = 0;
        this.flashTimer = 0;
        this.trailTimer = 0;
        this.trailInterval = 0.02; // Emit trail particle every 0.02s

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
    }

    init(container) {
        this.canvas = document.getElementById("breakoutCanvas");
        if (!this.canvas) {
            console.error("breakoutCanvas not found!");
            return;
        }
        this.ctx = this.canvas.getContext("2d");
        this.resetGame();
    }

    shutdown() {
        // Cleanup if needed
    }

    resetGame() {
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height - 30;
        this.dx = 300; // pixels per second
        this.dy = -300;
        this.paddleX = (this.canvas.width - this.paddleWidth) / 2;
        this.score = 0;
        this.createBricks();
        this.shakeTimer = 0;
        this.flashTimer = 0;
    }

    createBricks() {
        this.bricks = [];
        const colors = ['#FF33FF', '#33FFFF', '#FFFF33', '#33FF33', '#FF3333'];
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                this.bricks[c][r] = { x: 0, y: 0, status: 1, color: colors[r % colors.length] };
            }
        }
    }

    update(dt) {
        if (!this.ctx) return;

        // Paddle Movement
        const paddleSpeed = 500;
        if (this.inputManager.isKeyDown("ArrowRight") && this.paddleX < this.canvas.width - this.paddleWidth) {
            this.paddleX += paddleSpeed * dt;
        } else if (this.inputManager.isKeyDown("ArrowLeft") && this.paddleX > 0) {
            this.paddleX -= paddleSpeed * dt;
        }

        // Ball Movement
        this.x += this.dx * dt;
        this.y += this.dy * dt;

        // Ball Trail
        this.trailTimer -= dt;
        if(this.trailTimer <= 0) {
            this.particleSystem.emit(this.ctx, this.x, this.y, '#FFFFFF', 1, { life: 0.3, size: 3, velocity: {x: 0, y: 0} });
            this.trailTimer = this.trailInterval;
        }

        // Wall Collision
        if (this.x + this.ballRadius > this.canvas.width || this.x - this.ballRadius < 0) {
            this.dx = -this.dx;
            this.soundManager.playSound('click');
            this.triggerShake(0.1, 5);
            this.triggerFlash(0.1);
        }
        if (this.y - this.ballRadius < 0) {
            this.dy = -this.dy;
            this.soundManager.playSound('click');
            this.triggerShake(0.1, 5);
            this.triggerFlash(0.1);
        } else if (this.y + this.ballRadius > this.canvas.height) {
            if (this.x > this.paddleX && this.x < this.paddleX + this.paddleWidth) {
                this.dy = -this.dy * 1.05; // Speed up on paddle hit
                this.dx *= 1.05;
                this.soundManager.playSound('click');
                this.particleSystem.emit(this.ctx, this.x, this.y, '#00ff00', 15, { life: 0.5, size: 4 });
                this.triggerShake(0.2, 8);
                this.triggerFlash(0.15);
            } else {
                // Game Over
                this.soundManager.playSound('explosion');
                this.triggerShake(0.5, 15);
                this.particleSystem.emit(this.ctx, this.canvas.width/2, this.canvas.height/2, '#FF0000', 100, { life: 1.5, size: 6 });
                this.resetGame();
            }
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
                let b = this.bricks[c][r];
                if (b.status == 1) {
                    const brickX = (c * (this.brickWidth + this.brickPadding)) + this.brickOffsetLeft;
                    const brickY = (r * (this.brickHeight + this.brickPadding)) + this.brickOffsetTop;
                    b.x = brickX;
                    b.y = brickY;

                    if (this.x > b.x && this.x < b.x + this.brickWidth && this.y > b.y && this.y < b.y + this.brickHeight) {
                        this.dy = -this.dy;
                        b.status = 0;
                        this.score++;
                        this.soundManager.playSound('score');
                        this.particleSystem.emit(this.ctx, b.x + this.brickWidth/2, b.y + this.brickHeight/2, b.color, 25, { life: 0.8, size: 5 });
                        this.triggerShake(0.15, 7);
                        this.triggerFlash(0.1);

                        if (this.score == this.brickRowCount * this.brickColumnCount) {
                            this.soundManager.playSound('score'); // victory sound
                            this.particleSystem.emit(this.ctx, this.canvas.width/2, this.canvas.height/2, '#FFFF00', 200, { life: 2, size: 8 });
                            this.resetGame();
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

        // Draw flash effect
        if(this.flashTimer > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashTimer * 2})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawBall() {
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fill();
        this.ctx.closePath();
        this.ctx.shadowBlur = 0;
    }

    drawPaddle() {
        this.ctx.shadowColor = '#00ff00';
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.rect(this.paddleX, this.canvas.height - this.paddleHeight, this.paddleWidth, this.paddleHeight);
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fill();
        this.ctx.closePath();
        this.ctx.shadowBlur = 0;
    }

    drawBricks() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status == 1) {
                    let b = this.bricks[c][r];
                    this.ctx.shadowColor = b.color;
                    this.ctx.shadowBlur = 15;
                    this.ctx.beginPath();
                    this.ctx.rect(b.x, b.y, this.brickWidth, this.brickHeight);
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.fill();
                    this.ctx.closePath();
                }
            }
        }
        this.ctx.shadowBlur = 0;
    }
}
