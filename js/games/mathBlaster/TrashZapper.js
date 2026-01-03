import ParticleSystem from '../../core/ParticleSystem.js';

export default class TrashZapper {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        this.mathEngine = game.mathEngine;
        this.input = game.input;

        this.ship = { x: 50, y: 0, width: 40, height: 30, speed: 300, color: '#0ff' };
        this.bullets = [];
        this.trashItems = [];

        this.spawnTimer = 0;
        this.currentProblem = null;

        this.score = 0;
        this.energy = 100;
        this.fuel = 0;
        this.maxFuel = 10;

        this.particles = ParticleSystem.getInstance();
        this.isActive = false;

        // Initial ship position
        this.ship.y = this.canvas.height / 2;
    }

    init() {
        this.isActive = true;
        this.fuel = 0;
        this.energy = 100;
        this.bullets = [];
        this.trashItems = [];
        this.getNewProblem();
    }

    getNewProblem() {
        this.currentProblem = this.mathEngine.generateProblem();
        // Don't clear trash immediately, let it fly off screen or persist to add chaos
    }

    update(dt) {
        if (!this.isActive) return;

        // Ship Movement
        if (this.input.keys['ArrowUp']) this.ship.y -= this.ship.speed * dt;
        if (this.input.keys['ArrowDown']) this.ship.y += this.ship.speed * dt;

        // Mouse/Touch follow (vertical only)
        if (this.input.mouse.down) {
             const targetY = this.input.mouse.y;
             const diff = targetY - (this.ship.y + this.ship.height/2);
             if (Math.abs(diff) > 5) {
                 this.ship.y += Math.sign(diff) * this.ship.speed * dt * 1.5;
             }
        }

        // Clamp Ship
        if (this.ship.y < 80) this.ship.y = 80; // Below HUD
        if (this.ship.y > this.canvas.height - 40) this.ship.y = this.canvas.height - 40;

        // Shooting
        if (this.input.keys['Space'] && !this.input.lastKeys['Space']) {
            this.shoot();
        }
        // Auto shoot on touch
        this.autoShootTimer = (this.autoShootTimer || 0) + dt;
        if (this.input.mouse.down && this.autoShootTimer > 0.3) {
            this.shoot();
            this.autoShootTimer = 0;
        }

        // Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += 800 * dt;
            if (b.x > this.canvas.width) this.bullets.splice(i, 1);
        }

        // Spawn Trash
        this.spawnTimer += dt;
        if (this.spawnTimer > 1.5) {
            this.spawnTrash();
            this.spawnTimer = 0;
        }

        // Update Trash
        for (let i = this.trashItems.length - 1; i >= 0; i--) {
            const t = this.trashItems[i];
            t.x -= (100 + (this.mathEngine.level * 10)) * dt;
            t.rotation += dt;

            // Check Collision with Ship
            if (this.checkRectCollision(this.ship, t)) {
                this.energy -= 10;
                this.particles.emit(this.ship.x, this.ship.y, '#f00', 10);
                window.miniGameHub.soundManager.playSound('hit');
                this.trashItems.splice(i, 1);
                // Shake screen effect
                continue;
            }

            // Check Collision with Bullets
            let hit = false;
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                if (this.checkRectCollision(b, t)) {
                    this.handleTrashHit(t);
                    this.bullets.splice(j, 1);
                    this.trashItems.splice(i, 1);
                    hit = true;
                    break;
                }
            }
            if (hit) continue;

            if (t.x < -100) this.trashItems.splice(i, 1);
        }

        // Win/Loss Checks
        if (this.fuel >= this.maxFuel) {
            this.game.nextLevel();
        }
        if (this.energy <= 0) {
            this.game.gameOver();
        }

        // Ship Engine Particle Trail
        if (Math.random() < 0.5) {
             this.particles.emit(this.ship.x, this.ship.y + this.ship.height/2, '#0ff', 1);
        }
    }

    spawnTrash() {
        const isCorrect = Math.random() < 0.4;
        let value;
        if (isCorrect) {
            value = this.currentProblem.answer;
        } else {
            // Pick a random distractor from options or generate new fake
            const opts = this.currentProblem.options.filter(o => o !== this.currentProblem.answer);
            value = opts.length ? opts[Math.floor(Math.random() * opts.length)] : this.currentProblem.answer + 1;
        }

        const size = 40 + Math.random() * 20;
        this.trashItems.push({
            x: this.canvas.width + 50,
            y: Math.random() * (this.canvas.height - 150) + 80,
            width: size,
            height: size,
            value: value,
            isAnswer: value === this.currentProblem.answer,
            rotation: Math.random() * Math.PI,
            color: '#888',
            shape: Math.random() > 0.5 ? 'rect' : 'poly'
        });
    }

    shoot() {
        this.bullets.push({
            x: this.ship.x + this.ship.width,
            y: this.ship.y + this.ship.height / 2 - 2,
            width: 15,
            height: 4,
            color: '#ff0'
        });
        window.miniGameHub.soundManager.playSound('shoot');
    }

    handleTrashHit(trash) {
        if (trash.isAnswer) {
            this.fuel++;
            this.score += 100;
            this.particles.emit(trash.x, trash.y, '#0f0', 20);
            window.miniGameHub.soundManager.playSound('powerup');

            const res = this.mathEngine.checkAnswer(trash.value, this.currentProblem.answer);
            if (res.levelUp) {
                window.miniGameHub.soundManager.playSound('levelup');
                window.miniGameHub.showToast("LEVEL UP!");
            }
            this.getNewProblem();
        } else {
            this.energy -= 10;
            this.particles.emit(trash.x, trash.y, '#f00', 20);
            window.miniGameHub.soundManager.playSound('explosion');
            this.mathEngine.consecutiveCorrect = 0;
        }
    }

    checkRectCollision(r1, r2) {
        return (r1.x < r2.x + r2.width &&
                r1.x + r1.width > r2.x &&
                r1.y < r2.y + r2.height &&
                r1.y + r1.height > r2.y);
    }

    draw() {
        const ctx = this.ctx;

        // Note: Background is cleared by main game loop

        // HUD Bar
        ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
        ctx.fillRect(0, 0, this.canvas.width, 70);
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 70);
        ctx.lineTo(this.canvas.width, 70);
        ctx.stroke();

        // Fuel Gauge
        ctx.fillStyle = '#333';
        ctx.fillRect(20, 20, 200, 20);
        ctx.fillStyle = '#0f0';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#0f0';
        ctx.fillRect(20, 20, (this.fuel / this.maxFuel) * 200, 20);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillText(`FUEL`, 230, 36);

        // Energy
        ctx.fillStyle = '#333';
        ctx.fillRect(this.canvas.width - 250, 20, 200, 20);
        ctx.fillStyle = this.energy > 30 ? '#0ff' : '#f00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.energy > 30 ? '#0ff' : '#f00';
        ctx.fillRect(this.canvas.width - 250, 20, (this.energy / 100) * 200, 20);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.fillText(`SHIELD`, this.canvas.width - 310, 36);

        // Target Problem
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px "Courier New", monospace';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff';
        if (this.currentProblem) {
            ctx.fillText(`${this.currentProblem.question} = ?`, this.canvas.width / 2, 45);
        }
        ctx.shadowBlur = 0;

        // Ship
        ctx.save();
        ctx.translate(this.ship.x, this.ship.y);
        ctx.fillStyle = this.ship.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0ff';
        // Simple Fighter Shape
        ctx.beginPath();
        ctx.moveTo(40, 15);
        ctx.lineTo(0, 30);
        ctx.lineTo(10, 15);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(20, 15, 5, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();

        // Bullets
        ctx.fillStyle = '#ff0';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0';
        this.bullets.forEach(b => {
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });
        ctx.shadowBlur = 0;

        // Trash
        this.trashItems.forEach(t => {
            ctx.save();
            ctx.translate(t.x + t.width/2, t.y + t.height/2);
            ctx.rotate(t.rotation);

            ctx.fillStyle = '#666';
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 2;

            if (t.shape === 'rect') {
                ctx.fillRect(-t.width/2, -t.height/2, t.width, t.height);
                ctx.strokeRect(-t.width/2, -t.height/2, t.width, t.height);
            } else {
                ctx.beginPath();
                ctx.moveTo(-t.width/2, -t.height/3);
                ctx.lineTo(t.width/2, -t.height/2);
                ctx.lineTo(t.width/3, t.height/2);
                ctx.lineTo(-t.width/2, t.height/3);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            // Label
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#000';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(t.value, 0, 0);
            ctx.shadowBlur = 0;

            ctx.restore();
        });
    }

    resize() {
        // Handle resize if needed
    }
}
