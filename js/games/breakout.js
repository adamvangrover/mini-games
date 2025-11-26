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
        this.brickRowCount = 3;
        this.brickColumnCount = 5;
        this.brickWidth = 75;
        this.brickHeight = 20;
        this.brickPadding = 10;
        this.brickOffsetTop = 30;
        this.brickOffsetLeft = 30;
        this.bricks = [];
        this.score = 0;
        this.shakeTimer = 0;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
    }

    init(container) {
        this.canvas = document.getElementById("breakoutCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.resetGame();
    }

    shutdown() { }

    resetGame() {
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height - 30;
        this.dx = 200; // pixels per second
        this.dy = -200;
        this.paddleX = (this.canvas.width - this.paddleWidth) / 2;
        this.score = 0;
        this.createBricks();
        this.shakeTimer = 0;
    }

    createBricks() {
        this.bricks = [];
        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                this.bricks[c][r] = { x: 0, y: 0, status: 1 };
            }
        }
    }

    update(dt) {
        // Paddle Movement
        if (this.inputManager.isKeyDown("ArrowRight") && this.paddleX < this.canvas.width - this.paddleWidth) {
            this.paddleX += 300 * dt;
        } else if (this.inputManager.isKeyDown("ArrowLeft") && this.paddleX > 0) {
            this.paddleX -= 300 * dt;
        }

        // Ball Movement
        this.x += this.dx * dt;
        this.y += this.dy * dt;

        // Wall Collision
        if (this.x + this.ballRadius > this.canvas.width || this.x - this.ballRadius < 0) {
            this.dx = -this.dx;
            this.soundManager.playSound('click');
        }
        if (this.y - this.ballRadius < 0) {
            this.dy = -this.dy;
            this.soundManager.playSound('click');
        } else if (this.y + this.ballRadius > this.canvas.height) {
            if (this.x > this.paddleX && this.x < this.paddleX + this.paddleWidth) {
                this.dy = -this.dy;
                this.soundManager.playSound('click');
                this.particleSystem.emit(this.ctx, this.x, this.y, '#00ff00', 5);
            } else {
                // Game Over
                this.soundManager.playSound('explosion');
                this.shakeTimer = 0.5;
                this.resetGame();
            }
        }

        this.collisionDetection();
        this.particleSystem.update(dt);
        if (this.shakeTimer > 0) this.shakeTimer -= dt;
    }

    collisionDetection() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                let b = this.bricks[c][r];
                if (b.status == 1) {
                    if (this.x > b.x && this.x < b.x + this.brickWidth && this.y > b.y && this.y < b.y + this.brickHeight) {
                        this.dy = -this.dy;
                        b.status = 0;
                        this.score++;
                        this.soundManager.playSound('score');
                        this.particleSystem.emit(this.ctx, b.x + this.brickWidth/2, b.y + this.brickHeight/2, '#ff00ff', 8);

                        if (this.score == this.brickRowCount * this.brickColumnCount) {
                            // Win
                            this.soundManager.playSound('score'); // victory sound
                            this.resetGame();
                        }
                    }
                }
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        if (this.shakeTimer > 0) {
            const shake = this.particleSystem.getShake(10);
            this.ctx.translate(shake.x, shake.y);
        }

        this.drawBricks();
        this.drawBall();
        this.drawPaddle();
        this.particleSystem.draw(this.ctx);

        this.ctx.restore();
    }

    drawBall() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = "#00ffff";
        this.ctx.fill();
        this.ctx.closePath();
    }

    drawPaddle() {
        this.ctx.beginPath();
        this.ctx.rect(this.paddleX, this.canvas.height - this.paddleHeight, this.paddleWidth, this.paddleHeight);
        this.ctx.fillStyle = "#00ff00";
        this.ctx.fill();
        this.ctx.closePath();
    }

    drawBricks() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status == 1) {
                    let brickX = (c * (this.brickWidth + this.brickPadding)) + this.brickOffsetLeft;
                    let brickY = (r * (this.brickHeight + this.brickPadding)) + this.brickOffsetTop;
                    this.bricks[c][r].x = brickX;
                    this.bricks[c][r].y = brickY;
                    this.ctx.beginPath();
                    this.ctx.rect(brickX, brickY, this.brickWidth, this.brickHeight);
                    this.ctx.fillStyle = "#ff00ff";
                    this.ctx.fill();
                    this.ctx.closePath();
                }
            }
        }
    }
}
