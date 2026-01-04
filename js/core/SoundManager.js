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

        this.bgmOscillators = [];
        this.bgmGainNode = null;
        this.analyserNode = null;

        // Audio Graph Setup
        this.bgmGainNode = this.audioCtx.createGain();
        this.analyserNode = this.audioCtx.createAnalyser();
        this.analyserNode.fftSize = 256;

        this.bgmGainNode.connect(this.analyserNode);
        this.analyserNode.connect(this.audioCtx.destination);

        this.bgmGainNode.gain.value = this.muted ? 0 : this.volume;

        this.isPlayingBGM = false;
        this.rhythmTimeout = null;

        // Jukebox Tracks (Procedural)
        this.tracks = {
            'default': { name: 'Neon Beat', bpm: 120, baseFreq: 110, style: 'basic' },
            'track1': { name: 'Synthwave Highway', bpm: 140, baseFreq: 146.83, style: 'arpeggio' }, // D3
            'track2': { name: 'Cyber Core', bpm: 100, baseFreq: 87.31, style: 'industrial' }, // F2
            'track3': { name: 'Acid Rain', bpm: 125, baseFreq: 110, style: 'acid' },
            'track4': { name: '8-Bit Hero', bpm: 160, baseFreq: 220, style: 'chiptune' },
            'track5': { name: 'Deep Space', bpm: 60, baseFreq: 55, style: 'ambient' },
            'track6': { name: 'Glitch Hop', bpm: 95, baseFreq: 98, style: 'glitch' }
        };
        this.currentTrackId = 'default';

        SoundManager.instance = this;
    }

    static getInstance() {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    // --- Audio Data ---
    getAudioData() {
        if (!this.analyserNode) return new Uint8Array(0);
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyserNode.getByteFrequencyData(dataArray);
        return dataArray;
    }

    getAverageVolume() {
        const data = this.getAudioData();
        let sum = 0;
        for(let i=0; i<data.length; i++) sum += data[i];
        return sum / data.length;
    }

    // --- Controls ---

    toggleMute() {
        this.muted = !this.muted;
        this.saveSystem.setSetting('muted', this.muted);

        if (this.muted) {
            this.bgmGainNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
        } else {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            this.bgmGainNode.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.1);
        }
        return this.muted;
    }

    setBGMVolume(val) {
        if (val < 0) val = 0;
        if (val > 1) val = 1;
        this.volume = val;
        this.saveSystem.setSetting('volume', this.volume);

        if (!this.muted) {
            this.bgmGainNode.gain.setTargetAtTime(val, this.audioCtx.currentTime, 0.5);
        }
    }

    getVolume() { return this.volume; }

    // --- SFX ---

    playSound(type) {
        if (this.muted && type !== 'click') return;
        if (this.muted) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const sfxVol = Math.min(this.volume * 2, 1.0);

        switch (type) {
            case 'click': this.playTone(800, 'sine', 0.1, false, false, sfxVol); break;
            case 'hover': this.playTone(600, 'sine', 0.05, false, false, sfxVol * 0.5); break;
            case 'jump': this.playTone(400, 'square', 0.1, true, false, sfxVol); break;
            case 'explosion': this.playNoise(0.3, sfxVol); break;
            case 'score': this.playTone(1200, 'sine', 0.05, false, false, sfxVol); break;
            case 'shoot': this.playTone(600, 'sawtooth', 0.1, false, true, sfxVol); break;
            case 'gameover': this.playTone(150, 'sawtooth', 0.5, false, true, sfxVol); break;
            case 'win': this.playArpeggio([523.25, 659.25, 783.99, 1046.50], 0.1, sfxVol); break;
        }
    }

    playTone(freq, type, duration, slideUp = false, slideDown = false, vol = 0.1) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        if (slideUp) osc.frequency.exponentialRampToValueAtTime(freq * 2, this.audioCtx.currentTime + duration);
        if (slideDown) osc.frequency.exponentialRampToValueAtTime(freq / 2, this.audioCtx.currentTime + duration);

        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination); // SFX bypasses BGM bus/analyser for clarity
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playArpeggio(notes, delay, vol) {
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.2, false, false, vol), i * delay * 1000);
        });
    }

    playNoise(duration, vol = 0.1) {
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
        gain.connect(this.audioCtx.destination);
        noise.start();
    }

    // --- BGM / Jukebox Logic ---

    startBGM() {
        if (this.isPlayingBGM) return;
        this.isPlayingBGM = true;
        this.playCurrentTrackLoop();
    }

    stopBGM() {
        this.isPlayingBGM = false;
        this.stopOscillators();
        if (this.rhythmTimeout) clearTimeout(this.rhythmTimeout);
    }

    stopOscillators() {
        if (this.bgmOscillators) {
            this.bgmOscillators.forEach(osc => {
                try { osc.stop(); } catch(e) {}
            });
        }
        this.bgmOscillators = [];
    }

    nextTrack() {
        const unlocked = ['default'];
        for(let i=1; i<=6; i++) {
            if (this.saveSystem.isItemUnlocked(`music_track_${i}`)) unlocked.push(`track${i}`);
        }

        let currentIndex = unlocked.indexOf(this.currentTrackId);
        currentIndex = (currentIndex + 1) % unlocked.length;
        this.currentTrackId = unlocked[currentIndex];

        if (this.isPlayingBGM) {
            this.stopOscillators();
            if (this.rhythmTimeout) clearTimeout(this.rhythmTimeout);
            this.playCurrentTrackLoop();
        }
        return this.tracks[this.currentTrackId].name;
    }

    playCurrentTrackLoop() {
        if (!this.isPlayingBGM) return;
        const track = this.tracks[this.currentTrackId] || this.tracks['default'];

        try {
            if (track.style === 'ambient') {
                this.playAmbientDrone(track);
            } else if (track.style === 'chiptune') {
                this.playChiptuneBase(track);
            } else {
                this.playStandardBase(track);
            }
            this.startRhythm(track, 0);
        } catch(e) {
            console.warn("AudioContext issue:", e);
        }
    }

    playStandardBase(track) {
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        osc1.type = 'sine'; osc1.frequency.value = track.baseFreq;
        osc2.type = 'triangle'; osc2.frequency.value = track.baseFreq * 1.01; // Detune
        osc1.connect(this.bgmGainNode);
        osc2.connect(this.bgmGainNode);
        osc1.start(); osc2.start();
        this.bgmOscillators.push(osc1, osc2);
    }

    playAmbientDrone(track) {
        const osc = this.audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = track.baseFreq;

        // LFO for modulation
        const lfo = this.audioCtx.createOscillator();
        lfo.frequency.value = 0.1;
        const lfoGain = this.audioCtx.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        osc.connect(this.bgmGainNode);
        osc.start();
        this.bgmOscillators.push(osc, lfo);
    }

    playChiptuneBase(track) {
        const osc = this.audioCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = track.baseFreq;
        const gain = this.audioCtx.createGain();
        gain.gain.value = 0.3;
        osc.connect(gain);
        gain.connect(this.bgmGainNode);
        osc.start();
        this.bgmOscillators.push(osc);
    }

    startRhythm(track, beatCount) {
        if (!this.isPlayingBGM) return;
        if (this.audioCtx.state !== 'running') {
            this.rhythmTimeout = setTimeout(() => this.startRhythm(track, beatCount), 1000);
            return;
        }

        const now = this.audioCtx.currentTime;
        const stepTime = 15 / track.bpm; // 16th notes roughly

        // Sequencer Logic based on Style
        if (track.style === 'acid') {
            this.playAcidStep(now, beatCount, track);
        } else if (track.style === 'glitch') {
            this.playGlitchStep(now, beatCount, track);
        } else if (track.style !== 'ambient') {
            this.playBasicStep(now, beatCount, track);
        }

        this.rhythmTimeout = setTimeout(() => this.startRhythm(track, beatCount + 1), stepTime * 1000);
    }

    playBasicStep(time, step, track) {
        // Simple 4/4 Kick
        if (step % 4 === 0) {
            this.triggerDrum(time, 150, 0.01, 0.8, 'sine');
        }
        // HiHat
        if (step % 2 === 0) {
            this.triggerNoise(time, 0.05, 0.1);
        }
    }

    playAcidStep(time, step, track) {
        // 303-ish Bassline
        const note = track.baseFreq * (1 + (step % 8) / 8);
        const osc = this.audioCtx.createOscillator();
        const filter = this.audioCtx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = note;
        filter.type = 'lowpass';
        filter.Q.value = 10;
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.linearRampToValueAtTime(800, time + 0.1);

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGainNode);

        osc.start(time);
        osc.stop(time + 0.1);

        // Heavy Kick
        if (step % 4 === 0) this.triggerDrum(time, 100, 0.01, 1.0, 'square');
    }

    playGlitchStep(time, step, track) {
        // Random Hits
        if (Math.random() > 0.5) {
            const freq = Math.random() * 1000;
            this.triggerDrum(time, freq, 0.05, 0.2, 'sawtooth');
        }
        if (step % 8 === 0) {
             this.triggerNoise(time, 0.2, 0.3); // Crash
        }
    }

    triggerDrum(time, freq, decay, vol, type) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(10, time + decay);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
        osc.connect(gain);
        gain.connect(this.bgmGainNode);
        osc.start(time);
        osc.stop(time + decay);
    }

    triggerNoise(time, duration, vol) {
        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const node = this.audioCtx.createBufferSource();
        node.buffer = buffer;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        node.connect(gain);
        gain.connect(this.bgmGainNode);
        node.start(time);
    }
}
