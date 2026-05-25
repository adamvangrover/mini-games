export default class NeonPulse {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.health = 100;
        this.notes = [];
        this.particles = [];
        this.lanes = [
            { key: 'd', x: 0, color: '#f00' },
            { key: 'f', x: 0, color: '#0f0' },
            { key: 'j', x: 0, color: '#00f' },
            { key: 'k', x: 0, color: '#ff0' }
        ];
        this.hitZoneY = 0;
        this.noteSpeed = 400; // pixels per second
        this.spawnTimer = 0;
        this.bpm = 120;
        this.beatInterval = 60 / this.bpm;

        this.gameOver = false;
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.lastTime = performance.now();
        this.animationFrame = null;
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        container.appendChild(this.canvas);

        // Setup lanes
        const totalWidth = 400;
        const startX = (this.canvas.width - totalWidth) / 2;
        const laneWidth = totalWidth / 4;
        for(let i=0; i<4; i++) {
            this.lanes[i].x = startX + i * laneWidth + laneWidth/2;
        }
        this.hitZoneY = this.canvas.height - 100;

        window.addEventListener('keydown', this.boundKeyDown);

        // UI Layer
        this.uiContainer = document.createElement('div');
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.top = '10px';
        this.uiContainer.style.left = '10px';
        this.uiContainer.style.color = '#fff';
        this.uiContainer.style.fontFamily = "'Press Start 2P', monospace";
        this.uiContainer.style.fontSize = '16px';
        this.uiContainer.style.pointerEvents = 'none';
        container.appendChild(this.uiContainer);

        // Add back button
        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
        btn.className = "absolute bottom-4 left-4 px-6 py-2 bg-slate-800/80 hover:bg-fuchsia-600 text-white font-bold rounded-full border border-slate-600 hover:border-fuchsia-400 transition-all z-50 pointer-events-auto backdrop-blur-sm";
        btn.onclick = () => window.miniGameHub.goBack();
        container.appendChild(btn);

        this.updateUI();
        this.lastTime = performance.now();
        this.loop();
    }

    handleKeyDown(e) {
        if (this.gameOver) return;

        let laneIndex = -1;
        if (e.key === 'd') laneIndex = 0;
        if (e.key === 'f') laneIndex = 1;
        if (e.key === 'j') laneIndex = 2;
        if (e.key === 'k') laneIndex = 3;

        if (laneIndex !== -1) {
            this.checkHit(laneIndex);
        }
    }

    checkHit(laneIndex) {
        // Visual feedback for keypress
        this.lanes[laneIndex].flash = 0.2;

        // Find closest note in lane
        let closestNote = null;
        let closestDist = Infinity;
        let noteIndex = -1;

        for (let i = 0; i < this.notes.length; i++) {
            if (this.notes[i].lane === laneIndex) {
                let dist = Math.abs(this.notes[i].y - this.hitZoneY);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestNote = this.notes[i];
                    noteIndex = i;
                }
            }
        }

        if (closestNote && closestDist < 60) {
            // Hit!
            this.notes.splice(noteIndex, 1);
            let points = 0;
            let text = "";

            if (closestDist < 15) {
                points = 300; text = "PERFECT";
            } else if (closestDist < 35) {
                points = 100; text = "GREAT";
            } else {
                points = 50; text = "GOOD";
            }

            this.score += points * (1 + (this.combo > 10 ? 1 : 0));
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            this.spawnParticles(this.lanes[laneIndex].x, this.hitZoneY, this.lanes[laneIndex].color, text);
            if (window.miniGameHub && window.miniGameHub.soundManager) {
                window.miniGameHub.soundManager.playSound('click'); // Or a specific hit sound
            }
        } else {
            // Miss (pressed when no note is near)
            this.combo = 0;
            this.health -= 5;
            if (this.health <= 0) this.gameOver = true;
            this.spawnParticles(this.lanes[laneIndex].x, this.hitZoneY, '#fff', "MISS");
        }
        this.updateUI();
    }

    loop() {
        if (!this.canvas) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.animationFrame = requestAnimationFrame(() => this.loop());
    }

    update(dt) {
        if (this.gameOver) return;

        // Spawning logic (simple random beats based on BPM)
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.beatInterval) {
            this.spawnTimer -= this.beatInterval;

            // Randomly spawn 1 or 2 notes
            let numNotes = Math.random() < 0.2 ? 2 : 1;
            let usedLanes = new Set();
            for(let i=0; i<numNotes; i++) {
                let lane;
                do {
                    lane = Math.floor(Math.random() * 4);
                } while(usedLanes.has(lane));
                usedLanes.add(lane);

                this.notes.push({
                    lane: lane,
                    y: -50 // Start above screen
                });
            }

            // Slowly increase BPM/difficulty over time
            this.bpm += 0.5 * dt;
            this.beatInterval = 60 / this.bpm;
            this.noteSpeed += 2 * dt;
        }

        // Update Notes
        for (let i = this.notes.length - 1; i >= 0; i--) {
            let n = this.notes[i];
            n.y += this.noteSpeed * dt;

            // Missed note
            if (n.y > this.canvas.height + 50) {
                this.notes.splice(i, 1);
                this.combo = 0;
                this.health -= 10;
                if (this.health <= 0) this.gameOver = true;
                this.updateUI();
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            if(p.text) {
                p.life -= dt;
                p.y -= 50 * dt;
            } else {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
            }
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update Lane Flashes
        for(let l of this.lanes) {
            if (l.flash > 0) l.flash -= dt;
        }
    }

    draw() {
        // Dynamic background based on BPM
        let pulse = Math.sin(performance.now() / 1000 * Math.PI * (this.bpm/60)) * 0.05;
        this.ctx.fillStyle = `rgba(10, 0, 20, ${1})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Lanes & Hit Zone
        const laneWidth = 100;

        for(let i=0; i<4; i++) {
            let l = this.lanes[i];

            // Lane background
            this.ctx.fillStyle = `rgba(255, 255, 255, 0.05)`;
            this.ctx.fillRect(l.x - laneWidth/2 + 5, 0, laneWidth - 10, this.canvas.height);

            // Hit Zone
            this.ctx.strokeStyle = l.color;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(l.x - laneWidth/2 + 5, this.hitZoneY - 15, laneWidth - 10, 30);

            // Key Indicator
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(l.key.toUpperCase(), l.x, this.hitZoneY + 40);

            // Flash effect
            if (l.flash > 0) {
                this.ctx.fillStyle = l.color;
                this.ctx.globalAlpha = l.flash * 2;
                this.ctx.fillRect(l.x - laneWidth/2 + 5, this.hitZoneY - 15, laneWidth - 10, 30);
                this.ctx.globalAlpha = 1;
            }
        }

        // Draw Notes
        for (let n of this.notes) {
            let l = this.lanes[n.lane];
            this.ctx.fillStyle = l.color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = l.color;
            this.ctx.fillRect(l.x - laneWidth/2 + 10, n.y - 10, laneWidth - 20, 20);
        }
        this.ctx.shadowBlur = 0;

        // Draw Particles/Text
        for (let p of this.particles) {
            if (p.text) {
                this.ctx.globalAlpha = Math.max(0, p.life);
                this.ctx.fillStyle = p.color;
                this.ctx.font = '20px "Press Start 2P"';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(p.text, p.x, p.y);
            } else {
                this.ctx.globalAlpha = Math.max(0, p.life);
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(p.x, p.y, 4, 4);
            }
        }
        this.ctx.globalAlpha = 1;

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("TRACK FAILED", this.canvas.width/2, this.canvas.height/2 - 50);
            this.ctx.font = '15px "Press Start 2P"';
            this.ctx.fillText("Score: " + this.score + " | Max Combo: " + this.maxCombo, this.canvas.width/2, this.canvas.height/2);
        }
    }

    spawnParticles(x, y, color, text = null) {
        if (text) {
            this.particles.push({ x: x, y: y, text: text, color: color, life: 1 });
        } else {
            for (let i = 0; i < 20; i++) {
                this.particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 300,
                    vy: (Math.random() - 0.5) * 300,
                    life: 0.5 + Math.random() * 0.5,
                    color: color
                });
            }
        }
    }

    updateUI() {
        this.uiContainer.innerHTML = `
            SCORE: ${this.score}<br>
            COMBO: ${this.combo}<br>
            HEALTH: ${Math.max(0, this.health)}%
        `;
    }

    async shutdown() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        window.removeEventListener('keydown', this.boundKeyDown);

        if (this.container) this.container.innerHTML = "";
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
        this.canvas = null;

        if (window.miniGameHub && window.miniGameHub.saveSystem && this.score > 0) {
            window.miniGameHub.saveSystem.setHighScore('neon-pulse', this.score);
        }
    }
}
