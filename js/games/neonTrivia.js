// Generic Trivia Engine
import SoundManager from '../core/SoundManager.js';
import { TRIVIA_DATA } from './neonTriviaData.js';

export default class NeonTrivia {
    constructor() {
        this.container = null;
        this.state = 'MENU'; // MENU, GAME, GAME_OVER
        this.category = null;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.timer = 0;
        this.maxTime = 15;
        this.selectedAnswer = null;
        this.isAnswerRevealed = false;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white font-sans overflow-hidden';

        // CSS specific to Trivia
        const style = document.createElement('style');
        style.textContent = `
            .trivia-btn {
                background: linear-gradient(145deg, #1e293b, #0f172a);
                border: 1px solid #334155;
                transition: all 0.2s ease;
            }
            .trivia-btn:hover {
                border-color: #22d3ee;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2);
            }
            .answer-btn {
                position: relative;
                overflow: hidden;
            }
            .answer-btn.correct {
                background: #15803d;
                border-color: #4ade80;
            }
            .answer-btn.incorrect {
                background: #991b1b;
                border-color: #f87171;
            }
        `;
        this.container.appendChild(style);

        this.renderMenu();
    }

    renderMenu() {
        this.state = 'MENU';
        this.container.innerHTML = `
            <div class="z-10 flex flex-col items-center gap-8 animate-fade-in">
                <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-fuchsia-600 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                    NEON TRIVIA
                </h1>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                    ${Object.keys(TRIVIA_DATA).map(key => `
                        <button class="trivia-btn p-6 rounded-xl flex flex-col items-center gap-2 group" onclick="this.dispatchEvent(new CustomEvent('select-cat', {bubbles:true, detail:'${key}'}))">
                            <i class="fas ${TRIVIA_DATA[key].icon} text-4xl text-slate-400 group-hover:text-cyan-400 transition-colors"></i>
                            <span class="text-xl font-bold group-hover:text-white">${TRIVIA_DATA[key].name}</span>
                            <span class="text-xs text-slate-500">${TRIVIA_DATA[key].questions.length} Questions</span>
                        </button>
                    `).join('')}
                </div>

                <button class="text-slate-500 hover:text-white mt-8" onclick="window.miniGameHub.goBack()">Exit to Arcade</button>
            </div>
        `;

        this.container.addEventListener('select-cat', (e) => {
            this.startGame(e.detail);
        }, { once: true });
    }

    startGame(categoryKey) {
        this.category = TRIVIA_DATA[categoryKey];
        // Shuffle questions
        this.questions = [...this.category.questions].sort(() => Math.random() - 0.5).slice(0, 10);
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.state = 'GAME';
        this.loadQuestion();
    }

    loadQuestion() {
        this.selectedAnswer = null;
        this.isAnswerRevealed = false;
        this.timer = this.maxTime;

        const q = this.questions[this.currentQuestionIndex];

        // Shuffle options but keep track of correct one
        // q.options is array of strings. q.answer is correct index in that array.
        // We need to map correct index to string first
        const correctString = q.options[q.answer];

        this.currentOptions = [...q.options].sort(() => Math.random() - 0.5);
        this.correctOptionIndex = this.currentOptions.indexOf(correctString);

        this.renderQuestion();
    }

    renderQuestion() {
        const q = this.questions[this.currentQuestionIndex];

        this.container.innerHTML = `
            <div class="w-full max-w-4xl px-6 flex flex-col h-screen py-8">
                <!-- Header -->
                <div class="flex justify-between items-center mb-8">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-600">
                            <i class="fas ${this.category.icon} text-cyan-400"></i>
                        </div>
                        <div>
                            <h2 class="font-bold text-slate-300">${this.category.name}</h2>
                            <p class="text-xs text-slate-500">Question ${this.currentQuestionIndex + 1} / ${this.questions.length}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-slate-400">SCORE</p>
                        <p class="text-2xl font-mono font-bold text-yellow-400">${this.score}</p>
                    </div>
                </div>

                <!-- Timer Bar -->
                <div class="w-full h-2 bg-slate-800 rounded-full mb-8 overflow-hidden">
                    <div id="trivia-timer-bar" class="h-full bg-gradient-to-r from-green-500 to-emerald-400 w-full transition-all duration-100 ease-linear"></div>
                </div>

                <!-- Question -->
                <div class="bg-slate-800/50 backdrop-blur border border-slate-700 p-8 rounded-2xl mb-8 shadow-xl min-h-[150px] flex items-center justify-center text-center">
                    <h3 class="text-2xl md:text-3xl font-bold leading-relaxed">${q.question}</h3>
                </div>

                <!-- Options -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start" id="options-grid">
                    ${this.currentOptions.map((opt, idx) => `
                        <button class="answer-btn w-full p-6 text-left rounded-xl bg-slate-800 border-2 border-slate-700 hover:border-cyan-500 hover:bg-slate-750 transition-all font-bold text-lg group flex items-center" data-idx="${idx}">
                            <span class="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center mr-4 text-sm font-mono group-hover:bg-cyan-900 group-hover:text-cyan-300">${String.fromCharCode(65+idx)}</span>
                            ${opt}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        this.container.querySelectorAll('.answer-btn').forEach(btn => {
            btn.onclick = () => this.handleAnswer(parseInt(btn.dataset.idx));
        });
    }

    handleAnswer(idx) {
        if (this.isAnswerRevealed) return;
        this.isAnswerRevealed = true;
        this.selectedAnswer = idx;

        const buttons = this.container.querySelectorAll('.answer-btn');
        const correctBtn = buttons[this.correctOptionIndex];
        const selectedBtn = buttons[idx];

        if (idx === this.correctOptionIndex) {
            // Correct
            selectedBtn.classList.add('correct');
            // Calculate score based on time remaining
            const timeBonus = Math.ceil(this.timer * 10);
            const points = 100 + timeBonus;
            this.score += points;
            SoundManager.getInstance().playSound('score');
            window.miniGameHub.showToast(`Correct! +${points}`);
        } else {
            // Incorrect
            selectedBtn.classList.add('incorrect');
            correctBtn.classList.add('correct');
            SoundManager.getInstance().playSound('explosion'); // Using explosion for wrong buzz
        }

        setTimeout(() => this.nextQuestion(), 2000);
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex >= this.questions.length) {
            this.endGame();
        } else {
            this.loadQuestion();
        }
    }

    endGame() {
        this.state = 'GAME_OVER';
        SoundManager.getInstance().playSound('victory');

        window.miniGameHub.showGameOver(this.score, () => {
            this.startGame(Object.keys(TRIVIA_DATA).find(k => TRIVIA_DATA[k].name === this.category.name));
        });
    }

    update(dt) {
        if (this.state === 'GAME' && !this.isAnswerRevealed) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.timer = 0;
                this.isAnswerRevealed = true;
                SoundManager.getInstance().playSound('explosion');
                // Reveal correct
                const buttons = this.container.querySelectorAll('.answer-btn');
                if (buttons && buttons.length > 0) {
                     buttons[this.correctOptionIndex].classList.add('correct');
                }
                setTimeout(() => this.nextQuestion(), 2000);
            }

            const bar = document.getElementById('trivia-timer-bar');
            if (bar) {
                const pct = (this.timer / this.maxTime) * 100;
                bar.style.width = `${pct}%`;
                if (pct < 30) bar.className = 'h-full bg-red-500 w-full transition-all duration-100 linear';
                else if (pct < 60) bar.className = 'h-full bg-yellow-400 w-full transition-all duration-100 linear';
            }
        }
    }

    draw() {
        // DOM Only
    }

    shutdown() {
        // Clean
    }
}
