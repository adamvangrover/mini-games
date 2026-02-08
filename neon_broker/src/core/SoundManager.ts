export class SoundManager {
    ctx: AudioContext;
    masterGain: GainNode;
    isMuted: boolean = false;

    // Music state
    nextNoteTime: number = 0;
    noteIndex: number = 0;
    isPlayingMusic: boolean = false;
    tempo: number = 120;
    lookahead: number = 25.0; // ms
    scheduleAheadTime: number = 0.1; // s

    constructor() {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Default volume
        this.masterGain.connect(this.ctx.destination);
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
    }

    // --- SFX Generators ---

    playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
        if (this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    playBuy() {
        // Ascending chime
        this.playTone(440, 'square', 0.1, 0);
        this.playTone(880, 'square', 0.2, 0.1);
    }

    playSell() {
        // Descending coin sound
        this.playTone(880, 'sine', 0.1, 0);
        this.playTone(440, 'sine', 0.2, 0.1);
    }

    playError() {
        // Low buzz
        this.playTone(150, 'sawtooth', 0.3, 0);
    }

    playPanic() {
        // Siren effect
        if (this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 1.0);

        gain.gain.value = 0.1;
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 1.0);
    }

    playNewsAlert() {
        // Teletype / Data burst
        for(let i=0; i<5; i++) {
            this.playTone(1000 + (Math.random() * 500), 'square', 0.05, i * 0.08);
        }
    }

    playLevelUp() {
        // Victory fanfare
        const now = 0;
        this.playTone(523.25, 'square', 0.2, now);
        this.playTone(659.25, 'square', 0.2, now + 0.2);
        this.playTone(783.99, 'square', 0.4, now + 0.4);
        this.playTone(1046.50, 'square', 0.6, now + 0.6);
    }

    // --- Music Sequencer ---

    startMusic() {
        if (this.isPlayingMusic) return;
        this.isPlayingMusic = true;
        this.nextNoteTime = this.ctx.currentTime;
        this.scheduler();
    }

    stopMusic() {
        this.isPlayingMusic = false;
    }

    scheduler() {
        if (!this.isPlayingMusic) return;

        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.noteIndex, this.nextNoteTime);
            this.nextNote();
        }

        setTimeout(() => this.scheduler(), this.lookahead);
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
        this.noteIndex++;
        if (this.noteIndex === 16) this.noteIndex = 0;
    }

    scheduleNote(beatNumber: number, time: number) {
        if (this.isMuted) return;

        // Simple Bassline (Cyberpunk/Darkwave style)
        // Root notes: C (low) -> G -> F -> G

        // Bass Kick on 0, 4, 8, 12
        if (beatNumber % 4 === 0) {
            this.playKick(time);
        }

        // Hi-hat on every off-beat 16th
        if (beatNumber % 2 !== 0) {
            this.playHiHat(time);
        }

        // Snare on 4 and 12
        if (beatNumber === 4 || beatNumber === 12) {
             this.playSnare(time);
        }

        // Bass Synth
        if (beatNumber === 0 || beatNumber === 3 || beatNumber === 8 || beatNumber === 11) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Progression: C2, G1, F1, G1
            // C2 = 65.41
            // G1 = 49.00
            // F1 = 43.65
            const cycle = Math.floor(Date.now() / 4000) % 4; // Change root occasionally
            const notes = [65.41, 49.00, 43.65, 49.00];

            osc.frequency.value = notes[cycle];
            osc.type = 'sawtooth';

            // Filter for that "acid" / synth bass feel
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;

            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(time);
            osc.stop(time + 0.2);
        }
    }

    playKick(time: number) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.4, time); // Louder kick
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time: number) {
        // Noise buffer for snare
        const bufferSize = this.ctx.sampleRate * 0.1; // 0.1s
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        noise.connect(gain);
        gain.connect(this.masterGain);
        noise.start(time);
    }

    playHiHat(time: number) {
        // High frequency noise or metal tone
        // Simplified: high square wave short decay
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 8000;
        // Highpass filter
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.05);
    }
}
