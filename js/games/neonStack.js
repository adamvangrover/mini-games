import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonStack {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;

        this.blocks = [];
        this.currentBlock = null;
        this.blockHeight = 50; // Taller blocks
        this.baseWidth = 200;
        this.startSpeed = 250;

        this.score = 0;
        this.isActive = false;
        this.gameOver = false;
        this.cameraY = 0;
        this.hue = 0;

        this.resizeHandler = this.resize.bind(this);
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', this.resizeHandler);

        this.resetGame();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    resetGame() {
        this.blocks = [];
        this.score = 0;
        this.isActive = true;
        this.gameOver = false;
        this.cameraY = 0;
        this.hue = 200; // Start Blue

        // Base Block
        this.blocks.push({
            x: (this.width - this.baseWidth) / 2,
            y: this.height - 150,
            width: this.baseWidth,
            height: this.blockHeight,
            hue: this.hue
        });

        this.spawnNextBlock();
    }

    spawnNextBlock() {
        const prevBlock = this.blocks[this.blocks.length - 1];
        this.hue = (this.hue + 15) % 360;

        this.currentBlock = {
            x: -prevBlock.width,
            y: prevBlock.y - this.blockHeight,
            width: prevBlock.width,
            height: this.blockHeight,
            hue: this.hue,
            speed: this.startSpeed + (this.score * 15),
            direction: 1
        };

        if (Math.random() > 0.5) {
            this.currentBlock.x = this.width;
            this.currentBlock.direction = -1;
        }
    }

    update(dt) {
        if (!this.isActive || this.gameOver) return;

        const mouse = this.inputManager.getMouse();
        const space = this.inputManager.isKeyDown('Space');

        if ((mouse.down || space) && !this.wasInputActive) {
            this.placeBlock();
            this.wasInputActive = true;
        } else if (!mouse.down && !space) {
            this.wasInputActive = false;
        }

        if (this.currentBlock) {
            this.currentBlock.x += this.currentBlock.speed * this.currentBlock.direction * dt;

            const limit = 50;
            if (this.currentBlock.x < -this.currentBlock.width - limit) {
                this.currentBlock.direction = 1;
            } else if (this.currentBlock.x > this.width + limit) {
                this.currentBlock.direction = -1;
            }
        }

        const topBlockY = this.blocks[this.blocks.length - 1].y;
        const desiredY = this.height - 350;

        if (topBlockY < desiredY) {
            this.cameraY += (desiredY - topBlockY) * 5 * dt;
        }
    }

    placeBlock() {
        if (!this.currentBlock) return;

        const prev = this.blocks[this.blocks.length - 1];
        const curr = this.currentBlock;

        const dist = curr.x - prev.x;
        const overlap = curr.width - Math.abs(dist);

        if (overlap > 0) {
            this.soundManager.playSound('score');
            this.score++;

            const placedBlock = {
                x: dist > 0 ? curr.x : prev.x,
                y: curr.y,
                width: overlap,
                height: curr.height,
                hue: curr.hue
            };

            if (dist > 0) {
                placedBlock.x = curr.x;
            } else {
                placedBlock.x = prev.x;
            }

            this.blocks.push(placedBlock);

            const fallWidth = Math.abs(dist);
            if (fallWidth > 0) {
                 const fallX = dist > 0 ? (curr.x + overlap) : (curr.x);
                 this.spawnFallingPiece(fallX, curr.y, fallWidth, curr.height, curr.hue);
            }

            if (Math.abs(dist) < 5) {
                 placedBlock.x = prev.x;
                 placedBlock.width = prev.width;
                 this.particleSystem.emit(placedBlock.x + placedBlock.width/2, placedBlock.y, '#ffffff', 30);
                 this.soundManager.playSound('powerup');
            }

            this.spawnNextBlock();

        } else {
            this.spawnFallingPiece(curr.x, curr.y, curr.width, curr.height, curr.hue);
            this.triggerGameOver();
        }
    }

    spawnFallingPiece(x, y, w, h, hue) {
        this.particleSystem.emit(x + w/2, y + h/2, `hsl(${hue}, 100%, 50%)`, 15);
    }

    triggerGameOver() {
        this.isActive = false;
        this.gameOver = true;
        this.soundManager.playSound('explosion');
        this.particleSystem.shake.intensity = 15;
        this.particleSystem.shake.duration = 0.5;
        window.miniGameHub.showGameOver(this.score, () => this.resetGame());
    }

    drawBlock(b, isCurrent = false) {
        // Main Face
        this.ctx.fillStyle = `hsl(${b.hue}, 80%, 60%)`;
        this.ctx.fillRect(b.x, b.y, b.width, b.height);

        // Highlights (Glass edge)
        this.ctx.strokeStyle = `hsl(${b.hue}, 100%, 80%)`;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.x, b.y, b.width, b.height);

        // 3D Top
        this.ctx.fillStyle = `hsl(${b.hue}, 80%, 75%)`;
        this.ctx.beginPath();
        this.ctx.moveTo(b.x, b.y);
        this.ctx.lineTo(b.x + 20, b.y - 20);
        this.ctx.lineTo(b.x + b.width + 20, b.y - 20);
        this.ctx.lineTo(b.x + b.width, b.y);
        this.ctx.fill();

        // 3D Side (Right)
        this.ctx.fillStyle = `hsl(${b.hue}, 80%, 40%)`;
        this.ctx.beginPath();
        this.ctx.moveTo(b.x + b.width, b.y);
        this.ctx.lineTo(b.x + b.width + 20, b.y - 20);
        this.ctx.lineTo(b.x + b.width + 20, b.y + b.height - 20);
        this.ctx.lineTo(b.x + b.width, b.y + b.height);
        this.ctx.fill();

        // Windows?
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        const winSize = 8;
        const gap = 12;
        for (let wx = b.x + 5; wx < b.x + b.width - 5; wx += gap) {
            for (let wy = b.y + 5; wy < b.y + b.height - 5; wy += gap) {
                if (wx + winSize < b.x + b.width) {
                    this.ctx.fillRect(wx, wy, winSize, winSize);
                }
            }
        }
    }

    draw() {
        // City Gradient Background
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#020617');
        grad.addColorStop(1, '#1e1b4b');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Stars
        this.ctx.fillStyle = '#fff';
        for(let i=0; i<50; i++) {
             // Simple procedural stars
             const sx = (Math.sin(i * 123) * 0.5 + 0.5) * this.width;
             const sy = (Math.cos(i * 321) * 0.5 + 0.5) * this.height;
             this.ctx.fillRect(sx, sy, 2, 2);
        }

        this.ctx.save();
        this.ctx.translate(0, this.cameraY);

        // Draw Stack
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.blocks.forEach(b => this.drawBlock(b));

        // Draw Current Block
        if (this.currentBlock) {
            this.drawBlock(this.currentBlock, true);
        }

        this.ctx.restore();

        this.particleSystem.updateAndDraw(this.ctx, 0.016);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 60px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#0ff';
        this.ctx.fillText(this.score, this.width / 2, 100);
    }

    shutdown() {
        window.removeEventListener('resize', this.resizeHandler);
        if (this.canvas) this.canvas.remove();
    }
}
