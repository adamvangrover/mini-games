import ParticleSystem from '../../core/ParticleSystem.js';

export default class TrashZapper {
    constructor(game) {
        this.game = game; // Reference to main MathBlasterGame instance
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        this.mathEngine = game.mathEngine;
        this.input = game.input;

        this.ship = { x: 50, y: this.canvas.height / 2, width: 40, height: 30, speed: 300, color: '#0ff' };
        this.bullets = [];
        this.trashItems = [];
        this.missiles = [];

        this.spawnTimer = 0;
        this.missileTimer = 0;
        this.currentProblem = null;

        this.score = 0;
        this.energy = 100;
        this.fuel = 0;
        this.maxFuel = 15;

        this.particles = ParticleSystem.getInstance();
        this.isActive = false;

        this.stars = [];
        for(let i=0; i<50; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2,
                speed: Math.random() * 2 + 0.5
            });
        }
    }

    init() {
        this.isActive = true;
        this.fuel = 0;
        this.energy = 100;
        this.getNewProblem();
    }

    getNewProblem() {
        this.currentProblem = this.mathEngine.generateProblem();
        this.trashItems = []; // Clear old trash
    }

    update(dt) {
        if (!this.isActive) return;

        // Background Stars
        this.stars.forEach(star => {
            star.x -= star.speed;
            if (star.x < 0) star.x = this.canvas.width;
        });

        // Ship Movement
        if (this.input.keys['ArrowUp']) this.ship.y -= this.ship.speed * dt;
        if (this.input.keys['ArrowDown']) this.ship.y += this.ship.speed * dt;

        // Clamp Ship
        if (this.ship.y < 50) this.ship.y = 50; // Below HUD
        if (this.ship.y > this.canvas.height - 30) this.ship.y = this.canvas.height - 30;

        // Shooting
        if (this.input.keys['Space'] && !this.input.lastKeys['Space']) {
            this.shoot();
        }

        // Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += 600 * dt;
            if (b.x > this.canvas.width) this.bullets.splice(i, 1);
        }

        // Spawn Trash
        this.spawnTimer += dt;
        if (this.spawnTimer > 1.5) { // Spawn every 1.5 seconds
            this.spawnTrash();
            this.spawnTimer = 0;
        }

        // Update Trash
        for (let i = this.trashItems.length - 1; i >= 0; i--) {
            const t = this.trashItems[i];
            t.x -= 100 * dt;
            t.rotation += dt;

            // Check Collision with Ship
            if (this.checkRectCollision(this.ship, t)) {
                this.energy -= 10;
                this.particles.emit(this.ship.x, this.ship.y, '#f00', 10);
                window.miniGameHub.soundManager.playSound('hit');
                this.trashItems.splice(i, 1);
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

            if (t.x < -50) this.trashItems.splice(i, 1);
        }

        // Win/Loss Checks
        if (this.fuel >= this.maxFuel) {
            this.game.nextLevel(); // Go to next mini-game
        }
        if (this.energy <= 0) {
            this.game.gameOver();
        }
    }

    spawnTrash() {
        const isCorrect = Math.random() < 0.4; // 40% chance of correct answer
        let value;
        if (isCorrect) {
            value = this.currentProblem.answer;
        } else {
            // Pick a random distractor from options or generate new fake
            const opts = this.currentProblem.options.filter(o => o !== this.currentProblem.answer);
            value = opts.length ? opts[Math.floor(Math.random() * opts.length)] : this.currentProblem.answer + 1;
        }

        this.trashItems.push({
            x: this.canvas.width + 50,
            y: Math.random() * (this.canvas.height - 100) + 50,
            width: 40,
            height: 40,
            value: value,
            isAnswer: value === this.currentProblem.answer,
            rotation: 0,
            color: isCorrect ? '#0f0' : '#f0f' // Debug colors, normally just random trash colors
        });
    }

    shoot() {
        this.bullets.push({
            x: this.ship.x + this.ship.width,
            y: this.ship.y + this.ship.height / 2 - 2,
            width: 10,
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

            // Difficulty check
            const res = this.mathEngine.checkAnswer(trash.value, this.currentProblem.answer);
            if (res.levelUp) {
                window.miniGameHub.soundManager.playSound('levelup');
            }
            this.getNewProblem();
        } else {
            this.energy -= 10;
            this.particles.emit(trash.x, trash.y, '#f00', 20);
            window.miniGameHub.soundManager.playSound('explosion');
            this.mathEngine.consecutiveCorrect = 0; // Reset streak
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

        // Background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Stars
        ctx.fillStyle = '#fff';
        this.stars.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // HUD
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, this.canvas.width, 50);

        ctx.font = '24px "Courier New", monospace';
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'left';
        ctx.fillText(`Fuel: ${this.fuel}/${this.maxFuel}`, 20, 35);

        ctx.fillStyle = '#f00';
        ctx.fillText(`Energy: ${this.energy}%`, 200, 35);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '30px "Segoe UI", sans-serif';
        if (this.currentProblem) {
            ctx.fillText(`SOLVE: ${this.currentProblem.question} = ?`, this.canvas.width / 2, 35);
        }

        // Ship
        ctx.fillStyle = this.ship.color;
        ctx.beginPath();
        ctx.moveTo(this.ship.x, this.ship.y);
        ctx.lineTo(this.ship.x + this.ship.width, this.ship.y + this.ship.height / 2);
        ctx.lineTo(this.ship.x, this.ship.y + this.ship.height);
        ctx.fill();

        // Engine flame
        ctx.fillStyle = `rgba(0, 255, 255, ${Math.random()})`;
        ctx.beginPath();
        ctx.moveTo(this.ship.x, this.ship.y + 5);
        ctx.lineTo(this.ship.x - 20, this.ship.y + this.ship.height / 2);
        ctx.lineTo(this.ship.x, this.ship.y + this.ship.height - 5);
        ctx.fill();

        // Bullets
        ctx.fillStyle = '#ff0';
        this.bullets.forEach(b => {
            ctx.fillRect(b.x, b.y, b.width, b.height);
        });

        // Trash
        this.trashItems.forEach(t => {
            ctx.save();
            ctx.translate(t.x + t.width/2, t.y + t.height/2);
            ctx.rotate(t.rotation);
            ctx.fillStyle = '#555';
            ctx.fillRect(-t.width/2, -t.height/2, t.width, t.height);

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(t.value, 0, 0);
            ctx.restore();
        });
    }
}
