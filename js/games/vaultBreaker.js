import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class VaultBreaker {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.codeLength = 4;
        this.maxDigits = 6;
        this.secretCode = [];
        this.guesses = []; // array of { guess: [], exact: n, near: m }
        this.currentGuess = [];
        this.state = 'PLAYING'; // PLAYING, WIN, LOSE
        this.maxTries = 10;

        this.generateCode();

        this.boundResize = this.resize.bind(this);
        this.boundClick = this.handleClick.bind(this);
    }

    generateCode() {
        this.secretCode = [];
        for (let i = 0; i < this.codeLength; i++) {
            this.secretCode.push(Math.floor(Math.random() * this.maxDigits) + 1);
        }
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        this.canvas.addEventListener('click', this.boundClick);

        this.resize();
        this.isActive = true;
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.draw(); // Force draw on resize since it's turn based
    }

    handleClick(e) {
        if (this.state !== 'PLAYING') {
            this.reset();
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Check Keypad (1-6)
        const layout = this.getKeypadLayout();
        for (const btn of layout) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                this.soundManager.playSound('click');
                this.currentGuess.push(btn.val);

                if (this.currentGuess.length === this.codeLength) {
                    this.resolveGuess();
                } else {
                    this.draw(); // Update current guess UI
                }
                return;
            }
        }
    }

    resolveGuess() {
        let exact = 0;
        let near = 0;

        // Count matches
        const codeCopy = [...this.secretCode];
        const guessCopy = [...this.currentGuess];

        // First pass: exact matches
        for (let i = 0; i < this.codeLength; i++) {
            if (guessCopy[i] === codeCopy[i]) {
                exact++;
                codeCopy[i] = null;
                guessCopy[i] = null;
            }
        }

        // Second pass: near matches
        for (let i = 0; i < this.codeLength; i++) {
            if (guessCopy[i] !== null) {
                const idx = codeCopy.indexOf(guessCopy[i]);
                if (idx > -1) {
                    near++;
                    codeCopy[idx] = null;
                }
            }
        }

        this.guesses.push({
            guess: [...this.currentGuess],
            exact,
            near
        });

        this.currentGuess = [];

        if (exact === this.codeLength) {
            this.state = 'WIN';
            this.soundManager.playSound('coin');
        } else if (this.guesses.length >= this.maxTries) {
            this.state = 'LOSE';
            this.soundManager.playSound('error');
        } else {
            this.soundManager.playSound('jump'); // Feedback sound
        }

        this.draw();
    }

    reset() {
        this.generateCode();
        this.guesses = [];
        this.currentGuess = [];
        this.state = 'PLAYING';
        this.draw();
    }

    getKeypadLayout() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const btnW = 60;
        const btnH = 60;
        const startX = w - 250;
        const startY = h / 2 - 100;

        const layout = [];
        let val = 1;
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 3; c++) {
                layout.push({
                    val: val++,
                    x: startX + c * (btnW + 20),
                    y: startY + r * (btnH + 20),
                    w: btnW,
                    h: btnH
                });
            }
        }
        return layout;
    }

    loop(timestamp) {
        if (!this.isActive) return;
        // Turn-based, so continuous drawing isn't strictly necessary unless animating,
        // but keeping loop alive for consistency
        this.draw();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.fillStyle = '#0a0510';
        this.ctx.fillRect(0, 0, w, h);

        // UI Title
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = '24px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`VAULT BREAKER OS v9.2`, 20, 40);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`ATTEMPTS REMAINING: ${this.maxTries - this.guesses.length}`, 20, 70);

        // Draw History
        const startY = 120;
        this.guesses.forEach((g, i) => {
            const y = startY + i * 40;
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(`[${g.guess.join(' ')}]`, 20, y);

            // Feedback
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillText(`EXACT: ${g.exact}`, 120, y);
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillText(`NEAR: ${g.near}`, 220, y);
        });

        // Draw Current Guess
        this.ctx.fillStyle = '#ff00ff';
        const displayGuess = [...this.currentGuess];
        while (displayGuess.length < this.codeLength) displayGuess.push('_');
        this.ctx.fillText(`> ${displayGuess.join(' ')}`, 20, startY + this.guesses.length * 40 + 20);

        // Draw Keypad
        const layout = this.getKeypadLayout();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        for (const btn of layout) {
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

            this.ctx.fillStyle = '#00ffff';
            this.ctx.font = '24px monospace';
            this.ctx.fillText(btn.val, btn.x + btn.w/2, btn.y + btn.h/2);
        }
        this.ctx.textBaseline = 'alphabetic'; // reset

        // State overlay
        if (this.state === 'WIN') {
             this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
             this.ctx.fillRect(0,0,w,h);
             this.ctx.textAlign = 'center';
             this.ctx.fillStyle = '#00ff00';
             this.ctx.font = 'bold 48px monospace';
             this.ctx.fillText('ACCESS GRANTED', w/2, h/2);
             this.ctx.font = '20px monospace';
             this.ctx.fillText('CLICK TO REBOOT', w/2, h/2 + 40);
        } else if (this.state === 'LOSE') {
             this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
             this.ctx.fillRect(0,0,w,h);
             this.ctx.textAlign = 'center';
             this.ctx.fillStyle = '#ff0000';
             this.ctx.font = 'bold 48px monospace';
             this.ctx.fillText('SECURITY LOCKDOWN', w/2, h/2);
             this.ctx.font = '20px monospace';
             this.ctx.fillText(`CODE WAS: ${this.secretCode.join('')}`, w/2, h/2 + 40);
             this.ctx.fillText('CLICK TO REBOOT', w/2, h/2 + 80);
        }
    }

    async shutdown() {
        this.isActive = false;
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);

        window.removeEventListener('resize', this.boundResize);
        if(this.canvas) this.canvas.removeEventListener('click', this.boundClick);

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
