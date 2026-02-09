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
        // Bolt Optimization: Pre-allocate data array to avoid GC every frame
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.masterGain.connect(this.analyser);

        this.bgmGainNode = this.audioCtx.createGain();
        this.bgmGainNode.connect(this.masterGain);

        this.sfxGainNode = this.audioCtx.createGain();
        this.sfxGainNode.connect(this.masterGain);

        // --- Voice / Speech ---
        this.synth = window.speechSynthesis;
        this.voices = [];
        if (this.synth) {
             // Load voices async
             this.voices = this.synth.getVoices();
             this.synth.onvoiceschanged = () => {
                 this.voices = this.synth.getVoices();
             };
        }
        this.isSpeaking = false;

        // --- Effects Rack ---
        this.delayNode = this.audioCtx.createDelay(1.0);
        this.delayFeedback = this.audioCtx.createGain();
        this.delayGain = this.audioCtx.createGain();

        this.delayNode.delayTime.value = 0.3;
        this.delayFeedback.gain.value = 0.4;
        this.delayGain.gain.value = 0.0; // Dry by default

        // Route: Aux Send -> Delay -> Feedback -> Delay
        //                -> Master
        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);
        this.delayNode.connect(this.masterGain);
        // Connect BGM to delay send (optional per style)
        this.bgmGainNode.connect(this.delayGain);
        this.delayGain.connect(this.delayNode);

        // --- Bolt Optimization: Shared Noise Buffer ---
        // Pre-generate 2 seconds of noise to reuse, saving massive GC overhead
        this.noiseBufferSize = this.audioCtx.sampleRate * 2;
        this.noiseBuffer = this.audioCtx.createBuffer(1, this.noiseBufferSize, this.audioCtx.sampleRate);
        const noiseData = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < this.noiseBufferSize; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }

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
            classical: [0, 4, 7, 12, 16, 19], // Major Arpeggio
            rock: [0, 3, 5, 7, 10],
            reggae: [0, 4, 7, 11], // Major 7 chords
            country: [0, 2, 4, 7, 9], // Major Pentatonic

            // New Genres
            funk: [0, 2, 3, 5, 7, 9, 10], // Dorian mode
            metal: [0, 1, 3, 5, 6, 7, 10], // Phrygian Dominant (Exotic/Dark)
            blues: [0, 3, 5, 6, 7, 10], // Blues Scale
            edm: [0, 3, 5, 7, 10] // Minor Pentatonic (safe for dance)
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

    nextMusicStyle() {
        const styles = Object.keys(this.scales);
        let idx = styles.indexOf(this.currentStyle);
        idx = (idx + 1) % styles.length;
        this.setMusicStyle(styles[idx]);
        return styles[idx];
    }

    setMusicStyle(style) {
        if (this.scales[style]) {
            this.currentStyle = style;
            this.saveSystem.setEquippedItem('music_disk', style); // Persist preference

            // Tempo & Effects Defaults
            this.delayGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1); // Reset FX

            if (style === 'dnb') this.tempo = 170;
            else if (style === 'lofi') this.tempo = 80;
            else if (style === 'ambient') { this.tempo = 60; this.delayGain.gain.setTargetAtTime(0.5, this.audioCtx.currentTime, 0.1); }
            else if (style === 'reggae') { this.tempo = 70; this.delayGain.gain.setTargetAtTime(0.4, this.audioCtx.currentTime, 0.1); this.delayNode.delayTime.value = 0.4; }
            else if (style === 'jazz') this.tempo = 130;
            else if (style === 'rock') this.tempo = 140;
            else if (style === 'metal') this.tempo = 160;
            else if (style === 'funk') this.tempo = 110;
            else if (style === 'edm') this.tempo = 128;
            else if (style === 'blues') this.tempo = 90;
            else this.tempo = 120;
        }
    }

    // --- Speech Synthesis ---
    speak(text, pitch = 1.0, rate = 1.0, duckMusic = true) {
        if (!this.synth) return;
        if (this.muted) return;

        if (this.synth.speaking) {
            this.synth.cancel();
        }

        const utter = new SpeechSynthesisUtterance(text);
        utter.pitch = pitch;
        utter.rate = rate;

        // Pick a random voice or default
        if (this.voices.length > 0) {
            // Prefer a Google/Microsoft voice if available
            const preferred = this.voices.find(v => v.name.includes('Google') || v.name.includes('Microsoft'));
            if(preferred) utter.voice = preferred;
        }

        utter.onstart = () => {
            this.isSpeaking = true;
            if (duckMusic) this.bgmGainNode.gain.setTargetAtTime(this.volume * 0.2, this.audioCtx.currentTime, 0.5);
        };

        utter.onend = () => {
            this.isSpeaking = false;
            if (duckMusic) this.bgmGainNode.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.5);
        };

        this.synth.speak(utter);
    }

    stopSpeaking() {
        if (this.synth) this.synth.cancel();
        this.bgmGainNode.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.1);
    }

    /**
     * Gets the current frequency data.
     * @returns {Uint8Array} A shared buffer containing the data. Do not store this reference; copy it if you need a snapshot.
     */
    getAudioData() {
        if (!this.analyser) return new Uint8Array(0);
        // Bolt Optimization: Reuse pre-allocated array
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
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
        const noise = this.audioCtx.createBufferSource();
        // Bolt Optimization: Use shared buffer
        noise.buffer = this.noiseBuffer;
        noise.loop = true;
        // Randomize start to avoid pattern repetition
        const startOffset = Math.random() * this.noiseBuffer.duration;

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.sfxGainNode);
        noise.start(this.audioCtx.currentTime, startOffset, duration);
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

    stopAll() {
        this.stopBGM();
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
        if (style === 'acid' || style === 'chiptune' || style === 'synthwave' || style === 'rock' || style === 'country' || style === 'edm') {
            // 4-on-the-floor
            if (beatNumber % 4 === 0) this.playKick(time);
        }
        else if (style === 'metal') {
            // Double kick possibilities
            if (beatNumber % 4 === 0) this.playKick(time, 1.0, true); // Hard kick
            if (beatNumber % 4 === 2 && Math.random() > 0.6) this.playKick(time, 0.8, true); // Double bass
        }
        else if (style === 'funk') {
            // Syncopated kick
            if (beatNumber === 0) this.playKick(time);
            if (beatNumber === 10) this.playKick(time);
            if (beatNumber === 13) this.playKick(time, 0.6);
        }
        else if (style === 'blues') {
            // Shuffle feel (approximate with 16ths: 0, 3, 4, 7, 8...)
            // Simple slow kick on 1 and 3
            if (beatNumber === 0 || beatNumber === 8) this.playKick(time, 0.7);
        }
        else if (style === 'jazz') {
            // Swing ride pattern handled in hihats, soft kicks
            if (beatNumber === 0) this.playKick(time, 0.5);
            if (beatNumber === 10) this.playKick(time, 0.4);
        }
        else if (style === 'reggae') {
            // One Drop: Kick on 3 (beat 8 in 16ths)
            if (beatNumber === 8) this.playKick(time, 0.9);
        }
        else if (style === 'dnb') {
            // Amen Break-ish
            if (beatNumber === 0 || beatNumber === 10) this.playKick(time, 0.9);
            if (beatNumber === 7 && Math.random() > 0.5) this.playKick(time, 0.5);
        }
        else if (style === 'industrial') {
            if (beatNumber === 0 || beatNumber === 10) this.playKick(time, 0.9, true);
        }
        else if (style === 'lofi') {
            if (beatNumber === 0) this.playKick(time, 0.6);
        }
        else if (style === 'dubstep') {
            if (beatNumber === 0) this.playKick(time, 1.0, true);
            if (beatNumber === 8) this.playSnare(time, true, 0.8); // Big snare
            if (beatNumber === 14) this.playKick(time, 0.6, true);
        }

        // --- SNARES / HIHATS ---

        // Basic backbeat
        if (['rock', 'country', 'synthwave', 'edm', 'metal'].includes(style)) {
            if (beatNumber % 8 === 4) this.playSnare(time, style === 'metal');
            if (beatNumber % 2 === 0) this.playHiHat(time);
        }
        else if (style === 'funk') {
            if (beatNumber === 4 || beatNumber === 12) this.playSnare(time);
            // 16th note hihats
            if (Math.random() > 0.2) this.playHiHat(time, 0.03, beatNumber % 4 === 0 ? 0.4 : 0.2);
        }
        else if (style === 'blues') {
            if (beatNumber === 4 || beatNumber === 12) this.playSnare(time, false, 0.4);
            if (beatNumber % 4 === 0) this.playHiHat(time, 0.1, 0.3); // Ride-ish
            if (beatNumber % 4 === 3) this.playHiHat(time, 0.05, 0.2); // Swing
        }
        else if (style === 'jazz') {
            // Ride cymbal pattern: Ding, ding-a-ding
            if (beatNumber % 4 === 0) this.playHiHat(time, 0.1, 0.4);
            if (beatNumber % 4 === 3) this.playHiHat(time, 0.05, 0.3); // swing note
            if (beatNumber % 8 === 4) this.playSnare(time, false, 0.3); // brush snare
        }
        else if (style === 'dnb') {
            if (beatNumber === 4 || beatNumber === 12) this.playSnare(time, true, 0.8);
            if (beatNumber % 2 === 0) this.playHiHat(time, 0.05, 0.7);
            if (Math.random() > 0.7) this.playHiHat(time + 0.1, 0.02, 0.5);
        }

        // --- MELODY / HARMONY ---
        const scale = this.scales[style] || this.scales.acid;

        if (style === 'acid') {
            if (Math.random() > 0.4) {
                const note = scale[Math.floor(Math.random() * scale.length)];
                const freq = (root * 2) * Math.pow(2, note / 12);
                this.playAcidSynth(freq, time, 0.15, Math.random() > 0.8, Math.random() > 0.8);
            }
        }
        else if (style === 'metal') {
            // Chugging on low open string
            if (beatNumber % 2 === 0) {
                 this.playTone(root/2, 'sawtooth', 0.1, 0.5); // Palm mute chug
            }
            // Occasional power chord stab
            if (beatNumber === 0 || beatNumber === 6) {
                 const note = scale[Math.floor(Math.random() * 3)];
                 const freq = root * Math.pow(2, note / 12);
                 this.playTone(freq, 'sawtooth', 0.2, 0.4);
                 this.playTone(freq * 1.5, 'sawtooth', 0.2, 0.4); // 5th
            }
        }
        else if (style === 'funk') {
            // Slap bass
            if (beatNumber === 0 || beatNumber === 2) {
                const note = scale[0];
                const freq = (root * 0.5) * Math.pow(2, note/12);
                this.playTone(freq, 'square', 0.2, 0.6);
            }
            if (beatNumber === 10 || beatNumber === 14) {
                 const note = scale[Math.floor(Math.random()*scale.length)];
                 const freq = (root * 0.5) * Math.pow(2, note/12);
                 this.playTone(freq, 'square', 0.1, 0.5); // Pop
            }
            // Wah guitar chords (high)
            if (beatNumber === 4 || beatNumber === 12) {
                 const note = scale[Math.floor(Math.random()*scale.length)];
                 const freq = (root * 4) * Math.pow(2, note/12);
                 this.playTone(freq, 'triangle', 0.1, 0.2);
            }
        }
        else if (style === 'edm') {
            // Sidechain pads/bass
            if (beatNumber === 2 || beatNumber === 6 || beatNumber === 10 || beatNumber === 14) {
                 const note = scale[Math.floor(Math.random()*3)];
                 const freq = root * Math.pow(2, note/12);
                 this.playSawBass(freq, time, 0.2); // Off-beat bass
            }
            // Lead
            if (Math.random() < 0.3) {
                 const note = scale[Math.floor(Math.random() * scale.length)];
                 const freq = (root * 4) * Math.pow(2, note/12);
                 this.playTone(freq, 'sawtooth', 0.1, 0.2);
            }
        }
        else if (style === 'blues') {
            // Walking bass
            if (beatNumber % 4 === 0) {
                 const note = scale[Math.floor(Math.random() * scale.length)];
                 const freq = (root * 0.5) * Math.pow(2, note/12);
                 this.playTone(freq, 'sine', 0.4, 0.5);
            }
            // Organ licks
            if (Math.random() < 0.2) {
                 const note = scale[Math.floor(Math.random() * scale.length)];
                 const freq = (root * 2) * Math.pow(2, note/12);
                 this.playTone(freq, 'sine', 0.5, 0.3);
            }
        }
        else if (style === 'jazz') {
             if (beatNumber % 4 === 0) {
                 const note = scale[Math.floor(Math.random() * scale.length)];
                 const freq = (root * 0.5) * Math.pow(2, note / 12);
                 this.playTone(freq, 'sine', 0.4, 0.6);
             }
             if (Math.random() < 0.1) {
                 const note = scale[Math.floor(Math.random() * scale.length)];
                 const freq = (root * 2) * Math.pow(2, note / 12);
                 this.playTone(freq, 'triangle', 0.5, 0.2);
             }
        }
        else if (style === 'rock') {
            if (beatNumber % 2 === 0) {
                const note = scale[0];
                const freq = (root * 0.5) * Math.pow(2, note / 12);
                this.playSawBass(freq, time, 0.2);
            }
            if (beatNumber % 8 === 0 || beatNumber % 8 === 3) {
                 const note = scale[Math.floor(Math.random() * 3)];
                 const freq = root * Math.pow(2, note / 12);
                 this.playTone(freq, 'sawtooth', 0.3, 0.4);
                 this.playTone(freq * 1.5, 'sawtooth', 0.3, 0.4);
            }
        }
        else if (style === 'reggae') {
            if (beatNumber % 4 === 0 && Math.random() > 0.3) {
                const note = scale[Math.floor(Math.random() * scale.length)];
                const freq = (root * 0.5) * Math.pow(2, note / 12);
                this.playTone(freq, 'sine', 0.4, 0.8);
            }
            if (beatNumber === 4 || beatNumber === 12) {
                 const freq = root * 2;
                 this.playTone(freq, 'triangle', 0.1, 0.3);
                 this.playTone(freq * 1.2, 'triangle', 0.1, 0.3);
                 this.playTone(freq * 1.5, 'triangle', 0.1, 0.3);
            }
        }
        else if (style === 'country') {
            if (beatNumber % 4 === 0) {
                 const note = (beatNumber % 8 === 0) ? scale[0] : scale[3];
                 const freq = (root * 0.5) * Math.pow(2, note / 12);
                 this.playTone(freq, 'sine', 0.3, 0.5);
            }
        }
        else if (style === 'classical') {
            const arpPattern = [0, 4, 7, 4];
            const noteIdx = arpPattern[beatNumber % 4];
            const note = scale[noteIdx % scale.length];
            const freq = (root * 2) * Math.pow(2, note/12);
            this.playTone(freq, 'sine', 0.2, 0.15);

            if (beatNumber % 8 === 0) {
                const melNote = scale[Math.floor(Math.random() * scale.length)];
                const melFreq = (root * 4) * Math.pow(2, melNote/12);
                this.playTone(melFreq, 'triangle', 0.4, 0.1);
            }
        }
        else if (style === 'dnb') {
            if (beatNumber === 0) {
                 const note = scale[0];
                 const freq = (root * 0.5) * Math.pow(2, note / 12);
                 this.playSawBass(freq, time, 0.4);
            }
            if (beatNumber === 10) {
                 const note = scale[Math.floor(Math.random() * 3)];
                 const freq = (root * 0.5) * Math.pow(2, note / 12);
                 this.playSawBass(freq, time, 0.4);
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
            if (beatNumber % 2 === 0) {
                const note = scale[0];
                const freq = root * Math.pow(2, note / 12);
                this.playSawBass(freq, time, 0.12);
            }
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
            if (beatNumber === 0) {
                const notes = [0, 3, 7, 10, 14];
                notes.forEach((n, i) => {
                    const freq = (root * 2) * Math.pow(2, n/12);
                    setTimeout(() => {
                        this.playTone(freq, 'sine', 1.5, 0.15);
                    }, i * 20);
                });
            }
        }
        else if (style === 'dubstep') {
            if (beatNumber === 0) {
                 const freq = (root * 0.5);
                 this.playWobbleBass(freq, time, 0.5);
            }
            if (beatNumber === 8) {
                 const freq = (root * 0.5) * Math.pow(2, scale[2]/12);
                 this.playWobbleBass(freq, time, 0.5);
            }
            if (beatNumber === 12) {
                this.playTone(root*4, 'sawtooth', 0.1, 0.1);
            }
        }
        else if (style === 'glitch') {
            if (Math.random() < 0.3) this.playGlitchNoise(time);
            if (beatNumber % 8 === 0 && Math.random() > 0.5) this.playKick(time);
        }
        else if (style === 'ambient') {
            if (beatNumber === 0) this.playPad(time, 4);
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
        const node = this.audioCtx.createBufferSource();
        // Bolt Optimization: Use shared buffer
        node.buffer = this.noiseBuffer;
        node.loop = true;
        const startOffset = Math.random() * this.noiseBuffer.duration;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        node.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGainNode);
        node.start(time, startOffset, dur);
    }

    playNoiseOneShot(time, duration, vol) {
        const node = this.audioCtx.createBufferSource();
        // Bolt Optimization: Use shared buffer
        node.buffer = this.noiseBuffer;
        node.loop = true;
        const startOffset = Math.random() * this.noiseBuffer.duration;

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, time);
        if (duration > 0.1) {
             gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        } else {
             gain.gain.linearRampToValueAtTime(0, time + duration);
        }

        node.connect(gain);
        gain.connect(this.bgmGainNode);
        node.start(time, startOffset, duration);
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
