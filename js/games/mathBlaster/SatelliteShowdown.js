export default class SatelliteShowdown {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        this.mathEngine = game.mathEngine;
        this.input = game.input;

        this.isActive = false;
        this.bossHP = 100;
        this.playerHP = 100;
        this.portholes = [];
        this.projectiles = [];
        this.currentProblem = null;
        this.completedRounds = 0;

        this.ship = { x: 50, y: this.canvas.height / 2, width: 40, height: 40 };
        this.lastShotTime = 0;
    }

    init() {
        this.isActive = true;
        this.bossHP = 100;
        this.playerHP = 100;
        this.completedRounds = 0;
        this.setupBoss();
        this.newRound();
    }

    setupBoss() {
        this.portholes = [];
        const centerY = this.canvas.height / 2;
        // 3 Portholes with numbers vertically distributed
        for(let i=0; i<3; i++) {
            this.portholes.push({
                x: this.canvas.width - 150,
                y: centerY - 150 + (i * 150),
                radius: 40,
                value: 0
            });
        }
    }

    newRound() {
        this.currentProblem = this.mathEngine.generateProblem();
        const correctIdx = Math.floor(Math.random() * 3);

        this.portholes.forEach((p, i) => {
            if (i === correctIdx) {
                p.value = this.currentProblem.answer;
                p.isCorrect = true;
            } else {
                let fake = this.currentProblem.answer + Math.floor(Math.random() * 10) - 5;
                if (fake === this.currentProblem.answer) fake += 1;
                p.value = fake;
                p.isCorrect = false;
            }
        });
    }

    update(dt) {
        if (!this.isActive) return;

        // Ship Movement
        const speed = 300;
        if (this.input.keys['ArrowUp']) this.ship.y -= speed * dt;
        if (this.input.keys['ArrowDown']) this.ship.y += speed * dt;

        // Clamp
        if (this.ship.y < 50) this.ship.y = 50;
        if (this.ship.y > this.canvas.height - 50) this.ship.y = this.canvas.height - 50;

        // Shoot
        if (this.input.keys['Space'] && !this.input.lastKeys['Space']) {
            this.fire();
        }

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += 600 * dt;

            // Cleanup
            if (p.x > this.canvas.width) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Collision with Portholes
            let hit = false;
            for (let ph of this.portholes) {
                const dx = p.x - ph.x;
                const dy = p.y - ph.y;
                if (Math.sqrt(dx*dx + dy*dy) < ph.radius) {
                    if (ph.isCorrect) {
                        this.bossHP -= 20;
                        window.miniGameHub.soundManager.playSound('explosion');
                        this.newRound();
                    } else {
                        this.playerHP -= 10;
                        window.miniGameHub.soundManager.playSound('hit');
                    }
                    this.projectiles.splice(i, 1);
                    hit = true;
                    break;
                }
            }
        }

        if (this.bossHP <= 0) {
            this.game.victory();
        }
        if (this.playerHP <= 0) {
            this.game.gameOver();
        }
    }

    fire() {
        // Simple cooldown check
        const now = Date.now();
        if (now - this.lastShotTime < 200) return;
        this.lastShotTime = now;

        this.projectiles.push({
            x: this.ship.x + 20,
            y: this.ship.y + this.ship.height / 2,
            radius: 5
        });
        window.miniGameHub.soundManager.playSound('shoot');
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // HUD
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#f00';
        ctx.textAlign = 'right';
        ctx.fillText(`Boss: ${this.bossHP}%`, this.canvas.width - 20, 40);

        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'left';
        ctx.fillText(`Shield: ${this.playerHP}%`, 20, 40);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        if (this.currentProblem) {
            ctx.fillText(`${this.currentProblem.question} = ?`, this.canvas.width/2, 80);
        }

        // Boss Ship Body
        ctx.fillStyle = '#444';
        const bossX = this.canvas.width - 200;
        ctx.fillRect(bossX, 50, 200, this.canvas.height - 100);

        // Portholes
        this.portholes.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();
            ctx.strokeStyle = p.isCorrect ? '#0f0' : '#ff0'; // Debug hint: correct one is green in code? No, don't cheat.
            // Wait, I shouldn't visualize the correct one differently unless checking via debug.
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 30px Arial';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.value, p.x, p.y);
            ctx.textBaseline = 'alphabetic';
        });

        // Player
        ctx.fillStyle = '#0ff';
        ctx.beginPath();
        ctx.moveTo(this.ship.x, this.ship.y);
        ctx.lineTo(this.ship.x + this.ship.width, this.ship.y + this.ship.height / 2);
        ctx.lineTo(this.ship.x, this.ship.y + this.ship.height);
        ctx.fill();

        // Projectiles
        ctx.fillStyle = '#ff0';
        this.projectiles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
