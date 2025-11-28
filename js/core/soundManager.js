export default class SoundManager {
    constructor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.muted = false;
        this.bgmOscillators = [];
        this.bgmGainNode = null;
        this.isPlayingBGM = false;
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
            case 'gameover':
                 this.playTone(150, 'sawtooth', 0.5, false, true);
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
        if (this.muted || this.isPlayingBGM) return;
        this.isPlayingBGM = true;

        // Simple ambient drone loop
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.value = 110; // A2
        osc2.type = 'triangle';
        osc2.frequency.value = 110.5; // Detuned A2

        gain.gain.value = 0.05;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start();
        osc2.start();

        this.bgmOscillators = [osc1, osc2];
        this.bgmGainNode = gain;

        // Add a simple rhythmic element
        this.startRhythm();
    }

    startRhythm() {
        if (!this.isPlayingBGM) return;

        const now = this.audioCtx.currentTime;
        const beatLen = 0.5; // 120 BPM

        const kick = this.audioCtx.createOscillator();
        const kickGain = this.audioCtx.createGain();

        kick.frequency.setValueAtTime(150, now);
        kick.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);

        kickGain.gain.setValueAtTime(0.1, now);
        kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        kick.connect(kickGain);
        kickGain.connect(this.audioCtx.destination);

        kick.start(now);
        kick.stop(now + 0.5);

        // Loop the rhythm
        this.rhythmTimeout = setTimeout(() => this.startRhythm(), 1000);
    }

    stopBGM() {
        this.isPlayingBGM = false;
        if (this.bgmOscillators) {
            this.bgmOscillators.forEach(osc => {
                try { osc.stop(); } catch(e) {}
            });
        }
        this.bgmOscillators = [];
        if (this.rhythmTimeout) clearTimeout(this.rhythmTimeout);
    }
}
