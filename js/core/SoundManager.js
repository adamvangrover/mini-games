export default class SoundManager {
    constructor() {
        if (SoundManager.instance) {
            return SoundManager.instance;
        }

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.muted = false;
        this.bgmOscillators = [];
        this.bgmGainNode = null;

        // BGM System
        this.bgmGainNode = this.audioCtx.createGain();
        this.bgmGainNode.connect(this.audioCtx.destination);
        this.bgmGainNode.gain.value = 0.1; // Low volume by default

        this.bgmOscillators = [];
        this.isPlayingBGM = false;

        SoundManager.instance = this;
    }

    static getInstance() {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            if (this.audioCtx.state === 'running') {
                this.audioCtx.suspend();
            }
        } else {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            this.audioCtx.suspend();
        } else {
            this.audioCtx.resume();
        }
        return this.muted;
    }

    playSound(type) {
        if (this.muted) return;

        // Resume context if it was suspended (browsers require user interaction)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        switch (type) {
            case 'click':
                this.playTone(800, 'sine', 0.1);
                break;
            case 'jump':
                this.playTone(400, 'square', 0.1, true); // Slide up
                break;
            case 'explosion':
                this.playNoise(0.3);
                break;
            case 'score':
                this.playTone(1200, 'sine', 0.05);
                break;
            case 'shoot':
                this.playTone(600, 'sawtooth', 0.1, false, true); // Slide down
                break;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        switch (type) {
            case 'click': this.playTone(800, 'sine', 0.1); break;
            case 'jump': this.playTone(400, 'square', 0.1, true); break;
            case 'explosion': this.playNoise(0.3); break;
            case 'score': this.playTone(1200, 'sine', 0.05); break;
            case 'shoot': this.playTone(600, 'sawtooth', 0.1, false, true); break;
        }
    }

    playTone(freq, type, duration, slideUp = false, slideDown = false) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        if (slideUp) {
            osc.frequency.exponentialRampToValueAtTime(freq * 2, this.audioCtx.currentTime + duration);
        }
        if (slideDown) {
            osc.frequency.exponentialRampToValueAtTime(freq / 2, this.audioCtx.currentTime + duration);
        }
        if (slideUp) osc.frequency.exponentialRampToValueAtTime(freq * 2, this.audioCtx.currentTime + duration);
        if (slideDown) osc.frequency.exponentialRampToValueAtTime(freq / 2, this.audioCtx.currentTime + duration);

        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playNoise(duration) {
        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.audioCtx.destination);

        noise.start();
    }

    startBGM() {
        // Simple procedural BGM placeholder
        // In a real app, this would play an audio file or a more complex sequence
    }

    stopBGM() {
        this.bgmOscillators.forEach(osc => osc.stop());
        this.bgmOscillators = [];
        if (this.isPlayingBGM || this.muted) return;
        this.isPlayingBGM = true;
        this.playBGMLoop();
    }

    stopBGM() {
        this.isPlayingBGM = false;
        if (this.bgmTimer) clearTimeout(this.bgmTimer);
    }

    setBGMVolume(val) {
        this.bgmGainNode.gain.setTargetAtTime(val, this.audioCtx.currentTime, 0.5);
    }

    playBGMLoop() {
        if (!this.isPlayingBGM) return;

        // Simple ambient drone sequence
        const freq = 110; // A2
        const osc = this.audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        // Slight detune for chorus effect
        const osc2 = this.audioCtx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.01, this.audioCtx.currentTime);

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 2.0);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.bgmGainNode);

        osc.start();
        osc2.start();
        osc.stop(this.audioCtx.currentTime + 2.0);
        osc2.stop(this.audioCtx.currentTime + 2.0);

        // Filter sweep effect logic could go here

        this.bgmTimer = setTimeout(() => this.playBGMLoop(), 2000);
    }
}
