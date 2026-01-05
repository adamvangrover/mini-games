import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import { WORD_BANK } from './neonWordData.js';

export default class NeonWord {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;

        // Game State
        this.targetWord = "";
        this.targetHint = "";
        this.targetCategory = "";
        this.guesses = []; // Array of strings
        this.currentGuess = "";
        this.maxGuesses = 6;
        this.wordLength = 5; // Start at 5, dynamic
        this.gameState = 'PLAYING'; // PLAYING, WON, LOST

        // Progression
        this.difficulty = 5; // Corresponds to word length (4, 5, 6, 7)
        this.streak = 0;
        this.hintRevealed = false;

        this.keyboardRows = [
            ['Q','W','E','R','T','Y','U','I','O','P'],
            ['A','S','D','F','G','H','J','K','L'],
            ['ENTER', 'Z','X','C','V','B','N','M', 'BACK']
        ];
    }

    async init(container) {
        this.container = container;
        this.container.classList.add('bg-slate-900', 'flex', 'flex-col', 'items-center', 'justify-center', 'relative');

        // Setup initial UI structure
        this.renderLayout();

        this.showDifficultySelect();

        // Listen for physical keyboard
        this.boundHandleKey = this.handleKey.bind(this);
        document.addEventListener('keydown', this.boundHandleKey);
    }

    renderLayout() {
        this.container.innerHTML = `
            <style>
                @keyframes flipIn {
                    0% { transform: rotateX(0); }
                    50% { transform: rotateX(90deg); }
                    100% { transform: rotateX(0); }
                }
                .animate-flip { animation: flipIn 0.5s ease-in-out; }

                @keyframes pop {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                .animate-pop { animation: pop 0.1s; }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.2s; }

                .nw-cell {
                    width: 3.5rem; height: 3.5rem;
                    border: 2px solid #334155;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 2rem; font-weight: bold;
                    color: white;
                    text-transform: uppercase;
                    transition: all 0.2s;
                    text-shadow: 0 0 10px rgba(0,255,255,0.5);
                    background: rgba(15, 23, 42, 0.8);
                }
                .nw-cell.active { border-color: #64748b; box-shadow: 0 0 15px rgba(255,255,255,0.2); }
                .nw-cell.correct { background: rgba(34, 197, 94, 0.2); border-color: #22c55e; color: #4ade80; text-shadow: 0 0 15px #22c55e; }
                .nw-cell.present { background: rgba(234, 179, 8, 0.2); border-color: #eab308; color: #fde047; text-shadow: 0 0 15px #eab308; }
                .nw-cell.absent { background: rgba(71, 85, 105, 0.3); border-color: #475569; color: #94a3b8; }

                .nw-key {
                    background: #334155; color: white;
                    border-radius: 0.5rem;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: bold; cursor: pointer;
                    user-select: none;
                    height: 3.5rem;
                    transition: all 0.1s;
                    box-shadow: 0 4px 0 #1e293b;
                }
                .nw-key:active { transform: translateY(4px); box-shadow: none; }
                .nw-key.correct { background: #22c55e; box-shadow: 0 4px 0 #15803d; }
                .nw-key.present { background: #eab308; box-shadow: 0 4px 0 #a16207; }
                .nw-key.absent { opacity: 0.5; background: #1e293b; box-shadow: none; }

                .glass-panel {
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(0, 255, 255, 0.1);
                    border-radius: 1rem;
                }
            </style>

            <div class="absolute top-4 right-4 flex gap-2">
                 <button id="nw-info-btn" class="w-10 h-10 rounded-full bg-slate-700 hover:bg-cyan-600 text-white flex items-center justify-center transition-colors">
                    <i class="fas fa-question"></i>
                </button>
                <div class="px-3 py-2 bg-slate-800 rounded border border-slate-600 text-cyan-400 font-mono">
                    STREAK: <span id="nw-streak">0</span>
                </div>
            </div>

            <div class="flex flex-col items-center gap-6 w-full max-w-lg p-4 h-full overflow-y-auto">
                <div class="text-center mt-4">
                    <h2 class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-widest filter drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">NEON WORD</h2>
                    <div id="nw-category" class="text-sm font-mono text-slate-400 mt-1 tracking-[0.2em] uppercase">CATEGORY: TECH</div>
                </div>

                <!-- Game Grid -->
                <div id="nw-grid" class="grid gap-2 mb-2 p-4 glass-panel shadow-lg shadow-cyan-900/20">
                    <!-- Rows injected here -->
                </div>

                <!-- Hint Bar -->
                <div id="nw-hint-bar" class="w-full text-center min-h-[3rem] flex items-center justify-center">
                    <button id="nw-hint-btn" class="px-4 py-1 text-xs rounded border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 transition">
                        <i class="fas fa-lightbulb mr-2"></i> NEED A HINT?
                    </button>
                    <div id="nw-hint-text" class="hidden text-yellow-400 font-mono text-sm px-4 py-2 border-l-2 border-yellow-500 bg-yellow-500/5 animate-fade-in">
                        <!-- Hint text -->
                    </div>
                </div>

                <!-- Keyboard -->
                <div id="nw-keyboard" class="flex flex-col gap-2 w-full mt-auto mb-4">
                    <!-- Keyboard will be rendered by updateKeyboard -->
                </div>
            </div>

            <!-- Difficulty Selector / Start Overlay -->
            <div id="nw-overlay" class="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center hidden">
                <h1 class="text-5xl font-bold text-white mb-8 neon-text">SELECT DIFFICULTY</h1>
                <div class="grid grid-cols-2 gap-4 w-full max-w-md px-8">
                    <button class="diff-btn p-6 rounded-xl border-2 border-green-500 hover:bg-green-500/20 text-green-400 text-xl font-bold transition flex flex-col items-center gap-2" data-diff="4">
                        <span>EASY</span>
                        <span class="text-xs font-normal opacity-70">4 Letters</span>
                    </button>
                    <button class="diff-btn p-6 rounded-xl border-2 border-cyan-500 hover:bg-cyan-500/20 text-cyan-400 text-xl font-bold transition flex flex-col items-center gap-2" data-diff="5">
                        <span>MEDIUM</span>
                        <span class="text-xs font-normal opacity-70">5 Letters</span>
                    </button>
                    <button class="diff-btn p-6 rounded-xl border-2 border-purple-500 hover:bg-purple-500/20 text-purple-400 text-xl font-bold transition flex flex-col items-center gap-2" data-diff="6">
                        <span>HARD</span>
                        <span class="text-xs font-normal opacity-70">6 Letters</span>
                    </button>
                    <button class="diff-btn p-6 rounded-xl border-2 border-red-500 hover:bg-red-500/20 text-red-400 text-xl font-bold transition flex flex-col items-center gap-2" data-diff="7">
                        <span>EXPERT</span>
                        <span class="text-xs font-normal opacity-70">7 Letters</span>
                    </button>
                </div>
            </div>

            <!-- Instructions Modal -->
            <div id="nw-instructions" class="absolute inset-0 z-50 bg-slate-900/95 flex items-center justify-center hidden">
                 <div class="bg-slate-800 p-8 rounded-xl border border-slate-600 max-w-md w-full shadow-2xl relative">
                    <button id="nw-close-instr" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
                    <h3 class="text-2xl font-bold text-cyan-400 mb-4 border-b border-slate-700 pb-2">HOW TO PLAY</h3>
                    <ul class="space-y-3 text-slate-300 mb-6">
                        <li class="flex gap-3 items-center"><span class="w-8 h-8 rounded bg-slate-700 border border-slate-500 flex items-center justify-center font-bold text-white">W</span> <span>Guess the hidden word in 6 tries.</span></li>
                        <li class="flex gap-3 items-center"><span class="w-8 h-8 rounded bg-green-500/20 border border-green-500 flex items-center justify-center font-bold text-green-400">G</span> <span>Green means correct letter & spot.</span></li>
                        <li class="flex gap-3 items-center"><span class="w-8 h-8 rounded bg-yellow-500/20 border border-yellow-500 flex items-center justify-center font-bold text-yellow-400">Y</span> <span>Yellow means correct letter, wrong spot.</span></li>
                        <li class="flex gap-3 items-center"><span class="w-8 h-8 rounded bg-slate-700 border border-slate-500 flex items-center justify-center font-bold text-slate-500">X</span> <span>Gray means letter is not in word.</span></li>
                    </ul>
                    <div class="bg-slate-900/50 p-4 rounded text-sm text-slate-400 border border-slate-700">
                        <i class="fas fa-lightbulb text-yellow-500 mr-2"></i> Stuck? Use the <strong>HINT</strong> button to see the definition!
                    </div>
                </div>
            </div>
        `;

        // Bind UI Events
        this.container.querySelectorAll('.nw-key').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                if (key === 'ENTER') this.handleKey({key: 'Enter'});
                else if (key === 'BACK') this.handleKey({key: 'Backspace'});
                else this.handleKey({key: key});
            });
        });

        this.container.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.difficulty = parseInt(btn.dataset.diff);
                document.getElementById('nw-overlay').classList.add('hidden');
                this.startNewGame();
            });
        });

        const hintBtn = document.getElementById('nw-hint-btn');
        if(hintBtn) hintBtn.addEventListener('click', () => this.revealHint());

        const infoBtn = document.getElementById('nw-info-btn');
        const instrModal = document.getElementById('nw-instructions');
        const closeInstr = document.getElementById('nw-close-instr');

        if(infoBtn) infoBtn.addEventListener('click', () => instrModal.classList.remove('hidden'));
        if(closeInstr) closeInstr.addEventListener('click', () => instrModal.classList.add('hidden'));

        this.updateKeyboard();
    }

    revealHint() {
        this.hintRevealed = true;
        const btn = document.getElementById('nw-hint-btn');
        const text = document.getElementById('nw-hint-text');

        if(btn) btn.classList.add('hidden');
        if(text) {
            text.textContent = this.targetHint;
            text.classList.remove('hidden');
        }
        this.soundManager.playSound('click');
    }

    startNewGame() {
        this.gameState = 'PLAYING';
        this.guesses = [];
        this.currentGuess = "";
        this.hintRevealed = false;

        // Filter dictionary by difficulty
        const availableWords = WORD_BANK.filter(w => w.difficulty === this.difficulty);
        const selection = availableWords[Math.floor(Math.random() * availableWords.length)];

        this.targetWord = selection.word;
        this.targetHint = selection.hint;
        this.targetCategory = selection.category;
        this.wordLength = this.targetWord.length;

        // Reset UI
        document.getElementById('nw-category').textContent = `CATEGORY: ${this.targetCategory}`;
        document.getElementById('nw-hint-btn').classList.remove('hidden');
        document.getElementById('nw-hint-text').classList.add('hidden');

        this.updateStreakDisplay();
        this.renderGrid();
        this.updateKeyboard();
    }

    updateStreakDisplay() {
        const el = document.getElementById('nw-streak');
        if(el) el.textContent = this.streak;
    }

    handleKey(e) {
        if (this.gameState !== 'PLAYING') return;

        const key = e.key.toUpperCase();
        if (key === 'ENTER') {
            this.submitGuess();
        } else if (key === 'BACKSPACE') {
            this.currentGuess = this.currentGuess.slice(0, -1);
            this.updateCurrentRow();
        } else if (/^[A-Z]$/.test(key)) {
            if (this.currentGuess.length < this.wordLength) {
                this.currentGuess += key;
                this.updateCurrentRow();
                this.soundManager.playTone(400 + (this.currentGuess.length * 50), 'sine', 0.05); // Tone scales with typing
            }
        }
    }

    updateCurrentRow() {
        const rowIdx = this.guesses.length;
        const row = document.getElementById(`row-${rowIdx}`);
        if (!row) return;

        const cells = row.querySelectorAll('.nw-cell');
        cells.forEach((cell, i) => {
            const letter = this.currentGuess[i] || '';
            cell.textContent = letter;
            if (letter) {
                cell.classList.add('active', 'animate-pop');
                setTimeout(() => cell.classList.remove('animate-pop'), 100);
            } else {
                cell.classList.remove('active');
            }
        });
    }

    async submitGuess() {
        if (this.currentGuess.length !== this.wordLength) {
            this.shakeGrid();
            return;
        }

        // Add to history
        this.guesses.push(this.currentGuess);
        const win = this.currentGuess === this.targetWord;

        // Animate Flip
        const rowIdx = this.guesses.length - 1;
        await this.animateFlip(rowIdx);

        this.currentGuess = "";
        this.updateKeyboard();

        if (win) {
            this.gameState = 'WON';
            this.streak++;
            this.soundManager.playSound('powerup');
            ParticleSystem.getInstance().emit(window.innerWidth/2, window.innerHeight/2, '#4ade80', 50);
            setTimeout(() => {
                window.miniGameHub.showGameOver(100 + (this.maxGuesses - this.guesses.length) * 50, () => this.showDifficultySelect());
            }, 1500);
        } else if (this.guesses.length >= this.maxGuesses) {
            this.gameState = 'LOST';
            this.streak = 0;
            this.soundManager.playSound('gameover');
            setTimeout(() => {
                window.miniGameHub.showOverlay('GAME OVER', `
                    <p class="mb-4">The word was: <span class="text-cyan-400 font-bold text-2xl tracking-widest block mt-2">${this.targetWord}</span></p>
                    <div class="text-sm text-slate-400 mb-6 italic">${this.targetHint}</div>
                    <button class="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg shadow-lg font-bold tracking-wider transition-all transform hover:scale-105" onclick="window.miniGameHub.transitionToState('IN_GAME', {gameId: 'neon-word-game'})">TRY AGAIN</button>
                `);
            }, 1500);
        } else {
            // Next turn
            this.renderGrid(); // Ensure next row is ready
        }
    }

    showDifficultySelect() {
        document.getElementById('nw-overlay').classList.remove('hidden');
    }

    animateFlip(rowIdx) {
        return new Promise(resolve => {
            const row = document.getElementById(`row-${rowIdx}`);
            if(!row) return resolve();

            const cells = row.querySelectorAll('.nw-cell');
            const guess = this.guesses[rowIdx];

            // Check letters map
            const targetCounts = {};
            for(let char of this.targetWord) targetCounts[char] = (targetCounts[char] || 0) + 1;

            const statuses = new Array(this.wordLength).fill('absent');

            // First pass: Correct
            for(let i=0; i<this.wordLength; i++) {
                if(guess[i] === this.targetWord[i]) {
                    statuses[i] = 'correct';
                    targetCounts[guess[i]]--;
                }
            }

            // Second pass: Present
            for(let i=0; i<this.wordLength; i++) {
                if(statuses[i] === 'absent' && targetCounts[guess[i]] > 0) {
                    statuses[i] = 'present';
                    targetCounts[guess[i]]--;
                }
            }

            // Animate one by one
            let completed = 0;
            cells.forEach((cell, i) => {
                setTimeout(() => {
                    cell.style.animation = 'flipIn 0.5s ease-in-out forwards';

                    // Change color halfway
                    setTimeout(() => {
                        cell.classList.remove('active');
                        cell.classList.add(statuses[i]);

                        // Play sound based on result
                        if(statuses[i] === 'correct') this.soundManager.playTone(600, 'sine', 0.1);
                        else if(statuses[i] === 'present') this.soundManager.playTone(400, 'triangle', 0.1);
                        else this.soundManager.playTone(200, 'sawtooth', 0.05);

                    }, 250);

                    cell.addEventListener('animationend', () => {
                        cell.style.animation = '';
                        completed++;
                        if(completed === this.wordLength) resolve();
                    }, {once: true});
                }, i * 150);
            });
        });
    }

    shakeGrid() {
        const row = document.getElementById(`row-${this.guesses.length}`);
        if(row) {
            row.classList.add('animate-shake');
            this.soundManager.playTone(150, 'sawtooth', 0.2); // Error buzz
            setTimeout(() => row.classList.remove('animate-shake'), 500);
        }
    }

    renderGrid() {
        const grid = document.getElementById('nw-grid');
        if(!grid) return;

        // Dynamically set columns based on word length
        grid.style.gridTemplateColumns = `repeat(${this.wordLength}, minmax(0, 1fr))`;

        let html = '';

        // Render all rows (past guesses + current + empty)
        for (let i = 0; i < this.maxGuesses; i++) {
            const guess = this.guesses[i];
            const isCurrent = i === this.guesses.length;

            html += `<div id="row-${i}" class="grid gap-2" style="grid-template-columns: repeat(${this.wordLength}, minmax(0, 1fr));">`;

            for (let j = 0; j < this.wordLength; j++) {
                let letter = '';
                let status = '';

                if (guess) {
                    letter = guess[j];
                    // Status is applied via classList in animation, but for re-render:
                    // We need to re-calc status if it's already guessed (no animation)
                    // ... Actually, `innerHTML` rebuild wipes classes.
                    // Let's re-calculate status for rendered rows.
                     if (this.targetWord[j] === letter) status = 'correct';
                     else if (this.targetWord.includes(letter)) status = 'present'; // Simplified for static render
                     else status = 'absent';
                } else if (isCurrent && this.currentGuess[j]) {
                    letter = this.currentGuess[j];
                    status = 'active';
                }

                html += `<div class="nw-cell rounded ${status}">${letter}</div>`;
            }

            html += `</div>`;
        }
        grid.innerHTML = html;

        // Fix up "present" logic for static render (handles duplicates correctly)
        // This is a bit heavy for every render, but correctness matters
        this.guesses.forEach((guess, i) => {
             const row = document.getElementById(`row-${i}`);
             if(!row) return;
             const cells = row.querySelectorAll('.nw-cell');

             const targetCounts = {};
             for(let char of this.targetWord) targetCounts[char] = (targetCounts[char] || 0) + 1;
             const statuses = new Array(this.wordLength).fill('absent');

             // Correct
             for(let k=0; k<this.wordLength; k++) {
                 if(guess[k] === this.targetWord[k]) {
                     statuses[k] = 'correct';
                     targetCounts[guess[k]]--;
                 }
             }
             // Present
             for(let k=0; k<this.wordLength; k++) {
                 if(statuses[k] === 'absent' && targetCounts[guess[k]] > 0) {
                     statuses[k] = 'present';
                     targetCounts[guess[k]]--;
                 }
             }

             cells.forEach((c, k) => {
                 c.className = `nw-cell rounded ${statuses[k]}`;
             });
        });
    }

    updateKeyboard() {
        // Calculate key statuses
        const keyStatus = {};

        this.guesses.forEach(guess => {
            for (let i = 0; i < this.wordLength; i++) {
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

        const container = document.getElementById('nw-keyboard');
        if(container) {
             container.innerHTML = this.keyboardRows.map(row => `
                <div class="flex gap-1 justify-center w-full">
                    ${row.map(key => {
                        const status = keyStatus[key] || '';
                        const widthClass = (key === 'ENTER' || key === 'BACK') ? 'flex-1 max-w-[4rem]' : 'flex-1 max-w-[2.5rem]';
                        const label = key === 'BACK' ? '<i class="fas fa-backspace"></i>' : key;
                        return `<div class="nw-key ${widthClass} ${status}" data-key="${key}">${label}</div>`;
                    }).join('')}
                </div>
            `).join('');

            // Rebind
            container.querySelectorAll('.nw-key').forEach(btn => {
                btn.addEventListener('click', () => {
                    const key = btn.dataset.key;
                    if (key === 'ENTER') this.handleKey({key: 'Enter'});
                    else if (key === 'BACK') this.handleKey({key: 'Backspace'});
                    else this.handleKey({key: key});
                });
            });
        }
    }

    // Fallback for re-render if I want it simple
    renderKeyboardHTML() { return ""; } // Handled in updateKeyboard

    update(dt) {}
    draw() {}

    shutdown() {
        document.removeEventListener('keydown', this.boundHandleKey);
        this.container.innerHTML = '';
    }
}
