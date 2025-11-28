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
        this.container = container;

        // Reset state
        this.currentSentenceIndex = Math.floor(Math.random() * this.sentences.length);
        this.startTime = performance.now();
        this.elapsedTime = 0;
        this.completed = false;

        // Bind UI
        this.sentenceEl = container.querySelector("#typing-sentence");
        this.inputEl = container.querySelector("#typing-input");
        this.timerEl = container.querySelector("#typing-timer");
        this.wpmEl = container.querySelector("#typing-wpm");
        this.accEl = container.querySelector("#typing-accuracy");
        const retryBtn = container.querySelector('button:not(.back-btn)');

        this.sentenceEl.textContent = this.sentences[this.currentSentenceIndex];
        this.inputEl.value = "";
        this.inputEl.disabled = false;
        this.inputEl.focus();

        this.wpmEl.textContent = "0";
        this.accEl.textContent = "100%";
        this.timerEl.textContent = "0.0";

        this.inputEl.oninput = () => this.checkTyping();
        if (retryBtn) retryBtn.onclick = () => this.init(container);
    }

    shutdown() {
        if (this.inputEl) this.inputEl.oninput = null;
        if (this.container) {
             const retryBtn = this.container.querySelector('button:not(.back-btn)');
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
        const inputText = this.inputEl.value;
        const sentence = this.sentences[this.currentSentenceIndex];

        // Sound feedback
        this.soundManager.playSound('click');

        let correctChars = 0;
        for (let i = 0; i < inputText.length; i++) {
            if (inputText[i] === sentence[i]) {
                correctChars++;
            }
        }

        // Calculate partial accuracy roughly based on length
        // This logic is a bit flawed in legacy but let's keep it simple
        let accuracy = Math.floor((correctChars / Math.max(1, inputText.length)) * 100);
        this.accEl.textContent = accuracy + "%";

        if (inputText === sentence) {
            this.completed = true;
            this.inputEl.disabled = true;
            this.soundManager.playSound('score');

            const words = sentence.split(" ").length;
            const minutes = this.elapsedTime / 60;
            const wpm = Math.floor(words / minutes);
            this.wpmEl.textContent = wpm;

            // Save WPM?
            // this.saveSystem.setHighScore('typing-game', wpm);
        }
    }
}
