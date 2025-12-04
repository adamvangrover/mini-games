import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonMemory {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;

        this.sequence = [];
        this.playerSequence = [];
        this.score = 0;
        this.isActive = false;
        this.isShowingSequence = false;

        this.buttons = ['red', 'green', 'blue', 'yellow'];
        this.buttonEls = {};
    }

    async init(container) {
        this.container = container;
        this.renderLayout();
        this.bindEvents();
        this.startGame();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full w-full font-mono">
                <h2 class="text-4xl font-bold text-cyan-400 neon-text mb-4">NEON MEMORY</h2>
                <div class="text-2xl text-white mb-8">Score: <span id="nm-score" class="text-yellow-400">0</span></div>

                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-red" class="nm-btn w-32 h-32 rounded-tl-3xl bg-red-900 border-4 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] active:bg-red-500 transition-all"></button>
                    <button id="btn-green" class="nm-btn w-32 h-32 rounded-tr-3xl bg-green-900 border-4 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] active:bg-green-500 transition-all"></button>
                    <button id="btn-blue" class="nm-btn w-32 h-32 rounded-bl-3xl bg-blue-900 border-4 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] active:bg-blue-500 transition-all"></button>
                    <button id="btn-yellow" class="nm-btn w-32 h-32 rounded-br-3xl bg-yellow-900 border-4 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] active:bg-yellow-500 transition-all"></button>
                </div>

                <div id="nm-message" class="mt-8 text-xl text-slate-300 h-8">Watch the pattern...</div>
            </div>
            <style>
                .nm-btn.active {
                    filter: brightness(1.5);
                    transform: scale(0.95);
                    box-shadow: 0 0 30px currentColor;
                }
            </style>
        `;

        this.buttonEls = {
            red: document.getElementById('btn-red'),
            green: document.getElementById('btn-green'),
            blue: document.getElementById('btn-blue'),
            yellow: document.getElementById('btn-yellow')
        };
    }

    bindEvents() {
        this.buttons.forEach(color => {
            this.buttonEls[color].addEventListener('mousedown', () => this.handleInput(color));
        });
    }

    startGame() {
        this.sequence = [];
        this.playerSequence = [];
        this.score = 0;
        this.isActive = true;
        this.updateScore();
        this.nextRound();
    }

    updateScore() {
        const el = document.getElementById('nm-score');
        if (el) el.textContent = this.score;
    }

    showMessage(msg) {
        const el = document.getElementById('nm-message');
        if (el) el.textContent = msg;
    }

    nextRound() {
        this.playerSequence = [];
        this.sequence.push(this.buttons[Math.floor(Math.random() * 4)]);
        this.playSequence();
    }

    async playSequence() {
        this.isShowingSequence = true;
        this.showMessage('Watch...');

        await new Promise(r => setTimeout(r, 1000));

        for (const color of this.sequence) {
            await this.activateButton(color);
            await new Promise(r => setTimeout(r, 300));
        }

        this.isShowingSequence = false;
        this.showMessage('Repeat!');
    }

    async activateButton(color) {
        const el = this.buttonEls[color];
        el.classList.add('active');

        // Sound pitch based on color
        const freqs = { red: 300, green: 400, blue: 500, yellow: 600 };
        this.soundManager.playTone(freqs[color], 'sine', 0.2);

        await new Promise(r => setTimeout(r, 400));
        el.classList.remove('active');
    }

    handleInput(color) {
        if (!this.isActive || this.isShowingSequence) return;

        this.activateButton(color); // Visual feedback
        this.playerSequence.push(color);

        // Check correctness
        const idx = this.playerSequence.length - 1;
        if (this.playerSequence[idx] !== this.sequence[idx]) {
            this.gameOver();
            return;
        }

        if (this.playerSequence.length === this.sequence.length) {
            this.score++;
            this.updateScore();
            this.soundManager.playSound('score');
            this.showMessage('Correct!');
            setTimeout(() => this.nextRound(), 1000);
        }
    }

    gameOver() {
        this.isActive = false;
        this.soundManager.playSound('gameover');
        window.miniGameHub.showGameOver(this.score, () => this.startGame());
    }

    update(dt) {}
    draw() {}

    shutdown() {
        this.container.innerHTML = '';
    }
}
