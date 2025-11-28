export default {
    sentences: [
        "The quick brown fox jumps over the lazy dog.",
        "Programming is the art of telling another human what one wants the computer to do.",
        "The best way to predict the future is to invent it.",
        "Code is like humor. When you have to explain it, it’s bad.",
        "A computer once beat me at chess, but it was no match for me at kick boxing."
    ],
    currentSentenceIndex: 0,
    startTime: null,
    timerInterval: null,
    inputHandler: null,
    buttonHandler: null,
    isActive: false,

    init: function() {
        this.isActive = true;
        this.currentSentenceIndex = Math.floor(Math.random() * this.sentences.length);
        document.getElementById("typing-sentence").textContent = this.sentences[this.currentSentenceIndex];
        const input = document.getElementById("typing-input");
        input.value = "";
        input.disabled = false;
        input.focus();
        document.getElementById("typing-wpm").textContent = "0";
        document.getElementById("typing-accuracy").textContent = "100%";
        this.startTime = new Date();

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), 100);

        // Remove old listener if re-init without full reload
        if (this.inputHandler) input.removeEventListener('input', this.inputHandler);
        this.inputHandler = () => this.checkTyping();
        input.addEventListener('input', this.inputHandler);

        const button = document.querySelector('#typing-game button:not(.back-btn)');
        if (button) {
             // Remove old listener
             if (this.buttonHandler) button.removeEventListener('click', this.buttonHandler);
             this.buttonHandler = () => this.init();
             button.addEventListener('click', this.buttonHandler);
        }
    },

    shutdown: function() {
        this.isActive = false;
        if (this.timerInterval) clearInterval(this.timerInterval);

        const input = document.getElementById("typing-input");
        if (this.inputHandler && input) {
            input.removeEventListener('input', this.inputHandler);
        }

        const button = document.querySelector('#typing-game button:not(.back-btn)');
        if (this.buttonHandler && button) {
            button.removeEventListener('click', this.buttonHandler);
        }

        this.inputHandler = null;
        this.buttonHandler = null;
    },
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

        // Calculate Accuracy properly
        // Sound feedback
        this.soundManager.playSound('click');

        let correctChars = 0;
        for (let i = 0; i < inputText.length; i++) {
            if (inputText[i] === sentence[i]) {
                correctChars++;
            }
        }
        let accuracy = inputText.length === 0 ? 100 : Math.floor((correctChars / inputText.length) * 100);
        document.getElementById("typing-accuracy").textContent = accuracy + "%";

        // Calculate partial accuracy roughly based on length
        // This logic is a bit flawed in legacy but let's keep it simple
        let accuracy = Math.floor((correctChars / Math.max(1, inputText.length)) * 100);
        this.accEl.textContent = accuracy + "%";

        // Typing Sound
        if (inputText.length > 0) {
             const lastChar = inputText[inputText.length - 1];
             const targetChar = sentence[inputText.length - 1];
             if (lastChar === targetChar) {
                 if(window.soundManager) window.soundManager.playTone(800, 'sine', 0.05);
             } else {
                 if(window.soundManager) window.soundManager.playTone(200, 'sawtooth', 0.05);
             }
        }

        if (inputText === sentence) {
            this.completed = true;
            this.inputEl.disabled = true;
            this.soundManager.playSound('score');

            const words = sentence.split(" ").length;
            const wpm = Math.floor((words / elapsedTime) * 60);
            document.getElementById("typing-wpm").textContent = wpm;
            document.getElementById("typing-input").disabled = true;

            if(window.soundManager) window.soundManager.playTone(600, 'square', 0.5, true);
        }
    },

    updateTimer: function() {
        if (!this.isActive) return;
        const currentTime = new Date();
        const elapsedTime = (currentTime - this.startTime) / 1000;
        document.getElementById("typing-timer").textContent = elapsedTime.toFixed(1);
            const minutes = this.elapsedTime / 60;
            const wpm = Math.floor(words / minutes);
            this.wpmEl.textContent = wpm;

            // Save WPM?
            // this.saveSystem.setHighScore('typing-game', wpm);
        }
    }
}
