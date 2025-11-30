import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class TypingGame {
    constructor() {
        this.sentences = [
            "The quick brown fox jumps over the lazy dog.",
            "Programming is the art of telling another human what one wants the computer to do.",
            "The best way to predict the future is to invent it.",
            "Code is like humor. When you have to explain it, it’s bad.",
            "A computer once beat me at chess, but it was no match for me at kick boxing."
        ];
        this.currentSentenceIndex = 0;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.completed = false;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        let content = container.querySelector('#typing-input');
        if (!content) {
            container.innerHTML = `
                <h2>⌨ Typing Speed Test</h2>
                <div class="bg-slate-800 p-4 rounded-lg mb-4">
                     <p id="typing-sentence" class="text-xl font-mono text-cyan-400 mb-4 select-none"></p>
                     <input type="text" id="typing-input" placeholder="Start typing..." class="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors" autocomplete="off">
                </div>
                <div class="grid grid-cols-3 gap-4 text-center mb-6">
                    <div class="bg-slate-800 p-2 rounded">
                        <p class="text-xs text-slate-400">TIME</p>
                        <p class="text-xl font-bold text-white"><span id="typing-timer">0.0</span>s</p>
                    </div>
                     <div class="bg-slate-800 p-2 rounded">
                        <p class="text-xs text-slate-400">WPM</p>
                        <p class="text-xl font-bold text-green-400"><span id="typing-wpm">0</span></p>
                    </div>
                     <div class="bg-slate-800 p-2 rounded">
                        <p class="text-xs text-slate-400">ACCURACY</p>
                        <p class="text-xl font-bold text-yellow-400"><span id="typing-accuracy">100%</span></p>
                    </div>
                </div>
                <button id="typing-retry-btn" class="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2 px-4 rounded transition-colors mr-2">🔄 Try Again</button>
                <button class="back-btn bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors">Back</button>
            `;

             container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.container = container;
        this.sentenceEl = container.querySelector("#typing-sentence");
        this.inputEl = container.querySelector("#typing-input");
        this.timerEl = container.querySelector("#typing-timer");
        this.wpmEl = container.querySelector("#typing-wpm");
        this.accEl = container.querySelector("#typing-accuracy");
        const retryBtn = container.querySelector("#typing-retry-btn");

        this.inputEl.oninput = () => this.checkTyping();
        if (retryBtn) retryBtn.onclick = () => this.resetGame();

        this.resetGame();
    }

    resetGame() {
        this.currentSentenceIndex = Math.floor(Math.random() * this.sentences.length);
        this.sentenceEl.textContent = this.sentences[this.currentSentenceIndex];

        this.inputEl.value = "";
        this.inputEl.disabled = false;
        this.inputEl.focus();

        this.wpmEl.textContent = "0";
        this.accEl.textContent = "100%";
        this.timerEl.textContent = "0.0";

        this.elapsedTime = 0;
        this.completed = false;
        this.startTime = performance.now();
    }

    shutdown() {
        if (this.inputEl) this.inputEl.oninput = null;
        if (this.container) {
             const retryBtn = this.container.querySelector("#typing-retry-btn");
             if (retryBtn) retryBtn.onclick = null;
        }
    }

    update(dt) {
        if (!this.completed) {
            this.elapsedTime += dt;
            if (this.timerEl) this.timerEl.textContent = this.elapsedTime.toFixed(1);
        }
    }

    checkTyping() {
        if (this.completed) return;

        const inputText = this.inputEl.value;
        const sentence = this.sentences[this.currentSentenceIndex];

        let correctChars = 0;
        for (let i = 0; i < inputText.length; i++) {
            if (inputText[i] === sentence[i]) {
                correctChars++;
            }
        }

        let accuracy = inputText.length === 0 ? 100 : Math.floor((correctChars / inputText.length) * 100);
        this.accEl.textContent = accuracy + "%";

        // Sound feedback
        if (inputText.length > 0) {
             const lastChar = inputText[inputText.length - 1];
             const targetChar = sentence[inputText.length - 1];
             if (lastChar === targetChar) {
                 this.soundManager.playSound('click'); // Or a softer click
             } else {
                 this.soundManager.playTone(150, 'sawtooth', 0.1); // Error buzzer
             }
        }

        if (inputText === sentence) {
            this.completed = true;
            this.inputEl.disabled = true;
            this.soundManager.playSound('score');

            const words = sentence.split(" ").length;
            const minutes = Math.max(0.1, this.elapsedTime / 60);
            const wpm = Math.floor(words / minutes);
            this.wpmEl.textContent = wpm;

            // Effect?
        }
    }
}
