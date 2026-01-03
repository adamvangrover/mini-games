export default class SatelliteShowdown {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        this.mathEngine = game.mathEngine;
        this.input = game.input;
        this.particles = window.miniGameHub.particleSystem;

        this.isActive = false;
        this.bossHP = 100;
        this.playerHP = 100;
        this.portholes = [];
        this.projectiles = [];
        this.bossProjectiles = [];
        this.currentProblem = null;

        this.ship = { x: 50, y: 0, width: 40, height: 40 };
        this.lastShotTime = 0;
        this.bossAttackTimer = 0;
    }

    init() {
        this.isActive = true;
        this.bossHP = 100;
        this.playerHP = 100;
        this.projectiles = [];
        this.bossProjectiles = [];
        this.ship.y = this.canvas.height / 2;
        this.setupBoss();
        this.newRound();

        // Ensure boss level difficulty
        this.mathEngine.level = Math.max(this.mathEngine.level, 5);
    }

    setupBoss() {
        this.portholes = [];
        const centerY = this.canvas.height / 2;
        // 3 Weak Points
        for(let i=0; i<3; i++) {
            this.portholes.push({
                x: this.canvas.width - 200,
                y: centerY - 150 + (i * 150),
                radius: 40,
                value: 0,
                isCorrect: false,
                color: '#f00' // Red default
            });
        }
    }

    newRound() {
        this.currentProblem = this.mathEngine.generateProblem();
        const correctIdx = Math.floor(Math.random() * 3);

        const options = new Set([this.currentProblem.answer]);
        // Generate valid distractors
        while(options.size < 3) {
            let fake = this.currentProblem.answer + Math.floor(Math.random() * 10) - 5;
            if (fake !== this.currentProblem.answer) options.add(fake);
        }
        const optsArray = Array.from(options).sort(() => Math.random() - 0.5);

        // Assign to portholes
        this.portholes.forEach((p, i) => {
            // Wait, we need to ensure one is correct.
            // Let's just assign manually based on correctIdx to guarantee position
             if (i === correctIdx) {
                p.value = this.currentProblem.answer;
                p.isCorrect = true;
            } else {
                // Pick a fake
                let fake = this.currentProblem.answer + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
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

        // Touch follow
         if (this.input.mouse.down) {
             const targetY = this.input.mouse.y;
             if (Math.abs(targetY - (this.ship.y + 20)) > 10) {
                 this.ship.y += Math.sign(targetY - (this.ship.y + 20)) * speed * dt;
             }

             // Auto fire
             this.fire();
        }

        // Clamp
        if (this.ship.y < 50) this.ship.y = 50;
        if (this.ship.y > this.canvas.height - 50) this.ship.y = this.canvas.height - 50;

        // Shoot Key
        if (this.input.keys['Space'] && !this.input.lastKeys['Space']) {
            this.fire();
        }

        // Player Projectiles
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
                        this.bossHP -= 15;
                        window.miniGameHub.soundManager.playSound('explosion');
                        if (this.particles) this.particles.emit(ph.x, ph.y, '#0f0', 30);
                        this.newRound();
                    } else {
                        this.playerHP -= 10;
                        window.miniGameHub.soundManager.playSound('hit');
                         if (this.particles) this.particles.emit(ph.x, ph.y, '#f00', 10);
                        // Punishment: Boss shoots back immediately
                        this.bossFire();
                    }
                    this.projectiles.splice(i, 1);
                    hit = true;
                    break;
                }
            }
        }

        // Boss Logic
        this.bossAttackTimer += dt;
        if (this.bossAttackTimer > 2.0) {
            this.bossFire();
            this.bossAttackTimer = 0;
        }

        // Boss Projectiles
        for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
            const b = this.bossProjectiles[i];
            b.x -= 400 * dt;

             // Collision with Player
             if (this.checkRectCollision({x: b.x, y: b.y, width: b.radius*2, height: b.radius*2}, this.ship)) {
                 this.playerHP -= 15;
                 window.miniGameHub.soundManager.playSound('hit');
                 this.bossProjectiles.splice(i, 1);
                 continue;
             }

             if (b.x < 0) this.bossProjectiles.splice(i, 1);
        }

        if (this.bossHP <= 0) {
            this.game.victory();
        }
        if (this.playerHP <= 0) {
            this.game.gameOver();
        }
    }

    checkRectCollision(r1, r2) {
        return (r1.x < r2.x + r2.width &&
                r1.x + r1.width > r2.x &&
                r1.y < r2.y + r2.height &&
                r1.y + r1.height > r2.y);
    }

    fire() {
        const now = Date.now();
        if (now - this.lastShotTime < 250) return;
        this.lastShotTime = now;

        this.projectiles.push({
            x: this.ship.x + 20,
            y: this.ship.y + this.ship.height / 2,
            radius: 5
        });
        window.miniGameHub.soundManager.playSound('shoot');
    }

    bossFire() {
        // Shoot from random porthole
        const source = this.portholes[Math.floor(Math.random() * this.portholes.length)];
        this.bossProjectiles.push({
            x: source.x - 20,
            y: source.y,
            radius: 8,
            color: '#f0f'
        });
    }

    draw() {
        const ctx = this.ctx;
        // Background cleared by main

        // HUD
        ctx.font = 'bold 24px "Segoe UI"';
        ctx.fillStyle = '#f00';
        ctx.textAlign = 'right';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f00';
        ctx.fillText(`BOSS INTEGRITY: ${this.bossHP}%`, this.canvas.width - 20, 40);

        ctx.fillStyle = '#0ff';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#0ff';
        ctx.fillText(`SHIELDS: ${this.playerHP}%`, 20, 40);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px monospace';
        if (this.currentProblem) {
            ctx.fillText(`TARGET: ${this.currentProblem.question} = ?`, this.canvas.width/2, 80);
        }

        // Boss Ship Body (Massive Station)
        ctx.fillStyle = '#333';
        const bossX = this.canvas.width - 250;
        ctx.beginPath();
        ctx.moveTo(bossX, 50);
        ctx.lineTo(this.canvas.width, 0);
        ctx.lineTo(this.canvas.width, this.canvas.height);
        ctx.lineTo(bossX, this.canvas.height - 50);
        ctx.lineTo(bossX - 50, this.canvas.height / 2);
        ctx.closePath();
        ctx.fill();

        // Structure lines
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Portholes (Weak Points)
        this.portholes.forEach(p => {
            // Glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = p.isCorrect ? '#ff0' : '#f00'; // Actually, don't reveal answer with color!
            // Wait, if I change color based on isCorrect, it's cheating.
            ctx.shadowColor = '#f90'; // Uniform orange glow

            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#f90';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Number
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 30px monospace';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(p.value, p.x, p.y);
            ctx.textBaseline = 'alphabetic';
        });

        // Player Ship
        ctx.fillStyle = '#0ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#0ff';
        ctx.beginPath();
        ctx.moveTo(this.ship.x, this.ship.y);
        ctx.lineTo(this.ship.x + this.ship.width, this.ship.y + this.ship.height / 2);
        ctx.lineTo(this.ship.x, this.ship.y + this.ship.height);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Projectiles
        ctx.fillStyle = '#ff0';
        this.projectiles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Boss Projectiles
        ctx.fillStyle = '#f0f';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f0f';
        this.bossProjectiles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
    }

    resize() {
        this.setupBoss();
    }
}
