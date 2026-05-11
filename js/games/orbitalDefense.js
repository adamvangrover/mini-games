import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class OrbitalDefense {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.animationFrameId = null;
        this.boundGameLoop = this.gameLoop.bind(this);
        
        // Game State
        this.score = 0;
        this.highScore = SaveSystem.getInstance().getHighScore('orbital_defense') || 0;
        this.state = 'START'; // START, PLAYING, GAMEOVER
        this.time = 0;
        
        // Core Logic
        this.coreRadius = 30;
        this.coreHealth = 100;
        this.shieldAngle = 0;
        this.shieldRadius = 80;
        this.shieldWidth = Math.PI / 2; // 90 degrees
        
        this.enemies = [];
        this.particles = [];
        
        this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        
        // Shake & Polish
        this.shakeTime = 0;
        this.hitPauseTime = 0;
        
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnTouchMove = this.onTouchMove.bind(this);
        this.boundOnClick = this.onClick.bind(this);
        this.boundOnResize = this.onResize.bind(this);
    }

    async init(container) {
        this.container = container || document.getElementById('game-container');
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.display = 'block';
        this.canvas.style.background = '#050510';
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        if (this.container && typeof this.container.appendChild === 'function') {
            this.container.appendChild(this.canvas);
        } else {
            this.container = document.getElementById('orbital-defense') || document.getElementById('game-container') || document.body;
            if (this.container) this.container.appendChild(this.canvas);
        }

        window.addEventListener('resize', this.boundOnResize);
        this.canvas.addEventListener('mousemove', this.boundOnMouseMove);
        this.canvas.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
        this.canvas.addEventListener('click', this.boundOnClick);
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
        
        SoundManager.getInstance().playSound('level_up');
    }

    shutdown() {
        this.isRunning = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        window.removeEventListener('resize', this.boundOnResize);
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.boundOnMouseMove);
            this.canvas.removeEventListener('touchmove', this.boundOnTouchMove);
            this.canvas.removeEventListener('click', this.boundOnClick);
            if (this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }
        }
    }

    onResize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    onMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    onTouchMove(e) {
        e.preventDefault();
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
    }

    onClick() {
        if (this.state === 'START' || this.state === 'GAMEOVER') {
            this.resetGame();
        }
    }

    resetGame() {
        this.state = 'PLAYING';
        this.score = 0;
        this.coreHealth = 100;
        this.enemies = [];
        this.particles = [];
        this.time = 0;
        SoundManager.getInstance().playSound('click');
    }

    spawnEnemy() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(cx, cy) + 100;
        
        // Difficulty scaling
        const speedBase = 2 + (this.time * 0.05);
        const isFast = Math.random() > 0.8;
        
        this.enemies.push({
            x: cx + Math.cos(angle) * distance,
            y: cy + Math.sin(angle) * distance,
            vx: -Math.cos(angle) * (isFast ? speedBase * 1.5 : speedBase),
            vy: -Math.sin(angle) * (isFast ? speedBase * 1.5 : speedBase),
            radius: isFast ? 6 : 10,
            color: isFast ? '#ff0055' : '#00ffff',
            markedForDeletion: false
        });
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color,
                size: 2 + Math.random() * 3
            });
        }
    }

    update(dt) {
        if (this.hitPauseTime > 0) {
            this.hitPauseTime -= dt;
            return; // Skip update for hit pause
        }
        
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
        }

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        if (this.state === 'PLAYING') {
            this.time += dt / 1000;
            
            // Shield angle follows mouse
            this.shieldAngle = Math.atan2(this.mouse.y - cy, this.mouse.x - cx);
            
            // Spawn logic
            const spawnRate = Math.max(0.2, 1.5 - (this.time * 0.02));
            if (Math.random() < (dt / 1000) / spawnRate) {
                this.spawnEnemy();
            }

            // Update enemies (backwards loop for safe splicing)
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];
                e.x += e.vx;
                e.y += e.vy;
                
                const dx = e.x - cx;
                const dy = e.y - cy;
                const distSq = dx * dx + dy * dy;
                
                // Shield collision
                if (distSq < (this.shieldRadius + e.radius) * (this.shieldRadius + e.radius) &&
                    distSq > (this.shieldRadius - 10) * (this.shieldRadius - 10)) {
                    
                    let angleToEnemy = Math.atan2(dy, dx);
                    // Normalize angles for comparison
                    let diff = angleToEnemy - this.shieldAngle;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    
                    if (Math.abs(diff) < this.shieldWidth / 2) {
                        // Blocked!
                        this.createExplosion(e.x, e.y, e.color);
                        this.score += 10;
                        this.shakeTime = 0.1;
                        SoundManager.getInstance().playSound('blip');
                        this.enemies.splice(i, 1);
                        continue;
                    }
                }
                
                // Core collision
                if (distSq < (this.coreRadius + e.radius) * (this.coreRadius + e.radius)) {
                    this.coreHealth -= 20;
                    this.createExplosion(cx, cy, '#ff0000');
                    this.shakeTime = 0.3;
                    this.hitPauseTime = 0.05; // 50ms hit pause
                    SoundManager.getInstance().playSound('error');
                    this.enemies.splice(i, 1);
                    
                    if (this.coreHealth <= 0) {
                        this.state = 'GAMEOVER';
                        if (this.score > this.highScore) {
                            this.highScore = this.score;
                            SaveSystem.getInstance().setHighScore('orbital_defense', this.highScore);
                        }
                    }
                    continue;
                }
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt / 1000 * 2; // fade out
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render() {
        // Motion blur effect
        this.ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        
        // Screen shake
        if (this.shakeTime > 0 && this.state === 'PLAYING') {
            const intensity = this.shakeTime * 50;
            this.ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
        }

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // Draw Core
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, this.coreRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(0, 255, 150, ${this.coreHealth / 100})`;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00ff96';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Draw Shield
        if (this.state === 'PLAYING') {
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, this.shieldRadius, this.shieldAngle - this.shieldWidth / 2, this.shieldAngle + this.shieldWidth / 2);
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 6;
            this.ctx.lineCap = 'round';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00ffff';
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        // Draw Enemies
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            this.ctx.beginPath();
            this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = e.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = e.color;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // Draw Particles
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }

        this.ctx.restore();

        // UI Layer
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px "Courier New", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 40);
        this.ctx.fillText(`HI: ${this.highScore}`, 20, 70);

        if (this.state === 'START') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0,0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#0ff';
            this.ctx.font = 'bold 48px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('ORBITAL DEFENSE', cx, cy - 20);
            this.ctx.font = '24px "Courier New", monospace';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('CLICK TO START', cx, cy + 30);
            this.ctx.fillText('Mouse/Touch controls shield angle', cx, cy + 70);
        } else if (this.state === 'GAMEOVER') {
            this.ctx.fillStyle = 'rgba(255,0,0,0.3)';
            this.ctx.fillRect(0,0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#f00';
            this.ctx.font = 'bold 48px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SYSTEM FAILURE', cx, cy - 20);
            this.ctx.font = '24px "Courier New", monospace';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(`FINAL SCORE: ${this.score}`, cx, cy + 30);
            this.ctx.fillText('CLICK TO REBOOT', cx, cy + 70);
        }
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;
        
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Cap dt to prevent spiral of death on lag
        if (dt < 100) {
            this.update(dt);
        }
        this.render();
        
        this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
    }
}
