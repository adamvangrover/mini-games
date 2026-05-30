import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

const WORD_LIST = [
    "algorithm", "bandwidth", "cache", "database", "encryption",
    "firewall", "gateway", "hacker", "interface", "kernel",
    "latency", "malware", "network", "offline", "protocol",
    "query", "router", "server", "terminal", "upload",
    "variable", "widget", "xml", "yield", "zombie",
    "cyberpunk", "neon", "retro", "synthwave", "glitch",
    "mainframe", "override", "bypass", "system", "failure",
    "breach", "access", "denied", "granted", "security",
    "buffer", "overflow", "stack", "trace", "execute"
];

export default class TypingZombies {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.boundResize = this.resize.bind(this);
        this.boundLoop = this.loop.bind(this);
        this.lastTime = 0;

        // Game State
        this.zombies = [];
        this.spawnTimer = 0;
        this.spawnRate = 2.0;

        // Graphics
        this.baseSpeed = 0.5; // Z speed

        // Input & Scoring State
        this.activeZombie = null;
        this.score = 0;
        this.highScore = this.saveSystem.getHighScore('typing-zombies') || 0;
        this.keystrokes = 0;
        this.startTime = 0;
        this.isGameOver = false;

        this.boundOnKeyDown = this.onKeyDown.bind(this);
    }

    async init(container) {
        this.container = container;

        this.container.innerHTML = `
            <div class="relative w-full h-full bg-slate-900 overflow-hidden font-mono select-none" id="typingZombies-ui">
                <canvas id="typingZombies-canvas" class="absolute inset-0 block"></canvas>

                <div class="absolute top-4 left-4 z-10 pointer-events-none drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]">
                    <div class="text-3xl font-bold text-red-500">THREAT LEVEL: <span id="tz-score">0</span></div>
                    <div class="text-xl text-yellow-400 mt-2">WPM: <span id="tz-wpm">0</span></div>
                </div>

                <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold z-20 transition-colors pointer-events-auto border border-slate-600">ABORT</button>
            </div>
        `;

        this.canvas = this.container.querySelector('#typingZombies-canvas');
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        window.addEventListener('keydown', this.boundOnKeyDown);
        this.resize();

        this.lastTime = performance.now();
        this.startTime = this.lastTime;
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    onKeyDown(e) {
        if (this.isGameOver || e.ctrlKey || e.altKey || e.metaKey) return;

        // Only accept single letter characters
        if (e.key.length !== 1 || !e.key.match(/[a-z]/i)) return;

        const char = e.key.toLowerCase();

        if (this.activeZombie) {
            // Must match next character
            const nextChar = this.activeZombie.word[this.activeZombie.typed];
            if (char === nextChar) {
                this.hitZombie(this.activeZombie);
            } else {
                // Miss (Penalize?)
            }
        } else {
            // Find a zombie starting with this character
            // Prioritize closest ones (lowest Z)
            const sortedZombies = [...this.zombies].sort((a, b) => a.z - b.z);
            for (const z of sortedZombies) {
                if (z.word[0] === char) {
                    this.activeZombie = z;
                    this.hitZombie(z);
                    break;
                }
            }
        }
    }

    hitZombie(z) {
        z.typed++;
        this.keystrokes++;
        this.soundManager.playSound('click'); // Machine gun type sound

        if (z.typed === z.word.length) {
            // Killed
            this.soundManager.playSound('explosion');
            this.score += z.word.length * 10;
            this.zombies = this.zombies.filter(x => x !== z);
            this.activeZombie = null;
            document.getElementById('tz-score').innerText = this.score;
        }
    }

    loop(timestamp) {
        if (!this.canvas) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(Math.min(dt, 0.1));
        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
        if (this.isGameOver) return;

        // Calculate WPM (Words = characters / 5)
        const elapsedMinutes = (performance.now() - this.startTime) / 60000;
        if (elapsedMinutes > 0) {
            const wpm = Math.floor((this.keystrokes / 5) / elapsedMinutes);
            document.getElementById('tz-wpm').innerText = wpm;
        }

        // Spawn
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnZombie();
            this.spawnTimer = this.spawnRate;
            this.spawnRate = Math.max(0.5, this.spawnRate * 0.98); // Speeds up slightly slower
        }

        // Update Zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const z = this.zombies[i];
            z.z -= this.baseSpeed * dt;

            if (z.z <= 0.1) {
                // Zombie reached player!
                this.gameOver();
                return; // Stop updating
            }
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.soundManager.playSound('explosion');

        // Screen shake
        this.canvas.style.transform = 'scale(1.05) rotate(2deg)';
        setTimeout(() => this.canvas.style.transform = 'scale(0.95) rotate(-2deg)', 50);
        setTimeout(() => this.canvas.style.transform = 'scale(1) rotate(0deg)', 100);

        if (this.score > this.highScore) {
            this.saveSystem.setHighScore('typing-zombies', this.score);
        }

        setTimeout(() => {
            if (window.miniGameHub && window.miniGameHub.showGameOver) {
                window.miniGameHub.showGameOver(this.score, () => {
                    this.resetGame();
                });
            }
        }, 1000);
    }

    resetGame() {
        this.isGameOver = false;
        this.score = 0;
        this.keystrokes = 0;
        this.zombies = [];
        this.activeZombie = null;
        this.spawnRate = 2.0;
        this.spawnTimer = 0;
        this.lastTime = performance.now();
        this.startTime = this.lastTime;
        document.getElementById('tz-score').innerText = '0';
        document.getElementById('tz-wpm').innerText = '0';
    }

    spawnZombie() {
        const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];

        this.zombies.push({
            word: word,
            typed: 0,
            x: (Math.random() - 0.5) * 400, // World X
            y: (Math.random() - 0.5) * 200, // World Y
            z: 10 // World Z (distance)
        });
    }

    draw() {
        if (!this.ctx) return;

        // CRT glow trail clear
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // Sort by Z so closer ones draw on top
        const sortedZombies = [...this.zombies].sort((a, b) => b.z - a.z);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        for (const z of sortedZombies) {
            // Perspective projection
            const fov = 300;
            const scale = fov / (fov + z.z * 50);

            const px = cx + z.x * scale;
            const py = cy + z.y * scale;

            // Draw placeholder zombie body
            const size = 100 * scale;
            this.ctx.fillStyle = `rgba(220, 38, 38, ${scale})`;
            this.ctx.fillRect(px - size/2, py - size/2, size, size);

            // Draw text
            this.ctx.font = `bold ${30 * scale}px monospace`;

            // Background shadow
            this.ctx.fillStyle = '#000000';
            this.ctx.fillText(z.word, px + 2, py - size/2 - 20 * scale + 2);

            // Split text by typed portion
            const typedText = z.word.substring(0, z.typed);
            const untypedText = z.word.substring(z.typed);

            // Measure to align properly
            const typedWidth = this.ctx.measureText(typedText).width;
            const untypedWidth = this.ctx.measureText(untypedText).width;
            const totalWidth = typedWidth + untypedWidth;

            const startX = px - totalWidth / 2;

            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#fde047'; // Yellow typed
            this.ctx.fillText(typedText, startX, py - size/2 - 20 * scale);

            this.ctx.fillStyle = '#ffffff'; // White untyped
            this.ctx.fillText(untypedText, startX + typedWidth, py - size/2 - 20 * scale);
        }
    }

    resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundOnKeyDown);
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
