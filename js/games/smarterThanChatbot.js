import SoundManager from '../core/SoundManager.js';
import { CHATBOT_TRIVIA_DATA } from './smarterThanChatbotData.js';

export default class SmarterThanChatbot {
    constructor() {
        this.container = null;
        this.state = 'MENU'; // MENU, BOARD, QUESTION, GAME_OVER
        this.score = 0;
        this.totalQuestions = 0;
        this.correctAnswers = 0;
        this.questionsAnswered = 0;

        // Game State
        this.categories = [];
        this.boardState = {}; // Key: "catIndex-qIndex", Value: boolean (isUsed)
        this.currentQuestion = null;

        // Timer
        this.timer = 0;
        this.maxTime = 20;
        this.isPaused = false;

        this.soundManager = SoundManager.getInstance();

        // Persistent Elements
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = `
            .chatbot-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 10px;
                padding: 20px;
                width: 100%;
                max-width: 1000px;
                margin: 0 auto;
            }
            .cat-header {
                background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
                padding: 15px 5px;
                text-align: center;
                font-weight: bold;
                border: 2px solid #334155;
                border-radius: 8px;
                color: #22d3ee;
                font-size: 0.9rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
            .point-btn {
                background: #1e293b;
                border: 2px solid #334155;
                color: #facc15;
                font-family: 'Courier New', monospace;
                font-weight: bold;
                font-size: 1.5rem;
                padding: 20px 0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                text-shadow: 0 0 5px rgba(250, 204, 21, 0.5);
            }
            .point-btn:hover:not(:disabled) {
                background: #334155;
                transform: scale(1.05);
                border-color: #facc15;
                box-shadow: 0 0 15px rgba(250, 204, 21, 0.3);
            }
            .point-btn:disabled {
                background: #0f172a;
                color: #334155;
                border-color: #1e293b;
                cursor: default;
                text-shadow: none;
                opacity: 0.5;
            }
            .scan-line {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 5px;
                background: rgba(34, 211, 238, 0.3);
                opacity: 0.5;
                animation: scan 3s linear infinite;
                pointer-events: none;
                z-index: 10;
            }
            @keyframes scan {
                0% { top: -5%; }
                100% { top: 105%; }
            }
            .chatbot-avatar {
                animation: float 3s ease-in-out infinite;
            }
            @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
        `;

        this.scanLineElement = document.createElement('div');
        this.scanLineElement.className = 'scan-line';
    }

    async init(container) {
        this.container = container;
        this.container.className = 'game-container w-full h-full flex flex-col bg-slate-900 text-white font-sans overflow-hidden relative';

        this.prepareGameData();
        this.renderMenu();
    }

    prepareGameData() {
        this.categories = Object.keys(CHATBOT_TRIVIA_DATA).map(key => ({
            id: key,
            ...CHATBOT_TRIVIA_DATA[key]
        }));
        // Reset board state
        this.boardState = {};
        this.score = 0;
        this.questionsAnswered = 0;
        this.correctAnswers = 0;
        this.totalQuestions = this.categories.length * 5;
    }

    renderMenu() {
        this.state = 'MENU';
        this.container.innerHTML = '';
        this.container.appendChild(this.styleElement);
        this.container.appendChild(this.scanLineElement);

        const content = document.createElement('div');
        content.className = 'flex flex-col items-center justify-center h-full z-20 animate-fade-in text-center p-8';
        content.innerHTML = `
            <div class="chatbot-avatar text-8xl mb-6 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">
                <i class="fas fa-robot"></i>
            </div>
            <h1 class="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-2 drop-shadow-lg">
                ARE YOU SMARTER
            </h1>
            <h2 class="text-3xl md:text-4xl font-bold text-white mb-8 tracking-widest">
                THAN A CHATBOT?
            </h2>
            <p class="text-slate-400 mb-8 max-w-lg text-lg">
                Challenge your knowledge on AI, LLMs, and the Singularity.
                Prove you are not just training data.
            </p>
            <button id="start-btn" class="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded-full shadow-[0_0_20px_rgba(8,145,178,0.5)] transition-all hover:scale-105">
                INITIATE CHALLENGE
            </button>
        `;
        this.container.appendChild(content);

        document.getElementById('start-btn').onclick = () => {
            this.soundManager.playSound('click');
            this.soundManager.speak("Initializing cognitive test protocols. Good luck, human.");
            this.renderBoard();
        };
    }

    renderBoard() {
        this.state = 'BOARD';
        this.container.innerHTML = '';
        this.container.appendChild(this.styleElement);
        this.container.appendChild(this.scanLineElement);

        // Header
        const header = document.createElement('div');
        header.className = 'w-full flex justify-between items-center px-8 py-4 bg-slate-900 border-b border-slate-700 z-20';
        header.innerHTML = `
            <div class="text-2xl font-bold text-cyan-400"><i class="fas fa-robot mr-2"></i> HOST_BOT_v1.0</div>
            <div class="text-3xl font-mono font-bold text-yellow-400 score-display">SCORE: ${this.score}</div>
        `;
        this.container.appendChild(header);

        // Grid Container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'flex-1 flex items-center justify-center z-20 overflow-auto';

        const grid = document.createElement('div');
        grid.className = 'chatbot-grid';

        // Render Headers
        this.categories.forEach(cat => {
            const h = document.createElement('div');
            h.className = 'cat-header';
            h.innerHTML = `<i class="fas ${cat.icon} text-2xl mb-1"></i><span>${cat.name.toUpperCase()}</span>`;
            grid.appendChild(h);
        });

        // Render Buttons (Row by Row: 100, 200, 300, 400, 500)
        // Assuming all categories have 5 questions.
        for (let i = 0; i < 5; i++) {
            this.categories.forEach((cat, catIndex) => {
                const qKey = `${catIndex}-${i}`;
                const qData = cat.questions[i];
                const btn = document.createElement('button');
                btn.className = 'point-btn';
                btn.textContent = qData.points;

                if (this.boardState[qKey]) {
                    btn.disabled = true;
                    btn.textContent = ""; // Clear text for used
                } else {
                    btn.onclick = () => this.selectQuestion(catIndex, i);
                }
                grid.appendChild(btn);
            });
        }

        gridContainer.appendChild(grid);
        this.container.appendChild(gridContainer);
    }

    selectQuestion(catIndex, qIndex) {
        this.soundManager.playSound('click');
        const qKey = `${catIndex}-${qIndex}`;
        this.boardState[qKey] = true;
        this.currentQuestion = {
            ...this.categories[catIndex].questions[qIndex],
            catName: this.categories[catIndex].name,
            key: qKey
        };
        this.renderQuestion();
    }

    renderQuestion() {
        this.state = 'QUESTION';
        this.container.innerHTML = '';
        this.container.appendChild(this.styleElement);
        this.container.appendChild(this.scanLineElement);

        const q = this.currentQuestion;
        this.timer = this.maxTime;
        this.isPaused = false;
        this.isAnswered = false;

        // Shuffle Options
        const optionsWithIndex = q.options.map((opt, i) => ({ text: opt, originalIndex: i }));
        this.shuffledOptions = optionsWithIndex.sort(() => Math.random() - 0.5);

        const content = document.createElement('div');
        content.className = 'w-full max-w-4xl mx-auto p-6 flex flex-col h-full justify-center z-20';
        content.innerHTML = `
            <div class="flex justify-between items-end mb-4 text-cyan-500 font-mono">
                <span class="text-xl font-bold">${q.catName.toUpperCase()} // ${q.points} PTS</span>
                <span id="timer-display" class="text-4xl font-bold text-white">${this.timer}</span>
            </div>

            <div class="w-full h-4 bg-slate-800 rounded-full mb-8 overflow-hidden border border-slate-600">
                <div id="timer-bar" class="h-full bg-cyan-500 w-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
            </div>

            <div class="bg-slate-800/80 backdrop-blur-sm border-2 border-cyan-500/30 p-8 rounded-xl mb-8 shadow-2xl relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-4 opacity-10 text-6xl text-cyan-400 group-hover:scale-110 transition-transform duration-1000">
                    <i class="fas fa-question-circle"></i>
                </div>
                <h3 class="text-2xl md:text-3xl font-bold text-center leading-relaxed text-white drop-shadow-md">${q.q}</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="options-container">
                ${this.shuffledOptions.map((opt, idx) => `
                    <button class="option-btn w-full p-6 text-left rounded-xl bg-slate-800 border-2 border-slate-600 hover:border-yellow-400 hover:bg-slate-700 transition-all font-bold text-lg text-slate-200 flex items-center group relative overflow-hidden" data-idx="${idx}">
                        <div class="absolute inset-0 bg-yellow-400/0 group-hover:bg-yellow-400/5 transition-colors"></div>
                        <span class="w-10 h-10 rounded bg-slate-700 text-cyan-400 flex items-center justify-center mr-4 font-mono text-xl border border-slate-600 group-hover:border-yellow-400 group-hover:text-yellow-400 transition-colors">${String.fromCharCode(65+idx)}</span>
                        ${opt.text}
                    </button>
                `).join('')}
            </div>
        `;

        this.container.appendChild(content);

        // Bind clicks
        this.container.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => this.handleAnswer(parseInt(btn.dataset.idx));
        });

        // Speak the question? Maybe too annoying if repeated. Let's just do a blip.
        // this.soundManager.speak(q.q); // Optional, maybe toggleable.
    }

    handleAnswer(selectedIndex) {
        if (this.isAnswered) return;
        this.isAnswered = true;
        this.questionsAnswered++;

        const selectedOption = this.shuffledOptions[selectedIndex];
        const isCorrect = selectedOption.originalIndex === this.currentQuestion.answer;

        const btns = this.container.querySelectorAll('.option-btn');
        const correctBtnIndex = this.shuffledOptions.findIndex(o => o.originalIndex === this.currentQuestion.answer);

        // Visual Feedback
        if (isCorrect) {
            btns[selectedIndex].classList.add('bg-green-600', 'border-green-400', 'text-white');
            btns[selectedIndex].querySelector('span').classList.add('bg-green-800', 'text-white', 'border-green-400');
            this.score += this.currentQuestion.points;
            this.correctAnswers++;
            this.soundManager.playSound('score');

            const comments = ["Correct.", "Processing... Valid.", "Acceptable.", "Not bad for a biological entity.", "Data verified."];
            this.soundManager.speak(comments[Math.floor(Math.random() * comments.length)]);
        } else {
            btns[selectedIndex].classList.add('bg-red-600', 'border-red-400', 'text-white');
            btns[selectedIndex].querySelector('span').classList.add('bg-red-800', 'text-white', 'border-red-400');
            // Show correct
            btns[correctBtnIndex].classList.add('bg-green-600/50', 'border-green-400/50');

            this.soundManager.playSound('explosion'); // Using explosion for 'wrong' buzz
            const comments = ["Incorrect.", "Hallucination detected.", "Error. Logic flaw.", "Try upgrading your neural net.", "Disappointing."];
            this.soundManager.speak(comments[Math.floor(Math.random() * comments.length)]);
        }

        setTimeout(() => {
            if (this.questionsAnswered >= this.totalQuestions) {
                this.endGame();
            } else {
                this.renderBoard();
            }
        }, 2000);
    }

    update(dt) {
        if (this.state === 'QUESTION' && !this.isPaused && !this.isAnswered) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.timer = 0;
                this.handleTimeout();
            }

            // Update visuals
            const bar = document.getElementById('timer-bar');
            const display = document.getElementById('timer-display');
            if (bar && display) {
                const pct = (this.timer / this.maxTime) * 100;
                bar.style.width = `${pct}%`;
                display.textContent = Math.ceil(this.timer);

                if (pct < 30) {
                    bar.classList.remove('bg-cyan-500');
                    bar.classList.add('bg-red-500');
                    display.classList.add('text-red-500');
                }
            }
        }
    }

    handleTimeout() {
        if (this.isAnswered) return;
        this.isAnswered = true;
        this.questionsAnswered++;
        this.soundManager.playSound('gameover'); // timeout sound
        this.soundManager.speak("Time limit exceeded.");

        // Show correct
        const correctBtnIndex = this.shuffledOptions.findIndex(o => o.originalIndex === this.currentQuestion.answer);
        const btns = this.container.querySelectorAll('.option-btn');
        if (btns[correctBtnIndex]) {
            btns[correctBtnIndex].classList.add('bg-green-600/50', 'border-green-400/50');
        }

        setTimeout(() => {
             if (this.questionsAnswered >= this.totalQuestions) {
                this.endGame();
            } else {
                this.renderBoard();
            }
        }, 2000);
    }

    endGame() {
        this.state = 'GAME_OVER';
        this.container.innerHTML = '';
        this.container.appendChild(this.styleElement);
        this.container.appendChild(this.scanLineElement);

        const accuracy = (this.correctAnswers / this.totalQuestions) * 100;
        let title = "Training Data";
        if (accuracy >= 100) title = "Superintelligence";
        else if (accuracy >= 80) title = "AGI Prototype";
        else if (accuracy >= 60) title = "Prompt Engineer";
        else if (accuracy >= 40) title = "Basic Chatbot";
        else if (accuracy >= 20) title = "Hallucinating Model";

        // Award Coins
        const coins = Math.floor(this.score / 10);
        window.miniGameHub.saveSystem.addCurrency(coins);

        // Speak Result
        setTimeout(() => {
             this.soundManager.speak(`Analysis complete. You are rated as: ${title}.`);
        }, 500);

        const content = document.createElement('div');
        content.className = 'flex flex-col items-center justify-center h-full z-20 animate-fade-in text-center p-8';
        content.innerHTML = `
            <div class="text-6xl text-yellow-400 mb-4 animate-bounce"><i class="fas fa-trophy"></i></div>
            <h2 class="text-4xl font-bold text-white mb-2">ASSESSMENT COMPLETE</h2>
            <div class="text-2xl text-cyan-400 mb-8 font-mono">TITLE: <span class="text-white font-bold border-b-2 border-cyan-500 pb-1">${title}</span></div>

            <div class="grid grid-cols-2 gap-8 mb-8 w-full max-w-md bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <div class="text-right text-slate-400">Final Score</div>
                <div class="text-left font-bold text-yellow-400 text-xl">${this.score}</div>

                <div class="text-right text-slate-400">Accuracy</div>
                <div class="text-left font-bold text-white text-xl">${accuracy.toFixed(1)}%</div>

                <div class="text-right text-slate-400">Coins Earned</div>
                <div class="text-left font-bold text-yellow-400 text-xl">+${coins}</div>
            </div>

            <div class="flex gap-4">
                <button id="retry-btn" class="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full shadow-lg transition-transform hover:scale-105">
                    <i class="fas fa-redo mr-2"></i> RETRY
                </button>
                <button id="exit-btn" class="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-full shadow-lg transition-transform hover:scale-105">
                    <i class="fas fa-sign-out-alt mr-2"></i> EXIT
                </button>
            </div>
        `;
        this.container.appendChild(content);

        document.getElementById('retry-btn').onclick = () => {
             this.prepareGameData();
             this.renderBoard();
        };
        document.getElementById('exit-btn').onclick = () => window.miniGameHub.goBack();
    }

    shutdown() {
        this.soundManager.stopSpeaking();
    }
}
