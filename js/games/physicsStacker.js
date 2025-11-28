import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';

// Simple Physics Engine (AABB based for stacking)
class PhysicsEngine {
    constructor() {
        this.bodies = [];
        this.gravity = 500;
    }

    addBody(body) {
        this.bodies.push(body);
    }

    update(dt) {
        this.bodies.forEach(b => {
            if (b.static) return;

            b.vy += this.gravity * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            // Simple floor collision
            if (b.y + b.height > 600) { // 600 is floor
                b.y = 600 - b.height;
                b.vy = 0;
                b.vx *= 0.8; // friction
                b.resting = true;
            }

            // Body vs Body (AABB)
            this.bodies.forEach(other => {
                if (b === other) return;

                if (this.aabb(b, other)) {
                    this.resolveCollision(b, other);
                }
            });
        });
    }

    aabb(a, b) {
        return (a.x < b.x + b.width &&
                a.x + a.width > b.x &&
                a.y < b.y + b.height &&
                a.y + a.height > b.y);
    }

    resolveCollision(a, b) {
        // Very simple resolution: push out closest axis
        // Assume 'a' is moving and 'b' is resting/static mostly

        // Find overlap
        const ox = (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
        const oy = (Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

        if (ox < oy) {
            // Horizontal collision
            if (a.x < b.x) a.x -= ox; else a.x += ox;
            a.vx *= -0.5;
        } else {
            // Vertical collision
            if (a.y < b.y) { // a on top
                a.y -= oy;
                a.vy = 0;
                a.resting = true;
                // Friction
                a.vx *= 0.9;
            } else { // a below
                a.y += oy;
                a.vy = 0;
            }
        }
    }
}

export default class PhysicsStackerGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.physics = new PhysicsEngine();
        this.crane = { x: 300, y: 50, angle: 0, speed: 1 };
        this.currentBlock = null;
        this.score = 0; // Max height
        this.blocks = [];

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
    }

    init(container) {
        container.innerHTML = `
            <h2>🏗️ Physics Stacker</h2>
            <canvas id="stackerCanvas" width="600" height="600"></canvas>
            <div id="stacker-ui" style="color: white; font-family: monospace;">
                Max Height: <span id="stacker-score">0</span>
            </div>
            <p style="color:#aaa; font-size:0.8rem">SPACE to drop block.</p>
            <button class="back-btn">Back</button>
        `;

        this.canvas = document.getElementById("stackerCanvas");
        this.ctx = this.canvas.getContext("2d");

        container.querySelector('.back-btn').addEventListener('click', () => {
             window.miniGameHub.goBack();
        });

        this.spawnBlock();
    }

    spawnBlock() {
        this.currentBlock = {
            x: this.crane.x,
            y: this.crane.y + 20,
            width: 50,
            height: 50,
            vx: 0,
            vy: 0,
            color: `hsl(${Math.random()*360}, 70%, 50%)`,
            attached: true
        };
    }

    dropBlock() {
        if (this.currentBlock && this.currentBlock.attached) {
            this.currentBlock.attached = false;
            this.currentBlock.vx = (Math.random() - 0.5) * 10; // Slight random drift
            this.physics.addBody(this.currentBlock);
            this.blocks.push(this.currentBlock);
            this.currentBlock = null;
            this.soundManager.playSound('jump'); // drop sound

            setTimeout(() => this.spawnBlock(), 1000);
        }
    }

    shutdown() {}

    update(dt) {
        // Crane Movement
        this.crane.angle += dt * this.crane.speed;
        this.crane.x = 300 + Math.sin(this.crane.angle) * 200;

        // Input
        if (this.inputManager.isKeyDown("Space")) {
            // Simple debounce? Or rely on null check
            this.dropBlock();
        }

        // Update Attached Block
        if (this.currentBlock && this.currentBlock.attached) {
            this.currentBlock.x = this.crane.x - this.currentBlock.width/2;
            this.currentBlock.y = this.crane.y + 40;
        }

        this.physics.update(dt);

        // Calculate Score (Height of highest resting block)
        let highest = 600;
        this.blocks.forEach(b => {
            if (b.resting && b.y < highest) highest = b.y;
        });
        this.score = Math.floor(600 - highest);

        const ui = document.getElementById("stacker-score");
        if(ui) ui.textContent = this.score;
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Crane Rail
        this.ctx.strokeStyle = "#555";
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(100, 50);
        this.ctx.lineTo(500, 50);
        this.ctx.stroke();

        // Crane
        this.ctx.fillStyle = "#aaa";
        this.ctx.fillRect(this.crane.x - 10, 40, 20, 20);
        this.ctx.beginPath();
        this.ctx.moveTo(this.crane.x, 60);
        this.ctx.lineTo(this.crane.x, this.currentBlock && this.currentBlock.attached ? this.currentBlock.y : 80);
        this.ctx.stroke();

        // Blocks
        this.blocks.forEach(b => {
            this.ctx.fillStyle = b.color;
            this.ctx.fillRect(b.x, b.y, b.width, b.height);
            this.ctx.strokeStyle = "white";
            this.ctx.strokeRect(b.x, b.y, b.width, b.height);
        });

        // Current Attached Block
        if (this.currentBlock && this.currentBlock.attached) {
            const b = this.currentBlock;
            this.ctx.fillStyle = b.color;
            this.ctx.fillRect(b.x, b.y, b.width, b.height);
        }
    }
}
