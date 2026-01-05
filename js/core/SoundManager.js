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

        // BGM System
        this.bgmGainNode = this.audioCtx.createGain();
        this.bgmGainNode.connect(this.audioCtx.destination);
        this.bgmGainNode.gain.value = this.muted ? 0 : this.volume;

        this.isPlayingBGM = false;
        this.rhythmTimeout = null;

        // Jukebox Tracks
        this.currentTrackIndex = 0;
        this.tracks = [
            { name: "Neon Drone", bpm: 2000, baseFreq: 110 },
            { name: "Cyber Pulse", bpm: 1000, baseFreq: 150 },
            { name: "Deep Space", bpm: 4000, baseFreq: 60 }
        ];
        this.currentTrack = this.tracks[0].name;

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

        // Persist
        this.saveSystem.setSetting('muted', this.muted);

        if (this.muted) {
            this.bgmGainNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
        } else {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            this.bgmGainNode.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.1);
        }
        return this.muted;
    }

    setBGMVolume(val) {
        // Clamp 0 to 1
        if (val < 0) val = 0;
        if (val > 1) val = 1;

        this.volume = val;

        // Persist
        this.saveSystem.setSetting('volume', this.volume);

        if (!this.muted) {
            this.bgmGainNode.gain.setTargetAtTime(val, this.audioCtx.currentTime, 0.5);
        }
    }

    getVolume() {
        return this.volume;
    }

    playSound(type) {
        if (this.muted && type !== 'click') return; // Allow click if UI needs it? No, mute should be absolute mostly.
        if (this.muted) return;

        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // SFX volume relative to master volume (slightly louder)
        const sfxVol = Math.min(this.volume * 2, 1.0);

        switch (type) {
            case 'click':
                this.playTone(800, 'sine', 0.1, false, false, sfxVol);
                break;
            case 'hover':
                this.playTone(600, 'sine', 0.05);
                break;
            case 'jump':
                this.playTone(400, 'square', 0.1, true, false, sfxVol);
                break;
            case 'explosion':
                this.playNoise(0.3, sfxVol);
                break;
            case 'score':
                this.playTone(1200, 'sine', 0.05, false, false, sfxVol);
                break;
            case 'shoot':
                this.playTone(600, 'sawtooth', 0.1, false, true, sfxVol);
                break;
            case 'gameover':
                 this.playTone(150, 'sawtooth', 0.5, false, true, sfxVol);
                 break;
        }
    }

    playTone(freq, type, duration, slideUp = false, slideDown = false, vol = 0.1) {
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

        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playNoise(duration, vol = 0.1) {
        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.audioCtx.destination);

        noise.start();
    }

    startBGM() {
        if (this.isPlayingBGM) return;
        this.isPlayingBGM = true;
        this.playTrack();
    }

    playTrack() {
        this.stopBGM(true); // Stop but keep playing state true
        this.isPlayingBGM = true; // Restore state

        if (this.audioCtx.state === 'suspended') return; // Wait for interaction

        const track = this.tracks[this.currentTrackIndex];
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();

        osc1.type = 'sine';
        osc1.frequency.value = track.baseFreq;
        osc2.type = 'triangle';
        osc2.frequency.value = track.baseFreq + 0.5; // Detune

        osc1.connect(this.bgmGainNode);
        osc2.connect(this.bgmGainNode);

        try {
            osc1.start();
            osc2.start();
            this.bgmOscillators = [osc1, osc2];
            this.startRhythm(track.bpm);
        } catch(e) {
            console.warn("AudioContext not ready for BGM start.");
        }
    }

    nextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.currentTrack = this.tracks[this.currentTrackIndex].name;
        if (this.isPlayingBGM) {
            this.playTrack();
        }
    }

    startRhythm(interval = 2000) {
        if (!this.isPlayingBGM) return;

        // Only schedule if context is running to avoid stacking
        if (this.audioCtx.state !== 'running') {
            this.rhythmTimeout = setTimeout(() => this.startRhythm(interval), 1000);
            return;
        }

        const now = this.audioCtx.currentTime;
        const kick = this.audioCtx.createOscillator();
        const kickGain = this.audioCtx.createGain();

        kick.frequency.setValueAtTime(150, now);
        kick.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);

        kickGain.gain.setValueAtTime(0.5, now); // Relative mix level
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        kick.connect(kickGain);
        kickGain.connect(this.bgmGainNode);

        kick.start(now);
        kick.stop(now + 0.5);

        this.rhythmTimeout = setTimeout(() => this.startRhythm(interval), interval);
    }

    stopBGM(restart = false) {
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
