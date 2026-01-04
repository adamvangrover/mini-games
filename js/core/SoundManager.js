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
        this.masterGain.connect(this.analyser);

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
            chiptune: [0, 2, 4, 5, 7, 9, 11], // Major Scale
            synthwave: [0, 3, 5, 7, 10], // Minor Pentatonic / Aeolian
            industrial: [0, 1, 6, 7, 8], // Locrian/Phrygian dark
            lofi: [0, 3, 5, 7, 10, 14], // Minor 9th chill
            dubstep: [0, 1, 3, 5, 6, 7, 10], // Phrygian Dominant-ish
            dnb: [0, 3, 5, 7, 10], // Minor Pentatonic
            jazz: [0, 3, 5, 6, 7, 10, 11], // Blues Scale
            classical: [0, 4, 7, 12, 16, 19] // Major Arpeggio
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
        if (this.scales[style]) {
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

        const sfxVol = 1.0;

        switch (type) {
            case 'click': this.playTone(800, 'sine', 0.1, sfxVol); break;
            case 'hover': this.playTone(400, 'sine', 0.05, sfxVol * 0.5); break;
            case 'jump': this.playTone(300, 'square', 0.1, sfxVol, true); break;
            case 'explosion': this.playNoise(0.3, sfxVol); break;
            case 'score': this.playTone(1200, 'triangle', 0.1, sfxVol); break;
            case 'shoot': this.playTone(800, 'sawtooth', 0.1, sfxVol * 0.8, false, true); break;
            case 'gameover': this.playTone(150, 'sawtooth', 0.5, sfxVol, false, true); break;
            case 'coin': this.playTone(1500, 'sine', 0.1, sfxVol); break;
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
        }
    }

    scheduleNote(beatNumber, time) {
        // beatNumber is 0..15 (16th notes)
        const style = this.currentStyle;
        const root = 110; // A2

        // --- RHYTHM ---
        if (style === 'acid' || style === 'chiptune' || style === 'synthwave') {
            // 4-on-the-floor
            if (beatNumber % 4 === 0) {
                this.playKick(time);
            }
        }
        else if (style === 'industrial') {
            // Broken beat
            if (beatNumber === 0 || beatNumber === 10) this.playKick(time, 0.9, true); // Distorted kick
        }
        else if (style === 'lofi') {
            // Slow kick on 1
            if (beatNumber === 0) this.playKick(time, 0.6);
        }
        else if (style === 'dubstep') {
            // Half-time feel (Kick on 1, Snare on 3 equivalent - here beats are 16th notes)
            // 16th notes: 0..15. Kick on 0. Snare on 8.
            if (beatNumber === 0) this.playKick(time, 1.0, true);
            if (beatNumber === 8) this.playSnare(time, true, 0.8); // Big snare
            if (beatNumber === 14) this.playKick(time, 0.6, true); // Shuffle kick
        }
        else if (style === 'dnb') {
            // Amen break pattern approx: Kick 0, 10. Snare 4, 12.
            if (beatNumber === 0 || beatNumber === 10) this.playKick(time, 0.8);
            if (beatNumber === 4 || beatNumber === 12) this.playSnare(time, false, 0.6);
            if (beatNumber % 2 === 0) this.playHiHat(time, 0.03, 0.4); // Fast hats
        }
        else if (style === 'jazz') {
            // Swing ride: Ding (0), Ding (4), Da (6) Ding (8) ...
            // Simplified: 0, 4, 8, 12 (Quarter notes) + 14 (Swing 8th)
            if (beatNumber % 4 === 0) this.playHiHat(time, 0.1, 0.3); // Ride tick
            if (beatNumber % 8 === 6) this.playHiHat(time, 0.05, 0.2); // Swing skip
        }
        else if (style === 'classical') {
            // No drums
        }

        // Snares / HiHats
        if (style === 'synthwave') {
            if (beatNumber % 8 === 4) this.playSnare(time, true); // Gated snare
            if (beatNumber % 2 === 0) this.playHiHat(time);
        }
        else if (style === 'industrial') {
            if (beatNumber % 8 === 4) this.playSnare(time, false, 0.4); // Metallic snare
            if (beatNumber % 2 === 0) this.playHiHat(time, 0.05, 0.8);
        }
        else if (style === 'lofi') {
            if (beatNumber % 8 === 4) this.playSnare(time, false, 0.2); // Soft snare
            if (beatNumber % 4 === 2) this.playHiHat(time, 0.05, 0.3); // Soft hat
        }
        else if (style === 'glitch') {
            if (Math.random() < 0.3) this.playGlitchNoise(time);
            if (beatNumber % 8 === 0 && Math.random() > 0.5) this.playKick(time);
        }
        else if (style === 'ambient') {
            if (beatNumber === 0) this.playPad(time, 4); // Long drone
        }

        // --- MELODY / BASS ---
        const scale = this.scales[style] || this.scales.acid;

        if (style === 'acid') {
            if (Math.random() > 0.4) {
                const note = scale[Math.floor(Math.random() * scale.length)];
                const freq = (root * 2) * Math.pow(2, note / 12);
                const accent = Math.random() > 0.8;
                const slide = Math.random() > 0.8;
                this.playAcidSynth(freq, time, 0.15, accent, slide);
            }
        }
        else if (style === 'chiptune') {
            if (beatNumber % 2 === 0) {
                const note = scale[Math.floor(Math.random() * scale.length)];
                const freq = (root * 4) * Math.pow(2, note / 12);
                this.playChiptunePulse(freq, time, 0.1);
            }
        }
        else if (style === 'synthwave') {
            // Driving Bass (Eighth notes)
            if (beatNumber % 2 === 0) {
                const note = scale[0]; // Root
                const freq = root * Math.pow(2, note / 12);
                this.playSawBass(freq, time, 0.12);
            }
            // Occasional arp
            if (beatNumber % 4 === 0 && Math.random() > 0.5) {
                 const note = scale[Math.floor(Math.random() * scale.length)];
                 const freq = (root * 4) * Math.pow(2, note / 12);
                 this.playTone(freq, 'sawtooth', 0.2, 0.1);
            }
        }
        else if (style === 'industrial') {
            if (beatNumber % 4 === 0) {
                 const note = scale[Math.floor(Math.random() * scale.length)];
                 const freq = (root * 0.5) * Math.pow(2, note / 12);
                 this.playTone(freq, 'sawtooth', 0.1, 0.3);
            }
        }
        else if (style === 'lofi') {
            // Chord hit once per bar or so
            if (beatNumber === 0) {
                // Play a generic minor 9th chord
                const notes = [0, 3, 7, 10, 14];
                notes.forEach((n, i) => {
                    const freq = (root * 2) * Math.pow(2, n/12);
                    setTimeout(() => { // Strum effect
                        this.playTone(freq, 'sine', 1.5, 0.15);
                    }, i * 20);
                });
            }
        }
        else if (style === 'dubstep') {
            // Wobble Bass
            if (beatNumber === 0) {
                 const freq = (root * 0.5); // Low bass
                 this.playWobbleBass(freq, time, 0.5); // Wub
            }
            if (beatNumber === 8) {
                 const freq = (root * 0.5) * Math.pow(2, scale[2]/12);
                 this.playWobbleBass(freq, time, 0.5); // Wub
            }
            // High synth
            if (beatNumber === 12) {
                this.playTone(root*4, 'sawtooth', 0.1, 0.1);
            }
        }
        else if (style === 'dnb') {
            // Fast rolling bass
            if (beatNumber % 4 === 0) {
                const note = scale[Math.floor(Math.random() * 3)]; // Low notes
                const freq = (root * 0.5) * Math.pow(2, note/12);
                this.playSawBass(freq, time, 0.15);
            }
        }
        else if (style === 'jazz') {
            // Walking Bass (Quarter notes)
            if (beatNumber % 4 === 0) {
                 const note = scale[Math.floor(Math.random() * scale.length)];
                 const freq = (root * 0.5) * Math.pow(2, note/12);
                 this.playTone(freq, 'sine', 0.2, 0.3); // Double bass ish
            }
            // Piano chords (random stabs)
            if (Math.random() < 0.1) {
                 const notes = [0, 4, 7, 11]; // Major 7
                 notes.forEach(n => {
                      const f = (root * 2) * Math.pow(2, n/12);
                      this.playTone(f, 'triangle', 0.3, 0.1);
                 });
            }
        }
        else if (style === 'classical') {
            // Alberti Bass Arpeggio (16th notes)
            const arpPattern = [0, 4, 7, 4]; // Root, 5th, Octave, 5th relative indices
            const noteIdx = arpPattern[beatNumber % 4];
            const note = scale[noteIdx % scale.length];
            const freq = (root * 2) * Math.pow(2, note/12);
            this.playTone(freq, 'sine', 0.2, 0.15);

            // Melody on top (slower)
            if (beatNumber % 8 === 0) {
                const melNote = scale[Math.floor(Math.random() * scale.length)];
                const melFreq = (root * 4) * Math.pow(2, melNote/12);
                this.playTone(melFreq, 'triangle', 0.4, 0.1);
            }
        }
    }

    playWobbleBass(freq, time, duration) {
        const osc = this.audioCtx.createOscillator();
        const filter = this.audioCtx.createBiquadFilter();
        const gain = this.audioCtx.createGain();
        const lfo = this.audioCtx.createOscillator();
        const lfoGain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.Q.value = 10;

        // LFO modulates filter frequency
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(3 + Math.random()*3, time); // 3-6 Hz wobble
        lfoGain.gain.setValueAtTime(500, time); // Modulation depth

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        filter.frequency.setValueAtTime(600, time); // Base cutoff

        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGainNode);

        osc.start(time);
        lfo.start(time);
        osc.stop(time + duration);
        lfo.stop(time + duration);
    }

    // --- Instruments ---

    playKick(time, vol = 0.8, distorted = false) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        if (distorted) osc.type = 'square';
        else osc.type = 'sine';

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        osc.connect(gain);
        gain.connect(this.bgmGainNode);
        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time, gated = false, vol = 0.2) {
        const dur = gated ? 0.2 : 0.1;

        // Noise part
        this.playNoiseOneShot(time, dur, vol);

        // Tonal part
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(250, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.connect(gain);
        gain.connect(this.bgmGainNode);
        osc.start(time);
        osc.stop(time + dur);
    }

    playHiHat(time, dur = 0.05, vol = 0.1) {
        // High pass noise
        const bufferSize = this.audioCtx.sampleRate * dur;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

        const node = this.audioCtx.createBufferSource();
        node.buffer = buffer;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        node.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGainNode);
        node.start(time);
    }

    playNoiseOneShot(time, duration, vol) {
        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const node = this.audioCtx.createBufferSource();
        node.buffer = buffer;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, time);
        if (duration > 0.1) {
             gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        } else {
             gain.gain.linearRampToValueAtTime(0, time + duration);
        }

        node.connect(gain);
        gain.connect(this.bgmGainNode);
        node.start(time);
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
        filter.Q.value = accent ? 20 : 5;
        filter.frequency.setValueAtTime(accent ? 800 : 400, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + duration);

        gain.gain.setValueAtTime(accent ? 0.3 : 0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGainNode);

        osc.start(time);
        osc.stop(time + duration);
    }

    playSawBass(freq, time, duration) {
        const osc = this.audioCtx.createOscillator();
        const filter = this.audioCtx.createBiquadFilter();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.exponentialRampToValueAtTime(200, time + duration);

        gain.gain.setValueAtTime(0.4, time);
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
        gain.gain.setValueAtTime(0, time + duration);
        osc.connect(gain);
        gain.connect(this.bgmGainNode);
        osc.start(time);
        osc.stop(time + duration);
    }

    playPad(time, duration) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 1);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(gain);
        gain.connect(this.bgmGainNode);
        osc.start(time);
        osc.stop(time + duration);
    }

    playGlitchNoise(time) {
        const dur = 0.05 + Math.random() * 0.1;
        this.playNoiseOneShot(time, dur, 0.2);
    }
}
