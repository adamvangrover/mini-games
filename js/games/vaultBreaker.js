import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class VaultBreaker {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        this.container = null;
        this.ctx = null;
        this.canvas = null;

        this.isActive = false;

        this.colors = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#06b6d4']; // 6 colors
        this.codeLength = 4;
        this.maxAttempts = 10;

        this.secretCode = [];
        this.attempts = [];
        this.currentAttempt = [];

        this.score = 0;
        this.state = 'playing'; // playing, gameover
        this.message = "CRACK THE VAULT CODE";

        this.generateCode();
    }

    generateCode() {
        this.secretCode = [];
        for(let i=0; i<this.codeLength; i++) {
            this.secretCode.push(Math.floor(Math.random() * this.colors.length));
        }
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth || window.innerWidth;
        this.canvas.height = container.clientHeight || window.innerHeight;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.isActive = true;

        this.boundHandleClick = this.handleClick.bind(this);
        this.canvas.addEventListener('mousedown', this.boundHandleClick);
        this.canvas.addEventListener('touchstart', this.boundHandleClick, {passive: false});

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        if (!this.container) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    checkCode(guess) {
        let exact = 0;
        let partial = 0;
        const secretCopy = [...this.secretCode];
        const guessCopy = [...guess];

        // Check exact
        for(let i=0; i<this.codeLength; i++) {
            if(guessCopy[i] === secretCopy[i]) {
                exact++;
                secretCopy[i] = -1;
                guessCopy[i] = -2;
            }
        }

        // Check partial
        for(let i=0; i<this.codeLength; i++) {
            for(let j=0; j<this.codeLength; j++) {
                if(guessCopy[i] === secretCopy[j]) {
                    partial++;
                    secretCopy[j] = -1;
                    guessCopy[i] = -2;
                    break;
                }
            }
        }

        return {exact, partial};
    }

    handleClick(e) {
        if (!this.isActive || this.state !== 'playing') return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const cx = (e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX) - rect.left;
        const cy = (e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY) - rect.top;

        const x = cx * scaleX;
        const y = cy * scaleY;

        const panelWidth = Math.min(this.canvas.width * 0.8, 600);
        const startX = this.canvas.width / 2 - panelWidth / 2;
        const startY = 150;

        // Color picker buttons
        const btnRadius = 20;
        const btnSpacing = 60;
        const btnStartX = this.canvas.width / 2 - (this.colors.length * btnSpacing) / 2 + btnSpacing / 2;
        const btnY = this.canvas.height - 100;

        for (let i=0; i<this.colors.length; i++) {
            const bx = btnStartX + i * btnSpacing;
            if (Math.hypot(x - bx, y - btnY) < btnRadius) {
                if (this.currentAttempt.length < this.codeLength) {
                    this.currentAttempt.push(i);
                    this.soundManager.playSound('click');

                    if (this.currentAttempt.length === this.codeLength) {
                        this.submitAttempt();
                    }
                }
                return;
            }
        }

        // Delete button
        if (this.currentAttempt.length > 0) {
            const delX = this.canvas.width / 2;
            const delY = this.canvas.height - 40;
            if (x > delX - 50 && x < delX + 50 && y > delY - 20 && y < delY + 20) {
                this.currentAttempt.pop();
                this.soundManager.playSound('hover');
            }
        }
    }

    submitAttempt() {
        const result = this.checkCode(this.currentAttempt);
        this.attempts.push({guess: [...this.currentAttempt], result});
        this.currentAttempt = [];

        if (result.exact === this.codeLength) {
            this.state = 'gameover';
            this.message = "VAULT CRACKED";
            this.score = (this.maxAttempts - this.attempts.length + 1) * 100;
            this.soundManager.playSound('powerup');

            // Particles
            for(let i=0; i<50; i++) {
                this.particleSystem.emit(this.canvas.width/2, this.canvas.height/2, '#22c55e', 20);
            }
            setTimeout(() => this.gameOver(), 2000);
        } else if (this.attempts.length >= this.maxAttempts) {
            this.state = 'gameover';
            this.message = "ACCESS DENIED";
            this.soundManager.playSound('error');
            setTimeout(() => this.gameOver(), 2000);
        } else {
            this.soundManager.playSound('hit');
        }
    }

    update(dt) {
        if (!this.isActive) return;
        this.particleSystem.update(dt);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0,0, this.canvas.width, this.canvas.height);

        // Header
        ctx.fillStyle = '#06b6d4';
        ctx.font = '30px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("VAULT BREAKER", this.canvas.width / 2, 50);

        ctx.font = '16px monospace';
        ctx.fillStyle = this.state === 'gameover' ? (this.message === "VAULT CRACKED" ? '#22c55e' : '#ef4444') : '#fff';
        ctx.fillText(this.message, this.canvas.width / 2, 90);

        ctx.fillStyle = '#eab308';
        ctx.fillText(`ATTEMPTS LEFT: ${this.maxAttempts - this.attempts.length}`, this.canvas.width / 2, 120);

        // Draw Attempts
        const panelWidth = Math.min(this.canvas.width * 0.8, 600);
        const startX = this.canvas.width / 2 - panelWidth / 2;
        const startY = 150;
        const rowHeight = 40;

        for (let i=0; i<this.maxAttempts; i++) {
            const y = startY + i * rowHeight;

            // Draw slots
            for (let j=0; j<this.codeLength; j++) {
                const x = startX + j * 50 + 50;
                ctx.beginPath();
                ctx.arc(x, y, 15, 0, Math.PI*2);

                if (i < this.attempts.length) {
                    ctx.fillStyle = this.colors[this.attempts[i].guess[j]];
                    ctx.fill();
                } else if (i === this.attempts.length && j < this.currentAttempt.length) {
                    ctx.fillStyle = this.colors[this.currentAttempt[j]];
                    ctx.fill();
                } else {
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            // Draw Results
            if (i < this.attempts.length) {
                const res = this.attempts[i].result;
                const resStartX = startX + this.codeLength * 50 + 80;

                // Draw exact matches (green/white)
                let drawn = 0;
                for (let k=0; k<res.exact; k++) {
                    ctx.fillStyle = '#22c55e'; // Green for exact
                    ctx.beginPath();
                    ctx.arc(resStartX + (drawn%2)*20, y - 5 + Math.floor(drawn/2)*20, 5, 0, Math.PI*2);
                    ctx.fill();
                    drawn++;
                }
                for (let k=0; k<res.partial; k++) {
                    ctx.fillStyle = '#f8fafc'; // White for partial
                    ctx.beginPath();
                    ctx.arc(resStartX + (drawn%2)*20, y - 5 + Math.floor(drawn/2)*20, 5, 0, Math.PI*2);
                    ctx.fill();
                    drawn++;
                }
            }
        }

        // Draw Color Picker
        if (this.state === 'playing') {
            const btnRadius = 20;
            const btnSpacing = 60;
            const btnStartX = this.canvas.width / 2 - (this.colors.length * btnSpacing) / 2 + btnSpacing / 2;
            const btnY = this.canvas.height - 100;

            for (let i=0; i<this.colors.length; i++) {
                const bx = btnStartX + i * btnSpacing;
                ctx.beginPath();
                ctx.arc(bx, btnY, btnRadius, 0, Math.PI*2);
                ctx.fillStyle = this.colors[i];
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Delete Button
            if (this.currentAttempt.length > 0) {
                const delX = this.canvas.width / 2;
                const delY = this.canvas.height - 40;
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(delX - 50, delY - 15, 100, 30);
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.font = '14px monospace';
                ctx.fillText("DELETE", delX, delY + 5);
            }
        } else if (this.state === 'gameover') {
            // Show secret code
            const y = this.canvas.height - 100;
            const startX = this.canvas.width / 2 - (this.codeLength * 50) / 2 + 25;
            ctx.fillStyle = '#fff';
            ctx.fillText("SECRET CODE:", this.canvas.width / 2, y - 40);

            for (let j=0; j<this.codeLength; j++) {
                const x = startX + j * 50;
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI*2);
                ctx.fillStyle = this.colors[this.secretCode[j]];
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        this.particleSystem.draw(ctx);
    }

    gameOver() {
        this.isActive = false;
        if (window.miniGameHub && window.miniGameHub.showGameOver) {
            window.miniGameHub.showGameOver(this.score, () => {
                this.generateCode();
                this.attempts = [];
                this.currentAttempt = [];
                this.score = 0;
                this.state = 'playing';
                this.init(this.container);
            });
        } else {
            // Standalone fallback
            alert(`GAME OVER! Score: ${this.score}`);
            this.generateCode();
            this.attempts = [];
            this.currentAttempt = [];
            this.score = 0;
            this.state = 'playing';
            this.init(this.container);
        }
    }

    shutdown() {
        this.isActive = false;
        this.canvas.remove();
    }
}
