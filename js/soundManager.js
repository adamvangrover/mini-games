class SoundManager {
    constructor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.muted = false;
        this.bgmOscillators = [];
        this.bgmGainNode = null;
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
    }
}

window.soundManager = new SoundManager();
