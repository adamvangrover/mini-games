import SaveSystem from './SaveSystem.js';

export default class SoundManager {
    constructor() {
        if (SoundManager.instance) {
            return SoundManager.instance;
        }

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.saveSystem = SaveSystem.getInstance();

        // Load settings
        const settings = this.saveSystem.getSettings();
        this.muted = settings.muted || false;
        this.volume = settings.volume !== undefined ? settings.volume : 0.1;

        // --- Audio Graph ---
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.volume;
        this.masterGain.connect(this.audioCtx.destination);

        // Analyser for Visualization
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.masterGain.connect(this.analyser); // Connect output to analyser (visualization sees post-gain? Or pre-gain? Usually pre-mute is better but post-gain is easier to sync)
        // Wait, if I mute, visualizer dies. Better: Source -> Analyser -> MasterGain -> Dest.
        // But let's keep it simple: Source -> MasterGain -> Analyser -> Dest (Visuals react to heard volume).

        this.bgmGainNode = this.audioCtx.createGain();
        this.bgmGainNode.connect(this.masterGain);

        this.sfxGainNode = this.audioCtx.createGain();
        this.sfxGainNode.connect(this.masterGain);

        // --- Procedural Jukebox State ---
        this.isPlayingBGM = false;
        this.currentStyle = this.saveSystem.getEquippedItem('music_disk') || 'acid';
        this.sequencerTimer = null;
        this.beatCount = 0;
        this.tempo = 120; // BPM
        this.nextNoteTime = 0;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s

        this.scales = {
            acid: [0, 2, 3, 7, 10], // Minor pentatonic-ish
            glitch: [0, 1, 6, 7, 11], // Chromatic/Dissonant
            ambient: [0, 4, 7, 9, 11], // Major 7th / Pentatonic
            chiptune: [0, 2, 4, 5, 7, 9, 11] // Major Scale
        };

        SoundManager.instance = this;
    }

    static getInstance() {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    // --- Core Controls ---

    toggleMute() {
        this.muted = !this.muted;
        this.saveSystem.setSetting('muted', this.muted);

        if (this.muted) {
            this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
        } else {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            this.masterGain.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.1);
        }
        return this.muted;
    }

    setBGMVolume(val) {
        if (val < 0) val = 0;
        if (val > 1) val = 1;
        this.volume = val;
        this.saveSystem.setSetting('volume', this.volume);
        if (!this.muted) {
            this.masterGain.gain.setTargetAtTime(val, this.audioCtx.currentTime, 0.2);
        }
    }

    getVolume() { return this.volume; }

    setMusicStyle(style) {
        if (['acid', 'glitch', 'ambient', 'chiptune'].includes(style)) {
            this.currentStyle = style;
        }
    }

    getAudioData() {
        if (!this.analyser) return new Uint8Array(0);
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }

    // --- SFX System ---

    playSound(type) {
        if (this.muted && type !== 'click') return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        // SFX are slightly louder than BGM usually
        const sfxVol = 1.0;

        switch (type) {
            case 'click': this.playTone(800, 'sine', 0.1, sfxVol); break;
            case 'hover': this.playTone(400, 'sine', 0.05, sfxVol * 0.5); break;
            case 'jump': this.playTone(300, 'square', 0.1, sfxVol, true); break;
            case 'explosion': this.playNoise(0.3, sfxVol); break;
            case 'score': this.playTone(1200, 'triangle', 0.1, sfxVol); break;
            case 'shoot': this.playTone(800, 'sawtooth', 0.1, sfxVol * 0.8, false, true); break;
            case 'gameover': this.playTone(150, 'sawtooth', 0.5, sfxVol, false, true); break;
        }
    }

    playTone(freq, type, duration, vol = 0.5, slideUp = false, slideDown = false) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        if (slideUp) osc.frequency.exponentialRampToValueAtTime(freq * 2, this.audioCtx.currentTime + duration);
        if (slideDown) osc.frequency.exponentialRampToValueAtTime(freq / 2, this.audioCtx.currentTime + duration);

        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.sfxGainNode);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playNoise(duration, vol = 0.5) {
        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.sfxGainNode);
        noise.start();
    }

    // --- Procedural Jukebox ---

    startBGM() {
        if (this.isPlayingBGM) return;
        this.isPlayingBGM = true;

        // Update style from save just in case
        this.currentStyle = this.saveSystem.getEquippedItem('music_disk') || 'acid';
        if (this.currentStyle === 'default') this.currentStyle = 'acid';

        if (this.audioCtx.state === 'suspended') {
            // We can try to resume, but user gesture is needed usually.
        }

        this.nextNoteTime = this.audioCtx.currentTime;
        this.scheduler();
    }

    stopBGM() {
        this.isPlayingBGM = false;
        if (this.sequencerTimer) clearTimeout(this.sequencerTimer);
    }

    scheduler() {
        if (!this.isPlayingBGM) return;

        // While there are notes that will need to play before the next interval,
        // schedule them and advance the pointer.
        while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.beatCount, this.nextNoteTime);
            this.advanceNote();
        }

        this.sequencerTimer = setTimeout(() => this.scheduler(), this.lookahead);
    }

    advanceNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        // 16th notes
        this.nextNoteTime += 0.25 * secondsPerBeat;
        this.beatCount++;
        if (this.beatCount >= 16) {
            this.beatCount = 0;
            // Potentially change scale/root every bar?
        }
    }

    scheduleNote(beatNumber, time) {
        // beatNumber is 0..15 (16th notes)

        // 1. Kick / Bass (Rhythm)
        if (this.currentStyle === 'acid' || this.currentStyle === 'chiptune') {
            if (beatNumber % 4 === 0) {
                this.playKick(time);
            }
        } else if (this.currentStyle === 'glitch') {
            if (Math.random() < 0.3) this.playGlitchNoise(time);
            if (beatNumber % 8 === 0 && Math.random() > 0.5) this.playKick(time);
        } else if (this.currentStyle === 'ambient') {
            // Ambient is pad based, minimal drums
            if (beatNumber === 0) this.playPad(time, 4); // Long drone
        }

        // 2. Lead / Arp
        const scale = this.scales[this.currentStyle] || this.scales.acid;
        const root = 220; // A3

        if (this.currentStyle === 'acid') {
            // 303-ish sequence: active on random 16ths
            if (Math.random() > 0.4) {
                const note = scale[Math.floor(Math.random() * scale.length)];
                const freq = root * Math.pow(2, note / 12);
                const accent = Math.random() > 0.8;
                const slide = Math.random() > 0.8;
                this.playAcidSynth(freq, time, 0.15, accent, slide);
            }
        }
        else if (this.currentStyle === 'chiptune') {
            // Arpeggio every beat
            if (beatNumber % 2 === 0) {
                const note = scale[Math.floor(Math.random() * scale.length)];
                // Higher octave
                const freq = root * 2 * Math.pow(2, note / 12);
                this.playChiptunePulse(freq, time, 0.1);
            }
        }
        else if (this.currentStyle === 'glitch') {
             if (Math.random() > 0.7) {
                const freq = root * (1 + Math.random());
                this.playTone(freq, 'sawtooth', 0.05, 0.1);
             }
        }
    }

    // --- Instruments ---

    playKick(time) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        osc.connect(gain);
        gain.connect(this.bgmGainNode);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    playAcidSynth(freq, time, duration, accent = false, slide = false) {
        const osc = this.audioCtx.createOscillator();
        const filter = this.audioCtx.createBiquadFilter();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        if (slide) {
            osc.frequency.exponentialRampToValueAtTime(freq * 2, time + duration);
        }

        filter.type = 'lowpass';
        filter.Q.value = accent ? 20 : 5; // Resonance
        filter.frequency.setValueAtTime(accent ? 800 : 400, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + duration); // Envelope

        gain.gain.setValueAtTime(accent ? 0.3 : 0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGainNode);

        osc.start(time);
        osc.stop(time + duration);
    }

    playChiptunePulse(freq, time, duration) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.setValueAtTime(0, time + duration); // Sharp cut
        osc.connect(gain);
        gain.connect(this.bgmGainNode);
        osc.start(time);
        osc.stop(time + duration);
    }

    playPad(time, duration) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, time); // A2

        // Attack
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 1);
        // Release
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(gain);
        gain.connect(this.bgmGainNode);
        osc.start(time);
        osc.stop(time + duration);
    }

    playGlitchNoise(time) {
        const dur = 0.05 + Math.random() * 0.1;
        const bufferSize = this.audioCtx.sampleRate * dur;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const node = this.audioCtx.createBufferSource();
        node.buffer = buffer;

        const gain = this.audioCtx.createGain();
        gain.gain.value = 0.2;

        node.connect(gain);
        gain.connect(this.bgmGainNode);
        node.start(time);
    }
}
