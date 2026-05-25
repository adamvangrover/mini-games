import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonBeat {
    constructor() {
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;

        // Game State
        this.state = 'TITLE'; // TITLE, PLAYING, GAMEOVER
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.health = 100;
        this.time = 0;

        // Track settings
        this.laneCount = 4;
        this.keys = ['d', 'f', 'j', 'k'];
        this.keyState = [false, false, false, false];
        this.laneColors = ['#ff00ff', '#00ffff', '#00ff00', '#ffff00'];
        this.notes = [];
        this.particles = [];
        this.hitTexts = [];

        // Timing
        this.noteSpeed = 600; // pixels per second
        this.spawnRate = 0.8; // notes per second
        this.lastSpawn = 0;
        this.hitZoneY = 0; // Calculated on resize

        // Visuals
        this.pulse = 0;
        this.bgNodes = [];

        this.boundKeydown = this.handleKeydown.bind(this);
        this.boundKeyup = this.handleKeyup.bind(this);
        this.boundResize = this.resize.bind(this);
    }

    async init(container) {
        this.container = container;

        // Create Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'absolute top-0 left-0 w-full h-full cursor-none';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // Add Back Button
        this.backBtn = document.createElement('button');
        this.backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> ESC';
        this.backBtn.className = "absolute top-4 left-4 px-4 py-2 bg-slate-800/80 hover:bg-fuchsia-600 text-white font-bold rounded-full border border-slate-600 hover:border-fuchsia-400 transition-all z-50 pointer-events-auto backdrop-blur-sm shadow-lg shadow-fuchsia-500/20";
        this.backBtn.onclick = () => window.miniGameHub.goBack();
        this.container.appendChild(this.backBtn);

        this.resize();
        window.addEventListener('resize', this.boundResize);
        window.addEventListener('keydown', this.boundKeydown);
        window.addEventListener('keyup', this.boundKeyup);

        // Init Background nodes
        for(let i=0; i<50; i++) {
            this.bgNodes.push({
                x: Math.random(),
                y: Math.random(),
                z: Math.random() * 2 + 0.1,
                speed: Math.random() * 0.2 + 0.1
            });
        }

        this.soundManager.setBGMVolume(0.3); // Pump the music a bit
        // Ideally we would load a specific fast paced track, but default BGM is fine for now
    }

    resize() {
        if (!this.canvas || !this.container) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.hitZoneY = this.canvas.height - 150;
    }

    handleKeydown(e) {
        if (this.state === 'TITLE' && e.key === 'Enter') {
            this.startGame();
            return;
        }
        if (this.state === 'GAMEOVER' && e.key === 'Enter') {
            this.state = 'TITLE';
            return;
        }

        const keyLower = e.key.toLowerCase();
        const laneIdx = this.keys.indexOf(keyLower);
        if (laneIdx !== -1 && !this.keyState[laneIdx]) {
            this.keyState[laneIdx] = true;
            if (this.state === 'PLAYING') this.checkHit(laneIdx);
        }
    }

    handleKeyup(e) {
        const keyLower = e.key.toLowerCase();
        const laneIdx = this.keys.indexOf(keyLower);
        if (laneIdx !== -1) {
            this.keyState[laneIdx] = false;
        }
    }

    startGame() {
        this.state = 'PLAYING';
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.health = 100;
        this.notes = [];
        this.particles = [];
        this.hitTexts = [];
        this.time = 0;
        this.lastSpawn = 0;
        this.noteSpeed = 500;
        this.spawnRate = 0.5;
        this.soundManager.playSound('click');
    }

    endGame() {
        this.state = 'GAMEOVER';
        const highscore = this.saveSystem.getHighScore('neon-beat') || 0;
        if (this.score > highscore) {
            this.saveSystem.setHighScore('neon-beat', this.score);
            this.soundManager.playSound('win');
            window.miniGameHub.showToast("New High Score!");
        } else {
            this.soundManager.playSound('lose');
        }

        // Reward coins based on score
        const coins = Math.floor(this.score / 500);
        if (coins > 0) this.saveSystem.addCurrency(coins);
    }

    spawnNote() {
        const lane = Math.floor(Math.random() * this.laneCount);
        this.notes.push({
            lane,
            y: -50,
            active: true
        });
    }

    checkHit(laneIdx) {
        // Find lowest note in this lane
        let targetNote = null;
        let minDist = Infinity;

        for (let i = 0; i < this.notes.length; i++) {
            const note = this.notes[i];
            if (note.active && note.lane === laneIdx) {
                const dist = Math.abs(note.y - this.hitZoneY);
                if (dist < minDist) {
                    minDist = dist;
                    targetNote = note;
                }
            }
        }

        const thresholdPerfect = 30;
        const thresholdGood = 70;
        const thresholdBad = 120;

        const w = this.canvas.width;
        const laneWidth = Math.min(100, w / (this.laneCount + 2));
        const startX = (w - (laneWidth * this.laneCount)) / 2;
        const hitX = startX + (laneIdx * laneWidth) + (laneWidth / 2);

        if (targetNote && minDist < thresholdBad) {
            targetNote.active = false;
            let rating = '';
            let pts = 0;

            if (minDist < thresholdPerfect) {
                rating = 'PERFECT';
                pts = 100;
                this.health = Math.min(100, this.health + 2);
                this.spawnParticles(hitX, this.hitZoneY, this.laneColors[laneIdx], 15);
                this.soundManager.playSound('score');
            } else if (minDist < thresholdGood) {
                rating = 'GOOD';
                pts = 50;
                this.health = Math.min(100, this.health + 1);
                this.spawnParticles(hitX, this.hitZoneY, this.laneColors[laneIdx], 8);
                this.soundManager.playSound('click');
            } else {
                rating = 'BAD';
                pts = 10;
                this.combo = 0; // Break combo
                this.health -= 5;
                this.spawnParticles(hitX, this.hitZoneY, '#ff0000', 5);
                this.soundManager.playSound('hit');
            }

            if (pts > 10) {
                this.combo++;
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                pts *= (1 + (this.combo * 0.1)); // Combo multiplier
            }

            this.score += Math.floor(pts);
            this.spawnHitText(hitX, this.hitZoneY - 30, rating, rating === 'PERFECT' ? '#ffff00' : '#ffffff');
            this.pulse = 1.0; // Flash screen

        } else {
            // Missed entirely (pressed too early or no note)
            this.combo = 0;
            this.health -= 2;
            this.spawnHitText(hitX, this.hitZoneY - 30, 'MISS', '#ff0000');
            this.soundManager.playSound('hit');
        }
    }

    spawnParticles(x, y, color, count) {
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 200 + 50;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                life: 1.0
            });
        }
    }

    spawnHitText(x, y, text, color) {
        this.hitTexts.push({ x, y, text, color, life: 1.0 });
    }

    update(dt) {
        if (!this.ctx) return;
        this.time += dt;

        if (this.state === 'PLAYING') {
            // Difficulty scaling
            this.noteSpeed = 400 + (this.time * 5); // Max out eventually
            this.spawnRate = 0.5 + (this.time * 0.05);

            // Spawn notes
            if (this.time - this.lastSpawn > 1 / this.spawnRate) {
                this.spawnNote();
                this.lastSpawn = this.time;
            }

            // Update notes
            for (let i = this.notes.length - 1; i >= 0; i--) {
                const note = this.notes[i];
                if (note.active) {
                    note.y += this.noteSpeed * dt;
                    // Missed note
                    if (note.y > this.canvas.height + 50) {
                        note.active = false;
                        this.combo = 0;
                        this.health -= 10;
                        this.pulse = 0.5;
                        this.soundManager.playSound('hit');
                    }
                }
            }

            // Cleanup inactive notes
            this.notes = this.notes.filter(n => n.active);

            // Check health
            if (this.health <= 0) {
                this.endGame();
            }
        }

        // Update visuals
        if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 3);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 2;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.hitTexts.length - 1; i >= 0; i--) {
            const t = this.hitTexts[i];
            t.y -= 50 * dt;
            t.life -= dt * 1.5;
            if (t.life <= 0) this.hitTexts.splice(i, 1);
        }

        // Background nodes update
        for(let i=0; i<this.bgNodes.length; i++) {
            const n = this.bgNodes[i];
            n.y += (n.speed * this.noteSpeed * dt) / this.canvas.height;
            if (n.y > 1) n.y = 0;
        }
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Base clear
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, w, h);

        // Draw background
        this.ctx.fillStyle = `rgba(255, 0, 255, ${this.pulse * 0.1})`;
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.fillStyle = '#111';
        this.bgNodes.forEach(n => {
            this.ctx.beginPath();
            this.ctx.arc(n.x * w, n.y * h, n.z * 2, 0, Math.PI*2);
            this.ctx.fill();
        });

        // Layout calcs
        const laneWidth = Math.min(100, w / (this.laneCount + 2));
        const startX = (w - (laneWidth * this.laneCount)) / 2;

        // Draw Lanes
        for (let i = 0; i < this.laneCount; i++) {
            const x = startX + (i * laneWidth);

            // Lane background
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.keyState[i] ? 0.1 : 0.02})`;
            this.ctx.fillRect(x, 0, laneWidth - 4, h);

            // Lane line
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();

            // Hit Zone indicator
            this.ctx.strokeStyle = this.keyState[i] ? this.laneColors[i] : '#555';
            this.ctx.lineWidth = this.keyState[i] ? 4 : 2;
            this.ctx.strokeRect(x, this.hitZoneY - 20, laneWidth - 4, 40);

            // Key letter
            this.ctx.fillStyle = this.keyState[i] ? '#fff' : '#777';
            this.ctx.font = '20px "Press Start 2P", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.keys[i].toUpperCase(), x + laneWidth/2, this.hitZoneY + 50);
        }

        if (this.state === 'PLAYING') {
            // Draw Notes
            for (let i = 0; i < this.notes.length; i++) {
                const note = this.notes[i];
                if (note.active) {
                    const x = startX + (note.lane * laneWidth);
                    this.ctx.fillStyle = this.laneColors[note.lane];
                    this.ctx.shadowBlur = 15;
                    this.ctx.shadowColor = this.laneColors[note.lane];
                    this.ctx.fillRect(x + 4, note.y - 10, laneWidth - 12, 20);
                    this.ctx.shadowBlur = 0;
                }
            }

            // Draw HUD
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px "Press Start 2P", monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
            this.ctx.fillText(`COMBO: ${this.combo}`, 20, 70);

            // Health bar
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(20, h - 30, 200, 15);
            this.ctx.fillStyle = this.health > 30 ? '#00ff00' : '#ff0000';
            this.ctx.fillRect(20, h - 30, this.health * 2, 15);
        }

        // Draw Particles
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;

        // Draw Hit Texts
        for (let i = 0; i < this.hitTexts.length; i++) {
            const t = this.hitTexts[i];
            this.ctx.fillStyle = t.color;
            this.ctx.globalAlpha = Math.max(0, t.life);
            this.ctx.font = 'bold 24px "Poppins", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(t.text, t.x, t.y);
        }
        this.ctx.globalAlpha = 1.0;

        // Draw Overlays
        if (this.state === 'TITLE') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, w, h);
            this.ctx.textAlign = 'center';

            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#f0f';
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '50px "Press Start 2P", monospace';
            this.ctx.fillText('NEON BEAT', w/2, h/2 - 50);

            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#0ff';
            this.ctx.font = '20px "Press Start 2P", monospace';
            this.ctx.fillText('PRESS ENTER TO START', w/2, h/2 + 30);

            const hs = this.saveSystem.getHighScore('neon-beat') || 0;
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '16px "Poppins", sans-serif';
            this.ctx.fillText(`HIGH SCORE: ${hs}`, w/2, h/2 + 80);
        } else if (this.state === 'GAMEOVER') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, 0, w, h);
            this.ctx.textAlign = 'center';

            this.ctx.fillStyle = '#f00';
            this.ctx.font = '50px "Press Start 2P", monospace';
            this.ctx.fillText('TRACK FAILED', w/2, h/2 - 50);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px "Poppins", sans-serif';
            this.ctx.fillText(`FINAL SCORE: ${this.score}`, w/2, h/2 + 10);
            this.ctx.fillText(`MAX COMBO: ${this.maxCombo}`, w/2, h/2 + 40);

            this.ctx.fillStyle = '#0ff';
            this.ctx.font = '16px "Press Start 2P", monospace';
            this.ctx.fillText('PRESS ENTER TO RESTART', w/2, h/2 + 100);
        }
    }

    async shutdown() {
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundKeydown);
        window.removeEventListener('keyup', this.boundKeyup);
        if (this.canvas) this.canvas.remove();
        if (this.backBtn) this.backBtn.remove();
    }
}
