import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonWord {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;

        this.targetWord = "";
        this.guesses = []; // Array of strings
        this.currentGuess = "";
        this.maxGuesses = 6;
        this.wordLength = 5;
        this.gameState = 'PLAYING'; // PLAYING, WON, LOST

        // Simple dictionary for testing
        this.dictionary = ['CYBER', 'NEON', 'LASER', 'ROBOT', 'SPACE', 'ALIEN', 'VIRUS', 'PIXEL', 'GLITCH', 'MATRIX', 'POWER', 'LEVEL', 'SCORE', 'GAME', 'OVER', 'START', 'QUEST', 'DRONE', 'SHIELD', 'BLADE'];
        // Ensure all are 5 letters? No, "NEON" is 4. I should stick to 5 letter words.
        this.dictionary = ['CYBER', 'LASER', 'ROBOT', 'SPACE', 'ALIEN', 'VIRUS', 'PIXEL', 'POWER', 'LEVEL', 'SCORE', 'START', 'QUEST', 'DRONE', 'BLADE', 'SOUND', 'TRACK', 'THEME', 'LIGHT', 'NIGHT', 'BLOCK', 'STACK', 'WORLD', 'PILOT', 'DRIVE', 'SPEED', 'FLASH', 'SPARK', 'SHINE', 'GLOW', 'BEAM', 'PULSE', 'WAVE', 'DATA', 'CODE', 'HACK', 'NODE', 'LINK', 'GRID', 'CORE', 'CHIP'].filter(w => w.length === 5);

        this.keyboardRows = [
            ['Q','W','E','R','T','Y','U','I','O','P'],
            ['A','S','D','F','G','H','J','K','L'],
            ['ENTER', 'Z','X','C','V','B','N','M', 'BACK']
        ];
    }

    async init(container) {
        this.container = container;
        this.container.classList.add('bg-slate-900', 'flex', 'flex-col', 'items-center', 'justify-center');

        this.startNewGame();

        // Listen for physical keyboard
        this.boundHandleKey = this.handleKey.bind(this);
        document.addEventListener('keydown', this.boundHandleKey);
    }

    startNewGame() {
        this.gameState = 'PLAYING';
        this.guesses = [];
        this.currentGuess = "";
        this.targetWord = this.dictionary[Math.floor(Math.random() * this.dictionary.length)];
        // console.log("Target:", this.targetWord);
        this.render();
    }

    handleKey(e) {
        if (this.gameState !== 'PLAYING') return;

        const key = e.key.toUpperCase();
        if (key === 'ENTER') {
            this.submitGuess();
        } else if (key === 'BACKSPACE') {
            this.currentGuess = this.currentGuess.slice(0, -1);
            this.renderGrid();
        } else if (/^[A-Z]$/.test(key)) {
            if (this.currentGuess.length < this.wordLength) {
                this.currentGuess += key;
                this.renderGrid();
                this.soundManager.playSound('click');
            }
        }
    }

    submitGuess() {
        if (this.currentGuess.length !== this.wordLength) {
            this.shakeGrid();
            return;
        }

        // In a real app, verify word exists in dictionary
        // For now, allow any 5 letter string

        this.guesses.push(this.currentGuess);

        const win = this.currentGuess === this.targetWord;
        this.currentGuess = "";

        this.render(); // Re-render everything to update colors

        if (win) {
            this.gameState = 'WON';
            this.soundManager.playSound('powerup');
            setTimeout(() => {
                window.miniGameHub.showGameOver(100 + (this.maxGuesses - this.guesses.length) * 50, () => this.startNewGame());
            }, 1000);
        } else if (this.guesses.length >= this.maxGuesses) {
            this.gameState = 'LOST';
            this.soundManager.playSound('gameover');
            setTimeout(() => {
                window.miniGameHub.showOverlay('GAME OVER', `<p class="mb-4">The word was: <span class="text-cyan-400 font-bold">${this.targetWord}</span></p><button class="px-6 py-2 bg-slate-600 text-white rounded" onclick="window.miniGameHub.transitionToState('IN_GAME', {gameId: 'neon-word-game'})">Try Again</button>`);
            }, 1000);
        } else {
            this.soundManager.playTone(300, 'square', 0.1);
        }
    }

    shakeGrid() {
        const row = document.getElementById(`row-${this.guesses.length}`);
        if(row) {
            row.classList.add('animate-shake');
            setTimeout(() => row.classList.remove('animate-shake'), 500);
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center gap-8 w-full max-w-md p-4">
                <h2 class="text-3xl font-bold text-cyan-400 neon-text tracking-widest">NEON WORD</h2>

                <div id="nw-grid" class="grid gap-2 mb-4">
                    ${this.renderRows()}
                </div>

                <div id="nw-keyboard" class="flex flex-col gap-2 w-full">
                    ${this.renderKeyboard()}
                </div>
            </div>
            <style>
                .nw-cell {
                    width: 3rem; height: 3rem;
                    border: 2px solid #334155;
                    display: flex; items-center; justify-center;
                    font-size: 1.5rem; font-weight: bold;
                    color: white;
                    text-transform: uppercase;
                }
                .nw-cell.active { border-color: #64748b; }
                .nw-cell.correct { background: #22c55e; border-color: #22c55e; }
                .nw-cell.present { background: #eab308; border-color: #eab308; }
                .nw-cell.absent { background: #475569; border-color: #475569; }

                .nw-key {
                    background: #475569; color: white;
                    border-radius: 0.25rem;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: bold; cursor: pointer;
                    user-select: none;
                    height: 3.5rem;
                }
                .nw-key:active { background: #64748b; }
                .nw-key.correct { background: #22c55e; }
                .nw-key.present { background: #eab308; }
                .nw-key.absent { opacity: 0.5; background: #1e293b; }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.2s; }
            </style>
        `;

        // Bind virtual keyboard
        this.container.querySelectorAll('.nw-key').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                if (key === 'ENTER') this.handleKey({key: 'Enter'});
                else if (key === 'BACK') this.handleKey({key: 'Backspace'});
                else this.handleKey({key: key});
            });
        });
    }

    renderRows() {
        let html = '';
        for (let i = 0; i < this.maxGuesses; i++) {
            const guess = this.guesses[i];
            const isCurrent = i === this.guesses.length;

            html += `<div id="row-${i}" class="grid grid-cols-5 gap-2">`;

            for (let j = 0; j < this.wordLength; j++) {
                let letter = '';
                let status = '';

                if (guess) {
                    letter = guess[j];
                    if (this.targetWord[j] === letter) status = 'correct';
                    else if (this.targetWord.includes(letter)) status = 'present';
                    else status = 'absent';
                } else if (isCurrent && this.currentGuess[j]) {
                    letter = this.currentGuess[j];
                    status = 'active';
                }

                html += `<div class="nw-cell flex items-center justify-center ${status}">${letter}</div>`;
            }

            html += `</div>`;
        }
        return html;
    }

    renderGrid() {
        // Just update the grid part to avoid flickering keyboard
        const grid = document.getElementById('nw-grid');
        if(grid) grid.innerHTML = this.renderRows();
    }

    renderKeyboard() {
        // Calculate key statuses
        const keyStatus = {};

        this.guesses.forEach(guess => {
            for (let i = 0; i < 5; i++) {
                const letter = guess[i];
                if (this.targetWord[i] === letter) {
                    keyStatus[letter] = 'correct';
                } else if (this.targetWord.includes(letter)) {
                    if (keyStatus[letter] !== 'correct') keyStatus[letter] = 'present';
                } else {
                    if (!keyStatus[letter]) keyStatus[letter] = 'absent';
                }
            }
        });

        return this.keyboardRows.map(row => `
            <div class="flex gap-1 justify-center w-full">
                ${row.map(key => {
                    const status = keyStatus[key] || '';
                    const widthClass = (key === 'ENTER' || key === 'BACK') ? 'flex-1 max-w-[4rem]' : 'flex-1 max-w-[2.5rem]';
                    const label = key === 'BACK' ? '<i class="fas fa-backspace"></i>' : key;
                    return `<div class="nw-key ${widthClass} ${status}" data-key="${key}">${label}</div>`;
                }).join('')}
            </div>
        `).join('');
    }

    update(dt) {}
    draw() {}

    shutdown() {
        document.removeEventListener('keydown', this.boundHandleKey);
        this.container.innerHTML = '';
    }
}
